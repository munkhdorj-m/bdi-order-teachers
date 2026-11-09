import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./supabase";
import { fetchAll } from "./fetch-all";
import { hashPin } from "./pin-hash";
import { destroyAllSessions } from "./session";
import { ALLOWED_EASY_PIN, pinProblem } from "@/lib/pin-rules";

/** Wrong PINs in a row before the account locks (15 min, then doubling, max 24 h). */
export const MAX_TRIES = 5;

export type AuthRow = { id: string; phone: string; pin_hash: string; active: boolean };

export async function findByPhone(phone: string): Promise<AuthRow | null> {
  const { data, error } = await db()
    .from("teacher_accounts")
    .select("id, phone, pin_hash, active")
    .eq("phone", phone)
    .maybeSingle<AuthRow>();
  if (error) throw new Error(error.message);
  return data;
}

export async function findById(id: string): Promise<AuthRow | null> {
  const { data, error } = await db()
    .from("teacher_accounts")
    .select("id, phone, pin_hash, active")
    .eq("id", id)
    .maybeSingle<AuthRow>();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Reserve one PIN try before checking it (teacher_pin_attempt is atomic,
 * so many guesses at once can't skip the limit). False = locked now.
 */
export async function reserveTry(accountId: string): Promise<boolean> {
  const { data, error } = await db().rpc("teacher_pin_attempt", { p_account: accountId });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Tries left, or minutes until the lock ends. */
export async function lockState(accountId: string): Promise<{ triesLeft: number; lockedMinutes: number | null }> {
  const { data } = await db()
    .from("teacher_accounts")
    .select("pin_attempts, locked_until")
    .eq("id", accountId)
    .maybeSingle<{ pin_attempts: number; locked_until: string | null }>();
  const until = data?.locked_until ? new Date(data.locked_until).getTime() : 0;
  if (until > Date.now()) return { triesLeft: 0, lockedMinutes: Math.ceil((until - Date.now()) / 60000) };
  return { triesLeft: Math.max(0, MAX_TRIES - (data?.pin_attempts ?? 0)), lockedMinutes: null };
}

export function lockedMessage(minutes: number): string {
  return minutes >= 60
    ? `Олон удаа буруу орууллаа. ${Math.ceil(minutes / 60)} цагийн дараа оролдоно уу`
    : `Олон удаа буруу орууллаа. ${minutes} минутын дараа оролдоно уу`;
}

/** A wrong PIN: the message to show. */
export async function wrongPinMessage(accountId: string): Promise<string> {
  const s = await lockState(accountId);
  if (s.lockedMinutes != null) return lockedMessage(s.lockedMinutes);
  return `PIN буруу. ${s.triesLeft} оролдлого үлдлээ`;
}

/** After a correct PIN: clear the counters; re-hash when asked (pepper added). */
export async function markSignedIn(accountId: string, pin: string, rehash: boolean): Promise<void> {
  const { error } = await db()
    .from("teacher_accounts")
    .update({
      pin_attempts: 0,
      lock_count: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      ...(rehash ? { pin_hash: await hashPin(pin) } : {}),
    })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
}

export async function createAccount(
  phone: string,
  fullName: string,
  pin: string,
): Promise<{ id: string } | { taken: true }> {
  const { data, error } = await db()
    .from("teacher_accounts")
    .insert({ phone, full_name: fullName, pin_hash: await hashPin(pin), last_login_at: new Date().toISOString() })
    .select("id")
    .single<{ id: string }>();
  if (error?.code === "23505") return { taken: true };
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  return { id: data.id };
}

export async function setPin(accountId: string, pin: string): Promise<void> {
  const { error } = await db()
    .from("teacher_accounts")
    .update({ pin_hash: await hashPin(pin), pin_attempts: 0, lock_count: 0, locked_until: null })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
}

// ---- Admin ---------------------------------------------------------------

export type AdminAccount = {
  id: string;
  phone: string;
  full_name: string;
  is_admin: boolean;
  active: boolean;
  locked: boolean;
  created_at: string;
  last_login_at: string | null;
  orders: number;
  total: number;
  unpaid: number;
  /** Every order, cancelled ones included (what a delete would remove). */
  allOrders: number;
};

export async function listAccounts(): Promise<AdminAccount[]> {
  type Row = Omit<AdminAccount, "locked" | "orders" | "total" | "unpaid" | "allOrders"> & { locked_until: string | null };
  const [accounts, orders] = await Promise.all([
    fetchAll<Row>(() =>
      db()
        .from("teacher_accounts")
        .select("id, phone, full_name, is_admin, active, created_at, last_login_at, locked_until")
        .order("full_name")
        .order("id"),
    ),
    fetchAll<{ account_id: string; status: string; total: number | string }>(() =>
      db().from("teacher_orders").select("account_id, status, total").order("id"),
    ),
  ]);
  const sums = new Map<string, { orders: number; total: number; unpaid: number; allOrders: number }>();
  for (const o of orders) {
    const s = sums.get(o.account_id) ?? { orders: 0, total: 0, unpaid: 0, allOrders: 0 };
    s.allOrders++;
    if (o.status !== "cancelled") {
      s.orders++;
      s.total += Number(o.total);
      if (o.status === "new") s.unpaid += Number(o.total);
    }
    sums.set(o.account_id, s);
  }
  const now = Date.now();
  return accounts.map(({ locked_until, ...a }) => ({
    ...a,
    locked: !!locked_until && new Date(locked_until).getTime() > now,
    ...(sums.get(a.id) ?? { orders: 0, total: 0, unpaid: 0, allOrders: 0 }),
  }));
}

/**
 * Delete an account with everything it owns: its orders (their lines go
 * with them) and its sign-ins. It is blocked first, which signs it out and
 * makes teacher_place_order refuse it, so no new order can land in between.
 */
export async function deleteAccount(
  accountId: string,
): Promise<{ ok: true; orders: number } | { ok: false; error: string }> {
  const GENERIC = "Алдаа гарлаа. Дахин оролдоно уу";
  if (!(await findById(accountId))) return { ok: false, error: "Олдсонгүй" };
  if (!(await setActive(accountId, false))) return { ok: false, error: GENERIC };

  let removed = 0;
  // Twice at most: an order already half-way through when the block hit
  // can still commit, and then the account delete must try again.
  for (let attempt = 0; attempt < 2; attempt++) {
    const orders = await db().from("teacher_orders").delete().eq("account_id", accountId).select("id");
    if (orders.error) return { ok: false, error: GENERIC };
    removed += orders.data?.length ?? 0;
    const del = await db().from("teacher_accounts").delete().eq("id", accountId).select("id");
    if (!del.error) return del.data?.length ? { ok: true, orders: removed } : { ok: false, error: "Олдсонгүй" };
    if (del.error.code !== "23503") return { ok: false, error: GENERIC };
  }
  return { ok: false, error: GENERIC };
}

/**
 * New random PIN (shown to the admin once), unlocks the account and signs
 * it out everywhere. The fix for a forgotten PIN, or for someone who
 * registered another person's number.
 */
export async function resetPin(accountId: string): Promise<string | null> {
  const acc = await findById(accountId);
  if (!acc) return null;
  let pin = "";
  do {
    pin = String(randomInt(0, 10000)).padStart(4, "0");
  } while (pin === ALLOWED_EASY_PIN || pinProblem(pin, acc.phone));
  await setPin(accountId, pin);
  await destroyAllSessions(accountId);
  return pin;
}

/** Block (signs out everywhere) or unblock. */
export async function setActive(accountId: string, active: boolean): Promise<boolean> {
  const { data, error } = await db().from("teacher_accounts").update({ active }).eq("id", accountId).select("id");
  if (error || !data?.length) return false;
  if (!active) await destroyAllSessions(accountId);
  return true;
}
