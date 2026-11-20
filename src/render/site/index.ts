import type { Config } from "../../schema.js";
import { ANIMATIONS, BACKGROUNDS, CARD_STYLES, FONTS, GLOWS, LAYOUTS, MODES, SCHEMES, THEME_PRESETS } from "../../schema.js";
import type { Inventory } from "../../types.js";
import { buildShowcase, esc, REPO_URL, type PublicProject, type ShowcaseData } from "../public.js";
import { clientMain } from "./client.js";
import { ICONS } from "./icons.js";
import { siteStrings, type SiteStrings } from "./strings.js";
import { PRESET_COLORS, SIMPLE_ACCENT, siteCss } from "./styles.js";

const PROVIDER_ICON: Record<string, string> = { "github-pages": "github-pages", fly: "fly", gcp: "gcp" };

function iconKey(label: string): string | undefined {
  const k = label.toLowerCase();
  if (ICONS[k]) return k;
  if (PROVIDER_ICON[k] && ICONS[PROVIDER_ICON[k]]) return PROVIDER_ICON[k];
  return undefined;
}

/** Relative luminance of a hex colour, 0..1. */
function luminance(hex: string): number {
  const n = parseInt(hex, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

class IconSprite {
  private used = new Set<string>();
  /** Inline icon reference. Very dark/very light brand colours follow the text colour instead. */
  icon(label: string, cls = "ti"): string {
    const key = iconKey(label);
    if (!key) {
      const mono = label.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2) || "?";
      return `<span class="${cls} mono" aria-hidden="true">${esc(mono)}</span>`;
    }
    this.used.add(key);
    const [hex] = ICONS[key]!;
    const lum = luminance(hex);
    const color = lum < 0.04 || lum > 0.85 ? "currentColor" : `#${hex}`;
    return `<svg class="${cls}" style="color:${color}" aria-hidden="true"><use href="#i-${key.replace(/[^a-z0-9]/g, "_")}"/></svg>`;
  }
  sprite(): string {
    const symbols = [...this.used]
      .map((k) => `<symbol id="i-${k.replace(/[^a-z0-9]/g, "_")}" viewBox="0 0 24 24"><path fill="currentColor" d="${ICONS[k]![1]}"/></symbol>`)
      .join("");
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${symbols}</svg>`;
  }
}

function sparkline(values: number[] | undefined, w = 120, h = 28): string {
  if (!values || !values.length || values.every((v) => v === 0)) return "";
  const v = values.slice(-26);
  const max = Math.max(...v, 1);
  const step = w / (v.length - 1 || 1);
  const pts = v.map((n, i) => `${(i * step).toFixed(1)},${(h - 2 - (n / max) * (h - 4)).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline class="spark-area" points="0,${h} ${pts.join(" ")} ${w},${h}"/><polyline class="spark-line" points="${pts.join(" ")}"/></svg>`;
}

function fmtDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "zh-TW" ? "zh-TW" : "en-US", { year: "numeric", month: "short" });
}

function linkLabel(label: string, s: SiteStrings): string {
  return label === "live" ? s.visit : label;
}

function card(p: PublicProject, s: SiteStrings, icons: IconSprite, opts: { big?: boolean } = {}): string {
  const tech = [...new Set([...p.stack, ...p.languages.slice(0, 2).map((l) => l.name)])];
  const text = [p.name, p.repo, p.summary, p.purpose ?? "", ...tech, ...p.tags].join(" ").toLowerCase();
  const live = p.links.find((l) => l.label === "live");
  const links = [
    live ? `<a class="btn-mini primary" href="${esc(live.url)}" target="_blank" rel="noopener">${esc(s.visit)} ↗</a>` : "",
    p.codeUrl ? `<a class="btn-mini" href="${esc(p.codeUrl)}" target="_blank" rel="noopener">${icons.icon("github", "bi")} ${esc(s.code)}</a>` : "",
  ].join("");
  const statusText = s.statusLabels[p.status];
  return `<article class="card reveal${p.featured ? " featured" : ""}${opts.big ? " big" : ""}" tabindex="0" data-id="${esc(p.id)}" data-status="${p.status}" data-tech="${esc(tech.map((x) => x.toLowerCase()).join("|"))}" data-text="${esc(text)}" data-stars="${p.stars}" data-updated="${esc(p.updated)}" data-created="${esc(p.created)}" data-name="${esc(p.name.toLowerCase())}" data-featured="${p.featured ? 1 : 0}">
<div class="cover">${p.image ? `<img loading="lazy" decoding="async" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ""}<div class="cover-fallback" aria-hidden="true"><span>${esc(p.name.slice(0, 1).toUpperCase())}</span></div></div>
<div class="card-body">
<div class="card-top"><span class="dot st-${p.status}" title="${esc(statusText)}"></span><h3>${esc(p.name)}</h3>${p.stars ? `<span class="stars" title="${esc(s.stars)}">★ ${p.stars}</span>` : ""}${p.private ? `<span class="pill">${esc(s.private)}</span>` : ""}</div>
<p class="sum">${esc(p.summary || "—")}</p>
<div class="techs">${tech.slice(0, 6).map((t) => `<span class="tech" title="${esc(t)}">${icons.icon(t)}<em>${esc(t)}</em></span>`).join("")}</div>
${sparkline(p.activity)}
<div class="card-foot"><span class="when" data-time="${esc(p.updated)}">${esc(statusText)}${p.release ? ` · ${esc(p.release)}` : ""}</span><span class="acts">${links}</span></div>
</div>
<span class="shine" aria-hidden="true"></span>
</article>`;
}

function sectionHead(id: string, title: string, sub: string, idx: number): string {
  return `<div class="sec-head reveal"><span class="sec-idx">${String(idx).padStart(2, "0")}</span><div><h2 data-scramble>${esc(title)}</h2><p>${esc(sub)}</p></div></div>`;
}

function heroSection(d: ShowcaseData, config: Config, s: SiteStrings, icons: IconSprite): string {
  const p = d.profile;
  const name = config.site.title || p?.name || d.owner;
  const intro = config.site.hero.intro ?? config.site.tagline ?? p?.bio ?? "";
  const roles = config.site.hero.roles.length ? config.site.hero.roles : d.tech.slice(0, 4).map((t) => t.name);
  const metaBits = [
    p?.location ? `<span>⌖ ${esc(p.location)}</span>` : "",
    p?.company ? `<span>⌂ ${esc(p.company)}</span>` : "",
    p?.blog ? `<a href="${esc(/^https?:/.test(p.blog) ? p.blog : `https://${p.blog}`)}" target="_blank" rel="noopener">↗ ${esc(p.blog.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : "",
  ].filter(Boolean);
  const ghUrl = p?.url ?? `https://github.com/${d.owner}`;
  const extra = config.site.links.map((l) => `<a class="btn ghost magnetic" href="${esc(l.url)}" target="_blank" rel="noopener">${icons.icon(l.label, "bi")} ${esc(l.label)}</a>`).join("");
  const stats: [number, string][] = [
    [d.totals.projects, s.projectsCount],
    [d.totals.live, s.liveCount],
    [d.totals.stars, s.stars],
    [d.totals.languages, s.languages],
    ...(d.totals.commitsYear ? [[d.totals.commitsYear, s.commitsYear] as [number, string]] : []),
  ];
  const avatar = config.site.hero.avatar && p?.avatarUrl
    ? `<div class="avatar"><img src="${esc(p.avatarUrl)}&s=240" alt="${esc(name)}" width="120" height="120"></div>`
    : "";
  const terminal = config.site.hero.terminal
    ? `<div class="terminal reveal" aria-hidden="true"><div class="term-bar"><i></i><i></i><i></i><span>~/${esc(d.owner)} — zsh</span></div><pre class="term-body" id="term"></pre></div>`
    : "";
  return `<section id="hero" class="hero">
<div class="hero-main reveal">
${avatar}
<p class="eyebrow"><span class="caret">&gt;</span> ${esc(s.hello)}<span class="blink">_</span></p>
<h1 class="glitch" data-text="${esc(name)}">${esc(name)}</h1>
<p class="roles"><span id="role" data-roles="${esc(JSON.stringify(roles))}">${esc(roles[0] ?? "")}</span><span class="cursor">|</span></p>
${intro ? `<p class="intro">${esc(intro)}</p>` : ""}
${metaBits.length ? `<p class="hero-meta">${metaBits.join("")}</p>` : ""}
<div class="ctas"><a class="btn primary magnetic" href="${config.site.singlePage ? "#projects" : "#/projects"}">${esc(s.viewProjects)} →</a><a class="btn ghost magnetic" href="${esc(ghUrl)}" target="_blank" rel="noopener">${icons.icon("github", "bi")} GitHub</a>${extra}</div>
<dl class="counters">${stats.map(([n, l]) => `<div><dt class="count" data-to="${n}">0</dt><dd>${esc(l)}</dd></div>`).join("")}</dl>
</div>
${terminal}
${heroShots(d)}
</section>`;
}

/** Simple-mode hero art: a small mosaic of project covers (featured first, then most recent). */
function heroShots(d: ShowcaseData): string {
  const byRecent = [...d.projects].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));
  const pick = [...byRecent.filter((p) => p.featured), ...byRecent.filter((p) => !p.featured)].filter((p) => p.image).slice(0, 4);
  if (pick.length < 2) return "";
  return `<div class="hero-shots simple-only reveal n${pick.length}">${pick
    .map((p) => `<a class="shot" href="#/p/${esc(p.id)}" data-open="${esc(p.id)}" title="${esc(p.name)}"><img loading="lazy" decoding="async" src="${esc(p.image!)}" alt="${esc(p.name)}" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()"><span class="shot-fb" aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</span><b>${esc(p.name)}</b></a>`)
    .join("")}</div>`;
}

function featuredSection(d: ShowcaseData, s: SiteStrings, icons: IconSprite, idx: number): string {
  let list = d.projects.filter((p) => p.featured);
  if (!list.length) list = [...d.projects].sort((a, b) => b.stars - a.stars || Date.parse(b.updated) - Date.parse(a.updated)).slice(0, 3);
  if (!list.length) return "";
  return `<section id="featured" class="sec">${sectionHead("featured", s.featured, s.featuredSub, idx)}<div class="featured-grid">${list.slice(0, 4).map((p) => card(p, s, icons, { big: true })).join("")}</div></section>`;
}

function projectsSection(d: ShowcaseData, config: Config, s: SiteStrings, icons: IconSprite, idx: number): string {
  const statuses = [...new Set(d.projects.map((p) => p.status))];
  const topTech = d.tech.slice(0, 16);
  const layouts = LAYOUTS.map((l) => `<button type="button" data-layout="${l}" aria-pressed="${l === config.site.theme.layout}" title="${l}">${LAYOUT_ICON[l]}</button>`).join("");
  return `<section id="projects" class="sec">${sectionHead("projects", s.projects, s.projectsSub, idx)}
<div class="toolbar reveal" role="search">
<label class="search"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="${esc(s.search)}" aria-label="${esc(s.search)}" autocomplete="off"><kbd>/</kbd></label>
<label class="select"><span>${esc(s.sort)}</span><select id="sort"><option value="featured">${esc(s.sortFeatured)}</option><option value="stars">${esc(s.sortStars)}</option><option value="updated">${esc(s.sortUpdated)}</option><option value="created">${esc(s.sortCreated)}</option><option value="name">${esc(s.sortName)}</option></select></label>
<div class="seg icon-seg" id="layout-switch" aria-label="${esc(s.layout)}">${layouts}</div>
</div>
<div class="filters reveal">
<div class="pills" id="status-filter"><button type="button" data-status="" aria-pressed="true">${esc(s.all)} <b>${d.projects.length}</b></button>${statuses.map((st) => `<button type="button" data-status="${st}" aria-pressed="false" title="${esc(s.statusHelp[st])}"><span class="dot st-${st}"></span>${esc(s.statusLabels[st])} <b>${d.projects.filter((p) => p.status === st).length}</b></button>`).join("")}</div>
${topTech.length ? `<button type="button" class="filter-toggle" id="tech-toggle" aria-expanded="false" aria-controls="tech-filter">${esc(s.techFilter)} <b id="tech-count"></b><span aria-hidden="true">▾</span></button>` : ""}
</div>
<div class="chips" id="tech-filter" hidden>${topTech.map((t) => `<button type="button" class="chip" data-tech="${esc(t.name.toLowerCase())}" aria-pressed="false">${icons.icon(t.name)}${esc(t.name)}<b>${t.count}</b></button>`).join("")}</div>
<div class="grid" id="grid">${d.projects.map((p) => card(p, s, icons)).join("\n")}</div>
<div class="empty" id="empty" hidden><p>${esc(s.noResults)}</p><button type="button" class="btn ghost" id="clear">${esc(s.clear)}</button></div>
</section>`;
}

const LAYOUT_ICON: Record<string, string> = {
  grid: `<svg viewBox="0 0 16 16"><path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z"/></svg>`,
  list: `<svg viewBox="0 0 16 16"><path d="M1 2h14v3H1zM1 6.5h14v3H1zM1 11h14v3H1z"/></svg>`,
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e", wip: "#3b82f6", maintenance: "#eab308", paused: "#f97316", done: "#a855f7", idea: "#06b6d4", archived: "#6b7280",
};

function activityChart(d: ShowcaseData, s: SiteStrings, lang: string): string {
  const max = Math.max(...d.activity, 1);
  const w = 52 * 12;
  const h = 140;
  const end = new Date(d.generatedAt);
  const loc = lang === "zh-TW" ? "zh-TW" : "en-US";
  const bars = d.activity
    .map((n, i) => {
      const bh = Math.max(2, (n / max) * (h - 24));
      const weekStart = new Date(end.getTime() - (51 - i) * 7 * 86_400_000);
      const label = `${weekStart.toLocaleDateString(loc, { month: "short", day: "numeric" })}: ${n}`;
      return `<rect x="${i * 12 + 1}" y="${h - 18 - bh}" width="9" height="${bh}" rx="2" style="--i:${i}" data-tip="${esc(label)}"${n === 0 ? ' class="zero"' : ""}/>`;
    })
    .join("");
  const months: string[] = [];
  for (let i = 0; i < 52; i += 4.33) {
    const dt = new Date(end.getTime() - (51 - Math.round(i)) * 7 * 86_400_000);
    months.push(`<text x="${Math.round(i) * 12}" y="${h - 3}">${esc(dt.toLocaleDateString(loc, { month: "short" }))}</text>`);
  }
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(s.activitySub)}">${bars}${months.join("")}</svg><div class="tip" id="chart-tip" hidden></div>`;
}

