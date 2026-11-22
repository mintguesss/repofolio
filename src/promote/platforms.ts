import { createHmac, randomBytes } from "node:crypto";
import type { Platform } from "../schema.js";
import type { DraftText, PostEvent } from "../state.js";

/**
 * Every platform repofolio can draft for. `env` lists the secrets that switch on automatic
 * publishing; without them the admin page offers copy + a prefilled share link instead.
 */
export interface PlatformInfo {
  id: Platform;
  label: string;
  /** Max length of the post text (characters; X counts a link as 23). */
  limit: number;
  /** Secrets needed to publish through the API. Empty = never automatic. */
  env: string[];
  /** Long-form article (title + markdown body). */
  article?: boolean;
  /** Share / compose page that takes the text or link in the URL. */
  share?: (text: string, url: string, title: string) => string;
}

const q = encodeURIComponent;

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  linkedin: { id: "linkedin", label: "LinkedIn", limit: 3000, env: ["LINKEDIN_TOKEN"], share: (_t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${q(u)}` },
  bluesky: { id: "bluesky", label: "Bluesky", limit: 300, env: ["BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD"], share: (t) => `https://bsky.app/intent/compose?text=${q(t)}` },
  mastodon: { id: "mastodon", label: "Mastodon", limit: 500, env: ["MASTODON_URL", "MASTODON_TOKEN"], share: (t) => `https://mastodonshare.com/?text=${q(t)}` },
  threads: { id: "threads", label: "Threads", limit: 500, env: ["THREADS_TOKEN"], share: (t) => `https://www.threads.net/intent/post?text=${q(t)}` },
  x: { id: "x", label: "X", limit: 280, env: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"], share: (t) => `https://x.com/intent/post?text=${q(t)}` },
  devto: { id: "devto", label: "DEV", limit: 60000, env: ["DEVTO_API_KEY"], article: true, share: () => "https://dev.to/new" },
  discord: { id: "discord", label: "Discord", limit: 2000, env: ["DISCORD_WEBHOOK"] },
  telegram: { id: "telegram", label: "Telegram", limit: 4096, env: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"], share: (t, u) => `https://t.me/share/url?url=${q(u)}&text=${q(t.replace(u, "").trim())}` },
  hn: { id: "hn", label: "Hacker News", limit: 80, env: [], share: (t, u, title) => `https://news.ycombinator.com/submitlink?u=${q(u)}&t=${q(t || title)}` },
  reddit: { id: "reddit", label: "Reddit", limit: 300, env: [], share: (t, u, title) => `https://www.reddit.com/submit?url=${q(u)}&title=${q(t || title)}` },
  facebook: { id: "facebook", label: "Facebook", limit: 5000, env: [], share: (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${q(u)}` },
  ptt: { id: "ptt", label: "PTT", limit: 8000, env: [] },
};

/** HN and Reddit only take a title; the draft text is that title. */
export const TITLE_ONLY = new Set<Platform>(["hn", "reddit"]);

export type Env = Record<string, string | undefined>;

export const hasCreds = (p: Platform, env: Env) => PLATFORM_INFO[p].env.length > 0 && PLATFORM_INFO[p].env.every((k) => !!env[k]);

/** Length as the platform counts it. */
export function postLength(p: Platform, text: string): number {
  const chars = [...new Intl.Segmenter().segment(text)].length;
  if (p !== "x") return chars;
  // X: every URL counts as 23, CJK counts double.
  let n = 0;
  const withoutUrls = text.replace(/https?:\/\/\S+/g, () => { n += 23; return ""; });
  for (const ch of withoutUrls) n += /[ᄀ-ᇿ⺀-꓏가-힯豈-﫿︰-﹏＀-￯]/.test(ch) ? 2 : 1;
  return n;
}

export interface Connection {
  platform: Platform;
  /** "auto": publishes via API. "manual": copy / share link. "error": creds set but rejected. */
  mode: "auto" | "manual" | "error";
  account?: string;
  error?: string;
}

type Fetch = typeof fetch;

async function json<T>(res: Response, what: string): Promise<T> {
  const body = await res.text();
  if (!res.ok) throw new Error(`${what}: ${res.status} ${body.slice(0, 300)}`);
  return (body ? JSON.parse(body) : {}) as T;
}

const LINKEDIN_VERSION = (env: Env) => env.LINKEDIN_VERSION || "202609";

async function linkedinMe(env: Env, f: Fetch): Promise<{ sub: string; name?: string }> {
  return json(await f("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${env.LINKEDIN_TOKEN}` } }), "LinkedIn userinfo");
}

async function blueskySession(env: Env, f: Fetch): Promise<{ accessJwt: string; did: string; handle: string }> {
  const pds = (env.BLUESKY_PDS || "https://bsky.social").replace(/\/$/, "");
  return json(
    await f(`${pds}/xrpc/com.atproto.server.createSession`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }) }),
    "Bluesky login",
  );
}

