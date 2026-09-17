# Written MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 of Written — a Next.js + Supabase web app where a small group of people write Markdown notes into shared Projects.

**Architecture:** A single Next.js (App Router) app. Supabase provides Postgres, magic-link Auth, and Row Level Security that enforces project membership at the database layer. The app talks to Supabase via `@supabase/ssr` from server components (page loads) and client components (interactive writes).

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, `@supabase/supabase-js` + `@supabase/ssr`, `react-markdown`. Hosted on Vercel.

**Spec:** `docs/superpowers/specs/2026-09-17-written-mvp-design.md`

## Global Constraints

- Auth is magic-link email only — no password auth, no password-reset flow (spec: Auth & sharing).
- Sharing only works for emails that already have a Written account — no invite-token/pending-email system (spec: Auth & sharing).
- Notes are plain Markdown text only — no rich text, no attachments (spec: Frontend structure).
- No offline support or service worker caching — PWA support is manifest + meta tags only (spec: PWA / iOS home screen).
- No automated test suite in v1 — every task's verification step is a manual check, not an automated test run (spec: Testing).
- Access control is enforced by Postgres RLS policies keyed off `project_members`, not by application-level checks (spec: Architecture, Data model).

---

## File Structure

```
app/
  layout.tsx                     — root layout: <html>, global CSS, manifest link, apple-touch-icon meta
  manifest.ts                    — PWA manifest (Next.js metadata API)
  login/page.tsx                 — magic-link sign-in form (public)
  auth/callback/route.ts         — exchanges magic-link code for a session (public)
  (app)/layout.tsx               — header (title + logout button), wraps authenticated pages
  (app)/page.tsx                 — dashboard: list projects, create-project form
  (app)/projects/[id]/page.tsx   — project feed page (server component, loads data)
components/
  LogoutButton.tsx                — client component, calls supabase.auth.signOut()
  NewProjectForm.tsx               — client component, creates a project + owner membership row
  NoteComposer.tsx                 — client component, inserts a new note
  NoteFeed.tsx                     — renders a list of notes as rendered Markdown
  ShareProjectPanel.tsx            — client component, lists members + add-by-email field
lib/
  supabase/client.ts                — browser Supabase client factory
  supabase/server.ts                — server Supabase client factory
  types.ts                          — shared TS types: Profile, Project, ProjectMember, Note
middleware.ts                       — Supabase session refresh + route protection
supabase/migrations/0001_init.sql   — schema + RLS policies
public/icons/                       — PWA icons referenced by the manifest
```

---

### Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `app/layout.tsx`, `app/(app)/page.tsx`, `app/globals.css`
- Delete: default boilerplate files `create-next-app` generates that aren't listed above (e.g. `app/page.tsx` if scaffolded outside the route group, default favicon assets you don't want)

**Interfaces:**
- Produces: a running Next.js dev server on `http://localhost:3000` showing a placeholder page. No exported functions yet — later tasks build on the App Router file structure this task creates.

- [ ] **Step 1: Scaffold the project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```
Answer "No" to Turbopack if prompted (not needed for this size of app).

- [ ] **Step 2: Move the home page into the `(app)` route group**

```bash
mkdir -p "app/(app)"
git mv app/page.tsx "app/(app)/page.tsx"
```

- [ ] **Step 3: Replace the placeholder content**

Replace the contents of `app/(app)/page.tsx` with:

```tsx
export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Written</h1>
      <p className="text-gray-600">Dashboard coming soon.</p>
    </main>
  )
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`
Expected: visiting `http://localhost:3000` shows "Written" and "Dashboard coming soon." with no console errors in the terminal or browser devtools.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with (app) route group"
```

---

### Task 2: Supabase project + client helpers

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`, `.env.local.example`
- Modify: `app/(app)/page.tsx` (temporary verification only, reverted in Task 5)

**Interfaces:**
- Consumes: none (external Supabase project you create manually)
- Produces:
  - `createClient()` from `lib/supabase/client.ts` — returns a browser Supabase client
  - `createClient()` from `lib/supabase/server.ts` — an **async** function returning a server Supabase client (must be awaited: `const supabase = await createClient()`)
  - `middleware.ts` default export — refreshes the Supabase session cookie on every request and redirects unauthenticated users to `/login`

