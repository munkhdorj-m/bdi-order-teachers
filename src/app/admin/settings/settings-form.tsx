"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang";
import { Button } from "@/components/ui/button";
import { formatIban } from "@/lib/iban";
import type { ShopSettings } from "@/lib/server/settings";
import { saveSettingsAction, type SaveState } from "../actions";

export function SettingsForm({
  settings,
  lists,
  ibanReady,
}: {
  settings: ShopSettings;
  lists: { id: string; name: string }[];
  ibanReady: boolean;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(
    saveSettingsAction,
    null,
  );
  const { t } = useLang();

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="mx-auto max-w-5xl">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="card p-5">
            <label className="flex items-center gap-4">
              <span className="min-w-0 flex-1 text-[15px] font-bold">
                {t("Захиалга авах", "Take orders")}
              </span>
              <input
                type="checkbox"
                name="open"
                defaultChecked={settings.open}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-7 w-12 shrink-0 rounded-full bg-muted-strong transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-surface after:shadow-[0_1px_3px_rgb(0_0_0/0.25)] after:transition-transform peer-checked:after:translate-x-5"
              />
            </label>
            <label htmlFor="closed_message" className="label mt-5">
              {t("Хаалттай үед харагдах бичиг", "Message shown while closed")}
            </label>
            <input
              id="closed_message"
              name="closed_message"
              className="field"
              maxLength={200}
              defaultValue={settings.closed_message}
              placeholder={t(
                "Захиалга түр хаалттай",
                "The shop is closed for now",
              )}
            />
            <p className="mt-1.5 text-[12px] font-medium text-ink-3">
              {t(
                "Хоосон бол «Захиалга түр хаалттай» (англиар уншигчдад англиар) харагдана.",
                "If empty, teachers see «Захиалга түр хаалттай» (in English for English readers).",
              )}
            </p>
          </section>

          <section className="card p-5">
            <label htmlFor="price_list_id" className="label">
              {t("Үнийн жагсаалт", "Price list")}
            </label>
            <select
              id="price_list_id"
              name="price_list_id"
              className="field"
              defaultValue={settings.price_list_id ?? ""}
            >
              <option value="">{t("Үндсэн үнэ", "Base price")}</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </section>
        </div>

        <section className="card space-y-4 p-5">
          <h2 className="text-[15px] font-bold">
            {t("Төлбөрийн данс", "Payment account")}
          </h2>
          <div>
            <label htmlFor="bank_name" className="label">
              {t("Банк", "Bank")}
            </label>
            <input
              id="bank_name"
              name="bank_name"
              className="field"
              maxLength={100}
              defaultValue={settings.bank_name}
            />
          </div>
          <div>
            <label htmlFor="account_number" className="label">
              {t("Дансны дугаар", "Account number")}
            </label>
            <input
              id="account_number"
              name="account_number"
              className="field tabular-nums"
              maxLength={60}
              defaultValue={settings.account_number}
            />
          </div>
          <div>
            <label htmlFor="iban" className="label">
              IBAN
            </label>
            <input
              id="iban"
              name="iban"
              className="field uppercase tabular-nums tracking-wide"
              maxLength={42}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              defaultValue={formatIban(settings.iban)}
              placeholder="MN00 0000 0000 0000 0000"
              disabled={!ibanReady}
            />
            {!ibanReady && (
              <p className="mt-1.5 text-[12px] font-medium text-warn">
                {t(
                  "Эхлээд sql/06-settings-iban.sql-ийг ажиллуулна уу",
                  "First run sql/06-settings-iban.sql",
                )}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="account_name" className="label">
              {t("Данс эзэмшигч", "Account holder")}
            </label>
            <input
              id="account_name"
              name="account_name"
              className="field"
              maxLength={100}
              defaultValue={settings.account_name}
            />
          </div>
          <div>
            <label htmlFor="note" className="label">
              {t("Тэмдэглэл", "Note")}
            </label>
            <textarea
              id="note"
              name="note"
              className="field"
              rows={2}
              maxLength={500}
              defaultValue={settings.note}
            />
          </div>
        </section>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full lg:w-auto lg:min-w-48"
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {t("Хадгалах", "Save")}
        </Button>
      </div>
    </form>
  );
}