/** Cheap "are these credentials still good?" checks, shown in the admin page (catches expired LinkedIn tokens). */
export async function checkConnections(platforms: Platform[], env: Env, f: Fetch = fetch): Promise<Connection[]> {
  const out: Connection[] = [];
  for (const p of platforms) {
    if (!hasCreds(p, env)) { out.push({ platform: p, mode: "manual" }); continue; }
    try {
      let account: string | undefined;
      if (p === "linkedin") account = (await linkedinMe(env, f)).name;
      else if (p === "bluesky") account = "@" + (await blueskySession(env, f)).handle;
      else if (p === "mastodon") account = "@" + (await json<{ acct: string }>(await f(`${env.MASTODON_URL!.replace(/\/$/, "")}/api/v1/accounts/verify_credentials`, { headers: { Authorization: `Bearer ${env.MASTODON_TOKEN}` } }), "Mastodon")).acct;
      else if (p === "devto") account = "@" + (await json<{ username: string }>(await f("https://dev.to/api/users/me", { headers: { "api-key": env.DEVTO_API_KEY!, Accept: "application/vnd.forem.api-v1+json" } }), "DEV")).username;
      else if (p === "threads") account = "@" + (await json<{ username: string }>(await f(`https://graph.threads.net/v1.0/me?fields=username&access_token=${q(env.THREADS_TOKEN!)}`), "Threads")).username;
      out.push({ platform: p, mode: "auto", account });
    } catch (e) {
      out.push({ platform: p, mode: "error", error: (e as Error).message.slice(0, 200) });
    }
  }
  return out;
}

/** LinkedIn's "little text" format: these characters must be backslash-escaped in commentary. */
export function linkedinEscape(s: string): string {
  return s.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => "\\" + c);
}

/** UTF-8 byte offsets of every URL in the text, for Bluesky link facets. */
export function blueskyFacets(text: string) {
  const enc = new TextEncoder();
  const facets = [];
  for (const m of text.matchAll(/https?:\/\/[^\s)]+/g)) {
    const start = enc.encode(text.slice(0, m.index)).length;
    facets.push({ index: { byteStart: start, byteEnd: start + enc.encode(m[0]).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: m[0] }] });
  }
  return facets;
}

