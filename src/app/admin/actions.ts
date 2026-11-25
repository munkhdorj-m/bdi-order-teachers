"use server";

import { revalidatePath } from "next/cache";
import { deleteAccount, resetPin, setActive } from "@/lib/server/accounts";
import {
  ADMIN_MOVES,
  deleteCancelledOrder,
  editOrderItems,
  moveOrder,
  type AdminMove,
} from "@/lib/server/orders";
import {
  getProductSettings,
  saveProductSetting,
  type ProductSetting,
} from "@/lib/server/product-settings";
import { listProductsForAdmin } from "@/lib/server/catalog";
import { getLang, getT } from "@/lib/server/lang";
import { requireAdmin } from "@/lib/server/session";
import { saveShopSettings, settingsIbanReady } from "@/lib/server/settings";
import { compactIban, isValidIban } from "@/lib/iban";
import type { T } from "@/lib/i18n";
import { isUuid } from "@/lib/uuid";

/** Every admin action checks requireAdmin() itself. */

export async function moveOrderAction(
  orderId: string,
  move: AdminMove,
): Promise<boolean> {
  await requireAdmin();
  if (!ADMIN_MOVES.includes(move)) return false;
  const ok = await moveOrder(String(orderId ?? ""), move);
  if (ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/bring");
  }
  return ok;
}

/** Delete a cancelled order for good (only cancelled ones; its lines go with it). */
export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const lang = await getLang();
  const res = await deleteCancelledOrder(String(orderId ?? ""), lang);
  if (res.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/orders", "layout");
  }
  return res;
}

