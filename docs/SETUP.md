# Set up repofolio on your own GitHub

Once this is set up, GitHub scans all your repos every night, updates your private `CATALOG.md`, rebuilds the showcase site and profile card, and publishes the site where you want it.

[繁體中文](SETUP.zh-TW.md)

## 0. Try it locally (optional, ~2 minutes)

Node 20+ and `gh auth login`:

```bash
git clone https://github.com/mintguesss/repofolio
cd repofolio && npm install && npm run build
node dist/cli.js scan
```

Open `out/site/index.html`. `out/CATALOG.md` is the full private catalog. To change the look without re-scanning, edit `repofolio.config.yml` and run `node dist/cli.js render`, or use the ⚙ panel on the page and click "Copy as config".

## 1. Create a hub repo

1. Create a repo such as `projects`. Make it **private** to keep the full catalog. If it's public, private repos and private fields are stripped automatically.
2. Add `repofolio.config.yml`. The full reference is [examples/repofolio.config.yml](../examples/repofolio.config.yml).

   ```yaml
   site:
     hero:
       roles: [Full-stack developer, Tool builder]
     links:
       - { label: LinkedIn, url: https://www.linkedin.com/in/you }
     theme:
       mode: simple    # or tech for neon presets and effects
   ```

3. Add the workflow:

   ```bash
   mkdir -p .github/workflows
   curl -o .github/workflows/repofolio.yml https://raw.githubusercontent.com/mintguesss/repofolio/main/templates/hub-workflow.yml
   ```

## 2. Read token (required)

1. Create one at https://github.com/settings/personal-access-tokens/new:
   - Repository access: **All repositories**
   - Permissions: **Contents**, **Metadata**, **Deployments** and **Pages**, all **Read-only**
2. Save it in the hub repo under Settings → Secrets and variables → Actions as `REPOFOLIO_TOKEN`.

## 3. Where the site goes

**A) Into your existing public site repo (recommended)**

Add this to `repofolio.config.yml`:

```yaml
publish:
  repo: you/you.github.io
  path: projects            # e.g. public/projects for a Next.js static export
site:
  url: https://you.github.io/projects/
```

Then create a second token that only reaches that repo: Only select repositories → your site repo, with **Contents: Read and write**. Save it as `REPOFOLIO_PUBLISH_TOKEN`.

Each run commits only `index.html`, `card.svg` and `projects.json`, and only when something changed. Your site's own deploy takes it from there.

**B) GitHub Pages of the hub repo**

1. Settings → Pages → Source: GitHub Actions.
2. Settings → Variables → `REPOFOLIO_PAGES` = `true`.

Pages on a private repo needs GitHub Pro.

## 4. First run

Go to Actions → repofolio → Run workflow. After that it runs nightly at 02:17 UTC; change the `cron` line to change that.

## 5. Profile README

```markdown
[![My projects](https://your-site/projects/card.svg)](https://your-site/projects/)
```

## 6. `.project.yml` in each repo (optional)

Add one to any repo for what GitHub can't know: summary, featured, cover `image`, deployments, services, domains, env var names, cost and next steps. `repofolio init` writes a pre-filled one. Private fields only ever go to `CATALOG.md`.

## Troubleshooting

- **A project is missing from the site.** The site leaves out:
  - private repos
  - forks
  - your profile repo
  - repos whose names end in `-backup` or `_old`

  Set `showcase: true` in the project's `.project.yml` to force it in.
- **Hiding a project.** Set `showcase: false` in its `.project.yml`, or add it to `exclude` in the config.
- **Publish fails with 403.** The publish token has no Contents write access on the target repo.
- **The activity chart is empty.** GitHub computes stats lazily, so it usually appears the next day.
