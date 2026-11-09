-- BDI Дэлгүүр: optional clean-up after removing the «Өгсөн» (handed) step.
-- The site already treats old "handed" orders as paid («Төлсөн»), so this is
-- only tidying: it rewrites those rows. Safe to run more than once.

update public.teacher_orders set status = 'paid' where status = 'handed';

-- Check: no "handed" left.
select status, count(*) from public.teacher_orders group by status order by status;
