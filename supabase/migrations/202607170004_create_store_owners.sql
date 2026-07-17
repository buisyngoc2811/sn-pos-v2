begin;

create table if not exists public.store_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.store_owners enable row level security;

grant select on public.store_owners to authenticated;

drop policy if exists "Users can view own store owner record"
on public.store_owners;

create policy "Users can view own store owner record"
on public.store_owners
for select
to authenticated
using (user_id = auth.uid());

commit;