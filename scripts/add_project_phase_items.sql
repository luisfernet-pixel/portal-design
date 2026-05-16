create table if not exists public.project_phase_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_group text not null,
  code text not null,
  name text not null,
  status text not null default 'no_iniciada' check (
    status in ('no_iniciada','en_curso','revision_interna','revision_cliente','aprobada','bloqueada')
  ),
  progress integer not null default 0 check (progress between 0 and 100),
  deliverable text,
  planned_start date,
  planned_end date,
  actual_end date,
  risk text not null default 'bajo' check (risk in ('bajo','medio','alto')),
  client_note text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.project_phase_items enable row level security;

drop policy if exists "phase_items admin all" on public.project_phase_items;
create policy "phase_items admin all" on public.project_phase_items
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "phase_items cliente read own" on public.project_phase_items;
create policy "phase_items cliente read own" on public.project_phase_items
for select using (
  exists(select 1 from public.projects p where p.id = project_phase_items.project_id and p.client_id = auth.uid())
);
