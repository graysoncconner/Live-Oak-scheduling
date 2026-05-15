import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — allow through
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/student-login') ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // Student portal — check student_id cookie
  if (pathname.startsWith('/portal')) {
    const studentId = request.cookies.get('student_id')?.value
    if (!studentId) {
      return NextResponse.redirect(new URL('/student-login', request.url))
    }
    return NextResponse.next()
  }

  // Admin routes — check Supabase Auth session
  // We need to create a response so @supabase/ssr can refresh the session token
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
