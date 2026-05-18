-- renombrar columnas viejas si existen
alter table public.comments
  rename column user_id to author_id;

alter table public.comments
  rename column text to body;

-- agregar deliverable_id
alter table public.comments
  add column if not exists deliverable_id uuid;

alter table public.comments
  add constraint comments_deliverable_id_fkey
  foreign key (deliverable_id)
  references public.deliverables(id)
  on delete cascade;

-- limpiar columnas heredadas del modelo viejo
alter table public.comments
  drop column if exists author_role,
  drop column if exists author_name,
  drop column if exists target_type,
  drop column if exists target_id;

-- asegurar not null del nuevo modelo
alter table public.comments
  alter column project_id set not null,
  alter column author_id set not null,
  alter column body set not null;

-- Si hay comentarios viejos sin deliverable, se dejan como "pendientes de vincular"
-- para no romper la migración. Se podrá limpiar luego.
do $$
begin
  if not exists (
    select 1
    from public.comments
    where deliverable_id is null
  ) then
    alter table public.comments
      alter column deliverable_id set not null;
  end if;
end $$;

create index if not exists comments_project_id_idx
  on public.comments(project_id);

create index if not exists comments_deliverable_id_idx
  on public.comments(deliverable_id);
