import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseDocument } from "yaml";
import { z } from "zod";
import type { GitHubClient } from "./github.js";
import { ConfigSchema, PLATFORMS, POST_STYLES, STATUSES } from "./schema.js";

/** Models offered in the admin settings page. Any model id still works when written into the config by hand. */
export const MODEL_CHOICES = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"] as const;

const bool = z.boolean().optional();
/** What the admin settings page may change (nothing else in the config is reachable from the browser). */
export const ConfigPatchSchema = z.object({
  language: z.enum(["en", "zh-TW"]).optional(),
  llm: z.object({
    model: z.string().regex(/^claude-[a-z0-9-]+$/).max(60).optional(),
    monthlyBudget: z.number().min(0).max(1000).optional(),
    features: z.object({ summaries: bool, intros: bool, drafts: bool, competitors: bool }).optional(),
  }).optional(),
  promote: z.object({
    enabled: bool,
    platforms: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length).optional(),
    style: z.enum(POST_STYLES).optional(),
    hashtags: z.array(z.string().regex(/^[\p{L}\p{N}_]{1,40}$/u)).max(10).optional(),
    events: z.object({ weekly: z.union([z.enum(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]), z.literal(false)]).optional() }).optional(),
  }).optional(),
  projects: z.record(
    z.string().regex(/^[\w.-]+(\/[\w.-]+)?$/),
    z.object({
      status: z.enum(STATUSES).optional(),
      ignore: z.array(z.string().regex(/^[a-z-]+$/)).max(30).optional(),
      snooze: z.record(z.string().regex(/^[a-z-]+$/), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    }).strict(),
  ).optional(),
  competitors: z.object({
    enabled: bool,
    refreshDays: z.number().int().min(1).max(90).optional(),
    count: z.number().int().min(1).max(10).optional(),
  }).optional(),
}).strict();
export type ConfigPatch = z.infer<typeof ConfigPatchSchema>;

/** [path, value] pairs for every leaf the patch sets. */
export function flatten(patch: unknown, prefix: string[] = []): [string[], unknown][] {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return [[prefix, patch]];
  return Object.entries(patch as Record<string, unknown>).filter(([, v]) => v !== undefined).flatMap(([k, v]) => flatten(v, [...prefix, k]));
}

/** Apply a patch to config YAML text, keeping comments and layout. Throws if the result isn't a valid config. */
export function applyPatch(yamlText: string, patch: ConfigPatch): string {
  const doc = parseDocument(yamlText);
  for (const [path, value] of flatten(patch)) doc.setIn(path, value);
  const out = doc.toString();
  const check = ConfigSchema.safeParse(parseDocument(out).toJS() ?? {});
  if (!check.success) throw new Error(`settings: the change makes the config invalid (${check.error.issues[0]?.path.join(".")}: ${check.error.issues[0]?.message})`);
  return out;
}

/**
 * Save settings from the admin page: patch the config file locally (so this run uses it) and commit it
 * to the repo with the workflow's token. Returns the commit sha, or undefined when nothing changed.
 */
export async function saveSettings(o: { client: GitHubClient; repo: string; branch: string; path: string; patch: ConfigPatch; log?: (m: string) => void }): Promise<string | undefined> {
  const log = o.log ?? (() => {});
  const before = existsSync(o.path) ? readFileSync(o.path, "utf8") : "";
  const after = applyPatch(before, o.patch);
  if (after === before) { log("settings: nothing changed"); return undefined; }
  writeFileSync(o.path, after);
  const path = o.path.replace(/\\/g, "/").replace(/^\.\//, "");
  const cur = await o.client.get<{ sha: string }>(`/repos/${o.repo}/contents/${path}?ref=${encodeURIComponent(o.branch)}`);
  const res = await o.client.send<{ commit: { sha: string } }>("PUT", `/repos/${o.repo}/contents/${path}`, {
    message: "repofolio: update settings from the admin page",
    content: Buffer.from(after, "utf8").toString("base64"),
    branch: o.branch,
    ...(cur ? { sha: cur.sha } : {}),
  });
  log(`settings: saved ${flatten(o.patch).map(([p]) => p.join(".")).join(", ")} (${res.commit.sha.slice(0, 7)})`);
  return res.commit.sha;
}
