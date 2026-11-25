"use client";

import Link from "next/link";
import { ChevronRight, Package, Plus } from "lucide-react";
import { useLang } from "@/components/lang";
import { Button, buttonClass } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { packParts, setQty, useCartQty, type CartItem } from "@/lib/cart";
import { useMounted } from "@/lib/use-mounted";

/**
 * Add to cart: a sticky bar on phones, inline from md up. Products that
 * also come as a багц get two buttons: one piece, or a whole багц.
 */
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
  const { t } = useLang();
  const pack = (product.pack ?? 1) > 1 ? product.pack! : 0;
  const parts = packParts(qty, pack || 1);

  const packButton = (label: string, className: string) => (
    <Button variant="secondary" size="lg" className={className} onClick={() => setQty(product, qty + pack)}>
      <Package />
      {label}
    </Button>
  );

  const body =
    soldOut || closed ? (
      <div className="grid h-12 select-none place-items-center rounded-xl bg-muted text-[14px] font-semibold text-ink-3">
        {soldOut ? t("Дууссан", "Sold out") : t("Хаалттай", "Closed")}
      </div>
    ) : !mounted ? (
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
    ) : qty === 0 ? (
      pack ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="brand" size="lg" onClick={() => setQty(product, 1)}>
            <Plus strokeWidth={2.6} />
            {t("1 ширхэг", "1 piece")}
          </Button>
          {packButton(t(`Багц (${pack}ш)`, `Pack (${pack} pcs)`), "!bg-info-soft !text-info hover:!bg-info hover:!text-white")}
        </div>
      ) : (
        <Button variant="brand" size="lg" className="w-full" onClick={() => setQty(product, 1)}>
          <Plus strokeWidth={2.6} />
          {t("Сагсанд нэмэх", "Add to cart")}
        </Button>
      )
    ) : (
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Stepper
            qty={qty}
            onChange={(n) => setQty(product, n)}
            size="lg"
            className="min-w-0 flex-1"
            label={t(`${product.name}: тоо`, `${product.name}: quantity`)}
          />
          {pack > 0 &&
            packButton(`+${pack}`, "shrink-0 px-3 !bg-info-soft !text-info hover:!bg-info hover:!text-white")}
          <Link href="/cart" className={buttonClass("primary", "lg", "flex-1")}>
            {t("Сагс", "Cart")}
            <ChevronRight />
          </Link>
        </div>
        {pack > 0 && (
          <p className="text-[12.5px] font-semibold text-ink-3 tabular-nums">
            {qty} {t("ширхэг", "pcs")}
            {parts.packs > 0 &&
              ` = ${parts.packs} ${t("багц", parts.packs === 1 ? "pack" : "packs")}` +
                (parts.rest ? ` + ${parts.rest} ${t("ш", "pcs")}` : "")}
            {" · "}
            {t(`«+${pack}» нэг багц нэмнэ`, `«+${pack}» adds a pack`)}
          </p>
        )}
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
