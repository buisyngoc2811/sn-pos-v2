-- Seed data for sn-pos-v2 (Run this via Supabase dashboard SQL editor)
begin;

insert into public.categories (id, name, slug, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Áo', 'ao', 1),
  ('10000000-0000-0000-0000-000000000002', 'Quần & váy', 'quan-va-vay', 2),
  ('10000000-0000-0000-0000-000000000003', 'Đầm', 'dam', 3),
  ('10000000-0000-0000-0000-000000000004', 'Áo khoác', 'ao-khoac', 4)
on conflict (id) do nothing;

insert into public.products (
  id, category_id, name, description, status, image_path
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Áo cardigan len gân',
    'Áo cardigan len gân dáng vừa.',
    'active',
    null
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Quần linen ống rộng',
    'Quần linen ống rộng mặc hằng ngày.',
    'active',
    null
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Áo thun ôm cơ bản',
    'Áo thun co giãn dáng ôm.',
    'active',
    null
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000003',
    'Đầm quấn màu berry',
    'Đầm quấn màu berry trầm.',
    'active',
    null
  )
on conflict (id) do nothing;

insert into public.product_variants (
  id, product_id, sku, size, color, price_vnd, stock_quantity, reorder_level
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'KN-024-PK-M', 'M', 'Hồng đất', 680000, 8, 6
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'LP-018-CR-S', 'S', 'Kem', 820000, 12, 5
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'TS-041-BK-S', 'S', 'Đen', 380000, 18, 8
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    'DR-029-BR-S', 'S', 'Đỏ berry', 960000, 9, 5
  )
on conflict (id) do nothing;

insert into public.customers (
  id, name, email, phone, membership_tier, loyalty_points, created_at
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'Nguyễn Minh Anh',
    'minhanh@example.com',
    '0901234567',
    'pink',
    625,
    '2026-04-04T02:00:00Z'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Trần Ngọc Mai',
    'ngocmai@example.com',
    '0912345678',
    'vip',
    1249,
    '2026-02-18T02:00:00Z'
  )
on conflict (id) do nothing;

insert into public.orders (
  id, order_number, customer_id, status, payment_method,
  subtotal_vnd, discount_vnd, tax_vnd, total_vnd, completed_at
) values (
  '50000000-0000-0000-0000-000000000001',
  '1048',
  '40000000-0000-0000-0000-000000000001',
  'completed',
  'card',
  1060000,
  0,
  84800,
  1144800,
  '2026-07-09T03:42:00Z'
)
on conflict (id) do nothing;

insert into public.order_items (
  id, order_id, product_variant_id, product_name_snapshot,
  sku_snapshot, variant_snapshot, unit_price_vnd, quantity, line_total_vnd
) values
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Áo cardigan len gân',
    'KN-024-PK-M',
    'Hồng đất · M',
    680000,
    1,
    680000
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'Áo thun ôm cơ bản',
    'TS-041-BK-S',
    'Đen · S',
    380000,
    1,
    380000
  )
on conflict (id) do nothing;

insert into public.inventory_movements (
  id, product_variant_id, order_id, type,
  quantity_change, quantity_after, note, created_at
) values
  (
    '70000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'sale',
    -1,
    8,
    'Bán theo đơn hàng #1048',
    '2026-07-09T03:42:00Z'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000001',
    'sale',
    -1,
    18,
    'Bán theo đơn hàng #1048',
    '2026-07-09T03:42:00Z'
  )
on conflict (id) do nothing;

insert into public.store_settings (
  id, store_name, store_logo_path, timezone, currency, tax_rate,
  bank_name, bank_account_number, bank_account_holder,
  bank_qr_image_path, transfer_note_prefix
) values (
  '80000000-0000-0000-0000-000000000001',
  'SN Store',
  '',
  'Asia/Ho_Chi_Minh',
  'VND',
  8,
  '',
  '',
  '',
  '',
  'SN'
)
on conflict (id) do nothing;

commit;
