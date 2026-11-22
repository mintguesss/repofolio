# Promotion and competitor analysis

[繁體中文](PROMOTE.zh-TW.md)

When repofolio scans your repos each night, it turns what happened into post drafts for each platform. You edit and approve them in the encrypted admin page's **📣 Posts** tab, and the Action publishes them with your own platform tokens. No server, no third-party service.

Each project also gets a **🎯 competitor analysis**: similar repos on GitHub, how you compare, and what to do next. It only appears in the admin page.

## How it works

```
nightly scan ─→ detect events ─→ drafts (Claude or templates) ─→ stored on the repofolio-data branch
                                                                   │
                       admin page 📣 tab: edit, pick platforms, "Approve & publish"
                                                                   │
                workflow_dispatch (posts input) ─→ Action publishes ─→ results back in the admin page
```

**Events that create drafts** (public repos shown on the portfolio only):

| Event | When |
|---|---|
| Portfolio intro | On the first run: one post introducing the whole portfolio |
| New project | A new public repo appears |
| Release | A new GitHub Release |
| Star milestone | Crossing 10, 25, 50, 100, 250, 500, 1000… |
| Live | A project gets a reachable website for the first time |
| Weekly digest | Every Monday (configurable): last week's commits, releases, new stars |
| Spotlight | "📣 Write a post about this" in a project's admin modal |

Links point to `<portfolio>/p/<project>/`, a share page whose preview card uses the project's cover and which opens the project in the portfolio.

## Config

```yaml
promote:
  enabled: true
  platforms: [linkedin, bluesky, threads, x, devto, hn, reddit]
  hashtags: [buildinpublic]
  # events: { weekly: mon, stars: [10, 50, 100, 500, 1000], newProject: true, release: true, live: true, intro: true }
  # language: en           # defaults to `language`
  # llm: auto              # Claude writes the drafts when ANTHROPIC_API_KEY is set, templates otherwise
  # mentionPrivate: false  # weekly digest may say "plus N private projects" (a number only)
competitors:
  enabled: true            # on by default
  # count: 5  refreshDays: 14  perRun: 8  includePrivate: true  llm: auto
```

The workflow needs:

- `permissions: contents: write` for the `repofolio-data` branch.
- A `posts` input on `workflow_dispatch`, passed to the Action: `posts: ${{ inputs.posts }}`.
- `concurrency.cancel-in-progress: false`, so a run is never cancelled halfway through publishing.

[`templates/site-workflow.yml`](../templates/site-workflow.yml) has all of it.

## GitHub token for approvals

Approving in the admin page dispatches the workflow with your token. Paste it once in the 📣 tab:

1. Create a fine-grained token at <https://github.com/settings/personal-access-tokens/new>.
2. Repository access → **Only select repositories** → the repo with the workflow.
3. Permissions → **Actions: Read and write**. Nothing else.

It's stored only in your browser (and only inside the unlocked admin page).

## Platform credentials

Platforms without credentials still get drafts, with **Copy** and **Open to post** buttons; tick "I posted it" and the approval records it.

Secrets go in **Settings → Secrets and variables → Actions** under these names:

| Platform | Auto | Secrets | Where to get them |
|---|---|---|---|
| LinkedIn | ✓ | `LINKEDIN_TOKEN` | See below |
| Bluesky | ✓ | `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD` | Bluesky → Settings → Privacy and security → App passwords → Add. Handle like `you.bsky.social` |
| Threads | ✓ | `THREADS_TOKEN` | See below |
| DEV (dev.to) | ✓ | `DEVTO_API_KEY` | dev.to → Settings → Extensions → DEV Community API Keys → Generate |
| Mastodon | ✓ | `MASTODON_URL`, `MASTODON_TOKEN` | Your instance → Preferences → Development → New application with `write:statuses` and `read:accounts`. URL like `https://mastodon.social` |
| X | ✓ (paid) | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | App on developer.x.com, user authentication Read and write, generate an access token. Pay-per-use since 2026-02; a post with a link is about $0.20 |
| Discord | ✓ | `DISCORD_WEBHOOK` | Channel settings → Integrations → Webhooks → New → Copy URL |
| Telegram | ✓ | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Create a bot with @BotFather, add it to the channel as admin, chat id `@channelname` |
| Hacker News | by hand | — | No API; a prefilled Show HN submit link |
| Reddit | by hand | — | New apps need approval since 2025-11; a prefilled submit link |
| Facebook | by hand | — | No posting API for profiles; a share link |
| PTT | by hand | — | Draft in PTT format ([分享] title, plain text) to copy |

### LinkedIn

1. Create an app at <https://www.linkedin.com/developers/apps>. LinkedIn requires a Page to attach it to; create one if you have none.
2. On the app's **Products** tab add **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect** (both self-serve).
3. At <https://www.linkedin.com/developers/tools/oauth/token-generator>, pick the app, tick `openid`, `profile`, `w_member_social`, and generate a token.
4. Save it as the secret `LINKEDIN_TOKEN`.

Tokens expire after 60 days and self-serve apps get no refresh token. When it expires, LinkedIn turns red ("error") in the admin page; repeat steps 3–4.

### Threads

1. Create an app at <https://developers.facebook.com/apps> with the **Access the Threads API** use case.
2. Under App roles add your Threads account as a **Threads Tester** and accept the invite in the Threads app settings.
3. Generate a token with the User Token Generator (`threads_basic`, `threads_content_publish`) and exchange it for a long-lived (60-day) token.
4. Save it as the secret `THREADS_TOKEN`. Posting to your own account needs no app review.

## Claude for drafts and analysis

With an `ANTHROPIC_API_KEY` secret:

- **Drafts**: one Claude call per event, written for each platform (LinkedIn: what you built and learned; X / Bluesky: short; DEV: an article; PTT: PTT format). It never invents features or numbers. A draft over a platform's limit falls back to the template.
- **Competitors**: GitHub search finds up to 12 candidates, Claude keeps the real competitors and writes positioning, strengths, gaps and next steps.

Without a key: template drafts, and rule-based competitor matching (shared topics and keywords) comparing stars, activity, demo and licence.

## Privacy

- Private repos **never** appear in posts; a spotlight request for one is refused.
- The weekly digest leaves private projects out; `mentionPrivate` adds only a count.
- With `REPOFOLIO_ADMIN_PASSWORD` set, the `repofolio-data` branch holds an encrypted file (`state.enc`), so even a public repo can keep competitor reports for private projects.
- Without a password on a public repo, the branch is plain JSON and only ever holds public projects.
- Competitor search uses GitHub's search API. With Claude, README excerpts are sent to Anthropic (same as `llm.enabled` summaries).
