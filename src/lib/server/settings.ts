import "server-only";
import { cache } from "react";
import { db } from "./supabase";

export type ShopSettings = {
  bank_name: string;
  account_number: string;
  account_name: string;
  note: string;
  price_list_id: string | null;
  open: boolean;
  closed_message: string;
};

/** The one settings row (id = 1). Cached per request. */
export const getSettings = cache(async (): Promise<ShopSettings> => {
  const { data, error } = await db()
    .from("teacher_settings")
    .select("bank_name, account_number, account_name, note, price_list_id, open, closed_message")
    .eq("id", 1)
    .maybeSingle<ShopSettings>();
  if (error) throw new Error(error.message);
  return (
    data ?? {
      bank_name: "",
      account_number: "",
      account_name: "",
      note: "",
      price_list_id: null,
      open: false,
      closed_message: "",
    }
  );
});

export const CLOSED_DEFAULT = "Захиалга түр хаалттай";

/** Save the settings row. False when the database refused it. */
export async function saveShopSettings(s: ShopSettings): Promise<boolean> {
  const listOk = s.price_list_id === null || /^[0-9a-f-]{36}$/i.test(s.price_list_id);
  const { error } = await db()
    .from("teacher_settings")
    .update({ ...s, price_list_id: listOk ? s.price_list_id : null, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) console.error("saveShopSettings:", error.message);
  return !error;
}

/** BDI's active price lists, for the Settings page. */
export async function listPriceLists(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db().from("price_lists").select("id, name").eq("active", true).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; name: string }[];
}
