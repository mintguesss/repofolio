import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import type { GitHubClient } from "./github.js";
import type { Platform, PostStyle } from "./schema.js";

/**
 * State kept between runs on a branch of the hub repo (default `repofolio-data`):
 * which events were already turned into posts, the post queue, and the competitor cache.
 *
 * Privacy: when REPOFOLIO_ADMIN_PASSWORD is set the file is encrypted (state.enc), so a public hub
 * can keep private-repo competitor reports. Without it the file is plain JSON and callers must keep
 * private repos out of it (see `allowPrivate`).
 */

export type EventKind = "intro" | "new-project" | "release" | "stars" | "live" | "weekly" | "spotlight";

export interface PostEvent {
  kind: EventKind;
  /** Dedupe key, e.g. "release:owner/repo@v1.2.0". */
  key: string;
  /** owner/name when the event is about one repo. */
  repo?: string;
  /** Showcase id, to link the admin card to the project modal. */
  projectId?: string;
  title: string;
  /** Link the post points to (project page on the portfolio, or the repo). */
  url: string;
  image?: string;
  facts: Record<string, string | number | string[] | undefined>;
}

export interface DraftText {
  text: string;
  /** Dev.to article title. */
  title?: string;
}

export interface PostResult {
  ok: boolean;
  url?: string;
  error?: string;
  at: string;
  /** Posted by hand (copy / share link), recorded from the admin page. */
  manual?: boolean;
}

export type PostStatus = "pending" | "published" | "partial" | "failed" | "skipped" | "expired";

export interface Post {
  id: string;
  createdAt: string;
  decidedAt?: string;
  event: PostEvent;
  status: PostStatus;
  source: "llm" | "template";
  /** Writing style the drafts were made with. */
  style?: Exclude<PostStyle, "auto">;
  drafts: Partial<Record<Platform, DraftText>>;
  results: Partial<Record<Platform, PostResult>>;
  /** Stars of the repo when the post went out, to show what happened after. */
  starsAt?: number;
}

export interface Competitor {
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  pushedAt: string;
  language: string | null;
  topics: string[];
  homepage: string | null;
  license: string | null;
}

export type Has = "yes" | "partial" | "no";

export interface CompetitorReport {
  repo: string;
  at: string;
  /** Hash of what the search was built from; a change triggers a refresh. */
  sig: string;
  query: string;
  items: Competitor[];
  compare: {
    myStars: number;
    medianStars: number;
    topStars: number;
    /** Rank of my stars among me + competitors (1 = most). */
    rank: number;
    active: number;
    withDemo: number;
    withLicense: number;
    myDemo: boolean;
    myLicense: boolean;
    myDaysSincePush: number;
  };
  positioning?: string;
  /** Feature comparison: rows of capabilities, whether I and each competitor have it. */
  features?: { name: string; mine: Has; others: { repo: string; has: Has }[] }[];
  /** Prioritised next steps. */
  steps?: { title: string; why: string; effort: "S" | "M" | "L"; impact: "high" | "medium" | "low" }[];
  /** Report format version (2 = features + steps). */
  v?: number;
  strengths: string[];
  gaps: string[];
  ideas: string[];
  source: "llm" | "rules" | "none";
}

export interface SeenRepo {
  firstSeen: string;
  release?: string;
  stars: number;
  live: boolean;
}

export interface State {
  v: 1;
  createdAt: string;
  updatedAt: string;
  /** Public repos already known (private ones are never posted about). */
  seen: Record<string, SeenRepo>;
  /** Event keys already drafted (newest last, capped). */
  done: string[];
  /** ISO week of the last weekly digest, and stars at that point. */
  weekly?: { week: string; stars: Record<string, number> };
  posts: Post[];
  competitors: Record<string, CompetitorReport>;
  /** Short bilingual intros written by Claude, keyed by owner/name, refreshed when the README changes. */
  intros: Record<string, Intro>;
}

export interface Brief { about: string; features: string[] }
export interface Intro { sha: string; en: Brief; zh: Brief }

export function emptyState(now = new Date()): State {
  const t = now.toISOString();
  return { v: 1, createdAt: t, updatedAt: t, seen: {}, done: [], posts: [], competitors: {}, intros: {} };
}

/** True until the first run has recorded the repos it saw. */
export const isFresh = (s: State) => Object.keys(s.seen).length === 0 && s.done.length === 0;

const ITER = 600_000;

