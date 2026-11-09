"use server";

import { revalidatePath } from "next/cache";
import { resetPin, setActive } from "@/lib/server/accounts";
import { ADMIN_MOVES, moveOrder, type AdminMove } from "@/lib/server/orders";
import { requireAdmin } from "@/lib/server/session";
import { saveShopSettings } from "@/lib/server/settings";

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
