import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      nombre, apellido, email, password, telefono,
      cargo_id, sucursal_id,
      fecha_ingreso, fecha_salida,
      tarifa_hora, es_salario_fijo,
    } = body

    if (!nombre || !apellido || !email) {
      return NextResponse.json(
        { error: 'Nombre, apellido y email son obligatorios.' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido },
    })

    if (authError || !authData?.user) {
      console.error('Admin createUser error:', authError)
      return NextResponse.json(
        { error: 'Error al crear el usuario en Supabase Auth.' },
        { status: 400 }
      )
    }

    console.log('Register success:', { email, userId: authData.user.id, nombre, apellido })

    const { error: insertError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: authData.user.id,
        nombre,
        apellido,
        email,
        telefono: telefono || null,
        cargo_id: cargo_id ? parseInt(cargo_id) : null,
        sucursal_id: sucursal_id ? parseInt(sucursal_id) : null,
        fecha_ingreso,
        fecha_salida: fecha_salida || null,
        tarifa_hora: parseFloat(tarifa_hora) || 0,
        es_salario_fijo: es_salario_fijo ?? false,
      }, { onConflict: 'id' })

    if (insertError) {
      console.error('Insert usuario error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar el perfil en la base de datos.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
