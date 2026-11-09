import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import { EmptyState, PageTitle } from "@/components/page-header";
import { ProductImage } from "@/components/product-image";
import { buttonClass } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDateTime, formatMnt } from "@/lib/format";
import { STATUS_STEPS } from "@/lib/order-status";
import { listMyOrders, type Order } from "@/lib/server/orders";
import { requireTeacher } from "@/lib/server/session";
import { cn } from "@/lib/utils";

type Filter = "new" | "paid" | "all";

/** My orders, as on BDI: filter chips, then cards with a progress bar. */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const me = await requireTeacher("/orders");
  const sp = await searchParams;
  const filter: Filter = sp.s === "paid" || sp.s === "all" ? sp.s : "new";
  const all = await listMyOrders(me.id);
  const unpaid = all.filter((o) => o.status === "new");
  const rows = filter === "new" ? unpaid : filter === "paid" ? all.filter((o) => o.status === "paid") : all;

  const tabs: { key: Filter; label: string; badge?: number }[] = [
    { key: "new", label: "Төлөөгүй", badge: unpaid.length || undefined },
    { key: "paid", label: "Төлсөн" },
    { key: "all", label: "Бүгд" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 lg:px-8 lg:pt-8">
      <PageTitle title="Захиалга" />
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "new" ? "/orders" : `/orders?s=${t.key}`}
            className="chip"
            data-active={t.key === filter ? "" : undefined}
          >
            {t.label}
            {t.badge != null && <span className="tabular-nums opacity-70">{t.badge}</span>}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          text="Захиалга алга"
          action={
            <Link href="/" className={buttonClass("primary", "lg")}>
              Дэлгүүр
            </Link>
          }
        />
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((o) => (
            <OrderCard key={o.id} o={o} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ o }: { o: Order }) {
  const pieces = o.items.reduce((s, i) => s + i.qty, 0);
  const step = o.status === "cancelled" ? -1 : STATUS_STEPS.indexOf(o.status);
  const thumbs = o.items.slice(0, 4);
  return (
    <Link href={`/orders/${o.id}`} className="card group block p-4 transition-shadow hover:shadow-lift">
      <div className="flex items-center gap-2">
        <span className="text-[16px] font-extrabold tracking-tight">{o.order_number}</span>
        <StatusChip status={o.status} long className="ml-auto" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex -space-x-2">
          {thumbs.map((it, i) => (
            <span key={`${it.product_id ?? it.name}-${i}`} className="relative size-9 overflow-hidden rounded-lg bg-muted ring-2 ring-surface">
              <ProductImage src={it.image_url} alt={it.name} sizes="36px" small />
            </span>
          ))}
          {o.items.length > thumbs.length && (
            <span className="relative grid size-9 place-items-center rounded-lg bg-muted text-[11px] font-bold text-ink-2 ring-2 ring-surface">
              +{o.items.length - thumbs.length}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-[12px] font-medium text-ink-3">
          <div className="tabular-nums">{formatDateTime(o.created_at)}</div>
          <div>{pieces} ширхэг</div>
        </div>
        <span className="text-[16px] font-extrabold tracking-tight tabular-nums">{formatMnt(o.total)}</span>
        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-3.5 flex gap-1">
        {STATUS_STEPS.map((s, i) => (
          <span
            key={s}
            className={cn("h-1 flex-1 rounded-full", o.status === "cancelled" ? "bg-danger/20" : i <= step ? "bg-primary" : "bg-muted-strong")}
          />
        ))}
      </div>
    </Link>
  );
}
