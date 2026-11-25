"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cancelMyOrder, deleteMyCancelledOrder, notifyCancelled } from "@/lib/server/orders";
import { getLang } from "@/lib/server/lang";
import { requireTeacher } from "@/lib/server/session";

export async function cancelOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireTeacher();
  const id = String(orderId ?? "");
  const res = await cancelMyOrder(me.id, id, await getLang());
  if (res.ok) {
    after(() => notifyCancelled(id));
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
  }
  return res;
}

/** Remove one of my cancelled orders for good. */
export async function deleteOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireTeacher();
  const res = await deleteMyCancelledOrder(me.id, String(orderId ?? ""), await getLang());
  if (res.ok) {
    revalidatePath("/orders");
    revalidatePath("/admin", "layout");
  }
  return res;
}
