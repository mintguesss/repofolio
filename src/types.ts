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
  readme?: { length: number; sha: string; excerpt: string };
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
  health: HealthIssue[];
  healthScore: number;
  showcase: boolean;
}

export interface Inventory {
  generatedAt: string;
  tool: { name: "repofolio"; version: string };
  owners: string[];
  repos: RepoRecord[];
}
