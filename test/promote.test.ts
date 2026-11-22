import { describe, expect, it } from "vitest";
import { compareRules, analyzeCompetitors, searchTerms } from "../src/competitors.js";
import { GitHubClient } from "../src/github.js";
import { templateDraft } from "../src/promote/draft.js";
import { detectEvents, isoWeek } from "../src/promote/events.js";
import { parseRequests, runPromote } from "../src/promote/index.js";
import { blueskyFacets, linkedinEscape, oauth1Header, PLATFORM_INFO, postLength } from "../src/promote/platforms.js";
import { renderSite } from "../src/render/site.js";
import { writeOutputs } from "../src/run.js";
import { ConfigSchema, PLATFORMS, parseProjectMeta } from "../src/schema.js";
import { decryptState, emptyState, encryptState, FileStateStore } from "../src/state.js";
import type { Inventory, RepoRecord } from "../src/types.js";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NOW = new Date("2026-11-23T03:00:00Z"); // a Monday
const days = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

function rec(name: string, extra: Partial<RepoRecord> = {}): RepoRecord {
  return {
    owner: "me", name, fullName: `me/${name}`, url: `https://github.com/me/${name}`, private: false, fork: false, archived: false,
    description: `${name} turns markdown notes into flashcards`, homepage: null, topics: ["flashcards", "markdown"], license: "MIT", defaultBranch: "main",
    stars: 4, forks: 0, openIssues: 0, createdAt: days(300), pushedAt: days(3), languages: { TypeScript: 100 }, stack: ["Next.js"],
    hasMetaFile: false, meta: parseProjectMeta({}).meta, metaProblems: [], status: "active", statusInferred: true,
    summary: `${name} turns markdown notes into flashcards`, summarySource: "description", deployments: [], daysSincePush: 3, stale: false,
    activity: [...new Array(50).fill(0), 6, 1], health: [], healthScore: 90, showcase: true, ...extra,
  };
}

const inv = (repos: RepoRecord[]): Inventory => ({ generatedAt: NOW.toISOString(), tool: { name: "repofolio", version: "test" }, owners: ["me"], repos });
const config = (extra: Record<string, unknown> = {}) => ConfigSchema.parse({ owners: ["me"], site: { url: "https://me.github.io/folio/" }, promote: { enabled: true, platforms: [...PLATFORMS] }, ...extra });

describe("config defaults", () => {
  it("fills nested promote / competitors defaults", () => {
    const c = ConfigSchema.parse({});
    expect(c.promote.enabled).toBe(false);
    expect(c.promote.events.weekly).toBe("mon");
    expect(c.promote.events.stars).toContain(100);
    expect(c.competitors.count).toBe(5);
    expect(c.state.branch).toBe("repofolio-data");
  });
});

describe("state", () => {
  it("encrypts and decrypts", () => {
    const s = JSON.stringify(emptyState(NOW));
    const enc = encryptState(s, "pw");
    expect(enc).not.toContain("createdAt");
    expect(decryptState(enc, "pw")).toBe(s);
    expect(() => decryptState(enc, "nope")).toThrow();
  });
  it("file store round-trips", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rf-"));
    const store = new FileStateStore(join(dir, "s.enc"), "pw");
    const s = emptyState(NOW);
    s.done.push("x");
    await store.save(s);
    expect((await store.load()).done).toEqual(["x"]);
  });
});

