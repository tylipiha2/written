'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'magic' | 'password'
type MagicStatus = 'idle' | 'sent' | 'error'
type PasswordStatus = 'idle' | 'confirm' | 'error'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('magic')

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Sign in to Written</h1>
        <div className="flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`px-3 py-2 text-sm ${
              mode === 'magic' ? 'border-b-2 border-black font-medium' : 'text-gray-500'
            }`}
          >
            Magic link
          </button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`px-3 py-2 text-sm ${
              mode === 'password' ? 'border-b-2 border-black font-medium' : 'text-gray-500'
            }`}
          >
            Password
          </button>
        </div>
        {mode === 'magic' ? <MagicLinkForm /> : <PasswordForm />}
      </div>
    </main>
  )
}

function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<MagicStatus>('idle')

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

  if (status === 'sent') {
    return <p className="text-gray-600">Check your email for a sign-in link.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded border px-3 py-2"
      />
      <button type="submit" className="w-full rounded bg-black px-3 py-2 text-white">
        Send magic link
      </button>
      {status === 'error' && (
        <p className="text-red-600">Something went wrong sending the link. Try again.</p>
      )}
    </form>
  )
}

function PasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<PasswordStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMessage(error.message)
      setStatus('error')
      return
    }
    // The browser client already set the session cookie above; refresh
    // so the proxy and Server Components re-read it on this navigation.
    router.push('/')
    router.refresh()
  }

  async function handleSignUp() {
    setStatus('idle')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setErrorMessage(error.message)
      setStatus('error')
      return
    }
    if (data.session) {
      // Email confirmation is disabled on this Supabase project, so
      // signUp already returned an active session.
      router.push('/')
      router.refresh()
      return
    }
    // Email confirmation is required before the account can sign in.
    setStatus('confirm')
  }

  if (status === 'confirm') {
    return <p className="text-gray-600">Check your email to confirm your account, then sign in.</p>
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded border px-3 py-2"
      />
      <button type="submit" className="w-full rounded bg-black px-3 py-2 text-white">
        Sign in
      </button>
      <button
        type="button"
        onClick={handleSignUp}
        className="w-full rounded border px-3 py-2"
      >
        Create account
      </button>
      {status === 'error' && <p className="text-red-600">{errorMessage}</p>}
    </form>
  )
}
