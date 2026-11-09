import Link from "next/link";
import { Check } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusChip } from "@/components/ui/status-chip";
import { BRAND_GRADIENT } from "@/lib/brand";
import { compactIban, formatIban } from "@/lib/iban";
import { formatDateTime, formatMnt } from "@/lib/format";
import type { Order } from "@/lib/server/orders";
import type { ShopSettings } from "@/lib/server/settings";
import { cn } from "@/lib/utils";
import { CancelOrderButton } from "./cancel-button";
import { ReorderButton } from "./reorder-button";

/**
 * One order, as on BDI: status with a timeline, what was ordered, the note,
 * and reorder. While unpaid, the payment details sit on a dark card with
 * copy buttons. Desktop: details left, payment and actions right.
 */
export function OrderView({
  order,
  settings,
  phone,
  justPlaced = false,
}: {
  order: Order;
  settings: ShopSettings;
  phone: string;
  justPlaced?: boolean;
}) {
  const unpaid = order.status === "new";
  const pay = <PayCard order={order} settings={settings} transferNote={`${order.order_number} ${phone}`} />;
  const lines = order.items.map((i) => ({
    product_id: i.product_id,
    name: i.name,
    image_url: i.image_url,
    qty: i.qty,
    unit_price: i.unit_price,
  }));
  const actions = (className: string) => (
    <div className={className}>
      {unpaid && <CancelOrderButton orderId={order.id} className="flex-1" />}
      <ReorderButton lines={lines} className="flex-1" />
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 lg:px-8 lg:pt-8">
      {justPlaced && unpaid && <PlacedHero order={order} />}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="eyebrow">Захиалга</span>
        <h1 className="text-[24px] font-extrabold leading-tight md:text-[28px]">{order.order_number}</h1>
        <span className="ml-auto text-[12.5px] font-medium text-ink-3 tabular-nums">{formatDateTime(order.created_at)}</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
        <div className="space-y-5">
          <StatusCard order={order} />
          {unpaid && <div className="lg:hidden">{pay}</div>}
          <Items order={order} />
          {order.note && (
            <section className="card p-4 sm:p-5">
              <div className="eyebrow">Тэмдэглэл</div>
              <p className="mt-1.5 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-ink-2">{order.note}</p>
            </section>
          )}
        </div>

        <aside className="hidden space-y-3 lg:sticky lg:top-[calc(4rem+2rem)] lg:block">
          {unpaid && pay}
          {actions("flex gap-2")}
        </aside>
      </div>

      {/* Phones / tablets: sticky actions. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/90 px-3 py-3 backdrop-blur-xl md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden print:hidden">
        {actions("mx-auto flex max-w-2xl gap-2")}
      </div>
      <div className="h-24 lg:hidden" />
    </div>
  );
}

function PlacedHero({ order }: { order: Order }) {
  const stats = [
    { label: "Бараа", value: String(order.items.length) },
    { label: "Нийт", value: formatMnt(order.total) },
    { label: "Дугаар", value: order.order_number },
  ];
  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-surface px-6 pt-8 pb-5 text-center shadow-card ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-500">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgb(20 176 123 / 0.16), transparent 45%), radial-gradient(circle at 85% 90%, rgb(9 132 91 / 0.12), transparent 45%)",
        }}
      />
      <div className="relative">
        <div
          className="mx-auto grid size-18 place-items-center rounded-full text-white shadow-[0_16px_36px_-12px_rgb(9_132_91/0.75)]"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >
          <Check className="size-9" strokeWidth={3} />
        </div>
        <h2 className="mt-4 text-[22px] font-extrabold">Захиалга илгээгдлээ</h2>
        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3 rounded-2xl bg-surface/80 px-4 py-3 ring-1 ring-line">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="text-[11px] font-semibold text-ink-3">{s.label}</div>
              <div className="truncate text-[14px] font-bold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
        <Link href="/" className={buttonClass("ghost", "sm", "mt-3")}>
          Дэлгүүр рүү буцах
        </Link>
      </div>
    </section>
  );
}

function StatusCard({ order }: { order: Order }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <StatusChip status={order.status} long />
        <div className="text-right">
          <div className="text-[11.5px] font-semibold text-ink-3">Нийт</div>
          <div className="text-[20px] font-extrabold tracking-tight tabular-nums">{formatMnt(order.total)}</div>
        </div>
      </div>
      <Timeline order={order} />
    </section>
  );
}

type Tone = "done" | "current" | "pending" | "cancelled";

/** Захиалсан → Төлсөн, with times. */
function Timeline({ order }: { order: Order }) {
  const rows: { label: string; at: string | null; tone: Tone }[] =
    order.status === "cancelled"
      ? [
          { label: "Захиалсан", at: order.created_at, tone: "done" },
          { label: "Цуцалсан", at: order.cancelled_at, tone: "cancelled" },
        ]
      : [
          { label: "Захиалсан", at: order.created_at, tone: "done" },
          { label: "Төлсөн", at: order.paid_at, tone: order.status === "paid" ? "done" : "current" },
        ];
  return (
    <ol className="mt-6 grid grid-cols-2">
      {rows.map((r, i) => (
        <li key={r.label} className="relative flex flex-col items-center text-center">
          {i > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-3.5 right-1/2 left-[-50%] h-0.5",
                r.tone === "done" ? "bg-primary" : r.tone === "cancelled" ? "bg-danger/30" : "bg-muted-strong",
              )}
            />
          )}
          <Dot tone={r.tone} />
          <span className={cn("mt-2 px-1 text-[12px] font-bold leading-tight", r.tone === "pending" && "text-ink-3")}>{r.label}</span>
          <span className="mt-0.5 text-[11px] font-medium text-ink-3 tabular-nums">{r.at ? formatDateTime(r.at).slice(5) : "—"}</span>
        </li>
      ))}
    </ol>
  );
}

