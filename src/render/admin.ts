import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { gzipSync } from "node:zlib";
import type { Config } from "../schema.js";
import { esc } from "./public.js";

/** PBKDF2-SHA256 rounds. Makes every password guess against the published file expensive. */
export const ADMIN_KDF_ITERATIONS = 600_000;
const STORE_PREFIX = "repofolio-admin";

function texts(zh: boolean, repo?: string) {
  return zh
    ? {
        title: "管理後台",
        leadPw: "輸入管理密碼。",
        leadTk: "貼上能讀取私有 repo 的 GitHub 金鑰。",
        labelPw: "密碼",
        labelTk: "GitHub 金鑰（fine-grained token）",
        how: "第一次用：建立一把金鑰",
        steps: `Repository access 選「Only select repositories」→ ${repo ?? ""}；Permissions → Contents 設成 Read-only。`,
        remember: "在這台裝置記住我",
        go: "進入",
        loading: "解鎖中…",
        badPw: "密碼不對。",
        bad: "金鑰無效或已過期。",
        nf: "這把金鑰讀不到管理頁（權限不對，或還沒產生過）。",
        net: "連不上 GitHub，稍後再試。",
        old: "這個瀏覽器太舊，無法解密。",
        back: "← 回公開網站",
      }
    : {
        title: "Admin",
        leadPw: "Enter the admin password.",
        leadTk: "Paste a GitHub token that can read the private repo.",
        labelPw: "Password",
        labelTk: "GitHub token (fine-grained)",
        how: "First time: create a token",
        steps: `Repository access → Only select repositories → ${repo ?? ""}; Permissions → Contents: Read-only.`,
        remember: "Remember me on this device",
        go: "Open",
        loading: "Unlocking…",
        badPw: "Wrong password.",
        bad: "Token is invalid or expired.",
        nf: "This token can't read the admin page (wrong access, or it hasn't been generated yet).",
        net: "Can't reach GitHub, try again later.",
        old: "This browser is too old to decrypt the page.",
        back: "← Public site",
      };
}

