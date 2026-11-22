import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { GitHubClient } from "./github.js";
import { openStaleIssues } from "./issues.js";
import { publishSite } from "./publish.js";
import { renderProfileSection, spliceProfile } from "./render/card.js";
import { redact, writeOutputs, summaryLine } from "./run.js";
import { analyzeCompetitors } from "./competitors.js";
import { attachBriefs, writeIntros } from "./intro.js";
import { parseRequests, runPromote } from "./promote/index.js";
import type { AdminExtras } from "./render/site/promo.js";
import { scan } from "./scan.js";
import { GitHubStateStore, emptyState, type State } from "./state.js";
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

  // Logs of a public repo are public: mask every private repo name before anything can print it.
  const onList = (repos: { name: string; full_name: string; private: boolean }[]) => {
    for (const r of repos) if (r.private) console.log(`::add-mask::${r.full_name}\n::add-mask::${r.name}`);
  };
  let inv = await scan({ config, client, summarizer, log: (m) => console.log(m), onList });
  const full = inv;
  summarizer?.save();

  // Safety: if the hub repo itself is public, never write private details into it.
  const hub = process.env.GITHUB_REPOSITORY;
  const password = process.env.REPOFOLIO_ADMIN_PASSWORD;
  const hubRepo = hub ? await client.get<{ private: boolean }>(`/repos/${hub}`).catch(() => null) : null;
  if (hubRepo && !hubRepo.private && inv.repos.some((r) => r.private)) {
    // Public repo: plaintext outputs never get private repos; only the encrypted admin page sees them.
    if (!password) console.log(`::notice::${hub} is public, so private repos are left out of CATALOG.md and inventory.json. Set REPOFOLIO_ADMIN_PASSWORD to get them in the encrypted admin page.`);
    inv = redact(inv);
  }
  const encrypted = !!password && config.admin.mode !== "repo";

  // Promotion + competitor analysis keep state on a branch of the hub repo.
  const extras: AdminExtras = {};
  const wf = /\/\.github\/workflows\/([^@]+)@/.exec(process.env.GITHUB_WORKFLOW_REF ?? "")?.[1];
  if (hub && wf) extras.dispatch = { repo: hub, workflow: wf, ref: process.env.GITHUB_REF_NAME || "main" };
  const requests = parseRequests(input("posts"), (m) => console.log(m));
  const wantCompetitors = config.competitors.enabled && config.admin.enabled;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  if (hub && (config.promote.enabled || requests.length || wantCompetitors || hasClaude)) {
    // Private repos may only enter the state when nobody else can read it: encrypted, or a private hub.
    const allowPrivate = !!password || hubRepo?.private === true;
    const stateClient = new GitHubClient({ token: input("state-token") || process.env.GITHUB_TOKEN || token, userAgent: `repofolio-action/${VERSION}` });
    const store = new GitHubStateStore(stateClient, hub, config.state.branch, password);
    let state: State;
    try {
      state = await store.load();
    } catch (e) {
      console.log(`::warning::state: can't read the ${config.state.branch} branch (${(e as Error).message.slice(0, 160)}); starting fresh`);
      state = emptyState();
    }
    const env = process.env as Record<string, string | undefined>;
    // Short bilingual intros (Claude), before drafting so posts can use the feature list.
    if (hasClaude) await writeIntros(full.repos, { state, model: config.llm.model, allowPrivate, log: (m) => console.log(m) }).catch((e) => console.log(`::warning::intros: ${(e as Error).message.slice(0, 200)}`));
    attachBriefs(full.repos, state, config.language);
    attachBriefs(inv.repos, state, config.language);
    if (config.promote.enabled || requests.length) {
      const res = await runPromote({ inv: full, config, state, requests, env, log: (m) => console.log(m) });
      extras.promote = {
        enabled: config.promote.enabled,
        platforms: config.promote.platforms,
        posts: state.posts,
        connections: res.connections,
      };
    }
    if (wantCompetitors) {
      const useLlm = config.competitors.llm === true || (config.competitors.llm === "auto" && !!process.env.ANTHROPIC_API_KEY);
      await analyzeCompetitors(full.repos, { config, client, state, allowPrivate, llm: useLlm && !!process.env.ANTHROPIC_API_KEY, log: (m) => console.log(m) })
        .catch((e) => console.log(`::warning::competitors: ${(e as Error).message.slice(0, 200)}`));
      extras.competitors = { enabled: true, reports: state.competitors };
    }
    if (!allowPrivate) {
      // Plain JSON on a public branch: keep it to public repos.
      const pub = new Set(full.repos.filter((r) => !r.private).map((r) => r.fullName));
      for (const k of Object.keys(state.competitors)) if (!pub.has(k)) delete state.competitors[k];
      for (const k of Object.keys(state.intros)) if (!pub.has(k)) delete state.intros[k];
    }
    try {
      await store.save(state);
    } catch (e) {
      console.log(`::warning::state: can't write the ${config.state.branch} branch; give the workflow "permissions: contents: write" (${(e as Error).message.slice(0, 160)})`);
    }
  }

  const out = writeOutputs(inv, config, outDir, { adminInv: encrypted ? full : inv, extras, log: (m) => console.log(m) });
  const line = summaryLine(inv);
  console.log(line);

  if (bool("stale-issues", config.issues.stale) && hub) {
    const created = await openStaleIssues(client, config.issues.repo ?? hub, inv.repos, config.language);
    if (created.length) console.log(`Opened ${created.length} stale issue(s)`);
  }

  const profile = input("profile-readme");
  if (profile) {
    const before = existsSync(profile) ? readFileSync(profile, "utf8") : "";
    writeFileSync(profile, spliceProfile(before, renderProfileSection(inv, config.language, { siteUrl: input("site-url") || config.site.url })));
  }

  if (config.publish && bool("publish", true)) {
    const publishToken = input("publish-token");
    const pubClient = publishToken ? new GitHubClient({ token: publishToken, userAgent: `repofolio-action/${VERSION}` }) : client;
    const res = await publishSite(pubClient, config.publish, join(outDir, "site"), { log: (m) => console.log(m), extra: config.admin.enabled ? [config.admin.page] : [] });
    setOutput("published", res.commit ?? "");
  }

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const attention = inv.repos.flatMap((r) => (r.private ? [] : r.health.filter((i) => i.level === "error")).map((i) => `- **${r.name}**: ${i.message}`));
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
