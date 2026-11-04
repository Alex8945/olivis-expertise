create table if not exists public.complaints (
    reference text primary key,
    name text not null,
    email text not null,
    phone text,
    subject text not null,
    category text not null,
    description text not null,
    status text not null default 'Nouveau'
        check (status in ('Nouveau', 'En cours', 'Résolu')),
    events jsonb not null default '[]'::jsonb
        check (jsonb_typeof(events) = 'array'),
    submitted_at timestamptz not null default now()
);

alter table public.complaints enable row level security;

revoke all on public.complaints from anon, authenticated;
grant insert on public.complaints to anon;
grant select, insert, update on public.complaints to authenticated;

drop policy if exists "Public can submit new complaints" on public.complaints;
create policy "Public can submit new complaints"
    on public.complaints
    for insert
    to anon, authenticated
    with check (status = 'Nouveau' and jsonb_typeof(events) = 'array');

drop policy if exists "Staff can read complaints" on public.complaints;
create policy "Staff can read complaints"
    on public.complaints
    for select
    to authenticated
    using (auth.uid() is not null);

drop policy if exists "Staff can update complaints" on public.complaints;
create policy "Staff can update complaints"
    on public.complaints
    for update
    to authenticated
    using (auth.uid() is not null)
    with check (auth.uid() is not null);

create or replace function public.lookup_complaint(complaint_reference text)
returns table (
    reference text,
    subject text,
    submitted_at timestamptz,
    status text,
    events jsonb
)
language sql
security definer
set search_path = ''
as $$
    select c.reference, c.subject, c.submitted_at, c.status, c.events
    from public.complaints as c
    where c.reference = complaint_reference
    limit 1;
$$;

revoke all on function public.lookup_complaint(text) from public;
grant execute on function public.lookup_complaint(text) to anon, authenticated;