export function encryptState(json: string, password: string): string {
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password, salt, ITER, 32, "sha256");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const d = Buffer.concat([c.update(gzipSync(Buffer.from(json, "utf8"))), c.final(), c.getAuthTag()]);
  return JSON.stringify({ v: 1, s: salt.toString("base64"), i: iv.toString("base64"), n: ITER, d: d.toString("base64") });
}

export function decryptState(file: string, password: string): string {
  const p = JSON.parse(file) as { s: string; i: string; n: number; d: string };
  const key = pbkdf2Sync(password, Buffer.from(p.s, "base64"), p.n, 32, "sha256");
  const data = Buffer.from(p.d, "base64");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(p.i, "base64"));
  d.setAuthTag(data.subarray(data.length - 16));
  return gunzipSync(Buffer.concat([d.update(data.subarray(0, data.length - 16)), d.final()])).toString("utf8");
}

function parse(json: string): State {
  const s = JSON.parse(json) as Partial<State>;
  const base = emptyState();
  return { ...base, ...s, seen: s.seen ?? {}, done: s.done ?? [], posts: s.posts ?? [], competitors: s.competitors ?? {}, intros: s.intros ?? {} } as State;
}

export interface StateStore {
  readonly encrypted: boolean;
  load(): Promise<State>;
  save(s: State): Promise<void>;
}

/** Local file store, for the CLI and tests. */
export class FileStateStore implements StateStore {
  constructor(private readonly path: string, private readonly password?: string) {}
  get encrypted() { return !!this.password; }
  async load(): Promise<State> {
    if (!existsSync(this.path)) return emptyState();
    const raw = readFileSync(this.path, "utf8");
    return parse(this.password ? decryptState(raw, this.password) : raw);
  }
  async save(s: State): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    const json = JSON.stringify(s, null, 2);
    writeFileSync(this.path, this.password ? encryptState(json, this.password) : json);
  }
}

interface ContentFile { sha: string; content?: string; encoding?: string; size: number }

/** State on a branch of a GitHub repo, created as an orphan branch on first save. */
export class GitHubStateStore implements StateStore {
  private sha?: string;
  constructor(
    private readonly client: GitHubClient,
    private readonly repo: string,
    private readonly branch: string,
    private readonly password?: string,
  ) {}
  get encrypted() { return !!this.password; }
  private get file() { return this.password ? "state.enc" : "state.json"; }

  async load(): Promise<State> {
    const f = await this.client.get<ContentFile>(`/repos/${this.repo}/contents/${this.file}?ref=${encodeURIComponent(this.branch)}`);
    if (!f) return emptyState();
    this.sha = f.sha;
    let b64 = f.content ?? "";
    if (!b64 && f.size > 0) b64 = (await this.client.get<{ content: string }>(`/repos/${this.repo}/git/blobs/${f.sha}`))?.content ?? "";
    const raw = Buffer.from(b64, "base64").toString("utf8");
    return parse(this.password ? decryptState(raw, this.password) : raw);
  }

  async save(s: State): Promise<void> {
    s.updatedAt = new Date().toISOString();
    const json = JSON.stringify(s);
    const content = Buffer.from(this.password ? encryptState(json, this.password) : json, "utf8").toString("base64");
    const ref = await this.client.get<{ object: { sha: string } }>(`/repos/${this.repo}/git/ref/heads/${encodeURIComponent(this.branch)}`);
    if (!ref) {
      // Orphan branch with a README so nobody mistakes it for code.
      const readme = "# repofolio state\n\nWritten by the repofolio Action: seen events, post drafts and the competitor cache. Don't edit by hand.\n";
      const tree = await this.client.post<{ sha: string }>(`/repos/${this.repo}/git/trees`, { tree: [{ path: "README.md", mode: "100644", type: "blob", content: readme }] });
      const commit = await this.client.post<{ sha: string }>(`/repos/${this.repo}/git/commits`, { message: "repofolio: create state branch", tree: tree.sha, parents: [] });
      await this.client.post(`/repos/${this.repo}/git/refs`, { ref: `refs/heads/${this.branch}`, sha: commit.sha });
      this.sha = undefined;
    }
    const res = await this.client.send<{ content: { sha: string } }>("PUT", `/repos/${this.repo}/contents/${this.file}`, {
      message: "repofolio: update state",
      content,
      branch: this.branch,
      ...(this.sha ? { sha: this.sha } : {}),
    });
    this.sha = res.content.sha;
  }
}
