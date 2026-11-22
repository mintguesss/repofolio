import type { Config, Platform } from "../../schema.js";
import { PLATFORM_INFO } from "../../promote/platforms.js";
import { ANIMATIONS, BACKGROUNDS, CARD_STYLES, FONTS, GLOWS, LAYOUTS, MODES, SCHEMES, THEME_PRESETS } from "../../schema.js";
import type { Inventory } from "../../types.js";
import { buildShowcase, esc, REPO_URL, type PublicProject, type ShowcaseData } from "../public.js";
import { clientMain } from "./client.js";
import { ICONS } from "./icons.js";
import { siteStrings, type SiteStrings } from "./strings.js";
import { PRESET_COLORS, SIMPLE_ACCENT, siteCss } from "./styles.js";
import { homeStats, STATUS_COLORS, statsKpis, timelineSection } from "./widgets.js";
import { postsSection, promoClientConfig, rivalsSection, tokenBox, type AdminExtras } from "./promo.js";

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
<div class="card-top"><span class="dot st-${p.status}" title="${esc(statusText)}"></span><h3>${esc(p.name)}</h3>${p.stars ? `<span class="stars" title="${esc(s.stars)}">★ ${p.stars}</span>` : ""}${p.private ? `<span class="pill">${esc(s.private)}</span>` : ""}${p.admin && !p.admin.shown ? `<span class="pill">${esc(s.admin.hidden)}</span>` : ""}${p.admin ? `<span class="hp sm" style="--hc:${healthColor(p.admin.health)}" title="${esc(s.admin.health)}"><b>${p.admin.health}</b></span>` : ""}</div>
<p class="sum">${esc(p.summary || "—")}</p>
<div class="techs">${tech.slice(0, 6).map((t) => `<span class="tech" title="${esc(t)}">${icons.icon(t)}<em>${esc(t)}</em></span>`).join("")}</div>
${sparkline(p.activity)}
<div class="card-foot"><span class="when" data-time="${esc(p.updated)}">${esc(statusText)}${p.release ? ` · ${esc(p.release)}` : ""}</span><span class="acts">${links}</span></div>
</div>
<span class="shine" aria-hidden="true"></span>
</article>`;
}

const healthColor = (h: number) => (h >= 80 ? "#22c55e" : h >= 60 ? "#eab308" : "#ef4444");

/** Admin overview cards: status mix, health, recent commits, idle projects, promotion and competitor summaries. */
function adminOverview(d: ShowcaseData, s: SiteStrings, extras?: AdminExtras): string {
  const X = s.adminx;
  const ps = d.projects.filter((p) => p.admin);
  if (!ps.length) return "";
  const card = (title: string, body: string, link?: string) => `<div class="ov-card reveal"><h4>${esc(title)}${link ? ` <a href="${link}">${esc(X.open)} →</a>` : ""}</h4>${body}</div>`;
  const statuses = Object.entries(ps.reduce<Record<string, number>>((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const stack = `<div class="ov-stack">${statuses.map(([k, n]) => `<i style="flex:${n};background:${STATUS_COLORS[k] ?? "#888"}" title="${esc(s.statusLabels[k as keyof typeof s.statusLabels] ?? k)} ${n}"></i>`).join("")}</div><ul class="ov-legend">${statuses.map(([k, n]) => `<li><span style="background:${STATUS_COLORS[k] ?? "#888"}"></span>${esc(s.statusLabels[k as keyof typeof s.statusLabels] ?? k)}<b>${n}</b></li>`).join("")}</ul>`;
  const buckets = [[X.good, ps.filter((p) => p.admin!.health >= 80).length, "#22c55e"], [X.ok, ps.filter((p) => p.admin!.health >= 60 && p.admin!.health < 80).length, "#eab308"], [X.bad, ps.filter((p) => p.admin!.health < 60).length, "#ef4444"]] as const;
  const maxB = Math.max(1, ...buckets.map((b) => b[1]));
  const health = `<ul class="ov-bars">${buckets.map(([l, n, c]) => `<li><span>${esc(l)}</span><i><b style="width:${(n / maxB) * 100}%;background:${c}"></b></i><em>${n}</em></li>`).join("")}</ul>`;
  const weeks = d.activity.slice(-12);
  const maxW = Math.max(1, ...weeks);
  const commits = `<div class="ov-cols">${weeks.map((n) => `<i style="height:${Math.max(4, (n / maxW) * 100)}%" title="${n}"></i>`).join("")}</div><p class="ov-big"><b>${weeks.reduce((a, b) => a + b, 0)}</b> commits</p>`;
  const idle = [...ps].filter((p) => !p.admin!.archived).sort((a, b) => b.admin!.metrics.daysSincePush - a.admin!.metrics.daysSincePush).slice(0, 5);
  const idleList = `<ul class="ov-list">${idle.map((p) => `<li><button type="button" class="linklike" data-open="${esc(p.id)}">${esc(p.name)}</button><b>${p.admin!.metrics.daysSincePush} ${esc(X.days)}</b></li>`).join("")}</ul>`;
  const cards = [card(X.statusMix, stack), card(X.healthMix, health), card(X.commits12, commits), card(X.idle, idleList)];
  const pr = extras?.promote;
  if (pr) {
    const pending = pr.posts.filter((p) => p.status === "pending").length;
    const published = pr.posts.filter((p) => p.status === "published" || p.status === "partial").length;
    const conn = pr.connections.filter((c) => c.mode === "auto").length;
    cards.push(card(X.promoSum, `<ul class="ov-nums"><li><b>${pending}</b>${esc(X.pending)}</li><li><b>${published}</b>${esc(X.published)}</li><li><b>${conn}/${pr.connections.length}</b>${esc(X.connected)}</li></ul>`, "#/posts"));
  }
  const rv = extras?.competitors;
  if (rv) {
    const reps = Object.values(rv.reports).filter((r) => r.items.length);
    const leading = reps.filter((r) => r.compare.rank === 1).length;
    const gapCount = new Map<string, number>();
    for (const r of reps) for (const g of r.gaps) { const k = g.slice(0, 18); gapCount.set(k, (gapCount.get(k) ?? 0) + 1); }
    const topGap = [...gapCount.entries()].sort((a, b) => b[1] - a[1])[0];
    const gapText = topGap ? reps.flatMap((r) => r.gaps).find((g) => g.startsWith(topGap[0])) : undefined;
    cards.push(card(X.rivalsSum, `<ul class="ov-nums"><li><b>${Object.keys(rv.reports).length}</b>${esc(X.analysed)}</li><li><b>${leading}</b>${esc(X.leading)}</li></ul>${gapText ? `<p class="ov-gap"><small>${esc(X.topGap)} ×${topGap![1]}</small>${esc(gapText)}</p>` : ""}`, "#/rivals"));
  }
  return `<h3 class="sub-h">${esc(X.overview)}</h3><div class="adm-ov">${cards.join("")}</div>`;
}

/** Admin-only page: totals and everything that needs fixing, worst first. */
function adminSection(d: ShowcaseData, s: SiteStrings, idx: number, extras?: AdminExtras): string {
  const A = s.admin;
  const ps = d.projects.filter((p) => p.admin);
  const count = (f: (p: PublicProject) => boolean) => ps.filter(f).length;
  const lv = (l: string) => ps.reduce((k, p) => k + p.admin!.issues.filter((i) => i.level === l).length, 0);
  const errors = lv("error");
  const down = ps.reduce((k, p) => k + p.deployments.filter((x) => !x.ok).length, 0);
  const kpi = (label: string, v: number, bad = false) =>
    `<div class="stat reveal${bad ? " bad" : ""}"><div class="stat-head"><span class="stat-l">${esc(label)}</span></div><div class="stat-main"><span class="stat-n count" data-to="${v}">0</span></div></div>`;
  const list = ps.filter((p) => p.admin!.issues.length).sort((a, b) => a.admin!.health - b.admin!.health);
  const rows = list
    .map((p) => {
      const a = p.admin!;
      return `<li class="adm-row reveal"><button type="button" class="adm-name" data-open="${esc(p.id)}"><span class="dot st-${p.status}"></span><b>${esc(p.name)}</b>${p.private ? `<span class="pill">🔒 ${esc(A.private)}</span>` : ""}${a.shown ? "" : `<span class="pill">${esc(A.hidden)}</span>`}<span class="hp" style="--hc:${healthColor(a.health)}"><b>${a.health}</b></span></button><ul class="adm-issues">${a.issues.map((i) => `<li class="lv-${i.level}">${esc(i.message)}</li>`).join("")}</ul></li>`;
    })
    .join("");
  const ok = ps.length - list.length;
  return `<section id="admin" class="sec">${sectionHead("admin", A.title, A.sub, idx)}
