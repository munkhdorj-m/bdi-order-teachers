import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title row inside the content (the app header stays above it). */
export function PageTitle({
  title,
  sub,
  right,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-x-3 gap-y-1", className)}>
      <h1 className="text-[24px] font-extrabold leading-tight md:text-[28px]">{title}</h1>
      {sub && <span className="pb-1 text-[13px] font-semibold text-ink-3 tabular-nums">{sub}</span>}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

/** Empty state with one obvious next step. */
export function EmptyState({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-surface text-ink-3 shadow-card ring-1 ring-black/5 [&_svg]:size-7">
        {icon}
      </div>
      <p className="mt-4 text-[16px] font-bold">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A coloured note across the page (shop closed, etc.). */
export function Notice({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "brand" | "danger" }) {
  const tones = {
    warn: "bg-warn-soft text-warn ring-warn-dot/25",
    brand: "bg-primary-soft text-primary-ink ring-primary/15",
    danger: "bg-danger-soft text-danger ring-danger/15",
  };
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-semibold ring-1", tones[tone])}>
      {children}
    </div>
  );
}
