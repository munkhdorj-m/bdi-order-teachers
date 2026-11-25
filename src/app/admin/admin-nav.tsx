"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  ClipboardList,
  Package,
  PackageOpen,
  Settings,
  Users,
} from "lucide-react";
import { BottomBar, type NavTab } from "@/components/bottom-tabs";
import { useLang } from "@/components/lang";
import { cn } from "@/lib/utils";

export const ADMIN_LINKS: NavTab[] = [
  {
    href: "/admin",
    label: "Захиалга",
    en: "Orders",
    Icon: ClipboardList,
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/products",
    label: "Бараа",
    en: "Products",
    Icon: Package,
    match: (p) => p.startsWith("/admin/products"),
  },
  {
    href: "/admin/analytics",
    label: "Аналитик",
    en: "Analytics",
    Icon: ChartColumn,
    match: (p) => p.startsWith("/admin/analytics"),
  },
  {
    href: "/admin/bring",
    label: "Авчрах",
    en: "Bring list",
    Icon: PackageOpen,
    match: (p) => p.startsWith("/admin/bring"),
  },
  {
    href: "/admin/users",
    label: "Хэрэглэгч",
    en: "Users",
    Icon: Users,
    match: (p) => p.startsWith("/admin/users"),
  },
  {
    href: "/admin/settings",
    label: "Тохиргоо",
    en: "Settings",
    Icon: Settings,
    match: (p) => p.startsWith("/admin/settings"),
  },
];

/** From md up: the links inline in the header. */
export function AdminNav() {
  const path = usePathname();
  const { t } = useLang();
  return (
    <nav
      aria-label={t("Админ", "Admin")}
      className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
    >
      {ADMIN_LINKS.map(({ href, label, en, Icon, match }) => {
        const active = match(path);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
              active
                ? "bg-ink text-white"
                : "text-ink-2 hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.3 : 2} />
            {t(label, en ?? label)}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Phones: the links along the bottom, all but Тохиргоо (five fit; it is in
 * the ☰ menu, which also leads back to the shop, as does ‹).
 */
export function AdminBottomNav() {
  const { t } = useLang();
  return (
    <BottomBar
      tabs={ADMIN_LINKS.filter((l) => l.href !== "/admin/settings")}
      label={t("Админ цэс", "Admin menu")}
    />
  );
}
