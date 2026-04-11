/**
 * Canonical public origin for the current request (OAuth callbacks, redirects).
 * Prefer forwarded headers from proxies (e.g. Vercel) over URL host.
 */
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    forwardedHost?.split(",")[0]?.trim() ??
    request.headers.get("host") ??
    url.host;
  const proto =
    forwardedProto?.split(",")[0]?.trim() ??
    (url.protocol === "https:" ? "https" : "http");
  return `${proto}://${host}`;
}