function Dot({ tone }: { tone: Tone }) {
  const base = "relative z-[1] grid size-7 place-items-center rounded-full";
  if (tone === "done")
    return (
      <span className={cn(base, "bg-primary text-white")}>
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  if (tone === "current")
    return (
      <span className={cn(base, "bg-warn-soft ring-2 ring-warn-dot")}>
        <span className="size-2 animate-pulse rounded-full bg-warn-dot" />
      </span>
    );
  if (tone === "cancelled")
    return (
      <span className={cn(base, "bg-danger-soft ring-2 ring-danger")}>
        <span className="size-2 rounded-full bg-danger" />
      </span>
    );
  return (
    <span className={cn(base, "bg-muted ring-1 ring-line")}>
      <span className="size-1.5 rounded-full bg-ink-3/50" />
    </span>
  );
}

function PayCard({ order, settings, transferNote }: { order: Order; settings: ShopSettings; transferNote: string }) {
  const rows: { label: string; value: string; copy?: string }[] = [
    { label: "Банк", value: settings.bank_name },
    { label: "Дансны дугаар", value: settings.account_number },
    { label: "IBAN", value: formatIban(settings.iban), copy: compactIban(settings.iban) },
    { label: "Данс эзэмшигч", value: settings.account_name },
    { label: "Гүйлгээний утга", value: transferNote },
  ].filter((r) => r.value.trim());
  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/45 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 size-64 rounded-full bg-primary-bright/15 blur-3xl" />
      <div className="relative">
        <div className="text-[12px] font-semibold text-white/55">Төлөх дүн</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-[32px] font-extrabold leading-none tracking-tight tabular-nums">{formatMnt(order.total)}</div>
          <CopyButton value={String(Math.round(order.total))} dark />
        </div>
        <dl className="mt-5 divide-y divide-white/10 border-t border-white/10">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <dt className="text-[11.5px] font-semibold text-white/50">{r.label}</dt>
                <dd className="mt-0.5 break-words text-[15.5px] font-bold tabular-nums">{r.value}</dd>
              </div>
              <CopyButton value={r.copy ?? r.value} dark />
            </div>
          ))}
        </dl>
        {settings.note.trim() && (
          <p className="mt-1 whitespace-pre-line rounded-xl bg-white/5 px-3 py-2.5 text-[13px] font-medium text-white/75">
            {settings.note}
          </p>
        )}
      </div>
    </section>
  );
}

function Items({ order }: { order: Order }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-4 pt-4 pb-1 sm:px-5">
        <span className="eyebrow">Бараа · {order.items.length}</span>
      </div>
      <ul className="divide-y divide-line">
        {order.items.map((it, i) => {
          const photo = (
            <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-muted">
              <ProductImage src={it.image_url} alt={it.name} sizes="48px" small />
            </span>
          );
          return (
            <li key={`${it.product_id ?? it.name}-${i}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              {it.product_id ? (
                <Link href={`/products/${it.product_id}`} aria-label={it.name}>
                  {photo}
                </Link>
              ) : (
                photo
              )}
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-[14px] font-semibold leading-snug">{it.name}</div>
                <div className="mt-0.5 text-[12.5px] font-medium text-ink-3 tabular-nums">
                  {formatMnt(it.unit_price)} × {it.qty}
                </div>
              </div>
              <div className="text-[15px] font-bold tabular-nums">{formatMnt(it.line_total)}</div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between border-t border-line bg-muted/40 px-4 py-3.5 sm:px-5">
        <span className="text-[14px] font-semibold">Нийт</span>
        <span className="text-[20px] font-extrabold tracking-tight tabular-nums">{formatMnt(order.total)}</span>
      </div>
    </section>
  );
}
