import { notFound } from "next/navigation";
import { getLang } from "@/lib/server/lang";
import { getMyOrder } from "@/lib/server/orders";
import { localizeItems } from "@/lib/server/product-settings";
import { requireTeacher } from "@/lib/server/session";
import { getSettings } from "@/lib/server/settings";
import { OrderView } from "./order-view";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const me = await requireTeacher(`/orders/${id}`);
  const [order, settings, lang] = await Promise.all([getMyOrder(me.id, id), getSettings(), getLang()]);
  if (!order) notFound();
  const shown = { ...order, items: await localizeItems(order.items, lang) };
  return <OrderView order={shown} settings={settings} phone={me.phone} justPlaced={sp.new === "1"} lang={lang} />;
}
