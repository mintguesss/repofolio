# repofolio

**Know, showcase and promote every GitHub repo you own.**

You have 20+ repos. Which ones are live? Where is each one deployed? Which Vercel URL is the real one? Where do the env vars live? What was `asa` again? repofolio scans all your repos every night and answers that in one place, then turns the public part into a portfolio site and a profile README section.

[繁體中文說明](README.zh-TW.md)

<!-- TODO: screenshot of the showcase site + CATALOG.md -->

## What you get

| Output | Who sees it | What's in it |
|---|---|---|
| `CATALOG.md` | You (private hub repo) | Every repo: summary, status, stack, **deployments + live check**, services, domains, env var names and where they're stored, cost, next steps, health issues |
| `site/index.html` | Everyone | A searchable portfolio of your public projects. Deploy it to GitHub Pages |
| `site/card.svg` | Everyone | Stats card for your profile README |
| `profile.md` | Everyone | Featured-projects block, spliced into your profile README between markers |
| Stale-project issues | You | "No pushes for 119 days: keep going, mark done, or archive?" |

## Features

- **Repo inventory**: all repos you own, plus orgs and extra repos you list. Detects the stack from `package.json`, `requirements.txt` and `pyproject.toml`
- **Deployment discovery, with nothing to configure**:
  - Reads the GitHub Deployments API (Vercel, Netlify and others report there), GitHub Pages, the repo's Website field, config files (`vercel.json`, `fly.toml`, `wrangler.toml`, `Dockerfile`…) and deploy steps in workflows
  - **Ignores per-deploy URLs** like `app-3k2j9x8h1-team.vercel.app` when a stable alias exists
- **Live-URL check**: every deployment URL is pinged. Dead ones show up as errors
- **Health check**: missing README, description, topics or LICENSE; deployed but no Website field; expiring domains; **secrets accidentally pasted into metadata**
- **Stale detection**: no pushes for N days and not marked done or paused → flagged, and optionally an issue is opened
- **Optional AI summaries**: one-line summaries of each README with Claude. Results are cached by README hash, so nightly runs only pay for READMEs that changed
- **Privacy by design**: private repos and private fields (env, services, domains, cost) never reach the public site. If your hub repo is public, they're stripped from the catalog too
- English and 繁體中文 output

## Try it in 10 seconds

You need Node 20+ and the GitHub CLI (`gh`) logged in.

```bash
npx repofolio scan
```

> Not on npm yet. Until it is: `git clone`, `npm install`, `npm run build`, then `node dist/cli.js scan`.

This writes `out/CATALOG.md`, `out/site/index.html` and the other files. Auth comes from `REPOFOLIO_TOKEN`, `GH_TOKEN` or `GITHUB_TOKEN`, and falls back to `gh auth token`.

## Run it nightly (GitHub Action)

1. Create a **private** repo to be your hub, for example `you/projects`
2. Inside it, run:

   ```bash
   npx repofolio init-hub
   ```

   This writes `repofolio.config.yml` and `.github/workflows/repofolio.yml`
3. Create a [fine-grained PAT](https://github.com/settings/personal-access-tokens/new):
   - Repository access: **All repositories**
   - Permissions (all read-only): Contents, Metadata, Deployments, Pages
   - Save it as the hub repo's `REPOFOLIO_TOKEN` secret
4. Settings → Pages → Source: **GitHub Actions**

```yaml
- uses: mintguesss/repofolio@v0
  with:
    token: ${{ secrets.REPOFOLIO_TOKEN }}
    stale-issues: true
    profile-readme: README.md   # optional
```

## `.project.yml`: the things GitHub can't know

Drop one in any repo (run `repofolio init` to get a pre-filled one). Every field is optional.

```yaml
status: active            # idea | active | maintenance | paused | done | archived
summary: Self-hosted alarms that plan themselves from tomorrow's calendar
tags: [productivity, android]
featured: true
links:
  demo: https://youtu.be/...
deployments:
  - name: production
    provider: vercel
    url: https://asa.example.com
    dashboard: https://vercel.com/me/asa
# ── private: never on the public site ──
services:
  - { name: Supabase, kind: database, plan: free, dashboard: https://supabase.com/dashboard/project/xxx }
domains:
  - { name: asa.example.com, registrar: Cloudflare, expires: 2027-03-01, autoRenew: true }
env:
  location: "Vercel env + 1Password › Dev"
  vars: [SUPABASE_URL, SUPABASE_ANON_KEY]   # names only, never values
cost: { monthly: 0, currency: USD, notes: free tier }
next: [Add iOS widget]
related: [asa-android]
```

The full schema is in [`src/schema.ts`](src/schema.ts) and there's an example in [`examples/`](examples/).

## Commands

```
repofolio scan      [--config file] [--out dir] [--no-url-check] [--llm] [--lang en|zh-TW]
repofolio init      [dir]                 pre-filled .project.yml for a local repo
repofolio init-hub  [dir]                 config + nightly workflow for a hub repo
repofolio issues    [--dry-run]           open stale-project issues in the hub repo
repofolio profile   <README.md> [--site-url url]
```

## How it compares

| | repofolio | github-readme-stats / metrics | gitprofile | Backstage |
|---|---|---|---|---|
| Profile README output | ✅ | ✅ | — | — |
| Portfolio site | ✅ | — | ✅ | — |
| Private inventory of all repos | ✅ | — | — | ✅ (for companies) |
| Deployment URLs + uptime | ✅ | — | — | plugin |
| Env, service, domain and cost notes | ✅ | — | — | — |
| Setup | one workflow | one URL | fork + config | a platform |

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Up next: weekly "what I shipped" digest, star and traffic history, and release-to-LinkedIn post drafts with human approval.

## License

MIT
