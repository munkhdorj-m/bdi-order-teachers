import Form from "next/form";
import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";
import { EmptyState } from "@/components/page-header";
import { formatMnt } from "@/lib/format";
import type { OrderStatus } from "@/lib/order-status";
import { listOrdersAdmin, orderCounts } from "@/lib/server/orders";
import { requireAdmin } from "@/lib/server/session";
import { searchNormalize } from "@/lib/translit";
import { AdminOrderCard } from "./order-card";

const FILTERS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "new", label: "Төлөөгүй", statuses: ["new"] },
  { key: "paid", label: "Төлсөн", statuses: ["paid"] },
  { key: "all", label: "Бүгд", statuses: null },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ s?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.s) ?? FILTERS[0];
  const q = (sp.q ?? "").trim().slice(0, 60);

  // A search looks through every order, whatever the chip.
  const [orders, counts] = await Promise.all([listOrdersAdmin(q ? null : filter.statuses), orderCounts()]);
  const nq = searchNormalize(q);
  const shown = q
    ? orders.filter((o) => searchNormalize(`${o.order_number} ${o.account.full_name} ${o.account.phone}`).includes(nq))
    : orders;
  const sum = shown.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  const countFor = (f: (typeof FILTERS)[number]) =>
    f.statuses ? f.statuses.reduce((s, st) => s + counts[st], 0) : Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Form action="/admin" className="relative md:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" strokeWidth={2.2} />
          <input type="search" name="q" defaultValue={q} placeholder="Дугаар, нэр, утас" aria-label="Хайх" className="field h-11 pl-10" />
        </Form>
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:px-0">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "new" ? "/admin" : `/admin?s=${f.key}`}
              className="chip"
              data-active={!q && f.key === filter.key ? "" : undefined}
            >
              {f.label}
              <span className="tabular-nums opacity-60">{countFor(f)}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-baseline gap-3 text-[13px] font-semibold text-ink-3 md:ml-auto">
          <span>{shown.length} захиалга</span>
          <span className="text-[15px] font-bold text-ink tabular-nums">{formatMnt(sum)}</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<ClipboardList />} text="Захиалга алга" />
      ) : (
        <div className="mt-4 grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((o) => (
            <AdminOrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}
