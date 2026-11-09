import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One row of a settings-style list (the Би page). */
export const menuRowClass =
  "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 active:bg-muted";

export function MenuRowContent({
  icon,
  label,
  tone = "default",
  chevron = true,
}: {
  icon: ReactNode;
  label: ReactNode;
  tone?: "default" | "brand";
  chevron?: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-[18px]",
          tone === "brand" ? "bg-primary-soft text-primary-ink" : "bg-muted text-ink-2",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold">{label}</span>
      {chevron && <ChevronRight className="size-[18px] shrink-0 text-ink-3" />}
    </>
  );
}
