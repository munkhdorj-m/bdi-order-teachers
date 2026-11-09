"use client";

import Image from "next/image";
import { useState } from "react";
import { ProductPlaceholder, categoryVisual, type CategoryLike } from "@/lib/category-visual";
import { cn } from "@/lib/utils";

const SUPABASE_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null;
  } catch {
    return null;
  }
})();

/** Only BDI's own Storage photos go through next/image (see next.config.ts). */
function optimizable(src: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.host === SUPABASE_HOST && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/**
 * Product photo filling its (relative) parent, cropped to fill like BDI's
 * catalog. No photo, or a broken one: the category's picture instead.
 */
export function ProductImage({
  src,
  alt,
  category,
  sizes,
  dim = false,
  small = false,
  priority = false,
  className,
}: {
  src: string | null;
  alt: string;
  category?: CategoryLike | null;
  sizes: string;
  dim?: boolean;
  small?: boolean;
  priority?: boolean;
  className?: string;
}) {
  // Resized copy first; if resizing fails (say, a slow 2 MB original timed
  // out), the original file; only then the category picture.
  const [stage, setStage] = useState<"resized" | "original" | "none">(() =>
    src && optimizable(src) ? "resized" : "original",
  );
  const look = cn("object-cover", dim && "opacity-55 grayscale", className);

  if (!src || stage === "none") {
    return <ProductPlaceholder visual={categoryVisual(category ?? null)} dim={dim} size={small ? "sm" : "md"} />;
  }
  if (stage === "resized") {
    return (
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={look} onError={() => setStage("original")} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={cn("absolute inset-0 size-full", look)}
      onError={() => setStage("none")}
    />
  );
}
