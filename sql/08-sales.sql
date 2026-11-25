-- BDI Дэлгүүр: sales (Админ → Бараа → ✎ → Хямдрал).
--   sale_percent  «-20%»: every piece costs 20% less
--   sale_buy/free «2+1»: take 3, pay for 2 (the free piece is a separate 0₮ line)
--   sale_until    last day of the sale (empty = until you remove it)
-- Run after 04, 05 and 07 in the Supabase SQL editor. Safe to run again.

begin;

alter table public.teacher_products
  add column if not exists sale_percent smallint check (sale_percent is null or sale_percent between 1 and 90),
  add column if not exists sale_buy     smallint check (sale_buy is null or sale_buy between 1 and 20),
  add column if not exists sale_free    smallint check (sale_free is null or sale_free between 1 and 20),
  add column if not exists sale_until   date;

-- A product can now have two lines in one order (paid + free).
do $$
declare c text;
begin
  for c in
    select con.conname from pg_constraint con
     where con.conrelid = 'public.teacher_order_items'::regclass and con.contype = 'u'
  loop
    execute format('alter table public.teacher_order_items drop constraint %I', c);
  end loop;
end $$;

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

  -- Every line must be a shown, active, available product with a price
  -- («Байгаа» / «Дууссан» set by the admin wins over BDI's stock).
  with req as (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
  )
  select count(*) filter (
           where p.id is null
              or not p.active
              or coalesce(tp.hidden, false)
              or (case when tp.sold_out is not null then tp.sold_out else coalesce(p.stock, 0) <= 0 end)
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

  -- Lines with the sale applied: «-20%» lowers the price of each piece;
  -- «2+1» gives every third piece free, as its own 0₮ line.
  with req2 as (
    select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'qty')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
  )
  insert into teacher_order_items (order_id, product_id, name, image_url, qty, unit_price)
  select p_order_id, x.pid, x.name, x.image_url, x.qty, x.unit_price
    from (
      select p.id as pid,
             coalesce(nullif(btrim(tp.name), ''), p.name) as name,
             p.image_url,
             r.qty - d.free_qty as qty,
             round(coalesce(tp.price, pli.price, p.base_price)
                   * (1 - coalesce(case when d.active then tp.sale_percent end, 0) / 100.0)) as unit_price
        from req2 r
        join products p on p.id = r.product_id
        left join teacher_products tp on tp.product_id = p.id
        left join price_list_items pli on pli.price_list_id = v_list and pli.product_id = p.id
        cross join lateral (select
            (tp.sale_until is null or tp.sale_until >= (now() at time zone 'Asia/Ulaanbaatar')::date) as active) s0
        cross join lateral (select s0.active,
            case when s0.active and tp.sale_buy > 0 and tp.sale_free > 0
                 then (r.qty / (tp.sale_buy + tp.sale_free)) * tp.sale_free else 0 end as free_qty) d
      union all
      select p.id, coalesce(nullif(btrim(tp.name), ''), p.name) || ' (бэлэг)', p.image_url,
             (r.qty / (tp.sale_buy + tp.sale_free)) * tp.sale_free, 0
        from req2 r
        join products p on p.id = r.product_id
        join teacher_products tp on tp.product_id = p.id
       where tp.sale_buy > 0 and tp.sale_free > 0
         and (tp.sale_until is null or tp.sale_until >= (now() at time zone 'Asia/Ulaanbaatar')::date)
    ) x
   where x.qty > 0;

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

select count(*) filter (where sale_percent is not null or sale_buy is not null) as products_on_sale
  from public.teacher_products;
