"use client";

import { useState } from "react";
import { useLang } from "@/components/lang";
import type { DayPoint } from "@/lib/server/analytics";
import { formatMnt } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { dayLabel } from "@/lib/ub-date";
import { cn } from "@/lib/utils";

/** A round axis top just above the biggest day (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const m = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * m >= v) return s * m;
  return 10 * m;
}

/** Short axis numbers: 0 / 500 мян / 1.5 сая (EN: 500K / 1.5M). */
function compact(n: number, lang: Lang): string {
  if (n >= 1e6)
    return lang === "en"
      ? `${Number((n / 1e6).toFixed(1))}M`
      : `${Number((n / 1e6).toFixed(1))} сая`;
  if (n >= 1e3)
    return lang === "en"
      ? `${Math.round(n / 1e3)}K`
      : `${Math.round(n / 1e3)} мян`;
  return String(Math.round(n));
}

const PAID = "bg-primary";
const UNPAID = "bg-warn-dot";

/**
 * Sales per day as stacked columns: paid (green) under unpaid (amber),
 * a 2px gap between them. Every column is a button: hover or focus shows
 * the day's numbers. The same numbers are in the table below.
 */
export function SalesChart({ days }: { days: DayPoint[] }) {
  const { lang, t } = useLang();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...days.map((d) => d.paid + d.unpaid)));
  const empty = days.every((d) => d.orders === 0);
  const withOrders = days.filter((d) => d.orders > 0);
  const n = days.length;
  const paidWord = t("Төлсөн", "Paid");
  const unpaidWord = t("Төлөөгүй", "Unpaid");
  const orders = (k: number) =>
    t(`${k} захиалга`, `${k} ${k === 1 ? "order" : "orders"}`);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-[12px] font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", PAID)} />
          {paidWord}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", UNPAID)} />
          {unpaidWord}
        </span>
      </div>

      <div className="relative h-44 pl-12 md:h-56">
        {[1, 0.5, 0].map((f) => (
          <div
            key={f}
            aria-hidden="true"
            className={cn(
              "absolute right-0 left-12 border-t",
              f === 0 ? "border-line-strong" : "border-line",
            )}
            style={{ bottom: `${f * 100}%` }}
          >
            <span className="absolute -top-2 right-full mr-2 whitespace-nowrap text-[11px] font-medium text-ink-3 tabular-nums">
              {compact(max * f, lang)}
            </span>
          </div>
        ))}

        {empty && (
          <div className="absolute inset-0 left-12 grid place-items-center text-[13px] font-semibold text-ink-3">
            {t("Энэ хугацаанд захиалга алга", "No orders in this period")}
          </div>
        )}

        <div
          role="group"
          aria-label={t("Өдөр бүрийн борлуулалт", "Sales per day")}
          className="absolute inset-0 left-12 flex items-end"
        >
          {days.map((d, i) => {
            const total = d.paid + d.unpaid;
            const on = active === i;
            const align =
              i < n * 0.2
                ? "left-0"
                : i > n * 0.8
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2";
            return (
              <button
                key={d.key}
                type="button"
                aria-label={`${dayLabel(d.key, lang)}: ${formatMnt(total)}, ${paidWord.toLowerCase()} ${formatMnt(d.paid)}, ${unpaidWord.toLowerCase()} ${formatMnt(d.unpaid)}, ${orders(d.orders)}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn(
                  "relative flex h-full min-w-0 flex-1 items-end justify-center rounded-md outline-none focus-visible:bg-muted",
                  on && "bg-muted/70",
                )}
              >
                <span className="flex h-full w-full max-w-6 flex-col justify-end px-px">
                  {d.unpaid > 0 && (
                    <span
                      className={cn("w-full shrink-0 rounded-t-[4px]", UNPAID)}
                      style={{ height: `${(d.unpaid / max) * 100}%` }}
                    />
                  )}
                  {d.unpaid > 0 && d.paid > 0 && (
                    <span className="h-0.5 w-full shrink-0" />
                  )}
                  {d.paid > 0 && (
                    <span
                      className={cn(
                        "w-full shrink-0",
                        PAID,
                        d.unpaid === 0 && "rounded-t-[4px]",
                      )}
                      style={{ height: `${(d.paid / max) * 100}%` }}
                    />
                  )}
                </span>

                {on && (
                  <span
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-2 min-w-36 rounded-xl bg-ink px-3 py-2 text-left text-white shadow-lift",
                      align,
                    )}
                  >
                    <span className="block text-[11px] font-semibold text-white/60 tabular-nums">
                      {dayLabel(d.key, lang)}
                    </span>
                    <span className="block text-[15px] font-extrabold tabular-nums">
                      {formatMnt(total)}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] tabular-nums">
                      <span className={cn("h-[3px] w-3 rounded-full", PAID)} />
                      <span className="font-bold">{formatMnt(d.paid)}</span>
                      <span className="text-white/60">{paidWord}</span>
                    </span>
                    <span className="flex items-center gap-2 text-[12px] tabular-nums">
                      <span
                        className={cn("h-[3px] w-3 rounded-full", UNPAID)}
                      />
                      <span className="font-bold">{formatMnt(d.unpaid)}</span>
                      <span className="text-white/60">{unpaidWord}</span>
                    </span>
                    <span className="mt-1 block text-[11px] text-white/60">
                      {orders(d.orders)}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-12 text-[11px] font-medium text-ink-3 tabular-nums">
        <span>{dayLabel(days[0].key, lang)}</span>
        <span>{dayLabel(days[Math.floor(n / 2)].key, lang)}</span>
        <span>{dayLabel(days[n - 1].key, lang)}</span>
      </div>

      {withOrders.length > 0 && (
        <details className="mt-3">
          <summary className="w-fit cursor-pointer text-[12.5px] font-semibold text-ink-3 hover:text-ink">
            {t("Хүснэгтээр харах", "Show as a table")}
          </summary>
          <div className="thin-scrollbar mt-2 max-h-64 overflow-auto rounded-xl ring-1 ring-line">
            <table className="w-full text-left text-[13px] tabular-nums">
              <thead className="sticky top-0 bg-muted text-[12px] font-semibold text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-semibold">
                    {t("Өдөр", "Day")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {t("Захиалга", "Orders")}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {paidWord}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {unpaidWord}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {t("Нийт", "Total")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {withOrders.map((d) => (
                  <tr key={d.key}>
                    <td className="px-3 py-1.5 font-medium">
                      {dayLabel(d.key, lang)}
                    </td>
                    <td className="px-3 py-1.5 text-right">{d.orders}</td>
                    <td className="px-3 py-1.5 text-right">
                      {formatMnt(d.paid)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {formatMnt(d.unpaid)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold">
                      {formatMnt(d.paid + d.unpaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
