import { describe, expect, it } from "vitest";
import { redact } from "../src/run.js";
import { GitHubClient, parseNextLink } from "../src/github.js";
import { openStaleIssues } from "../src/issues.js";
import { renderCard, renderProfileSection, spliceProfile } from "../src/render/card.js";
import { renderCatalog } from "../src/render/markdown.js";
import { buildShowcase, renderSite } from "../src/render/site.js";
import { ConfigSchema } from "../src/schema.js";
import { scan } from "../src/scan.js";

const NOW = new Date("2026-11-19T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const b64 = (s: string) => Buffer.from(s).toString("base64");

function repo(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    full_name: `me/${name}`,
    html_url: `https://github.com/me/${name}`,
    owner: { login: "me" },
    private: false,
    fork: false,
    archived: false,
    description: `${name} description`,
    homepage: null,
    topics: ["tool"],
    license: { spdx_id: "MIT" },
    default_branch: "main",
    stargazers_count: 3,
    forks_count: 0,
    open_issues_count: 0,
    created_at: daysAgo(400),
    pushed_at: daysAgo(2),
    has_pages: false,
    ...extra,
  };
}

const SECRET_META = `
status: active
summary: Secret side project
deployments:
  - name: production
    provider: vercel
    url: https://secret-app.vercel.app
    dashboard: https://vercel.com/me/secret-app
services:
  - { name: Supabase, kind: database, dashboard: https://supabase.com/dashboard/project/zzz }
env:
  location: 1Password › Dev
  vars: [SUPABASE_URL, SUPABASE_SERVICE_ROLE]
cost: { monthly: 25, currency: USD }
showcase: false
`;

const PUBLIC_META = `
status: done
summary: A public thing
featured: true
env:
  location: Vercel env
  vars: [PUBLIC_ONLY_VAR_NAME]
links:
  demo: https://demo.example.com
`;

