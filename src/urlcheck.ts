import type { UrlCheck } from "./types.js";

/** Check whether a URL answers. 2xx/3xx = ok; 401/403 count as "up" (auth-walled). */
export async function checkUrl(url: string, timeoutMs = 10_000, fetchImpl: typeof fetch = fetch): Promise<UrlCheck> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "repofolio-uptime-check" },
    });
    // Don't download big bodies.
    await res.body?.cancel().catch(() => {});
    const ok = res.status < 400 || res.status === 401 || res.status === 403;
    return { ok, status: res.status, ms: Date.now() - started, checkedAt };
  } catch (e) {
    const err = e as Error;
    return { ok: false, error: err.name === "AbortError" ? "timeout" : (err.cause as Error | undefined)?.message ?? err.message, ms: Date.now() - started, checkedAt };
  } finally {
    clearTimeout(timer);
  }
}

/** Run async jobs with a concurrency cap. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}
