alter table public.store_settings
  add column if not exists store_logo_path text not null default '';
