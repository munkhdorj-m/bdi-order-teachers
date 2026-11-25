"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cn } from "@/lib/utils";
import { cancelOrder } from "../actions";

export function CancelOrderButton({ orderId, className }: { orderId: string; className?: string }) {
  const router = useRouter();
  const { t } = useLang();
  return (
    <ConfirmButton
      question={t("Захиалгыг цуцлах уу?", "Cancel this order?")}
      confirmLabel={t("Цуцлах", "Cancel order")}
      danger
      variant="secondary"
      size="lg"
      className={cn("text-danger", className)}
      onConfirm={async () => {
        const res = await cancelOrder(orderId);
        if (res.ok) toast.success(t("Цуцаллаа", "Order cancelled"));
        else toast.error(res.error);
        router.refresh();
      }}
    >
      <X />
      {t("Цуцлах", "Cancel")}
    </ConfirmButton>
  );
}