/** Fake GitHub API keyed by path. */
function fakeFetch(): typeof fetch {
  const routes: Record<string, unknown> = {
    "/user": { login: "me" },
    "/users/me": { login: "me", name: "Me Myself", avatar_url: "https://avatars.githubusercontent.com/u/1?v=4", html_url: "https://github.com/me", bio: "I build things", location: null, blog: "", company: null, followers: 3, public_repos: 2, created_at: daysAgo(900) },
    "/repos/me/public-app/stats/participation": { all: new Array(52).fill(2), owner: [...new Array(51).fill(1), 5] },
    "/repos/me/secret/stats/participation": { all: new Array(52).fill(9), owner: new Array(52).fill(9) },
    "/user/repos?affiliation=owner&sort=pushed&per_page=100": [
      repo("public-app", { homepage: "https://public-app.vercel.app" }),
      repo("secret", { private: true, pushed_at: daysAgo(10) }),
      repo("old-thing", { pushed_at: daysAgo(200), topics: [], license: null, description: null }),
      repo("a-fork", { fork: true }),
    ],
    "/repos/me/public-app/contents/": [{ name: ".project.yml", path: ".project.yml", type: "file" }, { name: "package.json", path: "package.json", type: "file" }, { name: "vercel.json", path: "vercel.json", type: "file" }],
    "/repos/me/public-app/contents/.project.yml": PUBLIC_META,
    "/repos/me/public-app/contents/package.json": JSON.stringify({ dependencies: { next: "16", react: "19" } }),
    "/repos/me/public-app/readme": { sha: "abc", content: b64("# Public app\n\nDoes public things for people. ".repeat(20)), encoding: "base64" },
    "/repos/me/public-app/languages": { TypeScript: 1000 },
    "/repos/me/public-app/deployments?per_page=30": [
      { id: 1, environment: "Production", ref: "main", created_at: daysAgo(1), statuses_url: "" },
      { id: 2, environment: "Preview", ref: "pr", created_at: daysAgo(1), statuses_url: "" },
    ],
    "/repos/me/public-app/deployments/1/statuses?per_page=5": [{ state: "success", environment_url: "https://public-app-3k2j9x8h1-me-projects.vercel.app", created_at: daysAgo(1) }],
    "/repos/me/secret/contents/": [{ name: ".project.yml", path: ".project.yml", type: "file" }],
    "/repos/me/secret/contents/.project.yml": SECRET_META,
    "/repos/me/secret/readme": { sha: "def", content: b64("# Secret\n\nShh."), encoding: "base64" },
    "/repos/me/old-thing/contents/": [{ name: "README.md", path: "README.md", type: "file" }],
    "/repos/me/old-thing/readme": { sha: "ghi", content: b64("# Old\n\nAn old experiment."), encoding: "base64" },
    "/repos/me/hub/issues?state=open&labels=repofolio%3Astale&per_page=100": [],
  };
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname + url.search;
    if (init?.method === "POST") {
      return new Response(JSON.stringify({ html_url: `https://github.com${url.pathname}/1` }), { status: 201 });
    }
    if (url.hostname !== "api.github.com") return new Response("ok", { status: 200 });
    if (!(path in routes)) return new Response("not found", { status: 404 });
    const body = routes[path];
    const raw = init?.headers && (init.headers as Record<string, string>).Accept === "application/vnd.github.raw";
    return new Response(typeof body === "string" && raw ? body : typeof body === "string" ? JSON.stringify({ content: b64(body) }) : JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

async function runScan() {
  const config = ConfigSchema.parse({ urlCheck: { enabled: false } });
  const client = new GitHubClient({ token: "t", fetch: fakeFetch() });
  return { inv: await scan({ config, client, now: NOW }), config, client };
}

describe("scan", () => {
  it("lists owned repos, skips forks, reads metadata and deployments", async () => {
    const { inv } = await runScan();
    expect(inv.repos.map((r) => r.name).sort()).toEqual(["old-thing", "public-app", "secret"]);

    const pub = inv.repos.find((r) => r.name === "public-app")!;
    expect(pub.status).toBe("done");
    expect(pub.statusInferred).toBe(false);
    expect(pub.stack).toEqual(["Next.js", "React"]);
    // Stable homepage alias wins over the per-deploy Vercel URL; preview env ignored.
    expect(pub.deployments.map((d) => d.url)).toEqual(["https://public-app.vercel.app"]);
    expect(pub.deployments[0]!.provider).toBe("vercel");

    const old = inv.repos.find((r) => r.name === "old-thing")!;
    expect(old.stale).toBe(true);
    expect(old.status).toBe("paused");
    expect(old.summary).toBe("An old experiment.");
    expect(old.summarySource).toBe("readme");
    expect(old.health.map((h) => h.id)).toEqual(expect.arrayContaining(["no-description", "no-topics", "no-license", "stale", "readme-short"]));
  });

  it("never leaks private repos or private metadata to the public site, card or profile", async () => {
    const { inv, config } = await runScan();
    const html = renderSite(inv, config);
    const publicOutputs = [html, renderCard(inv, "en"), renderProfileSection(inv, "en"), JSON.stringify(buildShowcase(inv, config))].join("\n");
    for (const leak of ["Secret side project", "secret-app.vercel.app", "SUPABASE_SERVICE_ROLE", "1Password", "supabase.com/dashboard", "PUBLIC_ONLY_VAR_NAME", "Vercel env"]) {
      expect(publicOutputs).not.toContain(leak);
    }
    expect(html).toContain("A public thing");
    expect(html).toContain("https://demo.example.com");
  });

  it("builds showcase data with profile and activity from public repos only", async () => {
    const { inv, config } = await runScan();
    expect(inv.profile?.name).toBe("Me Myself");
    const d = buildShowcase(inv, config);
    expect(d.projects.map((p) => p.name)).not.toContain("secret");
    // Only public-app has activity; the private repo's 9/week must not be counted.
    expect(d.totals.commitsYear).toBe(56);
    expect(d.totals.commitsWeek).toBe(5);
    expect(d.projects.find((p) => p.name === "public-app")?.image).toContain("opengraph.githubassets.com/1/me/public-app");
  });

  it("splits the site into pages by default, or one page with singlePage", async () => {
    const { inv } = await runScan();
    const multi = renderSite(inv, ConfigSchema.parse({}));
    expect(multi).toContain('data-page="home"');
    expect(multi).toContain('data-page="projects"');
    expect(multi).toContain('href="#/projects"');
    // Default is simple mode, with every effect switched off.
    expect(multi).toMatch(/<body data-mode="simple" data-scheme="auto"[^>]* data-bg="none" data-card="simple"[^>]* data-fx="none"/);
    expect(multi).toContain('id="stats"');
    expect(multi).not.toContain('id="stack"');
    const tech = renderSite(inv, ConfigSchema.parse({ site: { theme: { mode: "tech" } } }));
    expect(tech).toMatch(/<body data-mode="tech"[^>]* data-preset="cyber" data-bg="particles"/);
    const single = renderSite(inv, ConfigSchema.parse({ site: { singlePage: true } }));
    expect(single).not.toContain('data-page="projects"');
    expect(single).toContain('href="#projects"');
  });

  it("applies a custom background colour with readable text", async () => {
    const { inv } = await runScan();
    const dark = renderSite(inv, ConfigSchema.parse({ site: { theme: { bgColor: "#0d1117" } } }));
    expect(dark).toContain("--bg:#0d1117");
    expect(dark).toContain("--fg:#e8edf2");
    const light = renderSite(inv, ConfigSchema.parse({ site: { theme: { preset: "cyber", bgColor: "#ffffff" } } }));
    expect(light).toContain("--fg:#1c1917");
    expect(() => ConfigSchema.parse({ site: { theme: { bgColor: "red" } } })).toThrow();
  });

  it("escapes hostile text in the generated page", async () => {
    const { inv, config } = await runScan();
    const pub = inv.repos.find((r) => r.name === "public-app")!;
    pub.summary = '</script><script>alert(1)</script><img src=x onerror=alert(2)>';
    const html = renderSite(inv, config);
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img src=x onerror");
  });

  it("keeps private details in the private catalog", async () => {
    const { inv } = await runScan();
    const md = renderCatalog(inv, "en");
    expect(md).toContain("SUPABASE_SERVICE_ROLE");
    expect(md).toContain("1Password › Dev");
    expect(md).toContain("25 USD/mo");
  });

  it("redact() strips private repos and private fields for public hubs", async () => {
    const { inv } = await runScan();
    const md = renderCatalog(redact(inv), "en");
    expect(md).not.toContain("secret");
    expect(md).not.toContain("PUBLIC_ONLY_VAR_NAME");
  });

  it("opens one stale issue per stale repo", async () => {
    const { inv, client } = await runScan();
    const created = await openStaleIssues(client, "me/hub", inv.repos, "en");
    expect(created).toHaveLength(1);
  });
});

describe("profile splice", () => {
  it("replaces between markers and appends when missing", () => {
    const block = "<!-- repofolio:start -->\nNEW\n<!-- repofolio:end -->";
    expect(spliceProfile("Hi\n<!-- repofolio:start -->\nOLD\n<!-- repofolio:end -->\nBye", block)).toBe(`Hi\n${block}\nBye`);
    expect(spliceProfile("Hi", block)).toBe(`Hi\n\n${block}\n`);
  });
});

describe("parseNextLink", () => {
  it("finds rel=next", () => {
    expect(parseNextLink('<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"')).toBe("https://api.github.com/x?page=2");
    expect(parseNextLink(null)).toBeNull();
  });
});

describe("pickScreenshot", () => {
  it("prefers screenshot folders and skips icons and other projects' assets", async () => {
    const { pickScreenshot } = await import("../src/detect.js");
    expect(pickScreenshot(["web/icons/icon-192.png", "docs/screenshots/chart-en.png", "docs/architecture.png"], "a/b", "main")).toBe("https://raw.githubusercontent.com/a/b/main/docs/screenshots/chart-en.png");
    expect(pickScreenshot(["public/projects/aidit/home.png", "android/app/ic_launcher.png"], "a/b", "main")).toBeUndefined();
  });
});
