-- profiles: one row per auth user, created automatically on signup
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text
);

alter table public.profiles enable row level security;

create policy "profiles are visible to any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- project_members: join table between profiles and projects
-- (created before is_project_member(), which is a `language sql`
-- function — Postgres validates its body against the catalog at
-- CREATE FUNCTION time, so the table it queries must exist first)
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.projects enable row level security;

-- helper function: is the current user a member of this project?
-- security definer + explicit search_path so it bypasses RLS on
-- project_members instead of recursing into the policy that uses it.
create function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create policy "members can view their projects"
  on public.projects for select
  to authenticated
  using (public.is_project_member(id));

create policy "authenticated users can create projects"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid());

alter table public.project_members enable row level security;

create policy "members can view membership of their projects"
  on public.project_members for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "project owners can add members"
  on public.project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects
      where id = project_id and owner_id = auth.uid()
    )
  );

-- notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "members can view notes in their projects"
  on public.notes for select
  to authenticated
  using (public.is_project_member(project_id));

create policy "members can add notes to their projects"
  on public.notes for insert
  to authenticated
  with check (public.is_project_member(project_id) and author_id = auth.uid());

create policy "authors can update their own notes"
  on public.notes for update
  to authenticated
  using (author_id = auth.uid());

create policy "authors can delete their own notes"
  on public.notes for delete
  to authenticated
  using (author_id = auth.uid());
