"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LayoutDashboard, LogIn, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { CartBadge, TABS, useCartBadge } from "@/components/bottom-tabs";
import { MenuButton, type MenuUser } from "@/components/menu-drawer";
import { FOCUS_SEARCH_EVENT } from "@/lib/events";
import { loginHref } from "@/lib/next-path";
import { cn } from "@/lib/utils";

export { Avatar };

function parentOf(path: string): string | null {
  if (path.startsWith("/orders/")) return "/orders";
  if (path.startsWith("/products/")) return "/";
  return null;
}

/**
 * Top bar. Phones: logo (or a back arrow on inner pages), search and the
 * ☰ menu; the tab bar is at the bottom too. From md up: the links live here.
 * Signed out: a «Нэвтрэх» button in place of the name.
 */
export function ShopHeader({ user }: { user: MenuUser }) {
  const path = usePathname();
  const back = parentOf(path);
  const badge = useCartBadge();
  const signedIn = !!user;
  const name = user?.name ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:px-6 md:h-16 lg:px-8">
        {back && (
          <Link
            href={back}
            aria-label="Буцах"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-muted md:hidden"
          >
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </Link>
        )}
        <Link href="/" className={cn("flex shrink-0 items-center gap-2.5 rounded-xl pr-2", back && "max-md:hidden")}>
          <Logo size={34} />
          <span className="text-[16px] font-extrabold tracking-tight">
            BDI <span className="font-semibold text-ink-3">Дэлгүүр</span>
          </span>
        </Link>

        <nav aria-label="Үндсэн цэс" className="ml-4 hidden items-center gap-1 md:flex lg:ml-8">
          {TABS.filter((t) => t.href !== "/me").map(({ href, label, Icon, match }) => {
            const active = match(path);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors",
                  active ? "bg-ink text-white" : "text-ink-2 hover:bg-muted hover:text-ink",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.3 : 2} />
                {label}
                {href === "/cart" && <CartBadge {...badge} className="ml-0.5 ring-0" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {path === "/" && (
            <button
              type="button"
              aria-label="Хайх"
              onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}
              className="grid size-10 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-muted hover:text-ink lg:hidden"
            >
              <Search className="size-5" strokeWidth={2.1} />
            </button>
          )}
          {user?.isAdmin && (
            <Link
              href="/admin"
              className="hidden h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold text-ink-2 ring-1 ring-line transition-colors hover:text-ink hover:ring-line-strong md:flex"
            >
              <LayoutDashboard className="size-4" />
              Админ
            </Link>
          )}
          {signedIn ? (
            <Link
              href="/me"
              aria-current={path === "/me" ? "page" : undefined}
              className={cn(
                "hidden h-10 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[14px] font-semibold transition-colors md:flex",
                path === "/me" ? "bg-muted text-ink" : "text-ink-2 hover:bg-muted hover:text-ink",
              )}
            >
              <Avatar name={name} />
              <span className="max-w-36 truncate">{name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link
              href={loginHref(path)}
              className="hidden h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#2b2b30] md:flex"
            >
              <LogIn className="size-4" />
              Нэвтрэх
            </Link>
          )}
          <MenuButton user={user} className="-mr-1" />
        </div>
      </div>
    </header>
  );
}
