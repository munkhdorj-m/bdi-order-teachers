import "server-only";
import { db } from "./supabase";
import { fetchAll } from "./fetch-all";
import { getProductStates } from "./catalog";
import { CLOSED_DEFAULT, getSettings } from "./settings";
import { sendTelegram } from "./telegram";
import { formatMnt, formatPhone } from "@/lib/format";
import { dbStatuses, normalizeStatus, type OrderStatus } from "@/lib/order-status";
import { isUuid } from "@/lib/uuid";

/**
 * Every order read and write. Buyers can't touch the database at all
 * (RLS, no policies); this server code checks who is asking, and the
 * database function teacher_place_order prices every line itself, so
 * prices, totals and status never come from the phone.
 */

export type OrderItem = {
  product_id: string | null;
  name: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  note: string | null;
  created_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  items: OrderItem[];
};

export type AdminOrder = Order & { account: { id: string; full_name: string; phone: string } };

const GENERIC = "Алдаа гарлаа. Дахин оролдоно уу";

const ORDER_COLS =
  "id, order_number, status, total, note, created_at, paid_at, cancelled_at, " +
  "items:teacher_order_items(product_id, name, image_url, qty, unit_price, line_total)";

type RawItem = Omit<OrderItem, "qty" | "unit_price" | "line_total"> & {
  qty: number | string;
  unit_price: number | string;
  line_total: number | string;
};
type RawOrder = Omit<Order, "status" | "total" | "items"> & {
  status: string;
  total: number | string;
  items: RawItem[] | null;
};

function toOrder(r: RawOrder): Order {
  return {
    ...r,
    status: normalizeStatus(r.status),
    total: Number(r.total),
    items: (r.items ?? [])
      .map((i) => ({ ...i, qty: Number(i.qty), unit_price: Number(i.unit_price), line_total: Number(i.line_total) }))
      .sort((a, b) => a.name.localeCompare(b.name, "mn")),
  };
}

// ---- The buyer's own orders ------------------------------------------

export async function listMyOrders(accountId: string): Promise<Order[]> {
  const { data, error } = await db()
    .from("teacher_orders")
    .select(ORDER_COLS)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as unknown as RawOrder[]).map(toOrder);
}

export async function getMyOrder(accountId: string, orderId: string): Promise<Order | null> {
  if (!isUuid(orderId)) return null;
  const { data, error } = await db()
    .from("teacher_orders")
    .select(ORDER_COLS)
    .eq("id", orderId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOrder(data as unknown as RawOrder) : null;
}

export type PlaceResult = { ok: true; orderId: string; duplicate: boolean } | { ok: false; error: string };

function parseItems(v: unknown): { product_id: string; qty: number }[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 100) return null;
  const merged = new Map<string, number>();
  for (const it of v) {
    const id = (it as { product_id?: unknown } | null)?.product_id;
    const qty = Number((it as { qty?: unknown } | null)?.qty);
    if (!isUuid(id) || !Number.isInteger(qty) || qty < 1 || qty > 999) return null;
    const key = id.toLowerCase();
    merged.set(key, Math.min(999, (merged.get(key) ?? 0) + qty));
  }
  return [...merged].map(([product_id, qty]) => ({ product_id, qty }));
}

/**
 * Place an order. `requestId` (a UUID the phone makes once per checkout)
 * becomes the order id, so a checkout re-sent after a dropped connection
 * returns the same order instead of a second one.
 */
export async function placeOrder(
  accountId: string,
  input: { requestId: unknown; items: unknown; note: unknown },
): Promise<PlaceResult> {
  if (!isUuid(input.requestId)) return { ok: false, error: GENERIC };
  const items = parseItems(input.items);
  if (!items) return { ok: false, error: "Сагс хоосон байна" };
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : "";

  const settings = await getSettings();
  if (!settings.open) return { ok: false, error: settings.closed_message || CLOSED_DEFAULT };

  const states = await getProductStates(items.map((i) => i.product_id));
  const blocked = items.filter((i) => !states.get(i.product_id)?.orderable);
  if (blocked.length > 0) {
    const names = blocked.map((i) => states.get(i.product_id)?.name).filter(Boolean);
    return { ok: false, error: names.length ? `Дууссан: ${names.join(", ")}` : "Зарим бараа дууссан байна" };
  }

  const { data, error } = await db().rpc("teacher_place_order", {
    p_order_id: input.requestId.toLowerCase(),
    p_account_id: accountId,
    p_items: items,
    p_note: note,
  });
  if (error) {
    if (error.message.includes("shop_closed")) return { ok: false, error: settings.closed_message || CLOSED_DEFAULT };
    if (error.message.includes("items_unavailable")) return { ok: false, error: "Зарим бараа дууссан байна" };
    console.error("teacher_place_order failed:", error.message);
    return { ok: false, error: GENERIC };
  }
  const row = (data as { order_id: string; order_number: string; duplicate: boolean }[] | null)?.[0];
  if (!row) return { ok: false, error: GENERIC };
  return { ok: true, orderId: row.order_id, duplicate: row.duplicate };
}

