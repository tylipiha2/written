'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export default function ShareProjectPanel({
  projectId,
  members,
  isOwner,
}: {
  projectId: string
  members: Profile[]
  isOwner: boolean
}) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const supabase = createClient()
    const normalizedEmail = email.trim().toLowerCase()

    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (lookupError) {
      setMessage('Something went wrong. Try again.')
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
      if (insertError.message.includes('duplicate key')) {
        setMessage('They already have access to this project.')
      } else if (insertError.message.includes('row-level security')) {
        setMessage('Only the project owner can share this project.')
      } else {
        setMessage('Something went wrong. Try again.')
      }
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
      {isOwner && (
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
      )}
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  )
}
