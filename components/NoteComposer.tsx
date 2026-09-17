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
