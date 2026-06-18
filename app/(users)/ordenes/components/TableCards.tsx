'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Loader2, Settings, Plus, Trash2, Check, X, ChevronRight } from 'lucide-react';
import { C } from './tokens';

export type TableState = 'available' | 'occupied' | 'attention' | 'ready';

export interface TableData {
  id: number;
  numero: number;
  shape: 'circle' | 'square';
  sillas: number;
  state: TableState;
  zona: string;
  pos_x: number;
  pos_y: number;
  tamano: number;
}

interface TableCardsProps {
  onTableSelect: (table: TableData | null) => void;
  selectedTableId: number | null;
  occupiedTableIds: Set<number>;
}

interface ZonaInfo {
  id: number;
  nombre: string;
  sucursal_id: number | null;
}

interface MesaRow {
  id: number;
  numero: number;
  forma: 'circle' | 'square';
  sillas: number;
  zona_id: number;
  zona_nombre: string;
  activa: boolean;
}

const STATE_LABELS: Record<TableState, string> = {
  available: 'Libre',
  occupied: 'Ocupada',
  attention: 'Atención',
  ready: 'Lista',
};

const inputBase = "w-full px-3 py-2 rounded-lg border outline-none transition-all bg-[#07080B] text-sm";
const inputFocus = "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30";

