create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('admin','cliente')),
  created_at timestamptz not null default now()
);

create table if not exists project_phases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null,
  active boolean not null default true
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid not null references profiles(id),
  status text not null default 'activo',
  phase text not null,
  progress integer not null default 0 check (progress between 0 and 100),
  next_step text,
  summary text,
  start_date date,
  estimated_delivery date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  image_url text not null,
  image_path text not null,
  type text not null,
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','descartada')),
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pendiente' check (status in ('pendiente','aprobada')),
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  due_date date,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  category text not null,
  file_url text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists construction_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  image_path text,
  update_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists project_phase_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
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

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  author_role text check (author_role in ('admin','cliente')),
  author_name text,
  target_type text not null check (target_type in ('project','gallery','decision','update','document')),
  target_id uuid not null,
  text text not null,
  created_at timestamptz not null default now()
);

create or replace function update_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects for each row execute function update_timestamp();

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_phases enable row level security;
alter table gallery_items enable row level security;
alter table decisions enable row level security;
alter table documents enable row level security;
alter table construction_updates enable row level security;
alter table project_phase_items enable row level security;
alter table comments enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy "profiles self or admin" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles admin update" on profiles for all using (is_admin()) with check (is_admin());

create policy "project_phases read all auth" on project_phases for select using (auth.uid() is not null);
create policy "project_phases admin write" on project_phases for all using (is_admin()) with check (is_admin());

create policy "projects admin all" on projects for all using (is_admin()) with check (is_admin());
create policy "projects cliente read own" on projects for select using (client_id = auth.uid());

create policy "gallery admin all" on gallery_items for all using (is_admin()) with check (is_admin());
create policy "gallery cliente read own" on gallery_items for select using (
  exists(select 1 from projects p where p.id = gallery_items.project_id and p.client_id = auth.uid())
);
create policy "gallery cliente approve own" on gallery_items for update using (
  exists(select 1 from projects p where p.id = gallery_items.project_id and p.client_id = auth.uid())
) with check (
  exists(select 1 from projects p where p.id = gallery_items.project_id and p.client_id = auth.uid())
);

create policy "decisions admin all" on decisions for all using (is_admin()) with check (is_admin());
create policy "decisions cliente read own" on decisions for select using (
  exists(select 1 from projects p where p.id = decisions.project_id and p.client_id = auth.uid())
);
create policy "decisions cliente approve own" on decisions for update using (
  exists(select 1 from projects p where p.id = decisions.project_id and p.client_id = auth.uid())
) with check (
  exists(select 1 from projects p where p.id = decisions.project_id and p.client_id = auth.uid())
);

create policy "documents admin all" on documents for all using (is_admin()) with check (is_admin());
create policy "documents cliente read own" on documents for select using (
  exists(select 1 from projects p where p.id = documents.project_id and p.client_id = auth.uid())
);

create policy "updates admin all" on construction_updates for all using (is_admin()) with check (is_admin());
create policy "updates cliente read own" on construction_updates for select using (
  exists(select 1 from projects p where p.id = construction_updates.project_id and p.client_id = auth.uid())
);

create policy "phase_items admin all" on project_phase_items for all using (is_admin()) with check (is_admin());
create policy "phase_items cliente read own" on project_phase_items for select using (
  exists(select 1 from projects p where p.id = project_phase_items.project_id and p.client_id = auth.uid())
);

create policy "comments admin all" on comments for all using (is_admin()) with check (is_admin());
create policy "comments cliente read own projects" on comments for select using (
  exists(select 1 from projects p where p.id = comments.project_id and p.client_id = auth.uid())
);
create policy "comments cliente insert own projects" on comments for insert with check (
  user_id = auth.uid() and exists(select 1 from projects p where p.id = comments.project_id and p.client_id = auth.uid())
);
create policy "comments cliente update own" on comments for update using (
  user_id = auth.uid() and exists(select 1 from projects p where p.id = comments.project_id and p.client_id = auth.uid())
);

insert into project_phases (name, sort_order, active)
values
  ('Diagnostico', 1, true),
  ('Diseno conceptual', 2, true),
  ('Anteproyecto', 3, true),
  ('Revision del cliente', 4, true),
  ('Diseno final', 5, true),
  ('Documentacion', 6, true),
  ('Aprobado', 7, true)
on conflict (name) do nothing;

insert into storage.buckets (id, name, public)
values
  ('project-gallery', 'project-gallery', true),
  ('project-documents', 'project-documents', true),
  ('project-updates', 'project-updates', true)
on conflict (id) do nothing;

-- Storage policies iniciales (MVP):
-- Para arrancar rapido se deja lectura abierta de objetos autenticados.
-- Recomendado: restringir por project_id y path conventions en una fase hardening.
create policy "storage read auth" on storage.objects for select using (auth.role() = 'authenticated');
create policy "storage admin write" on storage.objects for insert with check (
  bucket_id in ('project-gallery','project-documents','project-updates') and is_admin()
);
create policy "storage admin update" on storage.objects for update using (
  bucket_id in ('project-gallery','project-documents','project-updates') and is_admin()
);
create policy "storage admin delete" on storage.objects for delete using (
  bucket_id in ('project-gallery','project-documents','project-updates') and is_admin()
);
