import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { allowed, remaining } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 60 segundos.' },
      { status: 429 }
    )
  }

  const { identifier, password } = await request.json()

  if (!identifier || !password) {
    return NextResponse.json(
      { error: 'Todos los campos son obligatorios.' },
      { status: 400 }
    )
  }

  const email = identifier.includes('@') ? identifier : `${identifier}@placeholder.com`

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json(
      { error: 'Credenciales inválidas.', remaining },
      { status: 401 }
    )
  }

  return NextResponse.json({ success: true })
}