export default function TableCards({ onTableSelect, selectedTableId, occupiedTableIds }: TableCardsProps) {
  const supabase = createClient();
  const [tables, setTables] = useState<TableData[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const [zonasInfo, setZonasInfo] = useState<ZonaInfo[]>([]);
  const [activeZone, setActiveZone] = useState('all');
  const [loading, setLoading] = useState(true);
  const [gestionando, setGestionando] = useState(false);
  const [mesasRaw, setMesasRaw] = useState<MesaRow[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ numero: string; forma: 'circle' | 'square'; sillas: string; zona_id: string }>({ numero: '', forma: 'square', sillas: '4', zona_id: '' });
  const [nuevaMesa, setNuevaMesa] = useState({ numero: '', forma: 'square' as 'circle' | 'square', sillas: '4', zona_id: '' });
  const [mostrarFormNueva, setMostrarFormNueva] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [occupiedTableIds]);

  useEffect(() => {
    if (gestionando) cargarMesasCompletas();
  }, [gestionando]);

  async function cargarDatos() {
    const { data: mesas } = await supabase
      .from('mesas')
      .select('*, zona:zona_id(nombre)')
      .eq('activa', true);

    if (mesas) {
      const mapped: TableData[] = mesas.map((m: any) => ({
        id: m.id,
        numero: m.numero,
        shape: m.forma as 'circle' | 'square',
        sillas: m.sillas,
        state: occupiedTableIds.has(m.id) ? 'occupied' : 'available',
        zona: m.zona?.nombre ?? 'Interior',
        pos_x: m.pos_x,
        pos_y: m.pos_y,
        tamano: m.tamano,
      }));
      setTables(mapped);
      const uniqueZonas = [...new Set(mapped.map((t) => t.zona))].sort();
      setZonas(uniqueZonas);
    }
    setLoading(false);
  }

  async function cargarMesasCompletas() {
    const { data: zonas } = await supabase.from('zonas').select('*');
    if (zonas) setZonasInfo(zonas);

    const { data: mesas } = await supabase
      .from('mesas')
      .select('*, zona:zona_id(nombre)');

    if (mesas) {
      setMesasRaw(mesas.map((m: any) => ({
        id: m.id,
        numero: m.numero,
        forma: m.forma,
        sillas: m.sillas,
        zona_id: m.zona_id,
        zona_nombre: m.zona?.nombre ?? 'Interior',
        activa: m.activa,
      })));
    }
  }

  async function handleAddMesa() {
    if (!nuevaMesa.numero || !nuevaMesa.zona_id) return;
    const zona = zonasInfo.find((z) => z.id === parseInt(nuevaMesa.zona_id));
    if (!zona) return;

    await supabase.from('mesas').insert({
      numero: parseInt(nuevaMesa.numero),
      zona_id: zona.id,
      forma: nuevaMesa.forma,
      sillas: parseInt(nuevaMesa.sillas) || 4,
      pos_x: 0,
      pos_y: 0,
      tamano: 100,
      activa: true,
      sucursal_id: zona.sucursal_id,
    });
    setNuevaMesa({ numero: '', forma: 'square', sillas: '4', zona_id: '' });
    setMostrarFormNueva(false);
    await cargarMesasCompletas();
    await cargarDatos();
  }

  async function handleEditSave(id: number) {
    await supabase.from('mesas').update({
      numero: parseInt(editForm.numero),
      forma: editForm.forma,
      sillas: parseInt(editForm.sillas) || 4,
      zona_id: parseInt(editForm.zona_id),
    }).eq('id', id);
    setEditandoId(null);
    await cargarMesasCompletas();
    await cargarDatos();
  }

  async function handleDelete(id: number) {
    await supabase.from('mesas').update({ activa: false }).eq('id', id);
    await cargarMesasCompletas();
    await cargarDatos();
  }

  function startEdit(m: MesaRow) {
    setEditandoId(m.id);
    setEditForm({ numero: String(m.numero), forma: m.forma, sillas: String(m.sillas), zona_id: String(m.zona_id) });
  }

  const nextNumero = mesasRaw.length > 0 ? Math.max(...mesasRaw.map((m) => m.numero)) + 1 : 1;

  function getZonaNombre(zonaId: number) {
    return zonasInfo.find((z) => z.id === zonaId)?.nombre ?? '—';
  }

  function getActiveZonaId() {
    const az = activeZone === 'all' ? zonas[0] : activeZone;
    return zonasInfo.find((z) => z.nombre === az)?.id;
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.gold }} />
          <span className="text-sm" style={{ color: C.t3 }}>Cargando mesas...</span>
        </div>
      </div>
    );
  }

  const zonasFiltradas = activeZone === 'all'
    ? [...new Set(tables.map((t) => t.zona))].sort()
    : [activeZone];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: C.bg }}>
      <div className="flex items-center gap-2 px-1 py-3 overflow-x-auto shrink-0">
        {!gestionando && (
          <>
            <button
              onClick={() => setActiveZone('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeZone === 'all' ? 'shadow-sm' : 'hover:bg-white/5'
              }`}
              style={{
                backgroundColor: activeZone === 'all' ? C.goldDim : 'transparent',
                color: activeZone === 'all' ? C.goldLight : C.t3,
                border: `1px solid ${activeZone === 'all' ? C.goldBorder : 'transparent'}`,
              }}
            >
              Todas
            </button>
            {zonas.map((z) => (
              <button
                key={z}
                onClick={() => setActiveZone(z)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeZone === z ? 'shadow-sm' : 'hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: activeZone === z ? C.goldDim : 'transparent',
                  color: activeZone === z ? C.goldLight : C.t3,
                  border: `1px solid ${activeZone === z ? C.goldBorder : 'transparent'}`,
                }}
              >
                {z}
              </button>
            ))}
          </>
        )}
        <div className="ml-auto">
          <button
            onClick={() => { setGestionando(!gestionando); if (!gestionando) cargarMesasCompletas(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: gestionando ? 'rgba(240, 82, 82, 0.1)' : C.goldDim,
              color: gestionando ? '#F05252' : C.goldLight,
              border: `1px solid ${gestionando ? 'rgba(240, 82, 82, 0.3)' : C.goldBorder}`,
            }}
          >
            <Settings size={13} />
            {gestionando ? 'Cerrar' : 'Gestionar'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {gestionando ? (
          <div className="animate-[fadeIn_0.2s_ease]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold" style={{ color: C.t1 }}>Gestión de Mesas</h2>
              <span className="text-xs" style={{ color: C.t3 }}>{mesasRaw.length} mesas</span>
            </div>

            {!mostrarFormNueva ? (
              <button
                onClick={() => setMostrarFormNueva(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-sm font-medium transition-all cursor-pointer mb-6 hover:border-cyan-500/40"
                style={{ borderColor: C.br2, color: C.gold, backgroundColor: 'rgba(6,182,212,0.04)' }}
              >
                <Plus size={15} />
                Añadir Mesa
              </button>
            ) : (
              <div
                className="rounded-xl border p-4 mb-6"
                style={{ borderColor: C.goldBorder, backgroundColor: C.goldDim }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: C.goldLight }}>Nueva Mesa</span>
                  <button onClick={() => setMostrarFormNueva(false)} className="cursor-pointer" style={{ color: C.t3 }}>
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: C.t3 }}>Número</label>
                    <input
                      type="number" min={1} value={nuevaMesa.numero}
                      onChange={(e) => setNuevaMesa((p) => ({ ...p, numero: e.target.value }))}
                      placeholder={String(nextNumero)}
                      className={`${inputBase} ${inputFocus}`}
                      style={{ color: C.t1, borderColor: C.br }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: C.t3 }}>Zona</label>
                    <select
                      value={nuevaMesa.zona_id}
                      onChange={(e) => setNuevaMesa((p) => ({ ...p, zona_id: e.target.value }))}
                      className={`${inputBase} ${inputFocus}`}
                      style={{ color: C.t1, borderColor: C.br }}
                    >
                      <option value="">Seleccionar</option>
                      {zonasInfo.map((z) => (
                        <option key={z.id} value={z.id}>{z.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: C.t3 }}>Forma</label>
                    <div className="flex gap-1">
                      {(['square', 'circle'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setNuevaMesa((p) => ({ ...p, forma: f }))}
                          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                          style={{
                            backgroundColor: nuevaMesa.forma === f ? C.goldDim : 'transparent',
                            color: nuevaMesa.forma === f ? C.goldLight : C.t3,
                            border: `1px solid ${nuevaMesa.forma === f ? C.goldBorder : C.br}`,
                          }}
                        >
                          {f === 'square' ? '◻︎ Cuadrada' : '◯ Redonda'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: C.t3 }}>Sillas</label>
                    <input
                      type="number" min={1} max={20} value={nuevaMesa.sillas}
                      onChange={(e) => setNuevaMesa((p) => ({ ...p, sillas: e.target.value }))}
                      className={`${inputBase} ${inputFocus}`}
                      style={{ color: C.t1, borderColor: C.br }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddMesa}
                  disabled={!nuevaMesa.numero || !nuevaMesa.zona_id}
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                  style={{
                    backgroundColor: C.gold,
                    color: '#fff',
                  }}
                >
                  Añadir Mesa
                </button>
              </div>
            )}

            {zonasInfo.map((zona) => {
              const mesasZona = mesasRaw.filter((m) => m.zona_id === zona.id);
              if (mesasZona.length === 0) return null;
              return (
                <div key={zona.id} className="mb-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: C.t3 }}>
                    {zona.nombre}
                    <span className="ml-2 font-normal opacity-60">{mesasZona.length} mesas</span>
                  </h3>
                  <div className="space-y-1">
                    {mesasZona.map((m) => {
                      const editando = editandoId === m.id;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                          style={{
                            backgroundColor: m.activa ? 'transparent' : 'rgba(255,255,255,0.02)',
                            opacity: m.activa ? 1 : 0.4,
                            border: `1px solid ${editando ? C.goldBorder : 'transparent'}`,
                          }}
                        >
                          {editando ? (
                            <>
                              <input
                                type="number" min={1} value={editForm.numero}
                                onChange={(e) => setEditForm((p) => ({ ...p, numero: e.target.value }))}
                                className={`w-14 ${inputBase} ${inputFocus}`}
                                style={{ color: C.t1, borderColor: C.br }}
                              />
                              <select
                                value={editForm.forma}
                                onChange={(e) => setEditForm((p) => ({ ...p, forma: e.target.value as 'circle' | 'square' }))}
                                className={`w-24 ${inputBase} ${inputFocus}`}
                                style={{ color: C.t1, borderColor: C.br }}
                              >
                                <option value="square">◻︎ Cuadrada</option>
                                <option value="circle">◯ Redonda</option>
                              </select>
                              <input
                                type="number" min={1} max={20} value={editForm.sillas}
                                onChange={(e) => setEditForm((p) => ({ ...p, sillas: e.target.value }))}
                                className={`w-16 ${inputBase} ${inputFocus}`}
                                style={{ color: C.t1, borderColor: C.br }}
                              />
                              <select
                                value={editForm.zona_id}
                                onChange={(e) => setEditForm((p) => ({ ...p, zona_id: e.target.value }))}
                                className={`flex-1 ${inputBase} ${inputFocus}`}
                                style={{ color: C.t1, borderColor: C.br }}
                              >
                                {zonasInfo.map((z) => (
                                  <option key={z.id} value={z.id}>{z.nombre}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleEditSave(m.id)}
                                className="p-1.5 rounded-md transition-colors cursor-pointer"
                                style={{ color: C.gold }}
                                title="Guardar"
                              >
                                <Check size={15} />
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                className="p-1.5 rounded-md transition-colors cursor-pointer"
                                style={{ color: C.t3 }}
                                title="Cancelar"
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="w-8 font-bold" style={{ color: C.t1 }}>{m.numero}</span>
                              <span className="w-20 text-xs" style={{ color: C.t2 }}>
                                {m.forma === 'square' ? '◻︎ Cuadrada' : '◯ Redonda'}
                              </span>
                              <span className="flex items-center gap-1 text-xs w-16" style={{ color: C.t3 }}>
                                <Users size={11} /> {m.sillas}
                              </span>
                              <span className="flex-1 text-xs" style={{ color: C.t2 }}>
                                {getZonaNombre(m.zona_id)}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  m.activa ? '' : 'opacity-50'
                                }`}
                                style={{
                                  backgroundColor: m.activa ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.05)',
                                  color: m.activa ? C.goldLight : C.t3,
                                }}
                              >
                                {m.activa ? 'Activa' : 'Inactiva'}
                              </span>
                              <button
                                onClick={() => startEdit(m)}
                                className="p-1.5 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-white/5"
                                style={{ color: C.t3 }}
                                title="Editar"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                              </button>
                              {m.activa && (
                                <button
                                  onClick={() => handleDelete(m.id)}
                                  className="p-1.5 rounded-md transition-all cursor-pointer hover:bg-red-500/10"
                                  style={{ color: C.t3 }}
                                  title="Desactivar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {zonasFiltradas.map((zona) => {
              const mesasZona = tables.filter((t) => t.zona === zona);
              if (mesasZona.length === 0) return null;
              return (
                <div key={zona} className="mb-6">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
                    style={{ color: C.t3 }}
                  >
                    {zona}
                    <span className="ml-2 font-normal opacity-60">{mesasZona.length} mesas</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {mesasZona.map((t) => {
                      const selected = t.id === selectedTableId;
                      const stateStyles = getStateStyles(t.state, selected);
                      return (
                        <button
                          key={t.id}
                          onClick={() => onTableSelect(t)}
                          className="relative rounded-xl border transition-all duration-200 cursor-pointer text-left group active:scale-[0.97]"
                          style={{
                            ...stateStyles,
                            padding: '14px 12px',
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span
                              className="text-2xl font-bold leading-none"
                              style={{
                                color: t.state === 'available' ? C.t3 : C.t1,
                              }}
                            >
                              {t.numero}
                            </span>
                            <span className={getBadge(t.state)}>
                              {STATE_LABELS[t.state]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.t3 }}>
                            <Users size={12} />
                            <span>{t.sillas} sillas</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );

  function getStateStyles(state: TableState, selected: boolean) {
    if (selected) {
      return {
        borderColor: C.goldBorderStrong,
        backgroundColor: C.goldDim,
        boxShadow: `0 0 20px ${C.goldGlow}, inset 0 0 20px ${C.goldGlow}`,
      };
    }
    switch (state) {
      case 'occupied':
        return { borderColor: C.goldBorder, backgroundColor: C.goldDim };
      case 'attention':
        return { borderColor: 'rgba(240, 82, 82, 0.3)', backgroundColor: 'rgba(240, 82, 82, 0.08)' };
      case 'ready':
        return { borderColor: C.tealBorder, backgroundColor: C.tealDim };
      default:
        return { borderColor: C.br, backgroundColor: 'transparent' };
    }
  }

  function getBadge(state: TableState) {
    const base = "px-2 py-0.5 rounded-full text-[10px] font-medium border";
    switch (state) {
      case 'occupied':
        return `${base} bg-emerald-500/15 border-emerald-500/30 text-emerald-400`;
      case 'attention':
        return `${base} bg-red-500/15 border-red-500/30 text-red-400`;
      case 'ready':
        return `${base} bg-teal-500/15 border-teal-500/30 text-teal-300`;
      default:
        return `${base} bg-white/5 border-white/10 text-gray-400`;
    }
  }

}
