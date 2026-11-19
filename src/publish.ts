import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import type { GitHubClient } from "./github.js";
import type { Config } from "./schema.js";

/** The only files that ever leave the machine / hub: all built from public-safe data. */
export const PUBLIC_SITE_FILES = ["index.html", "card.svg", "projects.json"] as const;

export interface PublishResult {
  repo: string;
  branch: string;
  commit?: string;
  changed: string[];
  url: string;
}

/** Git's blob id for some content, so unchanged files don't create empty commits. */
export function gitBlobSha(content: Buffer): string {
  return createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
}

interface Ref { object: { sha: string } }
interface Commit { sha: string; tree: { sha: string } }
interface Tree { tree: { path: string; sha: string; type: string }[]; truncated?: boolean }

/**
 * Commit the public site into another repo (one commit, only if something changed).
 * Uses the Git Data API so it works for any branch, including gh-pages and Next.js `public/` folders.
 */
export async function publishSite(
  client: GitHubClient,
  target: NonNullable<Config["publish"]>,
  siteDir: string,
  opts: { dryRun?: boolean; log?: (m: string) => void } = {},
): Promise<PublishResult> {
  const log = opts.log ?? (() => {});
  const repoInfo = await client.get<{ default_branch: string; private: boolean; html_url: string }>(`/repos/${target.repo}`);
  if (!repoInfo) throw new Error(`publish: can't read ${target.repo} (does the token have Contents: write on it?)`);
  const branch = target.branch ?? repoInfo.default_branch;
  const ref = await client.get<Ref>(`/repos/${target.repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  if (!ref) throw new Error(`publish: branch ${branch} not found in ${target.repo}`);
  const head = await client.get<Commit>(`/repos/${target.repo}/git/commits/${ref.object.sha}`);
  if (!head) throw new Error(`publish: can't read commit ${ref.object.sha}`);

  const base = target.path.replace(/^\/+|\/+$/g, "");
  const existing = new Map<string, string>();
  const tree = await client.get<Tree>(`/repos/${target.repo}/git/trees/${head.tree.sha}?recursive=1`);
  for (const e of tree?.tree ?? []) if (e.type === "blob") existing.set(e.path, e.sha);

  const changes: { path: string; content: Buffer }[] = [];
  for (const name of PUBLIC_SITE_FILES) {
    const content = readFileSync(join(siteDir, name));
    const path = base ? posix.join(base, name) : name;
    if (existing.get(path) === gitBlobSha(content)) continue;
    changes.push({ path, content });
  }
  const result: PublishResult = { repo: target.repo, branch, changed: changes.map((c) => c.path), url: repoInfo.html_url };
  if (!changes.length) {
    log(`publish: ${target.repo}@${branch} already up to date`);
    return result;
  }
  if (opts.dryRun) {
    log(`publish (dry run): would update ${changes.map((c) => c.path).join(", ")} in ${target.repo}@${branch}`);
    return result;
  }

  const entries = [];
  for (const c of changes) {
    const blob = await client.post<{ sha: string }>(`/repos/${target.repo}/git/blobs`, { content: c.content.toString("base64"), encoding: "base64" });
    entries.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await client.post<{ sha: string }>(`/repos/${target.repo}/git/trees`, { base_tree: head.tree.sha, tree: entries });
  const commit = await client.post<{ sha: string }>(`/repos/${target.repo}/git/commits`, { message: target.message, tree: newTree.sha, parents: [head.sha] });
  await client.send("PATCH", `/repos/${target.repo}/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha });
  result.commit = commit.sha;
  log(`publish: ${changes.length} file(s) → ${target.repo}@${branch} (${commit.sha.slice(0, 7)})`);
  return result;
}
