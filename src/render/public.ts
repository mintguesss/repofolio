import type { Config } from "../schema.js";
import type { ReadmeIntro } from "../detect.js";
import type { CompetitorReport } from "../state.js";
import type { Inventory, Profile, RepoRecord } from "../types.js";
import { topStack } from "./markdown.js";

export const REPO_URL = "https://github.com/mintguesss/repofolio";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface PublicDeployment {
  name: string;
  provider?: string;
  url: string;
  ok: boolean;
  ms?: number;
  status?: number;
}

/**
 * Only safe-to-publish fields. Never env / services / domains / cost / private notes,
 * and for private repos: no code URL, no stars, no release, no cover image.
 */
export interface PublicProject {
  id: string;
  name: string;
  repo: string;
  codeUrl?: string;
  summary: string;
  purpose?: string;
  status: RepoRecord["status"];
  stack: string[];
  languages: { name: string; pct: number }[];
  tags: string[];
  stars: number;
  forks: number;
  license?: string;
  created: string;
  updated: string;
  release?: string;
  featured: boolean;
  private: boolean;
  image?: string;
  activity?: number[];
  links: { label: string; url: string }[];
  deployments: PublicDeployment[];
  /** README intro: paragraphs, features, section outline. Public repos only on the public site. */
  intro?: ReadmeIntro;
  /** Short intro in the site language (Claude), or null. */
  brief?: { about: string; features: string[] };
  /** Language the README is written in (by script), to tell if `intro` matches the site language. */
  introLang?: "zh" | "en";
  /** Only in the private admin build (never in the public site / projects.json). */
  admin?: AdminInfo;
}

export interface AdminInfo {
  shown: boolean;
  health: number;
  issues: { id: string; level: "error" | "warn" | "info"; message: string }[];
  /** Key under `projects:` in the config for this repo, and the checks ignored there. */
  cfgKey: string;
  ignored: string[];
  branch: string;
  env?: { location?: string; vars: string[] };
  next: string[];
  cost?: string;
  archived: boolean;
  fork: boolean;
  /** Competitor report, attached in the admin build when one exists. */
  competitors?: CompetitorReport;
  /** Public + showcased: the admin page can ask for a post about it. */
  postable?: boolean;
  metrics: {
    openIssues: number;
    daysSincePush: number;
    ageDays: number;
    commits4w: number;
    commits52w: number;
    readmeLength: number;
    hasMetaFile: boolean;
    deploysUp: number;
    deploysDown: number;
    topics: number;
  };
  /** Posts about this project (attached in the admin build). */
  posts?: { published: number; pending: number; last?: { title: string; at: string; url?: string } };
  postList?: { title: string; status: string; at: string; links: { label: string; url: string }[] }[];
}

/** "zh" when a fair share of the letters are CJK. */
export function scriptOf(text: string): "zh" | "en" {
  const letters = text.match(/\p{L}/gu) ?? [];
  const cjk = letters.filter((c) => /[㐀-鿿]/.test(c)).length;
  return letters.length && cjk / letters.length > 0.15 ? "zh" : "en";
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, "-").replace(/^-|-$/g, "") || "p";
}

function isPublicDeploy(name: string): boolean {
  return !/staging|preview|dev|test/i.test(name);
}

export function toPublic(r: RepoRecord): PublicProject {
  const links: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  const add = (label: string, url?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ label, url });
  };
  const deployments: PublicDeployment[] = [];
  for (const d of r.deployments) {
    if (!d.url || !isPublicDeploy(d.name)) continue;
    if (!d.check || d.check.ok) add(d.provider === "npm" ? "npm" : d.provider === "pypi" ? "PyPI" : "live", d.url);
    deployments.push({ name: d.name, provider: d.provider, url: d.url, ok: d.check?.ok ?? true, ms: d.check?.ms, status: d.check?.status });
  }
  const l = r.meta.links;
  add("demo", l.demo);
  add("docs", l.docs);
  add("video", l.video);
  add("slides", l.slides);
  add("paper", l.paper);
  add("design", l.design);
  for (const o of l.other) add(o.label, o.url);

  const totalBytes = Object.values(r.languages).reduce((a, b) => a + b, 0);
  const languages = Object.entries(r.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, bytes]) => ({ name, pct: totalBytes ? Math.round((bytes / totalBytes) * 1000) / 10 : 0 }));

  const image = r.meta.image ?? (r.private ? undefined : (r.cover ?? r.readme?.image ?? `https://opengraph.githubassets.com/1/${r.fullName}`));

  return {
    id: slug(r.private ? r.name : r.fullName),
    name: r.meta.name ?? r.name,
    repo: r.private ? r.name : r.fullName,
    codeUrl: r.private ? undefined : r.url,
    summary: r.summary,
    purpose: r.meta.purpose,
    status: r.status,
    stack: topStack(r, 6),
    languages,
    tags: [...new Set([...r.meta.tags, ...r.topics])].slice(0, 8),
    stars: r.private ? 0 : r.stars,
    forks: r.private ? 0 : r.forks,
    license: r.private ? undefined : (r.license ?? undefined),
    created: r.meta.started ?? r.createdAt,
    updated: r.pushedAt,
    release: r.private ? undefined : r.latestRelease?.tag,
    featured: r.meta.featured,
    private: r.private,
    image,
    activity: r.activity,
    links,
    deployments,
    intro: r.private ? undefined : r.readme?.intro,
    brief: r.private ? undefined : r.brief,
    introLang: r.readme?.intro ? scriptOf(r.readme.intro.paragraphs.join(" ") || r.readme.excerpt) : undefined,
  };
}

