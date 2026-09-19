# Written — MVP Design

## Purpose

A web app for freeform note-taking, organized around **Projects** (a
folder-like grouping). Notes within a project form a chronological
feed. Multiple people can use the app, and a project can be shared
with other users so they contribute notes to it too.

## Scope

- Audience: the owner plus a handful of friends. Not a public
  product — no need to design for scale, self-serve signup funnels,
  or abuse handling.
- Platform: web app, installable to the iOS home screen (PWA-lite,
  no offline support).

Out of scope for v1 (explicitly deferred, not forgotten):

- Invite-by-email for people who haven't signed up yet (v1 requires
  the invitee already has an account)
- Offline support / service worker caching
- Rich text or file/image attachments (notes are plain Markdown text)
- Tags, folders-within-projects, or manual note reordering
- Automated tests (manual testing only for v1)
- Password auth (v1 uses magic-link only)

## Architecture

A single Next.js (App Router) application, deployed as one unit.
Supabase provides Postgres, Auth (magic-link email sign-in), and
access control via Row Level Security (RLS) policies — whether a user
can see a project or its notes is enforced by the database via
`project_members`, not by application code. The Next.js app talks to
Supabase via its JS client from both server components (initial page
data) and client components (interactive updates).

## Data model

| Table | Columns | Notes |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `email`, `display_name` | Mirrors Supabase Auth users; needed to show who shared/authored what |
| `projects` | `id`, `name`, `owner_id`, `created_at` | |
| `project_members` | `project_id`, `user_id`, `role` (`owner` \| `member`), `added_at` | Join table; RLS on `projects`/`notes` checks membership here |
| `notes` | `id`, `project_id`, `author_id`, `content` (markdown text), `created_at` | Feed is `notes` ordered by `created_at desc` within a `project_id` |

RLS policies (conceptual, exact SQL written during implementation):

- `projects`: select/update allowed only if `auth.uid()` has a row in
  `project_members` for that `project_id`.
- `notes`: select/insert allowed only if `auth.uid()` is a member of
  the note's `project_id`. Update/delete of a note restricted to its
  `author_id`.
- `project_members`: select allowed to existing members; insert
  (adding a member) restricted to the project's `owner_id`.

## Auth & sharing (v1 scope)

- **Auth**: Supabase magic-link email sign-in. No passwords, no
  password-reset flow to build.
- **Sharing**: a project owner shares a project by entering a
  friend's email address.
  - If that email already has a `profiles` row (i.e. has signed up),
    a `project_members` row is created immediately and the project
    appears in their dashboard.
  - If not, the UI tells the owner: "ask them to sign up first, then
    share again." No invite-token or pending-email system in v1.

## Frontend structure

- `/login` — magic-link sign-in form
- `/` (dashboard) — list of projects the signed-in user is a member
  of, plus "New project"
- `/projects/[id]` — chronological note feed (newest first), a note
  composer at the top, and a "Share" control showing current members
  and an add-by-email field

Notes are stored as raw Markdown and rendered in the feed with a
Markdown renderer (e.g. `react-markdown`); no WYSIWYG editing.

## PWA / iOS home screen

A `manifest.json` (name, icons, `display: standalone`) plus the
`apple-touch-icon` meta tags is sufficient for "Add to Home Screen"
on iOS Safari. No service worker or offline caching in v1 — the app
is inherently collaborative and needs the network regardless.

## Error handling

- A failed Supabase call shows an inline error with a retry action;
  it does not crash the page.
- RLS silently returns zero rows for anything the user isn't a member
  of — this reads as an empty list, not a "forbidden" error; no
  separate handling needed.
- If the network is down, a small persistent banner says so; there
  are no offline writes to reconcile in v1.

## Testing

Manual testing before each deploy; TypeScript for compile-time
safety. No automated test suite in v1. If e2e coverage is wanted
later, Playwright is the natural fit (used already in the `musico`
project).

## Open questions

None outstanding — all decisions above were confirmed during
brainstorming on 2026-09-17.
