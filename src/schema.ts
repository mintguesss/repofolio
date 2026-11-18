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
  site: z.object({
    title: z.string().optional(),
    tagline: z.string().optional(),
    /** Include private repos that don't set showcase: true. Default false. */
    includePrivate: z.boolean().default(false),
    links: z.array(LinkSchema).default([]),
  }).default({ includePrivate: false, links: [] }),
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
