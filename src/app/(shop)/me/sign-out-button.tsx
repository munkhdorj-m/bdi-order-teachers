"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useLang } from "@/components/lang";
import { Button } from "@/components/ui/button";
import { clearCart } from "@/lib/cart";
import { signOut } from "./actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  const { t } = useLang();
  return (
    <Button
      variant="secondary"
      size="lg"
      className="w-full text-danger"
      disabled={pending}
      onClick={() =>
        start(async () => {
          clearCart();
          await signOut();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      {t("Гарах", "Sign out")}
    </Button>
  );
}
