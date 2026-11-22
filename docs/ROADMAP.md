# Roadmap

## v0.1: inventory (this release)

- [x] Scan all owned / org / listed repos (forks, archived, private and exclude filters)
- [x] `.project.yml` schema: status, links, deployments, services, domains, env names, cost, next, related, showcase/featured
- [x] Lenient parsing: one bad field doesn't discard the file
- [x] Deployment discovery: GitHub Deployments API, Pages, homepage, config files, workflows
- [x] Drop per-deploy Vercel / Netlify / Cloudflare URLs when a stable alias exists
- [x] Live-URL check
- [x] Health checks + score, stale detection
- [x] Outputs: `inventory.json`, `CATALOG.md`, showcase site, SVG card, profile README block
- [x] Optional Claude README summaries with an on-disk cache
- [x] Stale-project issues (deduped)
- [x] GitHub Action + hub workflow template; redacts private data if the hub repo is public
- [x] en / zh-TW
- [x] Commit `dist/` on release tags so `uses: mintguesss/repofolio@v0` works
- [ ] Publish to npm
- [ ] Screenshots + live demo in README

## v0.2: showcase and profile (growth loop)

- [x] Animated showcase: hero with typing roles, counters and a terminal; featured, projects, stack, activity, live status and timeline sections
- [x] 10 theme presets, 7 canvas backgrounds, 5 card styles, 4 layouts, fonts, motion levels, radius, accent
- [x] Live ⚙ customizer for visitors + "Copy as config"
- [x] ⌘K command palette, keyboard shortcuts, project detail modal with deep links
- [x] README screenshot → card cover (falls back to GitHub social preview); `image:` in `.project.yml`
- [x] GitHub profile + 52-week commit activity per repo
- [x] Animated neon profile card (sparkline + language bar)
- [x] `projects.json` and `publish:` to commit the site into an existing Pages repo
- [x] `repofolio render`: rebuild from `inventory.json` without scanning
- [ ] Live demo + GIF in the README
- [ ] Weekly digest: commits across all repos → "what I shipped this week" (LLM), in the catalog and as an issue
- [ ] Custom CSS / community theme presets
- [ ] Per-project pages (`/p/name/index.html`) with rendered README and `og:image`
- [ ] Card variants: top languages, featured projects, live-status board
- [ ] Domain expiry from RDAP (no manual `expires`)

## v0.8: promotion + competitor analysis

- [x] New project / release / star milestone / live / weekly digest / portfolio intro / spotlight → post drafts for 12 platforms (Claude or templates)
- [x] Review, edit and approve in the encrypted admin page; approvals dispatch the workflow, which publishes via the official APIs (LinkedIn, Bluesky, Threads, DEV, Mastodon, X, Discord, Telegram)
- [x] HN, Reddit, Facebook, PTT and unconnected platforms: copy + prefilled share link, recorded as posted by hand
- [x] Connection check each run (shows an expired LinkedIn / Threads token in the admin page)
- [x] Per-project share pages with the cover as the preview card
- [x] Competitor analysis per project: GitHub search + relevance ranking, rule-based comparison, Claude picks real competitors and suggests next steps
- [x] State on an (encrypted) `repofolio-data` branch
- [ ] Schedule approved posts for a chosen time
- [ ] Images for LinkedIn / Threads posts (upload the cover instead of a link card)

## v0.4: analytics

- [ ] Daily snapshot of stars, traffic and referrers in a `data` branch (GitHub only keeps 14 days of traffic)
- [ ] Charts on the showcase / a private dashboard
- [ ] Correlate posts with star and traffic changes

## Ideas

- Local mode that also scans folders on disk (projects that never got pushed)
- `repofolio doctor --fix`: set the repo Website field and topics via the API (needs write scope)
- VS Code / Raycast extension: "open project X dashboard"
