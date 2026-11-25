"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyNewOrder, placeOrder as place } from "@/lib/server/orders";
import { getLang } from "@/lib/server/lang";
import { requireTeacher } from "@/lib/server/session";

export async function placeOrder(input: {
  requestId: string;
  items: { product_id: string; qty: number }[];
  note: string;
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const me = await requireTeacher();
  const lang = await getLang();
  try {
    // Only ids and quantities are taken from the phone; the server prices it.
    const res = await place(me.id, { requestId: input?.requestId, items: input?.items, note: input?.note }, lang);
    if (!res.ok) return res;
    if (!res.duplicate) after(() => notifyNewOrder(res.orderId));
    revalidatePath("/orders");
    return { ok: true, orderId: res.orderId };
  } catch (e) {
    console.error("placeOrder:", (e as Error).message);
    return { ok: false, error: lang === "en" ? "Something went wrong. Please try again" : "Алдаа гарлаа. Дахин оролдоно уу" };
  }
}
