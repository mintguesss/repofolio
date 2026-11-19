import type { Lang } from "../i18n.js";
import type { Inventory } from "../types.js";
import { buildShowcase, esc, selectShowcase } from "./site.js";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", HTML: "#e34c26", CSS: "#663399", Kotlin: "#A97BFF",
  Java: "#b07219", Shell: "#89e051", Go: "#00ADD8", Rust: "#dea584", Vue: "#41b883", "C++": "#f34b7d", C: "#555555",
  "C#": "#178600", Swift: "#F05138", Dart: "#00B4AB", PHP: "#4F5D95", Ruby: "#701516", "Jupyter Notebook": "#DA5B0B",
};
const langColor = (n: string) => LANG_COLORS[n] ?? `hsl(${[...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 65% 55%)`;

/**
 * Animated, neon "projects" card for a GitHub profile README (GitHub renders SVG animations in <img>).
 * Built only from showcased, public-safe data.
 */
export function renderCard(inv: Inventory, lang: Lang, opts: { accent?: string; owners?: string[] } = {}): string {
  const d = buildShowcase(inv, { owners: opts.owners ?? [] });
  const zh = lang === "zh-TW";
  const accent = opts.accent ?? "#22d3ee";
  const accent2 = "#a855f7";
  const w = 495;
  const h = 195;
  const items: [string, number][] = [
    [zh ? "專案" : "Projects", d.totals.projects],
    [zh ? "上線中" : "Live", d.totals.live],
    [zh ? "星星" : "Stars", d.totals.stars],
    [zh ? "年提交" : "Commits/yr", d.totals.commitsYear],
  ];
  const col = (w - 40) / items.length;
  const cells = items
    .map(([label, n], i) => {
      const x = 20 + col * i;
      return `<g class="cell" style="animation-delay:${0.15 + i * 0.12}s"><text x="${x}" y="88" class="n">${n.toLocaleString("en-US")}</text><text x="${x}" y="106" class="l">${esc(label)}</text></g>`;
    })
    .join("");

  // 52-week activity sparkline
  const act = d.activity;
  const max = Math.max(...act, 1);
  const sx = (i: number) => 20 + (i / 51) * (w - 40);
  const sy = (n: number) => 150 - (n / max) * 28;
  const line = act.map((n, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)} ${sy(n).toFixed(1)}`).join("");
  const area = `${line}L${sx(51).toFixed(1)} 150L20 150Z`;
  const hasAct = act.some((n) => n > 0);

  // language bar
  let x = 20;
  const barW = w - 40;
  const langs = d.languages.slice(0, 5);
  const total = langs.reduce((a, l) => a + l.pct, 0) || 1;
  const segs = langs
    .map((l) => {
      const sw = (l.pct / total) * barW;
      const seg = `<rect x="${x.toFixed(1)}" y="164" width="${Math.max(0, sw - 2).toFixed(1)}" height="5" rx="2.5" fill="${langColor(l.name)}"/>`;
      x += sw;
      return seg;
    })
    .join("");
  let lx = 20;
  const legend = langs
    .map((l) => {
      const label = `${l.name} ${Math.round(l.pct)}%`;
      const g = `<circle cx="${lx + 3}" cy="182" r="3" fill="${langColor(l.name)}"/><text x="${lx + 10}" y="185" class="lg">${esc(label)}</text>`;
      lx += 16 + label.length * 5.6;
      return lx > w - 10 ? "" : g;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(d.owner)}: ${d.totals.projects} projects, ${d.totals.live} live">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070a18"/><stop offset="1" stop-color="#120a26"/></linearGradient>
<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${accent}"/><stop offset=".5" stop-color="${accent2}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
<linearGradient id="spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
<pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="${accent}" stroke-opacity=".07"/></pattern>
<clipPath id="clip"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12"/></clipPath>
</defs>
<style>
.t{fill:#e6f1ff;font:700 15px 'Segoe UI',system-ui,sans-serif}
.m{fill:#8892b0;font:500 11px ui-monospace,'SFMono-Regular',Consolas,monospace}
.n{fill:#fff;font:800 26px 'Segoe UI',system-ui,sans-serif;filter:drop-shadow(0 0 6px ${accent})}
.l{fill:#8892b0;font:11px 'Segoe UI',system-ui,'Noto Sans TC',sans-serif}
.lg{fill:#a8b2d1;font:10px 'Segoe UI',system-ui,sans-serif}
.cell{opacity:0;animation:in .6s ease-out forwards}
.scan{animation:scan 4s linear infinite}
.dash{stroke-dasharray:180 1400;animation:dash 5s linear infinite}
.spk{stroke-dasharray:1200;stroke-dashoffset:1200;animation:draw 2s .4s ease-out forwards}
.pulse{animation:pulse 2s ease-in-out infinite}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes scan{from{transform:translateX(-120px)}to{transform:translateX(${w + 120}px)}}
@keyframes dash{to{stroke-dashoffset:-1580}}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes pulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.cell,.spk{animation:none;opacity:1;stroke-dashoffset:0}.scan,.dash,.pulse{animation:none}}
</style>
<g clip-path="url(#clip)">
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<rect width="${w}" height="${h}" fill="url(#grid)"/>
<rect class="scan" x="0" y="0" width="80" height="${h}" fill="${accent}" opacity=".05" transform="skewX(-20)"/>
</g>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="none" stroke="${accent}" stroke-opacity=".25"/>
<rect class="dash" x="1" y="1" width="${w - 2}" height="${h - 2}" rx="12" fill="none" stroke="url(#edge)" stroke-width="1.6"/>
<text x="20" y="32" class="t">${esc(d.profile?.name || d.owner)}</text>
<text x="20" y="49" class="m">@${esc(d.owner)} · ${zh ? "專案總覽" : "project inventory"}</text>
<circle class="pulse" cx="${w - 92}" cy="28" r="4" fill="#22c55e"/>
<text x="${w - 82}" y="32" class="m">${d.totals.live} ${zh ? "上線中" : "live"}</text>
${cells}
${hasAct ? `<path d="${area}" fill="url(#spark)"/><path class="spk" d="${line}" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linejoin="round"/>` : ""}
${segs}
${legend}
<text x="${w - 20}" y="49" class="m" text-anchor="end" opacity=".55">repofolio</text>
</svg>
`;
}

