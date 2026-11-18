import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { ConfigSchema, type Config } from "./schema.js";

export const CONFIG_FILES = ["repofolio.config.yml", "repofolio.config.yaml", ".repofolio.yml"];

export function loadConfig(path?: string): { config: Config; path?: string } {
  const found = path ?? CONFIG_FILES.find((f) => existsSync(f));
  if (path && !existsSync(path)) throw new Error(`Config file not found: ${path}`);
  const raw = found ? parseYaml(readFileSync(found, "utf8")) ?? {} : {};
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid config in ${found}:\n${msg}`);
  }
  return { config: result.data, path: found };
}

/** GitHub token from env, falling back to the gh CLI if it's installed and logged in. */
export async function resolveToken(): Promise<string | undefined> {
  const env = process.env.REPOFOLIO_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (env) return env;
  try {
    const { execFileSync } = await import("node:child_process");
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}
