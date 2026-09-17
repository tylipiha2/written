import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // TEMPORARY diagnostic wrapper — remove once the MIDDLEWARE_INVOCATION_FAILED
  // cause is confirmed. Surfaces the real error in the response body instead
  // of Vercel's opaque generic 500 page.
  try {
    return await handle(request)
  } catch (err) {
    return NextResponse.json(
      {
        diagnosticError: true,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
      { status: 500 }
    )
  }
}

async function handle(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
