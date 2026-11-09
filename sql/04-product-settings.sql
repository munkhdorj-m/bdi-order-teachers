-- BDI Дэлгүүр: the admin's own product settings (Админ → Бараа).
-- BDI's products table is never changed; these rows sit on top of it:
--   hidden       not on the site and can't be ordered
--   name         the name teachers see        (empty = BDI's name)
--   price        the price teachers pay       (empty = price list «Захууд», else base price)
--   description  the product page text        (empty = BDI's description)
-- Run once in the Supabase SQL editor (BDI project). Safe to run again.

begin;

create table if not exists public.teacher_products (
  product_id  uuid primary key references public.products(id) on delete cascade,
  hidden      boolean not null default false,
  name        text check (name is null or char_length(btrim(name)) between 1 and 200),
  price       numeric(12,2) check (price is null or (price > 0 and price < 100000000)),
  description text check (description is null or char_length(description) <= 4000),
  updated_at  timestamptz not null default now()
);

-- Same rule as the other teacher_* tables: only the server (service role).
alter table public.teacher_products enable row level security;
revoke all on public.teacher_products from public, anon, authenticated;
grant select, insert, update, delete on public.teacher_products to service_role;

-- Orders follow the same settings: hidden products can't be ordered, and
-- the admin's name and price win. Otherwise unchanged from 01.
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

  -- Every line must be a shown, active, in-stock product with a price.
  with req as (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
  )
  select count(*) filter (
           where p.id is null
              or not p.active
              or coalesce(tp.hidden, false)
              or coalesce(p.stock, 0) <= 0
              or coalesce(tp.price, pli.price, p.base_price) is null
              or coalesce(tp.price, pli.price, p.base_price) <= 0
              or r.qty < 1 or r.qty > 999)
    into v_bad
    from req r
    left join products p on p.id = r.product_id
    left join teacher_products tp on tp.product_id = r.product_id
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
  select p_order_id,
         p.id,
         coalesce(nullif(btrim(tp.name), ''), p.name),
         p.image_url,
         r.qty,
         coalesce(tp.price, pli.price, p.base_price)
    from (select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int) as qty
            from jsonb_array_elements(p_items) e
           group by 1) r
    join products p on p.id = r.product_id
    left join teacher_products tp on tp.product_id = p.id
    left join price_list_items pli on pli.price_list_id = v_list and pli.product_id = p.id;

  update teacher_orders o
     set total = (select coalesce(sum(i.line_total), 0) from teacher_order_items i where i.order_id = p_order_id)
   where o.id = p_order_id;

  return query select p_order_id, v_number, false;
end;
$$;

revoke execute on function public.teacher_place_order(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant  execute on function public.teacher_place_order(uuid, uuid, jsonb, text) to service_role;

commit;

notify pgrst, 'reload schema';

-- Check: the table exists (0 rows to start with).
select count(*) as product_settings from public.teacher_products;
