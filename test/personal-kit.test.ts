import { describe, expect, it } from "vitest";
import { personalKit } from "../src/personal-kit.js";

const DATA = `export const siteData = {
  name: "x",
  projects: [
    {
      id: "aidit",
      title: "Aidit 修業規劃 Agent",
      type: "project" as const,
      tags: ["LLM"],
    },
  ],

  builds: [
    {
      id: "nobook",
      title: "nobook",
      group: "Applied ML",
    },
  ],

  certifications: [
    { name: 'AWS', issuer: 'AWS', date: '2024.05', image: '/a.png', objectPosition: '10% 80%' },
  ],

  awards: [
    { year: '2025', title: '書卷獎', org: '輔大', category: 'school', image: '', link: '' },
  ] as const,

  experience: [
    { role: "解題老師", company: "文城", period: "2023", desc: "教學", tags: ["教學"] }
  ],
} as const
`;
const DETAILS = `export const buildsDetail = {

  'nobook': {
    oneLiner: "x",
  },
}
`;

describe("personalKit", () => {
  const K = personalKit();
  it("knows what's on the site", () => {
    const k = K.known(DATA);
    expect(k.has("aidit")).toBe(true);
    expect(k.has("nobook")).toBe(true);
    expect(K.groups(DATA)).toEqual(["Applied ML"]);
    expect(K.count(DATA, "builds")).toBe(1);
    expect(K.count(DATA, "awards")).toBe(1);
  });
  it("adds a build at the top with a detail page", () => {
    const out = K.apply("build", { title: "Repofolio", subtitle: "作品集", group: "開發者工具", period: "2026", tags: "TypeScript, GitHub Actions", description: "自動整理 repo", image: "/personal_web/builds/repofolio.png", github: "https://github.com/me/repofolio", highlights: "自動 | 每 3 小時 | 細節" }, DATA, DETAILS);
    expect(out.id).toBe("repofolio");
    expect(out.data.indexOf('id: "repofolio"')).toBeLessThan(out.data.indexOf('id: "nobook"'));
    expect(out.data).toContain('    {\n      id: "repofolio",\n      title: "Repofolio",');
    expect(out.details).toContain("\n  'repofolio': {\n    oneLiner: \"自動整理 repo\",");
    expect(out.details).toContain('color: "#2E6E93"');
    expect(out.details).toContain("decisions: [");
  });
  it("adds a project with type as const", () => {
    const out = K.apply("project", { title: "Fraud", id: "fraud", ptype: "research", tags: "BERT" }, DATA);
    expect(out.data).toContain('type: "research" as const,');
  });
  it("adds an award on one line at the top, keeps `as const`", () => {
    const out = K.apply("award", { year: "2026", title: "育秀盃", org: "育秀", category: "competition", image: "/personal_web/awards/育秀盃.jpg" }, DATA);
    expect(out.data).toContain(`  awards: [\n    { year: "2026", title: "育秀盃", org: "育秀", category: "competition", image: "/personal_web/awards/育秀盃.jpg", link: "" },\n    { year: '2025'`);
    expect(out.data).toContain("] as const,");
  });
  it("appends experience even when the last entry has no comma", () => {
    const out = K.apply("experience", { role: "助教", company: "中央", period: "2026", desc: "批改", tags: "教學, 程式" }, DATA);
    expect(out.data).toContain('tags: ["教學"] },\n    { role: "助教", company: "中央", period: "2026", desc: "批改", tags: ["教學", "程式"] },\n  ],');
  });
  it("appends a certificate", () => {
    const out = K.apply("cert", { name: "TOEIC", issuer: "ETS", date: "2026" }, DATA);
    expect(out.data).toContain(`'10% 80%' },\n    { name: "TOEIC", issuer: "ETS", date: "2026", image: "" },\n  ],`);
  });
  it("refuses an id that is already there", () => {
    expect(() => K.apply("build", { title: "nobook" }, DATA, DETAILS)).toThrow(/already/);
  });
  it("runs from its own source text (as the admin page does)", () => {
    const K2 = new Function(`return (${personalKit.toString()})()`)() as ReturnType<typeof personalKit>;
    expect(K2.slugify("Clean-Contributors")).toBe("clean-contributors");
    expect(K2.imagePath("award", { title: "第 22 屆 育秀盃" }, "jpg")).toBe("awards/第-22-屆-育秀盃.jpg");
  });
});

import { GitHubClient } from "../src/github.js";
describe("GitHubClient fallback token", () => {
  it("retries a refused request once with the fallback token", async () => {
    const seen: string[] = [];
    const fake = (async (_u: string, o: { headers: Record<string, string> }) => {
      seen.push(o.headers.Authorization!);
      return o.headers.Authorization === "Bearer main" ? new Response("{}", { status: 403 }) : new Response('{"ok":1}', { status: 200 });
    }) as unknown as typeof fetch;
    const c = new GitHubClient({ token: "main", fallbackToken: "wf", fetch: fake });
    expect(await c.get("/orgs/x/repos")).toEqual({ ok: 1 });
    expect(seen).toEqual(["Bearer main", "Bearer wf"]);
  });
  it("keeps the first 403 when the fallback is refused too", async () => {
    const fake = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
    const c = new GitHubClient({ token: "main", fallbackToken: "wf", fetch: fake });
    await expect(c.get("/orgs/x/repos")).rejects.toThrow(/403/);
  });
});
