"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/lang";
import { syncCartPrices } from "@/lib/cart";
import type { Deal } from "@/lib/sale";

/**
 * On opening the cart: apply today's prices and drop what can't be
 * ordered any more (from BDI's use-cart-price-sync.ts), so the total
 * shown is the total the order will have.
 */
export function useCartPriceSync(
  prices: Record<string, number>,
  packs: Record<string, number> = {},
  deals: Record<string, Deal> = {},
) {
  const { t } = useLang();
  useEffect(() => {
    const { repriced, removed } = syncCartPrices(prices, packs, deals);
    if (removed.length === 1) toast.warning(t(`«${removed[0]}» дууссан тул хасагдлаа`, `«${removed[0]}» is sold out and was removed`));
    else if (removed.length > 1) toast.warning(t(`${removed.length} бараа дууссан тул хасагдлаа`, `${removed.length} sold-out items were removed`));
    if (repriced > 0) toast.info(t("Үнэ өөрчлөгдсөн, шинэ үнээр тооцлоо", "Prices changed; the total uses the new prices"));
    // t only changes with the language; re-syncing then is harmless.
  }, [prices, packs, deals, t]);
}
