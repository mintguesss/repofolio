import type { GitHubClient } from "./github.js";
import type { Lang } from "./i18n.js";
import type { RepoRecord } from "./types.js";

const LABEL = "repofolio:stale";

export function staleIssueTitle(r: RepoRecord, lang: Lang): string {
  return lang === "zh-TW" ? `[沉睡] ${r.fullName} 已 ${r.daysSincePush} 天沒更新` : `[stale] ${r.fullName}: no pushes for ${r.daysSincePush} days`;
}

export function staleIssueBody(r: RepoRecord, lang: Lang): string {
  if (lang === "zh-TW") {
    return [
      `**${r.fullName}** 最後一次推送是 ${r.pushedAt.slice(0, 10)}（${r.daysSincePush} 天前）。`,
      "",
      r.summary ? `> ${r.summary}` : "",
      "",
      "要怎麼處理？在該 repo 的 `.project.yml` 設定 `status`，下次掃描就不會再提醒：",
      "",
      "- [ ] 繼續做 → `status: active`，順便寫下 `next:`",
      "- [ ] 已完成 → `status: done`",
      "- [ ] 先暫停 → `status: paused`",
      "- [ ] 不做了 → 在 GitHub 封存（Archive）這個 repo",
      "",
      `<!-- repofolio:repo=${r.fullName} -->`,
    ].join("\n");
  }
  return [
    `**${r.fullName}** was last pushed on ${r.pushedAt.slice(0, 10)} (${r.daysSincePush} days ago).`,
    "",
    r.summary ? `> ${r.summary}` : "",
    "",
    "What now? Set `status` in that repo's `.project.yml` and repofolio stops asking:",
    "",
    "- [ ] Keep going → `status: active` (and add `next:` steps)",
    "- [ ] It's finished → `status: done`",
    "- [ ] On hold → `status: paused`",
    "- [ ] Abandoned → archive the repo on GitHub",
    "",
    `<!-- repofolio:repo=${r.fullName} -->`,
  ].join("\n");
}

/** Open one issue per stale repo in the hub repo, skipping repos that already have an open one. */
export async function openStaleIssues(client: GitHubClient, hubRepo: string, repos: RepoRecord[], lang: Lang, dryRun = false): Promise<string[]> {
  const stale = repos.filter((r) => r.stale);
  if (!stale.length) return [];
  const open = await client.paginate<{ body: string | null; pull_request?: unknown }>(`/repos/${hubRepo}/issues?state=open&labels=${encodeURIComponent(LABEL)}`);
  const already = new Set(open.filter((i) => !i.pull_request).map((i) => i.body?.match(/repofolio:repo=([^\s]+) -->/)?.[1]).filter(Boolean));
  const created: string[] = [];
  for (const r of stale) {
    if (already.has(r.fullName)) continue;
    if (dryRun) {
      created.push(`(dry-run) ${staleIssueTitle(r, lang)}`);
      continue;
    }
    const issue = await client.post<{ html_url: string }>(`/repos/${hubRepo}/issues`, {
      title: staleIssueTitle(r, lang),
      body: staleIssueBody(r, lang),
      labels: [LABEL],
    });
    created.push(issue.html_url);
  }
  return created;
}
