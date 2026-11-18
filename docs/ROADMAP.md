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
- [ ] Commit `dist/` on release tags so `uses: mintguesss/repofolio@v0` works
- [ ] Publish to npm
- [ ] Screenshots + live demo in README

## v0.2: showcase and profile (growth loop)

- [ ] Weekly digest: commits across all repos → "what I shipped this week" (LLM), in the catalog and as an issue
- [ ] Showcase themes (minimal, cards, timeline) + custom CSS
- [ ] Per-project pages with README rendering and screenshots (`og:image`)
- [ ] Card variants: top languages, featured projects, live-status board
- [ ] Domain expiry from RDAP (no manual `expires`)

## v0.3: promotion

- [ ] Release / RSS / star-milestone → post drafts (LinkedIn, Dev.to, Bluesky, Mastodon; Reddit and HN as drafts with a prefilled submit link)
- [ ] Approval flow inside a GitHub Issue (`/approve`), then publish via the official APIs
- [ ] LinkedIn token-expiry reminder (60-day tokens)

## v0.4: analytics

- [ ] Daily snapshot of stars, traffic and referrers in a `data` branch (GitHub only keeps 14 days of traffic)
- [ ] Charts on the showcase / a private dashboard
- [ ] Correlate posts with star and traffic changes

## Ideas

- Local mode that also scans folders on disk (projects that never got pushed)
- `repofolio doctor --fix`: set the repo Website field and topics via the API (needs write scope)
- VS Code / Raycast extension: "open project X dashboard"
