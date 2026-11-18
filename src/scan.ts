import { parse as parseYaml } from "yaml";
import { detectFromFiles, detectStack, inferStatus, mergeDeployments, preferStableUrls, providerFromUrl, readmeExcerpt } from "./detect.js";
import type { GhContentEntry, GhDeployment, GhDeploymentStatus, GhRepo } from "./github.js";
import { GitHubClient } from "./github.js";
import { checkHealth, healthScore } from "./health.js";
import { parseProjectMeta, type Config } from "./schema.js";
import type { Summarizer } from "./summarize.js";
import type { DetectedDeployment, Inventory, RepoRecord } from "./types.js";
import { checkUrl, pool } from "./urlcheck.js";
import { VERSION } from "./version.js";

export interface ScanOptions {
  config: Config;
  client: GitHubClient;
  summarizer?: Summarizer;
  now?: Date;
  log?: (msg: string) => void;
}

const META_FILES = [".project.yml", ".project.yaml"];
const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "environment.yml"];

export async function listRepos(client: GitHubClient, config: Config): Promise<GhRepo[]> {
  const byName = new Map<string, GhRepo>();
  let owners = config.owners;
  const me = await client.get<{ login: string }>("/user").catch(() => null);
  if (owners.length === 0) {
    if (!me) throw new Error("No `owners` configured and the token can't identify a user. Set owners in repofolio.config.yml.");
    owners = [me.login];
  }
  for (const owner of owners) {
    let list: GhRepo[];
    if (me && owner.toLowerCase() === me.login.toLowerCase()) {
      list = await client.paginate<GhRepo>("/user/repos?affiliation=owner&sort=pushed");
    } else {
      const org = await client.get<unknown>(`/orgs/${owner}`);
      list = await client.paginate<GhRepo>(org ? `/orgs/${owner}/repos?type=all&sort=pushed` : `/users/${owner}/repos?type=owner&sort=pushed`);
    }
    for (const r of list) byName.set(r.full_name.toLowerCase(), r);
  }
  for (const full of config.repos) {
    const r = await client.get<GhRepo>(`/repos/${full}`);
    if (r) byName.set(r.full_name.toLowerCase(), r);
  }
  return [...byName.values()].filter((r) => {
    if (r.fork && !config.includeForks) return false;
    if (r.archived && !config.includeArchived) return false;
    if (r.private && !config.includePrivate) return false;
    return !isExcluded(r, config.exclude);
  });
}

export function isExcluded(r: Pick<GhRepo, "name" | "full_name">, patterns: string[]): boolean {
  return patterns.some((p) => {
    const target = p.includes("/") ? r.full_name : r.name;
    if (p.endsWith("*")) return target.toLowerCase().startsWith(p.slice(0, -1).toLowerCase());
    return target.toLowerCase() === p.toLowerCase();
  });
}

async function fetchDeployments(client: GitHubClient, full: string): Promise<DetectedDeployment[]> {
  const deps = (await client.get<GhDeployment[]>(`/repos/${full}/deployments?per_page=30`)) ?? [];
  const latestPerEnv = new Map<string, GhDeployment>();
  for (const d of deps) {
    if (/preview/i.test(d.environment)) continue; // Vercel/Netlify create one per PR
    if (!latestPerEnv.has(d.environment)) latestPerEnv.set(d.environment, d);
  }
  const out: DetectedDeployment[] = [];
  for (const [env, d] of latestPerEnv) {
    const statuses = (await client.get<GhDeploymentStatus[]>(`/repos/${full}/deployments/${d.id}/statuses?per_page=5`)) ?? [];
    const withUrl = statuses.find((s) => s.environment_url);
    const url = withUrl?.environment_url || undefined;
    out.push({
      name: env,
      provider: url ? providerFromUrl(url) : guessProviderFromEnv(env),
      url,
      source: "github-deployments",
      evidence: `environment "${env}"`,
      lastDeployedAt: d.created_at,
    });
  }
  return out;
}

function guessProviderFromEnv(env: string) {
  if (/github-pages/i.test(env)) return "github-pages" as const;
  if (/vercel/i.test(env)) return "vercel" as const;
  if (/netlify/i.test(env)) return "netlify" as const;
  return undefined;
}

