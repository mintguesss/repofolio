import { z } from "zod";

/**
 * `.project.yml` — optional per-repo metadata. Everything is optional:
 * repofolio infers what it can and only needs you to fill in what it can't
 * know (purpose, where secrets live, what a project costs, what's next).
 *
 * Privacy model: fields under `private`, plus `env`, `services`, `domains`
 * and `cost`, are NEVER rendered on the public showcase site. They only
 * appear in the private CATALOG.md / inventory.json kept in your hub repo.
 */

export const STATUSES = ["idea", "active", "maintenance", "paused", "done", "archived"] as const;
export type Status = (typeof STATUSES)[number];

export const PROVIDERS = [
  "vercel", "netlify", "cloudflare", "github-pages", "render", "fly", "railway",
  "heroku", "firebase", "huggingface", "streamlit", "aws", "gcp", "azure",
  "docker", "npm", "pypi", "app-store", "play-store", "chrome-web-store",
  "self-hosted", "other",
] as const;
export type Provider = (typeof PROVIDERS)[number];

const url = z.string().url();

export const LinkSchema = z.object({ label: z.string(), url });

export const DeploymentSchema = z.object({
  name: z.string().default("production"),
  provider: z.enum(PROVIDERS).optional(),
  url: url.optional(),
  branch: z.string().optional(),
  /** Provider console link, e.g. the Vercel project page. */
  dashboard: url.optional(),
  notes: z.string().optional(),
});

export const ServiceSchema = z.object({
  name: z.string(),
  kind: z.enum(["database", "auth", "storage", "api", "llm", "payment", "email", "analytics", "monitoring", "cron", "other"]).optional(),
  dashboard: url.optional(),
  plan: z.string().optional(),
  notes: z.string().optional(),
});

export const DomainSchema = z.object({
  name: z.string(),
  registrar: z.string().optional(),
  /** ISO date, e.g. 2027-03-01 */
  expires: z.string().optional(),
  autoRenew: z.boolean().optional(),
});

export const ProjectMetaSchema = z.object({
  name: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  /** One-liner. Overrides the auto/LLM summary. */
  summary: z.string().optional(),
  purpose: z.string().optional(),
  /** Screenshot / cover image for the showcase. Defaults to the first README image, then GitHub's social preview. */
  image: url.optional(),
  tags: z.array(z.string()).default([]),
  started: z.string().optional(),
  links: z.object({
    homepage: url.optional(),
    docs: url.optional(),
    demo: url.optional(),
    video: url.optional(),
    slides: url.optional(),
    paper: url.optional(),
    design: url.optional(),
    other: z.array(LinkSchema).default([]),
  }).default({ other: [] }),
  deployments: z.array(DeploymentSchema).default([]),
  services: z.array(ServiceSchema).default([]),
  domains: z.array(DomainSchema).default([]),
  /** Names of env vars and WHERE their values live. Never the values. */
  env: z.object({
    location: z.string().optional(),
    vars: z.array(z.string()).default([]),
  }).optional(),
  cost: z.object({
    monthly: z.number().optional(),
    currency: z.string().default("USD"),
    notes: z.string().optional(),
  }).optional(),
  next: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
  /** true = always show on public site (even if private repo), false = never. */
  showcase: z.boolean().optional(),
  /** Pin to the top of the showcase. */
  featured: z.boolean().default(false),
  private: z.record(z.string(), z.unknown()).optional(),
});
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

export const THEME_PRESETS = ["cyber", "midnight", "matrix", "synthwave", "ocean", "ember", "aurora", "mono", "paper", "daylight"] as const;
export const BACKGROUNDS = ["particles", "grid", "matrix", "aurora", "stars", "circuit", "none"] as const;
export const CARD_STYLES = ["glass", "solid", "neon", "outline", "terminal"] as const;
export const LAYOUTS = ["grid", "list"] as const;
export const FONTS = ["sans", "mono", "display", "system"] as const;
export const ANIMATIONS = ["full", "subtle", "off"] as const;
export const GLOWS = ["none", "soft", "strong"] as const;
export const MODES = ["simple", "tech"] as const;
export const SCHEMES = ["auto", "light", "dark"] as const;
/** "stack" and "activity" are accepted for older configs and render as "stats". */
export const SECTIONS = ["hero", "featured", "projects", "stats", "status", "timeline", "stack", "activity"] as const;
export const DEFAULT_SECTIONS = ["hero", "featured", "projects", "stats", "status", "timeline"] as const;

