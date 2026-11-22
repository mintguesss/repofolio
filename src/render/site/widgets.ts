import { esc, type PublicProject, type ShowcaseData } from "../public.js";
import { langColor } from "../colors.js";
import type { SiteStrings } from "./strings.js";

export const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e", wip: "#3b82f6", maintenance: "#eab308", paused: "#f97316", done: "#a855f7", idea: "#06b6d4", archived: "#6b7280",
};

/* ───────── tiny inline icons (24×24, stroke) ───────── */
const ICON: Record<string, string> = {
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  signal: "M2 12h3l3-8 4 16 3-8h7",
  commit: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 12h6M16 12h6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
};
const icon = (k: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;

/* ───────── micro visualisations ───────── */
function ring(pct: number): string {
  const r = 17, c = 2 * Math.PI * r;
  const len = Math.max(0, Math.min(1, pct)) * c;
  return `<svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="ring-bg"/><circle cx="22" cy="22" r="${r}" class="ring-fg" style="--len:${len.toFixed(1)};--c:${c.toFixed(1)}" transform="rotate(-90 22 22)"/><text x="22" y="26" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
}

function spark(values: number[]): string {
  if (!values.some((v) => v > 0)) return "";
  const w = 200, h = 36, max = Math.max(...values, 1);
  const pts = values.map((n, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 2 - (n / max) * (h - 6)).toFixed(1)}`);
  return `<svg class="mspark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polygon class="mspark-a" points="0,${h} ${pts.join(" ")} ${w},${h}"/><polyline class="mspark-l" pathLength="1" points="${pts.join(" ")}"/></svg>`;
}

function stackBar(parts: { label: string; n: number; color: string }[]): string {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  return `<div class="sbar" role="img" aria-label="${esc(parts.map((p) => `${p.label} ${p.n}`).join(", "))}">${parts
    .map((p, i) => `<i style="--w:${((p.n / total) * 100).toFixed(1)}%;--i:${i};background:${p.color}" title="${esc(p.label)} · ${p.n}"></i>`)
    .join("")}</div>`;
}

function columns(values: { label: string; n: number }[]): string {
  const max = Math.max(...values.map((v) => v.n), 1);
  return `<div class="cols" aria-hidden="true">${values.map((v, i) => `<i style="--h:${Math.max(8, (v.n / max) * 100).toFixed(0)}%;--i:${i}" title="${esc(v.label)} · ${v.n}"><em>${esc(v.label)}</em></i>`).join("")}</div>`;
}

interface Stat {
  key: string;
  n: number;
  label: string;
  icon: string;
  viz?: string;
  side?: string;
  href?: string;
  go?: string;
}

function statCard(s: Stat): string {
  const tag = s.href ? "a" : "div";
  return `<${tag} class="stat reveal stat-${s.key}"${s.href ? ` href="${esc(s.href)}"` : ""}>
<div class="stat-head"><span class="stat-ic">${icon(s.icon)}</span><span class="stat-l">${esc(s.label)}</span>${s.go ? `<span class="stat-go">${esc(s.go)} →</span>` : ""}</div>
<div class="stat-main"><span class="stat-n count" data-to="${s.n}"${s.key === "since" ? " data-plain=\"1\"" : ""}>0</span>${s.side ?? ""}</div>
${s.viz ? `<div class="stat-viz">${s.viz}</div>` : ""}
</${tag}>`;
}

