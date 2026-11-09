-- ============================================================
-- BDI Дэлгүүр (the teacher shop): tables and functions
-- ============================================================
-- Run once in the Supabase SQL editor of the BDI project.
-- Safe to run again.
--
-- Adds new teacher_* tables only. BDI's own tables are only READ
-- (products, categories, price_lists, price_list_items) and nothing
-- here changes them. Buyers never use Supabase Auth, so they never
-- appear in BDI's user list.
--
-- Security: every table has RLS on with NO policies, and anon /
-- authenticated get no access. Only the website's server (the
-- service role) can read or write. The functions are callable by the
-- service role only.
-- ============================================================

begin;

-- ---- Accounts ---------------------------------------------------------

create table if not exists public.teacher_accounts (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null unique check (phone ~ '^[0-9]{8}$'),
  full_name     text not null check (char_length(full_name) between 1 and 80),
  pin_hash      text not null,
  is_admin      boolean not null default false,
  active        boolean not null default true,
  pin_attempts  int not null default 0,
  lock_count    int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---- Sessions (the cookie holds a token; only its sha256 is here) ------

create table if not exists public.teacher_sessions (
  token_hash text primary key,
  account_id uuid not null references public.teacher_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists teacher_sessions_account_idx on public.teacher_sessions(account_id);

-- ---- Orders -------------------------------------------------------------

create sequence if not exists public.teacher_order_seq;

create table if not exists public.teacher_orders (
  id           uuid primary key,  -- the phone's checkout id: a re-sent checkout finds its order
  order_number text not null unique,
  account_id   uuid not null references public.teacher_accounts(id),
  status       text not null default 'new' check (status in ('new', 'paid', 'handed', 'cancelled')),
  total        numeric(12,2) not null default 0 check (total >= 0),
  note         text check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  handed_at    timestamptz,
  cancelled_at timestamptz
);
create index if not exists teacher_orders_account_idx on public.teacher_orders(account_id, created_at desc);
create index if not exists teacher_orders_status_idx on public.teacher_orders(status, created_at desc);

-- product_id is "set null" on delete so this table never stops BDI from
-- deleting a product; name and photo are kept as snapshots.
create table if not exists public.teacher_order_items (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.teacher_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  image_url  text,
  qty        int not null check (qty > 0 and qty <= 999),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (qty * unit_price) stored,
  unique (order_id, product_id)
);
create index if not exists teacher_order_items_product_idx on public.teacher_order_items(product_id);

-- ---- Settings (one row) -------------------------------------------------

create table if not exists public.teacher_settings (
  id             int primary key default 1 check (id = 1),
  bank_name      text not null default '',
  account_number text not null default '',
  account_name   text not null default '',
  note           text not null default '',
  price_list_id  uuid references public.price_lists(id) on delete set null,
  open           boolean not null default true,
  closed_message text not null default '',
  updated_at     timestamptz not null default now()
);

-- Prices: the BDI price list «Захууд» by default (base_price where a
-- product isn't on it). Can be changed later on the admin Settings page.
insert into public.teacher_settings (id, price_list_id)
select 1, (select pl.id from public.price_lists pl where pl.name = 'Захууд' limit 1)
on conflict (id) do nothing;

-- ---- Rate limits ----------------------------------------------------------

create table if not exists public.teacher_throttle (
  key        text primary key,
  hits       int not null,
  window_end timestamptz not null
);

-- ---- Lock everything down -----------------------------------------------

alter table public.teacher_accounts    enable row level security;
alter table public.teacher_sessions    enable row level security;
alter table public.teacher_orders      enable row level security;
alter table public.teacher_order_items enable row level security;
alter table public.teacher_settings    enable row level security;
alter table public.teacher_throttle    enable row level security;

revoke all on public.teacher_accounts, public.teacher_sessions, public.teacher_orders,
              public.teacher_order_items, public.teacher_settings, public.teacher_throttle
  from public, anon, authenticated;
revoke all on sequence public.teacher_order_seq from public, anon, authenticated;

grant select, insert, update, delete on public.teacher_accounts, public.teacher_sessions,
  public.teacher_orders, public.teacher_order_items, public.teacher_settings,
  public.teacher_throttle to service_role;
grant usage, select on sequence public.teacher_order_seq to service_role;

-- ---- Functions ------------------------------------------------------------

-- Next order number: Б-0001, Б-0002, … (Б-10000 and on after that).
create or replace function public.teacher_next_order_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'Б-' || case when n < 10000 then lpad(n::text, 4, '0') else n::text end
    from (select nextval('public.teacher_order_seq') as n) s;
$$;

-- One PIN try, reserved BEFORE the PIN is checked. Row-locked, so many
-- guesses at once can't skip the limit. Returns false while locked.
-- The 5th try in a row arms a lock: 15 min, doubling each time, max 24 h.
-- An expired lock gives a fresh 5 tries. The server clears the counters
-- after a correct PIN.
create or replace function public.teacher_pin_attempt(p_account uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
  v_locks    int;
  v_until    timestamptz;
begin
  select pin_attempts, lock_count, locked_until
    into v_attempts, v_locks, v_until
    from teacher_accounts
   where id = p_account
     for update;
  if not found then
    return false;
  end if;

  if v_until is not null and v_until > now() then
    return false;
  end if;
  if v_until is not null then
    v_attempts := 0;
    v_until := null;
  end if;

  v_attempts := v_attempts + 1;
  if v_attempts >= 5 then
    v_until := now() + least(interval '15 minutes' * power(2, least(v_locks, 10)), interval '24 hours');
    v_locks := v_locks + 1;
  end if;

  update teacher_accounts
     set pin_attempts = v_attempts, lock_count = v_locks, locked_until = v_until
   where id = p_account;
  return true;
end;
$$;

-- Rate limit: count one hit on p_key; false once over p_max within the
-- window. Atomic (one upsert).
create or replace function public.teacher_throttle_hit(p_key text, p_max int, p_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  insert into teacher_throttle as t (key, hits, window_end)
  values (p_key, 1, now() + make_interval(secs => p_seconds))
  on conflict (key) do update
     set hits       = case when t.window_end <= now() then 1 else t.hits + 1 end,
         window_end = case when t.window_end <= now() then now() + make_interval(secs => p_seconds)
                           else t.window_end end
  returning hits into v_hits;

  -- Now and then, drop windows that ended long ago.
  if random() < 0.02 then
    delete from teacher_throttle where window_end < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

-- Place an order in one go. Prices come from the database here (the
-- chosen price list, else base_price), never from the phone. A re-sent
-- checkout (same p_order_id) returns the order it already made.
-- p_items: [{"product_id": "<uuid>", "qty": 2}, ...]
create or replace function public.teacher_place_order(
  p_order_id   uuid,
  p_account_id uuid,
  p_items      jsonb,
  p_note       text
)
returns table (order_id uuid, order_number text, duplicate boolean)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_owner  uuid;
  v_number text;
  v_list   uuid;
  v_open   boolean;
  v_bad    int;
begin
  select o.account_id, o.order_number into v_owner, v_number
    from teacher_orders o where o.id = p_order_id;
  if found then
    if v_owner <> p_account_id then
      raise exception 'order_id_taken';
    end if;
    return query select p_order_id, v_number, true;
    return;
  end if;

  if not exists (select 1 from teacher_accounts a where a.id = p_account_id and a.active) then
    raise exception 'account_inactive';
  end if;

  select s.price_list_id, s.open into v_list, v_open from teacher_settings s where s.id = 1;
  if not coalesce(v_open, false) then
    raise exception 'shop_closed';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 100 then
    raise exception 'bad_items';
  end if;

  -- Every line must be an active, in-stock product with a price.
  with req as (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
  )
  select count(*) filter (
           where p.id is null
              or not p.active
              or coalesce(p.stock, 0) <= 0
              or coalesce(pli.price, p.base_price) is null
              or coalesce(pli.price, p.base_price) <= 0
              or r.qty < 1 or r.qty > 999)
    into v_bad
    from req r
    left join products p on p.id = r.product_id
    left join price_list_items pli on pli.price_list_id = v_list and pli.product_id = r.product_id;
  if v_bad > 0 then
    raise exception 'items_unavailable';
  end if;

  v_number := teacher_next_order_number();

  insert into teacher_orders (id, order_number, account_id, status, total, note)
  values (p_order_id, v_number, p_account_id, 'new', 0, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (id) do nothing;
  if not found then
    -- The same checkout arrived twice at once and the other one won.
    select o.account_id, o.order_number into v_owner, v_number
      from teacher_orders o where o.id = p_order_id;
    if v_owner is distinct from p_account_id then
      raise exception 'order_id_taken';
    end if;
    return query select p_order_id, v_number, true;
    return;
  end if;

  insert into teacher_order_items (order_id, product_id, name, image_url, qty, unit_price)
  select p_order_id, p.id, p.name, p.image_url, r.qty, coalesce(pli.price, p.base_price)
    from (select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int) as qty
            from jsonb_array_elements(p_items) e
           group by 1) r
    join products p on p.id = r.product_id
    left join price_list_items pli on pli.price_list_id = v_list and pli.product_id = p.id;

  update teacher_orders o
     set total = (select coalesce(sum(i.line_total), 0) from teacher_order_items i where i.order_id = p_order_id)
   where o.id = p_order_id;

  return query select p_order_id, v_number, false;
end;
$$;

revoke execute on function public.teacher_next_order_number()                   from public, anon, authenticated;
revoke execute on function public.teacher_pin_attempt(uuid)                     from public, anon, authenticated;
revoke execute on function public.teacher_throttle_hit(text, int, int)          from public, anon, authenticated;
revoke execute on function public.teacher_place_order(uuid, uuid, jsonb, text)  from public, anon, authenticated;
grant  execute on function public.teacher_next_order_number()                   to service_role;
grant  execute on function public.teacher_pin_attempt(uuid)                     to service_role;
grant  execute on function public.teacher_throttle_hit(text, int, int)          to service_role;
grant  execute on function public.teacher_place_order(uuid, uuid, jsonb, text)  to service_role;

commit;

-- Let the API see the new tables right away.
notify pgrst, 'reload schema';

-- ============================================================
-- Check: which price list did the shop pick? Expect «Захууд».
-- (Empty list_name = no list named exactly «Захууд» was found, so
-- base prices are used; pick a list on the admin Settings page.)
-- ============================================================
select s.id, s.open, pl.name as list_name
  from public.teacher_settings s
  left join public.price_lists pl on pl.id = s.price_list_id;
