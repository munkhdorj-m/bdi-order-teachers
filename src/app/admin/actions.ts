"use server";

import { revalidatePath } from "next/cache";
import { deleteAccount, resetPin, setActive } from "@/lib/server/accounts";
import { ADMIN_MOVES, moveOrder, type AdminMove } from "@/lib/server/orders";
import { getProductSettings, saveProductSetting, type ProductSetting } from "@/lib/server/product-settings";
import { requireAdmin } from "@/lib/server/session";
import { saveShopSettings } from "@/lib/server/settings";
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

const NO_SETTING: ProductSetting = { hidden: false, name: null, price: null, description: null };
const SQL_FIRST = "Эхлээд sql/04-product-settings.sql-ийг ажиллуулна уу";

async function currentProductSetting(productId: string): Promise<ProductSetting | null> {
  const { map, ready } = await getProductSettings();
  return ready ? (map.get(productId) ?? NO_SETTING) : null;
}

async function saveProduct(productId: string, next: (cur: ProductSetting) => ProductSetting): Promise<ProductResult> {
  if (!isUuid(productId)) return { ok: false, error: "Олдсонгүй" };
  const cur = await currentProductSetting(productId);
  if (!cur) return { ok: false, error: SQL_FIRST };
  if (!(await saveProductSetting(productId, next(cur)))) return { ok: false, error: "Хадгалж чадсангүй" };
  revalidatePath("/", "layout"); // the shop shows it (or not) right away
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
  return saveProduct(String(productId ?? ""), (cur) => ({ hidden: cur.hidden, name, price, description }));
}

/** Back to BDI's name, price and description (shown/hidden stays). */
export async function resetProductAction(productId: string): Promise<ProductResult> {
  await requireAdmin();
  return saveProduct(String(productId ?? ""), (cur) => ({ ...NO_SETTING, hidden: cur.hidden }));
}

export type SaveState = { ok: boolean; message: string; at: number } | null;

export async function saveSettingsAction(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
  const ok = await saveShopSettings({
    bank_name: text("bank_name", 100),
    account_number: text("account_number", 60),
    account_name: text("account_name", 100),
    note: text("note", 500),
    price_list_id: text("price_list_id", 64) || null,
    open: form.get("open") === "on",
    closed_message: text("closed_message", 200),
  });
  if (ok) revalidatePath("/", "layout");
  return { ok, message: ok ? "Хадгаллаа" : "Хадгалж чадсангүй", at: Date.now() };
}
