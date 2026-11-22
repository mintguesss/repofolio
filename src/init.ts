import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectFromFiles, detectStack } from "./detect.js";

/** Build a commented .project.yml for a local repo, pre-filled with what we can detect. */
export function projectTemplate(dir: string): string {
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const wfDir = join(dir, ".github", "workflows");
  const workflows = existsSync(wfDir) ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).map((f) => readFileSync(join(wfDir, f), "utf8")) : [];
  const manifests = ["package.json", "requirements.txt", "pyproject.toml"].filter((f) => files.includes(f)).map((f) => readFileSync(join(dir, f), "utf8"));
  const hints = detectFromFiles(files, workflows).filter((d) => !["docker", "npm", "pypi"].includes(d.provider ?? ""));
  const stack = detectStack(manifests);
  let envVars: string[] = [];
  const envExample = [".env.example", ".env.sample", ".env.template"].find((f) => files.includes(f));
  if (envExample) {
    envVars = readFileSync(join(dir, envExample), "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)?.[1])
      .filter((v): v is string => !!v);
  }

  const deployLines = hints.length
    ? hints.flatMap((h) => [`  - name: production`, `    provider: ${h.provider}   # detected from ${h.evidence}`, `    # url: https://`, `    # dashboard: https://`])
    : [`  # - name: production`, `  #   provider: vercel`, `  #   url: https://my-app.vercel.app`, `  #   dashboard: https://vercel.com/me/my-app`];

  return `# repofolio project metadata. Everything is optional.
# Fields marked (private) are never shown on your public showcase site.
# Schema: https://github.com/mintguesss/repofolio#projectyml

status: active          # idea | active | maintenance | paused | done | archived
summary: ""             # one line: what it does, for whom (overrides auto summary)
purpose: ""             # why it exists / what you were learning
tags: []${stack.length ? `           # detected stack: ${stack.join(", ")}` : ""}
showcase: true          # show on the public portfolio site
featured: false         # pin to the top

links:
  # demo: https://
  # docs: https://
  # video: https://
  # other:
  #   - { label: Slides, url: https:// }

deployments:
${deployLines.join("\n")}

# (private) external services this project depends on
services: []
  # - { name: Supabase, kind: database, plan: free, dashboard: https://supabase.com/dashboard/project/xxx }

# (private) domains you pay for
domains: []
  # - { name: example.com, registrar: Cloudflare, expires: 2027-01-01, autoRenew: true }

# (private) env var NAMES and where the values live. Never put values here.
env:
  location: ""          # e.g. "Vercel project env", "1Password › Dev"
  vars: [${envVars.join(", ")}]

# (private)
# cost: { monthly: 0, currency: USD, notes: "free tier" }

next: []                # what you'd do next if you came back to it
related: []             # other repo names
`;
}

export const HUB_CONFIG = `# repofolio hub config — https://github.com/mintguesss/repofolio
owners: []              # GitHub users/orgs to scan; empty = the token's user
repos: []               # extra owner/name repos
exclude: []             # names or owner/name; trailing * wildcard ok
includeForks: false
includeArchived: true
includePrivate: true    # private repos go in CATALOG.md; never on the public site unless showcase: true
staleDays: 90
language: en            # en | zh-TW
urlCheck:
  enabled: true
llm:                    # optional: only used when the ANTHROPIC_API_KEY secret is set
  model: claude-sonnet-5-5
  features: { summaries: false, intros: true, drafts: true, competitors: true }
  monthlyBudget: 5      # USD per month, 0 = no cap
site:
  title: ""             # defaults to your GitHub name
  tagline: ""           # defaults to your GitHub bio
  includePrivate: false
  links: []             # - { label: LinkedIn, url: https:// }
  hero:
    roles: []           # typing animation, e.g. [Full-stack developer, ML tinkerer]
  # sections: [hero, featured, projects, stats, status, timeline]
  customizer: true      # let visitors open the ⚙ panel
  theme:
    mode: simple        # simple (clean, light/dark follows the system) | tech (neon presets + effects)
    # scheme: auto      # simple mode: auto | light | dark
    # bgColor: "#fafafa" # custom page background; text colour adapts
    layout: grid        # grid | list
    # tech mode only:
    # preset: cyber     # cyber | midnight | matrix | synthwave | ocean | ember | aurora | mono | paper | daylight
    # background: particles  # particles | grid | matrix | aurora | stars | circuit | none
  # singlePage: false   # true = everything on one long page
issues:
  stale: true           # open an issue here for each stale project
# Commit the public site into another repo, e.g. your existing GitHub Pages site.
# publish:
#   repo: you/you.github.io
#   path: projects
`;
