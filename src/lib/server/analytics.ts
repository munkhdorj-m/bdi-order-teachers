import "server-only";
import { db } from "./supabase";
import { listOrdersAdmin, type AdminOrder } from "./orders";
import { lastUbDays, shiftDay, ubDayKey, ubDayStartIso } from "@/lib/ub-date";

/**
 * Numbers for the admin's Аналитик page, as on BDI: totals for the chosen
 * window compared with the window before it, sales per day, and the top
 * products, buyers and categories. Cancelled orders never count as sales.
 */

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export type DayPoint = { key: string; paid: number; unpaid: number; orders: number };
export type Totals = { revenue: number; orders: number; avg: number; buyers: number };
export type RankRow = { key: string; name: string; qty: number; revenue: number };
export type BuyerRow = { id: string; name: string; phone: string; orders: number; total: number; unpaid: number };
export type CategoryRow = { key: string; name: string; icon: string | null; qty: number; revenue: number };

export type Analytics = {
  days: AnalyticsPeriod;
  from: string;
  to: string;
  now: Totals;
  prev: Totals;
  paid: { amount: number; count: number };
  unpaid: { amount: number; count: number };
  cancelled: number;
  daily: DayPoint[];
  topProducts: RankRow[];
  topBuyers: BuyerRow[];
  categories: CategoryRow[];
};

const TOP = 8;

function totals(orders: AdminOrder[]): Totals {
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  return {
    revenue,
    orders: orders.length,
    avg: orders.length ? revenue / orders.length : 0,
    buyers: new Set(orders.map((o) => o.account.id)).size,
  };
}

/** product_id → category_id, in chunks so the query string stays short. */
async function categoryOfProducts(ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db().from("products").select("id, category_id").in("id", ids.slice(i, i + 100));
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as { id: string; category_id: string | null }[]) out.set(r.id, r.category_id);
  }
  return out;
}

export async function getAnalytics(days: AnalyticsPeriod): Promise<Analytics> {
  const keys = lastUbDays(days);
  const startKey = keys[0];
  const prevStartKey = shiftDay(startKey, -days);
  const start = Date.parse(ubDayStartIso(startKey));

  const all = await listOrdersAdmin(null, ubDayStartIso(prevStartKey));
  const inWindow = all.filter((o) => Date.parse(o.created_at) >= start);
  const before = all.filter((o) => Date.parse(o.created_at) < start);
  const live = inWindow.filter((o) => o.status !== "cancelled");

  // Sales per day (Ulaanbaatar days), split into paid and unpaid.
  const byDay = new Map<string, DayPoint>(keys.map((k) => [k, { key: k, paid: 0, unpaid: 0, orders: 0 }]));
  for (const o of live) {
    const d = byDay.get(ubDayKey(o.created_at));
    if (!d) continue;
    d.orders++;
    if (o.status === "paid") d.paid += o.total;
    else d.unpaid += o.total;
  }

  // Products, by pieces.
  const products = new Map<string, RankRow & { productId: string | null }>();
  for (const o of live) {
    for (const it of o.items) {
      const key = it.product_id ?? `name:${it.name}`;
      const row = products.get(key) ?? { key, name: it.name, qty: 0, revenue: 0, productId: it.product_id };
      row.qty += it.qty;
      row.revenue += it.line_total;
      products.set(key, row);
    }
  }

  // Buyers, by money spent.
  const buyers = new Map<string, BuyerRow>();
  for (const o of live) {
    const a = o.account;
    const row = buyers.get(a.id) ?? { id: a.id, name: a.full_name, phone: a.phone, orders: 0, total: 0, unpaid: 0 };
    row.orders++;
    row.total += o.total;
    if (o.status === "new") row.unpaid += o.total;
    buyers.set(a.id, row);
  }

  // Categories, from the products' current category in BDI's catalog.
  const ids = [...new Set([...products.values()].map((p) => p.productId).filter((x): x is string => !!x))];
  const [catOf, cats] = await Promise.all([
    categoryOfProducts(ids),
    db().from("categories").select("id, name, icon"),
  ]);
  if (cats.error) throw new Error(cats.error.message);
  const catById = new Map(((cats.data ?? []) as { id: string; name: string; icon: string | null }[]).map((c) => [c.id, c]));
  const byCat = new Map<string, CategoryRow>();
  for (const p of products.values()) {
    const cat = p.productId ? catById.get(catOf.get(p.productId) ?? "") : undefined;
    const key = cat?.id ?? "other";
    const row = byCat.get(key) ?? { key, name: cat?.name ?? "Бусад", icon: cat?.icon ?? "other", qty: 0, revenue: 0 };
    row.qty += p.qty;
    row.revenue += p.revenue;
    byCat.set(key, row);
  }

  const paid = live.filter((o) => o.status === "paid");
  const unpaid = live.filter((o) => o.status === "new");

  return {
    days,
    from: startKey,
    to: keys[keys.length - 1],
    now: totals(live),
    prev: totals(before.filter((o) => o.status !== "cancelled")),
    paid: { amount: paid.reduce((s, o) => s + o.total, 0), count: paid.length },
    unpaid: { amount: unpaid.reduce((s, o) => s + o.total, 0), count: unpaid.length },
    cancelled: inWindow.length - live.length,
    daily: keys.map((k) => byDay.get(k)!),
    topProducts: [...products.values()]
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, TOP)
      .map(({ key, name, qty, revenue }) => ({ key, name, qty, revenue })),
    topBuyers: [...buyers.values()].sort((a, b) => b.total - a.total).slice(0, TOP),
    categories: [...byCat.values()].sort((a, b) => b.revenue - a.revenue).slice(0, TOP),
  };
}