- [ ] **Step 1: Create the Supabase project**

Go to https://supabase.com/dashboard, create a new project (any region, any name — e.g. "written"). Once provisioned, go to Project Settings → API and copy the **Project URL** and **anon public key**.

- [ ] **Step 2: Add environment variables**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Copy it to `.env.local` (already gitignored by `create-next-app`) and fill in the two values from Step 1.

- [ ] **Step 3: Install dependencies**

Run: `npm install @supabase/supabase-js @supabase/ssr react-markdown`

- [ ] **Step 4: Create the browser Supabase client**

Create `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Create the server Supabase client**

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component render — safe to ignore,
            // middleware.ts refreshes the session on the next request.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 6: Create the session-refresh middleware**

Create `middleware.ts` at the project root:
```ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 7: Verify the server client initializes without error**

Temporarily change `app/(app)/page.tsx` to:
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { error } = await supabase.auth.getUser()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Written</h1>
      <p className="text-gray-600">
        Supabase client initialized. Auth check error: {error ? error.message : 'none'}
      </p>
    </main>
  )
}
```
Run: `npm run dev`, visit `http://localhost:3000`.
Expected: since there's no logged-in user yet, `middleware.ts` redirects you to `/login`, which 404s (it doesn't exist yet — that's expected and confirms the middleware ran). If you instead see a Supabase connection error (e.g. "fetch failed", "Invalid API key"), re-check the values in `.env.local`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add Supabase client helpers and session middleware"
```

---

### Task 3: Database schema and RLS policies

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `lib/types.ts`

**Interfaces:**
- Consumes: none
- Produces: tables `profiles`, `projects`, `project_members`, `notes`; function `public.is_project_member(p_project_id uuid) returns boolean`; TypeScript types `Profile`, `Project`, `ProjectMember`, `Note` from `lib/types.ts`, matching the table columns exactly (used by every later task that queries Supabase).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_init.sql`:
```sql
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
```

- [ ] **Step 2: Run the migration**

In the Supabase dashboard, go to SQL Editor, paste the contents of `supabase/migrations/0001_init.sql`, and run it.
Expected: "Success. No rows returned." with no error. If you see an error, fix the SQL and re-run before continuing — the statements are not wrapped in a transaction, so re-running after a partial failure may hit "already exists" errors on tables that did get created; drop those tables first if that happens.

- [ ] **Step 3: Verify manually via the Table Editor**

In the Supabase dashboard, open Table Editor. Confirm all four tables (`profiles`, `projects`, `project_members`, `notes`) exist with the columns listed above, and each shows "RLS enabled" (a small shield icon). Full permission behavior (who can see what) is verified end-to-end in Tasks 5–7, since it requires real signed-in sessions rather than the dashboard's superuser connection.

- [ ] **Step 4: Add matching TypeScript types**

Create `lib/types.ts`:
```ts
export type Profile = {
  id: string
  email: string
  display_name: string | null
}

export type Project = {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export type ProjectMember = {
  project_id: string
  user_id: string
  role: 'owner' | 'member'
  added_at: string
}

export type Note = {
  id: string
  project_id: string
  author_id: string
  content: string
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add database schema, RLS policies, and matching TS types"
```

---

### Task 4: Auth flow (magic link + logout)

**Files:**
- Create: `app/login/page.tsx`, `app/auth/callback/route.ts`, `components/LogoutButton.tsx`, `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/client.ts` and `lib/supabase/server.ts` (Task 2)
- Produces: working sign-in and sign-out; `app/(app)/layout.tsx` wraps every page under the `(app)` group with a header containing the `LogoutButton` — later tasks' pages render as children of this layout and don't need their own header.

- [ ] **Step 1: Build the login page**

