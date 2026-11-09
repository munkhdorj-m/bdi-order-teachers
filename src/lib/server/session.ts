import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { loginHref } from "@/lib/next-path";
import { db } from "./supabase";

/**
 * Sign-in sessions: the cookie holds a random token; the database keeps
 * only its sha256. The database row decides how long a session lives
 * (180 days, extended while in use); the cookie itself just lasts as long
 * as browsers allow.
 */

const COOKIE = "bdi_shop_session";
const DAY = 24 * 60 * 60 * 1000;
const SESSION_DAYS = 180;
const EXTEND_WHEN_DAYS_LEFT = 30;
const COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60;

export type Teacher = {
  id: string;
  phone: string;
  full_name: string;
  is_admin: boolean;
};

function sha256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function currentTokenHash(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length < 40 || token.length > 64) return null;
  return sha256(token);
}

type SessionRow = {
  expires_at: string;
  account: (Teacher & { active: boolean }) | null;
};

/** Who is signed in on this request, or null. Cached per request. */
export const getTeacher = cache(async (): Promise<Teacher | null> => {
  const tokenHash = await currentTokenHash();
  if (!tokenHash) return null;
  const { data, error } = await db()
    .from("teacher_sessions")
    .select("expires_at, account:teacher_accounts(id, phone, full_name, is_admin, active)")
    .eq("token_hash", tokenHash)
    .maybeSingle<SessionRow>();
  if (error) throw new Error(error.message);
  if (!data?.account || !data.account.active) return null;

  const expires = new Date(data.expires_at).getTime();
  const now = Date.now();
  if (expires <= now) {
    await db().from("teacher_sessions").delete().eq("token_hash", tokenHash);
    return null;
  }
  if (expires - now < EXTEND_WHEN_DAYS_LEFT * DAY) {
    await db()
      .from("teacher_sessions")
      .update({ expires_at: new Date(now + SESSION_DAYS * DAY).toISOString() })
      .eq("token_hash", tokenHash);
  }
  const { id, phone, full_name, is_admin } = data.account;
  return { id, phone, full_name, is_admin };
});

/** The signed-in person, or off to /login (and back to `next` afterwards). */
export async function requireTeacher(next?: string): Promise<Teacher> {
  const t = await getTeacher();
  if (!t) redirect(loginHref(next ?? "/"));
  return t;
}

/** A signed-in admin, or away. Use in every admin page AND action. */
export async function requireAdmin(): Promise<Teacher> {
  const t = await requireTeacher("/admin");
  if (!t.is_admin) redirect("/");
  return t;
}

/** Start a session (server actions only: it sets a cookie). */
export async function createSession(accountId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await db()
    .from("teacher_sessions")
    .insert({
      token_hash: sha256(token),
      account_id: accountId,
      expires_at: new Date(Date.now() + SESSION_DAYS * DAY).toISOString(),
    });
  if (error) throw new Error(error.message);
  // Tidy up this account's expired sessions while we're here.
  await db().from("teacher_sessions").delete().eq("account_id", accountId).lt("expires_at", new Date().toISOString());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
}

/** Sign out on this phone (server actions only). */
export async function destroySession(): Promise<void> {
  const tokenHash = await currentTokenHash();
  if (tokenHash) await db().from("teacher_sessions").delete().eq("token_hash", tokenHash);
  (await cookies()).delete(COOKIE);
}

/** Sign out on every other phone (after a PIN change). */
export async function destroyOtherSessions(accountId: string): Promise<void> {
  const tokenHash = await currentTokenHash();
  let q = db().from("teacher_sessions").delete().eq("account_id", accountId);
  if (tokenHash) q = q.neq("token_hash", tokenHash);
  await q;
}

/** Sign an account out everywhere (PIN reset, blocked). */
export async function destroyAllSessions(accountId: string): Promise<void> {
  await db().from("teacher_sessions").delete().eq("account_id", accountId);
}
