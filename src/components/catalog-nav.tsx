"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import {
  ALL_PRODUCTS_VISUAL,
  CategoryIconTile,
  USUAL_PRODUCTS_VISUAL,
  categoryVisual,
  type CategoryVisual,
} from "@/lib/category-visual";
import { cn } from "@/lib/utils";

export type CatalogNavItem = { id: string; name: string; icon: string | null; count: number; usual?: boolean };

export const sectionDomId = (id: string) => `sec-${id}`;

const visualOf = (it: CatalogNavItem): CategoryVisual => (it.usual ? USUAL_PRODUCTS_VISUAL : categoryVisual(it));

/** Where content starts under the sticky chrome. */
function chromeBottom(rail: HTMLElement | null): number {
  if (rail && rail.offsetParent !== null) return (parseFloat(getComputedStyle(rail).top) || 0) + rail.offsetHeight;
  return 88; // desktop: only the header is sticky
}

function sectionTop(id: string, rail: HTMLElement | null): number | null {
  const el = document.getElementById(sectionDomId(id));
  return el ? el.getBoundingClientRect().top + window.scrollY - chromeBottom(rail) - 8 : null;
}

/**
 * Category navigation for the one-page catalog (as on BDI): a sticky picture
 * rail on phones (its first button opens every category as a grid) and a
 * sidebar on desktop. Tapping jumps to the section; while scrolling, the
 * category on screen lights up.
 */
export function CatalogNav({ items, searchSlot }: { items: CatalogNavItem[]; searchSlot?: React.ReactNode }) {
  const [active, setActive] = useState<string | undefined>(items[0]?.id);
  const [gridOpen, setGridOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  // While a tap-triggered scroll runs, don't let the spy flicker through
  // every section in between.
  const locked = useRef(false);
  const unlockTimer = useRef<number | undefined>(undefined);

  function lockSpy(ms: number) {
    locked.current = true;
    window.clearTimeout(unlockTimer.current);
    unlockTimer.current = window.setTimeout(() => {
      locked.current = false;
    }, ms);
  }
  useEffect(() => () => window.clearTimeout(unlockTimer.current), []);

  // Scroll spy: the last section whose top has passed the sticky chrome.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (locked.current) return;
      const line = chromeBottom(stickyRef.current) + 16;
      let current = items[0]?.id;
      for (const it of items) {
        const el = document.getElementById(sectionDomId(it.id));
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = it.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  // Keep the active button visible inside the phone rail.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !active) return;
    const chip = rail.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(active)}"]`);
    if (!chip) return;
    rail.scrollTo({ left: Math.max(0, chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2), behavior: "smooth" });
  }, [active]);

  function jump(id: string) {
    const top = sectionTop(id, stickyRef.current);
    if (top === null) return;
    setActive(id);
    lockSpy(700);
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <>
      {/* Phones / tablets: sticky picture rail. */}
      <div
        ref={stickyRef}
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-3 mb-4 border-b border-line/70 bg-canvas/85 backdrop-blur-xl sm:-mx-6 md:top-[calc(4rem+env(safe-area-inset-top))] lg:hidden"
      >
        <div
          ref={railRef}
          role="tablist"
          aria-label="Ангилал"
          className="no-scrollbar flex gap-1 overflow-x-auto px-2 pt-2 pb-1.5 sm:px-5"
        >
          <RailButton label="Бүгд" visual={ALL_PRODUCTS_VISUAL} active={gridOpen} onClick={() => setGridOpen(true)} popup />
          <span aria-hidden="true" className="my-2.5 w-px shrink-0 bg-line" />
          {items.map((it) => (
            <RailButton
              key={it.id}
              id={it.id}
              label={it.name}
              count={it.count}
              visual={visualOf(it)}
              active={it.id === active}
              onClick={() => jump(it.id)}
            />
          ))}
        </div>
      </div>

      <Sheet open={gridOpen} onOpenChange={setGridOpen} title="Ангилал" wide>
        <div className="grid grid-cols-4 gap-x-1 gap-y-4 pb-2 sm:grid-cols-6">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                setGridOpen(false);
                // Let the sheet start closing so the jump isn't hidden behind it.
                requestAnimationFrame(() => jump(it.id));
              }}
              className="flex flex-col items-center gap-1.5 rounded-xl p-1 text-center"
            >
              <span className="relative">
                <CategoryIconTile visual={visualOf(it)} size="lg" active={it.id === active} />
                <Count n={it.count} />
              </span>
              <span
                className={cn(
                  "line-clamp-2 text-[11.5px] leading-[1.15]",
                  it.id === active ? "font-bold" : "font-medium text-ink-2",
                )}
              >
                {it.name}
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Desktop: search + every category in a sidebar. */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="thin-scrollbar sticky top-[calc(4rem+1.5rem)] flex max-h-[calc(100dvh-6.5rem)] flex-col gap-4 overflow-y-auto pb-6">
          {searchSlot}
          <nav aria-label="Ангилал" className="flex flex-col gap-0.5">
            <div className="eyebrow mb-1.5 px-2">Ангилал</div>
            {items.map((it) => {
              const on = it.id === active;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => jump(it.id)}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-2.5 rounded-xl px-1.5 text-left text-[13.5px] transition-all",
                    on
                      ? "bg-surface font-bold text-ink shadow-card ring-1 ring-black/5"
                      : "font-medium text-ink-2 hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  <CategoryIconTile visual={visualOf(it)} size="sm" active={on} />
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  <span className="pr-1.5 text-[11.5px] font-semibold text-ink-3 tabular-nums">{it.count}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="absolute -top-1.5 -right-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-surface px-1 text-[9.5px] font-bold text-ink-3 tabular-nums ring-1 ring-line">
      {n}
    </span>
  );
}

function RailButton({
  id,
  label,
  count,
  visual,
  active,
  onClick,
  popup = false,
}: {
  id?: string;
  label: string;
  count?: number;
  visual: CategoryVisual;
  active: boolean;
  onClick: () => void;
  popup?: boolean;
}) {
  return (
    <button
      type="button"
      role={popup ? undefined : "tab"}
      aria-selected={popup ? undefined : active}
      aria-haspopup={popup ? "dialog" : undefined}
      data-nav-id={id}
      onClick={onClick}
      className="group flex w-[70px] shrink-0 flex-col items-center gap-1 rounded-xl py-1"
    >
      <span className="relative">
        <CategoryIconTile
          visual={visual}
          size="md"
          active={active}
          className={cn("transition-transform duration-200", active ? "scale-105 shadow-md" : "group-active:scale-95")}
        />
        {count !== undefined && <Count n={count} />}
      </span>
      <span
        className={cn(
          "line-clamp-2 text-center text-[10.5px] leading-[1.15]",
          active ? "font-bold text-ink" : "font-medium text-ink-3",
        )}
      >
        {label}
      </span>
    </button>
  );
}
