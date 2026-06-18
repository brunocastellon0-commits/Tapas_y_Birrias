import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const protectedRoutes = ['/dashboard', '/ordenes', '/productos', '/empleados']
  const authRoutes = ['/login', '/register']

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/productos')) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('cargo_id')
      .eq('id', user.id)
      .single()

    if (usuario?.cargo_id) {
      const { data: cargo } = await supabase
        .from('cargos')
        .select('nombre')
        .eq('id', usuario.cargo_id)
        .single()

      if (cargo?.nombre !== 'Administrador') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
}
