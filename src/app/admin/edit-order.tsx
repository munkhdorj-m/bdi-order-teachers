"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { formatMnt } from "@/lib/format";
import type { AdminOrder } from "@/lib/server/orders";
import { cn } from "@/lib/utils";
import { editOrderAction } from "./actions";

/** «Засах» on an unpaid order: change quantities or remove lines, then save. */
export function EditOrderButton({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [pending, start] = useTransition();

  const q = (id: number, fallback: number) => qty[id] ?? fallback;
  const total = order.items.reduce((s, it) => s + q(it.id, it.qty) * it.unit_price, 0);
  const allRemoved = order.items.every((it) => q(it.id, it.qty) === 0);

  function save() {
    const changes = order.items
      .filter((it) => q(it.id, it.qty) !== it.qty)
      .map((it) => ({ id: it.id, qty: q(it.id, it.qty) }));
    if (changes.length === 0) return setOpen(false);
    start(async () => {
      const res = await editOrderAction(order.id, changes);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Захиалгыг заслаа");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setQty({});
          setOpen(true);
        }}
      >
        <Pencil />
        Засах
      </Button>
      <Sheet open={open} onOpenChange={(v) => !pending && setOpen(v)} title={`${order.order_number} засах`}>
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {order.items.map((it) => {
            const n = q(it.id, it.qty);
            return (
              <li key={it.id} className={cn("flex items-center gap-3 px-3 py-2.5", n === 0 && "opacity-50")}>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[13.5px] font-semibold leading-snug", n === 0 && "line-through")}>{it.name}</div>
                  <div className="text-[12px] font-medium text-ink-3 tabular-nums">
                    {formatMnt(it.unit_price)} × {n} = {formatMnt(it.unit_price * n)}
                  </div>
                </div>
                {n === 0 ? (
                  <Button variant="secondary" size="sm" onClick={() => setQty((m) => ({ ...m, [it.id]: it.qty }))}>
                    Буцаах
                  </Button>
                ) : (
                  <Stepper
                    qty={n}
                    onChange={(v) => setQty((m) => ({ ...m, [it.id]: Math.max(0, v) }))}
                    tone="outline"
                    size="sm"
                    className="w-28"
                    label={`${it.name}: тоо`}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-[14px] font-semibold">Нийт</span>
          <span className="text-[22px] font-extrabold tabular-nums">{formatMnt(total)}</span>
        </div>
        {allRemoved && <p className="mt-2 text-[13px] font-semibold text-danger">Бүх барааг хасах бол захиалгыг цуцална уу</p>}
        <Button variant="primary" size="lg" className="mt-4 w-full" disabled={pending || allRemoved} onClick={save}>
          {pending && <Loader2 className="animate-spin" />}
          Хадгалах
        </Button>
      </Sheet>
    </>
  );
}
