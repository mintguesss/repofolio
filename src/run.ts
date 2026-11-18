import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderCard, renderProfileSection } from "./render/card.js";
import { renderCatalog, stats } from "./render/markdown.js";
import { renderSite } from "./render/site.js";
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
 *   out/profile.md        public markdown block for a profile README
 */
export function writeOutputs(inv: Inventory, config: Config, dir = config.output.dir): Outputs {
  const site = join(dir, "site");
  mkdirSync(site, { recursive: true });
  const files: [string, string][] = [
    [join(dir, "inventory.json"), JSON.stringify(inv, null, 2)],
    [join(dir, "CATALOG.md"), renderCatalog(inv, config.language)],
    [join(site, "index.html"), renderSite(inv, config)],
    [join(site, "card.svg"), renderCard(inv, config.language)],
    [join(dir, "profile.md"), renderProfileSection(inv, config.language)],
  ];
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
