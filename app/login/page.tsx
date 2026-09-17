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
