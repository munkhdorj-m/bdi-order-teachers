import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * primary   near-black: the main "commit" action (order, save, continue)
 * brand     emerald: cart actions and positive admin steps
 * secondary white with a hairline
 * soft      grey fill
 * ghost     text only
 * danger    red
 */
export type ButtonVariant = "primary" | "brand" | "secondary" | "soft" | "ghost" | "danger";
export type ButtonSize = "xl" | "lg" | "md" | "sm";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none " +
  "transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] " +
  "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none " +
  "disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white shadow-[0_1px_2px_rgb(0_0_0/0.18)] hover:bg-[#2b2b30]",
  brand: "bg-primary text-white shadow-[0_8px_18px_-10px_rgb(9_132_91/0.9)] hover:bg-primary-hover",
  secondary: "bg-surface text-ink shadow-card ring-1 ring-line hover:bg-muted/60 hover:ring-line-strong",
  soft: "bg-muted text-ink hover:bg-muted-strong",
  ghost: "text-ink-2 hover:bg-muted hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#b8222f]",
};

const SIZES: Record<ButtonSize, string> = {
  xl: "h-14 rounded-2xl px-6 text-[16px] [&_svg]:size-5",
  lg: "h-12 rounded-xl px-5 text-[15px] [&_svg]:size-[18px]",
  md: "h-11 rounded-xl px-4 text-[14px] [&_svg]:size-[18px]",
  sm: "h-9 rounded-lg px-3 text-[13px] [&_svg]:size-4",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
