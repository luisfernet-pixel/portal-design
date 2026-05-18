-- limpiar columnas viejas
alter table public.projects
  drop column if exists phase,
  drop column if exists progress,
  drop column if exists next_step,
  drop column if exists summary;

-- asegurar estructura nueva
alter table public.projects
  add column if not exists description text,
  add column if not exists current_phase_id uuid,
  add column if not exists updated_at timestamptz not null default now();

-- status alineado al nuevo modelo
alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status in ('activo','pausado','terminado'));

-- FK a project_phases (se agrega después de crear tabla)
alter table public.projects
  add constraint projects_current_phase_id_fkey
  foreign key (current_phase_id)
  references public.project_phases(id)
  on delete set null;

create index if not exists projects_client_id_idx
  on public.projects(client_id);

create index if not exists projects_current_phase_id_idx
  on public.projects(current_phase_id);
