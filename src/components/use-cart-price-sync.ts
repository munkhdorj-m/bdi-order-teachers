"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { syncCartPrices } from "@/lib/cart";

/**
 * On opening the cart: apply today's prices and drop what can't be
 * ordered any more (from BDI's use-cart-price-sync.ts), so the total
 * shown is the total the order will have.
 */
export function useCartPriceSync(prices: Record<string, number>) {
  useEffect(() => {
    const { repriced, removed } = syncCartPrices(prices);
    if (removed.length === 1) toast.warning(`«${removed[0]}» дууссан тул хасагдлаа`);
    else if (removed.length > 1) toast.warning(`${removed.length} бараа дууссан тул хасагдлаа`);
    if (repriced > 0) toast.info("Үнэ өөрчлөгдсөн, шинэ үнээр тооцлоо");
  }, [prices]);
}
