import type { Lang } from "@/lib/i18n";
import { STATUS_DOT, STATUS_LABEL_EN, STATUS_SHORT, STATUS_STYLE, statusLabel, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export function StatusChip({
  status,
  long = false,
  lang = "mn",
  className,
}: {
  status: OrderStatus;
  long?: boolean;
  lang?: Lang;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-bold",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {long ? statusLabel(status, lang) : lang === "en" ? STATUS_LABEL_EN[status] : STATUS_SHORT[status]}
    </span>
  );
}
