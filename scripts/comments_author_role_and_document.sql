alter table public.comments add column if not exists author_role text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_author_role_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_author_role_check check (author_role in ('admin','cliente'));
  end if;
end $$;

alter table public.comments drop constraint if exists comments_target_type_check;
alter table public.comments
  add constraint comments_target_type_check
  check (target_type in ('project','gallery','decision','update','document'));
