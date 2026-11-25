"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cn } from "@/lib/utils";
import { deleteOrder } from "../actions";

/** Cancelled orders only: remove it from «Захиалга» for good. */
export function DeleteOrderButton({ orderId, className }: { orderId: string; className?: string }) {
  const router = useRouter();
  const { t } = useLang();
  return (
    <ConfirmButton
      question={t(
        "Энэ цуцалсан захиалгыг бүр мөсөн устгах уу? Буцаах боломжгүй.",
        "Delete this cancelled order for good? This can't be undone.",
      )}
      confirmLabel={t("Устгах", "Delete")}
      danger
      variant="secondary"
      size="lg"
      className={cn("text-danger", className)}
      onConfirm={async () => {
        const res = await deleteOrder(orderId);
        if (!res.ok) {
          toast.error(res.error);
          router.refresh();
          return;
        }
        toast.success(t("Устгалаа", "Deleted"));
        router.replace("/orders");
      }}
    >
      <Trash2 />
      {t("Устгах", "Delete")}
    </ConfirmButton>
  );
}
