begin;

-- There was no persisted loyalty rule in the original schema. These values
-- formalize the existing customer-program convention: one point per 10,000 VND
-- paid and a 1,500-point next-reward target previously shown in the UI.
create table if not exists public.loyalty_program_settings (
  id boolean primary key default true check (id),
  vnd_per_point bigint not null default 10000 check (vnd_per_point > 0),
  next_reward_threshold integer not null default 1500 check (next_reward_threshold > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.loyalty_program_settings (id, vnd_per_point, next_reward_threshold)
values (true, 10000, 1500)
on conflict (id) do nothing;

alter table public.loyalty_program_settings enable row level security;
grant select on public.loyalty_program_settings to authenticated;

drop policy if exists "Authenticated users can view loyalty program settings" on public.loyalty_program_settings;
create policy "Authenticated users can view loyalty program settings"
on public.loyalty_program_settings for select to authenticated using (true);

create table if not exists public.loyalty_point_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  points integer not null check (points >= 0),
  created_at timestamptz not null default now()
);

create index if not exists loyalty_point_entries_customer_id_idx
  on public.loyalty_point_entries (customer_id);

alter table public.loyalty_point_entries enable row level security;

alter table public.orders add column if not exists checkout_request_id uuid;
create unique index if not exists orders_checkout_request_id_unique_idx
  on public.orders (checkout_request_id)
  where checkout_request_id is not null;

drop function if exists public.complete_sale(jsonb, bigint, bigint, bigint, public.payment_method, uuid);

create function public.complete_sale(
  p_items jsonb,
  p_discount_vnd bigint,
  p_tax_vnd bigint,
  p_total_vnd bigint,
  p_payment_method public.payment_method,
  p_customer_id uuid default null,
  p_checkout_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale_order public.orders%rowtype;
  sale_item record;
  calculated_subtotal bigint := 0;
  calculated_total bigint := 0;
  next_stock integer;
  generated_order_number text;
  vnd_per_point_value bigint;
  points_earned integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to complete a sale.' using errcode = '42501';
  end if;
  if p_checkout_request_id is null then
    raise exception 'A checkout request id is required.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'The cart must contain at least one item.';
  end if;
  if p_discount_vnd < 0 or p_tax_vnd < 0 or p_total_vnd < 0 then
    raise exception 'Invalid order totals.';
  end if;

  perform pg_advisory_xact_lock(hashtext('sn_pos_complete_sale'));

  select * into sale_order
  from public.orders
  where checkout_request_id = p_checkout_request_id;

  if found then
    select entry.points into points_earned
    from public.loyalty_point_entries entry
    where entry.order_id = sale_order.id;

    return jsonb_build_object(
      'orderNumber', sale_order.order_number,
      'completedAt', sale_order.completed_at,
      'pointsEarned', coalesce(points_earned, 0)
    );
  end if;

  create temporary table sale_input on commit drop as
  select
    (entry->>'variant_id')::uuid as variant_id,
    sum((entry->>'quantity')::integer)::integer as quantity
  from jsonb_array_elements(p_items) as entry
  group by (entry->>'variant_id')::uuid;

  if exists (select 1 from sale_input where quantity <= 0) then
    raise exception 'Invalid item quantity.';
  end if;

  for sale_item in
    select input.variant_id, input.quantity, variant.sku, variant.size, variant.color, variant.price_vnd,
      variant.stock_quantity, product.name as product_name
    from sale_input input
    join public.product_variants variant on variant.id = input.variant_id
    join public.products product on product.id = variant.product_id
    where product.status = 'active'
    for update of variant
  loop
    calculated_subtotal := calculated_subtotal + sale_item.price_vnd * sale_item.quantity;
  end loop;

  if (select count(*) from sale_input) <> (select count(*) from public.product_variants variant join sale_input input on input.variant_id = variant.id join public.products product on product.id = variant.product_id where product.status = 'active') then
    raise exception 'One or more product variants are unavailable.';
  end if;

  if p_discount_vnd > calculated_subtotal then
    raise exception 'Discount cannot exceed the order subtotal.';
  end if;
  calculated_total := calculated_subtotal - p_discount_vnd + p_tax_vnd;
  if calculated_total <> p_total_vnd then
    raise exception 'Order total no longer matches the current product prices.';
  end if;

  generated_order_number := to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  insert into public.orders (order_number, customer_id, status, payment_method, subtotal_vnd, discount_vnd, tax_vnd, total_vnd, completed_at, checkout_request_id)
  values (generated_order_number, p_customer_id, 'completed', p_payment_method, calculated_subtotal, p_discount_vnd, p_tax_vnd, calculated_total, now(), p_checkout_request_id)
  returning * into sale_order;

  for sale_item in
    select input.variant_id, input.quantity, variant.sku, variant.size, variant.color, variant.price_vnd,
      variant.stock_quantity, product.name as product_name
    from sale_input input
    join public.product_variants variant on variant.id = input.variant_id
    join public.products product on product.id = variant.product_id
    where product.status = 'active'
    for update of variant
  loop
    if sale_item.stock_quantity < sale_item.quantity then
      raise exception '% is out of stock.', sale_item.product_name;
    end if;

    update public.product_variants
    set stock_quantity = stock_quantity - sale_item.quantity
    where id = sale_item.variant_id
    returning stock_quantity into next_stock;

    insert into public.order_items (order_id, product_variant_id, product_name_snapshot, sku_snapshot, variant_snapshot, unit_price_vnd, quantity, line_total_vnd)
    values (sale_order.id, sale_item.variant_id, sale_item.product_name, sale_item.sku,
      nullif(concat_ws(' · ', sale_item.color, sale_item.size), ''), sale_item.price_vnd,
      sale_item.quantity, sale_item.price_vnd * sale_item.quantity);

    insert into public.inventory_movements (product_variant_id, order_id, type, quantity_change, quantity_after, note)
    values (sale_item.variant_id, sale_order.id, 'sale', -sale_item.quantity, next_stock,
      format('Bán theo đơn hàng #%s', sale_order.order_number));
  end loop;

  if sale_order.customer_id is not null then
    select vnd_per_point into vnd_per_point_value
    from public.loyalty_program_settings
    where id = true;

    points_earned := floor(sale_order.total_vnd::numeric / vnd_per_point_value)::integer;
    insert into public.loyalty_point_entries (customer_id, order_id, points)
    values (sale_order.customer_id, sale_order.id, points_earned);

    if points_earned > 0 then
      update public.customers
      set loyalty_points = loyalty_points + points_earned
      where id = sale_order.customer_id;
    end if;
  end if;

  return jsonb_build_object(
    'orderNumber', sale_order.order_number,
    'completedAt', sale_order.completed_at,
    'pointsEarned', points_earned
  );
end;
$$;

create or replace function public.backfill_missing_loyalty_points(p_apply boolean default false)
returns table(order_id uuid, customer_id uuid, points integer, action text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  vnd_per_point_value bigint;
  calculated_points integer;
  entry_created boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.store_owners where user_id = auth.uid()
  ) then
    raise exception 'Only the enrolled store owner can backfill loyalty points.' using errcode = '42501';
  end if;

  select vnd_per_point into vnd_per_point_value
  from public.loyalty_program_settings
  where id = true;

  perform pg_advisory_xact_lock(hashtext('sn_pos_loyalty_backfill'));

  for candidate in
    select sale_order.id, sale_order.customer_id, sale_order.total_vnd
    from public.orders sale_order
    left join public.loyalty_point_entries entry on entry.order_id = sale_order.id
    where sale_order.status = 'completed'
      and sale_order.customer_id is not null
      and entry.order_id is null
    order by sale_order.completed_at, sale_order.id
  loop
    calculated_points := floor(candidate.total_vnd::numeric / vnd_per_point_value)::integer;

    if not p_apply then
      order_id := candidate.id;
      customer_id := candidate.customer_id;
      points := calculated_points;
      action := 'would_award';
      return next;
      continue;
    end if;

    insert into public.loyalty_point_entries (customer_id, order_id, points)
    values (candidate.customer_id, candidate.id, calculated_points)
    on conflict (order_id) do nothing
    returning true into entry_created;

    if coalesce(entry_created, false) and calculated_points > 0 then
      update public.customers
      set loyalty_points = loyalty_points + calculated_points
      where id = candidate.customer_id;
    end if;

    order_id := candidate.id;
    customer_id := candidate.customer_id;
    points := calculated_points;
    action := case when coalesce(entry_created, false) then 'awarded' else 'skipped' end;
    return next;
  end loop;
end;
$$;

create or replace function public.reset_test_sales_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored_units bigint := 0;
  reversed_points bigint := 0;
  deleted_point_entries bigint := 0;
  deleted_order_items bigint := 0;
  deleted_movements bigint := 0;
  deleted_orders bigint := 0;
begin
  if auth.uid() is null or not exists (
    select 1 from public.store_owners where user_id = auth.uid()
  ) then
    raise exception 'Only the enrolled store owner can reset sales data.' using errcode = '42501';
  end if;

  lock table public.orders, public.order_items, public.inventory_movements, public.loyalty_point_entries, public.product_variants, public.customers
    in share row exclusive mode;

  with sold_quantities as (
    select item.product_variant_id, sum(item.quantity)::bigint as quantity
    from public.order_items item
    join public.orders sale_order on sale_order.id = item.order_id
    where sale_order.status = 'completed' and item.product_variant_id is not null
    group by item.product_variant_id
  ), restored as (
    update public.product_variants variant
    set stock_quantity = variant.stock_quantity + sold_quantities.quantity::integer
    from sold_quantities
    where variant.id = sold_quantities.product_variant_id
    returning sold_quantities.quantity
  )
  select coalesce(sum(quantity), 0) into restored_units from restored;

  with points_to_reverse as (
    select customer_id, sum(points)::bigint as points
    from public.loyalty_point_entries
    group by customer_id
  ), reversed as (
    update public.customers customer
    set loyalty_points = greatest(customer.loyalty_points - points_to_reverse.points::integer, 0)
    from points_to_reverse
    where customer.id = points_to_reverse.customer_id
    returning points_to_reverse.points
  )
  select coalesce(sum(points), 0) into reversed_points from reversed;

  delete from public.loyalty_point_entries;
  get diagnostics deleted_point_entries = row_count;
  delete from public.inventory_movements where order_id is not null;
  get diagnostics deleted_movements = row_count;
  delete from public.order_items;
  get diagnostics deleted_order_items = row_count;
  delete from public.orders;
  get diagnostics deleted_orders = row_count;

  return jsonb_build_object(
    'restored_units', restored_units,
    'reversed_points', reversed_points,
    'deleted_loyalty_point_entries', deleted_point_entries,
    'deleted_order_items', deleted_order_items,
    'deleted_inventory_movements', deleted_movements,
    'deleted_orders', deleted_orders
  );
end;
$$;

revoke all on function public.complete_sale(jsonb, bigint, bigint, bigint, public.payment_method, uuid, uuid) from public;
grant execute on function public.complete_sale(jsonb, bigint, bigint, bigint, public.payment_method, uuid, uuid) to authenticated;
revoke all on function public.backfill_missing_loyalty_points(boolean) from public;
grant execute on function public.backfill_missing_loyalty_points(boolean) to authenticated;
revoke all on function public.reset_test_sales_data() from public;
grant execute on function public.reset_test_sales_data() to authenticated;

commit;
