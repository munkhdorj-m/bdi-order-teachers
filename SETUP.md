# BDI Дэлгүүр: setup

A small, phone-first shop for teachers. It uses the BDI Supabase database for products, photos and prices, and keeps its own data in new `teacher_*` tables.

## 1. Keys (you do this, never paste them in chat)

Create a file named `.env.local` in this folder. Copy these two lines from `C:\Users\Munkhdorj\Desktop\bdi_test\web\.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional lines (see `.env.example`):

- `TEACHER_TELEGRAM_BOT_TOKEN` and `TEACHER_TELEGRAM_CHAT_ID`: new-order alerts to the teachers' own Telegram group (step 5).
- `TEACHER_PIN_PEPPER`: any long random text. You can add it later, but never change or remove it once set.

## 2. Database

In the Supabase SQL editor (the BDI project), run `sql/01-teacher-shop.sql`.
The last result should show `list_name` = «Захууд». If it's empty, pick the price list later on the admin Settings page.

## 3. Try it

```
npm install
npm run dev
```

Open http://localhost:3000 and sign up with **your own** phone number and a 4-digit PIN.

## 4. Make yourself admin

Open `sql/02-make-me-admin.sql`, put your phone number in place of `99999999`, and run it in the SQL editor.
Then open **Би → Админ** on the site, go to **Тохиргоо**, and fill in the bank account.

## 5. Teacher Telegram group (optional)

1. Create a new Telegram group for teacher orders.
2. Add the bot (BDI's bot works) and send `/start@YourBotName` in the group.
3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the group's `chat.id` (a negative number).
4. Put the token and that id in `TEACHER_TELEGRAM_BOT_TOKEN` / `TEACHER_TELEGRAM_CHAT_ID`. Restart `npm run dev`.

These are separate from BDI's `TELEGRAM_*` settings, so teacher orders never go to the BDI staff chat.

## 6. Put it online

1. Create a new Vercel project from this folder. `vercel.json` already picks Singapore (`sin1`), like BDI.
2. Add the same env vars as `.env.local`, plus `NEXT_PUBLIC_SITE_URL` = the site's address (for the Telegram «Нээх» button).
3. Add a domain or subdomain.

Teachers open the address on their phone and tap **Утсандаа суулгах** to install it.

## Notes

- Admins sign in like everyone else (phone + 4-digit PIN). 5 wrong PINs lock an account for 15 minutes (then longer).
- Forgotten PIN: Admin → Хэрэглэгч → **PIN шинэчлэх** shows a new PIN once.
- Teacher orders are separate from BDI orders and don't change BDI stock. Sold-out (stock 0) products show «Дууссан».
- Orders go «Төлөөгүй» → «Төлсөн». Older «Өгсөн» orders already show as «Төлсөн»; optionally run `sql/03-drop-handed-step.sql` to rewrite them.
- Admin → «Бараа»: show or hide each product on the site, and set this shop's own name / price / description (BDI's products stay unchanged). Run `sql/04-product-settings.sql` once first.
- Admin → «Аналитик»: sales, orders, top products / buyers / categories for 7, 30 or 90 days. «Авчрах» has a date range for each delivery batch.
- No e-Barimt receipts in this version.
