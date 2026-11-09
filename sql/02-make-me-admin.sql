-- ============================================================
-- Make yourself admin (run AFTER 01, and after you sign up on the site).
-- Put YOUR 8-digit phone number in place of 99999999, then run.
-- ============================================================

update public.teacher_accounts set is_admin = true where phone = '99999999';

-- Check: your row should show is_admin = true.
select phone, full_name, is_admin from public.teacher_accounts where is_admin;
