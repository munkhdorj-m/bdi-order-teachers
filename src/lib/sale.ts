import type { Lang } from "@/lib/i18n";

/**
 * «1+1» / «2+1»: for every `buy` pieces a teacher pays for, `free` more
 * come free, added on top. The number in the cart is always what they pay
 * for: 1+1 → pick 1, get 2; 2+1 → pick 2, get 3; pick 4, get 6.
 */
export type Deal = { buy: number; free: number };

function valid(deal: Deal | null | undefined): deal is Deal {
  return !!deal && deal.buy >= 1 && deal.free >= 1;
}

/** Free pieces that come with `paid` pieces (whole groups only). */
export function giftQty(paid: number, deal: Deal | null | undefined): number {
  return valid(deal) ? Math.floor(paid / deal.buy) * deal.free : 0;
}

/** Pieces the teacher receives: paid + free. */
export function receivedQty(paid: number, deal: Deal | null | undefined): number {
  return paid + giftQty(paid, deal);
}

/** Paid pieces still missing for the next free one (0 = none missing). */
export function toNextGift(paid: number, deal: Deal | null | undefined): number {
  if (!valid(deal)) return 0;
  const rest = paid % deal.buy;
  return rest === 0 ? 0 : deal.buy - rest;
}

/** What `paid` pieces cost. Free pieces cost nothing, so they don't count. */
export function lineTotal(paid: number, unitPrice: number): number {
  return paid * unitPrice;
}

/** Price after «-N%», rounded to a whole tögrög (the same as the database). */
export function percentOff(price: number, percent: number | null | undefined): number {
  return percent ? Math.round(price * (1 - percent / 100)) : price;
}

/** Short label for badges: «1+1», «2+1». */
export function dealLabel(deal: Deal): string {
  return `${deal.buy}+${deal.free}`;
}

/** Plain explanation: «1 авбал +1 бэлэг» / "Buy 1, get 1 free". */
export function dealText(deal: Deal, lang: Lang = "mn"): string {
  return lang === "en" ? `Buy ${deal.buy}, get ${deal.free} free` : `${deal.buy} авбал +${deal.free} бэлэг`;
}

/** Longer line: «1 ширхэгийн үнээр 2 ширхэг авна» / "Pay for 1, get 2". */
export function dealMeaning(deal: Deal, lang: Lang = "mn"): string {
  const total = deal.buy + deal.free;
  return lang === "en" ? `Pay for ${deal.buy}, get ${total}` : `${deal.buy} ширхэгийн үнээр ${total} ширхэг авна`;
}
