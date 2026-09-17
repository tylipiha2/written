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
