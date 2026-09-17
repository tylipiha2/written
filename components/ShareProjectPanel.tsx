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
