"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { formatMnt } from "@/lib/format";
import { baseName, isGiftLine } from "@/lib/gift";
import type { AdminOrder } from "@/lib/server/orders";
import { cn } from "@/lib/utils";
import { editOrderAction } from "./actions";
import { GiftChip } from "./gift-chip";

/** «Засах» on an unpaid order: change quantities or remove lines, then save. */
export function EditOrderButton({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [pending, start] = useTransition();

  const q = (id: number, fallback: number) => qty[id] ?? fallback;
  const total = order.items.reduce(
    (s, it) => s + q(it.id, it.qty) * it.unit_price,
    0,
  );
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
      toast.success(t("Захиалгыг заслаа", "Order updated"));
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
        {t("Засах", "Edit")}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(v) => !pending && setOpen(v)}
        title={t(
          `${order.order_number} засах`,
          `Edit order ${order.order_number}`,
        )}
      >
        <ul className="divide-y divide-line rounded-2xl ring-1 ring-line">
          {order.items.map((it) => {
            const n = q(it.id, it.qty);
            const gift = isGiftLine(it);
            const name = gift ? baseName(it.name) : it.name;
            return (
              <li
                key={it.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  n === 0 && "opacity-50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-[13.5px] font-semibold leading-snug",
                      n === 0 && "line-through",
                    )}
                  >
                    {name}
                    {gift && <GiftChip label={t("Бэлэг", "Free")} />}
                  </div>
                  <div className="text-[12px] font-medium text-ink-3 tabular-nums">
                    {gift
                      ? t(`Үнэгүй × ${n}`, `Free × ${n}`)
                      : `${formatMnt(it.unit_price)} × ${n} = ${formatMnt(it.unit_price * n)}`}
                  </div>
                </div>
                {n === 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setQty((m) => ({ ...m, [it.id]: it.qty }))}
                  >
                    {t("Буцаах", "Undo")}
                  </Button>
                ) : (
                  <Stepper
                    qty={n}
                    onChange={(v) =>
                      setQty((m) => ({ ...m, [it.id]: Math.max(0, v) }))
                    }
                    tone="outline"
                    size="sm"
                    className="w-28"
                    label={t(`${name}: тоо`, `${name}: quantity`)}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-[14px] font-semibold">
            {t("Нийт", "Total")}
          </span>
          <span className="text-[22px] font-extrabold tabular-nums">
            {formatMnt(total)}
          </span>
        </div>
        {allRemoved && (
          <p className="mt-2 text-[13px] font-semibold text-danger">
            {t(
              "Бүх барааг хасах бол захиалгыг цуцална уу",
              "To remove everything, cancel the order instead",
            )}
          </p>
        )}
        <Button
          variant="primary"
          size="lg"
          className="mt-4 w-full"
          disabled={pending || allRemoved}
          onClick={save}
        >
          {pending && <Loader2 className="animate-spin" />}
          {t("Хадгалах", "Save")}
        </Button>
      </Sheet>
    </>
  );
}
