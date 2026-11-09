"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { MAX_QTY } from "@/lib/cart";
import { cn } from "@/lib/utils";

/**
 * − qty + in one pill. The number is typeable: tap it, type, Enter
 * (0 removes the line). At 1, minus becomes a bin.
 *   solid    emerald, for product cards (clearly "in the cart")
 *   outline  white, for cart lines
 */
export function Stepper({
  qty,
  onChange,
  tone = "solid",
  size = "md",
  label = "Тоо ширхэг",
  keepOne = false,
  className,
}: {
  qty: number;
  onChange: (qty: number) => void;
  tone?: "solid" | "outline";
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Minus stops at 1 (the row has its own remove button). */
  keepOne?: boolean;
  className?: string;
}) {
  // Typing draft, committed on blur / Enter; follows the cart otherwise.
  const [draft, setDraft] = useState(String(qty));
  const [prev, setPrev] = useState(qty);
  if (prev !== qty) {
    setPrev(qty);
    setDraft(String(qty));
  }

  function commit() {
    const t = draft.trim();
    const n = Number(t);
    if (t === "" || !Number.isFinite(n) || n < 0) return setDraft(String(qty));
    const next = Math.min(MAX_QTY, Math.floor(n));
    if (next === qty) setDraft(String(qty));
    else onChange(next);
  }

  // Cards sit inside a link: keep taps on the controls from navigating.
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const solid = tone === "solid";
  const h = size === "lg" ? "h-12" : size === "sm" ? "h-9" : "h-10";
  const w = size === "lg" ? "w-12" : size === "sm" ? "w-8" : "w-9";
  const btn = cn(
    "grid shrink-0 place-items-center transition-colors disabled:opacity-40",
    w,
    solid ? "hover:bg-black/10 active:bg-black/20" : "text-ink-2 hover:bg-muted hover:text-ink active:bg-muted-strong",
  );

  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-xl",
        h,
        solid ? "bg-primary text-white shadow-[0_8px_18px_-10px_rgb(9_132_91/0.9)]" : "bg-surface text-ink ring-1 ring-line",
        className,
      )}
    >
      <button
        type="button"
        aria-label={qty <= 1 && !keepOne ? "Хасах" : "Багасгах"}
        disabled={keepOne && qty <= 1}
        onClick={(e) => {
          stop(e);
          onChange(qty - 1);
        }}
        className={btn}
      >
        {qty <= 1 && !keepOne ? (
          <Trash2 className="size-4" strokeWidth={2.2} />
        ) : (
          <Minus className="size-4" strokeWidth={2.6} />
        )}
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        size={1}
        maxLength={3}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        onClick={stop}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(String(qty));
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-center font-bold tabular-nums outline-none focus-visible:outline-none",
          size === "lg" ? "text-[17px]" : "text-[15px]",
          solid ? "caret-white selection:bg-white/35 focus:bg-black/10" : "focus:bg-muted/70",
        )}
      />
      <button
        type="button"
        aria-label="Нэмэх"
        disabled={qty >= MAX_QTY}
        onClick={(e) => {
          stop(e);
          onChange(qty + 1);
        }}
        className={btn}
      >
        <Plus className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}
