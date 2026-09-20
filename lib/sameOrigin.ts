/**
 * Lightweight CSRF defense for hand-rolled Route Handlers (Server Actions get this for free
 * from Next.js itself; plain `app/api/*` routes don't). This app has no auth by design — it's
 * explicitly single-user, local-only software (see README "Security notes") — but a browser
 * tab open on a malicious site can still fire a cross-origin POST at
 * http://localhost:3000/api/... while the dev/prod server is running. Browsers attach an
 * `Origin` header to every cross-origin state-changing request (and to same-origin ones too),
 * so rejecting a mismatched Origin blocks that without requiring any login or token.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // no Origin header at all => not a browser cross-site request
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
