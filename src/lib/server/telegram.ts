import "server-only";

/**
 * New-order alerts to the teachers' own Telegram group (adapted from
 * BDI's lib/telegram.ts). Separate settings from BDI on purpose, so a
 * copied BDI .env can never send these to the BDI staff chat:
 *
 *   TEACHER_TELEGRAM_BOT_TOKEN   a bot token (BDI's bot is fine)
 *   TEACHER_TELEGRAM_CHAT_ID     the teacher group's chat id (negative);
 *                                comma-separated for several chats
 *
 * Errors are logged and swallowed: Telegram trouble never breaks an order.
 */

const TOKEN = process.env.TEACHER_TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TEACHER_TELEGRAM_CHAT_ID ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Public https address for the button; Telegram rejects localhost links. */
function publicBaseUrl(): string | null {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  for (const raw of [process.env.NEXT_PUBLIC_SITE_URL, vercel ? `https://${vercel}` : undefined]) {
    if (!raw) continue;
    try {
      const u = new URL(raw);
      const local = u.hostname === "localhost" || u.hostname.endsWith(".localhost") || /^[\d.]+$/.test(u.hostname) || u.hostname.startsWith("[");
      if (u.protocol === "https:" && !local) return raw.replace(/\/+$/, "");
    } catch {
      /* not a URL */
    }
  }
  return null;
}

export async function sendTelegram(msg: { title: string; lines?: string[]; href?: string }): Promise<void> {
  if (!TOKEN || CHAT_IDS.length === 0) return;
  const text = [`<b>${escapeHtml(msg.title)}</b>`, ...(msg.lines ?? []).map(escapeHtml)].join("\n");
  const base = publicBaseUrl();
  const url = msg.href && base ? `${base}${msg.href}` : null;

  await Promise.all(
    CHAT_IDS.map(async (chat_id) => {
      const body = {
        chat_id,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...(url ? { reply_markup: { inline_keyboard: [[{ text: "Нээх", url }]] } } : {}),
      };
      try {
        const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          console.error(`telegram sendMessage failed (${res.status}):`, (await res.text().catch(() => "")).slice(0, 300));
        }
      } catch (e) {
        console.error("telegram send threw:", (e as Error)?.message);
      }
    }),
  );
}
