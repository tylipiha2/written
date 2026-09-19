import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Surface the real reason in Vercel's function logs instead of
      // silently falling through to a confusing "redirected back to
      // login with no explanation" bounce.
      console.error('exchangeCodeForSession failed:', error.message)
      return NextResponse.redirect(`${origin}/login?error=auth`)
    }
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
