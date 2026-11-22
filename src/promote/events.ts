import { slug } from "../render/public.js";
import { topStack } from "../render/markdown.js";
import type { Config } from "../schema.js";
import type { PostEvent, State } from "../state.js";
import { isFresh } from "../state.js";
import type { Inventory, RepoRecord } from "../types.js";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** ISO 8601 week, e.g. 2026-W47. */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

/** Page a post links to: the project's share page on the portfolio (has its own preview card), else the repo. */
export function projectUrl(config: Config, r: RepoRecord): string {
  const base = config.site.url?.replace(/\/?$/, "/");
  return base ? `${base}p/${slug(r.fullName)}/` : r.url;
}

const isLive = (r: RepoRecord) => r.deployments.some((d) => d.url && d.check?.ok !== false);
const liveUrl = (r: RepoRecord) => r.deployments.find((d) => d.url && d.check?.ok !== false)?.url;

/** Public, shown, not a fork: the only repos that may ever appear in a post. */
export const postable = (r: RepoRecord) => r.showcase && !r.private && !r.fork;

export function repoFacts(r: RepoRecord): PostEvent["facts"] {
  return {
    name: r.meta.name ?? r.name,
    repo: r.fullName,
    summary: r.summary || r.description || "",
    purpose: r.meta.purpose,
    stack: topStack(r, 6),
    tags: [...new Set([...r.meta.tags, ...r.topics])].slice(0, 6),
    stars: r.stars,
    code: r.url,
    live: liveUrl(r),
    readme: r.readme?.excerpt?.slice(0, 1500),
  };
}

function repoEvent(config: Config, r: RepoRecord, kind: PostEvent["kind"], key: string, title: string, extra: PostEvent["facts"] = {}): PostEvent {
  return {
    kind,
    key,
    repo: r.fullName,
    projectId: slug(r.fullName),
    title,
    url: projectUrl(config, r),
    image: r.meta.image ?? r.cover ?? r.readme?.image ?? `https://opengraph.githubassets.com/1/${r.fullName}`,
    facts: { ...repoFacts(r), ...extra },
  };
}

export function spotlightEvent(config: Config, r: RepoRecord, now = new Date()): PostEvent {
  return repoEvent(config, r, "spotlight", `spotlight:${r.fullName}:${now.toISOString().slice(0, 10)}`, r.meta.name ?? r.name);
}

/**
 * Compare this scan with what the state has seen and return new events (not yet drafted).
 * Updates `state.seen` / `state.weekly` in place. The first run only records what exists
 * (plus one portfolio intro) so you don't get a draft for every old project.
 */
export function detectEvents(inv: Inventory, config: Config, state: State, now = new Date()): PostEvent[] {
  const ev = config.promote.events;
  const fresh = isFresh(state);
  const out: PostEvent[] = [];
  const done = new Set(state.done);
  const push = (e: PostEvent) => { if (!done.has(e.key)) { done.add(e.key); out.push(e); } };
  const repos = inv.repos.filter(postable);
  const t = now.toISOString();

  for (const r of repos) {
    const prev = state.seen[r.fullName];
    const live = isLive(r);
    const name = r.meta.name ?? r.name;
    if (!prev) {
      if (!fresh && ev.newProject) push(repoEvent(config, r, "new-project", `new:${r.fullName}`, name));
    } else if (!fresh) {
      const tag = r.latestRelease?.tag;
      if (ev.release && tag && tag !== prev.release) push(repoEvent(config, r, "release", `release:${r.fullName}@${tag}`, `${name} ${tag}`, { release: tag, releaseUrl: r.latestRelease?.url }));
      const crossed = ev.stars.filter((m) => prev.stars < m && r.stars >= m).pop();
      if (crossed) push(repoEvent(config, r, "stars", `stars:${r.fullName}:${crossed}`, `${name} ★ ${crossed}`, { milestone: crossed }));
      if (ev.live && live && !prev.live) push(repoEvent(config, r, "live", `live:${r.fullName}`, name));
    }
    state.seen[r.fullName] = { firstSeen: prev?.firstSeen ?? t, release: r.latestRelease?.tag, stars: r.stars, live };
  }

  const base = config.site.url?.replace(/\/?$/, "/");
  const owner = config.owners[0] ?? inv.profile?.login ?? inv.owners[0] ?? "";
  const portfolio = base ?? `https://github.com/${owner}`;

  if (fresh && ev.intro) {
    const top = [...repos].sort((a, b) => Number(b.meta.featured) - Number(a.meta.featured) || b.stars - a.stars).slice(0, 5);
    push({
      kind: "intro",
      key: "intro",
      title: inv.profile?.name ?? owner,
      url: portfolio,
      image: inv.profile?.avatarUrl,
      facts: {
        projects: repos.length,
        live: repos.filter(isLive).length,
        stars: repos.reduce((n, r) => n + r.stars, 0),
        highlights: top.map((r) => `${r.meta.name ?? r.name}: ${r.summary || r.description || ""}`.slice(0, 160)),
        stack: [...new Set(repos.flatMap((r) => topStack(r, 3)))].slice(0, 10),
        bio: inv.profile?.bio ?? undefined,
      },
    });
  }

  const week = isoWeek(now);
  const stars = Object.fromEntries(repos.map((r) => [r.fullName, r.stars]));
  if (ev.weekly && DAYS[now.getUTCDay()] === ev.weekly && state.weekly?.week !== week) {
    if (!fresh && state.weekly) {
      const since = now.getTime() - 7 * 86400000;
      const shipped = repos
        .map((r) => ({ r, commits: r.activity?.at(-2) ?? 0, release: r.latestRelease && Date.parse(r.latestRelease.publishedAt) >= since ? r.latestRelease.tag : undefined, gained: r.stars - (state.weekly!.stars[r.fullName] ?? r.stars), isNew: Date.parse(r.createdAt) >= since }))
        .filter((x) => x.commits > 0 || x.release || x.isNew || x.gained > 0)
        .sort((a, b) => b.commits - a.commits);
      const privateActive = config.promote.mentionPrivate ? inv.repos.filter((r) => r.private && (r.activity?.at(-2) ?? 0) > 0).length : 0;
      if (shipped.length) {
        push({
          kind: "weekly",
          key: `weekly:${week}`,
          title: week,
          url: portfolio,
          image: inv.profile?.avatarUrl,
          facts: {
            week,
            commits: shipped.reduce((n, x) => n + x.commits, 0),
            items: shipped.slice(0, 8).map((x) => [`${x.r.meta.name ?? x.r.name}`, x.commits ? `${x.commits} commits` : "", x.release ? `released ${x.release}` : "", x.isNew ? "new" : "", x.gained > 0 ? `+${x.gained}★` : ""].filter(Boolean).join(" · ")),
            privateActive: privateActive || undefined,
          },
        });
      }
    }
    state.weekly = { week, stars };
  } else if (!state.weekly) state.weekly = { week: "", stars };

  state.done = [...done].slice(-500);
  return out;
}
