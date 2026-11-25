/** Minimal GitHub REST client: token auth, pagination, 404-as-null, basic retry. */

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface GitHubClientOptions {
  token?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  userAgent?: string;
}

export class GitHubClient {
  private readonly token?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  requests = 0;

  constructor(opts: GitHubClientOptions = {}) {
    this.token = opts.token;
    this.baseUrl = (opts.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = opts.fetch ?? fetch;
    this.userAgent = opts.userAgent ?? "repofolio";
  }

  private async raw(path: string, accept = "application/vnd.github+json"): Promise<Response> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: accept,
      "User-Agent": this.userAgent,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    for (let attempt = 0; ; attempt++) {
      this.requests++;
      const res = await this.fetchImpl(url, { headers });
      const retryable = res.status >= 500 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") || res.status === 429;
      if (!retryable || attempt >= 2) return res;
      const reset = Number(res.headers.get("retry-after") ?? 0);
      await new Promise((r) => setTimeout(r, Math.min(Math.max(reset, 1), 30) * 1000));
    }
  }

  /** GET JSON. Returns null on 404 (and on 403/409 for things like empty repos). */
  async get<T>(path: string): Promise<T | null> {
    const res = await this.raw(path);
    if (res.status === 404 || res.status === 409) return null;
    if (!res.ok) throw new GitHubError(`GET ${path} → ${res.status} ${await res.text()}`, res.status);
    return (await res.json()) as T;
  }

  /** GET raw text content (e.g. README / file contents). */
  async getText(path: string): Promise<string | null> {
    const res = await this.raw(path, "application/vnd.github.raw");
    if (res.status === 404 || res.status === 409) return null;
    if (!res.ok) throw new GitHubError(`GET ${path} → ${res.status}`, res.status);
    return res.text();
  }

  /** GET raw bytes (e.g. an image in a private repo). */
  async getBytes(path: string): Promise<Buffer | null> {
    const res = await this.raw(path, "application/vnd.github.raw");
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  async paginate<T>(path: string, max = 1000): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = path + (path.includes("?") ? "&" : "?") + "per_page=100";
    while (next && out.length < max) {
      const res = await this.raw(next);
      if (res.status === 404) break;
      if (!res.ok) throw new GitHubError(`GET ${next} → ${res.status} ${await res.text()}`, res.status);
      out.push(...((await res.json()) as T[]));
      next = parseNextLink(res.headers.get("link"));
    }
    return out;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.send<T>("POST", path, body);
  }

  /** GET that tolerates GitHub's "202 Accepted, computing stats" by retrying once. */
  async getStats<T>(path: string, waitMs = 1500): Promise<T | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await this.raw(path);
      if (res.status === 202) {
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    }
    return null;
  }

  async send<T>(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<T> {
    this.requests++;
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": this.userAgent,
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new GitHubError(`${method} ${path} → ${res.status} ${await res.text()}`, res.status);
    return (await res.json()) as T;
  }
}

export function parseNextLink(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1]!;
  }
  return null;
}

/** Shapes of the bits of the GitHub API we read. */
export interface GhRepo {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string };
  private: boolean;
  fork: boolean;
  archived: boolean;
  description: string | null;
  homepage: string | null;
  topics?: string[];
  license: { spdx_id: string | null } | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  pushed_at: string;
  has_pages?: boolean;
}

export interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  blog: string | null;
  company: string | null;
  twitter_username?: string | null;
  followers: number;
  public_repos: number;
  created_at: string;
}

export interface GhContentEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
}

export interface GhDeployment {
  id: number;
  environment: string;
  ref: string;
  created_at: string;
  statuses_url: string;
}

export interface GhDeploymentStatus {
  state: string;
  environment_url?: string;
  target_url?: string;
  created_at: string;
}
