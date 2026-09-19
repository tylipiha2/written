-- I2: deleting a profile should not cascade into deleting notes that person
-- wrote inside projects owned or shared by other people. The note should
-- survive with author_id set to null instead of being deleted.
alter table public.notes
  alter column author_id drop not null,
  drop constraint if exists notes_author_id_fkey,
  add constraint notes_author_id_fkey
    foreign key (author_id) references public.profiles
    on delete set null;

-- I7: normalize email lookups so case differences (e.g. Friend@Example.com
-- vs friend@example.com) don't produce a false "no account found."
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- I8: make project creation atomic. The client only inserts into
-- `projects`; this trigger creates the owner's `project_members` row in
-- the same transaction, so a client-side failure between the two inserts
-- can no longer leave an orphaned project with no owner membership.
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_project_created on public.projects;
create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();
