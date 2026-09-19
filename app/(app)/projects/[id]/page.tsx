import { createClient } from '@/lib/supabase/server'
import NoteComposer from '@/components/NoteComposer'
import NoteFeed from '@/components/NoteFeed'
import ShareProjectPanel from '@/components/ShareProjectPanel'
import type { Note, Profile, Project } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
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

  if (projectError) {
    return (
      <main className="p-8">
        <p className="text-red-600">Something went wrong loading this project. Try refreshing.</p>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="p-8">
        <p className="text-gray-600">Project not found, or you don&apos;t have access to it.</p>
      </main>
    )
  }

  const { data: userData } = await supabase.auth.getUser()

  const members = (memberRows ?? [])
    .map((row) => row.profiles as unknown as Profile)
    .filter(Boolean)

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      <ShareProjectPanel
        projectId={project.id}
        members={members}
        isOwner={project.owner_id === userData.user?.id}
      />
      <NoteComposer projectId={project.id} />
      <NoteFeed notes={(notes as Note[] | null) ?? []} />
    </main>
  )
}
