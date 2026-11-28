/**
 * Telegram alerts for the admin team, sent by the site's own bot.
 *
 *   TELEGRAM_BOT_TOKEN  from @BotFather (secret)
 *   TELEGRAM_CHAT_ID    the chat, group or channel that receives the alerts;
 *                       several may be given, comma-separated
 *   TELEGRAM_API_BASE   optional override of https://api.telegram.org (tests)
 *
 * Unset, nothing is sent. Sending never throws and never waits long: an alert
 * must not delay or break the request that triggered it.
 */

const TIMEOUT_MS = 8_000;

export function telegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN?.trim() && !!process.env.TELEGRAM_CHAT_ID?.trim();
}

/** Escapes text for Telegram's HTML parse mode. */
export function tgEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Sends one HTML-formatted message to every configured chat. Resolves false on any failure. */
export async function sendTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chats = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (!token || chats.length === 0) return false;

  const base = (process.env.TELEGRAM_API_BASE?.trim() || 'https://api.telegram.org').replace(/\/+$/, '');
  // Telegram caps a message at 4096 characters.
  const text = html.length > 4000 ? `${html.slice(0, 3990)}…` : html;

  const results = await Promise.all(
    chats.map(async (chatId) => {
      try {
        const res = await fetch(`${base}/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) {
          // Telegram's description says why (bad chat id, bot not in the group…); never log the token.
          const body = await res.json().catch(() => ({}));
          console.error(`[Telegram] sendMessage to ${chatId} failed: HTTP ${res.status} ${body?.description || ''}`);
          return false;
        }
        return true;
      } catch (err) {
        console.error(`[Telegram] sendMessage to ${chatId} failed: ${(err as Error).message}`);
        return false;
      }
    }),
  );
  return results.every(Boolean);
}