function donut(parts: { label: string; n: number; color: string }[], center: string): string {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let off = 0;
  const segs = parts
    .map((p) => {
      const len = (p.n / total) * c;
      const seg = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${p.color}" stroke-width="14" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${esc(p.label)}: ${p.n}</title></circle>`;
      off += len;
      return seg;
    })
    .join("");
  return `<svg class="donut" viewBox="0 0 120 120" aria-hidden="true"><g transform="rotate(-90 60 60)"><circle r="${r}" cx="60" cy="60" fill="none" stroke="var(--line)" stroke-width="14"/>${segs}</g><text x="60" y="58" text-anchor="middle" class="donut-n">${esc(center)}</text></svg>`;
}

function barList(items: { label: string; n: number; icon?: string }[]): string {
  const max = Math.max(...items.map((i) => i.n), 1);
  return `<ul class="barlist">${items
    .map((i) => `<li><span class="bl-name">${i.icon ?? ""}${esc(i.label)}</span><span class="bar"><i style="--w:${(i.n / max) * 100}%"></i></span><b>${i.n}</b></li>`)
    .join("")}</ul>`;
}

function statsSection(d: ShowcaseData, s: SiteStrings, icons: IconSprite, idx: number, lang: string): string {
  if (!d.projects.length) return "";
  const statusCounts = new Map<string, number>();
  for (const p of d.projects) statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
  const providers = new Map<string, number>();
  for (const p of d.projects) for (const dep of new Set(p.deployments.map((x) => x.provider ?? "other"))) providers.set(dep, (providers.get(dep) ?? 0) + 1);
  const years = new Map<number, number>();
  for (const p of d.projects) {
    const y = new Date(p.created).getFullYear();
    if (!Number.isNaN(y)) years.set(y, (years.get(y) ?? 0) + 1);
  }
  const active = statusCounts.get("active") ?? 0;
  const kpis: [number, string][] = [
    [d.totals.projects, s.projectsCount],
    [d.totals.live, s.liveCount],
    [active, s.activeCount],
    [d.totals.stars, s.stars],
    [d.totals.commitsYear, s.commitsYear],
    [d.totals.languages, s.languages],
  ];
  const busiest = Math.max(...d.activity, 0);
  const top = [...d.projects]
    .filter((p) => p.activity?.some((n) => n > 0))
    .map((p) => ({ p, n: p.activity!.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const topMax = top[0]?.n ?? 1;
  const langs = d.languages
    .map((l) => `<li><span class="lang-name">${icons.icon(l.name)}${esc(l.name)}</span><span class="bar"><i style="--w:${l.pct}%"></i></span><span class="pct">${l.pct}%</span></li>`)
    .join("");
  const cloud = d.tech
    .map((t) => `<li class="orb" style="--n:${t.count}" title="${esc(`${t.name} · ${s.usedIn} ${t.count}`)}" data-tech="${esc(t.name.toLowerCase())}">${icons.icon(t.name, "oi")}<span>${esc(t.name)}</span><b>${t.count}</b></li>`)
    .join("");
  const statusParts = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]).map(([st, n]) => ({ label: s.statusLabels[st as keyof SiteStrings["statusLabels"]], n, color: STATUS_COLORS[st] ?? "#888" }));

  return `<section id="stats" class="sec">${sectionHead("stats", s.stats, s.statsSub, idx)}
<dl class="kpi-grid">${kpis.map(([n, l]) => `<div class="kpi panel reveal"><dt class="count" data-to="${n}">0</dt><dd>${esc(l)}</dd></div>`).join("")}</dl>
${d.totals.commitsYear ? `<h3 class="sub-h">${esc(s.activity)}</h3>
<div class="activity-grid"><div class="panel reveal chart-wrap">${activityChart(d, s, lang)}</div>
<div class="panel reveal act-side"><dl class="kpis"><div><dt class="count" data-to="${d.totals.commitsWeek}">0</dt><dd>${esc(s.thisWeek)}</dd></div><div><dt class="count" data-to="${busiest}">0</dt><dd>${esc(s.busiest)}</dd></div></dl>
<h4>${esc(s.mostActive)}</h4><ol class="top-repos">${top.map(({ p, n }) => `<li><a href="#/p/${esc(p.id)}" data-open="${esc(p.id)}">${esc(p.name)}</a><span class="bar"><i style="--w:${(n / topMax) * 100}%"></i></span><b>${n}</b></li>`).join("")}</ol></div></div>` : ""}
<h3 class="sub-h">${esc(s.stack)}</h3>
<div class="stack-grid"><ul class="langs panel reveal">${langs}</ul><ul class="cloud panel reveal">${cloud}</ul></div>
<h3 class="sub-h">${esc(s.breakdown)}</h3>
<div class="breakdown">
<div class="panel reveal"><h4>${esc(s.byStatus)}</h4><div class="donut-wrap">${donut(statusParts, String(d.projects.length))}<ul class="legend">${statusParts.map((p) => `<li><i style="background:${p.color}"></i>${esc(p.label)}<b>${p.n}</b></li>`).join("")}</ul></div></div>
${providers.size ? `<div class="panel reveal"><h4>${esc(s.byHost)}</h4>${barList([...providers.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: k, n, icon: icons.icon(k) })))}</div>` : ""}
${years.size ? `<div class="panel reveal"><h4>${esc(s.byYear)}</h4>${barList([...years.entries()].sort((a, b) => b[0] - a[0]).map(([y, n]) => ({ label: String(y), n })))}</div>` : ""}
</div>
</section>`;
}