/** OAuth 1.0a header for X's user-context endpoints. */
export function oauth1Header(method: string, url: string, env: Env, nonce = randomBytes(16).toString("hex"), ts = Math.floor(Date.now() / 1000).toString()): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  const params: Record<string, string> = {
    oauth_consumer_key: env.X_API_KEY!,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: ts,
    oauth_token: env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };
  const base = [method.toUpperCase(), enc(url), enc(Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k]!)}`).join("&"))].join("&");
  params.oauth_signature = createHmac("sha1", `${enc(env.X_API_SECRET!)}&${enc(env.X_ACCESS_SECRET!)}`).update(base).digest("base64");
  return "OAuth " + Object.keys(params).sort().map((k) => `${enc(k)}="${enc(params[k]!)}"`).join(", ");
}

/** Publish one draft. Returns the public URL of the post when the platform gives one. */
export async function publishTo(p: Platform, draft: DraftText, ev: PostEvent, env: Env, f: Fetch = fetch): Promise<{ url?: string }> {
  const text = draft.text;
  switch (p) {
    case "linkedin": {
      const me = await linkedinMe(env, f);
      const headers = { Authorization: `Bearer ${env.LINKEDIN_TOKEN}`, "Content-Type": "application/json", "LinkedIn-Version": LINKEDIN_VERSION(env), "X-Restli-Protocol-Version": "2.0.0" };
      const body = (withArticle: boolean) => JSON.stringify({
        author: `urn:li:person:${me.sub}`,
        commentary: linkedinEscape(text),
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        ...(withArticle ? { content: { article: { source: ev.url, title: ev.title.slice(0, 200), description: String(ev.facts.summary ?? "").slice(0, 250) } } } : {}),
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      });
      let res = await f("https://api.linkedin.com/rest/posts", { method: "POST", headers, body: body(true) });
      // Some apps can't attach article cards; the link in the text still works.
      if (res.status === 422 || res.status === 400) res = await f("https://api.linkedin.com/rest/posts", { method: "POST", headers, body: body(false) });
      if (!res.ok) throw new Error(`LinkedIn: ${res.status} ${(await res.text()).slice(0, 300)}`);
      const id = res.headers.get("x-restli-id");
      return { url: id ? `https://www.linkedin.com/feed/update/${id}/` : undefined };
    }
    case "bluesky": {
      const pds = (env.BLUESKY_PDS || "https://bsky.social").replace(/\/$/, "");
      const s = await blueskySession(env, f);
      const auth = { Authorization: `Bearer ${s.accessJwt}` };
      let thumb: unknown;
      if (ev.image) {
        try {
          const img = await f(ev.image);
          const type = img.headers.get("content-type") ?? "";
          const buf = new Uint8Array(await img.arrayBuffer());
          if (img.ok && type.startsWith("image/") && buf.length < 950_000) {
            thumb = (await json<{ blob: unknown }>(await f(`${pds}/xrpc/com.atproto.repo.uploadBlob`, { method: "POST", headers: { ...auth, "Content-Type": type }, body: buf }), "Bluesky upload")).blob;
          }
        } catch { /* card without a picture */ }
      }
      const record = {
        $type: "app.bsky.feed.post",
        text,
        createdAt: new Date().toISOString(),
        facets: blueskyFacets(text),
        embed: { $type: "app.bsky.embed.external", external: { uri: ev.url, title: ev.title.slice(0, 300), description: String(ev.facts.summary ?? "").slice(0, 300), ...(thumb ? { thumb } : {}) } },
        langs: [/[一-鿿]/.test(text) ? "zh" : "en"],
      };
      const r = await json<{ uri: string }>(await f(`${pds}/xrpc/com.atproto.repo.createRecord`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ repo: s.did, collection: "app.bsky.feed.post", record }) }), "Bluesky post");
      return { url: `https://bsky.app/profile/${s.handle}/post/${r.uri.split("/").pop()}` };
    }
    case "mastodon": {
      const r = await json<{ url: string }>(await f(`${env.MASTODON_URL!.replace(/\/$/, "")}/api/v1/statuses`, { method: "POST", headers: { Authorization: `Bearer ${env.MASTODON_TOKEN}`, "Content-Type": "application/json", "Idempotency-Key": ev.key }, body: JSON.stringify({ status: text, visibility: "public" }) }), "Mastodon");
      return { url: r.url };
    }
    case "threads": {
      const base = "https://graph.threads.net/v1.0/me";
      const tok = q(env.THREADS_TOKEN!);
      const c = await json<{ id: string }>(await f(`${base}/threads?media_type=TEXT&text=${q(text)}&link_attachment=${q(ev.url)}&access_token=${tok}`, { method: "POST" }), "Threads create");
      // Meta recommends a short wait before publishing a container.
      await new Promise((r) => setTimeout(r, env.THREADS_WAIT_MS ? Number(env.THREADS_WAIT_MS) : 5000));
      const pub = await json<{ id: string }>(await f(`${base}/threads_publish?creation_id=${q(c.id)}&access_token=${tok}`, { method: "POST" }), "Threads publish");
      const link = await f(`https://graph.threads.net/v1.0/${pub.id}?fields=permalink&access_token=${tok}`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) as { permalink?: string };
      return { url: link.permalink };
    }
    case "x": {
      const url = "https://api.x.com/2/tweets";
      const r = await json<{ data: { id: string } }>(await f(url, { method: "POST", headers: { Authorization: oauth1Header("POST", url, env), "Content-Type": "application/json" }, body: JSON.stringify({ text }) }), "X");
      return { url: `https://x.com/i/status/${r.data.id}` };
    }
    case "devto": {
      const tags = (Array.isArray(ev.facts.tags) ? ev.facts.tags : []).map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean).slice(0, 4);
      const r = await json<{ url: string }>(
        await f("https://dev.to/api/articles", {
          method: "POST",
          headers: { "api-key": env.DEVTO_API_KEY!, "Content-Type": "application/json", Accept: "application/vnd.forem.api-v1+json" },
          body: JSON.stringify({ article: { title: draft.title || ev.title, body_markdown: text, published: true, tags, ...(ev.image ? { main_image: ev.image } : {}) } }),
        }),
        "DEV",
      );
      return { url: r.url };
    }
    case "discord": {
      const res = await f(env.DISCORD_WEBHOOK!, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text.slice(0, 2000) }) });
      if (!res.ok) throw new Error(`Discord: ${res.status}`);
      return {};
    }
    case "telegram": {
      await json(await f(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }) }), "Telegram");
      return {};
    }
    default:
      throw new Error(`${p} has no API; post it by hand from the admin page`);
  }
}
