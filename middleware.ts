import { type NextRequest, NextResponse } from 'next/server'

// TEMPORARY bisection step: this deliberately does NOT import @supabase/ssr.
// If this deploys and loads cleanly where the previous version 500'd before
// our try/catch ever ran, that proves the crash is @supabase/ssr failing to
// even load on the Edge runtime, not a bug in our own logic.
export async function middleware(request: NextRequest) {
  return NextResponse.json({
    diagnosticBisection: true,
    path: request.nextUrl.pathname,
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
