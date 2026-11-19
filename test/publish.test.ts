import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readmeImage } from "../src/detect.js";
import { GitHubClient } from "../src/github.js";
import { gitBlobSha, publishSite } from "../src/publish.js";

describe("readmeImage", () => {
  it("skips badges and resolves relative screenshots to raw URLs", () => {
    const md = [
      "# App",
      "[![CI](https://github.com/me/app/actions/workflows/ci.yml/badge.svg)](x) ![npm](https://img.shields.io/npm/v/app)",
      "![screenshot](./docs/screen%20shot.png)",
    ].join("\n");
    expect(readmeImage(md, "me/app", "main")).toBe("https://raw.githubusercontent.com/me/app/main/docs/screen%20shot.png");
  });
  it("handles <img> tags and github blob links", () => {
    expect(readmeImage('<p><img src="https://github.com/me/app/blob/main/a.png?raw=true" width="400"></p>', "me/app", "main")).toBe(
      "https://raw.githubusercontent.com/me/app/main/a.png?raw=true",
    );
  });
  it("returns undefined when there are only badges", () => {
    expect(readmeImage("![x](https://img.shields.io/badge/a-b-c)", "me/app", "main")).toBeUndefined();
  });
});

describe("publishSite", () => {
  it("matches git's blob ids", () => {
    expect(gitBlobSha(Buffer.from("hello\n"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
  });

  function setup(existing: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), "rf-pub-"));
    writeFileSync(join(dir, "index.html"), "<html>new</html>");
    writeFileSync(join(dir, "card.svg"), "<svg/>");
    writeFileSync(join(dir, "projects.json"), "{}");
    const calls: { method: string; path: string; body?: unknown }[] = [];
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname + url.search;
      const method = init?.method ?? "GET";
      calls.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status });
      if (path === "/repos/me/site") return json({ default_branch: "master", private: false, html_url: "https://github.com/me/site" });
      if (path === "/repos/me/site/git/ref/heads/master") return json({ object: { sha: "head1" } });
      if (path === "/repos/me/site/git/commits/head1") return json({ sha: "head1", tree: { sha: "tree1" } });
      if (path === "/repos/me/site/git/trees/tree1?recursive=1") return json({ tree: Object.entries(existing).map(([p, sha]) => ({ path: p, sha, type: "blob" })) });
      if (method === "POST" && path.endsWith("/git/blobs")) return json({ sha: `blob${calls.length}` }, 201);
      if (method === "POST" && path.endsWith("/git/trees")) return json({ sha: "tree2" }, 201);
      if (method === "POST" && path.endsWith("/git/commits")) return json({ sha: "commit2" }, 201);
      if (method === "PATCH") return json({});
      return new Response("nf", { status: 404 });
    }) as typeof fetch;
    return { dir, calls, client: new GitHubClient({ token: "t", fetch: fetchImpl }) };
  }

  it("commits only changed public files under the target path", async () => {
    const { dir, calls, client } = setup({ "public/repofolio/card.svg": gitBlobSha(Buffer.from("<svg/>")) });
    const res = await publishSite(client, { repo: "me/site", path: "public/repofolio/", message: "update" }, dir);
    expect(res.branch).toBe("master");
    expect(res.changed).toEqual(["public/repofolio/index.html", "public/repofolio/projects.json"]);
    expect(res.commit).toBe("commit2");
    const tree = calls.find((c) => c.path.endsWith("/git/trees") && c.method === "POST")!.body as { base_tree: string; tree: { path: string }[] };
    expect(tree.base_tree).toBe("tree1");
    expect(tree.tree.map((t) => t.path)).toEqual(["public/repofolio/index.html", "public/repofolio/projects.json"]);
    expect(calls.some((c) => c.method === "PATCH" && c.path === "/repos/me/site/git/refs/heads/master")).toBe(true);
    // Never ships private outputs.
    expect(JSON.stringify(calls)).not.toMatch(/inventory\.json|CATALOG\.md/);
  });

  it("does nothing when everything is up to date", async () => {
    const same = {
      "repofolio/index.html": gitBlobSha(Buffer.from("<html>new</html>")),
      "repofolio/card.svg": gitBlobSha(Buffer.from("<svg/>")),
      "repofolio/projects.json": gitBlobSha(Buffer.from("{}")),
    };
    const { dir, calls, client } = setup(same);
    const res = await publishSite(client, { repo: "me/site", path: "repofolio", message: "update" }, dir);
    expect(res.changed).toEqual([]);
    expect(calls.some((c) => c.method !== "GET")).toBe(false);
  });
});