export const PROFILE_START = "<!-- repofolio:start -->";
export const PROFILE_END = "<!-- repofolio:end -->";

/** Markdown block listing showcased projects, for splicing into a profile README. */
export function renderProfileSection(inv: Inventory, lang: Lang, opts: { limit?: number; siteUrl?: string } = {}): string {
  const projects = selectShowcase(inv).slice(0, opts.limit ?? 6);
  const lines = projects.map((p) => {
    const live = p.links.find((l) => l.label === "live");
    const name = p.codeUrl ? `[**${p.name}**](${p.codeUrl})` : `**${p.name}**`;
    return `- ${name}${p.stars ? ` ⭐${p.stars}` : ""} — ${p.summary || ""}${live ? ` · [${lang === "zh-TW" ? "線上版" : "live"}](${live.url})` : ""}`;
  });
  const more = opts.siteUrl ? [``, `[${lang === "zh-TW" ? "看全部專案 →" : "All projects →"}](${opts.siteUrl})`] : [];
  return [PROFILE_START, ...lines, ...more, PROFILE_END].join("\n");
}

/** Replace the marked block in a README (or append it if markers are missing). */
export function spliceProfile(readme: string, section: string): string {
  const a = readme.indexOf(PROFILE_START);
  const b = readme.indexOf(PROFILE_END);
  if (a >= 0 && b > a) return readme.slice(0, a) + section + readme.slice(b + PROFILE_END.length);
  return readme.replace(/\s*$/, "\n\n") + section + "\n";
}