/** Change an unpaid order's quantities (0 removes a line). */
export async function editOrderAction(
  orderId: string,
  changes: { id: number; qty: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const res = await editOrderItems(
    String(orderId ?? ""),
    Array.isArray(changes) ? changes : [],
    await getLang(),
  );
  if (res.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/orders", "layout");
  }
  return res;
}

export async function resetPinAction(
  accountId: string,
): Promise<{ pin: string } | { error: string }> {
  const me = await requireAdmin();
  const t = await getT();
  if (accountId === me.id)
    return {
      error: t(
        "Өөрийн PIN-ийг «Би» хэсгээс солино уу",
        "Change your own PIN on the «Me» page",
      ),
    };
  const pin = await resetPin(String(accountId ?? ""));
  if (!pin) return { error: t("Олдсонгүй", "Not found") };
  revalidatePath("/admin/users");
  return { pin };
}

export async function setActiveAction(
  accountId: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireAdmin();
  const t = await getT();
  if (accountId === me.id)
    return {
      ok: false,
      error: t("Өөрийгөө хаах боломжгүй", "You can't block yourself"),
    };
  const ok = await setActive(String(accountId ?? ""), active === true);
  if (ok) revalidatePath("/admin/users");
  return {
    ok,
    error: ok ? undefined : t("Алдаа гарлаа", "Something went wrong"),
  };
}

export async function deleteAccountAction(
  accountId: string,
): Promise<{ ok: true; orders: number } | { ok: false; error: string }> {
  const me = await requireAdmin();
  const lang = await getLang();
  const t = await getT();
  if (accountId === me.id)
    return {
      ok: false,
      error: t("Өөрийгөө устгах боломжгүй", "You can't delete yourself"),
    };
  if (!isUuid(accountId))
    return { ok: false, error: t("Олдсонгүй", "Not found") };
  const res = await deleteAccount(accountId, lang);
  if (res.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/orders");
  }
  return res;
}

// ---- Products (Админ → Бараа) --------------------------------------------

type ProductResult = { ok: true } | { ok: false; error: string };

const NO_SETTING: ProductSetting = {
  hidden: false,
  name: null,
  price: null,
  description: null,
  soldOut: null,
  pack: null,
  salePercent: null,
  saleBuy: null,
  saleFree: null,
  saleUntil: null,
  nameEn: null,
  descriptionEn: null,
};
/** "Run sql/0N first" messages, in the admin's language. */
const sqlFirst = (t: T) => ({
  s04: t(
    "Эхлээд sql/04-product-settings.sql-ийг ажиллуулна уу",
    "First run sql/04-product-settings.sql",
  ),
  s05: t(
    "Эхлээд sql/05-product-sold-out.sql-ийг ажиллуулна уу",
    "First run sql/05-product-sold-out.sql",
  ),
  s07: t(
    "Багцад эхлээд sql/07-product-pack.sql-ийг ажиллуулна уу",
    "For packs, first run sql/07-product-pack.sql",
  ),
  s08: t(
    "Хямдралд эхлээд sql/08-sales.sql-ийг ажиллуулна уу",
    "For sales, first run sql/08-sales.sql",
  ),
  s09: t(
    "Англи нэрэнд эхлээд sql/09-product-english.sql-ийг ажиллуулна уу",
    "For English names, first run sql/09-product-english.sql",
  ),
});

async function saveProduct(
  productId: string,
  next: (cur: ProductSetting) => ProductSetting,
  needsSoldOut = false,
): Promise<ProductResult> {
  const t = await getT();
  const sql = sqlFirst(t);
  if (!isUuid(productId))
    return { ok: false, error: t("Олдсонгүй", "Not found") };
  const { map, ready, soldOutReady, packReady, saleReady, englishReady } =
    await getProductSettings();
  if (!ready) return { ok: false, error: sql.s04 };
  if (needsSoldOut && !soldOutReady) return { ok: false, error: sql.s05 };
  const cur = map.get(productId) ?? NO_SETTING;
  const after = next(cur);
  if (after.pack != null && after.pack !== cur.pack && !packReady)
    return { ok: false, error: sql.s07 };
  const saleChanged =
    after.salePercent !== cur.salePercent ||
    after.saleBuy !== cur.saleBuy ||
    after.saleFree !== cur.saleFree ||
    after.saleUntil !== cur.saleUntil;
  if (saleChanged && !saleReady) return { ok: false, error: sql.s08 };
  const englishChanged =
    after.nameEn !== cur.nameEn || after.descriptionEn !== cur.descriptionEn;
  if (englishChanged && !englishReady) return { ok: false, error: sql.s09 };
  const columns = {
    soldOut: soldOutReady,
    pack: packReady,
    sale: saleReady,
    english: englishReady,
  };
  if (!(await saveProductSetting(productId, after, columns))) {
    return { ok: false, error: t("Хадгалж чадсангүй", "Couldn't save") };
  }
  revalidatePath("/", "layout"); // the shop shows it right away
  return { ok: true };
}

/** Show the product on the site, or hide it (hidden can't be ordered). */
export async function setProductHiddenAction(
  productId: string,
  hidden: boolean,
): Promise<ProductResult> {
  await requireAdmin();
  return saveProduct(String(productId ?? ""), (cur) => ({
    ...cur,
    hidden: hidden === true,
  }));
}

/** The admin's name / price / description / багц; empty = BDI's own (or by the piece). */
export async function saveProductAction(
  productId: string,
  input: {
    name?: string;
    price?: string;
    description?: string;
    pack?: string;
    nameEn?: string;
    descriptionEn?: string;
  },
): Promise<ProductResult> {
  await requireAdmin();
  const t = await getT();
  const name =
    String(input?.name ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 200) || null;
  const description =
    String(input?.description ?? "")
      .trim()
      .slice(0, 4000) || null;
  const rawPrice = String(input?.price ?? "").replace(/[\s,'₮]/g, "");
  let price: number | null = null;
  if (rawPrice) {
    const n = Number(rawPrice);
    if (!Number.isFinite(n) || n <= 0 || n >= 100_000_000)
      return {
        ok: false,
        error: t("Үнэ буруу байна", "The price is not valid"),
      };
    price = Math.round(n * 100) / 100;
  }
  const rawPack = String(input?.pack ?? "").replace(/\D/g, "");
  const packN = rawPack ? Number(rawPack) : 0;
  if (packN === 1 || packN > 500)
    return {
      ok: false,
      error: t("Багц 2-500 ширхэг байна", "A pack is 2-500 pieces"),
    };
  const pack = packN >= 2 ? packN : null;
  const nameEn =
    input?.nameEn === undefined
      ? undefined
      : String(input.nameEn).trim().replace(/\s+/g, " ").slice(0, 200) || null;
  const descriptionEn =
    input?.descriptionEn === undefined
      ? undefined
      : String(input.descriptionEn).trim().slice(0, 4000) || null;
  return saveProduct(String(productId ?? ""), (cur) => ({
    ...cur,
    name,
    price,
    description,
    pack,
    nameEn: nameEn === undefined ? cur.nameEn : nameEn,
    descriptionEn:
      descriptionEn === undefined ? cur.descriptionEn : descriptionEn,
  }));
}

/**
 * Sell every product BDI packs (products.pack_size) by that багц, at once.
 * Products the admin already set a багц for are left as they are.
 */
export async function packAllFromBdiAction(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  await requireAdmin();
  const t = await getT();
  const sql = sqlFirst(t);
  const { map, ready, soldOutReady, packReady, saleReady, englishReady } =
    await getProductSettings();
  if (!ready) return { ok: false, error: sql.s04 };
  if (!packReady) return { ok: false, error: sql.s07 };
  const { products } = await listProductsForAdmin();
  const todo = products.filter((p) => p.bdiPack && !map.get(p.id)?.pack);
  let count = 0;
  for (const p of todo) {
    const cur = map.get(p.id) ?? NO_SETTING;
    const ok = await saveProductSetting(
      p.id,
      { ...cur, pack: p.bdiPack },
      {
        soldOut: soldOutReady,
        pack: packReady,
        sale: saleReady,
        english: englishReady,
      },
    );
    if (ok) count++;
  }
  revalidatePath("/", "layout");
  if (count < todo.length) {
    return {
      ok: false,
      error: t(
        `${count}/${todo.length} хадгалагдлаа. Дахин оролдоно уу`,
        `${count}/${todo.length} saved. Please try again`,
      ),
    };
  }
  return { ok: true, count };
}

/** Back to BDI's name, price and description (shown/hidden and sold out stay). */
export async function resetProductAction(
  productId: string,
): Promise<ProductResult> {
  await requireAdmin();
  return saveProduct(String(productId ?? ""), (cur) => ({
    ...cur,
    name: null,
    price: null,
    description: null,
    pack: null,
  }));
}

export type SaleInput = {
  type: "none" | "percent" | "deal";
  percent?: string;
  buy?: string;
  free?: string;
  until?: string;
};

/** A sale: «−20%», or «2+1» (buy 2, get 1 free); optional last day. */
export async function setProductSaleAction(
  productId: string,
  input: SaleInput,
): Promise<ProductResult> {
  await requireAdmin();
  const t = await getT();
  const type = input?.type;
  if (type !== "none" && type !== "percent" && type !== "deal") {
    return { ok: false, error: t("Алдаа гарлаа", "Something went wrong") };
  }
  const int = (v: unknown) => {
    const digits = String(v ?? "").replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  };
  let salePercent: number | null = null;
  let saleBuy: number | null = null;
  let saleFree: number | null = null;
  if (type === "percent") {
    salePercent = int(input.percent);
    if (salePercent < 1 || salePercent > 90)
      return {
        ok: false,
        error: t("Хувь 1-90 байна", "The percent must be 1-90"),
      };
  } else if (type === "deal") {
    saleBuy = int(input.buy);
    saleFree = int(input.free);
    if (saleBuy < 1 || saleBuy > 20 || saleFree < 1 || saleFree > 20) {
      return {
        ok: false,
        error: t("Тоо 1-20 байна", "The numbers must be 1-20"),
      };
    }
  }
  let saleUntil: string | null = null;
  const until = String(input?.until ?? "").trim();
  if (type !== "none" && until) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(Date.parse(until))) {
      return {
        ok: false,
        error: t("Огноо буруу байна", "The date is not valid"),
      };
    }
    saleUntil = until;
  }
  return saveProduct(String(productId ?? ""), (cur) => ({
    ...cur,
    salePercent,
    saleBuy,
    saleFree,
    saleUntil,
  }));
}

export type StockMode = "auto" | "in" | "out";

/** «Байгаа» / «Дууссан» on this site, or back to following BDI's stock. */
export async function setProductStockAction(
  productId: string,
  mode: StockMode,
): Promise<ProductResult> {
  await requireAdmin();
  const t = await getT();
  if (mode !== "auto" && mode !== "in" && mode !== "out")
    return { ok: false, error: t("Алдаа гарлаа", "Something went wrong") };
  const soldOut = mode === "auto" ? null : mode === "out";
  return saveProduct(
    String(productId ?? ""),
    (cur) => ({ ...cur, soldOut }),
    true,
  );
}

export type SaveState = { ok: boolean; message: string; at: number } | null;

export async function saveSettingsAction(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  await requireAdmin();
  const t = await getT();
  const text = (key: string, max: number) =>
    String(form.get(key) ?? "")
      .trim()
      .slice(0, max);
  const iban = compactIban(text("iban", 60));
  if (iban && !isValidIban(iban)) {
    return {
      ok: false,
      message: t(
        "IBAN буруу байна. Дахин шалгана уу",
        "The IBAN is not valid. Please check it",
      ),
      at: Date.now(),
    };
  }
  const ok = await saveShopSettings({
    bank_name: text("bank_name", 100),
    account_number: text("account_number", 60),
    iban,
    account_name: text("account_name", 100),
    note: text("note", 500),
    price_list_id: text("price_list_id", 64) || null,
    open: form.get("open") === "on",
    closed_message: text("closed_message", 200),
  });
  if (ok) revalidatePath("/", "layout");
  if (ok && iban && !(await settingsIbanReady())) {
    return {
      ok: false,
      message: t(
        "IBAN-аас бусдыг хадгаллаа. IBAN-д sql/06-settings-iban.sql-ийг ажиллуулна уу",
        "Saved everything except the IBAN. For the IBAN, run sql/06-settings-iban.sql",
      ),
      at: Date.now(),
    };
  }
  return {
    ok,
    message: ok
      ? t("Хадгаллаа", "Saved")
      : t("Хадгалж чадсангүй", "Couldn't save"),
    at: Date.now(),
  };
}
