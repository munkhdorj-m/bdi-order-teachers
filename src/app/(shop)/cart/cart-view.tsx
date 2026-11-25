"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { flushSync } from "react-dom";
import {
  Check,
  ChevronRight,
  Loader2,
  LogIn,
  Package,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DealNote } from "@/components/deal-note";
import { useLang } from "@/components/lang";
import { EmptyState, Notice, PageTitle } from "@/components/page-header";
import { ProductImage } from "@/components/product-image";
import { useCartPriceSync } from "@/components/use-cart-price-sync";
import { Button, buttonClass } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import {
  cartCount,
  cartGifts,
  cartTotal,
  itemName,
  clearCart,
  packParts,
  setQty,
  useCart,
} from "@/lib/cart";
import { BRAND_GRADIENT } from "@/lib/brand";
import { useCheckoutId } from "@/lib/checkout-id";
import { formatMnt } from "@/lib/format";
import { dealLabel, lineTotal, type Deal } from "@/lib/sale";
import { loginHref } from "@/lib/next-path";
import { packText } from "@/lib/pack-text";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { placeOrder } from "./actions";

const WRAP = "mx-auto max-w-6xl px-3 pt-4 sm:px-6 lg:px-8 lg:pt-8";

// The note survives the trip to the login page and back.
const NOTE_KEY = "bdi-shop-order-note";

