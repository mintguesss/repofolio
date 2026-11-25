import type { Config } from "./schema.js";
import type { GitHubClient } from "./github.js";
import type { State } from "./state.js";
import type { RepoRecord } from "./types.js";
import { personalKit } from "./personal-kit.js";

/** A form pre-filled from a repo, in the personal site's own fields. Strings only (the admin page edits them). */
export interface SiteSuggestion {
  id: string;
  repo: string;
  /** Why it's suggested: "new" = a public repo the site doesn't have yet. */
  reason: "new";
  team?: string;
  summary: string;
  form: Record<string, string>;
}

/** What the admin page's personal-site tab gets. */
export interface SiteExtras {
  repo: string;
  branch: string;
  data: string;
  details: string;
  publicDir: string;
  base: string;
  url?: string;
  ok: boolean;
  error?: string;
  suggestions: SiteSuggestion[];
  dismissed: SiteSuggestion[];
  counts: Record<string, number>;
  groups: string[];
}

const ML = /pytorch|tensorflow|yolo|opencv|mediapipe|bert|transformers|scikit|sklearn|whisper|llama|keras|vit\b|ocr/i;
const DEV = /cli|plugin|action|github|developer|devtool|sdk|library|vscode|claude-code|mcp/i;
const DESKTOP = /tray|desktop|electron|tauri|pystray|windows|tkinter|pyqt/i;
const WEB = /next|react|vue|svelte|nuxt|express|fastapi|flask|django|laravel|supabase|firebase/i;

function groupOf(r: RepoRecord, groups: string[]): string {
  const hay = [...r.stack, ...r.topics, ...Object.keys(r.languages)].join(" ");
  const pick = (want: RegExp, fallback: string) => groups.find((g) => want.test(g)) ?? fallback;
  if (DESKTOP.test(hay)) return pick(/桌面|desktop/i, "桌面工具");
  if (ML.test(hay)) return pick(/ml|ai/i, "Applied ML");
  if (DEV.test(hay)) return pick(/開發者|dev/i, "開發者工具");
  if (WEB.test(hay)) return pick(/full|全端/i, "Full-stack");
  return groups[0] ?? "Side project";
}

function platformOf(r: RepoRecord): string {
  const hay = [...r.stack, ...r.topics].join(" ");
  if (DESKTOP.test(hay)) return "Windows 桌面";
  if (/pwa|react native|flutter|expo|android|ios/i.test(hay)) return "Web / 手機";
  if (/action|cli|plugin/i.test(hay)) return "命令列 / GitHub";
  if (r.deployments.some((d) => d.url)) return "Web";
  return "";
}

/** A first draft for a repo, in the fields of a `builds` entry and its detail page. */
export function draftFor(r: RepoRecord, groups: string[]): SiteSuggestion {
  const K = personalKit();
  const tags = [...new Set([...r.stack, ...Object.keys(r.languages)])].slice(0, 6);
  const intro = r.readme?.intro;
  const about = r.brief?.about || intro?.paragraphs[0] || r.summary;
  const features = (r.brief?.features.length ? r.brief.features : intro?.features ?? []).slice(0, 6);
  const y1 = (r.meta.started ?? r.createdAt).slice(0, 4);
  const y2 = r.pushedAt.slice(0, 4);
  const live = r.homepage || r.deployments.find((d) => d.url && d.check?.ok !== false)?.url || "";
  const short = (r.description ?? "").length <= 32 ? (r.description ?? "") : "";
  return {
    id: K.slugify(r.name),
    repo: r.fullName,
    reason: "new",
    team: r.role === "contributor" ? r.owner : undefined,
    summary: r.summary,
    form: {
      kind: "build",
      id: K.slugify(r.name),
      title: r.meta.name ?? r.name,
      subtitle: short,
      group: groupOf(r, groups),
      period: y1 === y2 ? y1 : `${y1} — ${y2}`,
      tags: tags.join(", "),
      description: about,
      image: r.meta.image ?? r.cover ?? "",
      github: r.url,
      demo: live,
      oneLiner: r.summary !== about ? r.summary : "",
      metadata: [
        `角色 | ${r.role === "contributor" ? `團隊協作（${r.owner}）` : "獨立開發"}`,
        tags.length ? `技術主軸 | ${tags.slice(0, 3).join(" · ")}` : "",
        platformOf(r) ? `平台 | ${platformOf(r)}` : "",
      ].filter(Boolean).join("\n"),
      highlights: features.slice(0, 4).map((f) => `${f.length > 18 ? f.slice(0, 18) + "…" : f} | ${f} | `).join("\n"),
      problem: (intro?.paragraphs ?? []).slice(0, 2).join("\n\n"),
      features: features.map((f) => `${f} | | `).join("\n"),
      decisions: "",
      architecture: "",
      techStack: tags.join(", "),
    },
  };
}

/** Read the personal site's data and list public repos that aren't on it yet. */
export async function personalSite(o: { config: Config; client: GitHubClient; repos: RepoRecord[]; state: State; log?: (m: string) => void }): Promise<SiteExtras | undefined> {
  const c = o.config.personalSite;
  if (!c.repo) return undefined;
  const base: SiteExtras = { repo: c.repo, branch: c.branch, data: c.data, details: c.details, publicDir: c.publicDir, base: c.base, url: c.url, ok: false, suggestions: [], dismissed: [], counts: {}, groups: [] };
  const ref = `?ref=${encodeURIComponent(c.branch)}`;
  const path = (p: string) => p.split("/").map(encodeURIComponent).join("/");
  const data = await o.client.getText(`/repos/${c.repo}/contents/${path(c.data)}${ref}`).catch((e: Error) => { base.error = e.message.slice(0, 160); return null; });
  if (!data) {
    base.error ??= `${c.data} not found on ${c.repo}@${c.branch}`;
    o.log?.(`::warning::personal site: ${base.error}`);
    return base;
  }
  const details = (await o.client.getText(`/repos/${c.repo}/contents/${path(c.details)}${ref}`).catch(() => null)) ?? "";
  const K = personalKit();
  const known = K.known(data + "\n" + details);
  for (const sk of c.skip) known.add(K.norm(sk.split("/").pop()!));
  const siteName = c.repo.split("/")[1]!;
  known.add(K.norm(siteName));
  const groups = K.groups(data);
  const dismissed = new Set(o.state.site?.dismissed ?? []);
  const fresh = o.repos
    .filter((r) => !r.private && !r.fork && r.showcase && r.name.toLowerCase() !== r.owner.toLowerCase() && !known.has(K.norm(r.name)) && !known.has(K.norm(r.meta.name ?? "")))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((r) => draftFor(r, groups));
  return {
    ...base,
    ok: true,
    suggestions: fresh.filter((x) => !dismissed.has(x.repo)),
    dismissed: fresh.filter((x) => dismissed.has(x.repo)),
    counts: Object.fromEntries(["projects", "builds", "awards", "certifications", "experience"].map((sec) => [sec, K.count(data, sec)])),
    groups,
  };
}
