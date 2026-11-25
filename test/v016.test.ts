import { describe, expect, it } from "vitest";
import { readmeIntro } from "../src/detect.js";
import { draftFor, exampleDetail, readmeDiagram, shortTitle, siteEntries, splitFeature } from "../src/personal.js";
import { personalKit } from "../src/personal-kit.js";
import { templateDraft } from "../src/promote/draft.js";
import { categoryOf, pickFeatured, selectShowcase } from "../src/render/public.js";
import { profileTitle, renderProfileSection } from "../src/render/card.js";
import { renderSite } from "../src/render/site.js";
import { applyPatch } from "../src/settings.js";
import { ConfigSchema, parseProjectMeta } from "../src/schema.js";
import type { Inventory, RepoRecord } from "../src/types.js";

const NOW = new Date("2026-11-25T03:00:00Z");
const days = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
function rec(name: string, extra: Partial<RepoRecord> = {}): RepoRecord {
  return {
    owner: "me", name, fullName: `me/${name}`, url: `https://github.com/me/${name}`, private: false, fork: false, archived: false,
    description: `${name} turns markdown notes into flashcards`, homepage: null, topics: [], license: "MIT", defaultBranch: "main",
    stars: 4, forks: 0, openIssues: 0, createdAt: days(300), pushedAt: days(3), languages: { TypeScript: 100 }, stack: ["Next.js"],
    hasMetaFile: false, meta: parseProjectMeta({}).meta, metaProblems: [], status: "active", statusInferred: true,
    summary: `${name} turns markdown notes into flashcards`, summarySource: "description", deployments: [], daysSincePush: 3, stale: false,
    health: [], healthScore: 90, showcase: true, readme: { length: 2000, sha: "x", excerpt: "" }, ...extra,
  };
}
const inv = (repos: RepoRecord[]): Inventory => ({ generatedAt: NOW.toISOString(), tool: { name: "repofolio", version: "test" }, owners: ["me"], repos });

const README = `# MingLu

這是明路的板子版本。所有模型都在板子上離線執行。

## 設計

- **Gemma 用 LiteRT-LM，不用 llama.cpp**：llama.cpp 每生成一個字都要重讀，一題約 9 分鐘。LiteRT-LM 版一題約 22 秒。
- **影像用最低解析度（70 tokens）**：影像編碼固定約 19.5 秒。140 tokens 要多等約 30 秒。
- **Whisper 常駐**：每次重啟會把 Gemma 擠出記憶體，每題多讀 300~700MB。
- **讀字改用 Gemma**：EasyOCR 要 90~160 秒。

## 架構

\`\`\`
手機
  ↓ HTTPS
板子
  ├─ YOLOv8n
  └─ Gemma
\`\`\`
`;

