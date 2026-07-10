begin;

create extension if not exists pgcrypto;

create type public.product_status as enum ('active', 'draft', 'archived');
create type public.order_status as enum ('completed', 'held', 'refunded');
create type public.payment_method as enum ('cash', 'card', 'bank_transfer_qr');
create type public.inventory_movement_type as enum ('sale', 'restock', 'adjustment', 'refund');
create type public.membership_tier as enum ('member', 'pink', 'vip');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text,
  status public.product_status not null default 'active',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size text,
  color text,
  price_vnd bigint not null check (price_vnd >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  membership_tier public.membership_tier not null default 'member',
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  status public.order_status not null default 'completed',
  payment_method public.payment_method not null,
  subtotal_vnd bigint not null check (subtotal_vnd >= 0),
  discount_vnd bigint not null default 0 check (discount_vnd >= 0),
  tax_vnd bigint not null default 0 check (tax_vnd >= 0),
  total_vnd bigint not null check (total_vnd >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_check
    check (total_vnd = subtotal_vnd - discount_vnd + tax_vnd),
  constraint orders_completed_at_check
    check (status = 'held' or completed_at is not null)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text not null,
  variant_snapshot text,
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  quantity integer not null check (quantity > 0),
  line_total_vnd bigint not null check (line_total_vnd >= 0),
  created_at timestamptz not null default now(),
  constraint order_items_total_check
    check (line_total_vnd = unit_price_vnd * quantity)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  type public.inventory_movement_type not null,
  quantity_change integer not null check (quantity_change <> 0),
  quantity_after integer not null check (quantity_after >= 0),
  note text,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  store_logo_path text not null default '',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  currency text not null default 'VND' check (currency = 'VND'),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  bank_name text not null default '',
  bank_account_number text not null default '',
  bank_account_holder text not null default '',
  bank_qr_image_path text not null default '',
  transfer_note_prefix text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_name_unique_idx on public.categories (lower(name));
create index categories_sort_order_idx on public.categories (sort_order);
create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index products_name_search_idx on public.products (lower(name));
create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_stock_idx on public.product_variants (stock_quantity);
create unique index customers_email_unique_idx
  on public.customers (lower(email))
  where email is not null;
create index customers_phone_idx on public.customers (phone) where phone is not null;
create index customers_name_search_idx on public.customers (lower(name));
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);
create index orders_completed_at_idx on public.orders (completed_at desc);
create index orders_payment_method_idx on public.orders (payment_method);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_variant_id_idx on public.order_items (product_variant_id);
create index inventory_movements_variant_created_idx
  on public.inventory_movements (product_variant_id, created_at desc);
create index inventory_movements_order_id_idx
  on public.inventory_movements (order_id)
  where order_id is not null;
create index inventory_movements_type_idx on public.inventory_movements (type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.store_settings enable row level security;

grant select, insert, update, delete on table
  public.categories,
  public.products,
  public.product_variants,
  public.customers,
  public.orders,
  public.order_items,
  public.inventory_movements,
  public.store_settings
to authenticated;

create policy "Authenticated user manages categories"
on public.categories for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages products"
on public.products for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages product variants"
on public.product_variants for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages customers"
on public.customers for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages orders"
on public.orders for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages order items"
on public.order_items for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages inventory movements"
on public.inventory_movements for all to authenticated
using (true) with check (true);

create policy "Authenticated user manages store settings"
on public.store_settings for all to authenticated
using (true) with check (true);

insert into public.categories (id, name, slug, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'Áo', 'ao', 1),
  ('10000000-0000-0000-0000-000000000002', 'Quần & váy', 'quan-va-vay', 2),
  ('10000000-0000-0000-0000-000000000003', 'Đầm', 'dam', 3),
  ('10000000-0000-0000-0000-000000000004', 'Áo khoác', 'ao-khoac', 4);

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
  );

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
  );

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
  );

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
);

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
  );

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
  );

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
);

commit;
