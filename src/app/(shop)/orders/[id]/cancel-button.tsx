"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cn } from "@/lib/utils";
import { cancelOrder } from "../actions";

export function CancelOrderButton({ orderId, className }: { orderId: string; className?: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      question="Захиалгыг цуцлах уу?"
      confirmLabel="Цуцлах"
      danger
      variant="secondary"
      size="lg"
      className={cn("text-danger", className)}
      onConfirm={async () => {
        const res = await cancelOrder(orderId);
        if (res.ok) toast.success("Цуцаллаа");
        else toast.error(res.error);
        router.refresh();
      }}
    >
      <X />
      Цуцлах
    </ConfirmButton>
  );
}
