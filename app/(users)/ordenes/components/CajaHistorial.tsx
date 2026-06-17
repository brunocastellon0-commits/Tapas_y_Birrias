'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Calendar, X, ChevronDown, ChevronRight, Banknote,
  QrCode, CreditCard, User, Hash, Receipt, Circle, Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { C } from './tokens';

interface CorteDetalle {
  denominacion: number;
  cantidad: number;
}

interface CajaRecord {
  id: number;
  apertura: {
    id: number;
    created_at: string;
    usuario: string;
    monto_efectivo: number;
    corte_efectivo: CorteDetalle[];
  };
  cierre: {
    id: number;
    created_at: string;
    usuario: string;
    monto_efectivo: number;
    monto_qr: number;
    monto_tarjeta: number;
    corte_efectivo: CorteDetalle[];
    diferencia: number;
    observaciones: string | null;
  } | null;
  estado: 'abierta' | 'cerrada';
}

const DENOMINACIONES = [
  { label: '500€', value: 500 },
  { label: '200€', value: 200 },
  { label: '100€', value: 100 },
  { label: '50€', value: 50 },
  { label: '20€', value: 20 },
  { label: '10€', value: 10 },
  { label: '5€', value: 5 },
  { label: '2€', value: 2 },
  { label: '1€', value: 1 },
  { label: '0.50€', value: 0.5 },
  { label: '0.20€', value: 0.2 },
  { label: '0.10€', value: 0.1 },
  { label: '0.05€', value: 0.05 },
  { label: '0.02€', value: 0.02 },
  { label: '0.01€', value: 0.01 },
];

function totalCorte(corte: CorteDetalle[]) {
  return corte.reduce((s, c) => s + c.denominacion * c.cantidad, 0);
}

function CorteTable({ corte }: { corte: CorteDetalle[] }) {
  const items = corte.filter((c) => c.cantidad > 0);
  if (items.length === 0) return <span style={{ fontSize: 11, color: C.t3 }}>Sin desglose</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((c) => {
        const label = DENOMINACIONES.find((d) => d.value === c.denominacion)?.label ?? `${c.denominacion}€`;
        return (
          <div key={c.denominacion} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.t2, padding: '1px 0' }}>
            <span>{label} × {c.cantidad}</span>
            <span style={{ color: C.t1, fontWeight: 500 }}>{(c.denominacion * c.cantidad).toFixed(2)}€</span>
          </div>
        );
      })}
      <div style={{ borderTop: `1px solid ${C.br}`, marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: C.goldLight }}>
        <span>Total</span>
        <span>{totalCorte(items).toFixed(2)}€</span>
      </div>
    </div>
  );
}

