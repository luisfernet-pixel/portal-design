-- eliminar tablas legacy
drop table if exists public.project_phase_items cascade;
drop table if exists public.gallery_items cascade;
drop table if exists public.decisions cascade;
drop table if exists public.documents cascade;
drop table if exists public.construction_updates cascade;

-- bucket nuevo para deliverables (privado)
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- helper admin
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.deliverables enable row level security;
alter table public.comments enable row level security;

-- limpiar policies viejas principales
drop policy if exists "projects admin all" on public.projects;
drop policy if exists "projects cliente read own" on public.projects;

drop policy if exists "project_phases read all auth" on public.project_phases;
drop policy if exists "project_phases admin write" on public.project_phases;

drop policy if exists "comments admin all" on public.comments;
drop policy if exists "comments cliente read own projects" on public.comments;
drop policy if exists "comments cliente insert own projects" on public.comments;
drop policy if exists "comments cliente update own" on public.comments;

-- projects
create policy "projects admin all"
on public.projects
for all
using (public.is_admin())
with check (public.is_admin());

create policy "projects client select own"
on public.projects
for select
using (client_id = auth.uid());

-- project_phases
create policy "phases admin all"
on public.project_phases
for all
using (public.is_admin())
with check (public.is_admin());

create policy "phases client select own"
on public.project_phases
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_phases.project_id
      and p.client_id = auth.uid()
  )
);

-- deliverables
create policy "deliverables admin all"
on public.deliverables
for all
using (public.is_admin())
with check (public.is_admin());

create policy "deliverables client select own"
on public.deliverables
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = deliverables.project_id
      and p.client_id = auth.uid()
  )
);

-- cliente puede marcar aprobado / con_observaciones
create policy "deliverables client update status own"
on public.deliverables
for update
using (
  exists (
    select 1
    from public.projects p
    where p.id = deliverables.project_id
      and p.client_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = deliverables.project_id
      and p.client_id = auth.uid()
  )
  and status in ('pendiente','aprobado','con_observaciones')
);

-- comments
create policy "comments admin all"
on public.comments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "comments client select own"
on public.comments
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = comments.project_id
      and p.client_id = auth.uid()
  )
);

create policy "comments client insert own"
on public.comments
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.projects p
    where p.id = comments.project_id
      and p.client_id = auth.uid()
  )
);

-- Storage policies (bucket deliverables)
drop policy if exists "deliverables read admin" on storage.objects;
drop policy if exists "deliverables insert admin" on storage.objects;
drop policy if exists "deliverables update admin" on storage.objects;
drop policy if exists "deliverables delete admin" on storage.objects;
drop policy if exists "deliverables read client own" on storage.objects;

create policy "deliverables read admin"
on storage.objects
for select
using (bucket_id = 'deliverables' and public.is_admin());

create policy "deliverables insert admin"
on storage.objects
for insert
with check (bucket_id = 'deliverables' and public.is_admin());

create policy "deliverables update admin"
on storage.objects
for update
using (bucket_id = 'deliverables' and public.is_admin());

create policy "deliverables delete admin"
on storage.objects
for delete
using (bucket_id = 'deliverables' and public.is_admin());

create policy "deliverables read client own"
on storage.objects
for select
using (
  bucket_id = 'deliverables'
  and exists (
    select 1
    from public.projects p
    where p.client_id = auth.uid()
      and (split_part(name, '/', 1) = p.id::text)
  )
);
