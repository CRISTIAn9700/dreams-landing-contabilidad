create table if not exists public.accounting_records (
    id text primary key,
    collection text not null check (collection in ('sales', 'expenses', 'clients', 'products')),
    data jsonb not null,
    created_by uuid references auth.users(id) default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.accounting_records enable row level security;

drop policy if exists "Authenticated users can read accounting records" on public.accounting_records;
create policy "Authenticated users can read accounting records"
on public.accounting_records
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert accounting records" on public.accounting_records;
create policy "Authenticated users can insert accounting records"
on public.accounting_records
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update accounting records" on public.accounting_records;
create policy "Authenticated users can update accounting records"
on public.accounting_records
for update
to authenticated
using (true)
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can delete accounting records" on public.accounting_records;
create policy "Authenticated users can delete accounting records"
on public.accounting_records
for delete
to authenticated
using (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists accounting_records_set_updated_at on public.accounting_records;
create trigger accounting_records_set_updated_at
before update on public.accounting_records
for each row
execute function public.set_updated_at();
