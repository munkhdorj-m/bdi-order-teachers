import { BottomTabs } from "@/components/bottom-tabs";
import { ShopHeader } from "@/components/shop-header";
import { getTeacher } from "@/lib/server/session";

/**
 * Buyer pages: the top header everywhere, plus the menu along the bottom
 * on phones (Дэлгүүр / Захиалга / Сагс / Би, and Админ for admins).
 * The shop, product pages and cart are open to everyone; orders and «Би»
 * check the sign-in themselves.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const me = await getTeacher();
  const user = me ? { name: me.full_name, phone: me.phone, isAdmin: me.is_admin } : null;
  return (
    <>
      <ShopHeader user={user} />
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-12">{children}</div>
      <BottomTabs isAdmin={!!user?.isAdmin} signedIn={!!user} />
    </>
  );
}
