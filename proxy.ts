import { type NextRequest, NextResponse } from 'next/server'

// DIAGNOSTIC ONLY (branch: debug-proxy-minimal). No Supabase, no cookies.
// Every request to "/" gets an unconditional redirect to "/login" with a
// custom header set, so we can tell purely from the browser's network tab
// whether Vercel is invoking proxy.ts AT ALL — independent of our app's
// auth logic or Supabase config. If this doesn't redirect, the earlier
// theory (empty middleware-manifest.json for the proxy.ts convention in
// this Next.js version) is confirmed as a platform/build-tooling bug, not
// something caused by our app. If it DOES redirect, the bug is somewhere
// in our real proxy.ts logic instead, and this rules out Vercel/build
// tooling as the cause.
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  const response = NextResponse.redirect(url)
  response.headers.set('x-debug-proxy-ran', 'true')
  return response
}

export const config = {
  matcher: ['/'],
}
