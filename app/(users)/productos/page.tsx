'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { Package, Tags, BarChart3 } from 'lucide-react';

import { DashboardSidebar } from '@/app/components/layout/sidebar';
import { ProductosTab, Producto, Categoria } from './components/ProductosTab';
import { CategoriasTab } from './components/CategoriasTab';
import { ReportesTab } from './components/ReportesTab';

export default function ProductosPage() {
  return (
    <Suspense fallback={null}>
      <ProductosContent />
    </Suspense>
  );
}

function ProductosContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'inventario' | 'categorias' | 'reportes'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'categorias') return 'categorias';
    if (tab === 'reportes') return 'reportes';
    return 'inventario';
  });

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [sucursalId, setSucursalId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (sucursalId === undefined) return;
    cargarProductos();
    cargarCategorias();
  }, [sucursalId]);

  async function verificarAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) { router.push('/login'); return; }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('cargo_id, sucursal_id')
      .eq('id', user.id)
      .single();

    if (usuario?.cargo_id) {
      const { data: cargo } = await supabase
        .from('cargos')
        .select('nombre')
        .eq('id', usuario.cargo_id)
        .single();

      if (cargo?.nombre !== 'Administrador') {
        router.push('/dashboard');
        return;
      }
    }

    setSucursalId(usuario?.sucursal_id ?? null);
  }

  async function cargarProductos() {
    setCargandoProductos(true);
    let query = supabase
      .from('productos')
      .select('*, categoria:categoria_id(nombre)')
      .order('nombre');
    
    const { data } = await query;

    if (data) {
      setProductos(
        data.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          categoria_id: p.categoria_id,
          categoria_nombre: p.categoria?.nombre ?? '',
          precio: p.precio,
          costo: p.costo,
          medida: p.medida,
          stock: p.stock,
          imagen: p.imagen,
          activo: p.activo,
          created_at: p.created_at,
        }))
      );
    }
    setCargandoProductos(false);
  }

  async function cargarCategorias() {
    setCargandoCategorias(true);
    let query = supabase
      .from('categorias_productos')
      .select('*')
      .order('orden', { ascending: true, nullsFirst: false });
    if (sucursalId) query = query.eq('sucursal_id', sucursalId);
    const { data } = await query;

    if (data) {
      setCategorias(
        data.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          activo: c.activo,
          orden: c.orden,
          sucursal_id: c.sucursal_id,
        }))
      );
    }
    setCargandoCategorias(false);
  }

  const refreshProductos = useCallback(() => { cargarProductos(); }, [sucursalId]);
  const refreshCategorias = useCallback(() => { cargarCategorias(); }, [sucursalId]);

  return (
    <div className="min-h-screen bg-[#0C0E14]">
      <DashboardSidebar />

      <div className="md:ml-64 flex flex-col min-h-screen bg-[#0C0E14]">
        <header
          className="h-[60px] bg-[#141822] border-b border-[rgba(6,182,212,0.08)] flex items-center px-6 gap-4"
        >
          <span
            className="text-[#F0F4FF] font-bold text-lg mr-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Productos
          </span>

          <button
            onClick={() => setActiveTab('inventario')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'inventario'
                ? 'bg-[rgba(6,182,212,0.15)] text-cyan-400 border border-[rgba(6,182,212,0.3)]'
                : 'text-[rgba(240,244,255,0.4)] border border-transparent hover:text-[#F0F4FF]'
            }`}
          >
            <Package size={16} />
            Inventario
          </button>

          <button
            onClick={() => setActiveTab('categorias')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'categorias'
                ? 'bg-[rgba(8,145,178,0.2)] text-cyan-500 border border-[rgba(8,145,178,0.4)]'
                : 'text-[rgba(240,244,255,0.4)] border border-transparent hover:text-[#F0F4FF]'
            }`}
          >
            <Tags size={16} />
            Categorías
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'reportes'
                ? 'bg-[rgba(6,182,212,0.15)] text-cyan-400 border border-[rgba(6,182,212,0.3)]'
                : 'text-[rgba(240,244,255,0.4)] border border-transparent hover:text-[#F0F4FF]'
            }`}
          >
            <BarChart3 size={16} />
            Reportes
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'inventario' && (
                <ProductosTab
                  productos={productos}
                  categorias={categorias}
                  cargando={cargandoProductos}
                  onRefresh={refreshProductos}
                />
              )}

              {activeTab === 'categorias' && (
                <CategoriasTab
                  categorias={categorias}
                  productos={productos}
                  sucursalId={sucursalId}
                  cargando={cargandoCategorias}
                  onRefresh={refreshCategorias}
                />
              )}

              {activeTab === 'reportes' && (
                <ReportesTab
                  productos={productos}
                  categorias={categorias}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