function statusSection(d: ShowcaseData, s: SiteStrings, icons: IconSprite, idx: number): string {
  const rows = d.projects.flatMap((p) => p.deployments.map((dep) => ({ p, dep })));
  if (!rows.length) return "";
  const up = rows.filter((r) => r.dep.ok).length;
  return `<section id="status" class="sec">${sectionHead("status", s.status, s.statusSub, idx)}
<div class="panel status-board reveal"><div class="status-sum"><span class="big-dot ${up === rows.length ? "ok" : "bad"}"></span><b>${up}/${rows.length}</b> ${esc(s.up)} · ${esc(s.checked)} <span data-time="${esc(d.generatedAt)}"></span></div>
<ul>${rows
    .map(
      ({ p, dep }) =>
        `<li class="${dep.ok ? "ok" : "bad"}"><span class="pulse"></span><span class="sb-name"><a href="#p/${esc(p.id)}" data-open="${esc(p.id)}">${esc(p.name)}</a><small>${esc(dep.name)}</small></span><span class="sb-prov">${dep.provider ? icons.icon(dep.provider) : ""}${esc(dep.provider ?? "")}</span><a class="sb-url" href="${esc(dep.url)}" target="_blank" rel="noopener">${esc(dep.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a><span class="sb-ms">${dep.ms != null ? `${dep.ms} ms` : ""}</span><span class="sb-state">${esc(dep.ok ? s.up : s.down)}</span></li>`,
    )
    .join("")}</ul></div></section>`;
}

function timelineSection(d: ShowcaseData, s: SiteStrings, idx: number, lang: string): string {
  const list = [...d.projects].sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
  if (!list.length) return "";
  const perYear = new Map<string, number>();
  for (const p of list) {
    const y = String(new Date(p.created).getFullYear());
    perYear.set(y, (perYear.get(y) ?? 0) + 1);
  }
  let lastYear = "";
  let side = 0;
  const items = list
    .map((p) => {
      const y = String(new Date(p.created).getFullYear());
      const yearTag = y !== lastYear && y !== "NaN" ? `<li class="tl-year reveal"><span>${y}</span><small>${perYear.get(y)} ${esc(s.projectsCount)}</small></li>` : "";
      lastYear = y;
      const tech = [...new Set([...p.stack, ...p.languages.slice(0, 2).map((l) => l.name)])].slice(0, 3);
      const thumb = p.image
        ? `<div class="tl-thumb"><img loading="lazy" decoding="async" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()"><span aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</span></div>`
        : `<div class="tl-thumb noimg"><span aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</span></div>`;
      return `${yearTag}<li class="tl-item reveal ${side++ % 2 ? "r" : "l"}"><span class="tl-dot st-${p.status}" title="${esc(s.statusLabels[p.status])}"></span><a class="tl-card" href="#/p/${esc(p.id)}" data-open="${esc(p.id)}">${thumb}<div class="tl-txt"><time datetime="${esc(p.created.slice(0, 10))}">${esc(new Date(p.created).toLocaleDateString(lang === "zh-TW" ? "zh-TW" : "en-US", { month: "short", day: "numeric" }))}</time><h3>${esc(p.name)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}${tech.length ? `<div class="tl-tags">${tech.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}</div></a></li>`;
    })
    .join("");
  return `<section id="timeline" class="sec">${sectionHead("timeline", s.timeline, s.timelineSub, idx)}<ol class="tl">${items}<li class="tl-end" aria-hidden="true"></li></ol></section>`;
}

function themeAttrs(config: Config): string {
  const e = effectiveTheme(config.site.theme);
  return `data-mode="${e.mode}" data-scheme="${e.scheme}" data-preset="${e.preset}" data-bg="${e.background}" data-card="${e.cardStyle}" data-layout="${e.layout}" data-font="${e.font}" data-anim="${e.animation}" data-fx="${e.glow}" data-covers="${e.covers}" data-glow="${e.cursorGlow}" data-tilt="${e.tilt}"`;
}

/** Simple mode switches every effect off; tech mode uses the settings as-is. Mirrored in client.ts. */
export function effectiveTheme(th: Config["site"]["theme"]) {
  if (th.mode !== "simple") return th;
  return { ...th, background: "none" as const, cardStyle: "simple", animation: th.animation === "off" ? ("off" as const) : ("subtle" as const), glow: "none" as const, cursorGlow: false, tilt: false, covers: true };
}

/** CSS variables for a custom background colour; text colours flip to stay readable. Mirrored in client.ts. */
export function bgColorVars(hex: string | undefined): string {
  if (!hex) return "";
  const light = luminance(hex.slice(1)) > 0.4;
  return [
    `--bg:${hex}`,
    `--bg2:color-mix(in srgb,${hex} 92%,${light ? "#000" : "#fff"})`,
    `--card:color-mix(in srgb,${hex} 94%,${light ? "#000" : "#fff"})`,
    `--fg:${light ? "#1c1917" : "#e8edf2"}`,
    `--muted:${light ? "#6b6560" : "#949ba4"}`,
    `--line:${light ? "rgba(0,0,0,.1)" : "rgba(255,255,255,.12)"}`,
    `color-scheme:${light ? "light" : "dark"}`,
  ].join(";");
}

const PAGE_OF: Record<string, string> = { hero: "home", featured: "home", stack: "stats", activity: "stats", status: "stats" };

function homeTiles(d: ShowcaseData, s: SiteStrings, pages: string[]): string {
  const rows = d.projects.flatMap((p) => p.deployments);
  const info: Record<string, [string, string]> = {
    projects: [String(d.totals.projects), s.projectsCount],
    stats: d.totals.commitsYear ? [String(d.totals.commitsYear), s.commitsYear] : [String(d.totals.languages), s.languages],
    status: [`${rows.filter((r) => r.ok).length}/${rows.length}`, s.up],
    timeline: [String(Math.min(...d.projects.map((p) => new Date(p.created).getFullYear()).filter((y) => !Number.isNaN(y)))), s.since],
  };

  const tiles = pages
    .filter((p) => p !== "home" && info[p])
    .map((p) => `<a class="tile reveal" href="#/${p}"><span class="tile-n">${esc(info[p]![0])}</span><span class="tile-l">${esc(info[p]![1])}</span><b>${esc(s.nav[p as keyof SiteStrings["nav"]])} →</b></a>`)
    .join("");
  return tiles ? `<section class="sec tiles-sec"><div class="tiles">${tiles}</div></section>` : "";
}

/** JSON for an inline <script>, safe against `</script>` and U+2028/9. */
function inlineJson(v: unknown): string {
  return JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}

export function renderSite(inv: Inventory, config: Config): string {
  const lang = config.language;
  const s = siteStrings(lang);
  const d = buildShowcase(inv, config);
  const icons = new IconSprite();
  const th = config.site.theme;
  const name = config.site.title || d.profile?.name || d.owner;
  const title = config.site.title || (lang === "zh-TW" ? `${name} · 作品集` : `${name} · Projects`);
  const desc = config.site.tagline || d.profile?.bio || `${d.totals.projects} projects by ${d.owner}`;

  const multi = !config.site.singlePage;
  let idx = 0;
  const rendered = [...new Set(config.site.sections.map((x) => (x === "stack" || x === "activity" ? "stats" : x)))]
    .map((sec): [string, string] => [sec, (() => {
      switch (sec) {
        case "hero":
          return heroSection(d, config, s, icons);
        case "featured":
          return featuredSection(d, s, icons, ++idx);
        case "projects":
          return projectsSection(d, config, s, icons, ++idx);
        case "stats":
          return statsSection(d, s, icons, ++idx, lang);
        case "status":
          return statusSection(d, s, icons, ++idx);
        case "timeline":
          return timelineSection(d, s, ++idx, lang);
      }
    })()])
    .filter(([, html]) => !!html);
  // Group sections into pages (home = hero + featured, every other section is its own page).
  const pageOrder: string[] = [];
  const pageHtml = new Map<string, string[]>();
  for (const [sec, html] of rendered) {
    const page = multi ? (PAGE_OF[sec] ?? sec) : "all";
    if (!pageHtml.has(page)) {
      pageHtml.set(page, []);
      pageOrder.push(page);
    }
    pageHtml.get(page)!.push(html);
  }
  if (multi && pageHtml.has("home")) pageHtml.get("home")!.push(homeTiles(d, s, pageOrder));
  const sections = pageOrder.map((p) => `<div class="page" data-page="${p}">${pageHtml.get(p)!.join("\n")}</div>`).join("\n");
  const navTargets = multi ? pageOrder : rendered.map(([sec]) => sec).filter((x) => x !== "hero");
  const navItems = navTargets
    .map((x) => {
      const label = x === "home" ? s.nav.home : s.nav[x as keyof SiteStrings["nav"]];
      return `<a href="${multi ? `#/${x === "home" ? "" : x}` : `#${x}`}" data-nav="${x}">${esc(label)}</a>`;
    })
    .join("");
  // Icons the client may need for the modal / palette.
  icons.icon("github");
  for (const p of d.projects) for (const dep of p.deployments) if (dep.provider) icons.icon(dep.provider);

  const accent = th.accent ?? (th.mode === "simple" ? SIMPLE_ACCENT : PRESET_COLORS[th.preset].accent);
  const fonts = th.webFonts
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&family=Noto+Sans+TC:wght@400;500;700&display=swap">`
    : "";
  const clientConfig = {
    lang,
    strings: s,
    defaults: { ...th, accent },
    customizer: config.site.customizer,
    multi,
    options: { mode: MODES, scheme: SCHEMES, preset: THEME_PRESETS, background: BACKGROUNDS, cardStyle: CARD_STYLES, layout: LAYOUTS, font: FONTS, animation: ANIMATIONS, glow: GLOWS },
    presetBgs: Object.fromEntries(Object.entries(PRESET_COLORS).map(([k, v]) => [k, v.bg])),
    simpleAccent: SIMPLE_ACCENT,
    presetAccents: Object.fromEntries(Object.entries(PRESET_COLORS).map(([k, v]) => [k, v.accent])),
    terminal: {
      owner: d.owner,
      shown: d.totals.projects,
      live: d.totals.live,
      down: d.projects.reduce((n, p) => n + p.deployments.filter((x) => !x.ok).length, 0),
      langs: d.languages.slice(0, 3).map((l) => l.name),
    },
  };
  const avatar = d.profile?.avatarUrl ? `${d.profile.avatarUrl}&s=64` : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${th.mode === "simple" ? "#ffffff" : PRESET_COLORS[th.preset].bg}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${d.profile?.avatarUrl ? `<meta property="og:image" content="${esc(d.profile.avatarUrl)}">` : ""}
${config.site.url ? `<meta property="og:url" content="${esc(config.site.url)}"><link rel="canonical" href="${esc(config.site.url)}">` : ""}
<meta name="twitter:card" content="summary">
<meta name="generator" content="repofolio">
${avatar ? `<link rel="icon" href="${esc(avatar)}">` : ""}
${fonts}
<style>${siteCss()}</style>
</head>
<body ${themeAttrs(config)} data-multi="${multi}" style="--accent:${accent};--radius:${th.radius}px;${bgColorVars(th.bgColor)}">
${icons.sprite()}
<canvas id="bg" aria-hidden="true"></canvas>
<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="gridlines" aria-hidden="true"></div>
<div class="noise" aria-hidden="true"></div>
<div class="cursor-glow" aria-hidden="true"></div>
<div id="progress" aria-hidden="true"></div>
<header class="nav">
<a class="brand" href="${multi ? "#/" : "#hero"}">${avatar ? `<img src="${esc(avatar)}" alt="" width="28" height="28">` : ""}<span>${esc(d.owner)}</span></a>
<nav>${navItems}</nav>
<div class="nav-actions"><button type="button" class="icon-btn" id="open-palette" title="${esc(s.palette)}"><span>⌕</span><kbd>⌘K</kbd></button>${config.site.customizer ? `<button type="button" class="icon-btn" id="open-custom" title="${esc(s.customize)}" aria-label="${esc(s.customize)}"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.7h4l.4-2.7a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg></button>` : ""}</div>
</header>
<main>
${sections}
</main>
<footer class="foot"><p>${esc(s.generated)} <span data-time="${esc(d.generatedAt)}">${esc(d.generatedAt.slice(0, 10))}</span> · ${esc(s.builtWith)} <a href="${REPO_URL}" target="_blank" rel="noopener">repofolio</a> · <button type="button" class="linklike" id="open-help">?</button></p></footer>
<div class="overlay" id="modal" hidden><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title"><button type="button" class="x" data-close aria-label="${esc(s.close)}">✕</button><div id="m-body"></div></div></div>
<div class="overlay" id="palette" hidden><div class="palette" role="dialog" aria-modal="true" aria-label="${esc(s.palette)}"><input id="pal-q" placeholder="${esc(s.palette)}" autocomplete="off"><ul id="pal-list" role="listbox"></ul></div></div>
<div class="overlay" id="help" hidden><div class="modal small" role="dialog" aria-modal="true"><button type="button" class="x" data-close aria-label="${esc(s.close)}">✕</button><h3>${esc(s.shortcuts)}</h3><dl class="keys">${s.scShortcuts.map(([k, v]) => `<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(v)}</dd>`).join("")}</dl></div></div>
${config.site.customizer ? `<aside class="custom" id="custom" aria-label="${esc(s.customize)}" hidden></aside>` : ""}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="rf-data">${inlineJson({ config: clientConfig, projects: d.projects })}</script>
<script>(${clientMain.toString()})();</script>
</body>
</html>
`;
}
