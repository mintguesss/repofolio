import { STATUS_EMOJI, statusLabel, t, type Lang } from "../i18n.js";
import type { DetectedDeployment, Inventory, RepoRecord } from "../types.js";

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function depLabel(d: DetectedDeployment): string {
  const packaging = d.provider === "docker" || d.provider === "npm" || d.provider === "pypi";
  const icon = !d.url ? (packaging ? "📦" : "❔") : !d.check ? "🔗" : d.check.ok ? "✅" : "🔴";
  const who = d.provider ?? d.name;
  if (!d.url) return `${icon} ${who}`;
  const host = d.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${icon} [${host}](${d.url}) · ${who}`;
}

export interface Stats {
  total: number;
  active: number;
  live: number;
  down: number;
  stale: number;
}

export function stats(inv: Inventory): Stats {
  const deps = inv.repos.flatMap((r) => r.deployments.filter((d) => d.url));
  return {
    total: inv.repos.length,
    active: inv.repos.filter((r) => r.status === "active").length,
    live: deps.filter((d) => d.check?.ok).length,
    down: deps.filter((d) => d.check && !d.check.ok).length,
    stale: inv.repos.filter((r) => r.stale).length,
  };
}

/** Private, full-detail catalog meant for the (private) hub repo. */
export function renderCatalog(inv: Inventory, lang: Lang): string {
  const s = t(lang);
  const st = stats(inv);
  const out: string[] = [];
  out.push(`# ${s.catalogTitle}`, "");
  out.push(`> ${s.generated}: ${inv.generatedAt.slice(0, 16).replace("T", " ")} UTC · repofolio v${inv.tool.version}`, "");
  out.push(`| ${s.total} | ${statusLabel(lang, "active")} | ${s.live} | ${s.down} | ${s.stale} |`, "|---|---|---|---|---|");
  out.push(`| ${st.total} | ${st.active} | ${st.live} | ${st.down} | ${st.stale} |`, "");

  const attention = inv.repos
    .map((r) => ({ r, issues: r.health.filter((i) => i.level !== "info") }))
    .filter((x) => x.issues.length)
    .sort((a, b) => a.r.healthScore - b.r.healthScore);
  out.push(`## ${s.needsAttention}`, "");
  if (!attention.length) out.push(s.noIssues, "");
  for (const { r, issues } of attention) {
    out.push(`- **[${r.name}](#${anchor(r)})** (${r.healthScore})`);
    for (const i of issues) out.push(`  - ${i.level === "error" ? "🔴" : "🟡"} ${i.message}`);
  }
  out.push("");

  out.push(`## ${s.allProjects}`, "");
  out.push(`| ${s.project} | ${s.status} | ${s.stack} | ${s.deployedAt} | ${s.updated} | ${s.health} |`, "|---|---|---|---|---|---|");
  for (const r of inv.repos) {
    const name = `[**${cell(r.meta.name ?? r.name)}**](#${anchor(r)})${r.private ? " 🔒" : ""}${r.stars ? ` ⭐${r.stars}` : ""}<br>${cell(r.summary || "—")}`;
    const status = `${STATUS_EMOJI[r.status]} ${statusLabel(lang, r.status)}${r.statusInferred ? "*" : ""}`;
    const stack = cell(topStack(r).join(", ") || "—");
    const deps = r.deployments.map(depLabel).join("<br>") || "—";
    out.push(`| ${name} | ${status} | ${stack} | ${deps} | ${s.daysAgo(r.daysSincePush)} | ${r.healthScore} |`);
  }
  out.push("", lang === "zh-TW" ? "\\* 狀態是推測的，可在 `.project.yml` 設定 `status`。" : "\\* inferred status; set `status` in `.project.yml`.", "");

  out.push(`## ${s.details}`, "");
  for (const r of inv.repos) out.push(...renderDetail(r, lang), "");
  return out.join("\n");
}

function anchor(r: RepoRecord): string {
  return `p-${r.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function topStack(r: RepoRecord, n = 4): string[] {
  const langs = Object.entries(r.languages).sort((a, b) => b[1] - a[1]).map(([l]) => l);
  return [...new Set([...r.stack, ...langs])].slice(0, n);
}

function renderDetail(r: RepoRecord, lang: Lang): string[] {
  const s = t(lang);
  const m = r.meta;
  const out = [`### <a id="${anchor(r)}"></a>${m.name ?? r.name}${r.private ? ` 🔒` : ""}`, ""];
  out.push(`${STATUS_EMOJI[r.status]} ${statusLabel(lang, r.status)} · [${r.fullName}](${r.url}) · ${s.updated} ${s.daysAgo(r.daysSincePush)}${r.latestRelease ? ` · ${r.latestRelease.tag}` : ""}`, "");
  if (r.summary) out.push(r.summary, "");
  if (m.purpose) out.push(`**${s.purpose}:** ${m.purpose}`, "");

  const links = Object.entries(m.links).filter(([k, v]) => k !== "other" && typeof v === "string") as [string, string][];
  const allLinks = [...links.map(([k, v]) => `[${k}](${v})`), ...m.links.other.map((l) => `[${l.label}](${l.url})`)];
  if (allLinks.length) out.push(`**${s.links}:** ${allLinks.join(" · ")}`, "");

  if (r.deployments.length) {
    out.push(`**${s.deployments}:**`, "");
    for (const d of r.deployments) {
      const check = d.check ? (d.check.ok ? ` — ${d.check.status} in ${d.check.ms}ms` : ` — ⚠ ${d.check.status ?? d.check.error}`) : "";
      const metaDep = m.deployments.find((x) => x.url && x.url === d.url);
      const extra = [metaDep?.branch && `branch \`${metaDep.branch}\``, metaDep?.dashboard && `[dashboard](${metaDep.dashboard})`, metaDep?.notes].filter(Boolean).join(" · ");
      out.push(`- ${d.name}: ${depLabel(d)}${check}${extra ? ` · ${extra}` : ""}${d.source !== "meta" ? ` _(${d.evidence ?? d.source})_` : ""}`);
    }
    out.push("");
  }
  if (m.services.length) {
    out.push(`**${s.services}:** ${m.services.map((x) => `${x.dashboard ? `[${x.name}](${x.dashboard})` : x.name}${x.kind ? ` (${x.kind}${x.plan ? `, ${x.plan}` : ""})` : ""}`).join(" · ")}`, "");
  }
  if (m.domains.length) {
    out.push(`**${s.domains}:** ${m.domains.map((d) => `${d.name}${d.registrar ? ` @ ${d.registrar}` : ""}${d.expires ? ` → ${d.expires}` : ""}${d.autoRenew ? " (auto-renew)" : ""}`).join(" · ")}`, "");
  }
  if (m.env && (m.env.vars.length || m.env.location)) {
    out.push(`**${s.env}:** ${m.env.vars.map((v) => `\`${v}\``).join(", ") || "—"}${m.env.location ? ` (${s.envLocation} ${m.env.location})` : ""}`, "");
  }
  if (m.cost?.monthly !== undefined) out.push(`**${s.cost}:** ${m.cost.monthly} ${m.cost.currency}/mo${m.cost.notes ? ` — ${m.cost.notes}` : ""}`, "");
  if (m.next.length) out.push(`**${s.next}:**`, "", ...m.next.map((n) => `- [ ] ${n}`), "");
  if (m.related.length) out.push(`**${s.related}:** ${m.related.join(", ")}`, "");
  return out;
}
