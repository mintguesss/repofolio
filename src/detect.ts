import type { Provider, Status } from "./schema.js";
import type { DetectedDeployment } from "./types.js";

/** Guess the hosting provider from a URL's hostname. */
export function providerFromUrl(raw: string): Provider | undefined {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  const rules: [RegExp, Provider][] = [
    [/\.vercel\.app$/, "vercel"],
    [/\.netlify\.app$/, "netlify"],
    [/\.(pages|workers)\.dev$/, "cloudflare"],
    [/\.github\.io$/, "github-pages"],
    [/\.fly\.dev$/, "fly"],
    [/\.onrender\.com$/, "render"],
    [/\.up\.railway\.app$/, "railway"],
    [/\.herokuapp\.com$/, "heroku"],
    [/\.(web\.app|firebaseapp\.com)$/, "firebase"],
    [/(^|\.)huggingface\.co$|\.hf\.space$/, "huggingface"],
    [/\.streamlit\.app$/, "streamlit"],
    [/(^|\.)npmjs\.com$/, "npm"],
    [/(^|\.)pypi\.org$/, "pypi"],
    [/^apps\.apple\.com$/, "app-store"],
    [/^play\.google\.com$/, "play-store"],
    [/^chromewebstore\.google\.com$|^chrome\.google\.com$/, "chrome-web-store"],
    [/\.amazonaws\.com$|\.cloudfront\.net$/, "aws"],
    [/\.run\.app$|\.appspot\.com$/, "gcp"],
    [/\.azurewebsites\.net$|\.azurestaticapps\.net$/, "azure"],
  ];
  for (const [re, p] of rules) if (re.test(host)) return p;
  return undefined;
}

