import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderCard, renderProfileSection } from "./render/card.js";
import { renderCatalog, stats } from "./render/markdown.js";
import { renderAdminLocked, renderAdminLogin } from "./render/admin.js";
import { buildShowcase, esc, renderSite, selectShowcase } from "./render/site.js";
import type { AdminExtras } from "./render/site/promo.js";
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
 *   admin (see config.admin):
 *     encrypted mode: out/site/<admin.page>  the admin build, encrypted with REPOFOLIO_ADMIN_PASSWORD (safe to publish)
 *     repo mode:      out/admin.html (PRIVATE) + out/site/<admin.page>, a login page that loads it from the private repo
 *
 * `adminInv` lets the admin build see private repos while every other output uses a redacted inventory.
 */
export function writeOutputs(inv: Inventory, config: Config, dir = config.output.dir, opts: { adminInv?: Inventory; extras?: AdminExtras; log?: (m: string) => void } = {}): Outputs {
  const site = join(dir, "site");
  mkdirSync(site, { recursive: true });
  const files: [string, string][] = [
    [join(dir, "inventory.json"), JSON.stringify({ ...inv, repos: inv.repos.map(({ privateCover: _, ...r }) => r) }, null, 2)],
    [join(dir, "CATALOG.md"), renderCatalog(inv, config.language)],
    [join(site, "index.html"), ""],
    [join(site, "card.svg"), renderCard(inv, config.language, { accent: config.site.theme.accent, owners: config.owners })],
    [join(site, "projects.json"), JSON.stringify(buildShowcase(inv, config), null, 2)],
    [join(dir, "profile.md"), renderProfileSection(inv, config.language)],
  ];
  const adminInv = opts.adminInv ?? inv;
  const password = process.env.REPOFOLIO_ADMIN_PASSWORD;
  const mode = config.admin.mode === "auto" ? (password ? "encrypted" : "repo") : config.admin.mode;
  let adminPage = false;
  if (config.admin.enabled) {
    const adminHtml = () => renderSite(adminInv, config, { admin: true, extras: opts.extras });
    if (mode === "encrypted") {
      if (password) {
        const owner = config.owners[0] ?? inv.profile?.login ?? inv.owners[0] ?? "";
        files.push([join(site, config.admin.page), renderAdminLocked(config, adminHtml(), password, owner)]);
        adminPage = true;
      } else opts.log?.("admin: mode is encrypted but REPOFOLIO_ADMIN_PASSWORD is not set; skipping the admin page");
    } else {
      files.push([join(dir, "admin.html"), adminHtml()]);
      const repo = config.admin.repo ?? process.env.GITHUB_REPOSITORY;
      if (repo) {
        files.push([join(site, config.admin.page), renderAdminLogin(config, repo)]);
        adminPage = true;
      }
    }
  }
  files[2]![1] = renderSite(inv, config, { adminLink: adminPage && config.admin.link });
  // One small page per public project with its own preview card, so links in posts unfurl with the cover image.
  for (const p of selectShowcase(inv)) {
    if (p.private) continue;
    mkdirSync(join(site, "p", p.id), { recursive: true });
    files.push([join(site, "p", p.id, "index.html"), sharePage(config, p)]);
  }
  for (const [p, c] of files) writeFileSync(p, c);
  return { dir, files: files.map(([p]) => p) };
}

/** Share page for one project: Open Graph tags for crawlers, then straight on to the project in the portfolio. */
export function sharePage(config: Config, p: ReturnType<typeof selectShowcase>[number]): string {
  const base = config.site.url?.replace(/\/?$/, "/");
  const url = base ? `${base}p/${p.id}/` : "";
  const target = `../../#/p/${p.id}`;
  const title = `${p.name}${p.summary ? ` · ${p.summary}` : ""}`.slice(0, 120);
  return `<!doctype html>
<html lang="${config.language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.name)}</title>
<meta name="description" content="${esc(p.summary)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(p.summary || p.name)}">${p.image ? `<meta property="og:image" content="${esc(p.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(p.image)}">` : `<meta name="twitter:card" content="summary">`}${url ? `<meta property="og:url" content="${esc(url)}"><link rel="canonical" href="${esc(url)}">` : ""}
<script>location.replace(${JSON.stringify(target)})</script>
</head><body style="font:16px system-ui;padding:24px"><a href="${esc(target)}">${esc(p.name)} →</a></body></html>
`;
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