export async function scanRepo(gh: GhRepo, opts: ScanOptions): Promise<RepoRecord> {
  const { client, config } = opts;
  const full = gh.full_name;
  const now = opts.now ?? new Date();

  const [languages, root, readmeJson, release] = await Promise.all([
    client.get<Record<string, number>>(`/repos/${full}/languages`),
    client.get<GhContentEntry[]>(`/repos/${full}/contents/`),
    client.get<{ sha: string; content: string; encoding: string }>(`/repos/${full}/readme`),
    client.get<{ tag_name: string; published_at: string; html_url: string }>(`/repos/${full}/releases/latest`),
  ]);
  const rootNames = (root ?? []).map((e) => e.name);

  // .project.yml
  const metaName = META_FILES.find((f) => rootNames.includes(f));
  let metaRaw: unknown = {};
  let yamlProblem: string | undefined;
  if (metaName) {
    const text = await client.getText(`/repos/${full}/contents/${metaName}`);
    try {
      metaRaw = parseYaml(text ?? "") ?? {};
    } catch (e) {
      yamlProblem = `YAML: ${(e as Error).message.split("\n")[0]}`;
    }
  }
  const { meta, problems } = parseProjectMeta(metaRaw);
  if (yamlProblem) problems.unshift(yamlProblem);

  // Manifests → stack
  const manifests = await Promise.all(
    MANIFESTS.filter((m) => rootNames.includes(m)).map((m) => client.getText(`/repos/${full}/contents/${m}`)),
  );
  const stack = detectStack(manifests.filter((m): m is string => !!m));

  // Workflows → deploy hints
  let workflowTexts: string[] = [];
  if (rootNames.includes(".github")) {
    const wf = (await client.get<GhContentEntry[]>(`/repos/${full}/contents/.github/workflows`)) ?? [];
    const files = wf.filter((e) => e.type === "file" && /\.ya?ml$/.test(e.name)).slice(0, 10);
    workflowTexts = (await Promise.all(files.map((f) => client.getText(`/repos/${full}/contents/${f.path}`)))).filter((t): t is string => !!t);
  }

  // Deployments from every source we have, most authoritative first.
  const fromMeta: DetectedDeployment[] = meta.deployments.map((d) => ({
    name: d.name,
    provider: d.provider ?? (d.url ? providerFromUrl(d.url) : undefined),
    url: d.url,
    source: "meta",
    evidence: ".project.yml",
  }));
  const fromGhDeploy = await fetchDeployments(client, full).catch(() => []);
  const fromPages: DetectedDeployment[] = [];
  if (gh.has_pages) {
    const pages = await client.get<{ html_url?: string }>(`/repos/${full}/pages`).catch(() => null);
    if (pages?.html_url) fromPages.push({ name: "github-pages", provider: "github-pages", url: pages.html_url, source: "github-pages" });
  }
  const homepageUrls = [gh.homepage, meta.links.homepage].filter((u): u is string => !!u && /^https?:\/\//.test(u));
  const fromHomepage: DetectedDeployment[] = homepageUrls.map((u) => ({ name: "production", provider: providerFromUrl(u), url: u, source: "homepage" }));
  const fromFiles = detectFromFiles(rootNames, workflowTexts);
  // Metadata/homepage first so stable aliases win over per-deploy URLs.
  const deployments = preferStableUrls(mergeDeployments([fromMeta, fromHomepage, fromPages, fromGhDeploy, fromFiles]));

  // README
  let readme: RepoRecord["readme"];
  let readmeText = "";
  if (readmeJson?.content) {
    readmeText = Buffer.from(readmeJson.content, (readmeJson.encoding as BufferEncoding) || "base64").toString("utf8");
    readme = { length: readmeText.length, sha: readmeJson.sha, excerpt: readmeExcerpt(readmeText) };
  }

  // Summary: explicit > LLM > GitHub description > README excerpt
  let summary = "";
  let summarySource: RepoRecord["summarySource"] = "none";
  let llmTags: string[] = [];
  if (meta.summary) {
    summary = meta.summary;
    summarySource = "meta";
  } else if (opts.summarizer && readme && readme.length >= 200) {
    const s = await opts.summarizer.summarize(full, readme.sha, readmeText, gh.description);
    if (s) {
      summary = s.summary;
      summarySource = "llm";
      llmTags = s.tags;
    }
  }
  if (!summary && gh.description) {
    summary = gh.description;
    summarySource = "description";
  }
  if (!summary && readme?.excerpt) {
    summary = readme.excerpt;
    summarySource = "readme";
  }

  const daysSincePush = Math.max(0, Math.floor((now.getTime() - Date.parse(gh.pushed_at)) / 86_400_000));
  const statusInferred = !meta.status;
  const status = meta.status ?? inferStatus({ archived: gh.archived, daysSincePush, staleDays: config.staleDays });
  const stale = !gh.archived && daysSincePush > config.staleDays && !["done", "archived", "paused", "idea"].includes(meta.status ?? "");
  // The profile README repo (me/me) and backups aren't projects to show off.
  const isProfileRepo = gh.name.toLowerCase() === gh.owner.login.toLowerCase();
  const showcase = meta.showcase ?? (!gh.fork && !isProfileRepo && !/[-_](backup|old|bak)$/i.test(gh.name) && (!gh.private || config.site.includePrivate));

  const base: Omit<RepoRecord, "health" | "healthScore"> = {
    owner: gh.owner.login,
    name: gh.name,
    fullName: full,
    url: gh.html_url,
    private: gh.private,
    fork: gh.fork,
    archived: gh.archived,
    description: gh.description,
    homepage: gh.homepage || null,
    topics: gh.topics ?? [],
    license: gh.license?.spdx_id && gh.license.spdx_id !== "NOASSERTION" ? gh.license.spdx_id : null,
    defaultBranch: gh.default_branch,
    stars: gh.stargazers_count,
    forks: gh.forks_count,
    openIssues: gh.open_issues_count,
    createdAt: gh.created_at,
    pushedAt: gh.pushed_at,
    languages: languages ?? {},
    stack,
    latestRelease: release ? { tag: release.tag_name, publishedAt: release.published_at, url: release.html_url } : undefined,
    readme,
    hasMetaFile: !!metaName,
    meta: { ...meta, tags: meta.tags.length ? meta.tags : llmTags },
    metaProblems: problems,
    status,
    statusInferred,
    summary,
    summarySource,
    deployments,
    daysSincePush,
    stale,
    showcase,
  };
  return { ...base, health: [], healthScore: 100 };
}

/** Check every deployment URL once (deduped), then compute health. */
export async function finalize(records: RepoRecord[], config: Config): Promise<void> {
  if (config.urlCheck.enabled) {
    const urls = [...new Set(records.flatMap((r) => r.deployments.map((d) => d.url).filter((u): u is string => !!u)))];
    const results = new Map(await pool(urls, 8, async (u) => [u, await checkUrl(u, config.urlCheck.timeoutMs)] as const));
    for (const r of records) for (const d of r.deployments) if (d.url) d.check = results.get(d.url);
  }
  for (const r of records) {
    r.health = checkHealth(r, config.language);
    r.healthScore = healthScore(r.health);
  }
}

export async function scan(opts: ScanOptions): Promise<Inventory> {
  const log = opts.log ?? (() => {});
  const repos = await listRepos(opts.client, opts.config);
  log(`Found ${repos.length} repos. Scanning…`);
  const records = await pool(repos, 4, async (gh) => {
    const rec = await scanRepo(gh, opts);
    log(`  ✓ ${gh.full_name}`);
    return rec;
  });
  log("Checking deployment URLs…");
  await finalize(records, opts.config);
  records.sort((a, b) => Date.parse(b.pushedAt) - Date.parse(a.pushedAt));
  return {
    generatedAt: (opts.now ?? new Date()).toISOString(),
    tool: { name: "repofolio", version: VERSION },
    owners: [...new Set(records.map((r) => r.owner))],
    repos: records,
  };
}