export const ThemeSchema = z.object({
  /** simple = clean, quiet design (light/dark follows the system). tech = presets, canvas effects, glow, motion. */
  mode: z.enum(MODES).default("simple"),
  /** Light / dark for simple mode. */
  scheme: z.enum(SCHEMES).default("auto"),
  /** Tech mode only. */
  preset: z.enum(THEME_PRESETS).default("cyber"),
  /** Override the preset's accent, e.g. "#22d3ee". */
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  /** Override the page background colour, e.g. "#101418". Text colour adapts automatically. */
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  background: z.enum(BACKGROUNDS).default("particles"),
  cardStyle: z.enum(CARD_STYLES).default("glass"),
  /** grid = cards, list = compact rows. Older values (bento, compact) fall back to grid. */
  layout: z.enum(LAYOUTS).catch("grid").default("grid"),
  font: z.enum(FONTS).default("sans"),
  animation: z.enum(ANIMATIONS).default("full"),
  /** Glow / neon intensity on buttons, cards, avatar and text. */
  glow: z.enum(GLOWS).default("soft"),
  /** Corner radius in px. */
  radius: z.number().int().min(0).max(32).default(16),
  /** Cover images on project cards (tech mode). */
  covers: z.boolean().default(true),
  cursorGlow: z.boolean().default(true),
  /** 3D tilt on hover (tech mode). */
  tilt: z.boolean().default(true),
  /** Load Inter / JetBrains Mono / Space Grotesk / Noto Sans TC from Google Fonts. */
  webFonts: z.boolean().default(true),
});

export const SiteSchema = z.object({
  title: z.string().optional(),
  tagline: z.string().optional(),
  /** Include private repos that don't set showcase: true. Default false. */
  includePrivate: z.boolean().default(false),
  links: z.array(LinkSchema).default([]),
  theme: ThemeSchema.default(ThemeSchema.parse({})),
  hero: z.object({
    /** Lines cycled by the typing animation, e.g. ["Full-stack developer", "ML tinkerer"]. */
    roles: z.array(z.string()).default([]),
    /** Overrides the GitHub bio. */
    intro: z.string().optional(),
    /** Show the animated terminal next to the hero. */
    terminal: z.boolean().default(true),
    avatar: z.boolean().default(true),
  }).default({ roles: [], terminal: true, avatar: true }),
  /** Which sections to show, in order. */
  sections: z.array(z.enum(SECTIONS)).default([...DEFAULT_SECTIONS]),
  /** Put every section on one long page instead of separate pages (home, projects, stack, …). */
  singlePage: z.boolean().default(false),
  /** Let visitors open the ⚙ panel and play with the theme (their choice is saved in their browser). */
  customizer: z.boolean().default(true),
  /** Canonical URL of the published site (for og:url and the profile "All projects" link). */
  url: z.string().url().optional(),
});

export const PublishSchema = z.object({
  /** owner/name of the target repo, e.g. you/you.github.io */
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  /** Branch to commit to. Defaults to the repo's default branch. */
  branch: z.string().optional(),
  /** Folder inside the target repo, e.g. "public/projects". */
  path: z.string().default("repofolio"),
  message: z.string().default("chore: update project showcase (repofolio)"),
});

