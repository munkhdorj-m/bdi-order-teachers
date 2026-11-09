import "server-only";
import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { db } from "./supabase";

/**
 * The admin's own product settings (sql/04 + sql/05): hide a product, mark
 * it available / sold out, or give it another name, price or description
 * for this shop. BDI's products table is never touched.
 */
export type ProductSetting = {
  hidden: boolean;
  name: string | null;
  price: number | null;
  description: string | null;
  /** null = follow BDI's stock; true = sold out; false = available anyway. */
  soldOut: boolean | null;
};

type Row = {
  product_id: string;
  hidden: boolean;
  name: string | null;
  price: number | string | null;
  description: string | null;
  sold_out?: boolean | null;
};

const BASE_COLS = "product_id, hidden, name, price, description";

/** The table isn't there yet (sql/04 not run): the shop works as before. */
function missingTable(e: PostgrestError): boolean {
  return e.code === "42P01" || e.code === "PGRST205" || /schema cache|does not exist/i.test(e.message ?? "");
}

/** The sold_out column isn't there yet (sql/05 not run). */
function missingSoldOut(e: PostgrestError): boolean {
  return e.code === "42703" || e.code === "PGRST204" || /sold_out/.test(e.message ?? "");
}

async function fetchRows(cols: string): Promise<{ data: Row[] | null; error: PostgrestError | null }> {
  const { data, error } = await db().from("teacher_products").select(cols);
  return { data: (data as unknown as Row[] | null) ?? null, error };
}

/**
 * Every setting by product id. `ready`: sql/04 has been run; `soldOutReady`:
 * sql/05 too. Either missing just means fewer settings, never an error.
 */
export const getProductSettings = cache(
  async (): Promise<{ map: Map<string, ProductSetting>; ready: boolean; soldOutReady: boolean }> => {
    let soldOutReady = true;
    let res = await fetchRows(`${BASE_COLS}, sold_out`);
    if (res.error && missingSoldOut(res.error)) {
      soldOutReady = false;
      res = await fetchRows(BASE_COLS);
    }
    if (res.error) {
      if (missingTable(res.error)) return { map: new Map(), ready: false, soldOutReady: false };
      throw new Error(res.error.message);
    }
    const map = new Map<string, ProductSetting>();
    for (const r of res.data ?? []) {
      map.set(r.product_id, {
        hidden: !!r.hidden,
        name: r.name?.trim() || null,
        price: r.price == null ? null : Number(r.price),
        description: r.description?.trim() || null,
        soldOut: typeof r.sold_out === "boolean" ? r.sold_out : null,
      });
    }
    return { map, ready: true, soldOutReady };
  },
);

/** Save one product's settings; a row with nothing set is removed. */
export async function saveProductSetting(productId: string, s: ProductSetting, withSoldOut: boolean): Promise<boolean> {
  const nothingSet = !s.hidden && !s.name && s.price == null && !s.description && s.soldOut == null;
  const { soldOut, ...rest } = s;
  const { error } = nothingSet
    ? await db().from("teacher_products").delete().eq("product_id", productId)
    : await db()
        .from("teacher_products")
        .upsert(
          {
            product_id: productId,
            ...rest,
            ...(withSoldOut ? { sold_out: soldOut } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id" },
        );
  if (error) console.error("saveProductSetting:", error.message);
  return !error;
}
