import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getT } from "@/lib/server/lang";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-ink-3">
        <SearchX className="size-6" />
      </span>
      <p className="mt-4 text-[20px] font-extrabold">{t("Олдсонгүй", "Not found")}</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-6")}>
        {t("Дэлгүүр", "Shop")}
      </Link>
    </main>
  );
}
