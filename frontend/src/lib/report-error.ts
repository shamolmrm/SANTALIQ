/** Send a browser error to SANTALIQ's error monitor (best effort, never throws). */
const sent = new Set<string>();
const MAX_PER_PAGE = 10;

export function reportError(err: unknown, extra: { digest?: string } = {}): void {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
    const key = `${e.name}:${e.message}`;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);
    const body = JSON.stringify({
      kind: e.name || "Error",
      message: (e.message || "Unknown error").slice(0, 2000),
      url: window.location.pathname,
      stack: (e.stack ?? "").slice(0, 8000),
      digest: extra.digest ?? "",
    });
    const url = "/api/v1/telemetry/client-error";
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else void fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {
    /* never let reporting break the page */
  }
}
