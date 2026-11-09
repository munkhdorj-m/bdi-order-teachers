import "server-only";
import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { db } from "./supabase";

export type ShopSettings = {
  bank_name: string;
  account_number: string;
  /** Stored without spaces; empty when not set (or before sql/06). */
  iban: string;
  account_name: string;
  note: string;
  price_list_id: string | null;
  open: boolean;
  closed_message: string;
};

const DEFAULTS: ShopSettings = {
  bank_name: "",
  account_number: "",
  iban: "",
  account_name: "",
  note: "",
  price_list_id: null,
  open: false,
  closed_message: "",
};

const BASE_COLS = "bank_name, account_number, account_name, note, price_list_id, open, closed_message";

/** The iban column isn't there yet (sql/06 not run). */
function missingIban(e: PostgrestError): boolean {
  return e.code === "42703" || e.code === "PGRST204" || /iban/.test(e.message ?? "");
}

/** The one settings row (id = 1), and whether sql/06 (IBAN) has been run. */
const loadSettings = cache(async (): Promise<{ settings: ShopSettings; ibanReady: boolean }> => {
  let ibanReady = true;
  let res = await db().from("teacher_settings").select(`${BASE_COLS}, iban`).eq("id", 1).maybeSingle();
  if (res.error && missingIban(res.error)) {
    ibanReady = false;
    res = await db().from("teacher_settings").select(BASE_COLS).eq("id", 1).maybeSingle();
  }
  if (res.error) throw new Error(res.error.message);
  const row = res.data as Partial<ShopSettings> | null;
  if (!row) return { settings: DEFAULTS, ibanReady };
  return { settings: { ...DEFAULTS, ...row, iban: row.iban ?? "" }, ibanReady };
});

/** The one settings row (id = 1). Cached per request. */
export const getSettings = cache(async (): Promise<ShopSettings> => (await loadSettings()).settings);

/** False until sql/06-settings-iban.sql has been run. */
export const settingsIbanReady = cache(async (): Promise<boolean> => (await loadSettings()).ibanReady);

export const CLOSED_DEFAULT = "Захиалга түр хаалттай";

/** Save the settings row. The IBAN is left out until its column exists. */
export async function saveShopSettings(s: ShopSettings): Promise<boolean> {
  const listOk = s.price_list_id === null || /^[0-9a-f-]{36}$/i.test(s.price_list_id);
  const { iban, ...rest } = s;
  const withIban = await settingsIbanReady();
  const { error } = await db()
    .from("teacher_settings")
    .update({
      ...rest,
      ...(withIban ? { iban } : {}),
      price_list_id: listOk ? s.price_list_id : null,
      updated_at: new Date().toISOString(),
    })
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
