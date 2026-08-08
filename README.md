# 🥥 Coconut Export Manager

Order management dashboard for **JEET AGENCY, Salem** — built with Next.js, Neon Postgres, and Tailwind CSS. Mobile-first UI with login, monthly auto order numbering (IST), CSV export, and daily Telegram reminders.

## Features

- **Orders** — month selector, summary counts (Total / Pending / Loaded / Cancelled), search by name or phone, inline status change, edit & delete.
- **Add / Edit Order** — auto-generated order number that **resets to 1 every month** (IST). Changing the order date to another month automatically assigns the next number of that month.
- **Sellers & Buyers** — chosen from a saved contact list with phone numbers; new names typed into an order are added to the list automatically. Managed under Settings.
- **Automatic dates** — setting an order's status to **Loaded** fills the Actual Loading Date with today's date (IST).
- **Reports** — download orders for any date range as CSV (opens in Excel).
- **Telegram reminders** — daily at 9:00 AM IST, alerts for orders whose **Loading Date is tomorrow** (or passed) while the Actual Loading Date is still empty.
- **Users** — logins are stored in the database with hashed passwords. Add users, change your own password, and reset another user's password under **Settings**.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
node scripts/init-db.mjs     # creates/updates tables; safe to re-run
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Long random string used to sign login sessions |
| `APP_USER_1` / `APP_PASS_1` | First login — **only used to seed the users table on the very first `init-db` run**. After that, manage users in Settings. |
| `APP_USER_2` / `APP_PASS_2` | Second login (same, seed only) |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Chat/group ID that receives reminders |
| `CRON_SECRET` | Random string; Vercel Cron uses it to call the reminder API |

## Deploy on Vercel

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com) → **Add New → Project** → import the repo (framework auto-detected as Next.js).
3. In **Settings → Environment Variables**, add every variable from the table above.
4. Deploy. `vercel.json` already schedules the reminder cron: daily at `30 3 * * *` UTC = **9:00 AM IST**, calling `/api/cron/reminders`.

## Telegram bot setup

1. In Telegram, open **@BotFather** → send `/newbot` → choose a name (e.g. *Coco Order Alerts*) and a username ending in `bot`. Copy the **token** → set as `TELEGRAM_BOT_TOKEN`.
2. Create a Telegram **group** with the two staff members, and add the bot to the group.
3. Send any message in the group, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
   in a browser and copy `chat.id` (group IDs are negative, e.g. `-100123456789`) → set as `TELEGRAM_CHAT_ID`.
4. Add both values in Vercel env vars → redeploy → **Settings → Telegram Reminders → Send test message**.

## Notes

- Order dates are stored in UTC and always displayed in **IST (Asia/Kolkata)**.
- Statuses: Pending, Loaded, Cancelled.
- Tables: `orders`, `parties` (sellers & buyers), `users`.
- The original client requirement document is in [docs/](docs/).
