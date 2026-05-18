create extension if not exists "pgcrypto";

-- 1) project_phases (nuevo o adaptación de tabla vieja)
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  description text,
  order_index integer,
  status text default 'pendiente'
    check (status in ('pendiente','activa','completada')),
  progress integer default 0
    check (progress between 0 and 100),
  created_at timestamptz default now()
);

-- Compatibilidad con esquema viejo (sort_order + active)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_phases'
      and column_name = 'sort_order'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_phases'
      and column_name = 'order_index'
  ) then
    execute 'alter table public.project_phases rename column sort_order to order_index';
  end if;
end $$;

alter table public.project_phases
  add column if not exists project_id uuid,
  add column if not exists description text,
  add column if not exists order_index integer,
  add column if not exists status text default 'pendiente',
  add column if not exists progress integer default 0,
  add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'project_phases'
      and column_name = 'active'
  ) then
    execute $q$
      update public.project_phases
      set status = case when active = true then 'activa' else 'pendiente' end
      where status is null
    $q$;
  else
    update public.project_phases
    set status = 'pendiente'
    where status is null;
  end if;
end $$;

update public.project_phases
set progress = 0
where progress is null;

update public.project_phases
set created_at = now()
where created_at is null;

alter table public.project_phases
  alter column name set not null,
  alter column order_index set not null,
  alter column status set not null,
  alter column progress set not null,
  alter column created_at set not null;

alter table public.project_phases
  drop constraint if exists project_phases_name_key;

alter table public.project_phases
  drop constraint if exists project_phases_status_check;

alter table public.project_phases
  add constraint project_phases_status_check
  check (status in ('pendiente','activa','completada'));

alter table public.project_phases
  drop constraint if exists project_phases_progress_check;

alter table public.project_phases
  add constraint project_phases_progress_check
  check (progress between 0 and 100);

alter table public.project_phases
  drop column if exists active;

alter table public.project_phases
  drop constraint if exists project_phases_project_id_fkey;

alter table public.project_phases
  add constraint project_phases_project_id_fkey
  foreign key (project_id)
  references public.projects(id)
  on delete cascade;

create unique index if not exists project_phases_project_order_idx
  on public.project_phases(project_id, order_index)
  where project_id is not null;

create index if not exists project_phases_project_id_idx
  on public.project_phases(project_id);

-- 2) deliverables (nuevo)
create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_id uuid not null references public.project_phases(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  file_name text,
  file_type text not null default 'otro'
    check (file_type in ('plano','render','documento','otro')),
  status text not null default 'pendiente'
    check (status in ('pendiente','aprobado','con_observaciones')),
  uploaded_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id)
);

create index if not exists deliverables_project_id_idx
  on public.deliverables(project_id);

create index if not exists deliverables_phase_id_idx
  on public.deliverables(phase_id);

create index if not exists deliverables_status_idx
  on public.deliverables(status);

-- 3) phase_templates (nuevo)
create table if not exists public.phase_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  order_index integer not null,
  is_default boolean not null default true
);

create unique index if not exists phase_templates_order_idx
  on public.phase_templates(order_index);

-- seed inicial
insert into public.phase_templates (name, description, order_index, is_default)
values
  ('Diagnóstico', 'Relevamiento y análisis del espacio existente', 1, true),
  ('Anteproyecto', 'Propuesta inicial de diseño para aprobación del cliente', 2, true),
  ('Proyecto Ejecutivo', 'Documentación técnica completa para construcción', 3, true),
  ('Licitación', 'Proceso de selección de contratistas', 4, true),
  ('Obra', 'Supervisión y seguimiento de la construcción', 5, true)
on conflict do nothing;
