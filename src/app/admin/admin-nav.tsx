"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, ClipboardList, Package, PackageOpen, Settings, Users } from "lucide-react";
import { BottomBar, type NavTab } from "@/components/bottom-tabs";
import { cn } from "@/lib/utils";

export const ADMIN_LINKS: NavTab[] = [
  { href: "/admin", label: "Захиалга", Icon: ClipboardList, match: (p) => p === "/admin" },
  { href: "/admin/products", label: "Бараа", Icon: Package, match: (p) => p.startsWith("/admin/products") },
  { href: "/admin/analytics", label: "Аналитик", Icon: ChartColumn, match: (p) => p.startsWith("/admin/analytics") },
  { href: "/admin/bring", label: "Авчрах", Icon: PackageOpen, match: (p) => p.startsWith("/admin/bring") },
  { href: "/admin/users", label: "Хэрэглэгч", Icon: Users, match: (p) => p.startsWith("/admin/users") },
  { href: "/admin/settings", label: "Тохиргоо", Icon: Settings, match: (p) => p.startsWith("/admin/settings") },
];

/** From md up: the links inline in the header. */
export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Админ" className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
      {ADMIN_LINKS.map(({ href, label, Icon, match }) => {
        const active = match(path);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
              active ? "bg-ink text-white" : "text-ink-2 hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" strokeWidth={active ? 2.3 : 2} />
            {label}
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
  return <BottomBar tabs={ADMIN_LINKS.filter((l) => l.href !== "/admin/settings")} label="Админ цэс" />;
}
