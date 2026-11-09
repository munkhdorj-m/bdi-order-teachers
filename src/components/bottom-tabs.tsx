"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  ShoppingBag,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { loginHref } from "@/lib/next-path";
import { cn } from "@/lib/utils";

export type NavTab = { href: string; label: string; Icon: LucideIcon; match: (path: string) => boolean };

export const TABS: NavTab[] = [
  { href: "/", label: "Дэлгүүр", Icon: ShoppingBag, match: (p) => p === "/" || p.startsWith("/products/") },
  { href: "/orders", label: "Захиалга", Icon: ClipboardList, match: (p) => p.startsWith("/orders") },
  { href: "/cart", label: "Сагс", Icon: ShoppingCart, match: (p) => p === "/cart" },
  { href: "/me", label: "Би", Icon: CircleUserRound, match: (p) => p === "/me" },
];

/** Admins get one more tab on phones (the desktop header has its own link). */
const ADMIN_TAB: NavTab = { href: "/admin", label: "Админ", Icon: LayoutDashboard, match: (p) => p.startsWith("/admin") };

/** Bounces when the number of products in the cart goes up. */
export function useCartBadge(): { count: number; bounce: boolean } {
  // Products in the cart (not pieces), like BDI.
  const count = useCart().length;
  const [bounce, setBounce] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    const grew = count > prev.current;
    prev.current = count;
    if (!grew) return;
    setBounce(true);
    const t = setTimeout(() => setBounce(false), 450);
    return () => clearTimeout(t);
  }, [count]);
  return { count, bounce };
}

export function CartBadge({ count, bounce, className }: { count: number; bounce: boolean; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary-bright px-1 text-[10.5px] font-bold leading-none text-white tabular-nums ring-2 ring-surface",
        bounce && "animate-pop",
        className,
      )}
      aria-label={`Сагсанд ${count} бараа`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * The menu along the bottom of the screen on phones, as on BDI. Hidden
 * from md up, where the header holds the links. Used by the shop and admin.
 */
export function BottomBar({ tabs, label, cart = false }: { tabs: NavTab[]; label: string; cart?: boolean }) {
  const path = usePathname();
  const badge = useCartBadge();
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgb(20_20_22/0.25)] backdrop-blur-xl md:hidden print:hidden"
    >
      <ul
        className="mx-auto grid h-16 max-w-lg px-1.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ href, label: text, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex h-full flex-col items-center justify-center gap-1"
              >
                <span
                  className={cn(
                    "relative grid h-8 place-items-center rounded-full transition-colors duration-200",
                    tabs.length > 4 ? "w-12" : "w-14",
                    active ? "bg-ink text-white" : "text-ink-3 group-hover:text-ink",
                  )}
                >
                  <Icon className="size-[19px]" strokeWidth={active ? 2.3 : 1.9} />
                  {cart && href === "/cart" && <CartBadge {...badge} className="absolute -top-1 -right-1" />}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-[11px] leading-none",
                    active ? "font-bold text-ink" : "font-semibold text-ink-3",
                  )}
                >
                  {text}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Shop pages: Дэлгүүр / Захиалга / Сагс / Би (+ Админ for admins).
 * Signed out, «Би» becomes «Нэвтрэх», coming back to this page afterwards.
 */
export function BottomTabs({ isAdmin = false, signedIn = true }: { isAdmin?: boolean; signedIn?: boolean }) {
  const path = usePathname();
  const tabs: NavTab[] = signedIn
    ? isAdmin
      ? [...TABS, ADMIN_TAB]
      : TABS
    : [...TABS.slice(0, 3), { href: loginHref(path), label: "Нэвтрэх", Icon: LogIn, match: (p) => p === "/login" }];
  return <BottomBar tabs={tabs} label="Үндсэн цэс" cart />;
}
