import { NextRequest, NextResponse } from "next/server";

/**
 * Thin proxy to the InsForge backend for everything under /api/*.
 *
 * Why: the InsForge SDK keeps its session in an HttpOnly refresh cookie set
 * with Secure + SameSite=None. When the browser talks to the backend directly
 * from a different origin over plain http, that cookie is not stored/sent
 * reliably, so the session dies on every page load. By proxying through the
 * app origin the cookie becomes same-origin, and we strip Secure / relax
 * SameSite for the plain-http dev case.
 *
 * The proxy also normalizes the refresh cookie: stale duplicates accumulated
 * from earlier direct-API calls (cookies are shared across ports on
 * localhost) make the backend's CSRF nonce check fail on reload, killing the
 * session. We purge every scoped variant and reissue exactly one fresh cookie
 * per session response.
 *
 * ponytail: only handles http(s) requests, not WebSockets (InsForge realtime
 * is unused so far — add a ws upgrade handler when realtime lands).
 */
export async function handler(req: NextRequest) {
  const target = `${process.env.INSFORGE_API_URL ?? "http://localhost:7130"}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  // Strip hop-by-hop headers that must not cross the proxy.
  for (const h of ["connection", "keep-alive", "transfer-encoding", "upgrade"]) {
    responseHeaders.delete(h);
  }

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    responseHeaders.delete("set-cookie");
    const normalized: string[] = [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const [name] = pair.split("=");
      // Refresh token: purge stale duplicates, reissue exactly one fresh
      // cookie scoped to /api/auth. Other cookies pass through cleaned.
      if (name === "insforge_refresh_token") {
        normalized.push(
          ...deleteCookies("insforge_refresh_token"),
          `${pair}; Path=/api/auth; Max-Age=604800; HttpOnly; SameSite=Lax`,
        );
        continue;
      }
      normalized.push(cleanCookie(raw));
    }
    for (const c of normalized) responseHeaders.append("set-cookie", c);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** Re-scope a cookie so it stores on the plain-http app origin. */
function cleanCookie(raw: string): string {
  const parts = raw.split(";").map((p) => p.trim());
  return parts
    .filter((p) => !/^secure$/i.test(p) && !/^domain=/i.test(p) && !/^expires=/i.test(p))
    .map((p) => (/^samesite=/i.test(p) ? "SameSite=Lax" : p))
    .join("; ");
}

/** Deletion cookies covering every scope/attribute combo a stale refresh token could occupy. */
function deleteCookies(name: string): string[] {
  const scopes: Array<[string, string]> = [
    ["/api/auth", ""],
    ["/", ""],
    ["/api/auth", "Domain=localhost"],
    ["/", "Domain=localhost"],
  ];
  const attrs = ["", "Secure", "SameSite=None", "Secure; SameSite=None"];
  const out: string[] = [];
  for (const [path, domain] of scopes) {
    for (const attr of attrs) {
      out.push(`${name}=; Path=${path}${domain ? "; " + domain : ""}; Max-Age=0; HttpOnly${attr ? "; " + attr : ""}`);
    }
  }
  return out;
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };