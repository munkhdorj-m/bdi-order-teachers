import "server-only";
import { db } from "./supabase";
import { fetchAll } from "./fetch-all";
import { getProductSettings, type ProductSetting } from "./product-settings";
import { getSettings } from "./settings";
import { isUuid } from "@/lib/uuid";

/**
 * Products, photos and categories come straight from BDI's tables, with the
 * admin's own settings on top (Админ → Бараа): hidden products are left
 * out, and the admin's name, price, description and «Байгаа / Дууссан» win.
 * Price = the admin's price, else the chosen price list (default «Захууд»),
 * else base_price. Sold out = the admin's choice, else stock <= 0 as on BDI.
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

export type ProductDetail = Product & {
  description: string | null;
  stock: number;
  category: Category | null;
  sku: string | null;
  /** The admin set «Байгаа» / «Дууссан», so BDI's stock count doesn't apply. */
  stockForced: boolean;
  /** Pieces in one pack / one box, when more than one. */
  packSize: number | null;
  boxCount: number | null;
};

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

function validPrice(p: number | null | undefined): number | null {
  return p != null && Number.isFinite(p) && p > 0 ? p : null;
}

/** BDI's own price for this shop: the price list, else base price. */
function bdiPrice(row: ProductRow, list: Map<string, number>): number | null {
  return validPrice(list.get(row.id) ?? (row.base_price == null ? null : Number(row.base_price)));
}

/** What teachers pay: the admin's price, else BDI's. */
function shopPrice(row: ProductRow, list: Map<string, number>, s: ProductSetting | undefined): number | null {
  return validPrice(s?.price) ?? bdiPrice(row, list);
}

/** Sold out on this site: the admin's choice, else BDI's stock. */
function soldOutOf(row: ProductRow, s: ProductSetting | undefined): boolean {
  return s?.soldOut ?? (row.stock ?? 0) <= 0;
}

function toProduct(r: ProductRow, price: number, s?: ProductSetting): Product {
  return {
    id: r.id,
    name: s?.name || r.name,
    brand: r.brand?.trim() || null,
    unit: r.unit?.trim() || null,
    image_url: r.image_url,
    category_id: r.category_id,
    price,
    sold_out: soldOutOf(r, s),
  };
}

function activeProducts(): Promise<ProductRow[]> {
  return fetchAll<ProductRow>(() => db().from("products").select(COLS).eq("active", true).order("name").order("id"));
}

function categoriesQuery() {
  return db().from("categories").select("id, name, icon, sort_order").order("sort_order").order("name");
}

