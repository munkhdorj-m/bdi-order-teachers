/**
 * Orders go Төлөөгүй → Төлсөн (or Цуцалсан). There used to be a third step,
 * "handed" (Өгсөн); it was dropped, and old rows that still say "handed"
 * count as paid everywhere.
 */
export type OrderStatus = "new" | "paid" | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = ["new", "paid", "cancelled"];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as string[]).includes(v);
}

/** A database status as the app sees it (old "handed" rows are paid). */
export function normalizeStatus(v: unknown): OrderStatus {
  if (v === "handed") return "paid";
  return isOrderStatus(v) ? v : "new";
}

/** The database values behind some statuses, for queries. */
export function dbStatuses(statuses: OrderStatus[]): string[] {
  return statuses.flatMap((s) => (s === "paid" ? ["paid", "handed"] : [s]));
}

/** What the buyer sees. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Төлбөр хүлээж байна",
  paid: "Төлсөн",
  cancelled: "Цуцалсан",
};

/** Shorter words for the admin's chips. */
export const STATUS_SHORT: Record<OrderStatus, string> = {
  new: "Төлөөгүй",
  paid: "Төлсөн",
  cancelled: "Цуцалсан",
};

/** Pill colours (background + text). */
export const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-warn-soft text-warn",
  paid: "bg-primary-soft text-primary-ink",
  cancelled: "bg-danger-soft text-danger",
};

/** The dot inside the pill. */
export const STATUS_DOT: Record<OrderStatus, string> = {
  new: "bg-warn-dot",
  paid: "bg-primary-bright",
  cancelled: "bg-danger",
};

/** Steps of the progress bar and timeline. */
export const STATUS_STEPS: OrderStatus[] = ["new", "paid"];
