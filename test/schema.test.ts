import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { HUB_CONFIG, projectTemplate } from "../src/init.js";
import { ConfigSchema, parseProjectMeta } from "../src/schema.js";
import { checkHealth } from "../src/health.js";

describe("parseProjectMeta", () => {
  it("drops only invalid fields", () => {
    const { meta, problems } = parseProjectMeta({ status: "shipping", summary: "Keeps me", deployments: [{ url: "not-a-url" }, { url: "https://ok.dev" }] });
    expect(meta.summary).toBe("Keeps me");
    expect(meta.status).toBeUndefined();
    expect(meta.deployments.map((d) => d.url)).toEqual([undefined, "https://ok.dev"]);
    expect(problems).toHaveLength(2);
  });
  it("handles null / non-objects", () => {
    expect(parseProjectMeta(null).problems).toEqual([]);
    expect(parseProjectMeta("hello").problems).toEqual([]);
  });
});

describe("templates", () => {
  it("init template parses cleanly and picks up env var names and providers", () => {
    const dir = mkdtempSync(join(tmpdir(), "rf-"));
    writeFileSync(join(dir, "vercel.json"), "{}");
    writeFileSync(join(dir, ".env.example"), "SUPABASE_URL=\nexport OPENAI_API_KEY=xyz\n# comment\n");
    const yaml = projectTemplate(dir);
    const { meta, problems } = parseProjectMeta(parse(yaml));
    expect(problems).toEqual([]);
    expect(meta.env?.vars).toEqual(["SUPABASE_URL", "OPENAI_API_KEY"]);
    expect(meta.deployments[0]?.provider).toBe("vercel");
  });
  it("examples/.project.yml is valid", async () => {
    const { readFileSync } = await import("node:fs");
    const { problems, meta } = parseProjectMeta(parse(readFileSync("examples/.project.yml", "utf8")));
    expect(problems).toEqual([]);
    expect(meta.deployments).toHaveLength(2);
  });
  it("hub config template is valid", () => {
    expect(ConfigSchema.safeParse(parse(HUB_CONFIG)).success).toBe(true);
  });
});

describe("health", () => {
  it("flags secrets and expiring domains", () => {
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const { meta } = parseProjectMeta({ env: { vars: ["OK_NAME", "sk-ant-api03-secretsecretsecret"] }, domains: [{ name: "x.dev", expires: soon }] });
    const ids = checkHealth({
      owner: "me", name: "x", fullName: "me/x", url: "", private: true, fork: false, archived: false,
      description: "d", homepage: null, topics: [], license: null, defaultBranch: "main", stars: 0, forks: 0,
      openIssues: 0, createdAt: "", pushedAt: "", languages: {}, stack: [], readme: { length: 1000, sha: "", excerpt: "" },
      hasMetaFile: true, meta, metaProblems: [], status: "active", statusInferred: false, summary: "s",
      summarySource: "meta", deployments: [], daysSincePush: 1, stale: false, showcase: false,
    }).map((i) => i.id);
    expect(ids).toContain("secret-in-meta");
    expect(ids).toContain("domain-expiring");
    expect(ids).not.toContain("no-topics"); // private repos aren't nagged about topics
  });
});
