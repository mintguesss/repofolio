import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { GitHubClient } from "./github.js";
import { openStaleIssues } from "./issues.js";
import { renderProfileSection, spliceProfile } from "./render/card.js";
import { redact, writeOutputs, summaryLine } from "./run.js";
import { scan } from "./scan.js";
import { Summarizer } from "./summarize.js";
import { VERSION } from "./version.js";

const input = (name: string, def = ""): string => process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`]?.trim() || def;
const bool = (name: string, def: boolean): boolean => {
  const v = input(name);
  return v ? /^(true|1|yes)$/i.test(v) : def;
};

function setOutput(name: string, value: string) {
  const f = process.env.GITHUB_OUTPUT;
  if (f) appendFileSync(f, `${name}<<__RF__\n${value}\n__RF__\n`);
}

async function run() {
  const token = input("token") || process.env.GITHUB_TOKEN;
  const { config } = loadConfig(input("config") || undefined);
  const outDir = input("out", config.output.dir);
  if (input("language") === "en" || input("language") === "zh-TW") config.language = input("language") as "en" | "zh-TW";
  if (bool("llm", config.llm.enabled)) config.llm.enabled = true;

  const client = new GitHubClient({ token, userAgent: `repofolio-action/${VERSION}` });
  const summarizer = config.llm.enabled
    ? new Summarizer({ model: config.llm.model, lang: config.language, cachePath: join(outDir, ".cache", "summaries.json") })
    : undefined;

  let inv = await scan({ config, client, summarizer, log: (m) => console.log(m) });
  summarizer?.save();

  // Safety: if the hub repo itself is public, never write private details into it.
  const hub = process.env.GITHUB_REPOSITORY;
  if (hub) {
    const hubRepo = await client.get<{ private: boolean }>(`/repos/${hub}`).catch(() => null);
    if (hubRepo && !hubRepo.private && inv.repos.some((r) => r.private)) {
      console.log(`::warning::Hub repo ${hub} is public — private repos and private metadata were left out of CATALOG.md and inventory.json. Make the hub repo private to keep the full catalog.`);
      inv = redact(inv);
    }
  }

  const out = writeOutputs(inv, config, outDir);
  const line = summaryLine(inv);
  console.log(line);

  if (bool("stale-issues", config.issues.stale) && hub) {
    const created = await openStaleIssues(client, config.issues.repo ?? hub, inv.repos, config.language);
    if (created.length) console.log(`Opened ${created.length} stale issue(s)`);
  }

  const profile = input("profile-readme");
  if (profile) {
    const before = existsSync(profile) ? readFileSync(profile, "utf8") : "";
    writeFileSync(profile, spliceProfile(before, renderProfileSection(inv, config.language, { siteUrl: input("site-url") || undefined })));
  }

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const attention = inv.repos.flatMap((r) => r.health.filter((i) => i.level === "error").map((i) => `- **${r.name}**: ${i.message}`));
    appendFileSync(summaryFile, `## repofolio\n\n${line}\n\n${attention.length ? attention.join("\n") : "No errors 🎉"}\n`);
  }
  setOutput("summary", line);
  setOutput("site-dir", join(outDir, "site"));
  setOutput("catalog", join(outDir, "CATALOG.md"));
  setOutput("files", out.files.join("\n"));
}

run().catch((e) => {
  console.log(`::error::${(e as Error).message}`);
  process.exit(1);
});
