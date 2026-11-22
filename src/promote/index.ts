import { createHash } from "node:crypto";
import { z } from "zod";
import { PLATFORMS, type Config, type Platform } from "../schema.js";
import type { Post, PostResult, State } from "../state.js";
import type { Inventory } from "../types.js";
import { Copywriter } from "./draft.js";
import { detectEvents, postable, spotlightEvent } from "./events.js";
import { checkConnections, hasCreds, publishTo, PLATFORM_INFO, postLength, type Connection, type Env } from "./platforms.js";

/**
 * What the admin page sends through workflow_dispatch (input `posts`, JSON array).
 * approve: publish the listed platforms (with edited text), record the manual ones as done.
 * skip: drop the post. draft: write a spotlight post about a repo now.
 */
const Text = z.object({ text: z.string().max(60000), title: z.string().max(300).optional() });
export const RequestSchema = z.array(z.discriminatedUnion("op", [
  z.object({ op: z.literal("approve"), id: z.string(), platforms: z.array(z.enum(PLATFORMS)).default([]), manual: z.array(z.enum(PLATFORMS)).default([]), edits: z.partialRecord(z.enum(PLATFORMS), Text).default({}) }),
  z.object({ op: z.literal("skip"), id: z.string() }),
  z.object({ op: z.literal("draft"), repo: z.string() }),
])).max(50);
export type PromoteRequest = z.infer<typeof RequestSchema>[number];

export function parseRequests(raw: string | undefined, log: (m: string) => void = () => {}): PromoteRequest[] {
  if (!raw?.trim()) return [];
  try {
    return RequestSchema.parse(JSON.parse(raw));
  } catch (e) {
    log(`::warning::promote: ignoring malformed posts input (${(e as Error).message.slice(0, 200)})`);
    return [];
  }
}

const postId = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 12);

function statusOf(post: Post, wanted: Platform[]): Post["status"] {
  const rs = wanted.map((p) => post.results[p]).filter(Boolean) as PostResult[];
  if (!rs.length) return post.status;
  const ok = rs.filter((r) => r.ok).length;
  return ok === rs.length ? "published" : ok ? "partial" : "failed";
}

export interface PromoteSummary {
  connections: Connection[];
  created: number;
  published: number;
  errors: string[];
}

/** One promotion pass. Mutates `state`; the caller saves it. */
export async function runPromote(opts: {
  inv: Inventory;
  config: Config;
  state: State;
  requests: PromoteRequest[];
  env: Env;
  log?: (m: string) => void;
  now?: Date;
  fetch?: typeof fetch;
}): Promise<PromoteSummary> {
  const { inv, config, state, env } = opts;
  const log = opts.log ?? (() => {});
  const now = opts.now ?? new Date();
  const f = opts.fetch ?? fetch;
  const cfg = config.promote;
  const platforms = cfg.platforms;
  const summary: PromoteSummary = { connections: await checkConnections(platforms, env, f), created: 0, published: 0, errors: [] };
  const auto = new Set(summary.connections.filter((c) => c.mode === "auto").map((c) => c.platform));
  const stars = (repo?: string) => inv.repos.find((r) => r.fullName === repo)?.stars;
  const extra = [];

  // 1. Decisions made in the admin page.
  for (const req of opts.requests) {
    if (req.op === "draft") {
      const r = inv.repos.find((x) => x.fullName === req.repo && postable(x));
      if (r) extra.push(spotlightEvent(config, r, now));
      else log(`promote: ${req.repo} is not a public showcased repo, not drafting`);
      continue;
    }
    const post = state.posts.find((p) => p.id === req.id);
    if (!post) { log(`promote: post ${req.id} not found`); continue; }
    if (req.op === "skip") {
      if (post.status === "pending") { post.status = "skipped"; post.decidedAt = now.toISOString(); }
      continue;
    }
    for (const [p, t] of Object.entries(req.edits)) {
      const pf = p as Platform;
      if (t && postLength(pf, t.text) <= PLATFORM_INFO[pf].limit) post.drafts[pf] = { ...post.drafts[pf], ...t };
    }
    const at = now.toISOString();
    for (const p of req.manual) post.results[p] = { ok: true, manual: true, at };
    for (const p of req.platforms) {
      if (post.results[p]?.ok) continue;
      const draft = post.drafts[p];
      if (!draft) continue;
      if (!auto.has(p)) { post.results[p] = { ok: false, error: hasCreds(p, env) ? "credentials rejected" : "not connected", at }; continue; }
      try {
        const res = await publishTo(p, draft, post.event, env, f);
        post.results[p] = { ok: true, url: res.url, at };
        summary.published++;
        log(`promote: posted to ${PLATFORM_INFO[p].label}${res.url ? ` → ${res.url}` : ""}`);
      } catch (e) {
        const msg = (e as Error).message.slice(0, 300);
        post.results[p] = { ok: false, error: msg, at };
        summary.errors.push(`${PLATFORM_INFO[p].label}: ${msg}`);
        log(`::warning::promote: ${PLATFORM_INFO[p].label} failed: ${msg}`);
      }
    }
    post.status = statusOf(post, [...req.platforms, ...req.manual]);
    post.decidedAt = at;
    post.starsAt ??= stars(post.event.repo);
  }

  // 2. New events since the last run → drafts.
  const events = [...extra, ...(cfg.enabled ? detectEvents(inv, config, state, now) : [])];
  if (events.length) {
    const useLlm = cfg.llm === true || (cfg.llm === "auto" && !!env.ANTHROPIC_API_KEY);
    const writer = new Copywriter({ lang: cfg.language ?? config.language, model: config.llm.model, llm: useLlm && !!env.ANTHROPIC_API_KEY, hashtags: cfg.hashtags, log });
    for (const ev of events) {
      const id = postId(ev.key);
      if (state.posts.some((p) => p.id === id)) continue;
      const { drafts, source } = await writer.write(ev, platforms);
      state.posts.push({ id, createdAt: now.toISOString(), event: ev, status: "pending", source, drafts, results: {} });
      summary.created++;
    }
    log(`promote: ${summary.created} new draft(s)${writer.calls ? ` (${writer.calls} Claude call(s))` : ""}`);
  }

  // 3. Housekeeping: expire old drafts, keep the history bounded.
  const cutoff = now.getTime() - cfg.expireDays * 86400000;
  for (const p of state.posts) if (p.status === "pending" && Date.parse(p.createdAt) < cutoff) p.status = "expired";
  state.posts = state.posts.filter((p) => p.status !== "expired" || Date.parse(p.createdAt) > now.getTime() - 90 * 86400000).slice(-200);
  return summary;
}
