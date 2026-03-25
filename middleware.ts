import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Supabase SSR stores the session in a cookie named sb-<project-ref>-auth-token
    const hasSession = request.cookies.getAll().some(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    )

    if (!hasSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
