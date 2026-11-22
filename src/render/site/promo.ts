import type { AiFeature, UsageMonth } from "../../ai.js";
import { POST_STYLES, type Platform } from "../../schema.js";
import type { CompetitorReport, Post } from "../../state.js";
import { PLATFORM_INFO, TITLE_ONLY, type Connection } from "../../promote/platforms.js";
import { esc, type ShowcaseData } from "../public.js";
import { STATUS_COLORS } from "./widgets.js";
import type { SiteStrings } from "./strings.js";

export interface Dispatch { repo: string; workflow: string; ref: string }

/** Extra data only the admin build gets. */
export interface AdminExtras {
  promote?: {
    enabled: boolean;
    platforms: Platform[];
    posts: Post[];
    connections: Connection[];
  };
  /** Claude settings and monthly usage, for the admin overview. */
  ai?: { hasKey: boolean; model: string; budget: number; features: Record<AiFeature, boolean>; usage: UsageMonth[] };
  /** The workflow the admin page can trigger (approvals, "update now"). */
  dispatch?: Dispatch;
  competitors?: { enabled: boolean; reports: Record<string, CompetitorReport> };
}

const fmtDate = (iso: string, lang: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "zh-TW" ? "zh-TW" : "en-US", { year: "numeric", month: "short", day: "numeric" });
};

/** What the client needs to build share links, count characters and dispatch approvals. */
export function promoClientConfig(x: AdminExtras["promote"]) {
  if (!x) return undefined;
  const conn = Object.fromEntries(x.connections.map((c) => [c.platform, c]));
  return {
    platforms: Object.fromEntries(x.platforms.map((p) => [p, { label: PLATFORM_INFO[p].label, limit: PLATFORM_INFO[p].limit, mode: conn[p]?.mode ?? "manual", article: !!PLATFORM_INFO[p].article, titleOnly: TITLE_ONLY.has(p) }])),
  };
}

function connChips(x: NonNullable<AdminExtras["promote"]>, P: SiteStrings["promo"]): string {
  return x.connections
    .map((c) => `<span class="pp-conn m-${c.mode}" title="${esc(c.mode === "error" ? c.error ?? "" : c.mode === "auto" ? P.connected : P.notConnected)}"><i></i>${esc(PLATFORM_INFO[c.platform].label)}<small>${esc(c.mode === "auto" ? c.account ?? P.auto : c.mode === "error" ? P.error : P.manual)}</small></span>`)
    .join("");
}

