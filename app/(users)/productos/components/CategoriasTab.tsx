'use client';

import { useState, useMemo } from 'react';
import { Tags, Plus, Pencil, Eye, EyeOff, Check, X, Loader2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import type { Categoria, Producto } from './ProductosTab';

interface Props {
  categorias: Categoria[];
  productos: Producto[];
  sucursalId: number | null | undefined;
  cargando: boolean;
  onRefresh: () => void;
}

const CATEGORY_COLORS = [
  { dot: 'bg-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { dot: 'bg-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { dot: 'bg-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { dot: 'bg-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { dot: 'bg-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  { dot: 'bg-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { dot: 'bg-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
];

export function CategoriasTab({ categorias, productos, sucursalId, cargando, onRefresh }: Props) {
  const supabase = createClient();
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [editandoOrden, setEditandoOrden] = useState<number>(0);
  const [toggling, setToggling] = useState<number | null>(null);
  const [error, setError] = useState('');

  const productCountByCategory = useMemo(() => {
    return categorias.reduce((acc, cat) => {
      acc[cat.id] = productos.filter((p) => p.categoria_id === cat.id).length;
      return acc;
    }, {} as Record<number, number>);
  }, [categorias, productos]);

  const sinCategoria = productos.filter((p) => !p.categoria_id).length;

  const categoriasOrdenadas = useMemo(() => {
    return [...categorias].sort((a, b) => {
      if (a.activo !== b.activo) return a.activo ? -1 : 1;
      return a.orden - b.orden;
    });
  }, [categorias]);

  async function handleAgregar() {
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;

    setAgregando(true);
    setError('');
    const maxOrden = categorias.length > 0 ? Math.max(...categorias.map((c) => c.orden)) : 0;
    const payload: Record<string, any> = { nombre, activo: true, orden: maxOrden + 10 };
    if (sucursalId) payload.sucursal_id = sucursalId;

    const { error: err } = await supabase
      .from('categorias_productos')
      .insert(payload);

    if (err) {
      setError(err.message);
    } else {
      setNuevaCategoria('');
      onRefresh();
    }
    setAgregando(false);
  }

  async function handleGuardarEdicion(id: number) {
    const nombre = editandoNombre.trim();
    if (!nombre) return;

    await supabase
      .from('categorias_productos')
      .update({ nombre, orden: editandoOrden })
      .eq('id', id);

    setEditandoId(null);
    onRefresh();
  }

  async function handleToggleActivo(cat: Categoria) {
    setToggling(cat.id);
    setError('');
    const { error: err } = await supabase
      .from('categorias_productos')
      .update({ activo: !cat.activo })
      .eq('id', cat.id);
    if (err) setError(err.message);
    setToggling(null);
    onRefresh();
  }

  function iniciarEdicion(cat: Categoria) {
    setEditandoId(cat.id);
    setEditandoNombre(cat.nombre);
    setEditandoOrden(cat.orden);
  }

  return (
    <div className="bg-[#13161C] border border-white/10 rounded-2xl">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <Tags className="w-4 h-4 text-teal-400" />
          </div>
          <h2 className="text-white font-semibold text-base">Categorías de Productos</h2>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            {categorias.length} categorías
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAgregar()}
            placeholder="Nombre de la nueva categoría..."
            className="flex-1 bg-[#0c0e12] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-teal-500/40 transition-colors"
          />
          <button
            onClick={handleAgregar}
            disabled={agregando || !nuevaCategoria.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#2A9D8F] hover:bg-[#238b7e] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
          >
            {agregando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Agregar
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : categorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Tags className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No hay categorías creadas</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          <AnimatePresence mode="popLayout">
            {categoriasOrdenadas.map((cat, idx) => {
              const count = productCountByCategory[cat.id] ?? 0;
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const inactiva = !cat.activo;
              return (
                <motion.div
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: inactiva ? 0.45 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${inactiva ? 'select-none' : ''}`}
                >
                  {editandoId === cat.id ? (
                    <>
                      <input
                        type="text"
                        value={editandoNombre}
                        onChange={(e) => setEditandoNombre(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGuardarEdicion(cat.id)}
                        className="flex-1 bg-[#0c0e12] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-teal-500/40"
                        autoFocus
                      />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Orden:</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={editandoOrden}
                          onChange={(e) => setEditandoOrden(parseInt(e.target.value) || 0)}
                          className="w-14 bg-[#0c0e12] border border-white/10 rounded px-2 py-1 text-white text-center outline-none focus:border-teal-500/40"
                        />
                      </div>
                      <button
                        onClick={() => handleGuardarEdicion(cat.id)}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`w-2.5 h-2.5 rounded-full ${inactiva ? 'bg-gray-600' : color.dot} shrink-0`} />
                      <span className={`flex-1 text-sm ${inactiva ? 'text-gray-500 italic' : 'text-white'}`}>
                        {cat.nombre}
                        {inactiva && <span className="text-xs text-gray-600 ml-2">(inactiva)</span>}
                      </span>
                      {!inactiva && (
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${color.bg} ${color.border} border`}>
                          {count} {count === 1 ? 'producto' : 'productos'}
                        </span>
                      )}
                      {inactiva && count > 0 && (
                        <span className="text-xs text-gray-600">{count} productos</span>
                      )}
                      <span className="text-[11px] text-gray-600 font-mono w-8 text-right">#{cat.orden}</span>
                      <button
                        onClick={() => iniciarEdicion(cat)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActivo(cat)}
                        disabled={toggling === cat.id}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                        title={inactiva ? 'Activar' : 'Desactivar'}
                      >
                        {toggling === cat.id ? <Loader2 size={15} className="animate-spin" /> : inactiva ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {sinCategoria > 0 && (
            <div className="flex items-center gap-3 px-5 py-3 opacity-50">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-500 shrink-0" />
              <span className="flex-1 text-gray-400 text-sm italic">Sin categoría</span>
              <span className="text-xs font-mono text-gray-500 px-2 py-0.5 rounded-full bg-gray-500/10 border border-gray-500/20">
                {sinCategoria} {sinCategoria === 1 ? 'producto' : 'productos'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
