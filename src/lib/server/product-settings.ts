import "server-only";
import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { db } from "./supabase";
import { GIFT_SUFFIX, isGiftLine } from "@/lib/gift";

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
  /** Sale (sql/08): «-20%» and/or «2+1», until a day (null = no end). */
  salePercent: number | null;
  saleBuy: number | null;
  saleFree: number | null;
  saleUntil: string | null;
  /** English name / description (sql/09); null = the Mongolian one. */
  nameEn: string | null;
  descriptionEn: string | null;
};

type Row = {
  product_id: string;
  hidden: boolean;
  name: string | null;
  price: number | string | null;
  description: string | null;
  sold_out?: boolean | null;
  pack?: number | null;
  sale_percent?: number | null;
  sale_buy?: number | null;
  sale_free?: number | null;
  sale_until?: string | null;
  name_en?: string | null;
  description_en?: string | null;
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
  async (): Promise<{
    map: Map<string, ProductSetting>;
    ready: boolean;
    soldOutReady: boolean;
    packReady: boolean;
    saleReady: boolean;
    englishReady: boolean;
  }> => {
    const { data, error } = await db().from("teacher_products").select("*");
    if (error) {
      if (missingTable(error) || /schema cache|does not exist/i.test(error.message ?? "")) {
        return { map: new Map(), ready: false, soldOutReady: false, packReady: false, saleReady: false, englishReady: false };
      }
      throw new Error(error.message);
    }
    const [soldOutReady, packReady, saleReady, englishReady] = await Promise.all([
      hasColumn("sold_out"),
      hasColumn("pack"),
      hasColumn("sale_percent"),
      hasColumn("name_en"),
    ]);
    const map = new Map<string, ProductSetting>();
    for (const r of (data ?? []) as Row[]) {
      map.set(r.product_id, {
        hidden: !!r.hidden,
        name: r.name?.trim() || null,
        price: r.price == null ? null : Number(r.price),
        description: r.description?.trim() || null,
        soldOut: typeof r.sold_out === "boolean" ? r.sold_out : null,
        pack: r.pack != null && Number(r.pack) > 1 ? Number(r.pack) : null,
        salePercent: r.sale_percent ? Number(r.sale_percent) : null,
        saleBuy: r.sale_buy && r.sale_free ? Number(r.sale_buy) : null,
        saleFree: r.sale_buy && r.sale_free ? Number(r.sale_free) : null,
        saleUntil: r.sale_until ?? null,
        nameEn: r.name_en?.trim() || null,
        descriptionEn: r.description_en?.trim() || null,
      });
    }
    return { map, ready: true, soldOutReady, packReady, saleReady, englishReady };
  },
);

/** Save one product's settings; a row with nothing set is removed. */
export async function saveProductSetting(
  productId: string,
  s: ProductSetting,
  columns: { soldOut: boolean; pack: boolean; sale: boolean; english: boolean },
): Promise<boolean> {
  const nothingSet =
    !s.hidden && !s.name && s.price == null && !s.description && s.soldOut == null && s.pack == null &&
    s.salePercent == null && s.saleBuy == null && !s.nameEn && !s.descriptionEn;
  const { soldOut, pack, salePercent, saleBuy, saleFree, saleUntil, nameEn, descriptionEn, ...rest } = s;
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
            ...(columns.sale
              ? { sale_percent: salePercent, sale_buy: saleBuy, sale_free: saleFree, sale_until: saleUntil }
              : {}),
            ...(columns.english ? { name_en: nameEn, description_en: descriptionEn } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "product_id" },
        );
  if (error) console.error("saveProductSetting:", error.message);
  return !error;
}

/**
 * Order lines read in English: the product's English name when the admin
 * (or sql/09) gave one. Free «бэлэг» lines keep their marker, so the page
 * can still show them as free (see lib/gift.ts).
 */
export async function localizeItems<I extends { product_id: string | null; name: string; unit_price: number }>(
  items: I[],
  lang: "mn" | "en",
): Promise<I[]> {
  if (lang !== "en") return items;
  const { map } = await getProductSettings();
  return items.map((it) => {
    const en = it.product_id ? map.get(it.product_id)?.nameEn : null;
    if (!en) return it;
    return { ...it, name: isGiftLine(it) ? en + GIFT_SUFFIX : en };
  });
}
