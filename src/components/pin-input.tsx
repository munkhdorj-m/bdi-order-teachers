"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Four PIN boxes over one invisible number field: tapping anywhere opens
 * the phone's number pad; the 4th digit calls onComplete.
 * Change `shake` (a counter) to shake the boxes after a wrong PIN.
 */
export function PinInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  shake = 0,
  label = "PIN",
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  shake?: number;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div key={shake} className={cn("relative w-fit", shake > 0 && "animate-shake")}>
      <input
        ref={ref}
        value={value}
        aria-label={label}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={4}
        autoFocus={autoFocus}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
          onChange(v);
          if (v.length === 4) onComplete?.(v);
        }}
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
      />
      <div className="flex gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => {
          const current = focused && !disabled && i === Math.min(value.length, 3);
          return (
            <div
              key={i}
              className={cn(
                "grid size-15 place-items-center rounded-2xl bg-surface shadow-card ring-1 ring-line transition-[box-shadow,background-color]",
                value[i] && "ring-ink/25",
                current && "ring-2 ring-primary",
                disabled && "opacity-60",
              )}
            >
              {value[i] && <span className="size-3.5 rounded-full bg-ink" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
