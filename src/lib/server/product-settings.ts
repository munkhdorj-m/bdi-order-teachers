import "server-only";
import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { db } from "./supabase";

/**
 * The admin's own product settings (sql/04, 05, 07): hide a product, mark it
 * available / sold out, sell it as a «багц» of N pieces, or give it another
 * name, price or description for this shop. BDI's products are never touched.
 */
export type ProductSetting = {
  hidden: boolean;
  name: string | null;
  price: number | null;
  description: string | null;
  /** null = follow BDI's stock; true = sold out; false = available anyway. */
  soldOut: boolean | null;
  /** Sold only in packs of this many pieces (null = by the piece). */
  pack: number | null;
};

type Row = {
  product_id: string;
  hidden: boolean;
  name: string | null;
  price: number | string | null;
  description: string | null;
  sold_out?: boolean | null;
  pack?: number | null;
};

/** The table isn't there yet (sql/04 not run): the shop works as before. */
function missingTable(e: PostgrestError): boolean {
  return e.code === "42P01" || e.code === "PGRST205";
}

async function hasColumn(col: string): Promise<boolean> {
  const { error } = await db().from("teacher_products").select(col).limit(0);
  return !error;
}

/**
 * Every setting by product id, and which SQL files have been run:
 * `ready` (04), `soldOutReady` (05), `packReady` (07). Missing parts just
 * mean fewer settings, never an error.
 */
export const getProductSettings = cache(
  async (): Promise<{ map: Map<string, ProductSetting>; ready: boolean; soldOutReady: boolean; packReady: boolean }> => {
    const { data, error } = await db().from("teacher_products").select("*");
    if (error) {
      if (missingTable(error) || /schema cache|does not exist/i.test(error.message ?? "")) {
        return { map: new Map(), ready: false, soldOutReady: false, packReady: false };
      }
      throw new Error(error.message);
    }
    const [soldOutReady, packReady] = await Promise.all([hasColumn("sold_out"), hasColumn("pack")]);
    const map = new Map<string, ProductSetting>();
    for (const r of (data ?? []) as Row[]) {
      map.set(r.product_id, {
        hidden: !!r.hidden,
        name: r.name?.trim() || null,
        price: r.price == null ? null : Number(r.price),
        description: r.description?.trim() || null,
        soldOut: typeof r.sold_out === "boolean" ? r.sold_out : null,
        pack: r.pack != null && Number(r.pack) > 1 ? Number(r.pack) : null,
      });
    }
    return { map, ready: true, soldOutReady, packReady };
  },
);

/** Save one product's settings; a row with nothing set is removed. */
export async function saveProductSetting(
  productId: string,
  s: ProductSetting,
  columns: { soldOut: boolean; pack: boolean },
): Promise<boolean> {
  const nothingSet = !s.hidden && !s.name && s.price == null && !s.description && s.soldOut == null && s.pack == null;
  const { soldOut, pack, ...rest } = s;
  const { error } = nothingSet
    ? await db().from("teacher_products").delete().eq("product_id", productId)
    : await db()
        .from("teacher_products")
        .upsert(
          {
            product_id: productId,
            ...rest,
            ...(columns.soldOut ? { sold_out: soldOut } : {}),
            ...(columns.pack ? { pack } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id" },
        );
  if (error) console.error("saveProductSetting:", error.message);
  return !error;
}
