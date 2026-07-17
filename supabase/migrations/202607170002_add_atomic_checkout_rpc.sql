begin;

create or replace function public.complete_sale(
  p_items jsonb,
  p_discount_vnd bigint,
  p_tax_vnd bigint,
  p_total_vnd bigint,
  p_payment_method public.payment_method,
  p_customer_id uuid default null
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
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to complete a sale.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'The cart must contain at least one item.';
  end if;
  if p_discount_vnd < 0 or p_tax_vnd < 0 or p_total_vnd < 0 then
    raise exception 'Invalid order totals.';
  end if;

  perform pg_advisory_xact_lock(hashtext('sn_pos_complete_sale'));

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
  insert into public.orders (order_number, customer_id, status, payment_method, subtotal_vnd, discount_vnd, tax_vnd, total_vnd, completed_at)
  values (generated_order_number, p_customer_id, 'completed', p_payment_method, calculated_subtotal, p_discount_vnd, p_tax_vnd, calculated_total, now())
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

  return jsonb_build_object('orderNumber', sale_order.order_number, 'completedAt', sale_order.completed_at);
end;
$$;

revoke all on function public.complete_sale(jsonb, bigint, bigint, bigint, public.payment_method, uuid) from public;
grant execute on function public.complete_sale(jsonb, bigint, bigint, bigint, public.payment_method, uuid) to authenticated;

commit;
