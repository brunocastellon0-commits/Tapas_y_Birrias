'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign, QrCode, CreditCard, Banknote, Calculator, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { C } from './tokens';

const DENOMINACIONES_EUR = [
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

interface CorteInput {
  denominacion: number;
  cantidad: number;
}

interface CajaPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CajaPanel({ isOpen, onClose }: CajaPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aperturaActiva, setAperturaActiva] = useState<any>(null);
  const [modo, setModo] = useState<'abrir' | 'cerrar'>('abrir');

  const [corte, setCorte] = useState<CorteInput[]>(
    DENOMINACIONES_EUR.map((d) => ({ denominacion: d.value, cantidad: 0 }))
  );
  const [montoQR, setMontoQR] = useState(0);
  const [montoTarjeta, setMontoTarjeta] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [ventasDia, setVentasDia] = useState({ efectivo: 0, qr: 0, tarjeta: 0 });
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSuccess(false);
    setLoading(true);
    setShowConfirm(false);
    setCorte(DENOMINACIONES_EUR.map((d) => ({ denominacion: d.value, cantidad: 0 })));
    setMontoQR(0);
    setMontoTarjeta(0);
    setObservaciones('');
    cargarEstado();
    cargarNombreUsuario();
  }, [isOpen]);

  async function cargarNombreUsuario() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, apellido')
      .eq('id', user.id)
      .single();
    if (usuario) {
      setNombreUsuario(`${usuario.nombre} ${usuario.apellido}`);
    }
  }

  async function cargarEstado() {
    const { data: apertura } = await supabase
      .from('aperturas_caja')
      .select('*')
      .eq('abierta', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (apertura) {
      setAperturaActiva(apertura);
      setModo('cerrar');
      setCorte(DENOMINACIONES_EUR.map((d) => ({ denominacion: d.value, cantidad: 0 })));

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data: pagos } = await supabase
        .from('pagos')
        .select('metodo, monto')
        .gte('created_at', hoy.toISOString());

      if (pagos) {
        setVentasDia({
          efectivo: pagos.filter((p) => p.metodo === 'efectivo').reduce((s, p) => s + Number(p.monto), 0),
          qr: pagos.filter((p) => p.metodo === 'qr').reduce((s, p) => s + Number(p.monto), 0),
          tarjeta: pagos.filter((p) => p.metodo === 'tarjeta').reduce((s, p) => s + Number(p.monto), 0),
        });
      }
    } else {
      setAperturaActiva(null);
      setModo('abrir');
    }

    setLoading(false);
  }

  function totalEfectivo() {
    return corte.reduce((s, c) => s + c.denominacion * c.cantidad, 0);
  }

  function totalGeneral() {
    return totalEfectivo() + montoQR + montoTarjeta;
  }

  async function handleAbrir() {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const total = totalEfectivo();

    const { error } = await supabase.from('aperturas_caja').insert({
      sucursal_id: 1,
      usuario_id: user.user?.id ?? '',
      monto_efectivo: total,
      monto_qr: 0,
      monto_tarjeta: 0,
      corte_efectivo: corte.filter((c) => c.cantidad > 0),
      abierta: true,
    });

    setSaving(false);
    if (error) {
      setErrorMsg('No se pudo abrir la caja. Intenta de nuevo.');
      return;
    }
    setSuccess(true);
    setTimeout(() => onClose(), 1500);
  }

  async function handleCerrar() {
    if (!aperturaActiva) return;
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const totalEf = totalEfectivo();
    const totalVentas = ventasDia.efectivo + ventasDia.qr + ventasDia.tarjeta;
    const diferencia = totalGeneral() - (aperturaActiva.monto_efectivo + totalVentas);

    const { error: insertError } = await supabase.from('cierres_caja').insert({
      apertura_id: aperturaActiva.id,
      usuario_id: user.user?.id ?? '',
      monto_efectivo: totalEf,
      monto_qr: montoQR,
      monto_tarjeta: montoTarjeta,
      corte_efectivo: corte.filter((c) => c.cantidad > 0),
      diferencia,
      observaciones: observaciones || null,
    });

    if (insertError) {
      setErrorMsg('No se pudo cerrar la caja. Intenta de nuevo.');
      setSaving(false);
      return;
    }

    await supabase.from('aperturas_caja').update({ abierta: false }).eq('id', aperturaActiva.id);

    setSaving(false);
    setSuccess(true);
    setTimeout(() => onClose(), 1500);
  }

  function actualizarCorte(idx: number, cantidad: number) {
    setCorte((prev) => prev.map((c, i) => (i === idx ? { ...c, cantidad: Math.max(0, cantidad) } : c)));
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => {
            const tieneDatos = corte.some(c => c.cantidad > 0) || montoQR > 0 || montoTarjeta > 0 || observaciones;
            if (tieneDatos) setShowConfirm(true);
            else onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1C1C28',
              border: `1px solid ${C.br}`,
              borderRadius: 18,
              width: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              fontFamily: C.sans,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: `1px solid ${C.br}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calculator size={18} color={C.goldLight} />
                <div>
                  <span style={{ fontFamily: C.serif, fontSize: 17, color: C.t1, fontWeight: 600 }}>
                    {modo === 'abrir' ? 'Abrir Caja' : 'Cerrar Caja'}
                  </span>
                  {nombreUsuario && (
                    <div style={{ fontSize: 11, color: C.t3, fontFamily: C.sans, marginTop: 1 }}>
                      Cajero: {nombreUsuario}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  const tieneDatos = corte.some(c => c.cantidad > 0) || montoQR > 0 || montoTarjeta > 0 || observaciones;
                  if (tieneDatos) setShowConfirm(true);
                  else onClose();
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}
              >
                <X size={16} />
              </button>
            </div>

            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  color: C.t3,
                  gap: 8,
                }}
              >
                <Loader2 size={16} className="animate-spin" /> Cargando...
              </div>
            ) : success ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 40,
                  gap: 12,
                }}
              >
                <CheckCircle size={40} color={C.teal} />
                <span style={{ color: C.t1, fontSize: 15, fontWeight: 600 }}>
                  {modo === 'abrir' ? 'Caja abierta correctamente' : 'Caja cerrada correctamente'}
                </span>
              </div>
            ) : (
              <div style={{ padding: '20px 24px' }}>
                {errorMsg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(240,82,82,0.1)', border: '1px solid rgba(240,82,82,0.3)', borderRadius: 12, marginBottom: 16, fontSize: 12, color: '#F05252' }}>
                    <AlertTriangle size={14} /> {errorMsg}
                  </div>
                )}
                {modo === 'cerrar' && aperturaActiva && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: C.tealDim,
                      border: `1px solid ${C.tealBorder}`,
                      borderRadius: 12,
                      marginBottom: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ fontSize: 11, color: C.tealLight, fontWeight: 600 }}>
                      Caja abierta el {new Date(aperturaActiva.created_at).toLocaleString('es-ES')}
                    </div>
                    <div style={{ fontSize: 12, color: C.t2 }}>
                      Efectivo inicial:{' '}
                      <strong style={{ color: C.t1 }}>{aperturaActiva.monto_efectivo}€</strong>
                    </div>
                    <div style={{ fontSize: 11, color: C.t3 }}>
                      Ventas del día — Efectivo: {ventasDia.efectivo}€ · QR: {ventasDia.qr}€ · Tarjeta:{' '}
                      {ventasDia.tarjeta}€
                    </div>
                  </div>
                )}

                {modo === 'abrir' && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: C.goldDim,
                      border: `1px solid ${C.goldBorder}`,
                      borderRadius: 12,
                      marginBottom: 16,
                      fontSize: 12,
                      color: C.t2,
                    }}
                  >
                    Ingresa el dinero inicial en caja. QR y Tarjeta comienzan en 0€.
                  </div>
                )}

                <div style={{ fontSize: 12, color: C.t3, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {modo === 'abrir' ? 'Efectivo inicial — Desglose' : 'Efectivo final — Desglose'}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    marginBottom: 16,
                  }}
                >
                  {corte.map((item, idx) => (
                    <div
                      key={item.denominacion}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        background: C.bg,
                        border: `1px solid ${C.br}`,
                        borderRadius: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 50,
                          fontSize: 12,
                          color: C.t2,
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        {item.denominacion >= 5
                          ? `${item.denominacion}€`
                          : `${item.denominacion.toFixed(2)}€`.replace('.', ',')}
                      </span>
                      <span style={{ fontSize: 11, color: C.t3 }}>×</span>
                      <input
                        type="number"
                        min={0}
                        value={item.cantidad}
                        onChange={(e) => actualizarCorte(idx, parseInt(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        className="hide-spin-buttons"
                        style={{
                          width: 40,
                          padding: '3px 6px',
                          background: C.bgCard,
                          border: `1px solid ${C.br2}`,
                          borderRadius: 6,
                          color: C.t1,
                          fontSize: 12,
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 11, color: C.t3, marginLeft: 'auto' }}>
                        = {(item.denominacion * item.cantidad).toFixed(2)}€
                      </span>
                    </div>
                  ))}
                </div>

                {modo === 'cerrar' && (
                  <>
                    <div style={{ fontSize: 12, color: C.t3, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Otros métodos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {[
                        { label: 'QR / Link', icon: QrCode, val: montoQR, setter: setMontoQR, color: '#A78BFA' },
                        { label: 'Tarjeta', icon: CreditCard, val: montoTarjeta, setter: setMontoTarjeta, color: '#38BDF8' },
                      ].map(({ label, icon: Icon, val, setter, color }) => (
                        <div
                          key={label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 12px',
                            background: C.bg,
                            border: `1px solid ${C.br}`,
                            borderRadius: 10,
                          }}
                        >
                          <Icon size={16} color={color} />
                          <span style={{ fontSize: 12, color: C.t2, width: 70 }}>{label}</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={val}
                            onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="hide-spin-buttons"
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              background: C.bgCard,
                              border: `1px solid ${C.br2}`,
                              borderRadius: 6,
                              color: C.t1,
                              fontSize: 12,
                              textAlign: 'right',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: 12, color: C.t3, width: 20 }}>€</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, color: C.t3, display: 'block', marginBottom: 4 }}>Observaciones</label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: C.bg,
                          border: `1px solid ${C.br}`,
                          borderRadius: 8,
                          color: C.t1,
                          fontSize: 12,
                          outline: 'none',
                          resize: 'none',
                          fontFamily: C.sans,
                        }}
                      />
                    </div>
                  </>
                )}

                <div
                  style={{
                    padding: '12px 16px',
                    background: C.bgCard2,
                    border: `1px solid ${C.br}`,
                    borderRadius: 12,
                    marginBottom: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>
                    <Banknote size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Total Efectivo
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: C.goldLight }}>
                    {totalEfectivo().toFixed(2)}€
                  </span>
                </div>

                {modo === 'cerrar' && aperturaActiva && (() => {
                  const diff = totalGeneral() - (aperturaActiva.monto_efectivo + ventasDia.efectivo + ventasDia.qr + ventasDia.tarjeta);
                  return (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: Math.abs(diff) > 1 ? 'rgba(240,82,82,0.1)' : C.tealDim,
                        border: `1px solid ${Math.abs(diff) > 1 ? 'rgba(240,82,82,0.3)' : C.tealBorder}`,
                        borderRadius: 12,
                        marginBottom: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>
                        Diferencia (real vs esperado)
                      </span>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: Math.abs(diff) > 1 ? '#F05252' : C.teal,
                        }}
                      >
                        {diff >= 0 ? '+' : ''}
                        {diff.toFixed(2)}€
                      </span>
                    </div>
                  );
                })()}

                <button
                  onClick={modo === 'abrir' ? handleAbrir : handleCerrar}
                  disabled={saving}
                  style={{
                    width: '100%',
                    height: 42,
                    borderRadius: 11,
                    background:
                      modo === 'abrir'
                        ? `linear-gradient(135deg, ${C.teal}, ${C.tealLight})`
                        : `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                    border: 'none',
                    color: '#0C0C16',
                    fontFamily: C.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Procesando...
                    </>
                  ) : modo === 'abrir' ? (
                    <>
                      <Banknote size={14} /> Abrir Caja
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} /> Cerrar Caja
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      <ConfirmDialog
        isOpen={showConfirm}
        onMantener={() => setShowConfirm(false)}
        onSalir={() => { setShowConfirm(false); onClose(); }}
      />
    </AnimatePresence>
  );
}