describe("personal site drafts", () => {
  it("keeps a single ~ (a range) and splits bold-headed bullets", () => {
    const intro = readmeIntro(README);
    expect(intro.features.join(" ")).toContain("300~700MB");
    expect(splitFeature(intro.features[0]!)).toEqual({ head: "Gemma 用 LiteRT-LM，不用 llama.cpp", body: expect.stringContaining("一題約 9 分鐘") });
  });

  it("short titles stop at a clause break and never inside a word", () => {
    expect(shortTitle("Gemma 用 LiteRT-LM，不用 llama.cpp", 12)).toBe("Gemma 用 LiteRT-LM");
    expect(shortTitle("vm.swappiness 設 180 的原因很長很長很長很長", 6)).toBe("vm.swappiness…");
  });

  it("fills every detail section, puts choices under decisions and uses the README diagram", () => {
    const r = rec("minglu_kneopi", { description: "視障者的繁中隨身視覺助理", languages: { Python: 10, Shell: 5, Batchfile: 1 }, stack: ["Transformers"], readme: { length: README.length, sha: "x", excerpt: "", intro: readmeIntro(README) } });
    const f = draftFor(r, ["Applied ML"], README).form;
    for (const k of ["description", "oneLiner", "highlights", "problem", "features", "decisions", "architecture", "techStack"]) expect(f[k], k).toBeTruthy();
    expect(f.tags).not.toMatch(/Shell|Batchfile/);
    expect(f.decisions).toContain("Gemma 用 LiteRT-LM，不用 llama.cpp");
    expect(f.architecture).toContain("├─ YOLOv8n");
    expect(f.oneLiner).not.toBe(f.problem);
    expect(readmeDiagram("```bash\nnpm i\nnpm run dev\n-> ok\n```")).toEqual([]);
    expect(personalKit().missing("build", f)).toEqual([]);
  });

  it("the kit reports empty sections instead of inventing a decision, and converts build ↔ project", () => {
    const K = personalKit();
    expect(K.missing("build", { title: "x", description: "d", highlights: "a | b | c" })).toEqual(expect.arrayContaining(["decisions", "architecture", "features", "problem"]));
    const p = K.convert("project", { title: "x", github: "https://github.com/me/x", demo: "", highlights: "快 | 一題 22 秒 | 細節\n小 | 2GB | " });
    expect(p).toMatchObject({ kind: "project", link: "https://github.com/me/x", highlights: "快\n小" });
  });

  it("lists the entries already on the site, builds and projects only", () => {
    const data = "export const siteData = {\n  projects: [\n    {\n      id: 'aidit',\n      title: 'Aidit 修業規劃',\n      link: 'https://github.com/me/aidit',\n    },\n  ],\n\n  builds: [\n    {\n      id: \"minglu-kneopi\",\n      title: \"MingLu on KNEO Pi\",\n    },\n  ],\n  awards: [\n    { title: \"書卷獎\" },\n  ],\n}\n";
    expect(siteEntries(data)).toEqual([
      { section: "builds", id: "minglu-kneopi", title: "MingLu on KNEO Pi", gh: undefined },
      { section: "projects", id: "aidit", title: "Aidit 修業規劃", gh: "aidit" },
    ]);
  });

  it("finds a complete entry to use as Claude's example", () => {
    const det = "export const d = {\r\n\r\n  'a': {\r\n    decisions: [],\r\n    architecture: [],\r\n  },\r\n\r\n  'b': {\r\n    decisions: [{ tab: \"x\" }],\r\n    architecture: [\"a\"],\r\n  },\r\n}\r\n";
    expect(exampleDetail(det)).toMatch(/^'b'/);
  });
});

describe("showcase post style", () => {
  const ev = { kind: "spotlight", title: "ClaudeQuota", url: "https://x.dev", facts: { name: "ClaudeQuota", summary: "Windows 系統匣的 Claude 用量監看工具", stack: ["Python", "pystray"], features: ["顯示 5 小時與每週用量", "只取官方數值！"] } } as never;
  it("is name + what it is, facts, link: no emoji, no exclamation marks, nothing about jobs", () => {
    const t = templateDraft(ev, "linkedin", "zh-TW", [], "showcase").text;
    expect(t.split("\n")[0]).toBe("ClaudeQuota：Windows 系統匣的 Claude 用量監看工具。");
    expect(t).not.toMatch(/\p{Extended_Pictographic}|！|!|聊聊|團隊/u);
    expect(t).toContain("技術：Python / pystray");
  });
  it("reads the old name recruiter as showcase", () => {
    expect(ConfigSchema.parse({ promote: { style: "recruiter" } }).promote.style).toBe("showcase");
    expect(ConfigSchema.parse({}).promote.style).toBe("showcase");
  });
});

