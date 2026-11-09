"use client";

import { cn } from "@/lib/utils";

/** On / off switch (a button with role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-strong",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