export default function CajaHistorial() {
  const supabase = createClient();
  const [records, setRecords] = useState<CajaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CajaRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes' | 'todas'>('todas');
  const [statusFilter, setStatusFilter] = useState<'todas' | 'abierta' | 'cerrada'>('todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    cargar();
    verificarAdmin();
  }, []);

  async function verificarAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('cargo_id')
      .eq('id', user.id)
      .single();
    if (!usuario?.cargo_id) return;
    const { data: cargo } = await supabase
      .from('cargos')
      .select('nombre')
      .eq('id', usuario.cargo_id)
      .single();
    setIsAdmin(cargo?.nombre === 'Administrador');
  }

  async function cargar() {
    setLoading(true);

    const { data: aperturas, error } = await supabase
      .from('aperturas_caja')
      .select('*, usuario:usuario_id(nombre, apellido)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) { setLoading(false); return; }
    if (!aperturas) { setLoading(false); return; }

    const recordsData: CajaRecord[] = [];

    for (const ap of aperturas) {
      const { data: cierres } = await supabase
        .from('cierres_caja')
        .select('*, usuario:usuario_id(nombre, apellido)')
        .eq('apertura_id', ap.id)
        .limit(1);

      const cierre = cierres?.[0] ?? null;

      recordsData.push({
        id: ap.id,
        apertura: {
          id: ap.id,
          created_at: ap.created_at,
          usuario: `${ap.usuario?.nombre ?? ''} ${ap.usuario?.apellido ?? ''}`.trim(),
          monto_efectivo: ap.monto_efectivo,
          corte_efectivo: (ap.corte_efectivo ?? []) as CorteDetalle[],
        },
        cierre: cierre
          ? {
              id: cierre.id,
              created_at: cierre.created_at,
              usuario: `${cierre.usuario?.nombre ?? ''} ${cierre.usuario?.apellido ?? ''}`.trim(),
              monto_efectivo: cierre.monto_efectivo,
              monto_qr: cierre.monto_qr,
              monto_tarjeta: cierre.monto_tarjeta,
              corte_efectivo: (cierre.corte_efectivo ?? []) as CorteDetalle[],
              diferencia: cierre.diferencia,
              observaciones: cierre.observaciones,
            }
          : null,
        estado: cierre ? 'cerrada' : 'abierta',
      });
    }

    setRecords(recordsData);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== 'todas' && r.estado !== statusFilter) return false;
      if (dateFilter !== 'todas') {
        const d = new Date(r.apertura.created_at);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dateFilter === 'hoy' && d < startOfDay) return false;
        if (dateFilter === 'semana') {
          const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (d < weekAgo) return false;
        }
        if (dateFilter === 'mes') {
          const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (d < monthAgo) return false;
        }
      }
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.apertura.usuario.toLowerCase().includes(s) &&
          !`caja #${r.id}`.includes(s)
        )
          return false;
      }
      return true;
    });
  }, [records, statusFilter, dateFilter, search]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.t3, fontFamily: C.sans, fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  const CARD: React.CSSProperties = {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.br}`,
    borderRadius: '16px',
  };

  return (
    <div className="flex" style={{ fontFamily: C.sans, alignItems: 'flex-start', height: '100%' }}>
      <div className="flex-1 min-w-0 p-6 space-y-5" style={{ overflowY: 'auto', height: '100%' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: C.serif, color: C.t1, fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.2 }}>
              Historial de Caja
            </h1>
            <p style={{ color: C.t3, fontSize: '0.82rem', marginTop: '4px' }}>
              {filtered.length} registros
            </p>
          </div>
        </div>

        <div className="p-4" style={CARD}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4A4A5A' }} />
              <input
                type="text"
                placeholder="Buscar caja, usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: C.t2,
                  fontSize: '0.8rem',
                }}
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {([['todas', 'Todas'], ['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setDateFilter(k)}
                  className="px-3 py-1.5 rounded-lg transition-all duration-200 capitalize"
                  style={{
                    backgroundColor: dateFilter === k ? C.goldDim : 'transparent',
                    color: dateFilter === k ? C.gold : C.t3,
                    border: dateFilter === k ? `1px solid ${C.goldBorder}` : '1px solid transparent',
                    fontSize: '0.78rem',
                    fontWeight: dateFilter === k ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  <Calendar className="w-3 h-3" style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {([['todas', 'Todas'], ['abierta', 'Abiertas'], ['cerrada', 'Cerradas']] as const).map(([k, label]) => {
                const isActive = statusFilter === k;
                const color = k === 'abierta' ? C.teal : k === 'cerrada' ? C.goldLight : C.t2;
                return (
                  <button key={k} onClick={() => setStatusFilter(k)}
                    className="px-3 py-1.5 rounded-lg transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? `${color}15` : 'rgba(255,255,255,0.03)',
                      border: isActive ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.06)',
                      color: isActive ? color : C.t3,
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Receipt className="w-6 h-6" style={{ color: '#3A3A4A' }} />
              </div>
              <p style={{ color: C.t3, fontSize: '0.88rem' }}>No se encontraron registros</p>
            </div>
          ) : (
            filtered.map((r) => {
              const isSelected = selected?.id === r.id;
              const diff = r.cierre?.diferencia ?? 0;
              const diffOk = Math.abs(diff) < 1;
              return (
                <div
                  key={r.id}
                  onClick={() => isAdmin && setSelected(isSelected ? null : r)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${isAdmin ? 'cursor-pointer' : ''}`}
                  style={{
                    backgroundColor: isSelected ? C.bgCard2 : C.bgCard,
                    border: isSelected ? `1px solid ${C.goldBorder}` : `1px solid ${C.br}`,
                  }}
                >
                  <div style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 700, width: '70px', flexShrink: 0 }}>
                    #{r.id}
                  </div>

                  <div style={{ width: '90px', flexShrink: 0 }}>
                    <div style={{ color: C.t2, fontSize: '0.8rem' }}>
                      {new Date(r.apertura.created_at).toLocaleDateString('es-ES')}
                    </div>
                    <div style={{ color: C.t3, fontSize: '0.72rem' }}>
                      {new Date(r.apertura.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                      style={{ background: C.tealDim, color: C.teal, border: `1px solid ${C.tealBorder}`, fontSize: '0.55rem' }}
                    >
                      {r.apertura.usuario.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span style={{ color: C.t3, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.apertura.usuario}
                    </span>
                  </div>

                  <div style={{ color: C.t2, fontSize: '0.8rem', width: '80px', textAlign: 'right', flexShrink: 0 }}>
                    {r.apertura.monto_efectivo}€
                  </div>

                  {r.cierre && (
                    <div style={{ color: C.t2, fontSize: '0.8rem', width: '80px', textAlign: 'right', flexShrink: 0 }}>
                      {r.cierre.monto_efectivo}€
                    </div>
                  )}

                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: diffOk ? C.tealDim : 'rgba(240,82,82,0.1)', border: `1px solid ${diffOk ? C.tealBorder : 'rgba(240,82,82,0.25)'}` }}
                  >
                    <span style={{ color: diffOk ? C.teal : '#F05252', fontSize: '0.72rem', fontWeight: 600 }}>
                      {r.cierre ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}€` : '—'}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: r.estado === 'abierta' ? C.tealDim : 'rgba(255,255,255,0.04)', border: `1px solid ${r.estado === 'abierta' ? C.tealBorder : 'rgba(255,255,255,0.06)'}` }}
                  >
                    <Circle size={8} fill={r.estado === 'abierta' ? C.teal : C.t3} color={r.estado === 'abierta' ? C.teal : C.t3} />
                    <span style={{ color: r.estado === 'abierta' ? C.teal : C.t3, fontSize: '0.72rem', fontWeight: 600, marginLeft: 4 }}>
                      {r.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </div>

                  {!isAdmin ? (
                    <Lock className="w-3 h-3 flex-shrink-0" style={{ color: '#3A3A4A' }} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSelected ? C.gold : '#3A3A4A', transform: isSelected ? 'rotate(90deg)' : 'none' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selected && isAdmin && (
        <div
          className="flex-shrink-0 overflow-y-auto"
          style={{
            width: '420px',
            position: 'sticky',
            top: 0,
            maxHeight: 'calc(100vh - 57px)',
            backgroundColor: C.bgCard,
            borderLeft: `1px solid ${C.br}`,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          }}
        >
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
            style={{ backgroundColor: C.bgCard, borderBottom: `1px solid ${C.br}` }}
          >
            <div>
              <div style={{ fontFamily: C.serif, color: C.t1, fontSize: '1.05rem', fontWeight: 600 }}>
                Detalle de Caja #{selected.id}
              </div>
              <div style={{ color: C.t3, fontSize: '0.75rem', marginTop: '1px' }}>
                {selected.apertura.usuario} · {new Date(selected.apertura.created_at).toLocaleDateString('es-ES')}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
              style={{ color: C.t3, cursor: 'pointer', border: 'none', background: 'transparent' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Apertura', value: new Date(selected.apertura.created_at).toLocaleString('es-ES'), icon: Calendar },
                { label: 'Abrió', value: selected.apertura.usuario, icon: User },
                { label: 'Estado', value: selected.estado === 'abierta' ? 'Caja abierta' : 'Caja cerrada', icon: Circle },
                ...(selected.cierre ? [{ label: 'Cierre', value: new Date(selected.cierre.created_at).toLocaleString('es-ES'), icon: Calendar }] : []),
                ...(selected.cierre ? [{ label: 'Cerró', value: selected.cierre.usuario, icon: User }] : []),
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3" style={{ color: C.t3 }} />
                    <span style={{ color: C.t3, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ color: C.t2, fontSize: '0.82rem', fontWeight: 500 }}>{value as string}</div>
                </div>
              ))}
            </div>

            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.br}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Banknote size={14} color={C.goldLight} />
                <span style={{ color: C.t3, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Corte Efectivo — Apertura
                </span>
              </div>
              <CorteTable corte={selected.apertura.corte_efectivo} />
            </div>

            {selected.cierre && (
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.br}` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Banknote size={14} color={C.teal} />
                  <span style={{ color: C.t3, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Corte Efectivo — Cierre
                  </span>
                </div>
                <CorteTable corte={selected.cierre.corte_efectivo} />
              </div>
            )}

            {selected.cierre && (
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.br}` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Receipt size={14} color={C.t2} />
                  <span style={{ color: C.t3, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                    Otros Métodos — Cierre
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.t2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><QrCode size={12} color="#A78BFA" /> QR</span>
                    <span style={{ color: C.t1, fontWeight: 500 }}>{selected.cierre.monto_qr.toFixed(2)}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.t2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CreditCard size={12} color="#38BDF8" /> Tarjeta</span>
                    <span style={{ color: C.t1, fontWeight: 500 }}>{selected.cierre.monto_tarjeta.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            )}

            {selected.cierre && (() => {
              const diff = selected.cierre.diferencia;
              const diffOk = Math.abs(diff) < 1;
              return (
                <div
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={{ backgroundColor: diffOk ? C.tealDim : 'rgba(240,82,82,0.1)', border: `1px solid ${diffOk ? C.tealBorder : 'rgba(240,82,82,0.25)'}` }}
                >
                  <span style={{ color: C.t2, fontSize: '0.85rem', fontWeight: 500 }}>Diferencia</span>
                  <span style={{ color: diffOk ? C.teal : '#F05252', fontSize: '1.2rem', fontWeight: 700 }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}€
                  </span>
                </div>
              );
            })()}

            {selected.cierre?.observaciones && (
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.br}` }}
              >
                <div style={{ color: C.t3, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                  Observaciones
                </div>
                <p style={{ color: C.t2, fontSize: '0.82rem', margin: 0 }}>{selected.cierre.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
