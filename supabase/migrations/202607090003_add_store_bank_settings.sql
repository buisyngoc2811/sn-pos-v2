alter table public.store_settings
  add column if not exists bank_name text not null default '',
  add column if not exists bank_account_number text not null default '',
  add column if not exists bank_account_holder text not null default '',
  add column if not exists bank_qr_image_path text not null default '',
  add column if not exists transfer_note_prefix text not null default '';
