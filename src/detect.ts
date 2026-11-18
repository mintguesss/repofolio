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

/** Heuristic: does a string look like a secret value rather than a variable name? */
export function looksLikeSecret(s: string): boolean {
  if (s.includes("=")) return true;
  if (/^(sk|pk|ghp|gho|ghs|xox[bp]|AKIA|eyJ)[-_A-Za-z0-9]{10,}/.test(s)) return true;
  // Variable names are UPPER_SNAKE; long mixed-case random strings are suspicious.
  return s.length >= 24 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && !/_/.test(s);
}
