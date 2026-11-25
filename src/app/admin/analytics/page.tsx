import {
  ANALYTICS_PERIODS,
  getAnalytics,
  type AnalyticsPeriod,
} from "@/lib/server/analytics";
import { getLang } from "@/lib/server/lang";
import { requireAdmin } from "@/lib/server/session";
import { AnalyticsView } from "./analytics-view";

/** Аналитик: last 7 / 30 / 90 days (default 30). */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  await requireAdmin();
  const d = Number((await searchParams).d);
  const days: AnalyticsPeriod = (
    ANALYTICS_PERIODS as readonly number[]
  ).includes(d)
    ? (d as AnalyticsPeriod)
    : 30;
  const [a, lang] = await Promise.all([getAnalytics(days), getLang()]);
  return <AnalyticsView a={a} lang={lang} />;
}
