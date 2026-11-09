"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { setQty, useCartQty, type CartItem } from "@/lib/cart";
import { useMounted } from "@/lib/use-mounted";

/** Add to cart: a sticky bar on phones, inline from md up. */
export function ProductBuy({
  product,
  soldOut,
  closed,
}: {
  product: Omit<CartItem, "qty">;
  soldOut: boolean;
  closed: boolean;
}) {
  const qty = useCartQty(product.product_id);
  const mounted = useMounted();

  const body =
    soldOut || closed ? (
      <div className="grid h-12 select-none place-items-center rounded-xl bg-muted text-[14px] font-semibold text-ink-3">
        {soldOut ? "Дууссан" : "Хаалттай"}
      </div>
    ) : !mounted ? (
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
    ) : qty === 0 ? (
      <Button variant="brand" size="lg" className="w-full" onClick={() => setQty(product, 1)}>
        <Plus strokeWidth={2.6} />
        Сагсанд нэмэх
      </Button>
    ) : (
      <div className="flex gap-2">
        <Stepper qty={qty} onChange={(n) => setQty(product, n)} size="lg" className="flex-1" label={`${product.name}: тоо`} />
        <Link href="/cart" className={buttonClass("primary", "lg", "flex-1")}>
          Сагс
          <ChevronRight />
        </Link>
      </div>
    );

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/90 px-3 py-3 backdrop-blur-xl md:hidden print:hidden">
        {body}
      </div>
      <div className="mt-6 hidden max-w-md md:block">{body}</div>
    </>
  );
}
