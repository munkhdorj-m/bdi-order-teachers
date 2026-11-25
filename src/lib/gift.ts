/**
 * Free pieces from a «1+1» / «2+1» deal are saved in the order as their
 * own 0₮ line named "… (бэлэг)" (sql/08). These helpers let every page show
 * them the same way: the product's own name plus a green «Бэлэг» chip.
 */
export const GIFT_SUFFIX = " (бэлэг)";

export function isGiftLine(it: { unit_price: number | string }): boolean {
  return Number(it.unit_price) === 0;
}

/** The name without the " (бэлэг)" marker. */
export function baseName(name: string): string {
  return name.endsWith(GIFT_SUFFIX) ? name.slice(0, -GIFT_SUFFIX.length) : name;
}
