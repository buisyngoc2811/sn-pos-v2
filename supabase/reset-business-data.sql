-- SN POS V2 business data reset
--
-- Purpose:
--   Clear demo/test operational data before handing the app to the shop owner.
--
-- Kept intentionally:
--   - public.store_settings
--   - store branding/logo paths
--   - bank/VietQR settings
--   - VAT settings
--   - auth.users
--   - storage.buckets and storage bucket configuration
--   - storage.objects by default
--   - public.categories
--
-- Cleared when the table exists:
--   - public.order_items
--   - public.inventory_movements
--   - public.orders
--   - public.product_variants
--   - public.products
--   - public.customers
--
-- Notes:
--   - Deletes are ordered to respect foreign key constraints.
--   - Categories are base store setup data and are kept by default so POS filters remain usable.
--   - This script does not delete product image files from Supabase Storage.

begin;

do $$
begin
  if to_regclass('public.order_items') is not null then
    delete from public.order_items;
  end if;

  if to_regclass('public.inventory_movements') is not null then
    delete from public.inventory_movements;
  end if;

  if to_regclass('public.orders') is not null then
    delete from public.orders;
  end if;

  if to_regclass('public.product_variants') is not null then
    delete from public.product_variants;
  end if;

  if to_regclass('public.products') is not null then
    delete from public.products;
  end if;

  if to_regclass('public.customers') is not null then
    delete from public.customers;
  end if;
end $$;

-- Add project-specific derived reporting/dashboard tables here if introduced later.
-- Example pattern:
-- do $$
-- begin
--   if to_regclass('public.dashboard_snapshots') is not null then
--     delete from public.dashboard_snapshots;
--   end if;
-- end $$;

commit;

-- Optional category cleanup:
-- Categories are kept by default. Run this only if the owner explicitly wants to
-- remove all category setup data and recreate it from scratch.
--
-- begin;
-- delete from public.categories;
-- commit;

-- Optional default category seed:
-- Use this only if categories were accidentally deleted or the owner wants the
-- base SN POS category set restored.
--
-- insert into public.categories (name, slug, sort_order)
-- values
--   ('Áo', 'ao', 1),
--   ('Quần & váy', 'quan-va-vay', 2),
--   ('Đầm', 'dam', 3),
--   ('Áo khoác', 'ao-khoac', 4)
-- on conflict (slug) do update set
--   name = excluded.name,
--   sort_order = excluded.sort_order;

-- Optional storage cleanup:
-- Product image objects are kept by default because storage cleanup should be
-- reviewed separately and only run when every object in the bucket is known to
-- belong to demo products.
--
-- If the project has a safe storage cleanup method and the owner approves deleting
-- demo product image files, run a reviewed cleanup separately. Do not delete
-- storage.buckets.
--
-- begin;
-- delete from storage.objects
-- where bucket_id = 'products';
-- commit;
