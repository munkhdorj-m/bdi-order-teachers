import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { MenuButton } from "@/components/menu-drawer";
import { requireAdmin } from "@/lib/server/session";
import { AdminBottomNav, AdminNav } from "./admin-nav";

/**
 * Admin pages. The check here only shapes the page: every admin page and
 * every admin action checks requireAdmin() again on its own.
 * Menu: inline in the header from md up, along the bottom on phones.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-3 sm:px-6 md:h-16 lg:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Дэлгүүр"
              className="-ml-1 grid size-10 place-items-center rounded-xl text-ink transition-colors hover:bg-muted"
            >
              <ChevronLeft className="size-6" strokeWidth={2.2} />
            </Link>
            <Logo size={30} />
            <span className="text-[17px] font-extrabold tracking-tight">Админ</span>
          </div>
          <AdminNav />
          <MenuButton user={{ name: me.full_name, phone: me.phone, isAdmin: true }} className="-mr-1 ml-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-3 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-16 lg:px-8 lg:pt-6">
        {children}
      </main>
      <AdminBottomNav />
    </div>
  );
}
