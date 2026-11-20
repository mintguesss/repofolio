import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderCard, renderProfileSection } from "./render/card.js";
import { renderCatalog, stats } from "./render/markdown.js";
import { renderAdminLogin } from "./render/admin.js";
import { buildShowcase, renderSite } from "./render/site.js";
import type { Config } from "./schema.js";
import type { Inventory } from "./types.js";

export interface Outputs {
  dir: string;
  files: string[];
}

/**
 * Write all artifacts. Layout:
 *   out/inventory.json    full data (PRIVATE: contains private repo details)
 *   out/CATALOG.md        full human-readable catalog (PRIVATE)
 *   out/site/index.html   public showcase (safe to publish to GitHub Pages)
 *   out/site/card.svg     public stats card for a profile README
 *   out/site/projects.json public showcase data (same fields as the site) for your own site to consume
 *   out/profile.md        public markdown block for a profile README
 *   out/admin.html        admin view of the site (PRIVATE: every repo, health, env locations)
 *   out/site/admin.html   public login page that loads admin.html from the private hub repo
 */
export function writeOutputs(inv: Inventory, config: Config, dir = config.output.dir): Outputs {
  const site = join(dir, "site");
  mkdirSync(site, { recursive: true });
  const files: [string, string][] = [
    [join(dir, "inventory.json"), JSON.stringify(inv, null, 2)],
    [join(dir, "CATALOG.md"), renderCatalog(inv, config.language)],
    [join(site, "index.html"), renderSite(inv, config, { adminLink: !!(config.admin.enabled && (config.admin.repo ?? process.env.GITHUB_REPOSITORY)) })],
    [join(site, "card.svg"), renderCard(inv, config.language, { accent: config.site.theme.accent, owners: config.owners })],
    [join(site, "projects.json"), JSON.stringify(buildShowcase(inv, config), null, 2)],
    [join(dir, "profile.md"), renderProfileSection(inv, config.language)],
  ];
  const adminRepo = config.admin.repo ?? process.env.GITHUB_REPOSITORY;
  if (config.admin.enabled) {
    files.push([join(dir, "admin.html"), renderSite(inv, config, { admin: true })]);
    if (adminRepo) files.push([join(site, "admin.html"), renderAdminLogin(config, adminRepo)]);
  }
  for (const [p, c] of files) writeFileSync(p, c);
  return { dir, files: files.map(([p]) => p) };
}

/** Drop private repos and private-only metadata, for hubs that are public repos. */
export function redact(inv: Inventory): Inventory {
  return {
    ...inv,
    repos: inv.repos
      .filter((r) => !r.private)
      .map((r) => ({ ...r, meta: { ...r.meta, env: undefined, services: [], domains: [], cost: undefined, private: undefined } })),
  };
}

export function summaryLine(inv: Inventory): string {
  const s = stats(inv);
  const errors = inv.repos.reduce((n, r) => n + r.health.filter((i) => i.level === "error").length, 0);
  return `${s.total} repos · ${s.active} active · ${s.live} live URLs · ${s.down} down · ${s.stale} stale · ${errors} errors`;
}
