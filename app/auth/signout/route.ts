import { createSupabaseServerClient } from '@/lib/supabase-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[signout]', error.message)
  return NextResponse.redirect(new URL('/login', request.url))
}
