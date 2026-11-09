/**
 * Where to go after signing in. Only plain paths on this site, so a link
 * like /login?next=//evil.example can never send anyone elsewhere.
 */
const SAFE_PATH = /^\/(?!\/)[\w\-./?=&%]*$/;

export function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  const p = raw.trim().slice(0, 300);
  return SAFE_PATH.test(p) && !p.startsWith("/login") ? p : "/";
}

/** The login page, coming back to `next` afterwards. */
export function loginHref(next: string): string {
  const n = safeNext(next);
  return n === "/" ? "/login" : `/login?next=${encodeURIComponent(n)}`;
}
