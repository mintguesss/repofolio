import { looksLikeSecret } from "./detect.js";
import type { Lang } from "./i18n.js";
import type { HealthIssue, RepoRecord } from "./types.js";

type HealthInput = Omit<RepoRecord, "health" | "healthScore">;

const WEIGHT = { error: 25, warn: 10, info: 3 } as const;

export function checkHealth(r: HealthInput, lang: Lang = "en"): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const zh = lang === "zh-TW";
  const add = (id: string, level: HealthIssue["level"], en: string, tw: string) =>
    issues.push({ id, level, message: zh ? tw : en });
  const live = r.status !== "archived";
  // The profile README repo (me/me) is not a project: topics, licence, staleness and deploy checks don't apply.
  const profile = r.name.toLowerCase() === r.owner.toLowerCase();

  if (!r.readme) add("no-readme", "error", "No README", "沒有 README");
  else if (r.readme.length < 300)
    add("readme-short", "warn", `README is very short (${r.readme.length} chars)`, `README 太短（${r.readme.length} 字元），別人看不懂這是什麼`);

  if (!r.description && !profile) add("no-description", "warn", "Repo has no description (About field)", "GitHub repo 沒有 description（About 欄位）");
  if (r.topics.length === 0 && !r.private && !profile) add("no-topics", "warn", "No topics, so it's hard to find in GitHub search", "沒有 topics，GitHub 搜尋不到");
  if (!r.license && !r.private && !profile) add("no-license", "warn", "Public repo without a LICENSE", "公開 repo 沒有 LICENSE，別人無法合法使用");

  const urls = r.deployments.filter((d) => d.url);
  if (urls.length > 0 && !r.homepage && !r.private && !profile) {
    add("no-homepage", "info", `Found deployment ${urls[0]!.url} but the repo's Website field is empty`, `偵測到部署網址 ${urls[0]!.url}，但 repo 的 Website 欄位是空的`);
  }
  const hinted = r.deployments.filter((d) => !d.url && d.provider && !["docker", "npm", "pypi"].includes(d.provider));
  for (const d of hinted) {
    add("deploy-url-unknown", "info", `Looks deployed to ${d.provider} (${d.evidence}) but the URL is unknown; add it to .project.yml`, `看起來有部署到 ${d.provider}（${d.evidence}），但不知道網址，請在 .project.yml 補上`);
  }
  for (const d of urls) {
    if (d.check && !d.check.ok && live) {
      const why = d.check.status ?? d.check.error;
      add("url-down", "error", `${d.url} is unreachable (${why})`, `${d.url} 無法連線（${why}）`);
    }
  }

  if (r.stale && !profile) add("stale", "warn", `No pushes for ${r.daysSincePush} days: keep going, mark done, or archive?`, `${r.daysSincePush} 天沒有更新，要繼續、標記完成，還是封存？`);
  if (!r.hasMetaFile && !profile) add("no-meta", "info", "No .project.yml (run `repofolio init`)", "沒有 .project.yml（用 `repofolio init` 產生）");
  for (const p of r.metaProblems) add("meta-invalid", "warn", `.project.yml problem: ${p}`, `.project.yml 格式問題：${p}`);

  for (const v of r.meta.env?.vars ?? []) {
    if (looksLikeSecret(v)) {
      add("secret-in-meta", "error", `env.vars in .project.yml looks like a secret value ("${v.slice(0, 4)}…"); list variable NAMES only`, `.project.yml 的 env.vars 疑似放了密鑰值（「${v.slice(0, 4)}…」），只能放變數名稱`);
    }
  }
  for (const dom of r.meta.domains) {
    if (!dom.expires) continue;
    const days = Math.floor((Date.parse(dom.expires) - Date.now()) / 86_400_000);
    if (days < 0) add("domain-expired", "error", `Domain ${dom.name} expired on ${dom.expires}`, `網域 ${dom.name} 已在 ${dom.expires} 過期`);
    else if (days <= 30 && !dom.autoRenew) add("domain-expiring", "warn", `Domain ${dom.name} expires in ${days} days`, `網域 ${dom.name} 將在 ${days} 天後過期`);
  }
  if (r.showcase && r.private && r.summarySource === "none") {
    add("showcase-no-summary", "warn", "Private repo is showcased but has no summary", "私有 repo 設為公開展示，但沒有 summary，網站上會是空白卡片");
  }
  return issues;
}

export function healthScore(issues: HealthIssue[]): number {
  const penalty = issues.reduce((s, i) => s + WEIGHT[i.level], 0);
  return Math.max(0, 100 - penalty);
}
