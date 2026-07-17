begin;

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

  -- Explicit predicates are required by the Supabase delete-safety guard.
  -- The order is intentional: points, linked movement history, items, then orders.
  delete from public.loyalty_point_entries where id is not null;
  get diagnostics deleted_point_entries = row_count;
  delete from public.inventory_movements where order_id is not null;
  get diagnostics deleted_movements = row_count;
  delete from public.order_items where id is not null;
  get diagnostics deleted_order_items = row_count;
  delete from public.orders where id is not null;
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

revoke all on function public.reset_test_sales_data() from public;
grant execute on function public.reset_test_sales_data() to authenticated;

commit;
