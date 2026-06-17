'use client';

import { useState } from 'react';
import { X, Loader2, ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import type { Producto, Categoria } from './ProductosTab';

interface Props {
  producto: Producto | null;
  categorias: Categoria[];
  onClose: () => void;
}

interface FormData {
  nombre: string;
  categoria_id: number | null;
  precio: string;
  costo: string;
  medida: string;
  stock: string;
  imagen: string;
  activo: boolean;
}

export function ProductoFormModal({ producto, categorias, onClose }: Props) {
  const supabase = createClient();
  const esEdicion = !!producto;
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    nombre: producto?.nombre ?? '',
    categoria_id: producto?.categoria_id ?? null,
    precio: producto?.precio.toString() ?? '0',
    costo: producto?.costo.toString() ?? '0',
    medida: producto?.medida ?? '',
    stock: producto?.stock.toString() ?? '0',
    imagen: producto?.imagen ?? '',
    activo: producto?.activo ?? true,
  });

  const precioNum = parseFloat(form.precio) || 0;
  const costoNum = parseFloat(form.costo) || 0;
  const margen = precioNum - costoNum;
  const margenPorc = costoNum > 0 ? ((margen / costoNum) * 100).toFixed(1) : '∞';
  const margenColor = margen > 0 ? (margenPorc !== '∞' && parseFloat(margenPorc) > 30 ? 'text-emerald-400' : parseFloat(margenPorc || '0') > 10 ? 'text-amber-400' : 'text-red-400') : 'text-red-400';

  function handleChange(field: keyof FormData, value: string | boolean | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);

    const payload = {
      nombre: form.nombre.trim(),
      categoria_id: form.categoria_id,
      precio: precioNum,
      costo: costoNum,
      medida: form.medida.trim() || 'unidad',
      stock: parseFloat(form.stock) || 0,
      imagen: form.imagen.trim() || null,
      activo: form.activo,
    };

    if (!payload.nombre) {
      setError('El nombre del producto es obligatorio');
      setGuardando(false);
      return;
    }

    let err: any = null;
    if (esEdicion) {
      const { error: e } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', producto!.id);
      err = e;
    } else {
      const { error: e } = await supabase
        .from('productos')
        .insert(payload);
      err = e;
    }

    setGuardando(false);
    if (err) {
      setError(err.message);
    } else {
      onClose();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080B]/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
         className="bg-[#141822] border border-[rgba(6,182,212,0.15)] rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(6,182,212,0.08)] sticky top-0 bg-[#141822] z-10">
          <h3 className="text-[#F0F4FF] font-semibold text-base">
            {esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[rgba(240,244,255,0.3)] hover:text-[#F0F4FF] hover:bg-[rgba(6,182,212,0.1)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* Sección: Información básica */}
          <div>
            <h4 className="text-xs font-semibold text-[rgba(240,244,255,0.3)] uppercase tracking-wider mb-3">Información básica</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Nombre del producto *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-[#F0F4FF] placeholder-[rgba(240,244,255,0.3)] outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="Ej: Croquetas de Jamón"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Categoría</label>
                <select
                  value={form.categoria_id ?? ''}
                  onChange={(e) => handleChange('categoria_id', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
                >
                  <option value="">Sin categoría</option>
              {categorias.filter((c) => c.activo).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Imagen (URL)</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.imagen}
                      onChange={(e) => handleChange('imagen', e.target.value)}
                      className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[rgba(240,244,255,0.3)] outline-none focus:border-cyan-500/50 transition-colors"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#07080B] border border-[rgba(6,182,212,0.08)] flex items-center justify-center overflow-hidden shrink-0">
                    {form.imagen ? (
                      <img src={form.imagen} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                    ) : (
                      <ImageIcon size={16} className="text-[rgba(240,244,255,0.3)]" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(6,182,212,0.05)]" />

          {/* Sección: Precios y costos */}
          <div>
            <h4 className="text-xs font-semibold text-[rgba(240,244,255,0.3)] uppercase tracking-wider mb-3">Precios y costos</h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Precio de venta ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio}
                  onChange={(e) => handleChange('precio', e.target.value)}
                  className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Costo ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costo}
                  onChange={(e) => handleChange('costo', e.target.value)}
                  className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
            {/* Margen en vivo */}
            {precioNum > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`bg-[#07080B] rounded-lg px-4 py-2.5 flex items-center justify-between ${margenColor}`}
              >
                <span className="text-xs font-medium">Margen</span>
                <span className="text-sm font-semibold">
                  ${margen.toFixed(2)} ({margenPorc}%)
                </span>
              </motion.div>
            )}
          </div>

          <div className="border-t border-[rgba(6,182,212,0.05)]" />

          {/* Sección: Inventario */}
          <div>
            <h4 className="text-xs font-semibold text-[rgba(240,244,255,0.3)] uppercase tracking-wider mb-3">Inventario</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Medida</label>
                <input
                  type="text"
                  value={form.medida}
                  onChange={(e) => handleChange('medida', e.target.value)}
                  className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[rgba(240,244,255,0.3)] outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="unidad, kg, ml..."
                />
              </div>
              <div>
                <label className="block text-sm text-[rgba(240,244,255,0.4)] mb-1.5">Stock actual</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stock}
                  onChange={(e) => handleChange('stock', e.target.value)}
                  className="w-full bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(6,182,212,0.05)]" />

          {/* Toggle activo */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => handleChange('activo', !form.activo)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                form.activo ? 'bg-emerald-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.activo ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span className="text-sm text-[rgba(240,244,255,0.7)]">Producto activo</span>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-[rgba(6,182,212,0.08)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[rgba(240,244,255,0.4)] hover:text-[#F0F4FF] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 bg-gradient-to-r from-cyan-700 to-cyan-500 hover:from-cyan-600 hover:to-cyan-400 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              {guardando && <Loader2 size={14} className="animate-spin" />}
              {esEdicion ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
