import type { ReadmeIntro } from "./detect.js";
import type { ProjectMeta, Provider, Status } from "./schema.js";

export type Source = "meta" | "github-deployments" | "github-pages" | "homepage" | "config-file";

export interface DetectedDeployment {
  name: string;
  provider?: Provider;
  url?: string;
  source: Source;
  /** Config file / evidence that made us think this, e.g. "vercel.json". */
  evidence?: string;
  lastDeployedAt?: string;
  check?: UrlCheck;
}

export interface UrlCheck {
  ok: boolean;
  status?: number;
  ms?: number;
  error?: string;
  checkedAt: string;
}

export type Level = "error" | "warn" | "info";

export interface HealthIssue {
  id: string;
  level: Level;
  message: string;
}

export interface RepoRecord {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  description: string | null;
  homepage: string | null;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  createdAt: string;
  pushedAt: string;
  languages: Record<string, number>;
  stack: string[];
  latestRelease?: { tag: string; publishedAt: string; url: string };
  readme?: { length: number; sha: string; excerpt: string; image?: string; intro?: ReadmeIntro };
  hasMetaFile: boolean;
  meta: ProjectMeta;
  metaProblems: string[];
  status: Status;
  statusInferred: boolean;
  summary: string;
  summarySource: "meta" | "llm" | "description" | "readme" | "none";
  deployments: DetectedDeployment[];
  daysSincePush: number;
  stale: boolean;
  /** Owner's commits per week for the last 52 weeks (oldest first), from /stats/participation. */
  activity?: number[];
  /** Cover image chosen at scan time: config `images` > README image > screenshot found in the repo. Public repos only. */
  cover?: string;
  /** Private repos: the cover image itself as a data: URI (fetched with the token), for the encrypted admin page only. */
  privateCover?: string;
  /** Short intro in the site language (Claude, cached on the state branch). */
  brief?: { about: string; features: string[] };
  health: HealthIssue[];
  healthScore: number;
  showcase: boolean;
  /** "contributor": a repo you don't own but have commits in (an organisation or team project). */
  role?: "owner" | "contributor";
  /** Your commits in a contributor repo (at least the configured minimum). */
  myCommits?: number;
}

/** Public GitHub profile of the primary owner, for the showcase hero. */
export interface Profile {
  login: string;
  name?: string;
  avatarUrl: string;
  url: string;
  bio?: string;
  location?: string;
  blog?: string;
  company?: string;
  twitter?: string;
  followers: number;
  publicRepos: number;
  createdAt: string;
}

export interface Inventory {
  generatedAt: string;
  tool: { name: "repofolio"; version: string };
  owners: string[];
  profile?: Profile;
  repos: RepoRecord[];
}
