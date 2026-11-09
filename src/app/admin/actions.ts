"use server";

import { revalidatePath } from "next/cache";
import { deleteAccount, resetPin, setActive } from "@/lib/server/accounts";
import { ADMIN_MOVES, moveOrder, type AdminMove } from "@/lib/server/orders";
import { getProductSettings, saveProductSetting, type ProductSetting } from "@/lib/server/product-settings";
import { requireAdmin } from "@/lib/server/session";
import { saveShopSettings, settingsIbanReady } from "@/lib/server/settings";
import { compactIban, isValidIban } from "@/lib/iban";
import { isUuid } from "@/lib/uuid";

/** Every admin action checks requireAdmin() itself. */

export async function moveOrderAction(orderId: string, move: AdminMove): Promise<boolean> {
  await requireAdmin();
  if (!ADMIN_MOVES.includes(move)) return false;
  const ok = await moveOrder(String(orderId ?? ""), move);
  if (ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/bring");
  }
  return ok;
}

export async function resetPinAction(accountId: string): Promise<{ pin: string } | { error: string }> {
  const me = await requireAdmin();
  if (accountId === me.id) return { error: "Өөрийн PIN-ийг «Би» хэсгээс солино уу" };
  const pin = await resetPin(String(accountId ?? ""));
  if (!pin) return { error: "Олдсонгүй" };
  revalidatePath("/admin/users");
  return { pin };
}

export async function setActiveAction(accountId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await requireAdmin();
  if (accountId === me.id) return { ok: false, error: "Өөрийгөө хаах боломжгүй" };
  const ok = await setActive(String(accountId ?? ""), active === true);
  if (ok) revalidatePath("/admin/users");
  return { ok, error: ok ? undefined : "Алдаа гарлаа" };
}

export async function deleteAccountAction(
  accountId: string,
): Promise<{ ok: true; orders: number } | { ok: false; error: string }> {
  const me = await requireAdmin();
  if (accountId === me.id) return { ok: false, error: "Өөрийгөө устгах боломжгүй" };
  if (!isUuid(accountId)) return { ok: false, error: "Олдсонгүй" };
  const res = await deleteAccount(accountId);
  if (res.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/orders");
  }
  return res;
}

// ---- Products (Админ → Бараа) --------------------------------------------

type ProductResult = { ok: true } | { ok: false; error: string };

const NO_SETTING: ProductSetting = { hidden: false, name: null, price: null, description: null, soldOut: null };
const SQL_FIRST = "Эхлээд sql/04-product-settings.sql-ийг ажиллуулна уу";
const SQL_05_FIRST = "Эхлээд sql/05-product-sold-out.sql-ийг ажиллуулна уу";

async function saveProduct(
  productId: string,
  next: (cur: ProductSetting) => ProductSetting,
  needsSoldOut = false,
): Promise<ProductResult> {
  if (!isUuid(productId)) return { ok: false, error: "Олдсонгүй" };
  const { map, ready, soldOutReady } = await getProductSettings();
  if (!ready) return { ok: false, error: SQL_FIRST };
  if (needsSoldOut && !soldOutReady) return { ok: false, error: SQL_05_FIRST };
  const cur = map.get(productId) ?? NO_SETTING;
  if (!(await saveProductSetting(productId, next(cur), soldOutReady))) return { ok: false, error: "Хадгалж чадсангүй" };
  revalidatePath("/", "layout"); // the shop shows it right away
  return { ok: true };
}

/** Show the product on the site, or hide it (hidden can't be ordered). */
export async function setProductHiddenAction(productId: string, hidden: boolean): Promise<ProductResult> {
  await requireAdmin();
  return saveProduct(String(productId ?? ""), (cur) => ({ ...cur, hidden: hidden === true }));
}

/** The admin's name / price / description; empty = BDI's own. */
export async function saveProductAction(
  productId: string,
  input: { name?: string; price?: string; description?: string },
): Promise<ProductResult> {
  await requireAdmin();
  const name = String(input?.name ?? "").trim().replace(/\s+/g, " ").slice(0, 200) || null;
  const description = String(input?.description ?? "").trim().slice(0, 4000) || null;
  const rawPrice = String(input?.price ?? "").replace(/[\s,'₮]/g, "");
  let price: number | null = null;
  if (rawPrice) {
    const n = Number(rawPrice);
    if (!Number.isFinite(n) || n <= 0 || n >= 100_000_000) return { ok: false, error: "Үнэ буруу байна" };
    price = Math.round(n * 100) / 100;
  }
  return saveProduct(String(productId ?? ""), (cur) => ({ ...cur, name, price, description }));
}

/** Back to BDI's name, price and description (shown/hidden and sold out stay). */
export async function resetProductAction(productId: string): Promise<ProductResult> {
  await requireAdmin();
  return saveProduct(String(productId ?? ""), (cur) => ({ ...cur, name: null, price: null, description: null }));
}

export type StockMode = "auto" | "in" | "out";

/** «Байгаа» / «Дууссан» on this site, or back to following BDI's stock. */
export async function setProductStockAction(productId: string, mode: StockMode): Promise<ProductResult> {
  await requireAdmin();
  if (mode !== "auto" && mode !== "in" && mode !== "out") return { ok: false, error: "Алдаа гарлаа" };
  const soldOut = mode === "auto" ? null : mode === "out";
  return saveProduct(String(productId ?? ""), (cur) => ({ ...cur, soldOut }), true);
}

export type SaveState = { ok: boolean; message: string; at: number } | null;

export async function saveSettingsAction(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
  const iban = compactIban(text("iban", 60));
  if (iban && !isValidIban(iban)) return { ok: false, message: "IBAN буруу байна. Дахин шалгана уу", at: Date.now() };
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
    return { ok: false, message: "IBAN-аас бусдыг хадгаллаа. IBAN-д sql/06-settings-iban.sql-ийг ажиллуулна уу", at: Date.now() };
  }
  return { ok, message: ok ? "Хадгаллаа" : "Хадгалж чадсангүй", at: Date.now() };
}
