import { BDI_PATH, BDI_VIEWBOX, BRAND_GRADIENT } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The app mark: white "BDI" on the emerald gradient tile. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="BDI"
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_14px_-6px_rgb(9_132_91/0.7)]",
        className,
      )}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundImage: BRAND_GRADIENT }}
    >
      <svg viewBox={BDI_VIEWBOX} fill="currentColor" aria-hidden="true" className="block w-[62%]">
        <path d={BDI_PATH} />
      </svg>
    </span>
  );
}
