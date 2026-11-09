"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ShopSettings } from "@/lib/server/settings";
import { saveSettingsAction, type SaveState } from "../actions";

export function SettingsForm({ settings, lists }: { settings: ShopSettings; lists: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveSettingsAction, null);

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
              <span className="min-w-0 flex-1 text-[15px] font-bold">Захиалга авах</span>
              <input type="checkbox" name="open" defaultChecked={settings.open} className="peer sr-only" />
              <span
                aria-hidden="true"
                className="relative h-7 w-12 shrink-0 rounded-full bg-muted-strong transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-surface after:shadow-[0_1px_3px_rgb(0_0_0/0.25)] after:transition-transform peer-checked:after:translate-x-5"
              />
            </label>
            <label htmlFor="closed_message" className="label mt-5">
              Хаалттай үед харагдах бичиг
            </label>
            <input
              id="closed_message"
              name="closed_message"
              className="field"
              maxLength={200}
              defaultValue={settings.closed_message}
              placeholder="Захиалга түр хаалттай"
            />
          </section>

          <section className="card p-5">
            <label htmlFor="price_list_id" className="label">
              Үнийн жагсаалт
            </label>
            <select id="price_list_id" name="price_list_id" className="field" defaultValue={settings.price_list_id ?? ""}>
              <option value="">Үндсэн үнэ</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </section>
        </div>

        <section className="card space-y-4 p-5">
          <h2 className="text-[15px] font-bold">Төлбөрийн данс</h2>
          <div>
            <label htmlFor="bank_name" className="label">
              Банк
            </label>
            <input id="bank_name" name="bank_name" className="field" maxLength={100} defaultValue={settings.bank_name} />
          </div>
          <div>
            <label htmlFor="account_number" className="label">
              Дансны дугаар
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
            <label htmlFor="account_name" className="label">
              Данс эзэмшигч
            </label>
            <input id="account_name" name="account_name" className="field" maxLength={100} defaultValue={settings.account_name} />
          </div>
          <div>
            <label htmlFor="note" className="label">
              Тэмдэглэл
            </label>
            <textarea id="note" name="note" className="field" rows={2} maxLength={500} defaultValue={settings.note} />
          </div>
        </section>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" variant="primary" size="lg" className="w-full lg:w-auto lg:min-w-48" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Хадгалах
        </Button>
      </div>
    </form>
  );
}
