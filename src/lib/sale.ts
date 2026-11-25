/** «2+1»: take buy + free pieces, pay for `buy`. */
export type Deal = { buy: number; free: number };

/** Free pieces among `qty` under a deal (whole groups only). */
export function freeQty(qty: number, deal: Deal | null | undefined): number {
  if (!deal || deal.buy < 1 || deal.free < 1) return 0;
  return Math.floor(qty / (deal.buy + deal.free)) * deal.free;
}

/** What `qty` pieces cost: free pieces are 0₮. */
export function lineTotal(qty: number, unitPrice: number, deal?: Deal | null): number {
  return (qty - freeQty(qty, deal)) * unitPrice;
}

/** Price after «-N%», rounded to a whole tögrög (the same as the database). */
export function percentOff(price: number, percent: number | null | undefined): number {
  return percent ? Math.round(price * (1 - percent / 100)) : price;
}

/** Short label for badges: «-20%», «2+1». */
export function dealLabel(deal: Deal): string {
  return `${deal.buy}+${deal.free}`;
}

/** Plain explanation: «3 авбал 1 нь үнэгүй». */
export function dealText(deal: Deal): string {
  return `${deal.buy + deal.free} авбал ${deal.free} нь үнэгүй`;
}