/** Root-level files that hint at where/how a repo is deployed. */
const FILE_HINTS: [RegExp, Provider][] = [
  [/^vercel\.json$/, "vercel"],
  [/^netlify\.toml$/, "netlify"],
  [/^wrangler\.(toml|json|jsonc)$/, "cloudflare"],
  [/^fly\.toml$/, "fly"],
  [/^render\.ya?ml$/, "render"],
  [/^railway\.(json|toml)$/, "railway"],
  [/^Procfile$/, "heroku"],
  [/^firebase\.json$/, "firebase"],
  [/^app\.ya?ml$/, "gcp"],
  [/^(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/, "docker"],
  [/^CNAME$/, "github-pages"],
];

/** Workflow file names / contents that hint at a deploy target. */
const WORKFLOW_HINTS: [RegExp, Provider][] = [
  [/actions\/deploy-pages|peaceiris\/actions-gh-pages|JamesIves\/github-pages-deploy/i, "github-pages"],
  [/vercel/i, "vercel"],
  [/netlify/i, "netlify"],
  [/cloudflare\/(wrangler|pages)-action/i, "cloudflare"],
  [/superfly\/flyctl/i, "fly"],
  [/aws-actions\//i, "aws"],
  [/google-github-actions\/deploy/i, "gcp"],
  [/azure\/webapps-deploy|Azure\/static-web-apps-deploy/i, "azure"],
  [/npm publish|JS-DevTools\/npm-publish/i, "npm"],
  [/pypa\/gh-action-pypi-publish|twine upload/i, "pypi"],
  [/docker\/build-push-action/i, "docker"],
];

export function detectFromFiles(rootFiles: string[], workflowTexts: string[]): DetectedDeployment[] {
  const found = new Map<Provider, string>();
  for (const f of rootFiles) {
    for (const [re, p] of FILE_HINTS) if (re.test(f) && !found.has(p)) found.set(p, f);
  }
  for (const text of workflowTexts) {
    for (const [re, p] of WORKFLOW_HINTS) if (re.test(text) && !found.has(p)) found.set(p, "workflow");
  }
  return [...found].map(([provider, evidence]) => ({
    name: provider === "docker" || provider === "npm" || provider === "pypi" ? provider : "production",
    provider,
    source: "config-file" as const,
    evidence,
  }));
}

/**
 * Merge deployments from multiple sources. Explicit metadata wins; URL-bearing
 * entries absorb URL-less hints for the same provider.
 */
export function mergeDeployments(lists: DetectedDeployment[][]): DetectedDeployment[] {
  const out: DetectedDeployment[] = [];
  for (const d of lists.flat()) {
    const sameUrl = d.url ? out.find((o) => o.url && normUrl(o.url) === normUrl(d.url!)) : undefined;
    if (sameUrl) {
      sameUrl.provider ??= d.provider;
      sameUrl.lastDeployedAt ??= d.lastDeployedAt;
      continue;
    }
    if (!d.url && d.provider) {
      // A bare hint is redundant if we already know a URL for that provider.
      if (out.some((o) => o.provider === d.provider)) continue;
    }
    if (d.url && d.provider) {
      const hint = out.findIndex((o) => !o.url && o.provider === d.provider);
      if (hint >= 0) {
        out[hint] = { ...d, evidence: d.evidence ?? out[hint]!.evidence };
        continue;
      }
    }
    out.push({ ...d });
  }
  return out;
}

/**
 * Per-deployment URLs (e.g. Vercel's `app-3k2j9x8h1-team-projects.vercel.app`,
 * Netlify's `64ab12--site.netlify.app`) change on every deploy, are often behind
 * SSO and die when old deployments are cleaned up. Prefer the stable alias.
 */
export function isEphemeralUrl(raw: string): boolean {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host.endsWith(".vercel.app")) {
    const sub = host.slice(0, -".vercel.app".length);
    return /-[a-z0-9]{9}-[a-z0-9-]+$/.test(sub) && /\d/.test(sub.match(/-([a-z0-9]{9})-/)?.[1] ?? "");
  }
  if (host.endsWith(".netlify.app")) return /^[0-9a-f]{20,}--/.test(host) || /^deploy-preview-\d+--/.test(host);
  if (host.endsWith(".pages.dev")) return /^[0-9a-f]{8}\./.test(host);
  return false;
}

/** Drop ephemeral URLs when the same provider also has a stable one. */
export function preferStableUrls(list: DetectedDeployment[]): DetectedDeployment[] {
  return list.filter((d) => {
    if (!d.url || !isEphemeralUrl(d.url)) return true;
    return !list.some((o) => o !== d && o.url && o.provider === d.provider && !isEphemeralUrl(o.url));
  });
}

function normUrl(u: string): string {
  return u.replace(/\/+$/, "").replace(/^http:/, "https:").toLowerCase();
}

/** Framework / library detection from manifests. Order = display order. */
const STACK_RULES: [RegExp, string][] = [
  [/"next"/, "Next.js"],
  [/"nuxt"/, "Nuxt"],
  [/"@sveltejs\/kit"/, "SvelteKit"],
  [/"astro"/, "Astro"],
  [/"@remix-run\//, "Remix"],
  [/"react"/, "React"],
  [/"vue"/, "Vue"],
  [/"svelte"/, "Svelte"],
  [/"@angular\/core"/, "Angular"],
  [/"electron"/, "Electron"],
  [/"react-native"|"expo"/, "React Native"],
  [/"tailwindcss"/, "Tailwind CSS"],
  [/"express"/, "Express"],
  [/"hono"/, "Hono"],
  [/"fastify"/, "Fastify"],
  [/"@nestjs\/core"/, "NestJS"],
  [/"@supabase\/supabase-js"/, "Supabase"],
  [/"firebase"/, "Firebase"],
  [/"prisma"|"@prisma\/client"/, "Prisma"],
  [/"drizzle-orm"/, "Drizzle"],
  [/"@anthropic-ai\/sdk"/, "Claude API"],
  [/"openai"/, "OpenAI API"],
  [/"three"/, "Three.js"],
  [/^fastapi\b/im, "FastAPI"],
  [/^django\b/im, "Django"],
  [/^flask\b/im, "Flask"],
  [/^streamlit\b/im, "Streamlit"],
  [/^gradio\b/im, "Gradio"],
  [/^torch\b/im, "PyTorch"],
  [/^tensorflow\b/im, "TensorFlow"],
  [/^scikit-learn\b|^sklearn\b/im, "scikit-learn"],
  [/^(lightgbm|xgboost|catboost)\b/im, "Gradient Boosting"],
  [/^pandas\b/im, "pandas"],
  [/^transformers\b/im, "Transformers"],
  [/^langchain/im, "LangChain"],
  [/^anthropic\b/im, "Claude API"],
  [/^openai\b/im, "OpenAI API"],
];

export function detectStack(manifests: string[]): string[] {
  const text = manifests.join("\n");
  // Python deps inside pyproject are quoted list items; normalise them onto their own lines.
  const pyNorm = text.replace(/["']([A-Za-z0-9_.-]+)\s*(?:[<>=~!\[][^"']*)?["']\s*,?/g, "\n$1\n");
  const out: string[] = [];
  for (const [re, name] of STACK_RULES) {
    if ((re.test(text) || re.test(pyNorm)) && !out.includes(name)) out.push(name);
  }
  return out;
}

export function inferStatus(opts: { archived: boolean; daysSincePush: number; staleDays: number }): Status {
  if (opts.archived) return "archived";
  if (opts.daysSincePush <= 30) return "active";
  if (opts.daysSincePush <= opts.staleDays) return "maintenance";
  return "paused";
}

/** First meaningful paragraph of a README, stripped of markdown noise. */
export function readmeExcerpt(md: string, max = 280): string {
  const cleaned = md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, " ")
    // Headings end a paragraph even without a blank line ("# Title\n> tagline").
    .replace(/^#{1,6}\s.*$/gm, "\n")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !/^#/.test(p) &&
        !/^(\[!\[|!\[)/.test(p) &&
        !/^[-|:\s]+$/.test(p) &&
        !/^\|/.test(p) &&
        !/^---+$/.test(p) &&
        !/^([-*+]|\d+\.)\s/.test(p) && // lists rarely describe the project
        !/localhost|^(\$ |npm |pnpm |yarn |pip |git |cd |開啟|執行|Run |Open )/i.test(p) && // setup steps
        /[\p{L}]{2,}/u.test(p.replace(/\[[^\]]*\]\([^)]*\)/g, "")), // skip badge/link-only lines
    );
  const first = (cleaned[0] ?? "")
    .replace(/^>\s?/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return first.length > max ? first.slice(0, max - 1) + "…" : first;
}

export interface ReadmeIntro {
  /** First descriptive paragraphs (plain text). */
  paragraphs: string[];
  /** Bullet points from a Features / 功能 section (or the first real list). */
  features: string[];
  /** Section headings, as a table of contents. */
  sections: string[];
}

const plain = (s: string) =>
  s
    .replace(/^>\s?/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const SKIP_HEADINGS = /^(table of contents|contents|目錄|license|授權|installation|install|安裝|setup|getting started|快速開始|開始使用|usage|使用方式|development|開發|contributing|貢獻|credits|acknowledg|致謝|faq|常見問題|changelog|更新紀錄)/i;
const FEATURE_HEADINGS = /(features?|highlights?|what it does|why|功能|特色|亮點|特點|能做什麼|主要)/i;

/** A richer README intro for the project details: a few paragraphs, the feature list and the section outline. */
export function readmeIntro(md: string): ReadmeIntro {
  const text = md.replace(/<!--[\s\S]*?-->/g, "").replace(/```[\s\S]*?```/g, "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const sections: string[] = [];
  const features: string[] = [];
  let heading = "";
  let firstList: string[] = [];
  let curList: string[] = [];
  let inFeatures = false;
  const flush = () => {
    if (curList.length >= 3 && !firstList.length && !SKIP_HEADINGS.test(heading)) firstList = curList;
    curList = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const h = /^(#{2,3})\s+(.+)$/.exec(line);
    if (h) {
      flush();
      heading = plain(h[2]!).replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "");
      if (h[1] === "##" && heading && !SKIP_HEADINGS.test(heading) && sections.length < 10) sections.push(heading.slice(0, 60));
      inFeatures = FEATURE_HEADINGS.test(heading) && !features.length;
      continue;
    }
    const li = /^(?:[-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (li) {
      const full = plain(li[1]!);
      const item = full.length > 160 ? full.slice(0, 159) + "…" : full;
      if (item.length < 4 || /^(npm|pnpm|yarn|pip|git|cd|docker)\s/.test(item)) continue;
      if (inFeatures && features.length < 8) features.push(item);
      curList.push(item);
    } else if (line) {
      flush();
    }
  }
  flush();
  if (!features.length) features.push(...firstList.slice(0, 6));

  const paragraphs = text
    .replace(/^#{1,6}\s.*$/gm, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(\[!\[|!\[|\||[-*+]\s|\d+\.\s|---)/.test(p) && !/localhost|^(\$ |npm |pnpm |yarn |pip |git |cd )/i.test(p) && /[\p{L}]{2,}/u.test(p.replace(/\[[^\]]*\]\([^)]*\)/g, "")))
    .map(plain)
    .filter((p) => p.length >= 12)
    .slice(0, 3)
    .map((p) => (p.length > 420 ? p.slice(0, 419) + "…" : p));
  return { paragraphs, features, sections };
}

/** Heuristic: does a string look like a secret value rather than a variable name? */
export function looksLikeSecret(s: string): boolean {
  if (s.includes("=")) return true;
  if (/^(sk|pk|ghp|gho|ghs|xox[bp]|AKIA|eyJ)[-_A-Za-z0-9]{10,}/.test(s)) return true;
  // Variable names are UPPER_SNAKE; long mixed-case random strings are suspicious.
  return s.length >= 24 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && !/_/.test(s);
}

/** File names that are icons/logos/diagrams, not screenshots. */
const NOT_COVER_RE = /icon|logo|favicon|badge|avatar|mipmap|architecture|diagram|pwa-|maskable|apple-touch|qr/i;

const BADGE_RE = /shields\.io|badge|badgen|\/actions\/workflows\/|codecov|travis-ci|circleci|coveralls|deepsource|sonarcloud|vercel\.com\/button|deploy-button|herokucdn|\.svg(\?|$)|img\.youtube|skillicons|readme-stats|github-readme|komarev|visitor/i;

/**
 * First real image in a README (screenshots, not badges), resolved to an absolute URL.
 * Relative paths become raw.githubusercontent.com links, so this is only useful for public repos.
 */
export function readmeImage(md: string, fullName: string, branch: string): string | undefined {
  const cleaned = md.replace(/<!--[\s\S]*?-->/g, "").replace(/```[\s\S]*?```/g, "");
  const found: string[] = [];
  for (const m of cleaned.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = (m[1] ?? m[2] ?? "").trim();
    if (src) found.push(src);
  }
  for (const src of found) {
    if (BADGE_RE.test(src) || src.startsWith("data:") || NOT_COVER_RE.test(src.split("?")[0]!.split("/").pop() ?? "")) continue;
    if (/^https?:\/\//i.test(src)) {
      return src.replace(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//, "https://raw.githubusercontent.com/$1/");
    }
    const path = src.replace(/^\.?\//, "").replace(/\?raw=true$/, "");
    if (!/\.(png|jpe?g|gif|webp|avif)$/i.test(path)) continue;
    const decode = (seg: string) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    };
    return `https://raw.githubusercontent.com/${fullName}/${branch}/${path.split("/").map((seg) => encodeURIComponent(decode(seg))).join("/")}`;
  }
  return undefined;
}

/** Best screenshot-like image in a repo tree, as a raw URL. Used when the README has none. */
export function pickScreenshot(paths: string[], fullName: string, branch: string): string | undefined {
  let best: { path: string; score: number } | undefined;
  for (const path of paths) {
    if (!/\.(png|jpe?g|webp|gif)$/i.test(path)) continue;
    if (/(^|\/)(node_modules|vendor|dist|build|\.next|out|android|ios|test|tests|__tests__|fixtures?)\//i.test(path)) continue;
    const file = path.split("/").pop()!;
    if (NOT_COVER_RE.test(path)) continue;
    // Only where repos keep their own screenshots: the root, docs/.github/assets-style folders, or a screenshot folder.
    const top = path.includes("/") ? path.split("/")[0]!.toLowerCase() : "";
    if (top && !/^(docs?|\.github|assets|screenshots?|images?|img|media|preview)$/.test(top) && !/screenshot/i.test(path)) continue;
    let score = 0;
    if (/screenshot|screen|preview|demo|showcase/i.test(path)) score += 4;
    if (/hero|home|cover|banner|main|overview|dashboard/i.test(file)) score += 3;
    if (/(^|\/)(docs?|assets|images?|img|media|public)\//i.test(path)) score += 1;
    if (/-zh|_zh|zh-/i.test(file)) score -= 1;
    score -= path.split("/").length * 0.1;
    if (score > 0 && (!best || score > best.score)) best = { path, score };
  }
  return best ? `https://raw.githubusercontent.com/${fullName}/${branch}/${best.path.split("/").map(encodeURIComponent).join("/")}` : undefined;
}
