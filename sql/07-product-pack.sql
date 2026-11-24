-- BDI Дэлгүүр: sell a product only as a «багц» of N pieces (Админ → Бараа → ✎).
--   pack  empty = sold by the piece (as before); 10 = teachers order 10, 20, 30 …
-- The price shown is per багц; orders still count pieces.
-- Run in the Supabase SQL editor (BDI project). Safe to run again.

alter table public.teacher_products
  add column if not exists pack smallint check (pack is null or pack between 2 and 500);

notify pgrst, 'reload schema';

select count(*) filter (where pack is not null) as products_sold_by_pack from public.teacher_products;
