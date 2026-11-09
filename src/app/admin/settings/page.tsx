import { requireAdmin } from "@/lib/server/session";
import { getSettings, listPriceLists } from "@/lib/server/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, lists] = await Promise.all([getSettings(), listPriceLists()]);
  return <SettingsForm settings={settings} lists={lists} />;
}