describe("events", () => {
  it("first run: only the portfolio intro, and every repo is recorded", () => {
    const c = config();
    const s = emptyState(NOW);
    const ev = detectEvents(inv([rec("a"), rec("b")]), c, s, NOW);
    expect(ev.map((e) => e.kind)).toEqual(["intro"]);
    expect(Object.keys(s.seen).sort()).toEqual(["me/a", "me/b"]);
    expect(ev[0]!.url).toBe("https://me.github.io/folio/");
  });

  it("new project, release, star milestone, going live; never private repos; no repeats", () => {
    const c = config();
    const s = emptyState(NOW);
    detectEvents(inv([rec("a", { stars: 8 }), rec("c")]), c, s, NOW);
    const a2 = rec("a", { stars: 12, latestRelease: { tag: "v1.0.0", publishedAt: days(1), url: "u" }, deployments: [{ name: "production", url: "https://a.app", source: "homepage", check: { ok: true, checkedAt: "" } }] });
    const ev = detectEvents(inv([a2, rec("c"), rec("b"), rec("secret", { private: true }), rec("hidden", { showcase: false })]), c, s, NOW);
    expect(ev.map((e) => e.key).sort()).toEqual(["live:me/a", "new:me/b", "release:me/a@v1.0.0", "stars:me/a:10"]);
    expect(ev.find((e) => e.kind === "new-project")!.url).toBe("https://me.github.io/folio/p/me-b/");
    expect(JSON.stringify(s)).not.toContain("secret");
    expect(detectEvents(inv([a2, rec("c"), rec("b")]), c, s, NOW)).toEqual([]);
  });

  it("weekly digest on the configured day, once per ISO week", () => {
    const c = config();
    const s = emptyState(NOW);
    const lastWeek = new Date(NOW.getTime() - 7 * 86400000);
    detectEvents(inv([rec("a")]), c, s, lastWeek);
    const ev = detectEvents(inv([rec("a", { stars: 6 })]), c, s, NOW);
    const w = ev.find((e) => e.kind === "weekly")!;
    expect(w.key).toBe(`weekly:${isoWeek(NOW)}`);
    expect(String((w.facts.items as string[])[0])).toContain("+2★");
    expect(detectEvents(inv([rec("a", { stars: 6 })]), c, s, NOW).filter((e) => e.kind === "weekly")).toEqual([]);
  });
});

describe("drafts", () => {
  it("templates fit every platform's limit in both languages", () => {
    const c = config();
    const s = emptyState(NOW);
    detectEvents(inv([rec("a")]), c, s, NOW);
    const long = rec("b", { summary: "x".repeat(400), latestRelease: { tag: "v2", publishedAt: days(1), url: "u" } });
    const evs = detectEvents(inv([rec("a"), long]), c, s, NOW);
    for (const ev of evs) for (const p of PLATFORMS) for (const lang of ["en", "zh-TW"] as const) {
      const d = templateDraft(ev, p, lang, ["buildinpublic"]);
      expect(postLength(p, d.text), `${ev.kind} ${p} ${lang}`).toBeLessThanOrEqual(PLATFORM_INFO[p].limit);
      if (p !== "hn" && p !== "reddit") expect(d.text).toContain(ev.url);
    }
  });

  it("counts X the way X does", () => {
    expect(postLength("x", "hi https://example.com/very/long/path/that/is/long")).toBe(3 + 23);
    expect(postLength("x", "中文")).toBe(4);
    expect(postLength("bluesky", "👍🏽ok")).toBe(3);
  });

  it("escapes LinkedIn little-text and builds Bluesky byte facets", () => {
    expect(linkedinEscape("a (b) #c @d")).toBe("a \\(b\\) \\#c \\@d");
    const t = "新作品 👉 https://x.dev/p/";
    const [f] = blueskyFacets(t);
    expect(Buffer.from(t).subarray(f!.index.byteStart, f!.index.byteEnd).toString()).toBe("https://x.dev/p/");
  });

  it("signs X requests with OAuth 1.0a", () => {
    const h = oauth1Header("POST", "https://api.x.com/2/tweets", { X_API_KEY: "k", X_API_SECRET: "s", X_ACCESS_TOKEN: "t", X_ACCESS_SECRET: "ts" }, "n", "1");
    expect(h).toMatch(/^OAuth oauth_consumer_key="k", oauth_nonce="n", oauth_signature="[^"]+", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1", oauth_token="t", oauth_version="1.0"$/);
  });
});

