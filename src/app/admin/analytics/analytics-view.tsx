import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Coins, Receipt, ShoppingCart, Users } from "lucide-react";
import { CategoryIconTile, categoryVisual } from "@/lib/category-visual";
import { formatMnt } from "@/lib/format";
import { ANALYTICS_PERIODS, type Analytics } from "@/lib/server/analytics";
import { dayLabel } from "@/lib/ub-date";
import { cn } from "@/lib/utils";
import { SalesChart } from "./sales-chart";

const count = (n: number) => n.toLocaleString("mn-MN");

/**
 * Аналитик, as on BDI: totals for the last 7 / 30 / 90 days against the
 * days before, sales per day, how much is paid, and the top products,
 * buyers and categories. Cancelled orders are left out of every number.
 */
export function AnalyticsView({ a }: { a: Analytics }) {
  const days = a.days;
  const billed = a.paid.amount + a.unpaid.amount;
  const paidShare = billed > 0 ? a.paid.amount / billed : 0;
  const maxQty = Math.max(1, ...a.topProducts.map((p) => p.qty));
  const maxSpend = Math.max(1, ...a.topBuyers.map((b) => b.total));
  const maxCat = Math.max(1, ...a.categories.map((c) => c.revenue));

  return (
    <div className="space-y-4">
      {/* One row of filters, date range first. */}
      <div className="flex flex-wrap items-center gap-2">
        {ANALYTICS_PERIODS.map((p) => (
          <Link
            key={p}
            href={p === 30 ? "/admin/analytics" : `/admin/analytics?d=${p}`}
            className="chip"
            data-active={p === days ? "" : undefined}
          >
            {p} хоног
          </Link>
        ))}
        <span className="text-[12.5px] font-semibold text-ink-3 tabular-nums sm:ml-auto">
          {dayLabel(a.from)} – {dayLabel(a.to)} · өмнөх {days} хоногтой харьцуулав
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Coins />} label="Борлуулалт" value={formatMnt(a.now.revenue)} now={a.now.revenue} prev={a.prev.revenue} />
        <Kpi icon={<ShoppingCart />} label="Захиалга" value={count(a.now.orders)} now={a.now.orders} prev={a.prev.orders} />
        <Kpi icon={<Receipt />} label="Дундаж захиалга" value={formatMnt(a.now.avg)} now={a.now.avg} prev={a.prev.avg} />
        <Kpi icon={<Users />} label="Худалдан авагч" value={count(a.now.buyers)} now={a.now.buyers} prev={a.prev.buyers} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <section className="card p-4 sm:p-5 lg:col-span-2">
          <h2 className="mb-3 text-[15px] font-bold">Өдөр бүрийн борлуулалт</h2>
          <SalesChart days={a.daily} />
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="text-[15px] font-bold">Төлбөр</h2>
          <div
            role="img"
            aria-label={`Төлсөн ${Math.round(paidShare * 100)}%, төлөөгүй ${billed > 0 ? 100 - Math.round(paidShare * 100) : 0}%`}
            className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
          >
            {a.paid.amount > 0 && <span className="rounded-full bg-primary" style={{ width: `${paidShare * 100}%` }} />}
            {a.unpaid.amount > 0 && <span className="rounded-full bg-warn-dot" style={{ width: `${(1 - paidShare) * 100}%` }} />}
          </div>
          <dl className="mt-4 space-y-3">
            <PayRow swatch="bg-primary" label="Төлсөн" value={formatMnt(a.paid.amount)} sub={`${a.paid.count} захиалга`} />
            <PayRow swatch="bg-warn-dot" label="Төлөөгүй" value={formatMnt(a.unpaid.amount)} sub={`${a.unpaid.count} захиалга`} />
            <PayRow swatch="bg-danger" label="Цуцалсан" value={`${a.cancelled} захиалга`} />
          </dl>
        </section>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RankCard
          title="Шилдэг бараа"
          rows={a.topProducts.map((p) => ({
            key: p.key,
            label: p.name,
            value: `${count(p.qty)} ш`,
            sub: formatMnt(p.revenue),
            share: p.qty / maxQty,
          }))}
        />
        <RankCard
          title="Шилдэг худалдан авагч"
          rows={a.topBuyers.map((b) => ({
            key: b.id,
            label: b.name,
            value: formatMnt(b.total),
            sub: (
              <>
                {b.orders} захиалга
                {b.unpaid > 0 && <span className="text-warn"> · төлөөгүй {formatMnt(b.unpaid)}</span>}
              </>
            ),
            share: b.total / maxSpend,
          }))}
        />
        <RankCard
          title="Ангиллаар"
          rows={a.categories.map((c) => ({
            key: c.key,
            label: (
              <span className="flex min-w-0 items-center gap-1.5">
                <CategoryIconTile visual={categoryVisual(c)} size="xs" />
                <span className="truncate">{c.name}</span>
              </span>
            ),
            value: formatMnt(c.revenue),
            sub: `${count(c.qty)} ш`,
            share: c.revenue / maxCat,
          }))}
        />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, now, prev }: { icon: ReactNode; label: string; value: string; now: number; prev: number }) {
  const delta = prev > 0 ? ((now - prev) / prev) * 100 : null;
  const up = (delta ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink-3">{label}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-ink-2 [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 truncate text-[21px] font-extrabold tracking-tight tabular-nums sm:text-[26px]">{value}</div>
      {delta === null ? (
        <div className="mt-1 h-6 text-[12px] font-semibold text-ink-3">—</div>
      ) : (
        <div
          className={cn(
            "mt-1 inline-flex h-6 items-center gap-0.5 rounded-full px-2 text-[12px] font-bold tabular-nums",
            up ? "bg-primary-soft text-primary-ink" : "bg-danger-soft text-danger",
          )}
        >
          <Arrow className="size-3.5" strokeWidth={2.6} />
          {Math.abs(delta) < 10 ? Math.abs(delta).toFixed(1) : Math.round(Math.abs(delta))}%
        </div>
      )}
    </div>
  );
}

function PayRow({ swatch, label, value, sub }: { swatch: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("size-2.5 shrink-0 rounded-[3px]", swatch)} />
      <dt className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink-2">{label}</dt>
      <dd className="text-right">
        <div className="text-[14px] font-bold tabular-nums">{value}</div>
        {sub && <div className="text-[11.5px] font-medium text-ink-3 tabular-nums">{sub}</div>}
      </dd>
    </div>
  );
}

function RankCard({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: ReactNode; value: string; sub?: ReactNode; share: number }[];
}) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] font-semibold text-ink-3">Энэ хугацаанд алга</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {rows.map((r, i) => (
            <li key={r.key}>
              <div className="flex items-baseline gap-2">
                <span className="w-4 shrink-0 text-[12px] font-bold text-ink-3 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{r.label}</span>
                <span className="shrink-0 text-[13.5px] font-bold tabular-nums">{r.value}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 pl-6">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, r.share * 100)}%` }} />
                </span>
                {r.sub && <span className="shrink-0 text-[11.5px] font-medium text-ink-3 tabular-nums">{r.sub}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