function postCard(post: Post, x: NonNullable<AdminExtras["promote"]>, s: SiteStrings, lang: string): string {
  const P = s.promo;
  const conn = Object.fromEntries(x.connections.map((c) => [c.platform, c.mode]));
  const pfs = x.platforms.filter((p) => post.drafts[p]);
  const tabs = pfs.map((p, i) => `<button type="button" role="tab" class="pp-tab${i ? "" : " on"}" data-pf="${p}"><i class="m-${conn[p] ?? "manual"}"></i>${esc(PLATFORM_INFO[p].label)}</button>`).join("");
  const panes = pfs
    .map((p, i) => {
      const d = post.drafts[p]!;
      const info = PLATFORM_INFO[p];
      const mode = conn[p] ?? "manual";
      const rows = info.article ? 14 : p === "linkedin" || p === "ptt" ? 10 : TITLE_ONLY.has(p) ? 2 : 5;
      const res = post.results[p];
      return `<div class="pp-pane" data-pf="${p}" data-mode="${mode}"${i ? " hidden" : ""}>
${info.article ? `<input class="pp-title" value="${esc(d.title ?? post.event.title)}" aria-label="${esc(P.titleLabel)}">` : ""}<textarea class="pp-text" rows="${rows}" spellcheck="false">${esc(d.text)}</textarea>
<div class="pp-meta"><span class="pp-count" data-limit="${info.limit}"></span>${mode === "auto"
        ? `<label class="pp-chk"><input type="checkbox" class="pp-inc" checked> ${esc(P.include)}</label>`
        : `<button type="button" class="pp-copy">${esc(P.copy)}</button>${info.share ? `<button type="button" class="pp-share">${esc(P.openShare)}</button>` : ""}<label class="pp-chk"><input type="checkbox" class="pp-done"> ${esc(P.manualDone)}</label>`}${res ? `<span class="pp-res ${res.ok ? "ok" : "bad"}">${res.ok ? "✓" : "✕ " + esc(res.error ?? "")}</span>` : ""}</div>
</div>`;
    })
    .join("");
  const ev = post.event;
  return `<article class="pp reveal" data-post="${esc(post.id)}" data-url="${esc(ev.url)}" data-title="${esc(ev.title)}">
<header class="pp-head"><span class="pp-kind k-${ev.kind}">${esc(P.kinds[ev.kind])}</span><h4>${esc(ev.title)}</h4><small>${esc(fmtDate(post.createdAt, lang))} · ${esc(P.by[post.source])}</small>${ev.projectId ? `<button type="button" class="linklike" data-open="${esc(ev.projectId)}">↗</button>` : ""}</header>
<div class="pp-body">${ev.image ? `<div class="pp-img"><img src="${esc(ev.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>` : ""}<div class="pp-edit"><div class="pp-style"><span>${esc(s.styles.label)}</span><div class="pp-styles" role="radiogroup">${POST_STYLES.filter((x) => x !== "auto").map((st) => `<button type="button" role="radio" class="pp-st${(post.style ?? "launch") === st ? " on" : ""}" data-style="${st}" aria-checked="${(post.style ?? "launch") === st}" title="${esc(s.styles.hints[st])}">${esc(s.styles.names[st])}</button>`).join("")}</div></div><div class="pp-tabs" role="tablist">${tabs}</div>${panes}</div></div>
<footer class="pp-foot"><button type="button" class="btn primary pp-approve">${esc(P.approve)}</button><button type="button" class="btn ghost pp-skip">${esc(P.skip)}</button><span class="pp-msg" role="status"></span></footer>
</article>`;
}

function historyRow(post: Post, s: SiteStrings, lang: string, stars?: number): string {
  const P = s.promo;
  const chips = (Object.entries(post.results) as [Platform, NonNullable<Post["results"][Platform]>][])
    .map(([p, r]) => {
      const label = esc(PLATFORM_INFO[p]?.label ?? p);
      if (r.ok && r.url) return `<a class="pp-chip ok" href="${esc(r.url)}" target="_blank" rel="noopener">✓ ${label} ↗</a>`;
      return `<span class="pp-chip ${r.ok ? "ok" : "bad"}" title="${esc(r.error ?? (r.manual ? P.manual : ""))}">${r.ok ? "✓" : "✕"} ${label}${r.manual ? ` <small>${esc(P.manual)}</small>` : ""}</span>`;
    })
    .join("");
  const failed = (Object.entries(post.results) as [Platform, { ok: boolean }][]).filter(([, r]) => !r.ok).map(([p]) => p);
  const delta = post.starsAt != null && stars != null && stars > post.starsAt ? `<span class="pp-delta">★ +${stars - post.starsAt} ${esc(P.starsSince)}</span>` : "";
  return `<li class="pp-row st-${post.status}" data-post="${esc(post.id)}"><span class="pill">${esc(P.status[post.status])}</span><span class="pp-kind k-${post.event.kind}">${esc(P.kinds[post.event.kind])}</span><b>${esc(post.event.title)}</b><small>${esc(fmtDate(post.decidedAt ?? post.createdAt, lang))}</small><span class="pp-chips">${chips}</span>${delta}${failed.length ? `<button type="button" class="linklike pp-retry" data-pfs="${failed.join(",")}">${esc(P.retry)}</button>` : ""}</li>`;
}

export function postsSection(d: ShowcaseData, x: AdminExtras["promote"], s: SiteStrings, head: string, lang: string, dispatch?: Dispatch): string {
  const P = s.promo;
  if (!x) return "";
  const pending = x.posts.filter((p) => p.status === "pending").reverse();
  const done = x.posts.filter((p) => p.status !== "pending" && p.status !== "expired").reverse().slice(0, 40);
  const stars = (repo?: string) => d.projects.find((p) => p.repo === repo)?.stars;
  return `<section id="posts" class="sec">${head}
${x.enabled ? "" : `<p class="pp-note">${esc(P.off)}</p>`}
<div class="pp-top reveal"><div class="pp-conns" aria-label="${esc(P.connections)}">${connChips(x, P)}</div></div>
<h3 class="sub-h">${esc(P.pending)} <b class="pp-n">${pending.length}</b></h3>
${pending.length ? `<div class="pp-list">${pending.map((p) => postCard(p, x, s, lang)).join("")}</div>` : `<p class="pp-note">${esc(P.none)}</p>`}
${done.length ? `<h3 class="sub-h">${esc(P.history)}</h3><ol class="pp-hist">${done.map((p) => historyRow(p, s, lang, stars(p.event.repo))).join("")}</ol>` : ""}
${dispatch ? `<p class="pp-runs"><a href="https://github.com/${esc(dispatch.repo)}/actions/workflows/${esc(dispatch.workflow)}" target="_blank" rel="noopener">${esc(P.viewRun)}</a></p>` : ""}
</section>`;
}

/** Where my stars sit between the competitors' median and top, on a log scale so ★3 vs ★30k still reads. */
function starTrack(rep: CompetitorReport, R: SiteStrings["rivals"]): string {
  const c = rep.compare;
  const max = Math.log10(Math.max(c.topStars, c.myStars, 1) + 1) || 1;
  const at = (n: number) => Math.min(100, Math.max(0, (Math.log10(n + 1) / max) * 100));
  return `<div class="rc-track" aria-hidden="true"><div class="rc-line"><i class="fill" style="width:${at(c.myStars)}%"></i><i class="tick med" style="left:${at(c.medianStars)}%"></i><i class="tick top" style="left:${at(c.topStars)}%"></i><i class="me" style="left:${at(c.myStars)}%"></i></div></div>
<div class="rc-nums"><span class="me"><small>${esc(R.yours)}</small>★${c.myStars}</span><span><small>${esc(R.median)}</small>★${c.medianStars}</span><span><small>${esc(R.top)}</small>★${c.topStars}</span></div>`;
}

export function rivalsSection(d: ShowcaseData, x: AdminExtras["competitors"], s: SiteStrings, head: string): string {
  const R = s.rivals, R2 = s.rv2;
  if (!x) return "";
  const withRep = d.projects.filter((p) => x.reports[p.repo]);
  const without = d.projects.filter((p) => !x.reports[p.repo] && p.admin && !p.admin.fork && !p.admin.archived);
  const score = (r: CompetitorReport) => (r.steps ?? []).filter((st) => st.impact === "high").length * 10 + r.gaps.length;
  withRep.sort((a, b) => Number(!!x.reports[b.repo]!.items.length) - Number(!!x.reports[a.repo]!.items.length) || score(x.reports[b.repo]!) - score(x.reports[a.repo]!));
  const owner = (full: string) => full.split("/")[0]!;
  const cards = withRep
    .map((p, i) => {
      const rep = x.reports[p.repo]!;
      const c = rep.compare;
      const k = rep.items.length;
      const top3 = [...rep.items].sort((a, b) => b.stars - a.stars).slice(0, 3);
      const steps = (rep.steps ?? []).slice(0, 2);
      const fallback = !steps.length ? rep.gaps[0] ?? rep.ideas[0] ?? "" : "";
      const medal = k && c.rank === 1 ? " gold" : k && c.rank === 2 ? " silver" : k && c.rank === 3 ? " bronze" : "";
      return `<article class="rc reveal" style="--c:${STATUS_COLORS[p.status] ?? "#888"};--d:${(i % 3) * 70}ms">
<header class="rc-head"><button type="button" class="rc-name" data-open="${esc(p.id)}" data-tab="rivals"><span class="dot st-${p.status}"></span><b>${esc(p.name)}</b>${p.private ? `<span class="pill">🔒</span>` : ""}</button>${k ? `<span class="rc-rank${medal}" title="${esc(R2.rank)}"><b>#${c.rank}</b><small>/${k + 1}</small></span>` : ""}</header>
${k ? starTrack(rep, R) : `<p class="rc-empty">${esc(R.empty)}</p>`}
${top3.length ? `<div class="rc-block"><small>${esc(R2.list)}</small><ul class="rc-comps">${top3.map((t) => `<li><img src="https://github.com/${esc(owner(t.fullName))}.png?size=48" alt="" width="22" height="22" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><a href="${esc(t.url)}" target="_blank" rel="noopener" title="${esc(t.description ?? "")}">${esc(t.fullName)}</a><span>★${t.stars >= 1000 ? (t.stars / 1000).toFixed(1) + "k" : t.stars}</span></li>`).join("")}</ul></div>` : ""}
${steps.length ? `<div class="rc-block"><small>${esc(R2.steps)}</small><ol class="rc-steps">${steps.map((st) => `<li><b>${esc(st.title)}</b><span class="chip imp-${st.impact}">${esc(R2.impact)} ${esc(R2.levels[st.impact])}</span><span class="chip">${esc(R2.effort)} ${esc(R2.sizes[st.effort])}</span></li>`).join("")}</ol></div>` : fallback ? `<p class="rc-note">${esc(fallback)}</p>` : ""}
<footer class="rc-foot"><span>${k ? `${k} · ` : ""}${esc(rep.source === "llm" ? R.llm : R.rules)}</span><button type="button" data-open="${esc(p.id)}" data-tab="rivals">${esc(R2.open)} →</button></footer>
</article>`;
    })
    .join("");
  const analysed = withRep.filter((p) => x.reports[p.repo]!.items.length).length;
  const leading = withRep.filter((p) => x.reports[p.repo]!.items.length && x.reports[p.repo]!.compare.rank === 1).length;
  const high = withRep.reduce((n, p) => n + (x.reports[p.repo]!.steps ?? []).filter((st) => st.impact === "high").length, 0);
  return `<section id="rivals" class="sec">${head}
${x.enabled ? "" : `<p class="pp-note">${esc(R.off)}</p>`}
<div class="rv-sum reveal"><div><b>${analysed}</b><span>${esc(s.adminx.analysed)}</span></div><div><b>${leading}</b><span>${esc(s.adminx.leading)}</span></div><div><b>${high}</b><span>${esc(R2.steps)} · ${esc(R2.impact)} ${esc(R2.levels.high)}</span></div></div>
<div class="rc-grid">${cards}</div>
${without.length ? `<p class="pp-note rv-pending">${esc(R.none)} ${without.map((p) => `<button type="button" class="pp-chip" data-open="${esc(p.id)}">${esc(p.name)}</button>`).join(" ")}</p>` : ""}
</section>`;
}

/** GitHub token box for anything that triggers the workflow (approvals, "update now"). Stored in this browser only. */
export function tokenBox(dispatch: Dispatch | undefined, s: SiteStrings): string {
  if (!dispatch) return "";
  const P = s.promo;
  const url = `https://github.com/settings/personal-access-tokens/new?name=repofolio-admin&description=${encodeURIComponent(`repofolio admin actions on ${dispatch.repo}`)}`;
  return `<details class="pp-tok reveal" id="pp-tok-box"><summary>🔑 ${esc(P.token)} <span class="pp-tok-state" id="pp-tok-state"></span></summary><p>${esc(P.tokenHelp)} <a href="${esc(url)}" target="_blank" rel="noopener">github.com/settings/personal-access-tokens ↗</a></p><div class="pp-tok-row"><input type="password" id="pp-tok" autocomplete="off" spellcheck="false" placeholder="github_pat_…"><button type="button" class="btn primary" id="pp-tok-save">${esc(P.tokenSave)}</button><button type="button" class="btn ghost" id="pp-tok-forget">${esc(P.tokenForget)}</button></div></details>`;
}