${tokenBox(extras?.dispatch, s)}
<div class="stat-grid kpi6">${kpi(A.repos, ps.length)}${kpi(A.private, count((p) => p.private))}${kpi(A.hidden, count((p) => !p.admin!.shown))}${kpi(A.errors, errors, errors > 0)}${kpi(A.warns, lv("warn"))}${kpi(A.down, down, down > 0)}</div>
${adminOverview(d, s, extras)}
<h3 class="sub-h">${esc(A.issues)}</h3><ol class="adm-list">${rows}</ol>${ok ? `<p class="adm-ok">✓ ${ok} · ${esc(A.allGood)}</p>` : ""}
</section>`;
}

function sectionHead(id: string, title: string, sub: string, idx: number): string {
  return `<div class="sec-head reveal"><span class="sec-idx">${String(idx).padStart(2, "0")}</span><div><h2 data-scramble>${esc(title)}</h2><p>${esc(sub)}</p></div></div>`;
}

const GLOBE = `<svg class="bi" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`;
const norm = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();

function heroSection(d: ShowcaseData, config: Config, s: SiteStrings, icons: IconSprite): string {
  const p = d.profile;
  const name = config.site.title || p?.name || d.owner;
  const intro = config.site.hero.intro ?? config.site.tagline ?? p?.bio ?? "";
  const roles = config.site.hero.roles.length ? config.site.hero.roles : d.tech.slice(0, 4).map((t) => t.name);
  const metaBits = [
    p?.location ? `<span>⌖ ${esc(p.location)}</span>` : "",
    p?.company ? `<span>⌂ ${esc(p.company)}</span>` : "",
    p?.blog && !config.site.links.some((l) => norm(l.url) === norm(p.blog!)) ? `<a href="${esc(/^https?:/.test(p.blog) ? p.blog : `https://${p.blog}`)}" target="_blank" rel="noopener">↗ ${esc(p.blog.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : "",
  ].filter(Boolean);
  const ghUrl = p?.url ?? `https://github.com/${d.owner}`;
  const extra = config.site.links.map((l) => `<a class="btn ghost magnetic" href="${esc(l.url)}" target="_blank" rel="noopener">${iconKey(l.label) ? icons.icon(l.label, "bi") : GLOBE} ${esc(l.label)}</a>`).join("");
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
</div>
${terminal}
</section>`;
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
${statsKpis(d, s)}
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

/** JSON for an inline <script>, safe against `</script>` and U+2028/9. */
function inlineJson(v: unknown): string {
  return JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}

export function renderSite(inv: Inventory, config: Config, opts: { admin?: boolean; adminLink?: boolean; extras?: AdminExtras } = {}): string {
  const admin = !!opts.admin;
  const lang = config.language;
  const s = siteStrings(lang);
  const d = buildShowcase(inv, config, admin);
  const extras = admin ? opts.extras : undefined;
  if (extras?.competitors) for (const p of d.projects) if (p.admin && extras.competitors.reports[p.repo]) p.admin.competitors = extras.competitors.reports[p.repo];
  if (extras?.promote) for (const p of d.projects) {
    const mine = extras.promote.posts.filter((x) => x.event.repo === p.repo);
    if (!p.admin || !mine.length) continue;
    const done = mine.filter((x) => x.status === "published" || x.status === "partial");
    const last = done.at(-1);
    p.admin.posts = { published: done.length, pending: mine.filter((x) => x.status === "pending").length, last: last ? { title: last.event.title, at: last.decidedAt ?? last.createdAt, url: Object.values(last.results).find((r) => r?.url)?.url } : undefined };
    p.admin.postList = [...mine].reverse().slice(0, 12).map((x) => ({
      title: x.event.title,
      status: x.status,
      at: x.decidedAt ?? x.createdAt,
      links: (Object.entries(x.results) as [string, { url?: string } | undefined][]).filter(([, r]) => r?.url).map(([pf, r]) => ({ label: PLATFORM_INFO[pf as Platform]?.label ?? pf, url: r!.url! })),
    }));
  }
  const icons = new IconSprite();
  const th = config.site.theme;
  const name = config.site.title || d.profile?.name || d.owner;
  const title = (admin ? `🔒 ${s.admin.title} · ` : "") + (config.site.title || (lang === "zh-TW" ? `${name} · 作品集` : `${name} · Projects`));
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
          return timelineSection(d, s, sectionHead("timeline", s.timeline, s.timelineSub, ++idx), lang);
      }
    })()])
    .filter(([, html]) => !!html);
  if (admin) {
    const at = rendered.reduce((k, [sec], i) => (sec === "hero" || sec === "featured" ? i + 1 : k), 0);
    const extraSecs: [string, string][] = [["admin", adminSection(d, s, 0, extras)]];
    if (extras?.promote) extraSecs.push(["posts", postsSection(d, extras.promote, s, sectionHead("posts", s.promo.title, s.promo.sub, 0), lang, extras.dispatch)]);
    if (extras?.competitors) extraSecs.push(["rivals", rivalsSection(d, extras.competitors, s, sectionHead("rivals", s.rivals.title, s.rivals.sub, 0))]);
    rendered.splice(at, 0, ...extraSecs);
  }
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
  if (pageHtml.has(multi ? "home" : "all") && rendered[0]?.[0] === "hero") pageHtml.get(multi ? "home" : "all")!.splice(1, 0, homeStats(d, s, multi ? pageOrder : rendered.map(([x]) => x), multi));
  const sections = pageOrder.map((p) => `<div class="page" data-page="${p}">${pageHtml.get(p)!.join("\n")}</div>`).join("\n");
  const navTargets = multi ? pageOrder : rendered.map(([sec]) => sec).filter((x) => x !== "hero");
  const navItems = navTargets
    .map((x) => {
      const label = x === "home" ? s.nav.home : x === "admin" ? `🔒 ${s.admin.nav}` : x === "posts" ? `📣 ${s.promo.nav}` : x === "rivals" ? `🎯 ${s.rivals.nav}` : s.nav[x as keyof SiteStrings["nav"]];
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
    promo: promoClientConfig(extras?.promote),
    admin: admin ? { dispatch: extras?.dispatch, generatedAt: d.generatedAt } : undefined,
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
      langs: d.languages.slice(0, 4).map((l) => l.name),
      name: config.site.title || d.profile?.name || d.owner,
      roles: config.site.hero.roles,
      projects: [...d.projects].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated)).map((p) => p.name),
      commits: d.totals.commitsYear,
      stars: d.totals.stars,
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
<meta name="generator" content="repofolio">${admin ? `<meta name="robots" content="noindex,nofollow">` : ""}
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
${admin ? `<div class="admin-bar">🔒 ${esc(s.admin.mode)}<span class="adm-upd">${esc(s.adminx.updated)} <span data-time="${esc(d.generatedAt)}">${esc(d.generatedAt.slice(0, 16).replace("T", " "))}</span></span>${extras?.dispatch ? `<button type="button" id="adm-refresh">⟳ ${esc(s.adminx.refresh)}</button>` : ""}<a href="./">${esc(s.admin.publicSite)} ↗</a><button type="button" onclick="try{[localStorage,sessionStorage].forEach(function(s){Object.keys(s).forEach(function(k){if(k.indexOf('repofolio-admin')===0)s.removeItem(k)})})}catch(e){};location.href='./'">${esc(s.admin.logout)}</button></div>` : ""}
<header class="nav">
<a class="brand" href="${multi ? "#/" : "#hero"}">${avatar ? `<img src="${esc(avatar)}" alt="" width="28" height="28">` : ""}<span>${esc(d.owner)}</span></a>
<nav>${navItems}</nav>
<div class="nav-actions"><button type="button" class="icon-btn" id="open-palette" title="${esc(s.palette)}"><span>⌕</span><kbd>⌘K</kbd></button>${config.site.customizer ? `<button type="button" class="icon-btn" id="open-custom" title="${esc(s.customize)}" aria-label="${esc(s.customize)}"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.7h4l.4-2.7a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg></button>` : ""}</div>
</header>
<main>
${sections}
</main>
<footer class="foot"><p>${esc(s.generated)} <span data-time="${esc(d.generatedAt)}">${esc(d.generatedAt.slice(0, 10))}</span> · ${esc(s.builtWith)} <a href="${REPO_URL}" target="_blank" rel="noopener">repofolio</a> · <button type="button" class="linklike" id="open-help">?</button>${opts.adminLink && !admin ? ` · <a href="${esc(config.admin.page)}" class="adm-link" title="${esc(s.admin.nav)}" aria-label="${esc(s.admin.nav)}">🔒</a>` : ""}</p></footer>
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