Create `app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Sign in to Written</h1>
        {status === 'sent' ? (
          <p className="text-gray-600">Check your email for a sign-in link.</p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border px-3 py-2"
            />
            <button
              type="submit"
              className="w-full rounded bg-black px-3 py-2 text-white"
            >
              Send magic link
            </button>
            {status === 'error' && (
              <p className="text-red-600">
                Something went wrong sending the link. Try again.
              </p>
            )}
          </>
        )}
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Build the auth callback route**

Create `app/auth/callback/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 3: Build the logout button**

Create `components/LogoutButton.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={handleLogout} className="text-sm text-gray-600 underline">
      Sign out
    </button>
  )
}
```

- [ ] **Step 4: Build the authenticated layout**

Create `app/(app)/layout.tsx`:
```tsx
import LogoutButton from '@/components/LogoutButton'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">Written</span>
        <LogoutButton />
      </header>
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Revert the temporary verification page**

Replace `app/(app)/page.tsx` back to the plain placeholder from Task 1 (the header now comes from the layout):
```tsx
export default function DashboardPage() {
  return (
    <main className="p-8">
      <p className="text-gray-600">Dashboard coming soon.</p>
    </main>
  )
}
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`, visit `http://localhost:3000`. Expected: redirected to `/login`. Enter your own email, submit, check your inbox for the Supabase magic-link email, click it. Expected: redirected back to `/`, now showing the "Written" header, "Sign out", and "Dashboard coming soon." Click "Sign out". Expected: redirected to `/login`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add magic-link login, auth callback, and logout"
```

---

### Task 5: Dashboard — list and create projects

**Files:**
- Modify: `app/(app)/page.tsx`
- Create: `components/NewProjectForm.tsx`

**Interfaces:**
- Consumes: `createClient()` (server, Task 2), `Project` type (Task 3)
- Produces: creating a project inserts a `projects` row **and** a matching `project_members` row with `role: 'owner'` in the same action — every later task that queries "projects I'm a member of" relies on this pairing existing for every project.

- [ ] **Step 1: Build the create-project form**

Create `components/NewProjectForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewProjectForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createClient()

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setError('Not signed in.')
      return
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ name, owner_id: userId })
      .select()
      .single()

    if (projectError || !project) {
      setError(projectError?.message ?? 'Could not create project.')
      return
    }

    const { error: memberError } = await supabase
      .from('project_members')
      .insert({ project_id: project.id, user_id: userId, role: 'owner' })

    if (memberError) {
      setError(memberError.message)
      return
    }

    setName('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="New project name"
        className="flex-1 rounded border px-3 py-2"
      />
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">
        Create
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 2: Build the dashboard page**

Replace `app/(app)/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NewProjectForm from '@/components/NewProjectForm'
import type { Project } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <NewProjectForm />
      <ul className="space-y-2">
        {(projects as Project[] | null)?.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}`} className="text-blue-600 underline">
              {project.name}
            </Link>
          </li>
        ))}
      </ul>
      {projects?.length === 0 && (
        <p className="text-gray-600">No projects yet — create one above.</p>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Verify manually with two accounts**

Sign in as yourself, create a project called "Test Project A". Expected: it appears in the list immediately after creating.
Sign out, sign in with a second email address you also control (or a `+alias` of your own email, e.g. `you+test@gmail.com`, which Supabase treats as a distinct address). Expected: the second account's dashboard shows **no** projects — confirming the RLS policy from Task 3 actually restricts visibility, not just the UI.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add dashboard: list and create projects"
```

---

### Task 6: Project feed — view and add notes

**Files:**
- Create: `app/(app)/projects/[id]/page.tsx`, `components/NoteComposer.tsx`, `components/NoteFeed.tsx`

**Interfaces:**
- Consumes: `createClient()` (server and browser, Task 2), `Note` type (Task 3)
- Produces: `NoteFeed({ notes }: { notes: Note[] })` — later tasks (none in this plan) that also render notes should reuse this component rather than re-implementing Markdown rendering.

- [ ] **Step 1: Build the note feed renderer**

Create `components/NoteFeed.tsx`:
```tsx
import ReactMarkdown from 'react-markdown'
import type { Note } from '@/lib/types'

export default function NoteFeed({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return <p className="text-gray-600">No notes yet — add the first one above.</p>
  }

  return (
    <ul className="space-y-4">
      {notes.map((note) => (
        <li key={note.id} className="rounded border p-4">
          <div className="prose prose-sm">
            <ReactMarkdown>{note.content}</ReactMarkdown>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {new Date(note.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Build the note composer**

Create `components/NoteComposer.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NoteComposer({ projectId }: { projectId: string }) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const supabase = createClient()

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      setError('Not signed in.')
      return
    }

    const { error: insertError } = await supabase
      .from('notes')
      .insert({ project_id: projectId, author_id: userId, content })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setContent('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={4}
        placeholder="Write a note in Markdown…"
        className="w-full rounded border px-3 py-2"
      />
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">
        Add note
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  )
}
```

- [ ] **Step 3: Build the project feed page**

Create `app/(app)/projects/[id]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import NoteComposer from '@/components/NoteComposer'
import NoteFeed from '@/components/NoteFeed'
import type { Note, Project } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single<Project>()

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (!project) {
    return (
      <main className="p-8">
        <p className="text-gray-600">Project not found, or you don&apos;t have access to it.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <NoteComposer projectId={project.id} />
      <NoteFeed notes={(notes as Note[] | null) ?? []} />
    </main>
  )
}
```

- [ ] **Step 4: Verify manually**

As the account that owns "Test Project A" (from Task 5), open it, add a note with some Markdown (e.g. `**bold** and a list:\n- one\n- two`). Expected: it appears immediately above, rendered as bold text and a bullet list, newest first.
Sign in as the second test account, try to visit the same project's URL directly (copy the `/projects/<id>` link). Expected: "Project not found, or you don't have access to it." — confirming RLS blocks it even via direct URL, not just via the dashboard link.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add project feed: view and add notes"
```

---

### Task 7: Sharing a project

**Files:**
- Create: `components/ShareProjectPanel.tsx`
- Modify: `app/(app)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (server and browser, Task 2), `Profile`/`ProjectMember` types (Task 3)
- Produces: none consumed by later tasks in this plan (this is the last feature task before PWA/deploy)

- [ ] **Step 1: Build the share panel**

Create `components/ShareProjectPanel.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function ShareProjectPanel({
  projectId,
  members,
}: {
  projectId: string
  members: Profile[]
}) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const supabase = createClient()

    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      setMessage(lookupError.message)
      return
    }

    if (!profile) {
      setMessage('No Written account found for that email. Ask them to sign up first, then share again.')
      return
    }

    const { error: insertError } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: profile.id, role: 'member' })

    if (insertError) {
      setMessage(insertError.message)
      return
    }

    setEmail('')
    setMessage('Added.')
    router.refresh()
  }

  return (
    <div className="space-y-2 rounded border p-4">
      <h2 className="font-medium">Shared with</h2>
      <ul className="text-sm text-gray-600">
        {members.map((member) => (
          <li key={member.id}>{member.display_name ?? member.email}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Share
        </button>
      </form>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Wire it into the project page**

Modify `app/(app)/projects/[id]/page.tsx`: add a query for members and pass them to the new panel.

```tsx
import { createClient } from '@/lib/supabase/server'
import NoteComposer from '@/components/NoteComposer'
import NoteFeed from '@/components/NoteFeed'
import ShareProjectPanel from '@/components/ShareProjectPanel'
import type { Note, Profile, Project } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single<Project>()

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: memberRows } = await supabase
    .from('project_members')
    .select('user_id, profiles(id, email, display_name)')
    .eq('project_id', id)

  if (!project) {
    return (
      <main className="p-8">
        <p className="text-gray-600">Project not found, or you don&apos;t have access to it.</p>
      </main>
    )
  }

  const members = (memberRows ?? [])
    .map((row) => row.profiles as unknown as Profile)
    .filter(Boolean)

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <ShareProjectPanel projectId={project.id} members={members} />
      <NoteComposer projectId={project.id} />
      <NoteFeed notes={(notes as Note[] | null) ?? []} />
    </main>
  )
}
```

- [ ] **Step 3: Verify manually**

As the owner of "Test Project A", share it with your second test account's email. Expected: "Added." appears, and the member list now shows both accounts.
Sign in as the second account, visit the dashboard. Expected: "Test Project A" now appears in its list. Open it, add a note. Expected: the note appears, and switching back to the owner account shows that same note in the feed.
Try sharing with an email that has never signed up. Expected: "No Written account found for that email. Ask them to sign up first, then share again."

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add project sharing by email"
```

---

### Task 8: PWA manifest and iOS home-screen support

**Files:**
- Create: `app/manifest.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: none
- Produces: none consumed by later tasks

- [ ] **Step 1: Add app icons**

Create (or export from any image tool) two square PNGs and save them as `public/icons/icon-192.png` (192×192) and `public/icons/icon-512.png` (512×512). A simple placeholder (e.g. the letter "W" on a solid background) is fine for v1.

- [ ] **Step 2: Add the manifest**

Create `app/manifest.ts`:
```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Written',
    short_name: 'Written',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

- [ ] **Step 3: Add iOS-specific meta tags**

Modify `app/layout.tsx` to add the `apple-touch-icon` link and viewport/theme meta via the Next.js metadata export:
```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Written',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Written',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Verify manually**

Run `npm run dev`, visit `http://localhost:3000/manifest.webmanifest` directly. Expected: valid JSON matching the manifest above.
On an iPhone (or iOS Simulator) with Safari, visit the deployed URL (this requires Task 9 to be done first if testing on a real device over the network — for a same-Wi-Fi quick check you can instead visit your Mac's local IP + port, e.g. `http://192.168.1.x:3000`, from the phone). Tap Share → "Add to Home Screen". Expected: it offers "Written" with the icon from Step 1, and launching it opens without Safari's browser chrome.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add PWA manifest and iOS home-screen support"
```

---

### Task 9: Deploy to Vercel

**Files:**
- Create: `.gitignore` entry check only (no new files expected — `create-next-app` already ignores `.env*.local` and `node_modules`)

**Interfaces:**
- Consumes: everything from Tasks 1–8
- Produces: a public HTTPS URL running the app

- [ ] **Step 1: Push the repo**

If not already pushed:
```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

- [ ] **Step 2: Import the project into Vercel**

Go to https://vercel.com/new, import the GitHub repo. Leave the framework preset as "Next.js" (auto-detected).

- [ ] **Step 3: Add environment variables**

In the Vercel project's Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values from `.env.local`.

- [ ] **Step 4: Update the Supabase redirect URL**

In the Supabase dashboard, go to Authentication → URL Configuration, and add your Vercel deployment URL (e.g. `https://written.vercel.app`) to the list of allowed redirect URLs, so the magic-link callback works in production.

- [ ] **Step 5: Deploy and verify manually**

Trigger the deploy (Vercel does this automatically on push). Once live, visit the production URL: sign in with a magic link, confirm the email arrives and the callback redirects correctly, create a project, add a note, share it with your second test account. Expected: the full flow from Tasks 4–7 works identically to local dev.

- [ ] **Step 6: Commit**

No code changes are expected in this task; if any config tweaks were needed (e.g. a build setting), commit them:
```bash
git add -A
git commit -m "Deploy to Vercel" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** Architecture (Task 2, 4), data model + RLS (Task 3), auth & sharing (Tasks 4, 7), frontend structure (Tasks 5, 6), PWA (Task 8), error handling (inline in each component's `error`/`message` state, per spec's "inline error with retry" — retry here is just resubmitting the form, which is sufficient at this scale), testing (every task's manual-verification step, per spec's "manual testing only for v1"). All spec sections have a task.
- **No automated tests:** intentional — matches the spec's explicit v1 decision. Manual verification steps stand in for the "write failing test" cycle in each task.
- **Type consistency checked:** `Profile`, `Project`, `ProjectMember`, `Note` (Task 3) are the only shared types, and every later task imports them from `lib/types.ts` rather than redefining shapes inline.
