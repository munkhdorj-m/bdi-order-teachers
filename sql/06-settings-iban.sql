-- BDI Дэлгүүр: IBAN for the payment account (Админ → Тохиргоо).
-- Teachers see it on the order page with a copy button.
-- Run in the Supabase SQL editor (BDI project). Safe to run again.

alter table public.teacher_settings
  add column if not exists iban text not null default ''
  check (char_length(iban) <= 40);

notify pgrst, 'reload schema';

-- Check: the column exists (empty until you save it in Тохиргоо).
select iban from public.teacher_settings where id = 1;
