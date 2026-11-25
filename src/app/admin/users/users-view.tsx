"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Ban,
  KeyRound,
  LockOpen,
  Phone,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang";
import { EmptyState } from "@/components/page-header";
import { Avatar } from "@/components/shop-header";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyButton } from "@/components/ui/copy-button";
import { Sheet } from "@/components/ui/sheet";
import { formatDateTime, formatMnt, formatPhone } from "@/lib/format";
import type { AdminAccount } from "@/lib/server/accounts";
import { searchNormalize } from "@/lib/translit";
import { cn } from "@/lib/utils";
import {
  deleteAccountAction,
  resetPinAction,
  setActiveAction,
} from "../actions";

export function UsersView({
  accounts,
  meId,
}: {
  accounts: AdminAccount[];
  meId: string;
}) {
  const [query, setQuery] = useState("");
  const [newPin, setNewPin] = useState<{ name: string; pin: string } | null>(
    null,
  );
  const router = useRouter();
  const { t } = useLang();

  const q = searchNormalize(query);
  const shown = q
    ? accounts.filter((a) =>
        searchNormalize(`${a.full_name} ${a.phone}`).includes(q),
      )
    : accounts;

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3"
            strokeWidth={2.2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Нэр, утас", "Name, phone")}
            aria-label={t("Хайх", "Search")}
            className="field h-11 pl-10"
          />
        </div>
        <p className="text-[13px] font-semibold text-ink-3 md:ml-auto">
          {t(
            `${shown.length} хэрэглэгч`,
            `${shown.length} ${shown.length === 1 ? "user" : "users"}`,
          )}
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Users />} text={t("Хэрэглэгч алга", "No users")} />
      ) : (
        <ul className="mt-4 grid grid-cols-1 items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((a) => (
            <li
              key={a.id}
              className={cn("card p-4", !a.active && "opacity-70")}
            >
              <div className="flex items-center gap-3">
                <Avatar name={a.full_name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="min-w-0 truncate text-[15px] font-bold">
                      {a.full_name}
                    </span>
                    {a.is_admin && (
                      <Badge className="bg-primary-soft text-primary-ink">
                        {t("Админ", "Admin")}
                      </Badge>
                    )}
                    {!a.active && (
                      <Badge className="bg-danger-soft text-danger">
                        {t("Хаасан", "Blocked")}
                      </Badge>
                    )}
                    {a.locked && (
                      <Badge className="bg-warn-soft text-warn">
                        {t("Түгжигдсэн", "Locked")}
                      </Badge>
                    )}
                  </div>
                  <a
                    href={`tel:${a.phone}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 tabular-nums hover:text-ink"
                  >
                    <Phone className="size-3.5" />
                    {formatPhone(a.phone)}
                  </a>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 px-3 py-2 text-[12.5px]">
                <div>
                  <div className="font-medium text-ink-3">
                    {t("Захиалга", "Orders")}
                  </div>
                  <div className="font-bold tabular-nums">
                    {a.orders} · {formatMnt(a.total)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-ink-3">
                    {t("Төлөөгүй", "Unpaid")}
                  </div>
                  <div
                    className={cn(
                      "font-bold tabular-nums",
                      a.unpaid > 0 && "text-warn",
                    )}
                  >
                    {formatMnt(a.unpaid)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11.5px] font-medium text-ink-3 tabular-nums">
                {formatDateTime(a.created_at)}
              </div>

              {a.id !== meId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ConfirmButton
                    question={t(
                      `${a.full_name}: шинэ PIN үүсгэх үү?`,
                      `${a.full_name}: make a new PIN?`,
                    )}
                    confirmLabel={t("Үүсгэх", "Make PIN")}
                    size="sm"
                    onConfirm={async () => {
                      const res = await resetPinAction(a.id);
                      if ("pin" in res)
                        setNewPin({ name: a.full_name, pin: res.pin });
                      else toast.error(res.error);
                      router.refresh();
                    }}
                  >
                    <KeyRound />
                    {t("PIN шинэчлэх", "Reset PIN")}
                  </ConfirmButton>
                  <ConfirmButton
                    question={
                      a.active
                        ? t(
                            `${a.full_name}-г хаах уу?`,
                            `Block ${a.full_name}?`,
                          )
                        : t(
                            `${a.full_name}-г нээх үү?`,
                            `Unblock ${a.full_name}?`,
                          )
                    }
                    confirmLabel={
                      a.active ? t("Хаах", "Block") : t("Нээх", "Unblock")
                    }
                    danger={a.active}
                    size="sm"
                    variant={a.active ? "ghost" : "secondary"}
                    onConfirm={async () => {
                      const res = await setActiveAction(a.id, !a.active);
                      if (!res.ok)
                        toast.error(
                          res.error ??
                            t("Алдаа гарлаа", "Something went wrong"),
                        );
                      router.refresh();
                    }}
                  >
                    {a.active ? <Ban /> : <LockOpen />}
                    {a.active ? t("Хаах", "Block") : t("Нээх", "Unblock")}
                  </ConfirmButton>
                  {/* Deletes the person and all their orders. «Хаах» keeps the orders. */}
                  <ConfirmButton
                    question={
                      <>
                        {t(
                          `${a.full_name}-г устгах уу?`,
                          `Delete ${a.full_name}?`,
                        )}
                        <span className="mt-1 block text-[13px] font-medium text-ink-3">
                          {a.allOrders > 0
                            ? t(
                                `${a.allOrders} захиалга нь хамт устна. `,
                                `Their ${a.allOrders} ${a.allOrders === 1 ? "order is" : "orders are"} deleted too. `,
                              )
                            : ""}
                          {t("Буцаах боломжгүй", "This can't be undone")}
                        </span>
                      </>
                    }
                    confirmLabel={t("Устгах", "Delete")}
                    danger
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                    onConfirm={async () => {
                      const res = await deleteAccountAction(a.id);
                      if (res.ok) {
                        toast.success(
                          res.orders > 0
                            ? t(
                                `Устгалаа (${res.orders} захиалга)`,
                                `Deleted (${res.orders} ${res.orders === 1 ? "order" : "orders"})`,
                              )
                            : t("Устгалаа", "Deleted"),
                        );
                      } else toast.error(res.error);
                      router.refresh();
                    }}
                  >
                    <Trash2 />
                    {t("Устгах", "Delete")}
                  </ConfirmButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={!!newPin}
        onOpenChange={(v) => !v && setNewPin(null)}
        title={
          newPin ? t(`${newPin.name}: шинэ PIN`, `${newPin.name}: new PIN`) : ""
        }
      >
        {newPin && (
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className="rounded-2xl bg-muted px-8 py-4 text-[40px] font-extrabold tracking-[0.25em] tabular-nums">
              {newPin.pin}
            </div>
            <CopyButton value={newPin.pin} />
            <p className="text-center text-[14px] font-medium text-ink-3">
              {t(
                "Зөвхөн одоо харагдана. Хэрэглэгчид өгнө үү.",
                "Shown only now. Give it to the user.",
              )}
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setNewPin(null)}
            >
              {t("Болсон", "Done")}
            </Button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold",
        className,
      )}
    >
      {children}
    </span>
  );
}