export async function getCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  const settings = await getSettings();
  const [rows, cats, list, ps] = await Promise.all([
    activeProducts(),
    categoriesQuery(),
    listPrices(settings.price_list_id),
    getProductSettings(),
  ]);
  if (cats.error) throw new Error(cats.error.message);

  const products: Product[] = rows.flatMap((r) => {
    const s = ps.map.get(r.id);
    if (s?.hidden) return [];
    const price = shopPrice(r, list, s);
    return price == null ? [] : [toProduct(r, price, s)];
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
  const [res, listPrice, ps] = await Promise.all([
    db().from("products").select(`${COLS}, description, active, sku, pack_size, box_count`).eq("id", id).maybeSingle(),
    settings.price_list_id
      ? db().from("price_list_items").select("price").eq("price_list_id", settings.price_list_id).eq("product_id", id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getProductSettings(),
  ]);
  if (res.error) throw new Error(res.error.message);
  const row = res.data as
    | (ProductRow & {
        description: string | null;
        active: boolean;
        sku: string | null;
        pack_size: number | null;
        box_count: number | null;
      })
    | null;
  const s = ps.map.get(id);
  if (!row || !row.active || s?.hidden) return null;
  const listed = listPrice.data ? Number((listPrice.data as { price: number | string }).price) : null;
  const price = validPrice(s?.price) ?? validPrice(listed ?? (row.base_price == null ? null : Number(row.base_price)));
  if (price == null) return null;

  let category: Category | null = null;
  if (row.category_id) {
    const c = await db().from("categories").select("id, name, icon").eq("id", row.category_id).maybeSingle();
    category = (c.data as Category | null) ?? null;
  }
  return {
    ...toProduct(row, price, s),
    description: s?.description || row.description?.trim() || null,
    stock: Number(row.stock ?? 0),
    category,
    sku: row.sku?.trim() || null,
    stockForced: s?.soldOut != null,
    packSize: (row.pack_size ?? 0) > 1 ? Number(row.pack_size) : null,
    boxCount: (row.box_count ?? 0) > 1 ? Number(row.box_count) : null,
  };
}

/** product_id → price, for everything that can be ordered right now. */
export async function getOrderablePrices(): Promise<Record<string, number>> {
  const settings = await getSettings();
  const [rows, list, ps] = await Promise.all([activeProducts(), listPrices(settings.price_list_id), getProductSettings()]);
  const out: Record<string, number> = {};
  for (const r of rows) {
    const s = ps.map.get(r.id);
    if (s?.hidden) continue;
    const price = shopPrice(r, list, s);
    if (price != null && !soldOutOf(r, s)) out[r.id] = price;
  }
  return out;
}

/** Name and orderable state of some products (for clear error messages). */
export async function getProductStates(ids: string[]): Promise<Map<string, { name: string; orderable: boolean }>> {
  if (ids.length === 0) return new Map();
  const settings = await getSettings();
  const [res, list, ps] = await Promise.all([
    db().from("products").select(`${COLS}, active`).in("id", ids),
    listPrices(settings.price_list_id),
    getProductSettings(),
  ]);
  if (res.error) throw new Error(res.error.message);
  const out = new Map<string, { name: string; orderable: boolean }>();
  for (const r of (res.data ?? []) as (ProductRow & { active: boolean })[]) {
    const s = ps.map.get(r.id);
    out.set(r.id, {
      name: s?.name || r.name,
      orderable: r.active && !s?.hidden && !soldOutOf(r, s) && shopPrice(r, list, s) != null,
    });
  }
  return out;
}

// ---- Admin: every BDI product with this shop's settings ------------------

export type AdminProduct = {
  id: string;
  bdiName: string;
  bdiDescription: string | null;
  bdiPrice: number | null;
  image_url: string | null;
  brand: string | null;
  stock: number;
  category: Category | null;
  setting: ProductSetting | null;
  /** What teachers see now. */
  name: string;
  price: number | null;
  soldOut: boolean;
};

/** Every active BDI product, BDI's values beside the admin's. */
export async function listProductsForAdmin(): Promise<{ products: AdminProduct[]; ready: boolean; soldOutReady: boolean }> {
  const settings = await getSettings();
  const [rows, cats, list, ps] = await Promise.all([
    fetchAll<ProductRow & { description: string | null }>(() =>
      db().from("products").select(`${COLS}, description`).eq("active", true).order("name").order("id"),
    ),
    categoriesQuery(),
    listPrices(settings.price_list_id),
    getProductSettings(),
  ]);
  if (cats.error) throw new Error(cats.error.message);
  const catRows = (cats.data ?? []) as (Category & { sort_order: number | null })[];
  const catById = new Map(catRows.map((c) => [c.id, { id: c.id, name: c.name, icon: c.icon }]));
  const rank = new Map(catRows.map((c, i) => [c.id, i]));

  const products: AdminProduct[] = rows.map((r) => {
    const s = ps.map.get(r.id);
    return {
      id: r.id,
      bdiName: r.name,
      bdiDescription: r.description?.trim() || null,
      bdiPrice: bdiPrice(r, list),
      image_url: r.image_url,
      brand: r.brand?.trim() || null,
      stock: Number(r.stock ?? 0),
      category: r.category_id ? (catById.get(r.category_id) ?? null) : null,
      setting: s ?? null,
      name: s?.name || r.name,
      price: shopPrice(r, list, s),
      soldOut: soldOutOf(r, s),
    };
  });
  products.sort(
    (a, b) =>
      (rank.get(a.category?.id ?? "") ?? 1e9) - (rank.get(b.category?.id ?? "") ?? 1e9) ||
      nameCollator.compare(a.name, b.name),
  );
  return { products, ready: ps.ready, soldOutReady: ps.soldOutReady };
}
