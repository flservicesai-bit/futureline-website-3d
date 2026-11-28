# Claude connector and Telegram alerts

## Claude connector (read-only admin data)

futureline.ai runs an MCP server at **`https://futureline.ai/api/mcp`**, so an
admin can ask Claude about clients, leads, orders, courses and sent emails.

### Connect it

1. In Claude: **Settings → Connectors → Add custom connector**.
2. Name it `FutureLine`, URL `https://futureline.ai/api/mcp`, then **Add**.
3. Click **Connect**. Claude opens futureline.ai. Sign in with the **admin**
   account if asked, check the page, then click **Allow**.

Claude Code can use the same URL:

```bash
claude mcp add --transport http futureline https://futureline.ai/api/mcp
```

### Tools (all read-only)

| Tool | What it answers |
|---|---|
| `get_overview` | Users, leads by stage, follow-ups due, orders, revenue, enrolments and emails over N days |
| `search_people` | Finds users and leads by name, email, phone or company |
| `list_users` | Accounts by role or sign-up date, with order and enrolment counts |
| `get_client` | One person: account, orders, enrolments and progress, leads, recent emails |
| `list_leads` | Pipeline, filtered by stage, priority, source, search, age or "follow-up due" |
| `get_lead` | One lead with its activity history and notes |
| `list_orders` | Orders and payments by status, method or age, with totals (OMR) |
| `get_course_stats` | Per course: enrolments, completions, average progress, paid orders, revenue |
| `list_emails` | The email log: what the site sent, to whom, and whether it was delivered |

### Security

- **Admins only.** Only an active `ADMIN` account can approve a connection or
  use one. If the account loses the admin role or is deactivated, access stops.
- **Sign-in is OAuth 2.1 with PKCE.** Claude registers itself
  (`/api/oauth/register`). Only Claude's own return addresses (claude.ai,
  claude.com) and local ones (`localhost`, for Claude Code) are accepted, so
  nobody can register a look-alike app that collects approvals.
- **Tokens** last 1 hour and refresh for up to 30 days. Each refresh replaces the
  old pair. Codes and tokens are stored only as SHA-256 hashes.
- **To disconnect:** go to **Admin → Settings → Claude connector → Revoke**.
  Changing or resetting the admin password also disconnects every app.
- **What the tools never read:** password hashes, reset or verification tokens,
  and email bodies.
- **Audit log:** every tool call is recorded in `McpAuditLog` (who, which app,
  which tool, the arguments).
- **Rate limits:** 120 calls a minute per connection, plus limits on
  registration and on the token endpoint.

Code: `src/lib/oauth.ts`, `src/app/api/oauth/*`, `src/app/api/mcp/route.ts`,
`src/lib/mcp/admin-tools.ts`. Discovery documents are at
`/.well-known/oauth-protected-resource` and
`/.well-known/oauth-authorization-server` (rewrites in `next.config.js`).

## Email log

Every email goes through `sendEmail` (`src/lib/notifications.ts`), which records
it in `EmailLog`: recipient, subject, type (`welcome`, `new_enrollment`,
`admin_new_lead`…), status (`SENT`, `FAILED`, `NOT_SENT`, `LOGGED` in
development) and Resend's id. **Bodies are not stored**, because they can
contain password-reset and verification links. The log starts empty on the
day it is deployed.

## Telegram alerts

The site's bot posts to Telegram when any of these happens:

| Event | Where it fires |
|---|---|
| 🆕 New lead (any form or the get-started flow) | `api/leads` |
| 👤 New sign-up (email & password, or Google) | `api/auth/register`, `lib/google-account.ts` |
| 💳 Card payment received | `lib/ompay-orders.ts` |
| 🎓 Enrolment in a free course | `api/checkout` |
| ⚠️ An email failed or could not be sent | `lib/notifications.ts` |

### Set it up

1. In Telegram, message **@BotFather**, send `/newbot`, and follow the steps.
   It gives you a **bot token**.
2. Send your new bot any message (or add it to a group and post there).
3. Find the chat id:

   ```bash
   curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates"
   ```

   It is `message.chat.id` in the reply (negative for groups).
4. Add both values to `/opt/futureline/.env` and reload the app
   (`pm2 reload futureline-web --update-env`):

   ```bash
   TELEGRAM_BOT_TOKEN="…"
   TELEGRAM_CHAT_ID="…"   # several chats: comma-separated
   ```

If either value is missing, the site sends no alerts and does nothing else
differently. A Telegram failure is logged and never affects the request that
triggered the alert.
