import { t, type Lang } from "../i18n.js";
import type { Inventory } from "../types.js";
import { stats } from "./markdown.js";
import { esc, selectShowcase } from "./site.js";

/** Small stats card SVG for a GitHub profile README. Counts only showcased (public-safe) data. */
export function renderCard(inv: Inventory, lang: Lang): string {
  const s = t(lang);
  const shown = { ...inv, repos: inv.repos.filter((r) => r.showcase) };
  const st = stats(shown);
  const stars = shown.repos.filter((r) => !r.private).reduce((n, r) => n + r.stars, 0);
  const items: [string, number][] = [
    [s.total, st.total],
    [lang === "zh-TW" ? "進行中" : "Active", st.active],
    [s.live, st.live],
    ["★", stars],
  ];
  const w = 440;
  const h = 120;
  const col = w / items.length;
  const cells = items
    .map(([label, n], i) => {
      const x = col * i + col / 2;
      return `<text x="${x}" y="70" class="n" text-anchor="middle">${n}</text><text x="${x}" y="94" class="l" text-anchor="middle">${esc(label)}</text>`;
    })
    .join("");
  const owner = inv.owners[0] ?? "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(owner)} projects">
<style>
.bg{fill:#ffffff;stroke:#e5e7eb}.t{fill:#111827;font:600 14px system-ui,sans-serif}.n{fill:#2563eb;font:700 26px system-ui,sans-serif}.l{fill:#6b7280;font:12px system-ui,"Noto Sans TC",sans-serif}
@media (prefers-color-scheme:dark){.bg{fill:#0d1117;stroke:#30363d}.t{fill:#e6edf3}.n{fill:#58a6ff}.l{fill:#8b949e}}
</style>
<rect class="bg" x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10"/>
<text x="18" y="28" class="t">${esc(owner)} · ${lang === "zh-TW" ? "專案概況" : "projects"}</text>
${cells}
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
