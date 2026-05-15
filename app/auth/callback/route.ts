import { createSupabaseServerClient } from '@/lib/supabase-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const providerError = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    const dest = providerError ? `/login?error=${encodeURIComponent(providerError)}` : '/login'
    return NextResponse.redirect(new URL(dest, origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth', origin))
  }

  const safeNext = next.startsWith('/') ? next : '/'
  return NextResponse.redirect(new URL(safeNext, origin))
}
