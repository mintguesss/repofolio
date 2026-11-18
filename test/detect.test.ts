import { describe, expect, it } from "vitest";
import {
  detectFromFiles,
  detectStack,
  inferStatus,
  isEphemeralUrl,
  looksLikeSecret,
  mergeDeployments,
  preferStableUrls,
  providerFromUrl,
  readmeExcerpt,
} from "../src/detect.js";

describe("providerFromUrl", () => {
  it.each([
    ["https://my-app.vercel.app", "vercel"],
    ["https://x.netlify.app/", "netlify"],
    ["https://foo.pages.dev", "cloudflare"],
    ["https://me.github.io/site/", "github-pages"],
    ["https://api.fly.dev", "fly"],
    ["https://huggingface.co/spaces/me/demo", "huggingface"],
    ["https://www.npmjs.com/package/x", "npm"],
    ["https://example.com", undefined],
    ["not a url", undefined],
  ])("%s → %s", (url, expected) => {
    expect(providerFromUrl(url)).toBe(expected);
  });
});

describe("isEphemeralUrl", () => {
  it("flags Vercel per-deployment URLs", () => {
    expect(isEphemeralUrl("https://aidit-56v7xkr87-mintguesss-projects.vercel.app")).toBe(true);
    expect(isEphemeralUrl("https://stock-manager-eakh26jmu-me-projects.vercel.app")).toBe(true);
  });
  it("keeps stable aliases", () => {
    expect(isEphemeralUrl("https://aidit-weld.vercel.app")).toBe(false);
    expect(isEphemeralUrl("https://prompt-miser.vercel.app")).toBe(false);
    expect(isEphemeralUrl("https://couple-app-kappa.vercel.app")).toBe(false);
  });
  it("flags Netlify deploy previews", () => {
    expect(isEphemeralUrl("https://deploy-preview-12--site.netlify.app")).toBe(true);
    expect(isEphemeralUrl("https://site.netlify.app")).toBe(false);
  });
});

describe("deployments", () => {
  it("detects providers from root files and workflows", () => {
    const found = detectFromFiles(["vercel.json", "Dockerfile", "README.md"], ["uses: actions/deploy-pages@v4"]);
    expect(found.map((d) => d.provider).sort()).toEqual(["docker", "github-pages", "vercel"]);
  });

  it("merges a URL into a bare provider hint and dedupes URLs", () => {
    const merged = mergeDeployments([
      [{ name: "production", provider: "vercel", url: "https://a.vercel.app", source: "homepage" }],
      [{ name: "Production", provider: "vercel", url: "https://a.vercel.app/", source: "github-deployments", lastDeployedAt: "2026-01-01" }],
      [{ name: "production", provider: "vercel", source: "config-file", evidence: "vercel.json" }],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.lastDeployedAt).toBe("2026-01-01");
  });

  it("prefers stable URLs over per-deploy URLs", () => {
    const list = preferStableUrls([
      { name: "production", provider: "vercel", url: "https://app-3k2j9x8h1-me-projects.vercel.app", source: "github-deployments" },
      { name: "production", provider: "vercel", url: "https://app.vercel.app", source: "homepage" },
    ]);
    expect(list.map((d) => d.url)).toEqual(["https://app.vercel.app"]);
  });

  it("keeps a per-deploy URL if it's the only one", () => {
    const only = [{ name: "production", provider: "vercel" as const, url: "https://app-3k2j9x8h1-me-projects.vercel.app", source: "github-deployments" as const }];
    expect(preferStableUrls(only)).toHaveLength(1);
  });
});

describe("detectStack", () => {
  it("reads package.json deps", () => {
    const pkg = JSON.stringify({ dependencies: { next: "16", react: "19", "@supabase/supabase-js": "2" } });
    expect(detectStack([pkg])).toEqual(["Next.js", "React", "Supabase"]);
  });
  it("reads requirements.txt and pyproject", () => {
    expect(detectStack(["fastapi==0.110\nuvicorn\ntorch>=2"])).toEqual(["FastAPI", "PyTorch"]);
    expect(detectStack(['[project]\ndependencies = ["pandas>=2", "anthropic"]'])).toEqual(["pandas", "Claude API"]);
  });
});

describe("inferStatus", () => {
  it("maps activity to status", () => {
    expect(inferStatus({ archived: true, daysSincePush: 1, staleDays: 90 })).toBe("archived");
    expect(inferStatus({ archived: false, daysSincePush: 3, staleDays: 90 })).toBe("active");
    expect(inferStatus({ archived: false, daysSincePush: 60, staleDays: 90 })).toBe("maintenance");
    expect(inferStatus({ archived: false, daysSincePush: 200, staleDays: 90 })).toBe("paused");
  });
});

describe("readmeExcerpt", () => {
  it("skips headings, badges and lists, keeps the tagline", () => {
    const md = "# Folio\n> A finance app for friends.\n\n---\n\n## Features\n\n- one\n- two";
    expect(readmeExcerpt(md)).toBe("A finance app for friends.");
  });
  it("skips badge rows and setup steps", () => {
    const md = "[![ci](x)](y) [![npm](a)](b)\n\nRun npm install first\n\nTurns repos into a portfolio.";
    expect(readmeExcerpt(md)).toBe("Turns repos into a portfolio.");
  });
  it("truncates", () => {
    expect(readmeExcerpt("word ".repeat(200), 20)).toHaveLength(20);
  });
});

describe("looksLikeSecret", () => {
  it("accepts variable names", () => {
    expect(looksLikeSecret("SUPABASE_URL")).toBe(false);
    expect(looksLikeSecret("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBe(false);
  });
  it("flags values", () => {
    expect(looksLikeSecret("API_KEY=abc")).toBe(true);
    expect(looksLikeSecret("sk-ant-api03-abcdefghijklmnop")).toBe(true);
    expect(looksLikeSecret("ghp_abcdefghijklmnopqrstuvwxyz0123")).toBe(true);
  });
});
