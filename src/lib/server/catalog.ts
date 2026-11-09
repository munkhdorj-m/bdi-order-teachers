import "server-only";
import { db } from "./supabase";
import { fetchAll } from "./fetch-all";
import { getSettings } from "./settings";
import { isUuid } from "@/lib/uuid";

/**
 * Products, photos and categories come straight from BDI's tables.
 * Price = the chosen price list (default «Захууд»), else base_price.
 * Sold out = stock <= 0, same as BDI.
 */

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  unit: string | null;
  image_url: string | null;
  category_id: string | null;
  price: number;
  sold_out: boolean;
};

export type Category = { id: string; name: string; icon: string | null };

export type ProductDetail = Product & { description: string | null; stock: number; category: Category | null };

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  unit: string | null;
  image_url: string | null;
  category_id: string | null;
  stock: number | null;
  base_price: number | string | null;
};

const COLS = "id, name, brand, unit, image_url, category_id, stock, base_price";

/** In stock first, then by name with numbers in numeric order (4ш < 10ш). */
const nameCollator = new Intl.Collator("mn", { numeric: true, sensitivity: "base" });

async function listPrices(listId: string | null): Promise<Map<string, number>> {
  if (!listId) return new Map();
  const rows = await fetchAll<{ product_id: string; price: number | string }>(() =>
    db().from("price_list_items").select("product_id, price").eq("price_list_id", listId).order("product_id"),
  );
  return new Map(rows.map((r) => [r.product_id, Number(r.price)]));
}

function validPrice(p: number | null): number | null {
  return p != null && Number.isFinite(p) && p > 0 ? p : null;
}

function priceOf(row: ProductRow, list: Map<string, number>): number | null {
  return validPrice(list.get(row.id) ?? (row.base_price == null ? null : Number(row.base_price)));
}

function toProduct(r: ProductRow, price: number): Product {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand?.trim() || null,
    unit: r.unit?.trim() || null,
    image_url: r.image_url,
    category_id: r.category_id,
    price,
    sold_out: (r.stock ?? 0) <= 0,
  };
}

function activeProducts(): Promise<ProductRow[]> {
  return fetchAll<ProductRow>(() => db().from("products").select(COLS).eq("active", true).order("name").order("id"));
}

export async function getCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  const settings = await getSettings();
  const [rows, cats, list] = await Promise.all([
    activeProducts(),
    db().from("categories").select("id, name, icon, sort_order").order("sort_order").order("name"),
    listPrices(settings.price_list_id),
  ]);
  if (cats.error) throw new Error(cats.error.message);

  const products: Product[] = rows.flatMap((r) => {
    const price = priceOf(r, list);
    return price == null ? [] : [toProduct(r, price)];
  });

  const used = new Set(products.map((p) => p.category_id));
  const categories = ((cats.data ?? []) as (Category & { sort_order: number | null })[])
    .filter((c) => used.has(c.id))
    .map(({ id, name, icon }) => ({ id, name, icon }));

  // Category order, then what's in stock, then by name.
  const rank = new Map(categories.map((c, i) => [c.id, i]));
  products.sort(
    (a, b) =>
      (rank.get(a.category_id ?? "") ?? 1e9) - (rank.get(b.category_id ?? "") ?? 1e9) ||
      Number(a.sold_out) - Number(b.sold_out) ||
      nameCollator.compare(a.name, b.name),
  );
  return { products, categories };
}

/** One product for its own page; null when it can't be sold here. */
export async function getProduct(id: string): Promise<ProductDetail | null> {
  if (!isUuid(id)) return null;
  const settings = await getSettings();
  const [res, listPrice] = await Promise.all([
    db().from("products").select(`${COLS}, description, active`).eq("id", id).maybeSingle(),
    settings.price_list_id
      ? db().from("price_list_items").select("price").eq("price_list_id", settings.price_list_id).eq("product_id", id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (res.error) throw new Error(res.error.message);
  const row = res.data as (ProductRow & { description: string | null; active: boolean }) | null;
  if (!row || !row.active) return null;
  const listed = listPrice.data ? Number((listPrice.data as { price: number | string }).price) : null;
  const price = validPrice(listed ?? (row.base_price == null ? null : Number(row.base_price)));
  if (price == null) return null;

  let category: Category | null = null;
  if (row.category_id) {
    const c = await db().from("categories").select("id, name, icon").eq("id", row.category_id).maybeSingle();
    category = (c.data as Category | null) ?? null;
  }
  return { ...toProduct(row, price), description: row.description?.trim() || null, stock: Number(row.stock ?? 0), category };
}

/** product_id → price, for everything that can be ordered right now. */
export async function getOrderablePrices(): Promise<Record<string, number>> {
  const settings = await getSettings();
  const [rows, list] = await Promise.all([activeProducts(), listPrices(settings.price_list_id)]);
  const out: Record<string, number> = {};
  for (const r of rows) {
    const price = priceOf(r, list);
    if (price != null && (r.stock ?? 0) > 0) out[r.id] = price;
  }
  return out;
}

/** Name and orderable state of some products (for clear error messages). */
export async function getProductStates(ids: string[]): Promise<Map<string, { name: string; orderable: boolean }>> {
  if (ids.length === 0) return new Map();
  const settings = await getSettings();
  const [res, list] = await Promise.all([
    db().from("products").select(`${COLS}, active`).in("id", ids),
    listPrices(settings.price_list_id),
  ]);
  if (res.error) throw new Error(res.error.message);
  const out = new Map<string, { name: string; orderable: boolean }>();
  for (const r of (res.data ?? []) as (ProductRow & { active: boolean })[]) {
    out.set(r.id, { name: r.name, orderable: r.active && (r.stock ?? 0) > 0 && priceOf(r, list) != null });
  }
  return out;
}