describe("projects page", () => {
  it("groups by category, team work last", () => {
    expect(categoryOf(rec("x", { stack: ["PyTorch"] }))).toBe("ai");
    expect(categoryOf(rec("x", { role: "contributor", stack: ["PyTorch"] }))).toBe("team");
    expect(categoryOf(rec("hw3-final", { stack: [] }))).toBe("team");
    expect(categoryOf(rec("x", { stack: ["Next.js"] }))).toBe("web");
    expect(categoryOf(rec("x", { stack: [], topics: ["cli"], languages: { Go: 1 } }))).toBe("dev");
  });

  it("featured follows the admin pick, else the most starred non-thin projects", () => {
    const a = rec("a", { stars: 1, meta: { ...parseProjectMeta({}).meta, featured: true }, featuredRank: 1 });
    const b = rec("b", { stars: 9, meta: { ...parseProjectMeta({}).meta, featured: true }, featuredRank: 0 });
    const c = rec("c", { stars: 50 });
    expect(pickFeatured(selectShowcase(inv([a, b, c]))).map((p) => p.name)).toEqual(["b", "a"]);
    const thin = rec("thin", { stars: 99, description: null, readme: undefined });
    expect(pickFeatured(selectShowcase(inv([c, thin]))).map((p) => p.name)).toEqual(["c"]);
  });

  it("renders featured big cards and folding category groups; the admin page gets the picker", () => {
    const c = ConfigSchema.parse({ owners: ["me"] });
    const many = Array.from({ length: 7 }, (_, i) => rec("p" + i, { stars: 10 - i }));
    const html = renderSite(inv([...many, rec("b", { stars: 0, stack: ["PyTorch"] })]), c);
    expect(html).toContain('data-groups="featured,');
    expect(html).toContain('class="card reveal big"');
    expect(html).toMatch(/grid-sep" data-sep="featured"><div class="gs-ic"/);
    expect(html).toMatch(/grid-sep" data-sep="ai" role="button"/);
    const admin = renderSite(inv([rec("a")]), c, { admin: true });
    expect(admin).toContain('id="feat-pick"');
    expect(admin).toContain('class="feat-tog"');
    expect(admin).toContain('class="nav-more"');
    expect(admin).toContain('class="show-tog" data-show="a" aria-pressed="true"');
    expect(admin).toContain('id="vis-bar"');
  });

  it("the admin projects and competitors pages use the same folding groups, not-public last", () => {
    const c = ConfigSchema.parse({ owners: ["me"] });
    const ps = [rec("a", { stars: 5 }), rec("b", { stars: 0, stack: ["PyTorch"], showcase: false }), rec("z", { stars: 0, stack: ["PyTorch"] })];
    const rep = { items: [], compare: { rank: 1, myStars: 1, medianStars: 0, topStars: 0 }, gaps: [], ideas: [], strengths: [], source: "rules", query: "", generatedAt: NOW.toISOString() };
    const admin = renderSite(inv(ps), c, { admin: true, extras: { competitors: { enabled: true, reports: { "me/a": rep, "me/b": rep } } } as never });
    expect(admin).toMatch(/id="grid" data-groups="featured,hidden" data-cats data-admin data-open-key="repofolio-admin-open"/);
    expect(admin).toMatch(/grid-sep" data-sep="hidden" role="button"/);
    expect(admin).toMatch(/id="rv-grid" data-groups="featured,hidden" data-cats/);
    expect(admin).toMatch(/class="rc reveal" data-group="hidden"/);
  });

  it("the admin page may save the featured list", () => {
    const out = applyPatch("owners: [me]\n", { site: { featured: ["a", "me/b"] } });
    expect(out).toContain("featured: [a, me/b]");
    expect(applyPatch("owners: [me]\n", { projects: { a: { showcase: false } } })).toMatch(/a:\s+showcase: false/);
  });
});

describe("profile README", () => {
  it("recent: latest pushed first, with the date, public only", () => {
    const md = renderProfileSection(inv([rec("old", { pushedAt: days(40), stars: 50 }), rec("new", { pushedAt: days(1) }), rec("secret", { private: true, pushedAt: days(0) })]), "zh-TW", { sort: "recent", title: "### 最近在做" });
    expect(md.indexOf("new")).toBeLessThan(md.indexOf("old"));
    expect(md).toContain(days(1).slice(0, 10));
    expect(md).toContain("### 最近在做");
    expect(md).not.toContain("secret");
    expect(md).not.toContain("⭐");
  });

  it("the other-language README keeps the heading level", () => {
    const p = { title: "## 最近在做", sort: "recent" as const };
    expect(profileTitle(p, "zh-TW", "zh-TW")).toBe("## 最近在做");
    expect(profileTitle(p, "en", "zh-TW")).toBe("## Recently active");
    expect(profileTitle({ sort: "recent" }, "en", "zh-TW")).toBeUndefined();
  });
});
