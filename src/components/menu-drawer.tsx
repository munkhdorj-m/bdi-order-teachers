"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LogIn, Menu, X } from "lucide-react";
import { ADMIN_LINKS } from "@/app/admin/admin-nav";
import { SignOutButton } from "@/app/(shop)/me/sign-out-button";
import { Avatar } from "@/components/avatar";
import { CartBadge, TABS, useCartBadge, type NavTab } from "@/components/bottom-tabs";
import { InstallApp } from "@/components/install-app";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";
import { formatPhone } from "@/lib/format";
import { loginHref } from "@/lib/next-path";
import { cn } from "@/lib/utils";

export type MenuUser = { name: string; phone: string; isAdmin: boolean } | null;

/**
 * ☰ button (phones and small tablets) that opens every menu in a panel
 * from the right: who you are (or «Нэвтрэх»), the shop pages, admin pages
 * for admins, install, and sign out.
 */
export function MenuButton({ user, className }: { user: MenuUser; className?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const badge = useCartBadge();

  // Close once a link has taken us to another page.
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setOpen(false);
  }

  const shop: NavTab[] = user ? TABS : TABS.filter((t) => t.href !== "/me");

  const row = (it: NavTab, cart = false) => {
    const active = it.match(path);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
          active ? "bg-muted font-bold text-ink" : "font-semibold text-ink-2 hover:bg-muted/60 hover:text-ink",
        )}
      >
        <it.Icon className="size-5 shrink-0" strokeWidth={active ? 2.3 : 1.9} />
        <span className="min-w-0 flex-1 truncate">{it.label}</span>
        {cart && <CartBadge {...badge} className="ring-0" />}
      </Link>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Цэс"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl text-ink transition-colors hover:bg-muted md:hidden",
            className,
          )}
        >
          <Menu className="size-[22px]" strokeWidth={2.1} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-float outline-none duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
        >
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
            <Logo size={30} />
            <Dialog.Title className="text-[16px] font-extrabold tracking-tight">
              BDI <span className="font-semibold text-ink-3">Дэлгүүр</span>
            </Dialog.Title>
            <Dialog.Close
              aria-label="Хаах"
              className="ml-auto grid size-9 place-items-center rounded-full bg-muted text-ink-2 transition-colors hover:bg-muted-strong hover:text-ink"
            >
              <X className="size-[18px]" />
            </Dialog.Close>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto px-3 py-4">
            {user ? (
              <Link href="/me" className="mb-4 flex items-center gap-3 rounded-2xl bg-muted/60 p-3 transition-colors hover:bg-muted">
                <Avatar name={user.name} size={44} />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold">{user.name}</div>
                  <div className="text-[13px] font-medium text-ink-3 tabular-nums">{formatPhone(user.phone)}</div>
                </div>
              </Link>
            ) : (
              path !== "/login" && (
                <Link href={loginHref(path)} className={buttonClass("primary", "lg", "mb-4 w-full")}>
                  <LogIn />
                  Нэвтрэх
                </Link>
              )
            )}

            <nav aria-label="Цэс" className="space-y-0.5">
              {shop.map((it) => row(it, it.href === "/cart"))}
            </nav>

            {user?.isAdmin && (
              <>
                <div className="eyebrow mt-5 mb-1.5 px-3">Админ</div>
                <nav aria-label="Админ" className="space-y-0.5">
                  {ADMIN_LINKS.map((it) => row(it))}
                </nav>
              </>
            )}

            <div className="-mx-3 mt-4 border-t border-line pt-2">
              <InstallApp variant="row" />
            </div>
          </div>

          {user && (
            <div className="shrink-0 border-t border-line p-3">
              <SignOutButton />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
