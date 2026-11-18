import type { Status } from "./schema.js";

export type Lang = "en" | "zh-TW";

const STRINGS = {
  en: {
    catalogTitle: "Project catalog",
    generated: "Generated",
    overview: "Overview",
    total: "Repos",
    live: "Live URLs",
    down: "Down",
    stale: "Stale",
    needsAttention: "Needs attention",
    allProjects: "All projects",
    project: "Project",
    status: "Status",
    stack: "Stack",
    deployedAt: "Deployed at",
    updated: "Updated",
    health: "Health",
    details: "Details",
    links: "Links",
    deployments: "Deployments",
    services: "Services",
    domains: "Domains",
    env: "Env vars",
    envLocation: "stored in",
    cost: "Cost",
    next: "Next steps",
    related: "Related",
    purpose: "Purpose",
    daysAgo: (n: number) => (n === 0 ? "today" : n === 1 ? "1 day ago" : `${n} days ago`),
    noIssues: "No issues 🎉",
    search: "Search projects…",
    all: "All",
    viewCode: "Code",
    visit: "Visit",
    madeWith: "Built with",
    private: "private",
    featured: "Featured",
  },
  "zh-TW": {
    catalogTitle: "專案總覽",
    generated: "產生時間",
    overview: "概況",
    total: "Repo 數",
    live: "上線網址",
    down: "連不上",
    stale: "沉睡中",
    needsAttention: "需要處理",
    allProjects: "所有專案",
    project: "專案",
    status: "狀態",
    stack: "技術",
    deployedAt: "部署位置",
    updated: "最後更新",
    health: "健康度",
    details: "詳細資料",
    links: "連結",
    deployments: "部署",
    services: "外部服務",
    domains: "網域",
    env: "環境變數",
    envLocation: "存放於",
    cost: "費用",
    next: "下一步",
    related: "相關專案",
    purpose: "目的",
    daysAgo: (n: number) => (n === 0 ? "今天" : `${n} 天前`),
    noIssues: "沒有問題 🎉",
    search: "搜尋專案…",
    all: "全部",
    viewCode: "程式碼",
    visit: "前往",
    madeWith: "由此工具產生：",
    private: "私有",
    featured: "精選",
  },
} as const;

export type Strings = (typeof STRINGS)["en"];

export function t(lang: Lang): Strings {
  return (STRINGS[lang] ?? STRINGS.en) as Strings;
}

const STATUS_LABEL: Record<Lang, Record<Status, string>> = {
  en: { idea: "Idea", active: "Active", maintenance: "Maintenance", paused: "Paused", done: "Done", archived: "Archived" },
  "zh-TW": { idea: "構想", active: "進行中", maintenance: "維護中", paused: "暫停", done: "完成", archived: "封存" },
};

export const STATUS_EMOJI: Record<Status, string> = {
  idea: "💡", active: "🟢", maintenance: "🔧", paused: "⏸️", done: "✅", archived: "📦",
};

export function statusLabel(lang: Lang, s: Status): string {
  return STATUS_LABEL[lang]?.[s] ?? s;
}
