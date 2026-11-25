"use client";

import { Printer } from "lucide-react";
import { useLang } from "@/components/lang";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  const { t } = useLang();
  return (
    <Button
      variant="secondary"
      size="sm"
      className="ml-auto"
      onClick={() => window.print()}
    >
      <Printer />
      {t("Хэвлэх", "Print")}
    </Button>
  );
}
