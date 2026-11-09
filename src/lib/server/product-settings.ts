import "server-only";
import { cache } from "react";
import { db } from "./supabase";

/**
 * The admin's own product settings (sql/04-product-settings.sql): hide a
 * product, or give it another name, price or description for this shop.
 * BDI's products table is never touched.
 */
export type ProductSetting = {
  hidden: boolean;
  name: string | null;
  price: number | null;
  description: string | null;
};

type Row = {
  product_id: string;
  hidden: boolean;
  name: string | null;
  price: number | string | null;
  description: string | null;
};

/** The table isn't there yet (sql/04 not run): the shop works as before. */
function missingTable(e: { code?: string; message?: string }): boolean {
  return e.code === "42P01" || e.code === "PGRST205" || /schema cache|does not exist/i.test(e.message ?? "");
}

/** Every setting by product id. `ready` is false until sql/04 has been run. */
export const getProductSettings = cache(async (): Promise<{ map: Map<string, ProductSetting>; ready: boolean }> => {
  const { data, error } = await db().from("teacher_products").select("product_id, hidden, name, price, description");
  if (error) {
    if (missingTable(error)) return { map: new Map(), ready: false };
    throw new Error(error.message);
  }
  const map = new Map<string, ProductSetting>();
  for (const r of (data ?? []) as Row[]) {
    map.set(r.product_id, {
      hidden: !!r.hidden,
      name: r.name?.trim() || null,
      price: r.price == null ? null : Number(r.price),
      description: r.description?.trim() || null,
    });
  }
  return { map, ready: true };
});

/** Save one product's settings; a row with nothing set is removed. */
export async function saveProductSetting(productId: string, s: ProductSetting): Promise<boolean> {
  const nothingSet = !s.hidden && !s.name && s.price == null && !s.description;
  const { error } = nothingSet
    ? await db().from("teacher_products").delete().eq("product_id", productId)
    : await db()
        .from("teacher_products")
        .upsert(
          { product_id: productId, ...s, updated_at: new Date().toISOString() },
          { onConflict: "product_id" },
        );
  if (error) console.error("saveProductSetting:", error.message);
  return !error;
}
