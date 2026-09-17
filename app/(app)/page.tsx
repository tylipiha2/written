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