/** Admin build: every field, private repos in full. The output must never be published. */
export function toAdmin(r: RepoRecord): PublicProject {
  const p = toPublic(r);
  const deployments = r.deployments
    .filter((d) => d.url)
    .map((d) => ({ name: d.name, provider: d.provider, url: d.url!, ok: d.check?.ok ?? true, ms: d.check?.ms, status: d.check?.status }));
  return {
    ...p,
    id: slug(r.fullName),
    repo: r.fullName,
    codeUrl: r.url,
    stars: r.stars,
    forks: r.forks,
    license: r.license ?? undefined,
    release: r.latestRelease?.tag,
    image: r.meta.image ?? r.cover ?? (r.private ? undefined : p.image),
    deployments,
    intro: r.readme?.intro,
    brief: r.brief,
    admin: {
      shown: r.showcase,
      health: r.healthScore,
      issues: r.health.filter((i) => i.level !== "info").map((i) => ({ id: i.id, level: i.level, message: i.message })),
      cfgKey: r.name,
      ignored: [],
      branch: r.defaultBranch,
      env: r.meta.env ? { location: r.meta.env.location, vars: r.meta.env.vars } : undefined,
      next: r.meta.next,
      cost: r.meta.cost?.monthly != null ? `${r.meta.cost.monthly} ${r.meta.cost.currency}/mo` : r.meta.cost?.notes,
      archived: r.archived,
      fork: r.fork,
      postable: r.showcase && !r.private && !r.fork,
      metrics: {
        openIssues: r.openIssues,
        daysSincePush: r.daysSincePush,
        ageDays: Math.max(0, Math.floor((Date.now() - Date.parse(r.createdAt)) / 86400000)),
        commits4w: (r.activity ?? []).slice(-4).reduce((a, b) => a + b, 0),
        commits52w: (r.activity ?? []).reduce((a, b) => a + b, 0),
        readmeLength: r.readme?.length ?? 0,
        hasMetaFile: r.hasMetaFile,
        deploysUp: r.deployments.filter((d) => d.url && d.check?.ok !== false).length,
        deploysDown: r.deployments.filter((d) => d.url && d.check?.ok === false).length,
        topics: r.topics.length,
      },
    },
  };
}

export function selectShowcase(inv: Inventory): PublicProject[] {
  return inv.repos
    .filter((r) => r.showcase)
    .map(toPublic)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.stars - a.stars || Date.parse(b.updated) - Date.parse(a.updated));
}

export interface ShowcaseData {
  generatedAt: string;
  owner: string;
  profile?: Pick<Profile, "login" | "name" | "avatarUrl" | "url" | "bio" | "location" | "blog" | "company" | "twitter" | "followers" | "publicRepos" | "createdAt">;
  projects: PublicProject[];
  totals: {
    projects: number;
    live: number;
    stars: number;
    languages: number;
    commitsYear: number;
    commitsWeek: number;
  };
  /** Aggregated language share across showcased projects. */
  languages: { name: string; pct: number }[];
  /** Commits per week across showcased projects, 52 weeks, oldest first. */
  activity: number[];
  /** Tech → number of projects using it. */
  tech: { name: string; count: number }[];
}

/** Everything the public site (and projects.json) shows. Built only from public-safe fields. */
export function buildShowcase(inv: Inventory, config?: Pick<Config, "owners">, admin = false): ShowcaseData {
  const projects = admin
    ? inv.repos.map(toAdmin).sort((a, b) => Number(b.featured) - Number(a.featured) || Date.parse(b.updated) - Date.parse(a.updated))
    : selectShowcase(inv);
  const shownRepos = admin ? inv.repos : inv.repos.filter((r) => r.showcase);
  const langBytes = new Map<string, number>();
  for (const r of shownRepos) for (const [k, v] of Object.entries(r.languages)) langBytes.set(k, (langBytes.get(k) ?? 0) + v);
  const total = [...langBytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...langBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, b]) => ({ name, pct: total ? Math.round((b / total) * 1000) / 10 : 0 }));
  const activity = new Array<number>(52).fill(0);
  for (const p of projects) p.activity?.slice(-52).forEach((n, i, arr) => (activity[52 - arr.length + i]! += n));
  const techCount = new Map<string, number>();
  for (const p of projects) for (const s of new Set([...p.stack, ...p.languages.slice(0, 3).map((l) => l.name)])) techCount.set(s, (techCount.get(s) ?? 0) + 1);
  const tech = [...techCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  const owner = config?.owners[0] ?? inv.profile?.login ?? inv.owners[0] ?? "";
  return {
    generatedAt: inv.generatedAt,
    owner,
    profile: inv.profile,
    projects,
    totals: {
      projects: projects.length,
      live: projects.filter((p) => p.deployments.some((d) => d.ok)).length,
      stars: projects.reduce((n, p) => n + p.stars, 0),
      languages: langBytes.size,
      commitsYear: activity.reduce((a, b) => a + b, 0),
      commitsWeek: activity[51] ?? 0,
    },
    languages,
    activity,
    tech,
  };
}
