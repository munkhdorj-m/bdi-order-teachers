"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart";

export type ReorderLine = {
  product_id: string | null;
  name: string;
  image_url: string | null;
  qty: number;
  unit_price: number;
};

/**
 * «Дахин захиалах» (as on BDI): puts every line of this order back in the
 * cart, on top of what's there, and opens the cart. The cart page brings
 * prices up to date and drops anything no longer sold.
 */
export function ReorderButton({ lines, className }: { lines: ReorderLine[]; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const usable = lines.filter((l): l is ReorderLine & { product_id: string } => !!l.product_id && l.unit_price > 0);

  return (
    <Button
      variant="brand"
      size="lg"
      className={className}
      disabled={pending || usable.length === 0}
      onClick={() =>
        start(() => {
          for (const l of usable) {
            addToCart(
              {
                product_id: l.product_id,
                name: l.name,
                image_url: l.image_url,
                category_name: null,
                category_icon: null,
                unit_price: l.unit_price,
              },
              l.qty,
            );
          }
          toast.success(`${usable.length} бараа сагсанд орлоо`);
          router.push("/cart");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      Дахин захиалах
    </Button>
  );
}