describe("runPromote", () => {
  it("parses requests leniently", () => {
    expect(parseRequests("not json")).toEqual([]);
    expect(parseRequests('[{"op":"skip","id":"x"}]')).toEqual([{ op: "skip", id: "x" }]);
  });

  it("drafts, then publishes approved platforms with edits and records manual ones", async () => {
    const c = config({ promote: { enabled: true, platforms: ["bluesky", "linkedin", "hn"], llm: false } });
    const s = emptyState(NOW);
    const calls: string[] = [];
    const f = (async (u: string | URL, init?: RequestInit) => {
      const url = String(u);
      calls.push(url + (init?.body && typeof init.body === "string" ? " " + init.body : ""));
      if (url.endsWith("createSession")) return new Response(JSON.stringify({ accessJwt: "j", did: "did:plc:1", handle: "me.bsky.social" }));
      if (url.endsWith("createRecord")) return new Response(JSON.stringify({ uri: "at://did:plc:1/app.bsky.feed.post/3abc" }));
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    const env = { BLUESKY_HANDLE: "me.bsky.social", BLUESKY_APP_PASSWORD: "pw" };
    const i = inv([rec("a")]);
    const r1 = await runPromote({ inv: i, config: c, state: s, requests: [], env, now: NOW, fetch: f });
    expect(r1.connections.map((x) => x.mode)).toEqual(["auto", "manual", "manual"]);
    expect(s.posts).toHaveLength(1);
    const post = s.posts[0]!;
    expect(Object.keys(post.drafts).sort()).toEqual(["bluesky", "hn", "linkedin"]);

    await runPromote({ inv: i, config: c, state: s, env, now: NOW, fetch: f, requests: [{ op: "approve", id: post.id, platforms: ["bluesky"], manual: ["hn"], edits: { bluesky: { text: "edited https://me.github.io/folio/" } } }] });
    expect(post.status).toBe("published");
    expect(post.results.bluesky).toMatchObject({ ok: true, url: "https://bsky.app/profile/me.bsky.social/post/3abc" });
    expect(post.results.hn).toMatchObject({ ok: true, manual: true });
    expect(calls.find((x) => x.includes("createRecord"))).toContain("edited https://me.github.io/folio/");
    expect(post.starsAt).toBeUndefined(); // intro post has no repo
  });

  it("spotlight request drafts a public repo but refuses private ones", async () => {
    const c = config({ promote: { enabled: false, platforms: ["x"], llm: false } });
    const s = emptyState(NOW);
    const f = (async () => new Response("", { status: 404 })) as typeof fetch;
    await runPromote({ inv: inv([rec("a"), rec("secret", { private: true })]), config: c, state: s, env: {}, now: NOW, fetch: f, requests: [{ op: "draft", repo: "me/a" }, { op: "draft", repo: "me/secret" }] });
    expect(s.posts.map((p) => p.event.kind)).toEqual(["spotlight"]);
    expect(JSON.stringify(s.posts)).not.toContain("secret");
  });
});

describe("competitors", () => {
  it("builds search terms from topics and English keywords", () => {
    const t = searchTerms(rec("note-cards", { topics: ["hacktoberfest", "anki"] }));
    expect(t.topics).toEqual(["anki"]);
    expect(t.words).toContain("flashcards");
  });

  it("rule-based gaps and strengths", () => {
    const comp = (n: number, extra = {}) => ({ fullName: `o/c${n}`, url: "", description: "", stars: n * 100, pushedAt: days(5), language: null, topics: [], homepage: "https://c.dev", license: "MIT", ...extra });
    const r = compareRules(rec("a", { license: null }), [comp(1), comp(2), comp(3)], "en", NOW);
    expect(r.compare).toMatchObject({ myStars: 4, medianStars: 200, topStars: 300, rank: 4, withDemo: 3 });
    expect(r.gaps.join(" ")).toMatch(/demo/);
    expect(r.gaps.join(" ")).toMatch(/licence/);
    expect(r.ideas.join(" ")).toMatch(/o\/c3/);
  });

  it("searches GitHub, skips own repos, keeps private ones out unless allowed", async () => {
    const searches: string[] = [];
    const f = (async (u: string | URL) => {
      const url = new URL(String(u));
      if (url.pathname === "/search/repositories") {
        searches.push(url.searchParams.get("q")!);
        const item = (n: string, owner: string, stars: number, topics = ["flashcards"], description = "markdown flashcards") => ({ full_name: `${owner}/${n}`, html_url: "", description, stargazers_count: stars, pushed_at: days(1), language: "TS", topics, homepage: null, license: null, fork: false, archived: false, owner: { login: owner } });
        return new Response(JSON.stringify({ items: [item("mine", "me", 999), item("x", "o", 50), item("y", "p", 20), item("z", "q", 10), item("huge", "big", 90000, ["cli"], "unrelated")] }));
      }
      return new Response("", { status: 404 });
    }) as typeof fetch;
    const client = new GitHubClient({ token: "t", fetch: f });
    const s = emptyState(NOW);
    const c = config();
    await analyzeCompetitors([rec("a"), rec("secret", { private: true })], { config: c, client, state: s, allowPrivate: false, llm: false, now: NOW, pauseMs: 0 });
    expect(Object.keys(s.competitors)).toEqual(["me/a"]);
    expect(s.competitors["me/a"]!.items.map((x) => x.fullName)).toEqual(["o/x", "p/y", "q/z"]);
    expect(searches[0]).toContain("topic:flashcards topic:markdown");
    // Cached: nothing to do on the next run.
    expect(await analyzeCompetitors([rec("a")], { config: c, client, state: s, allowPrivate: false, llm: false, now: NOW, pauseMs: 0 })).toBe(0);
  });
});

describe("admin page and share pages", () => {
  it("renders posts + competitors only in the admin build, share pages only for public repos", async () => {
    const c = config();
    const s = emptyState(NOW);
    const i = inv([rec("a"), rec("secret", { private: true, showcase: false })]);
    await runPromote({ inv: i, config: c, state: s, requests: [], env: {}, now: NOW, fetch: (async () => new Response("", { status: 404 })) as typeof fetch });
    s.competitors["me/a"] = { repo: "me/a", at: NOW.toISOString(), sig: "", query: "q", items: [], compare: { myStars: 4, medianStars: 0, topStars: 0, rank: 1, active: 0, withDemo: 0, withLicense: 0, myDemo: false, myLicense: true, myDaysSincePush: 3 }, strengths: [], gaps: ["GAP_TEXT"], ideas: [], source: "rules" };
    const extras = { promote: { enabled: true, platforms: c.promote.platforms, posts: s.posts, connections: [] }, dispatch: { repo: "me/hub", workflow: "showcase.yml", ref: "main" }, competitors: { enabled: true, reports: s.competitors } };
    const admin = renderSite(i, c, { admin: true, extras });
    expect(admin).toContain('id="posts"');
    expect(admin).toContain('id="rivals"');
    expect(admin).toContain("GAP_TEXT");
    const pub = renderSite(i, c, { extras });
    expect(pub).not.toContain('id="posts"');
    expect(pub).not.toContain("GAP_TEXT");

    const dir = mkdtempSync(join(tmpdir(), "rf-out-"));
    writeOutputs(i, c, dir, { extras });
    const share = readFileSync(join(dir, "site", "p", "me-a", "index.html"), "utf8");
    expect(share).toContain('property="og:image"');
    expect(share).toContain("#/p/me-a");
    expect(existsSync(join(dir, "site", "p", "me-secret"))).toBe(false);
    expect(readFileSync(join(dir, "site", "index.html"), "utf8")).not.toContain("GAP_TEXT");
  });
});

describe("action manifest", () => {
  it("action.yml and the workflows are valid YAML (GitHub refuses the action otherwise)", async () => {
    const { parse } = await import("yaml");
    for (const f of ["action.yml", ".github/workflows/showcase.yml", "templates/site-workflow.yml", "templates/hub-workflow.yml"]) {
      const doc = parse(readFileSync(f, "utf8"));
      expect(typeof doc, f).toBe("object");
    }
    const action = parse(readFileSync("action.yml", "utf8"));
    expect(Object.keys(action.inputs)).toEqual(expect.arrayContaining(["posts", "state-token"]));
  });
});

describe("readme intro", () => {
  it("extracts paragraphs, the feature list and the outline", async () => {
    const { readmeIntro } = await import("../src/detect.js");
    const md = `# App\n\n[![ci](x)](y)\n\nApp turns **notes** into [flashcards](https://x).\n\nIt works offline.\n\n## ✨ Features\n\n- Spaced repetition\n- Markdown import\n- Sync\n\n## Installation\n\n- npm i app\n\n## How it works\n\nText.\n\n## License\n\nMIT`;
    const r = readmeIntro(md);
    expect(r.paragraphs.slice(0, 2)).toEqual(["App turns notes into flashcards.", "It works offline."]);
    expect(r.features).toEqual(["Spaced repetition", "Markdown import", "Sync"]);
    expect(r.sections).toEqual(["Features", "How it works"]);
  });
});

describe("post styles", () => {
  it("every style fits every platform and differs in shape", async () => {
    const c = config();
    const s = emptyState(NOW);
    detectEvents(inv([rec("a")]), c, s, NOW);
    const [ev] = detectEvents(inv([rec("a"), rec("b", { readme: { length: 999, sha: "x", excerpt: "e", intro: { paragraphs: [], features: ["Imports Markdown", "Spaced repetition"], sections: [] } } })]), c, s, NOW);
    const texts = new Set<string>();
    for (const style of ["launch", "story", "deepdive", "recruiter", "short"] as const) {
      for (const p of PLATFORMS) {
        const d = templateDraft(ev!, p, "en", [], style);
        expect(postLength(p, d.text), `${style} ${p}`).toBeLessThanOrEqual(PLATFORM_INFO[p].limit);
      }
      texts.add(templateDraft(ev!, "linkedin", "en", [], style).text);
    }
    expect(texts.size).toBe(5);
    expect(templateDraft(ev!, "linkedin", "en", [], "launch").text).toContain("Spaced repetition");
    // English features stay out of a Chinese template.
    expect(templateDraft(ev!, "linkedin", "zh-TW", [], "launch").text).not.toContain("Spaced repetition");
  });

  it("redraft rewrites a pending post in another style", async () => {
    const c = config({ promote: { enabled: true, platforms: ["linkedin"], llm: false } });
    const s = emptyState(NOW);
    const f = (async () => new Response("", { status: 404 })) as typeof fetch;
    await runPromote({ inv: inv([rec("a")]), config: c, state: s, requests: [], env: {}, now: NOW, fetch: f });
    const post = s.posts[0]!;
    expect(post.style).toBe("recruiter");
    await runPromote({ inv: inv([rec("a")]), config: c, state: s, requests: [{ op: "redraft", id: post.id, style: "short" }], env: {}, now: NOW, fetch: f });
    expect(post.style).toBe("short");
  });
});

describe("competitor feature table and steps", () => {
  it("builds rows for demo, licence, activity and shared topics, plus ranked steps", () => {
    const comp = (n: number, topics: string[]) => ({ fullName: `o/c${n}`, url: "", description: "", stars: n * 100, pushedAt: days(5), language: null, topics, homepage: "https://c.dev", license: "MIT" });
    const r = compareRules(rec("a", { license: null, topics: ["flashcards"] }), [comp(1, ["flashcards", "anki"]), comp(2, ["anki", "srs"]), comp(3, ["anki"])], "zh-TW", NOW);
    expect(r.features!.map((x) => x.name)).toEqual(expect.arrayContaining(["線上 demo／網站", "授權", "#anki", "#flashcards"]));
    expect(r.features!.find((x) => x.name === "#anki")!.mine).toBe("no");
    expect(r.steps![0]!.impact).toBe("high");
    expect(r.steps!.map((x) => x.title).join(" ")).toContain("#anki");
  });
});

describe("Claude usage meter", () => {
  it("prices calls, honours per-feature switches, model overrides and the monthly budget", async () => {
    const { AiMeter, costOf } = await import("../src/ai.js");
    expect(costOf("claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 100_000 })).toBeCloseTo(3);
    const c = ConfigSchema.parse({ llm: { monthlyBudget: 1, features: { competitors: false }, models: { drafts: "claude-opus-5-5" } } });
    expect(c.llm.model).toBe("claude-sonnet-5-5");
    const usage: import("../src/ai.js").UsageMonth[] = [];
    const logs: string[] = [];
    const m = new AiMeter(c, usage, { ANTHROPIC_API_KEY: "k" }, (x) => logs.push(x), () => NOW);
    expect(m.allowed("drafts")).toBe(true);
    expect(m.allowed("competitors")).toBe(false);
    expect(m.allowed("summaries")).toBe(false);
    expect(m.model("drafts")).toBe("claude-opus-5-5");
    expect(m.model("intros")).toBe("claude-sonnet-5-5");
    m.record("drafts", "claude-opus-5-5", { input_tokens: 100_000, output_tokens: 40_000 });
    expect(usage[0]).toMatchObject({ month: "2026-11", calls: 1 });
    expect(usage[0]!.usd).toBeCloseTo(1.2);
    expect(m.allowed("intros")).toBe(false);
    expect(usage[0]!.cappedAt).toBeDefined();
    expect(logs.join(" ")).toMatch(/budget reached/);
    expect(new AiMeter(c, [], {}).allowed("drafts")).toBe(false);
  });
});

describe("competitor spam filter", () => {
  it("drops known spam accounts, hate symbols and topic-stuffed repos", async () => {
    const { isSpam } = await import("../src/competitors.js");
    expect(isSpam({ full_name: "cirosantilli/china-dictatorship", description: "x", topics: [] })).toBe(true);
    expect(isSpam({ full_name: "a/b", description: "卐 something", topics: [] })).toBe(true);
    const stuffed = { full_name: "x/mirror", description: "unrelated propaganda", topics: Array.from({ length: 20 }, (_, i) => "t" + i) };
    expect(isSpam(stuffed, ["flashcards"])).toBe(true);
    expect(isSpam({ ...stuffed, description: "flashcards for markdown" }, ["flashcards"])).toBe(false);
    expect(isSpam({ full_name: "o/anki", description: "spaced repetition", topics: ["anki"] }, ["flashcards"])).toBe(false);
  });
});

describe("settings from the admin page", () => {
  it("patches the config YAML in place, keeps comments, rejects unknown keys", async () => {
    const { applyPatch, ConfigPatchSchema } = await import("../src/settings.js");
    const yaml = "# my config\nowners: [me]\nllm:\n  model: claude-sonnet-5-5   # cheap\n";
    const out = applyPatch(yaml, { llm: { monthlyBudget: 3, features: { drafts: false } }, promote: { platforms: ["linkedin", "x"] } });
    expect(out).toContain("# my config");
    expect(out).toContain("# cheap");
    const c = ConfigSchema.parse((await import("yaml")).parse(out));
    expect(c.llm.monthlyBudget).toBe(3);
    expect(c.llm.features.drafts).toBe(false);
    expect(c.promote.platforms).toEqual(["linkedin", "x"]);
    expect(ConfigPatchSchema.safeParse({ owners: ["evil"] }).success).toBe(false);
    expect(ConfigPatchSchema.safeParse({ llm: { model: "gpt-4" } }).success).toBe(false);
    expect(parseRequests('[{"op":"config","set":{"competitors":{"count":3}}}]')).toEqual([{ op: "config", set: { competitors: { count: 3 } } }]);
  });
});

describe("health decisions", () => {
  it("skips project-only checks for the profile README repo", async () => {
    const { checkHealth } = await import("../src/health.js");
    const ids = checkHealth(rec("me", { topics: [], license: null, stale: true, daysSincePush: 93 })).map((i) => i.id);
    expect(ids).not.toContain("no-topics");
    expect(ids).not.toContain("no-license");
    expect(ids).not.toContain("stale");
    expect(checkHealth(rec("app", { topics: [], license: null })).map((i) => i.id)).toEqual(expect.arrayContaining(["no-topics", "no-license"]));
  });

  it("applies ignored and snoozed checks from projects: in the config", async () => {
    const { finalize } = await import("../src/scan.js");
    const c = ConfigSchema.parse({ urlCheck: { enabled: false }, projects: { app: { ignore: ["no-license"], snooze: { "no-topics": "2999-01-01" } } } });
    const r = rec("app", { topics: [], license: null });
    await finalize([r], c);
    const ids = r.health.map((i) => i.id);
    expect(ids).not.toContain("no-license");
    expect(ids).not.toContain("no-topics");
    const { ConfigPatchSchema } = await import("../src/settings.js");
    expect(ConfigPatchSchema.safeParse({ projects: { app: { status: "done", ignore: ["stale"] } } }).success).toBe(true);
    expect(ConfigPatchSchema.safeParse({ projects: { app: { evil: 1 } } }).success).toBe(false);
  });
});

describe("settings YAML style", () => {
  it("writes short lists in flow style without padding", async () => {
    const { applyPatch } = await import("../src/settings.js");
    const out = applyPatch("owners: [me]\npromote:\n  platforms: [linkedin]\n", { promote: { platforms: ["linkedin", "x"] } });
    expect(out).toContain("owners: [me]");
    expect(out).toContain("platforms: [linkedin, x]");
  });
});
