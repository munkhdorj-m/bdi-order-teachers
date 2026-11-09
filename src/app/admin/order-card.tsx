"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Phone, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/shop-header";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDateTime, formatMnt, formatPhone } from "@/lib/format";
import type { AdminMove, AdminOrder } from "@/lib/server/orders";
import { moveOrderAction } from "./actions";

/** One order: who, what, how much, and the next step's button. */
export function AdminOrderCard({ order }: { order: AdminOrder }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  async function move(m: AdminMove) {
    const ok = await moveOrderAction(order.id, m);
    if (!ok) toast.error("Төлөв өөрчлөгдсөн байна. Дахин харна уу");
    router.refresh();
  }
  const run = (m: AdminMove) => start(() => move(m));

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <span className="text-[16px] font-extrabold tracking-tight">{order.order_number}</span>
        <StatusChip status={order.status} />
        <span className="ml-auto text-[12px] font-medium text-ink-3 tabular-nums">{formatDateTime(order.created_at)}</span>
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3">
        <Avatar name={order.account.full_name} size={30} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{order.account.full_name}</span>
        {order.account.phone && (
          <a
            href={`tel:${order.account.phone}`}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 text-[13px] font-semibold tabular-nums transition-colors hover:bg-muted-strong"
          >
            <Phone className="size-3.5" />
            {formatPhone(order.account.phone)}
          </a>
        )}
      </div>

      <ul className="mx-4 divide-y divide-line rounded-xl bg-muted/50 px-3">
        {order.items.map((it, i) => (
          <li key={`${it.product_id ?? it.name}-${i}`} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug">{it.name}</span>
            <span className="shrink-0 text-[14px] font-bold tabular-nums">× {it.qty}</span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mx-4 mt-2 whitespace-pre-line rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
          {order.note}
        </p>
      )}

      <div className="mt-auto px-4 pt-3 pb-4">
        <div className="flex min-h-9 items-center gap-2">
          <span className="mr-auto text-[18px] font-extrabold tracking-tight tabular-nums">{formatMnt(order.total)}</span>
          {order.status === "new" && (
            <ConfirmButton
              question={`${order.order_number} цуцлах уу?`}
              confirmLabel="Цуцлах"
              danger
              variant="ghost"
              size="sm"
              onConfirm={() => move("cancel")}
            >
              Цуцлах
            </ConfirmButton>
          )}
          {order.status === "paid" && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => run("unpay")}>
              <Undo2 />
              Буцаах
            </Button>
          )}
        </div>
        {order.status === "new" && (
          <Button variant="brand" className="mt-3 w-full" disabled={pending} onClick={() => run("pay")}>
            <Check strokeWidth={2.6} />
            Төлсөн
          </Button>
        )}
      </div>
    </article>
  );
}