function shell(lang: string, title: string, body: string, script: string): string {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<style>
:root{color-scheme:dark;--bg:#07080d;--card:#0f1118;--fg:#e8edf2;--muted:#8b929c;--line:rgba(255,255,255,.1);--accent:#22d3ee}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:radial-gradient(800px 500px at 50% 0%,rgba(34,211,238,.12),transparent 70%),var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Segoe UI","Noto Sans TC",sans-serif}
.box{width:min(400px,100%);padding:28px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:0 30px 80px -30px rgba(0,0,0,.8)}
.box[hidden]{display:none}
h1{margin:0 0 8px;font-size:1.4rem}
p{margin:0 0 16px;color:var(--muted);font-size:.9rem}
label{display:block;font-size:.8rem;color:var(--muted);margin-bottom:6px}
input[type=password]{width:100%;padding:11px 12px;border-radius:10px;border:1px solid var(--line);background:#07080d;color:var(--fg);font:14px ui-monospace,monospace}
input[type=password]:focus{outline:2px solid var(--accent);border-color:transparent}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}
.row label{display:flex;align-items:center;gap:6px;margin:0}
button{padding:10px 18px;border:0;border-radius:10px;background:linear-gradient(135deg,#22d3ee,#a855f7);color:#05060a;font-weight:700;cursor:pointer}
button:disabled{opacity:.6;cursor:wait}
.err{min-height:1.4em;margin:12px 0 0;color:#f87171;font-size:.85rem}
details{margin-top:14px;font-size:.84rem;color:var(--muted)}
summary{cursor:pointer;color:var(--fg)}
a{color:var(--accent)}
.back{display:inline-block;margin-top:18px;font-size:.84rem}
</style>
</head>
<body>
${body}
<script>
${script}
</script>
</body>
</html>
`;
}

function form(t: ReturnType<typeof texts>, lead: string, label: string, extra = ""): string {
  return `<form class="box" id="f">
<h1>🔒 ${esc(t.title)}</h1>
<p>${esc(lead)}</p>
<label for="pw">${esc(label)}</label>
<input id="pw" type="password" autocomplete="current-password" spellcheck="false" required autofocus>
<div class="row"><label><input type="checkbox" id="rm" checked> ${esc(t.remember)}</label><button id="go">${esc(t.go)}</button></div>
<div class="err" id="err" role="alert"></div>
${extra}
<a class="back" href="./">${esc(t.back)}</a>
</form>`;
}

/** Shared client helpers: storage + replacing the page with the unlocked HTML. */
const CLIENT_COMMON = `
  var f = document.getElementById("f"), pw = document.getElementById("pw"), rm = document.getElementById("rm"), err = document.getElementById("err"), go = document.getElementById("go");
  function get() { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function remembered() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function forget() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {} }
  function keep(v, remember) { try { forget(); (remember ? localStorage : sessionStorage).setItem(KEY, v); } catch (e) {} }
  function busy(on) { go.disabled = on; go.textContent = on ? T.loading : T.go; }
  function show(html) { document.open(); document.write(html); document.close(); }
  function fail(msg) { err.textContent = msg; busy(false); f.hidden = false; pw.focus(); }
`;

/**
 * Admin page for a single public repo: the whole admin build, gzipped and encrypted with
 * AES-256-GCM under a PBKDF2-SHA256 key from the password. Without the password the file is noise.
 * The salt is fixed per site so "remember me" can store the derived key (never the password).
 */
export function renderAdminLocked(config: Config, adminHtml: string, password: string, owner: string): string {
  const zh = config.language === "zh-TW";
  const t = texts(zh);
  const salt = createHash("sha256").update(`repofolio-admin|${owner}|${config.admin.page}`).digest().subarray(0, 16);
  const key = pbkdf2Sync(password, salt, ADMIN_KDF_ITERATIONS, 32, "sha256");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(gzipSync(Buffer.from(adminHtml, "utf8"), { level: 9 })), cipher.final(), cipher.getAuthTag()]);
  const payload = { s: salt.toString("base64"), i: iv.toString("base64"), n: ADMIN_KDF_ITERATIONS, d: data.toString("base64") };
  const script = `(function () {
  var P = ${JSON.stringify(payload)}, KEY = ${JSON.stringify(`${STORE_PREFIX}:${config.admin.page}`)}, T = ${JSON.stringify({ loading: t.loading, go: t.go, badPw: t.badPw, old: t.old })};
${CLIENT_COMMON}
  var b64 = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
  var toB64 = function (u) { var s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  if (!window.crypto || !crypto.subtle || !window.DecompressionStream) { err.textContent = T.old; go.disabled = true; return; }
  function derive(p) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(p), "PBKDF2", false, ["deriveBits"])
      .then(function (k) { return crypto.subtle.deriveBits({ name: "PBKDF2", salt: b64(P.s), iterations: P.n, hash: "SHA-256" }, k, 256); })
      .then(function (bits) { return new Uint8Array(bits); });
  }
  function open(raw) {
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"])
      .then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(P.i) }, k, b64(P.d)); })
      .then(function (buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); });
  }
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var p = pw.value; if (!p) return;
    busy(true); err.textContent = "";
    derive(p).then(function (raw) {
      return open(raw).then(function (html) { keep(toB64(raw), rm.checked); show(html); });
    }).catch(function () { pw.value = ""; fail(T.badPw); });
  });
  var saved = get();
  if (saved) {
    f.hidden = true;
    open(b64(saved)).then(show).catch(function () { forget(); fail(""); });
  }
})();`;
  return shell(config.language, `🔒 ${t.title}`, form(t, t.leadPw, t.labelPw), script);
}

/**
 * repo mode: public login page with no data in it. It fetches admin.html from the private repo
 * with a GitHub token the owner pastes once; without read access GitHub returns 404.
 */
export function renderAdminLogin(config: Config, repo: string): string {
  const zh = config.language === "zh-TW";
  const t = texts(zh, repo);
  const api = `https://api.github.com/repos/${repo}/contents/${config.admin.path.replace(/^\/+/, "")}`;
  const extra = `<details><summary>${esc(t.how)}</summary><p style="margin:8px 0 0"><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a><br>${esc(t.steps)}</p></details>`;
  const script = `(function () {
  var API = ${JSON.stringify(api)}, KEY = ${JSON.stringify(`${STORE_PREFIX}-token`)}, T = ${JSON.stringify({ bad: t.bad, nf: t.nf, net: t.net, loading: t.loading, go: t.go })};
${CLIENT_COMMON}
  function load(token, remember) {
    busy(true); err.textContent = "";
    fetch(API, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store" })
      .then(function (r) { if (!r.ok) { var e = new Error(r.status === 401 ? T.bad : T.nf); e.status = r.status; throw e; } return r.text(); })
      .then(function (html) { keep(token, remember); show(html); })
      .catch(function (e) { if (e.status) forget(); fail(e.status ? e.message : T.net); });
  }
  f.addEventListener("submit", function (e) { e.preventDefault(); var v = pw.value.trim(); if (v) load(v, rm.checked); });
  var s = get();
  if (s) { f.hidden = true; load(s, remembered()); }
})();`;
  return shell(config.language, `🔒 ${t.title}`, form(t, t.leadTk, t.labelTk, extra), script);
}
