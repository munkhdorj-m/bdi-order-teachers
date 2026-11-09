import { getCatalog } from "@/lib/server/catalog";
import { listMyOrders, type Order } from "@/lib/server/orders";
import { getTeacher } from "@/lib/server/session";
import { CLOSED_DEFAULT, getSettings } from "@/lib/server/settings";
import { ShopView } from "./shop-view";

/** What this person ordered before, most often first (ties: most recent), like the BDI catalog. */
function usualProductIds(orders: Order[]): string[] {
  const stats = new Map<string, { n: number; rank: number }>();
  orders
    .filter((o) => o.status !== "cancelled")
    .slice(0, 30)
    .forEach((o, rank) => {
      for (const id of new Set(o.items.map((i) => i.product_id).filter((x): x is string => !!x))) {
        const s = stats.get(id);
        if (s) s.n++;
        else stats.set(id, { n: 1, rank });
      }
    });
  return [...stats.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[1].rank - b[1].rank)
    .slice(0, 12)
    .map(([id]) => id);
}

/** Open to everyone: signing in is only needed to order. */
export default async function ShopPage() {
  const me = await getTeacher();
  const [{ products, categories }, settings, orders] = await Promise.all([
    getCatalog(),
    getSettings(),
    me ? listMyOrders(me.id) : Promise.resolve([]),
  ]);
  return (
    <ShopView
      products={products}
      categories={categories}
      usualIds={usualProductIds(orders)}
      closedMessage={settings.open ? null : settings.closed_message || CLOSED_DEFAULT}
    />
  );
}
