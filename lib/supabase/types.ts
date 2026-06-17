export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nombre: string
          apellido: string
          email: string
          telefono: string | null
          cargo_id: number | null
          sucursal_id: number | null
          fecha_ingreso: string
          fecha_salida: string | null
          tarifa_hora: number | null
          es_salario_fijo: boolean
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>
      }
      mesas: {
        Row: {
          id: number
          numero: number
          zona_id: number
          forma: 'circle' | 'square'
          sillas: number
          pos_x: number
          pos_y: number
          tamano: number
          activa: boolean
          sucursal_id: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['mesas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['mesas']['Insert']>
      }
      productos: {
        Row: {
          id: number
          nombre: string
          categoria_id: number | null
          precio: number
          costo: number
          medida: string
          stock: number
          imagen: string | null
          activo: boolean
          sucursal_id: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['productos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['productos']['Insert']>
      }
      comandas: {
        Row: {
          id: number
          mesa_id: number
          usuario_id: string
          etapa: 'tomada' | 'en-cocina' | 'lista' | 'entregada' | 'cerrada' | 'anulada'
          cubiertos: number
          nota: string | null
          total: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['comandas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['comandas']['Insert']>
      }
      comanda_items: {
        Row: {
          id: number
          comanda_id: number
          producto_id: number
          nombre_producto: string
          precio_unitario: number
          cantidad: number
          notas: string[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['comanda_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['comanda_items']['Insert']>
      }
      pagos: {
        Row: {
          id: number
          comanda_id: number
          metodo: 'efectivo' | 'tarjeta' | 'qr'
          monto: number
          usuario_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pagos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pagos']['Insert']>
      }
      movimientos_caja: {
        Row: {
          id: number
          tipo: 'entrada' | 'salida'
          monto: number
          descripcion: string
          usuario_id: string
          sucursal_id: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimientos_caja']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['movimientos_caja']['Insert']>
      }
      aperturas_caja: {
        Row: {
          id: number
          sucursal_id: number | null
          usuario_id: string
          monto_efectivo: number
          monto_qr: number
          monto_tarjeta: number
          corte_efectivo: Json
          abierta: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['aperturas_caja']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['aperturas_caja']['Insert']>
      }
      cierres_caja: {
        Row: {
          id: number
          apertura_id: number
          usuario_id: string
          monto_efectivo: number
          monto_qr: number
          monto_tarjeta: number
          corte_efectivo: Json
          diferencia: number
          observaciones: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cierres_caja']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cierres_caja']['Insert']>
      }
      zonas: {
        Row: {
          id: number
          nombre: string
          sucursal_id: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['zonas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['zonas']['Insert']>
      }
      categorias_productos: {
        Row: { id: number; nombre: string; activo: boolean; orden: number; sucursal_id: number | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['categorias_productos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categorias_productos']['Insert']>
      }
      cargos: {
        Row: { id: number; nombre: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['cargos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cargos']['Insert']>
      }
      sucursales: {
        Row: { id: number; nombre: string; direccion: string | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['sucursales']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sucursales']['Insert']>
      }
    }
  }
}
