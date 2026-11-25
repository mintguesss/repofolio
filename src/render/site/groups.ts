import { esc, pickFeatured, type PublicProject } from "../public.js";
import type { SiteStrings } from "./strings.js";

/** Icons for the group bars (projects grid and the competitors page). */
export const GROUP_ICON: Record<string, string> = {"featured":"<path d=\"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z\"/>","ai":"<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4\"/>","web":"<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>","dev":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 9l3 3-3 3M13 15h4\"/>","other":"<rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/>","team":"<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6\"/>","hidden":"<path d=\"M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2\"/>"};

/** A group heading. With fold, it is a bar that opens and closes the group (the client fills the count and the name preview). */
export function groupBar(s: SiteStrings, g: string, title: string, sub = "", fold = true): string {
  return `<div class="grid-sep" data-sep="${g}"${fold ? ` role="button" tabindex="0" aria-expanded="true" title="${esc(s.cats.fold)}"` : ""}>${GROUP_ICON[g] ? `<div class="gs-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${GROUP_ICON[g]}</svg></div>` : ""}<div class="gs-t"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>${fold ? '<div class="gs-peek" aria-hidden="true"></div>' : ""}<em></em>${fold ? '<i class="fold" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></i>' : ""}</div>`;
}

/** Title and subtitle of a group: featured, a category, or (admin) not public. */
export function groupTitle(s: SiteStrings, g: string): [string, string] {
  if (g === "hidden") return [s.adminx.groupHidden, s.adminx.groupHiddenSub];
  return [s.cats[g as keyof typeof s.cats], s.catSub[g as keyof typeof s.catSub]];
}

/** Which group a project goes in: featured (the public pick), not public (admin only), else its category. */
export function projectGroups(ps: PublicProject[]): (p: PublicProject) => string {
  const feat = new Set(pickFeatured(ps.filter((p) => !p.admin || p.admin.shown)).map((p) => p.id));
  return (p) => (p.admin && !p.admin.shown ? "hidden" : feat.has(p.id) ? "featured" : p.category);
}
