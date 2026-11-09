import { STATUS_DOT, STATUS_LABEL, STATUS_SHORT, STATUS_STYLE, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export function StatusChip({ status, long = false, className }: { status: OrderStatus; long?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-bold",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {long ? STATUS_LABEL[status] : STATUS_SHORT[status]}
    </span>
  );
}
