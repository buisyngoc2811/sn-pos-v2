insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('products', 'products', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('store-assets', 'store-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users read app images'
  ) then
    create policy "Authenticated users read app images"
    on storage.objects for select to authenticated
    using (bucket_id in ('products', 'store-assets'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users upload app images'
  ) then
    create policy "Authenticated users upload app images"
    on storage.objects for insert to authenticated
    with check (bucket_id in ('products', 'store-assets'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users update app images'
  ) then
    create policy "Authenticated users update app images"
    on storage.objects for update to authenticated
    using (bucket_id in ('products', 'store-assets'))
    with check (bucket_id in ('products', 'store-assets'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users delete app images'
  ) then
    create policy "Authenticated users delete app images"
    on storage.objects for delete to authenticated
    using (bucket_id in ('products', 'store-assets'));
  end if;
end $$;