function readNote(): string {
  try {
    return sessionStorage.getItem(NOTE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveNote(v: string) {
  try {
    if (v) sessionStorage.setItem(NOTE_KEY, v);
    else sessionStorage.removeItem(NOTE_KEY);
  } catch {
    /* private mode: the note just won't survive a reload */
  }
}

/**
 * The cart, as on BDI: one card per line (photo, price × qty, stepper,
 * remove), an optional note and the total. Phones get a sticky submit
 * bar; desktop keeps the summary beside the lines. Signed out, the button
 * opens the login page and comes back here.
 */
export function CartView({
  prices,
  packs,
  deals,
  closedMessage,
  signedIn,
}: {
  prices: Record<string, number>;
  packs: Record<string, number>;
  deals: Record<string, Deal>;
  closedMessage: string | null;
  signedIn: boolean;
}) {
  const items = useCart();
  const mounted = useMounted();
  const { lang, t } = useLang();
  useCartPriceSync(prices, packs, deals);
  // Only shown once mounted, so reading the browser's storage here is safe.
  const [note, setNoteState] = useState(readNote);
  const setNote = (v: string) => {
    setNoteState(v);
    saveNote(v);
  };
  const checkoutId = useCheckoutId();
  const [pending, start] = useTransition();
  // Set once the order is in: the emptied cart must not flash «Сагс хоосон»
  // while the order page opens.
  const [placed, setPlaced] = useState(false);
  const router = useRouter();

  if (placed) {
    return (
      <div className={WRAP}>
        <div className="flex flex-col items-center py-20 text-center animate-in fade-in duration-300">
          <span
            className="grid size-16 place-items-center rounded-full text-white shadow-[0_14px_30px_-12px_rgb(9_132_91/0.75)]"
            style={{ backgroundImage: BRAND_GRADIENT }}
          >
            <Check className="size-8" strokeWidth={3} />
          </span>
          <p className="mt-4 text-[18px] font-extrabold">
            {t("Захиалга илгээгдлээ", "Order sent")}
          </p>
          <Loader2 className="mt-3 size-5 animate-spin text-ink-3" />
        </div>
      </div>
    );
  }

  // The cart lives in this device's storage: wait for it before saying "empty".
  if (!mounted) {
    return (
      <div className={WRAP}>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={WRAP}>
        <PageTitle title={t("Сагс", "Cart")} />
        <EmptyState
          icon={<ShoppingCart />}
          text={t("Сагс хоосон", "Your cart is empty")}
          action={
            <Link href="/" className={buttonClass("primary", "lg")}>
              {t("Дэлгүүр", "Shop")}
            </Link>
          }
        />
      </div>
    );
  }

  function order() {
    const lines = items.map((i) => ({ product_id: i.product_id, qty: i.qty }));
    // Same cart + note again (say, after a dropped connection) = same id,
    // so the server returns the order it already made.
    const requestId = checkoutId(JSON.stringify([lines, note.trim()]));
    start(async () => {
      const res = await placeOrder({ requestId, items: lines, note });
      if (!res.ok) {
        toast.error(res.error);
        router.refresh(); // fresh prices / stock for the cart
        return;
      }
      // Show «sent» first, then empty the cart, then open the order.
      flushSync(() => setPlaced(true));
      clearCart();
      saveNote("");
      router.replace(`/orders/${res.orderId}?new=1`);
    });
  }

  const total = cartTotal(items);
  const pieces = cartCount(items);
  const gifts = cartGifts(items);
  const submit = (className: string) =>
    signedIn ? (
      <Button
        variant="primary"
        size="xl"
        className={className}
        disabled={pending || !!closedMessage}
        onClick={order}
      >
        {pending && <Loader2 className="animate-spin" />}
        {t("Захиалга илгээх", "Send order")}
        {!pending && <ChevronRight />}
      </Button>
    ) : (
      <Link
        href={loginHref("/cart")}
        className={buttonClass("primary", "xl", className)}
      >
        <LogIn />
        {t("Нэвтэрч захиалах", "Sign in to order")}
      </Link>
    );

  return (
    <div className={WRAP}>
      <PageTitle
        title={t("Сагс", "Cart")}
        sub={t(`${pieces} ширхэг`, `${pieces} pcs`)}
      />
      {closedMessage && (
        <div className="mt-4">
          <Notice>{closedMessage}</Notice>
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li
              key={it.product_id}
              className="card flex gap-3 p-3 sm:gap-4 sm:p-4"
            >
              <Link
                href={`/products/${it.product_id}`}
                aria-label={itemName(it, lang)}
                className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24"
              >
                <ProductImage
                  src={it.image_url}
                  alt={itemName(it, lang)}
                  category={
                    it.category_name
                      ? { name: it.category_name, icon: it.category_icon }
                      : null
                  }
                  sizes="96px"
                  small
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start gap-2">
                  <Link
                    href={`/products/${it.product_id}`}
                    className="line-clamp-2 min-w-0 flex-1 text-[14px] font-semibold leading-snug hover:underline sm:text-[15px]"
                  >
                    {itemName(it, lang)}
                  </Link>
                  <button
                    type="button"
                    aria-label={t("Хасах", "Remove")}
                    onClick={() => setQty(it, 0)}
                    className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-0.5 text-[12.5px] font-medium text-ink-3 tabular-nums">
                  {formatMnt(it.unit_price)} × {it.qty}
                  {it.was_price ? (
                    <span className="ml-1.5 line-through">
                      {formatMnt(it.was_price)}
                    </span>
                  ) : null}
                  {(it.pack ?? 1) > 1 &&
                    packParts(it.qty, it.pack).packs > 0 && (
                      <span className="ml-1.5 font-semibold text-info">
                        = {packText(packParts(it.qty, it.pack), t)}
                      </span>
                    )}
                </div>
                {it.deal && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                      {dealLabel(it.deal)}
                    </span>
                    <DealNote qty={it.qty} deal={it.deal} next />
                  </div>
                )}
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <Stepper
                    qty={it.qty}
                    onChange={(n) => setQty(it, n)}
                    tone="outline"
                    size="sm"
                    keepOne
                    className="w-28"
                    label={t(
                      `${itemName(it, lang)}: тоо`,
                      `${itemName(it, lang)}: quantity`,
                    )}
                  />
                  {(it.pack ?? 1) > 1 && (
                    <button
                      type="button"
                      onClick={() => setQty(it, it.qty + (it.pack ?? 1))}
                      title={t(
                        `Нэг багц (${it.pack}ш) нэмэх`,
                        `Add a pack (${it.pack} pcs)`,
                      )}
                      aria-label={t(
                        `Нэг багц (${it.pack}ш) нэмэх`,
                        `Add a pack (${it.pack} pcs)`,
                      )}
                      className="flex h-9 items-center gap-1 rounded-xl bg-info-soft px-2.5 text-[12.5px] font-bold text-info transition-colors hover:bg-info hover:text-white"
                    >
                      <Package className="size-3.5" strokeWidth={2.4} />+
                      {it.pack}
                    </button>
                  )}
                  <span className="ml-auto text-[16px] font-extrabold tracking-tight tabular-nums">
                    {formatMnt(lineTotal(it.qty, it.unit_price))}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-[calc(4rem+2rem)]">
          <div className="card p-4 sm:p-5">
            <label htmlFor="note" className="label">
              {t("Тэмдэглэл", "Note")}
            </label>
            <textarea
              id="note"
              className="field"
              rows={3}
              maxLength={500}
              placeholder={t("Заавал биш", "Optional")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-5 space-y-2 border-t border-line pt-4">
              <div className="flex items-baseline justify-between text-[13px] font-medium text-ink-3">
                <span>{t("Бараа", "Items")}</span>
                <span className="tabular-nums">
                  {t(
                    `${items.length} төрөл · ${pieces} ширхэг`,
                    `${items.length} ${items.length === 1 ? "product" : "products"} · ${pieces} pcs`,
                  )}
                </span>
              </div>
              {gifts > 0 && (
                <div className="flex items-baseline justify-between text-[13px] font-semibold text-primary-ink">
                  <span>{t("Бэлэг", "Free")}</span>
                  <span className="tabular-nums">{t(`+${gifts} ширхэг үнэгүй`, `+${gifts} pcs at no cost`)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold">
                  {t("Нийт", "Total")}
                </span>
                <span className="text-[26px] font-extrabold tracking-tight tabular-nums">
                  {formatMnt(total)}
                </span>
              </div>
            </div>
            {submit("mt-4 hidden w-full lg:flex")}
          </div>
        </aside>
      </div>

      {/* Phones / tablets: sticky submit bar. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/90 px-3 py-3 backdrop-blur-xl lg:hidden print:hidden",
          "md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="leading-tight">
            <div className="text-[11.5px] font-semibold text-ink-3">
              {t("Нийт", "Total")}
            </div>
            <div className="text-[19px] font-extrabold tracking-tight tabular-nums">
              {formatMnt(total)}
            </div>
          </div>
          {submit("flex-1")}
        </div>
      </div>
      <div className="h-24 lg:hidden" />
    </div>
  );
}
