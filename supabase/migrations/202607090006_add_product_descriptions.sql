alter table public.products
  add column if not exists short_description text,
  add column if not exists description text;