function statusParts(d: ShowcaseData, s: SiteStrings) {
  const m = new Map<string, number>();
  for (const p of d.projects) m.set(p.status, (m.get(p.status) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([st, n]) => ({ label: s.statusLabels[st as keyof SiteStrings["statusLabels"]], n, color: STATUS_COLORS[st] ?? "#888" }));
}

function perYear(d: ShowcaseData) {
  const m = new Map<number, number>();
  for (const p of d.projects) {
    const y = new Date(p.created).getFullYear();
    if (!Number.isNaN(y)) m.set(y, (m.get(y) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([y, n]) => ({ label: String(y), n }));
}

/** Number strip on the home page: each card links to the page with the details. */
export function homeStats(d: ShowcaseData, s: SiteStrings, pages: string[], multi: boolean): string {
  if (!d.projects.length) return "";
  const link = (p: string) => (pages.includes(p) ? (multi ? `#/${p}` : `#${p}`) : undefined);
  const years = perYear(d);
  // One year of history makes a single bar; show that year by month instead.
  let since = years;
  if (years.length === 1) {
    const m = new Array<number>(12).fill(0);
    for (const p of d.projects) {
      const dt = new Date(p.created);
      if (!Number.isNaN(dt.getTime())) m[dt.getMonth()]!++;
    }
    const last = new Date(d.generatedAt).getFullYear() === Number(years[0]!.label) ? new Date(d.generatedAt).getMonth() : 11;
    const first = m.findIndex((v) => v > 0);
    since = m.slice(first, last + 1).map((n, i) => ({ label: `${first + i + 1}/${years[0]!.label.slice(2)}`, n }));
  }
  const deps = d.projects.filter((p) => p.deployments.length).length;
  const cards: Stat[] = [
    { key: "projects", n: d.totals.projects, label: s.stat.projects, icon: "folder", viz: stackBar(statusParts(d, s)), href: link("projects"), go: s.nav.projects },
    { key: "live", n: d.totals.live, label: s.stat.live, icon: "signal", side: ring(deps ? d.totals.live / d.totals.projects : 0), href: link("stats"), go: s.nav.stats },
    ...(d.totals.commitsYear ? [{ key: "commits", n: d.totals.commitsYear, label: s.stat.commits, icon: "commit", viz: spark(d.activity), href: link("stats"), go: s.nav.stats }] : []),
    ...(years.length ? [{ key: "since", n: Number(years[0]!.label), label: s.stat.since, icon: "calendar", viz: columns(since), href: link("timeline"), go: s.nav.timeline }] : []),
  ];
  return `<section class="sec stats-strip"><div class="stat-grid">${cards.map((c) => statCard({ ...c, href: c.href ?? undefined })).join("")}</div></section>`;
}

/** KPI cards at the top of the stats page. */
export function statsKpis(d: ShowcaseData, s: SiteStrings): string {
  const parts = statusParts(d, s);
  const active = d.projects.filter((p) => p.status === "active").length;
  const topStars = [...d.projects].filter((p) => p.stars > 0).sort((a, b) => b.stars - a.stars).slice(0, 6);
  const cards: Stat[] = [
    { key: "projects", n: d.totals.projects, label: s.stat.projects, icon: "folder", viz: stackBar(parts) },
    { key: "live", n: d.totals.live, label: s.stat.live, icon: "signal", side: ring(d.totals.projects ? d.totals.live / d.totals.projects : 0) },
    { key: "active", n: active, label: s.stat.active, icon: "bolt", side: ring(d.totals.projects ? active / d.totals.projects : 0) },
    { key: "stars", n: d.totals.stars, label: s.stat.stars, icon: "star", viz: topStars.length ? columns(topStars.map((p) => ({ label: p.name, n: p.stars }))) : "" },
    { key: "commits", n: d.totals.commitsYear, label: s.stat.commits, icon: "commit", viz: spark(d.activity) },
    { key: "langs", n: d.totals.languages, label: s.stat.langs, icon: "code", viz: stackBar(d.languages.slice(0, 8).map((l) => ({ label: l.name, n: l.pct, color: langColor(l.name) }))) },
  ];
  return `<div class="stat-grid kpi6">${cards.map(statCard).join("")}</div>`;
}

/* ───────── timeline: auto-playing stage + track, then a compact list ───────── */
function fmt(iso: string, lang: string, opts: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "zh-TW" ? "zh-TW" : "en-US", opts);
}

function cover(p: PublicProject, cls: string, eager = false): string {
  const letter = esc(p.name.slice(0, 1).toUpperCase());
  return p.image
    ? `<div class="${cls}"><img${eager ? "" : ' loading="lazy"'} decoding="async" src="${esc(p.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg');this.remove()"><span aria-hidden="true">${letter}</span></div>`
    : `<div class="${cls} noimg"><span aria-hidden="true">${letter}</span></div>`;
}

export function timelineSection(d: ShowcaseData, s: SiteStrings, head: string, lang: string): string {
  const list = [...d.projects].sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
  if (!list.length) return "";
  const techOf = (p: PublicProject) => [...new Set([...p.stack, ...p.languages.slice(0, 2).map((l) => l.name)])].slice(0, 3);
  const year = (iso: string) => new Date(iso).getFullYear();
  // Newest first, grouped by year; the page scroll drives a light beam down the centre axis.
  let k = 0;
  const groups = [...new Set(list.map((p) => year(p.created)))].map((y) => {
    const ps = list.filter((p) => year(p.created) === y);
    const items = ps
      .map((p) => {
        const side = k++ % 2 ? "R" : "L";
        return `<li class="tl-item ${side}" style="--c:${STATUS_COLORS[p.status] ?? "#888"}">
<time class="tl-date" datetime="${esc(p.created.slice(0, 10))}"><b>${esc(fmt(p.created, lang, { month: "short" }))}</b><span>${esc(fmt(p.created, lang, { day: "numeric" }).replace(/\D+$/, ""))}</span></time>
<span class="tl-node" aria-hidden="true"><i></i></span>
<a class="tl-card" href="#/p/${esc(p.id)}" data-open="${esc(p.id)}">${cover(p, "tl-img")}
<div class="tl-body"><time>${esc(fmt(p.created, lang, { year: "numeric", month: "short", day: "numeric" }))}</time><h3><span class="dot st-${p.status}"></span>${esc(p.name)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
<div class="tl-tags">${techOf(p).map((t) => `<span>${esc(t)}</span>`).join("")}</div></div></a></li>`;
      })
      .join("");
    return `<li class="tl-year"><span><b>${y}</b><small>${ps.length}</small></span></li>${items}`;
  });
  return `<section id="timeline" class="sec">${head}
<div class="tl" id="tl">
<div class="tl-axis" aria-hidden="true"><i class="tl-beam"></i><i class="tl-comet"></i></div>
<ol class="tl-list">${groups.join("")}<li class="tl-end" aria-hidden="true"><span></span></li></ol>
</div>
</section>`;
}
