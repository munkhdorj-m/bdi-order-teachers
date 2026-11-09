import { requireAdmin } from "@/lib/server/session";
import { getSettings, listPriceLists, settingsIbanReady } from "@/lib/server/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, lists, ibanReady] = await Promise.all([getSettings(), listPriceLists(), settingsIbanReady()]);
  return <SettingsForm settings={settings} lists={lists} ibanReady={ibanReady} />;
}
