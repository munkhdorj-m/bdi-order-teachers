import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { InstallApp } from "@/components/install-app";
import { LangSwitch } from "@/components/lang";
import { MenuRowContent, menuRowClass } from "@/components/menu-row";
import { PageTitle } from "@/components/page-header";
import { Avatar } from "@/components/shop-header";
import { formatPhone } from "@/lib/format";
import { getT } from "@/lib/server/lang";
import { requireTeacher } from "@/lib/server/session";
import { ChangePin } from "./change-pin";
import { SignOutButton } from "./sign-out-button";

export default async function MePage() {
  const me = await requireTeacher("/me");
  const t = await getT();
  return (
    <div className="mx-auto max-w-4xl px-3 pt-4 sm:px-6 lg:px-8 lg:pt-8">
      <PageTitle title={t("Би", "Me")} />
      <div className="mt-4 grid gap-4 md:grid-cols-[300px_minmax(0,1fr)] md:items-start">
        <section className="card flex items-center gap-4 p-5 md:flex-col md:items-start">
          <Avatar name={me.full_name} size={56} />
          <div className="min-w-0">
            <div className="truncate text-[19px] font-bold">{me.full_name}</div>
            <div className="text-[14px] font-medium text-ink-3 tabular-nums">{formatPhone(me.phone)}</div>
          </div>
        </section>

        <div className="space-y-4">
          <div className="card divide-y divide-line overflow-hidden">
            {me.is_admin && (
              <Link href="/admin" className={menuRowClass}>
                <MenuRowContent icon={<LayoutDashboard />} label={t("Админ", "Admin")} tone="brand" />
              </Link>
            )}
            <InstallApp variant="row" />
            <ChangePin />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[15px] font-semibold">{t("Хэл", "Language")}</span>
              <LangSwitch />
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
