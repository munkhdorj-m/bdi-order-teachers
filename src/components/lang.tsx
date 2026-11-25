"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useTransition, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { LANG_COOKIE, makeT, type Lang, type T } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LangContext = createContext<{ lang: Lang; t: T }>({ lang: "mn", t: makeT("mn") });

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** { lang, t } — t("Сагс", "Cart") picks the visitor's language. */
export function useLang() {
  return useContext(LangContext);
}

function saveLang(next: Lang) {
  document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.lang = next;
}

/** МН | EN switch. Saves the choice and re-renders the page in it. */
export function LangSwitch({
  className,
  tone = "light",
  compact = false,
}: {
  className?: string;
  tone?: "light" | "dark";
  /** Hide the 文A icon on tablets, where the shop header is tight. */
  compact?: boolean;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(next: Lang) {
    if (next === lang) return;
    saveLang(next);
    start(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language / Хэл"
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-0.5 rounded-xl p-0.5 text-[12px] font-bold",
        tone === "dark" ? "bg-white/10 text-white" : "bg-surface text-ink-2 ring-1 ring-line-strong",
        pending && "opacity-60",
        className,
      )}
    >
      <Languages className={cn("mx-1 size-4 text-primary", compact ? "max-[360px]:hidden md:hidden lg:block" : "max-[360px]:hidden")} strokeWidth={2.2} aria-hidden />
      {(
        [
          ["mn", "МН"],
          ["en", "EN"],
        ] as [Lang, string][]
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={lang === key}
          onClick={() => pick(key)}
          className={cn(
            "h-8 rounded-[10px] px-2.5 transition-colors",
            lang === key
              ? tone === "dark"
                ? "bg-white text-ink"
                : "bg-ink text-white shadow-sm"
              : "hover:text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
