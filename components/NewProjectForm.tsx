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