/** The buyer cancels their own order while it is still unpaid. */
export async function cancelMyOrder(
  accountId: string,
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(orderId)) return { ok: false, error: "Захиалга олдсонгүй" };
  const { data, error } = await db()
    .from("teacher_orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("account_id", accountId)
    .eq("status", "new")
    .select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data?.length) return { ok: false, error: "Төлсөн захиалгыг цуцлах боломжгүй" };
  return { ok: true };
}

// ---- Admin ---------------------------------------------------------------

type RawAdminOrder = RawOrder & { account: AdminOrder["account"] | null };

/** Orders with their buyer; optionally only some statuses / since a moment. */
export async function listOrdersAdmin(statuses: OrderStatus[] | null, sinceIso?: string): Promise<AdminOrder[]> {
  const rows = await fetchAll<RawAdminOrder>(
    () => {
      let q = db()
        .from("teacher_orders")
        .select(`${ORDER_COLS}, account:teacher_accounts(id, full_name, phone)`)
        .order("created_at", { ascending: false })
        .order("id");
      if (statuses) q = q.in("status", dbStatuses(statuses));
      if (sinceIso) q = q.gte("created_at", sinceIso);
      return q;
    },
    { maxPages: 10 },
  );
  return rows.map((r) => ({
    ...toOrder(r),
    account: r.account ?? { id: "", full_name: "?", phone: "" },
  }));
}

export async function orderCounts(): Promise<Record<OrderStatus, number>> {
  const rows = await fetchAll<{ status: string }>(() => db().from("teacher_orders").select("status").order("id"));
  const out: Record<OrderStatus, number> = { new: 0, paid: 0, cancelled: 0 };
  for (const r of rows) out[normalizeStatus(r.status)]++;
  return out;
}

export type AdminMove = "pay" | "unpay" | "cancel";

export const ADMIN_MOVES: AdminMove[] = ["pay", "unpay", "cancel"];

/** Status changes the admin can make, each only from the right state. */
export async function moveOrder(orderId: string, move: AdminMove): Promise<boolean> {
  if (!isUuid(orderId)) return false;
  const now = new Date().toISOString();
  const moves: Record<AdminMove, { from: OrderStatus; set: Record<string, string | null> }> = {
    pay: { from: "new", set: { status: "paid", paid_at: now } },
    unpay: { from: "paid", set: { status: "new", paid_at: null, handed_at: null } },
    cancel: { from: "new", set: { status: "cancelled", cancelled_at: now } },
  };
  const m = moves[move];
  if (!m) return false;
  const { data, error } = await db()
    .from("teacher_orders")
    .update(m.set)
    .eq("id", orderId)
    .in("status", dbStatuses([m.from]))
    .select("id");
  return !error && !!data?.length;
}

// ---- Telegram ------------------------------------------------------------

type NotifyRow = {
  order_number: string;
  total: number | string;
  note: string | null;
  account: { full_name: string; phone: string } | null;
  items: { name: string; qty: number }[] | null;
};

async function loadForNotify(orderId: string): Promise<NotifyRow | null> {
  const { data } = await db()
    .from("teacher_orders")
    .select("order_number, total, note, account:teacher_accounts(full_name, phone), items:teacher_order_items(name, qty)")
    .eq("id", orderId)
    .maybeSingle();
  return (data as unknown as NotifyRow | null) ?? null;
}

function who(o: NotifyRow): string {
  return o.account ? `${o.account.full_name} · ${formatPhone(o.account.phone)}` : "";
}

export async function notifyNewOrder(orderId: string): Promise<void> {
  const o = await loadForNotify(orderId);
  if (!o) return;
  await sendTelegram({
    title: `🛒 Шинэ захиалга ${o.order_number}`,
    lines: [
      who(o),
      ...(o.items ?? []).map((i) => `• ${i.name} × ${i.qty}`),
      `Нийт: ${formatMnt(Number(o.total))}`,
      ...(o.note ? [`Тэмдэглэл: ${o.note}`] : []),
    ],
    href: `/admin?q=${encodeURIComponent(o.order_number)}`,
  });
}

export async function notifyCancelled(orderId: string): Promise<void> {
  const o = await loadForNotify(orderId);
  if (!o) return;
  await sendTelegram({ title: `❌ Цуцалсан ${o.order_number}`, lines: [who(o), `Нийт: ${formatMnt(Number(o.total))}`] });
}
