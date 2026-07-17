begin;

-- The application currently has one authenticated store user. This explicit
-- owner mapping keeps the destructive RPC unavailable until that user is enrolled.
create table if not exists public.store_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.store_owners enable row level security;

grant select on table public.store_owners to authenticated;

drop policy if exists "Store owners can view their own enrollment" on public.store_owners;
create policy "Store owners can view their own enrollment"
on public.store_owners for select to authenticated
using (user_id = auth.uid());

create or replace function public.reset_test_sales_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored_units bigint := 0;
  deleted_order_items bigint := 0;
  deleted_movements bigint := 0;
  deleted_orders bigint := 0;
begin
  if auth.uid() is null or not exists (
    select 1 from public.store_owners where user_id = auth.uid()
  ) then
    raise exception 'Only the enrolled store owner can reset sales data.'
      using errcode = '42501';
  end if;

  -- Prevent a checkout from adding or changing sales rows while this reset runs.
  lock table public.orders, public.order_items, public.inventory_movements, public.product_variants
    in share row exclusive mode;

  with sold_quantities as (
    select
      item.product_variant_id,
      sum(item.quantity)::bigint as quantity
    from public.order_items item
    join public.orders sale_order on sale_order.id = item.order_id
    where sale_order.status = 'completed'
      and item.product_variant_id is not null
    group by item.product_variant_id
  ), restored as (
    update public.product_variants variant
    set stock_quantity = variant.stock_quantity + sold_quantities.quantity::integer
    from sold_quantities
    where variant.id = sold_quantities.product_variant_id
    returning sold_quantities.quantity
  )
  select coalesce(sum(quantity), 0) into restored_units from restored;

  delete from public.inventory_movements where order_id is not null;
  get diagnostics deleted_movements = row_count;

  delete from public.order_items;
  get diagnostics deleted_order_items = row_count;

  delete from public.orders;
  get diagnostics deleted_orders = row_count;

  return jsonb_build_object(
    'restored_units', restored_units,
    'deleted_order_items', deleted_order_items,
    'deleted_inventory_movements', deleted_movements,
    'deleted_orders', deleted_orders
  );
end;
$$;

revoke all on function public.reset_test_sales_data() from public;
grant execute on function public.reset_test_sales_data() to authenticated;

commit;
