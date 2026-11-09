import Form from "next/form";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDateTime, formatMnt, formatPhone } from "@/lib/format";
import { listOrdersAdmin } from "@/lib/server/orders";
import { requireAdmin } from "@/lib/server/session";
import { dayLabel, isDayKey, lastUbDays, ubDayKey, ubDayStartIso } from "@/lib/ub-date";
import { PrintButton } from "./print-button";

const PERIODS = [
  { key: "7", label: "7 хоног" },
  { key: "30", label: "30 хоног" },
  { key: "all", label: "Бүгд" },
] as const;

function bringHref(paid: boolean, period: { d?: string; from?: string | null }) {
  const q = new URLSearchParams();
  if (period.from) q.set("from", period.from);
  else if (period.d && period.d !== "7") q.set("d", period.d);
  if (paid) q.set("paid", "1");
  const s = q.toString();
  return s ? `/admin/bring?${s}` : "/admin/bring";
}

/**
 * What to bring to school: one total per product, then each person's order
 * for handing out. Printable. The date range picks the batch (say, orders
 * since the last delivery). Desktop: totals and per-person cards side by side.
 */
export default async function BringPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; d?: string; from?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const onlyPaid = sp.paid === "1";
  const from = isDayKey(sp.from) ? sp.from : null;
  const period = sp.d === "30" || sp.d === "all" ? sp.d : "7";
  const startKey = from ?? (period === "all" ? null : lastUbDays(Number(period))[0]);
  const current = from ? { from } : { d: period };
  const periodLabel = from
    ? `${dayLabel(from)}-с хойш`
    : period === "all"
      ? "Бүх хугацаа"
      : `Сүүлийн ${period} хоног`;

  const orders = await listOrdersAdmin(onlyPaid ? ["paid"] : ["new", "paid"], startKey ? ubDayStartIso(startKey) : undefined);

  const byProduct = new Map<string, { key: string; name: string; qty: number; people: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const key = it.product_id ?? `name:${it.name}`;
      const row = byProduct.get(key) ?? { key, name: it.name, qty: 0, people: 0 };
      row.qty += it.qty;
      row.people += 1;
      byProduct.set(key, row);
    }
  }
  const rows = [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name, "mn"));
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const people = [...orders].sort(
    (a, b) => a.account.full_name.localeCompare(b.account.full_name, "mn") || a.created_at.localeCompare(b.created_at),
  );

  return (
    <>
      {/* One row of filters: date range first, then which orders. */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={bringHref(onlyPaid, { d: p.key })}
            className="chip"
            data-active={!from && period === p.key ? "" : undefined}
          >
            {p.label}
          </Link>
        ))}
        <Form action="/admin/bring" className="flex items-center gap-1.5">
          {onlyPaid && <input type="hidden" name="paid" value="1" />}
          <input
            type="date"
            name="from"
            aria-label="Эхлэх огноо"
            defaultValue={from ?? ""}
            max={ubDayKey(new Date())}
            data-active={from ? "" : undefined}
            className="h-9 rounded-full bg-surface px-3 text-[13px] font-semibold text-ink-2 ring-1 ring-line outline-none focus:ring-2 focus:ring-primary/45 data-[active]:bg-ink data-[active]:text-white data-[active]:ring-ink"
          />
          <button type="submit" className="chip">
            Харах
          </button>
        </Form>
        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <Link href={bringHref(false, current)} className="chip" data-active={!onlyPaid ? "" : undefined}>
          Төлөөгүй + Төлсөн
        </Link>
        <Link href={bringHref(true, current)} className="chip" data-active={onlyPaid ? "" : undefined}>
          Зөвхөн төлсөн
        </Link>
        {rows.length > 0 && <PrintButton />}
      </div>

      <h2 className="hidden text-[20px] font-bold print:block">
        Авчрах бараа · {periodLabel}
        {onlyPaid ? " · Зөвхөн төлсөн" : ""} · {formatDateTime(new Date().toISOString())}
      </h2>

      {rows.length === 0 ? (
        <EmptyState icon={<PackageOpen />} text="Авчрах бараа алга" />
      ) : (
        <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 print:block">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <span className="eyebrow">Нийт бараа</span>
              <span className="text-[12px] font-semibold text-ink-3">{orders.length} захиалга</span>
            </div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-line bg-muted/50 text-[12px] font-semibold text-ink-3">
                  <th className="px-4 py-2 font-semibold">Бараа</th>
                  <th className="w-16 px-2 py-2 text-right font-semibold">Хүн</th>
                  <th className="w-20 px-4 py-2 text-right font-semibold">Тоо</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-2.5 text-[14px] font-medium leading-snug">{r.name}</td>
                    <td className="px-2 py-2.5 text-right text-[13px] font-medium text-ink-3 tabular-nums">{r.people}</td>
                    <td className="px-4 py-2.5 text-right text-[17px] font-extrabold tabular-nums">{r.qty}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-muted/40 text-[14px] font-bold">
                  <td className="px-4 py-3">Нийт</td>
                  <td />
                  <td className="px-4 py-3 text-right text-[17px] font-extrabold tabular-nums">{totalQty}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <div>
            <h2 className="mb-3 text-[17px] font-bold print:mt-8">Хүн бүрээр</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
              {people.map((o) => (
                <section key={o.id} className="card break-inside-avoid overflow-hidden">
                  <div className="flex items-center gap-2 px-4 pt-3.5">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{o.account.full_name}</span>
                    <StatusChip status={o.status} />
                  </div>
                  <div className="flex justify-between px-4 pt-1 text-[12px] font-medium text-ink-3 tabular-nums">
                    <span>{formatPhone(o.account.phone)}</span>
                    <span>{o.order_number}</span>
                  </div>
                  <ul className="px-4 py-2.5">
                    {o.items.map((it, i) => (
                      <li key={`${it.product_id ?? it.name}-${i}`} className="flex gap-3 py-0.5 text-[13.5px] font-medium">
                        <span className="min-w-0 flex-1">{it.name}</span>
                        <span className="font-bold tabular-nums">× {it.qty}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-line bg-muted/40 px-4 py-2 text-right text-[15px] font-extrabold tabular-nums">
                    {formatMnt(o.total)}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
