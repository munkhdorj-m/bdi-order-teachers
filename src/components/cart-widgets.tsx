"use client";

import Link from "next/link";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { CartBadge, useCartBadge } from "@/components/bottom-tabs";
import { useLang } from "@/components/lang";
import { ProductImage } from "@/components/product-image";
import { buttonClass } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import {
  cartCount,
  cartTotal,
  itemName,
  packParts,
  setQty,
  useCart,
} from "@/lib/cart";
import { formatMnt } from "@/lib/format";
import { lineTotal } from "@/lib/sale";
import { packText } from "@/lib/pack-text";
import { useMounted } from "@/lib/use-mounted";

/**
 * Floating "what's in my cart" bar on the catalog (phones and tablets, as
 * on BDI): appears once something is added and opens the cart in one tap.
 */
export function CartBar() {
  const items = useCart();
  const badge = useCartBadge();
  const { t } = useLang();
  if (items.length === 0) return null;
  const total = cartTotal(items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.625rem)] z-30 px-3 md:bottom-6 xl:hidden print:hidden">
      <Link
        href="/cart"
        aria-label={t(
          `Сагс: ${items.length} бараа, ${formatMnt(total)}`,
          `Cart: ${items.length} items, ${formatMnt(total)}`,
        )}
        className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-ink py-2.5 pr-4 pl-2.5 text-white shadow-float transition-transform duration-150 animate-in fade-in slide-in-from-bottom-3 active:scale-[0.98]"
      >
        <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
          <ShoppingCart className="size-5" />
          <CartBadge
            {...badge}
            className="absolute -top-1.5 -right-1.5 ring-ink"
          />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[11.5px] font-medium text-white/60">
            {t(
              `${items.length} төрөл · ${cartCount(items)} ширхэг`,
              `${items.length} ${items.length === 1 ? "product" : "products"} · ${cartCount(items)} pcs`,
            )}
          </span>
          <span className="block text-[16px] font-bold tabular-nums">
            {formatMnt(total)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[14px] font-semibold">
          {t("Сагс", "Cart")}
          <ChevronRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}

/** Wide screens: the cart sits beside the catalog, always in view. */
export function CartPanel() {
  const items = useCart();
  const mounted = useMounted();
  const { lang, t } = useLang();
  return (
    <div className="card flex max-h-[calc(100dvh-7rem)] flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
        <ShoppingCart className="size-[18px]" />
        <span className="text-[15px] font-bold">{t("Сагс", "Cart")}</span>
        {items.length > 0 && (
          <span className="ml-auto text-[12px] font-semibold text-ink-3 tabular-nums">
            {t(
              `${items.length} бараа`,
              `${items.length} ${items.length === 1 ? "item" : "items"}`,
            )}
          </span>
        )}
      </div>

      {!mounted ? (
        <div className="m-4 h-24 animate-pulse rounded-xl bg-muted" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-muted text-ink-3">
            <ShoppingCart className="size-5" />
          </span>
          <span className="text-[13px] font-semibold text-ink-3">
            {t("Сагс хоосон", "Cart is empty")}
          </span>
        </div>
      ) : (
        <>
          <ul className="thin-scrollbar flex-1 divide-y divide-line overflow-y-auto">
            {items.map((it) => (
              <li key={it.product_id} className="flex gap-3 px-4 py-3">
                <Link
                  href={`/products/${it.product_id}`}
                  className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted"
                  aria-label={itemName(it, lang)}
                >
                  <ProductImage
                    src={it.image_url}
                    alt={itemName(it, lang)}
                    category={
                      it.category_name
                        ? { name: it.category_name, icon: it.category_icon }
                        : null
                    }
                    sizes="48px"
                    small
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[12.5px] font-semibold leading-snug">
                    {itemName(it, lang)}
                  </div>
                  {(it.pack ?? 1) > 1 &&
                    packParts(it.qty, it.pack).packs > 0 && (
                      <div className="text-[11px] font-semibold text-info tabular-nums">
                        {it.qty}
                        {t("ш", " pcs")} ={" "}
                        {packText(packParts(it.qty, it.pack), t)}
                      </div>
                    )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <Stepper
                      qty={it.qty}
                      onChange={(n) => setQty(it, n)}
                      tone="outline"
                      size="sm"
                      className="w-[6.5rem]"
                      label={t(
                        `${itemName(it, lang)}: тоо`,
                        `${itemName(it, lang)}: quantity`,
                      )}
                    />
                    <span className="ml-auto text-[13px] font-bold tabular-nums">
                      {formatMnt(lineTotal(it.qty, it.unit_price, it.deal))}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-line p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-ink-2">
                {t("Нийт", "Total")}
              </span>
              <span className="text-[20px] font-extrabold tabular-nums tracking-tight">
                {formatMnt(cartTotal(items))}
              </span>
            </div>
            <Link
              href="/cart"
              className={buttonClass("primary", "lg", "w-full")}
            >
              {t("Захиалах", "Checkout")}
              <ChevronRight />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
