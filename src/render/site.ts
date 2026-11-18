import { STATUS_EMOJI, statusLabel, t, type Lang } from "../i18n.js";
import type { Config } from "../schema.js";
import type { Inventory, RepoRecord } from "../types.js";
import { topStack } from "./markdown.js";

export const REPO_URL = "https://github.com/mintguesss/repofolio";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Only safe-to-publish fields. Never env/services/domains/cost/private. */
export interface PublicProject {
  name: string;
  repo: string;
  codeUrl?: string;
  summary: string;
  status: RepoRecord["status"];
  stack: string[];
  tags: string[];
  stars: number;
  updated: string;
  release?: string;
  featured: boolean;
  links: { label: string; url: string }[];
}

export function toPublic(r: RepoRecord): PublicProject {
  const links: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  const add = (label: string, url?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ label, url });
  };
  for (const d of r.deployments) {
    if (!d.url || (d.check && !d.check.ok)) continue;
    if (/staging|preview|dev/i.test(d.name)) continue;
    add(d.provider === "npm" ? "npm" : d.provider === "pypi" ? "PyPI" : "live", d.url);
  }
  const l = r.meta.links;
  add("demo", l.demo);
  add("docs", l.docs);
  add("video", l.video);
  add("slides", l.slides);
  add("paper", l.paper);
  for (const o of l.other) add(o.label, o.url);
  return {
    name: r.meta.name ?? r.name,
    repo: r.private ? r.name : r.fullName,
    codeUrl: r.private ? undefined : r.url,
    summary: r.summary,
    status: r.status,
    stack: topStack(r, 5),
    tags: [...new Set([...r.meta.tags, ...r.topics])].slice(0, 6),
    stars: r.private ? 0 : r.stars,
    updated: r.pushedAt,
    release: r.private ? undefined : r.latestRelease?.tag,
    featured: r.meta.featured,
    links,
  };
}

export function selectShowcase(inv: Inventory): PublicProject[] {
  return inv.repos
    .filter((r) => r.showcase)
    .map(toPublic)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.stars - a.stars || Date.parse(b.updated) - Date.parse(a.updated));
}

export function renderSite(inv: Inventory, config: Config): string {
  const lang = config.language;
  const s = t(lang);
  const projects = selectShowcase(inv);
  const owner = inv.owners[0] ?? "";
  const title = config.site.title || (lang === "zh-TW" ? `${owner} 的作品集` : `${owner}'s projects`);
  const tagline = config.site.tagline || "";
  const statuses = [...new Set(projects.map((p) => p.status))];
  const cards = projects.map((p) => card(p, lang)).join("\n");
  const headerLinks = [{ label: "GitHub", url: `https://github.com/${owner}` }, ...config.site.links]
    .map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`)
    .join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(tagline || title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(tagline || `${projects.length} projects`)}">
<style>
:root{--bg:#fafaf9;--fg:#1c1917;--muted:#78716c;--card:#fff;--line:#e7e5e4;--accent:#2563eb;--chip:#f5f5f4}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#f5f5f4;--muted:#a8a29e;--card:#1c1917;--line:#292524;--accent:#60a5fa;--chip:#292524}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,"Segoe UI","Noto Sans TC",sans-serif}
main{max-width:1100px;margin:0 auto;padding:48px 16px 64px}
header h1{font-size:2rem;margin:0 0 4px;letter-spacing:-.02em}
header p{margin:0;color:var(--muted)}
header nav{margin-top:12px;display:flex;gap:14px;flex-wrap:wrap}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:28px 0 18px}
.bar input{flex:1 1 220px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);font:inherit}
.bar button{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--fg);font:inherit;cursor:pointer}
.bar button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 16px 14px;display:flex;flex-direction:column;gap:8px}
.card.featured{border-color:var(--accent)}
.top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.card h2{font-size:1.05rem;margin:0;word-break:break-word}
.meta{color:var(--muted);font-size:.82rem;white-space:nowrap}
.card p{margin:0;flex:1}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:var(--chip);border-radius:6px;padding:1px 8px;font-size:.78rem;color:var(--muted)}
.links{display:flex;gap:12px;flex-wrap:wrap;font-size:.88rem;padding-top:4px;border-top:1px solid var(--line)}
footer{margin-top:40px;color:var(--muted);font-size:.85rem;text-align:center}
.empty{color:var(--muted);display:none}
</style>
</head>
<body>
<main>
<header>
<h1>${esc(title)}</h1>
${tagline ? `<p>${esc(tagline)}</p>` : ""}
<nav>${headerLinks}</nav>
</header>
<div class="bar" role="search">
<input id="q" type="search" placeholder="${esc(s.search)}" aria-label="${esc(s.search)}">
<button data-status="" aria-pressed="true">${esc(s.all)} (${projects.length})</button>
${statuses.map((st) => `<button data-status="${st}" aria-pressed="false">${STATUS_EMOJI[st]} ${esc(statusLabel(lang, st))}</button>`).join("\n")}
</div>
<div class="grid" id="grid">
${cards}
</div>
<p class="empty" id="empty">—</p>
<footer>${esc(s.updated)} ${inv.generatedAt.slice(0, 10)} · ${esc(s.madeWith)} <a href="${REPO_URL}">repofolio</a></footer>
</main>
<script>
(function(){
  var q=document.getElementById('q'),cards=[].slice.call(document.querySelectorAll('.card')),btns=[].slice.call(document.querySelectorAll('.bar button')),status='';
  function apply(){var term=q.value.trim().toLowerCase(),n=0;cards.forEach(function(c){var show=(!status||c.dataset.status===status)&&(!term||c.dataset.text.indexOf(term)>=0);c.hidden=!show;if(show)n++});document.getElementById('empty').style.display=n?'none':'block'}
  q.addEventListener('input',apply);
  btns.forEach(function(b){b.addEventListener('click',function(){status=b.dataset.status;btns.forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});apply()})});
})();
</script>
</body>
</html>
`;
}

function card(p: PublicProject, lang: Lang): string {
  const s = t(lang);
  const text = [p.name, p.summary, ...p.stack, ...p.tags].join(" ").toLowerCase();
  const meta = [p.stars ? `★ ${p.stars}` : "", p.release ?? "", `${STATUS_EMOJI[p.status]} ${statusLabel(lang, p.status)}`].filter(Boolean).join(" · ");
  const links = [
    ...p.links.map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.label === "live" ? s.visit + " ↗" : l.label)}</a>`),
    p.codeUrl ? `<a href="${esc(p.codeUrl)}" rel="noopener">${esc(s.viewCode)}</a>` : "",
  ].filter(Boolean);
  const chips = [...p.stack, ...p.tags.filter((tg) => !p.stack.some((x) => x.toLowerCase() === tg.toLowerCase()))].slice(0, 7);
  return `<article class="card${p.featured ? " featured" : ""}" data-status="${p.status}" data-text="${esc(text)}">
<div class="top"><h2>${esc(p.name)}</h2><span class="meta">${esc(meta)}</span></div>
<p>${esc(p.summary || "—")}</p>
${chips.length ? `<div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
${links.length ? `<div class="links">${links.join("")}</div>` : ""}
</article>`;
}
