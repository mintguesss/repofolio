#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, resolveToken } from "./config.js";
import { GitHubClient } from "./github.js";
import { HUB_CONFIG, projectTemplate } from "./init.js";
import { openStaleIssues } from "./issues.js";
import { publishSite } from "./publish.js";
import { renderProfileSection, spliceProfile } from "./render/card.js";
import { writeOutputs, summaryLine } from "./run.js";
import { scan } from "./scan.js";
import { Summarizer } from "./summarize.js";
import type { Inventory } from "./types.js";
import { VERSION } from "./version.js";

const HELP = `repofolio v${VERSION} — know, showcase and promote every repo you own

Usage:
  repofolio scan      [--config file] [--out dir] [--no-url-check] [--llm] [--lang en|zh-TW]
                      Scan GitHub → out/inventory.json, CATALOG.md, site/index.html, site/card.svg, profile.md
  repofolio init      [dir]            Write a pre-filled .project.yml into a local repo
  repofolio init-hub  [dir]            Write repofolio.config.yml + a scheduled GitHub workflow
  repofolio issues    [--dry-run]      Open "stale project" issues in the hub repo (needs issues.repo or GITHUB_REPOSITORY)
  repofolio render    [--config file] [--out dir] [--lang en|zh-TW]
                      Rebuild every output from out/inventory.json without re-scanning (for theme tweaks)
  repofolio publish   [--dry-run]      Commit site/ (index.html, card.svg, projects.json) to the repo in "publish:"
  repofolio profile   <README.md> [--site-url url]
                      Replace the <!-- repofolio:start/end --> block in a profile README

Auth: REPOFOLIO_TOKEN, GH_TOKEN or GITHUB_TOKEN; falls back to \`gh auth token\`.
      Private repos need a token with repo read access. LLM summaries need ANTHROPIC_API_KEY.
`;

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      config: { type: "string", short: "c" },
      out: { type: "string", short: "o" },
      "no-url-check": { type: "boolean" },
      llm: { type: "boolean" },
      lang: { type: "string" },
      "dry-run": { type: "boolean" },
      "site-url": { type: "string" },
      force: { type: "boolean", short: "f" },
    },
  });

  switch (cmd) {
    case "scan": {
      const { config, path } = loadConfig(values.config);
      if (values["no-url-check"]) config.urlCheck.enabled = false;
      if (values.llm) config.llm.enabled = true;
      if (values.lang === "en" || values.lang === "zh-TW") config.language = values.lang;
      const outDir = values.out ?? config.output.dir;
      console.error(`repofolio v${VERSION}${path ? ` · config ${path}` : " · default config"}`);
      const client = new GitHubClient({ token: await resolveToken(), userAgent: `repofolio/${VERSION}` });
      let summarizer: Summarizer | undefined;
      if (config.llm.enabled) {
        if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) console.error("! llm.enabled but no ANTHROPIC_API_KEY; trying default credentials");
        summarizer = new Summarizer({ model: config.llm.model, lang: config.language, cachePath: join(".repofolio", "summaries.json") });
      }
      const inv = await scan({ config, client, summarizer, log: (m) => console.error(m) });
      summarizer?.save();
      const out = writeOutputs(inv, config, outDir);
      console.error(`\n${summaryLine(inv)}`);
      console.error(`GitHub API requests: ${client.requests}${summarizer ? ` · LLM calls: ${summarizer.calls}` : ""}`);
      for (const f of out.files) console.log(f);
      return 0;
    }
    case "render": {
      const { config } = loadConfig(values.config);
      if (values.lang === "en" || values.lang === "zh-TW") config.language = values.lang;
      const outDir = values.out ?? config.output.dir;
      const inv = JSON.parse(readFileSync(join(outDir, "inventory.json"), "utf8")) as Inventory;
      const out = writeOutputs(inv, config, outDir);
      for (const f of out.files) console.log(f);
      return 0;
    }
    case "publish": {
      const { config } = loadConfig(values.config);
      if (!config.publish) {
        console.error("Add a `publish:` block to repofolio.config.yml, e.g.\n  publish:\n    repo: you/you.github.io\n    path: projects");
        return 1;
      }
      const client = new GitHubClient({ token: await resolveToken(), userAgent: `repofolio/${VERSION}` });
      const res = await publishSite(client, config.publish, join(values.out ?? config.output.dir, "site"), { dryRun: values["dry-run"], log: (m) => console.error(m) });
      for (const c of res.changed) console.log(c);
      return 0;
    }
    case "init": {
      const dir = positionals[0] ?? ".";
      const target = join(dir, ".project.yml");
      if (existsSync(target) && !values.force) {
        console.error(`${target} already exists (use --force to overwrite)`);
        return 1;
      }
      writeFileSync(target, projectTemplate(dir));
      console.log(target);
      return 0;
    }
    case "init-hub": {
      const dir = positionals[0] ?? ".";
      const cfg = join(dir, "repofolio.config.yml");
      const wfDir = join(dir, ".github", "workflows");
      const wf = join(wfDir, "repofolio.yml");
      mkdirSync(wfDir, { recursive: true });
      for (const [p, content] of [[cfg, HUB_CONFIG], [wf, hubWorkflow()]] as const) {
        if (existsSync(p) && !values.force) {
          console.error(`skip ${p} (exists; --force to overwrite)`);
          continue;
        }
        writeFileSync(p, content);
        console.log(p);
      }
      return 0;
    }
    case "issues": {
      const { config } = loadConfig(values.config);
      const hub = config.issues.repo ?? process.env.GITHUB_REPOSITORY;
      if (!hub) {
        console.error("Set issues.repo in the config (owner/name) or run inside GitHub Actions.");
        return 1;
      }
      const invPath = join(values.out ?? config.output.dir, "inventory.json");
      const inv = JSON.parse(readFileSync(invPath, "utf8")) as Inventory;
      const client = new GitHubClient({ token: await resolveToken() });
      const created = await openStaleIssues(client, hub, inv.repos, config.language, values["dry-run"]);
      for (const c of created) console.log(c);
      console.error(`${created.length} issue(s)`);
      return 0;
    }
    case "profile": {
      const readmePath = positionals[0];
      if (!readmePath) {
        console.error("Usage: repofolio profile <README.md> [--site-url url]");
        return 1;
      }
      const { config } = loadConfig(values.config);
      const inv = JSON.parse(readFileSync(join(values.out ?? config.output.dir, "inventory.json"), "utf8")) as Inventory;
      const section = renderProfileSection(inv, config.language, { siteUrl: values["site-url"] });
      const before = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
      writeFileSync(readmePath, spliceProfile(before, section));
      console.log(readmePath);
      return 0;
    }
    case "--version":
    case "-v":
      console.log(VERSION);
      return 0;
    default:
      console.log(HELP);
      return cmd && cmd !== "help" && cmd !== "--help" && cmd !== "-h" ? 1 : 0;
  }
}

export function hubWorkflow(): string {
  return readTemplate("hub-workflow.yml");
}

function readTemplate(name: string): string {
  // Templates are inlined at build time would be nicer; for now read relative to the package.
  const candidates = [new URL(`../templates/${name}`, import.meta.url), new URL(`../../templates/${name}`, import.meta.url)];
  for (const c of candidates) {
    try {
      return readFileSync(c, "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error(`template ${name} not found`);
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(`error: ${(err as Error).message}`);
    process.exit(1);
  },
);
