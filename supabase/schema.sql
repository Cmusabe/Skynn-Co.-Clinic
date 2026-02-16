create table if not exists public.site_config (
    key text primary key,
    value jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.site_config enable row level security;

-- Let op: deze policies geven publieke (anon) read/write toegang.
-- Gebruik dit alleen voor demo of interne test.
drop policy if exists "site_config_public_select" on public.site_config;
create policy "site_config_public_select"
on public.site_config
for select
to anon
using (true);

drop policy if exists "site_config_public_insert" on public.site_config;
create policy "site_config_public_insert"
on public.site_config
for insert
to anon
with check (true);

drop policy if exists "site_config_public_update" on public.site_config;
create policy "site_config_public_update"
on public.site_config
for update
to anon
using (true)
with check (true);
