"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useLang } from "@/components/lang";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);
  const { t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-6" />
      </span>
      <p className="mt-4 text-[20px] font-extrabold">{t("Алдаа гарлаа", "Something went wrong")}</p>
      <Button variant="primary" size="lg" className="mt-6" onClick={reset}>
        <RotateCcw />
        {t("Дахин оролдох", "Try again")}
      </Button>
    </main>
  );
}
