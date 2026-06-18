'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Pencil, Trash2, Eye, EyeOff, Loader2, AlertTriangle, LayoutGrid, List, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { ProductoFormModal } from './ProductoFormModal';

export interface Producto {
  id: number;
  nombre: string;
  categoria_id: number | null;
  categoria_nombre: string;
  precio: number;
  costo: number;
  medida: string;
  stock: number;
  imagen: string | null;
  activo: boolean;
  created_at: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  activo: boolean;
  orden: number;
  sucursal_id: number | null;
}

interface Props {
  productos: Producto[];
  categorias: Categoria[];
  cargando: boolean;
  onRefresh: () => void;
}

const CATEGORY_COLORS = [
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
];

const CATEGORY_DOT_COLORS = [
  'bg-amber-400',
  'bg-emerald-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-orange-400',
  'bg-rose-400',
];

const ITEMS_PER_PAGE = 25;

export function ProductosTab({ productos, categorias, cargando, onRefresh }: Props) {
  const supabase = createClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaInput, setBusquedaInput] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<number | 'todas'>('todas');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [vista, setVista] = useState<'table' | 'cards'>('table');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setBusqueda(busquedaInput), 300);
    return () => clearTimeout(timer);
  }, [busquedaInput]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { setPagina(1); }, [busqueda, filtroCategoria]);

  const categoriaColorMap = useMemo(() => {
    const map: Record<number, number> = {};
    categorias.forEach((c, i) => { map[c.id] = i % CATEGORY_COLORS.length; });
    return map;
  }, [categorias]);

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria = filtroCategoria === 'todas' || p.categoria_id === filtroCategoria;
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, filtroCategoria]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const paginados = filtrados.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE);

  async function handleToggleActivo(producto: Producto) {
    await supabase
      .from('productos')
      .update({ activo: !producto.activo })
      .eq('id', producto.id);
    onRefresh();
  }

  async function handleEliminar(id: number) {
    setEliminando(id);
    setErrorEliminar('');
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', id);
    setEliminando(null);
    if (error) {
      setErrorEliminar(error.message);
      return;
    }
    onRefresh();
  }

  function handleEditar(producto: Producto) {
    setEditando(producto);
    setModalAbierto(true);
  }

  function handleAgregar() {
    setEditando(null);
    setModalAbierto(true);
  }

  function handleModalClose() {
    setModalAbierto(false);
    setEditando(null);
    onRefresh();
  }

  return (
    <>
      <div className="bg-[#13161C] border border-white/10 rounded-2xl">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-white font-semibold text-base">Inventario de Productos</h2>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
              {productos.length} productos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#0c0e12] border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setVista('table')}
                className={`p-2 transition-colors cursor-pointer ${vista === 'table' ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]' : 'text-gray-500 hover:text-white'}`}
                title="Vista tabla"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setVista('cards')}
                className={`p-2 transition-colors cursor-pointer ${vista === 'cards' ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]' : 'text-gray-500 hover:text-white'}`}
                title="Vista tarjetas"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <button
              onClick={handleAgregar}
              className="flex items-center gap-2 px-4 py-2 bg-[#2A9D8F] hover:bg-[#238b7e] text-white text-sm font-medium rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>
        </div>

        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar producto...  (presiona  /  para buscar)"
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              className="w-full bg-[#0c0e12] border border-white/10 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/40 transition-colors"
            />
            {busquedaInput && (
              <button
                onClick={() => { setBusquedaInput(''); setBusqueda(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
            className="bg-[#0c0e12] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/40 transition-colors cursor-pointer"
          >
            <option value="todas">Todas las categorías</option>
            {categorias.filter((c) => c.activo).map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {errorEliminar && (
          <div className="mx-5 mt-5 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-300 font-medium">No se pudo eliminar el producto</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Este producto tiene ventas asociadas. Puedes desactivarlo usando el botón en lugar de eliminarlo.
              </p>
            </div>
            <button
              onClick={() => setErrorEliminar('')}
              className="ml-auto text-red-400/50 hover:text-red-300 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{busqueda || filtroCategoria !== 'todas' ? 'No se encontraron productos con esos filtros' : 'No hay productos aún. ¡Agrega tu primer producto!'}</p>
          </div>
        ) : vista === 'table' ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-gray-500 font-medium px-5 py-3">Producto</th>
                    <th className="text-left text-gray-500 font-medium px-5 py-3">Categoría</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-3 hidden sm:table-cell">Precio</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Costo</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Margen</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-3">Stock</th>
                    <th className="text-center text-gray-500 font-medium px-5 py-3 hidden sm:table-cell">Medida</th>
                    <th className="text-center text-gray-500 font-medium px-5 py-3">Estado</th>
                    <th className="text-right text-gray-500 font-medium px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {paginados.map((p, idx) => {
                      const margen = p.precio - p.costo;
                      const margenPorc = p.costo > 0 ? ((margen / p.costo) * 100).toFixed(0) : '∞';
                      const stockPercent = Math.min(100, (p.stock / 30) * 100);
                      const stockColor = p.stock <= 5 ? 'bg-red-400' : p.stock <= 15 ? 'bg-amber-400' : 'bg-emerald-400';
                      const catColorIdx = p.categoria_id ? categoriaColorMap[p.categoria_id] ?? -1 : -1;
                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ delay: idx * 0.02, duration: 0.2 }}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span className={`text-white font-medium ${!p.activo ? 'line-through opacity-50' : ''}`}>
                              {p.nombre}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {catColorIdx >= 0 ? (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs border ${CATEGORY_COLORS[catColorIdx]}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT_COLORS[catColorIdx]}`} />
                                {p.categoria_nombre}
                              </span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-white hidden sm:table-cell">${p.precio.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-gray-400 hidden md:table-cell">${p.costo.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                            <div className="flex items-center justify-end gap-2">
                              <span className={margen > 0 ? 'text-emerald-400' : margen < 0 ? 'text-red-400' : 'text-gray-400'}>
                                {margenPorc}%
                              </span>
                              <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${margen > 30 ? 'bg-emerald-400' : margen > 10 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, (margen / p.precio) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`text-sm font-mono ${p.stock <= 5 ? 'text-red-400 font-medium' : p.stock <= 15 ? 'text-amber-400' : 'text-white'}`}>
                                {p.stock}
                              </span>
                              <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                <div className={`h-full rounded-full ${stockColor}`} style={{ width: `${stockPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center text-gray-400 hidden sm:table-cell">{p.medida}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              p.activo
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-gray-500/10 text-gray-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditar(p)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleToggleActivo(p)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-colors cursor-pointer"
                                title={p.activo ? 'Desactivar' : 'Activar'}
                              >
                                {p.activo ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button
                                onClick={() => handleEliminar(p.id)}
                                disabled={eliminando === p.id}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                                title="Eliminar"
                              >
                                {eliminando === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {paginados.map((p, idx) => {
                  const margen = p.precio - p.costo;
                  const margenPorc = p.costo > 0 ? ((margen / p.costo) * 100).toFixed(0) : '∞';
                  const stockPercent = Math.min(100, (p.stock / 30) * 100);
                  const stockColor = p.stock <= 5 ? 'bg-red-400' : p.stock <= 15 ? 'bg-amber-400' : 'bg-emerald-400';
                  const catColorIdx = p.categoria_id ? categoriaColorMap[p.categoria_id] ?? -1 : -1;
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      className={`bg-[#0c0e12] border rounded-xl p-4 ${p.activo ? 'border-white/10' : 'border-white/5 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium text-white truncate ${!p.activo ? 'line-through' : ''}`}>
                            {p.nombre}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            {catColorIdx >= 0 ? (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${CATEGORY_COLORS[catColorIdx]}`}>
                                {p.categoria_nombre}
                              </span>
                            ) : null}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                              p.activo ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${p.activo ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Precio</span>
                          <span className="text-white font-mono">${p.precio.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Costo</span>
                          <span className="text-gray-400 font-mono">${p.costo.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Margen</span>
                          <span className={`font-mono ${margen > 0 ? 'text-emerald-400' : margen < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {margenPorc}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Medida</span>
                          <span className="text-gray-300">{p.medida}</span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Stock</span>
                          <span className={`font-mono ${p.stock <= 5 ? 'text-red-400 font-medium' : p.stock <= 15 ? 'text-amber-400' : 'text-white'}`}>
                            {p.stock}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${stockColor}`} style={{ width: `${stockPercent}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleEditar(p)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActivo(p)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-colors cursor-pointer"
                          title={p.activo ? 'Desactivar' : 'Activar'}
                        >
                          {p.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleEliminar(p.id)}
                          disabled={eliminando === p.id}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                          title="Eliminar"
                        >
                          {eliminando === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
            <span className="text-xs text-gray-500">
              {filtrados.length} productos — Página {pagina} de {totalPaginas}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPagina(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    p === pagina
                      ? 'bg-[#2A9D8F]/20 text-[#2A9D8F]'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ProductoFormModal
          producto={editando}
          categorias={categorias}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