export const ConfigSchema = z.object({
  /** GitHub users/orgs whose repos to scan. Defaults to the token's user. */
  owners: z.array(z.string()).default([]),
  /** Extra repos as owner/name (e.g. ones in an org you don't fully scan). */
  repos: z.array(z.string()).default([]),
  /** Repo names or owner/name to skip. Supports trailing * wildcard. */
  exclude: z.array(z.string()).default([]),
  includeForks: z.boolean().default(false),
  includeArchived: z.boolean().default(true),
  includePrivate: z.boolean().default(true),
  staleDays: z.number().int().positive().default(90),
  urlCheck: z.object({
    enabled: z.boolean().default(true),
    timeoutMs: z.number().int().positive().default(10000),
  }).default({ enabled: true, timeoutMs: 10000 }),
  /** Language for reports, health messages and LLM summaries. */
  language: z.enum(["en", "zh-TW"]).default("en"),
  llm: z.object({
    /** Summarise READMEs with Claude. Needs ANTHROPIC_API_KEY. Cached by README sha. */
    enabled: z.boolean().default(false),
    model: z.string().default("claude-opus-5-5"),
  }).default({ enabled: false, model: "claude-opus-5-5" }),
  /** Fetch 52-week commit activity per repo (one extra request each). */
  activity: z.boolean().default(true),
  /** Cover image per repo (name or owner/name → image URL). Wins over README screenshots; private repos never get one. */
  images: z.record(z.string(), z.string().url()).default({}),
  site: SiteSchema.default(SiteSchema.parse({})),
  /** Push the public site into another repo (e.g. your existing GitHub Pages site). */
  publish: PublishSchema.optional(),
  /**
   * Private admin view: the same site with every repo + health/env info, written to out/admin.html.
   * Commit it to your (private) hub repo; the public site gets an admin.html login page that loads it
   * with a GitHub token that can read the hub repo, so the data never leaves GitHub's access control.
   */
  admin: z.object({
    enabled: z.boolean().default(true),
    /**
     * encrypted: publish the admin page encrypted with the REPOFOLIO_ADMIN_PASSWORD env var (works from one public repo).
     * repo: keep it in a private repo and open it with a GitHub token.
     * auto: encrypted when the password is set, otherwise repo.
     */
    mode: z.enum(["auto", "encrypted", "repo"]).default("auto"),
    /** File name of the admin page on the public site. Pick something only you know. */
    page: z.string().regex(/^[\w.-]+\.html$/, "must be a plain file name ending in .html").default("admin.html"),
    /** Show a 🔒 link to the admin page in the public site's footer. */
    link: z.boolean().default(false),
    /** repo mode: owner/name of the private repo holding admin.html. Defaults to GITHUB_REPOSITORY in Actions. */
    repo: z.string().optional(),
    /** repo mode: path of admin.html inside that repo. */
    path: z.string().default("admin.html"),
  }).default({ enabled: true, mode: "auto", page: "admin.html", link: false, path: "admin.html" }),
  output: z.object({
    dir: z.string().default("out"),
  }).default({ dir: "out" }),
  issues: z.object({
    /** Open an issue in the hub repo for each stale project. */
    stale: z.boolean().default(false),
    /** owner/name of the hub repo. Defaults to GITHUB_REPOSITORY in Actions. */
    repo: z.string().optional(),
  }).default({ stale: false }),
});
export type Config = z.infer<typeof ConfigSchema>;

/** Parse .project.yml content leniently: collect problems instead of throwing. */
export function parseProjectMeta(raw: unknown): { meta: ProjectMeta; problems: string[] } {
  // YAML keys left with only comments under them parse as null; treat as absent.
  let data: unknown = raw && typeof raw === "object" && !Array.isArray(raw) ? stripNulls(structuredClone(raw)) : {};
  const problems: string[] = [];
  // Drop only the offending fields so one typo doesn't discard the whole file.
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = ProjectMetaSchema.safeParse(data);
    if (result.success) return { meta: result.data, problems };
    for (const issue of result.error.issues) {
      problems.push(`${issue.path.join(".") || "(root)"}: ${issue.message}`);
      if (issue.path.length === 0) data = {};
      else deletePath(data, issue.path);
    }
  }
  return { meta: ProjectMetaSchema.parse({}), problems };
}

function stripNulls<T>(v: T): T {
  if (Array.isArray(v)) return v.filter((x) => x !== null).map(stripNulls) as T;
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (x === null) delete (v as Record<string, unknown>)[k];
      else (v as Record<string, unknown>)[k] = stripNulls(x);
    }
  }
  return v;
}

function deletePath(obj: unknown, path: PropertyKey[]): void {
  let cur = obj as Record<PropertyKey, unknown>;
  for (const key of path.slice(0, -1)) {
    const next = cur?.[key];
    if (!next || typeof next !== "object") return;
    cur = next as Record<PropertyKey, unknown>;
  }
  const last = path[path.length - 1]!;
  if (Array.isArray(cur) && typeof last === "number") cur.splice(last, 1);
  else delete cur[last];
}
