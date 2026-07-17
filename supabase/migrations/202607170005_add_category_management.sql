begin;

alter table public.categories
  add column if not exists description text,
  add column if not exists is_active boolean not null default true;

create index if not exists categories_active_sort_order_idx
  on public.categories (is_active, sort_order, name);

drop policy if exists "Authenticated user manages categories" on public.categories;
drop policy if exists "Authenticated users can read active categories" on public.categories;
drop policy if exists "Store owners manage categories" on public.categories;

create policy "Authenticated users can read active categories"
on public.categories
for select
to authenticated
using (
  is_active
  or exists (
    select 1
    from public.store_owners
    where store_owners.user_id = auth.uid()
  )
);

create policy "Store owners manage categories"
on public.categories
for all
to authenticated
using (
  exists (
    select 1
    from public.store_owners
    where store_owners.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.store_owners
    where store_owners.user_id = auth.uid()
  )
);

commit;
