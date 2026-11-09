"use client";

import { useState } from "react";
import type { DayPoint } from "@/lib/server/analytics";
import { formatMnt } from "@/lib/format";
import { dayLabel } from "@/lib/ub-date";
import { cn } from "@/lib/utils";

/** A round axis top just above the biggest day (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(v: number): number {
  if (v <= 0) return 1000;
  const m = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * m >= v) return s * m;
  return 10 * m;
}

/** Short axis numbers: 0 / 500 мян / 1.5 сая. */
function compact(n: number): string {
  if (n >= 1e6) return `${Number((n / 1e6).toFixed(1))} сая`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} мян`;
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
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...days.map((d) => d.paid + d.unpaid)));
  const empty = days.every((d) => d.orders === 0);
  const withOrders = days.filter((d) => d.orders > 0);
  const n = days.length;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-[12px] font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", PAID)} />
          Төлсөн
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px]", UNPAID)} />
          Төлөөгүй
        </span>
      </div>

      <div className="relative h-44 pl-12 md:h-56">
        {[1, 0.5, 0].map((f) => (
          <div
            key={f}
            aria-hidden="true"
            className={cn("absolute right-0 left-12 border-t", f === 0 ? "border-line-strong" : "border-line")}
            style={{ bottom: `${f * 100}%` }}
          >
            <span className="absolute -top-2 right-full mr-2 whitespace-nowrap text-[11px] font-medium text-ink-3 tabular-nums">
              {compact(max * f)}
            </span>
          </div>
        ))}

        {empty && (
          <div className="absolute inset-0 left-12 grid place-items-center text-[13px] font-semibold text-ink-3">
            Энэ хугацаанд захиалга алга
          </div>
        )}

        <div role="group" aria-label="Өдөр бүрийн борлуулалт" className="absolute inset-0 left-12 flex items-end">
          {days.map((d, i) => {
            const total = d.paid + d.unpaid;
            const on = active === i;
            const align = i < n * 0.2 ? "left-0" : i > n * 0.8 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <button
                key={d.key}
                type="button"
                aria-label={`${dayLabel(d.key)}: ${formatMnt(total)}, төлсөн ${formatMnt(d.paid)}, төлөөгүй ${formatMnt(d.unpaid)}, ${d.orders} захиалга`}
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
                    <span className={cn("w-full shrink-0 rounded-t-[4px]", UNPAID)} style={{ height: `${(d.unpaid / max) * 100}%` }} />
                  )}
                  {d.unpaid > 0 && d.paid > 0 && <span className="h-0.5 w-full shrink-0" />}
                  {d.paid > 0 && (
                    <span
                      className={cn("w-full shrink-0", PAID, d.unpaid === 0 && "rounded-t-[4px]")}
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
                    <span className="block text-[11px] font-semibold text-white/60 tabular-nums">{dayLabel(d.key)}</span>
                    <span className="block text-[15px] font-extrabold tabular-nums">{formatMnt(total)}</span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] tabular-nums">
                      <span className={cn("h-[3px] w-3 rounded-full", PAID)} />
                      <span className="font-bold">{formatMnt(d.paid)}</span>
                      <span className="text-white/60">Төлсөн</span>
                    </span>
                    <span className="flex items-center gap-2 text-[12px] tabular-nums">
                      <span className={cn("h-[3px] w-3 rounded-full", UNPAID)} />
                      <span className="font-bold">{formatMnt(d.unpaid)}</span>
                      <span className="text-white/60">Төлөөгүй</span>
                    </span>
                    <span className="mt-1 block text-[11px] text-white/60">{d.orders} захиалга</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-12 text-[11px] font-medium text-ink-3 tabular-nums">
        <span>{dayLabel(days[0].key)}</span>
        <span>{dayLabel(days[Math.floor(n / 2)].key)}</span>
        <span>{dayLabel(days[n - 1].key)}</span>
      </div>

      {withOrders.length > 0 && (
        <details className="mt-3">
          <summary className="w-fit cursor-pointer text-[12.5px] font-semibold text-ink-3 hover:text-ink">Хүснэгтээр харах</summary>
          <div className="thin-scrollbar mt-2 max-h-64 overflow-auto rounded-xl ring-1 ring-line">
            <table className="w-full text-left text-[13px] tabular-nums">
              <thead className="sticky top-0 bg-muted text-[12px] font-semibold text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-semibold">Өдөр</th>
                  <th className="px-3 py-2 text-right font-semibold">Захиалга</th>
                  <th className="px-3 py-2 text-right font-semibold">Төлсөн</th>
                  <th className="px-3 py-2 text-right font-semibold">Төлөөгүй</th>
                  <th className="px-3 py-2 text-right font-semibold">Нийт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {withOrders.map((d) => (
                  <tr key={d.key}>
                    <td className="px-3 py-1.5 font-medium">{dayLabel(d.key)}</td>
                    <td className="px-3 py-1.5 text-right">{d.orders}</td>
                    <td className="px-3 py-1.5 text-right">{formatMnt(d.paid)}</td>
                    <td className="px-3 py-1.5 text-right">{formatMnt(d.unpaid)}</td>
                    <td className="px-3 py-1.5 text-right font-bold">{formatMnt(d.paid + d.unpaid)}</td>
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
