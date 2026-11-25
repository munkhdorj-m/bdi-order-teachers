"use client";

import { Gift } from "lucide-react";
import { useLang } from "@/components/lang";
import { giftQty, receivedQty, toNextGift, type Deal } from "@/lib/sale";
import { cn } from "@/lib/utils";

/**
 * What a «1+1» deal gives for the pieces in the cart, in plain words:
 *   «+1 бэлэг · нийт 2 ш авна»   (free pieces already earned)
 *   «1 нэмбэл +1 бэлэг»          (how many more until the next free one)
 * `qty` is what the teacher pays for; the free pieces come on top.
 */
export function DealNote({
  qty,
  deal,
  next = false,
  className,
}: {
  qty: number;
  deal: Deal | null | undefined;
  /** Also say how many more until the next free piece (cart lines). */
  next?: boolean;
  className?: string;
}) {
  const { t } = useLang();
  if (!deal || qty <= 0) return null;
  const gifts = giftQty(qty, deal);
  const missing = toNextGift(qty, deal);
  const received = receivedQty(qty, deal);
  const more = t(`${missing} нэмбэл +${deal.free} бэлэг`, `Add ${missing} more, get ${deal.free} free`);

  if (gifts === 0) {
    return (
      <p className={cn("flex items-center gap-1 text-[12px] font-semibold text-ink-3", className)}>
        <Gift className="size-3.5 shrink-0" strokeWidth={2.2} />
        {more}
      </p>
    );
  }
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] font-semibold", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 font-bold text-primary-ink">
        <Gift className="size-3.5 shrink-0" strokeWidth={2.2} />+{gifts} {t("бэлэг", "free")}
      </span>
      <span className="text-ink-2 tabular-nums">{t(`нийт ${received} ш авна`, `you get ${received}`)}</span>
      {next && missing > 0 && <span className="text-ink-3">· {more}</span>}
    </p>
  );
}
