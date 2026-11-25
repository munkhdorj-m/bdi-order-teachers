import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Green «Бэлэг» chip for the free pieces of a «1+1» / «2+1» deal (their
 * own 0₮ line in the order). No hooks, so server and client pages share it.
 */
export function GiftChip({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-primary-soft px-1.5 align-[1px] text-[10.5px] font-bold whitespace-nowrap text-primary-ink",
        className,
      )}
    >
      <Gift className="size-3" strokeWidth={2.4} />
      {label}
    </span>
  );
}
