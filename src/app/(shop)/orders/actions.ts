"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cancelMyOrder, notifyCancelled } from "@/lib/server/orders";
import { requireTeacher } from "@/lib/server/session";

export async function cancelOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireTeacher();
  const id = String(orderId ?? "");
  const res = await cancelMyOrder(me.id, id);
  if (res.ok) {
    after(() => notifyCancelled(id));
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
  }
  return res;
}
