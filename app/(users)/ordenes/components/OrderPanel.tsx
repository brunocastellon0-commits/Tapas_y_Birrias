'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react'; 
import {
    Plus, Minus, X, ChefHat, CreditCard, QrCode, Banknote,
    CheckSquare, Utensils, Package, Star, Receipt, StickyNote,
    ShoppingBag, Loader2, AlertTriangle, RefreshCw, Search,
} from 'lucide-react';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { C } from './tokens';

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────────

export interface Product {
    id: string | number;
    name: string;
    category: string;
    costo: string | number;
    medida: string;
    stock: number;
    activo?: boolean;
}

export interface OrderItem {
    id: string;
    id_producto: string | number;
    name: string;
    category: string;
    price: number;
    qty: number;
    image?: string;
    notes: string[];
}

export interface Order {
    id: string | number;
    stage: 'tomada' | 'en-cocina' | 'lista' | 'entregada';
    paymentMethod?: 'cash' | 'card' | 'qr';
    items: OrderItem[];
}

export interface Table {
    id: string | number;
    number: string | number;
    zone: string;
    server?: string;
    state: 'occupied' | 'available' | 'attention' | 'ready';
    chairs?: number;
    shape?: 'circle' | 'square' | 'rectangle';
}

export interface OrderPanelProps {
    table: Table | null;
    order: Order | null;
    productosDisponibles: Product[]; // ← Inyectado desde el componente padre (Server Component recomendado)
    onUpdateQty: (id: string, qty: number) => void;
    onSetPayment: (method: string) => void;
    onChangeStage?: (orderId: string | number, stage: string) => Promise<void>;
    onEnviarCocina?: (tableId: string | number, items: OrderItem[], cubiertos: number) => Promise<void>;
    onCobrar?: (tableId: string | number, orderId: string | number, total: number, paymentMethod: string) => Promise<void>;
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const STAGES = [
    { id: 'tomada', label: 'Tomada', icon: StickyNote },
    { id: 'en-cocina', label: 'En Cocina', icon: ChefHat },
    { id: 'lista', label: 'Lista', icon: Package },
    { id: 'entregada', label: 'Entregada', icon: Utensils },
];

const PAYMENT_OPTIONS = [
    { id: 'cash', label: 'Efectivo', icon: Banknote },
    { id: 'card', label: 'Tarjeta', icon: CreditCard },
    { id: 'qr', label: 'QR / Link', icon: QrCode },
];

function getSubtotal(order: Order): number {
    return order.items.reduce((s, i) => s + i.price * i.qty, 0);
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────────

export function OrderPanel({
    table,
    order,
    productosDisponibles = [],
    onUpdateQty,
    onSetPayment,
    onChangeStage,
    onEnviarCocina,
    onCobrar,
}: OrderPanelProps) {
    const [showProductModal, setShowProductModal] = useState<boolean>(false);
    const [showCobrarModal, setShowCobrarModal] = useState<boolean>(false);
    const [pendingItems, setPendingItems] = useState<OrderItem[]>([]);
    const [sending, setSending] = useState<boolean>(false);
    const [cobrandoSending, setCobrandoSending] = useState<boolean>(false);
    const [changingStage, setChangingStage] = useState<string | null>(null);
    const [cubiertos, setCubiertos] = useState<number>(2);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [hasLocalChanges, setHasLocalChanges] = useState<boolean>(false);
    const [busquedaProductos, setBusquedaProductos] = useState('');
    const [showConfirmProductModal, setShowConfirmProductModal] = useState(false);
    const [showConfirmCobrarModal, setShowConfirmCobrarModal] = useState(false);

    const productosFiltrados = useMemo(() => {
        if (!busquedaProductos.trim()) return productosDisponibles;
        const q = busquedaProductos.toLowerCase();
        return productosDisponibles.filter(p => p.name.toLowerCase().includes(q));
    }, [productosDisponibles, busquedaProductos]);

    const combinedItems = order ? [...order.items, ...pendingItems] : pendingItems;
    const subtotal = combinedItems.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal;
    const stageIndex = order ? STAGES.findIndex(s => s.id === order.stage) : -1;

    // Resetea los items pendientes si cambias de mesa
    useEffect(() => {
        setPendingItems([]);
        setHasLocalChanges(false);
    }, [table?.id]);

    function openProductModal() {
        setShowProductModal(true);
    }

    function handleIncrement(productId: string | number) {
        setHasLocalChanges(true);
        setPendingItems(prev => {
            const ex = prev.find(i => i.id_producto === productId);
            if (ex) return prev.map(i => i.id_producto === productId ? { ...i, qty: i.qty + 1 } : i);
            const prod = productosDisponibles.find(p => p.id === productId);
            if (!prod) return prev;
            return [...prev, {
                id: `new-${prod.id}`,
                id_producto: prod.id,
                name: prod.name,
                category: '',
                price: typeof prod.costo === 'string' ? parseFloat(prod.costo) : prod.costo,
                qty: 1,
                image: '',
                notes: []
            }];
        });
    }

    function handleDecrement(productId: string | number) {
        setHasLocalChanges(true);
        setPendingItems(prev => {
            const ex = prev.find(i => i.id_producto === productId);
            if (!ex) return prev;
            if (ex.qty <= 1) return prev.filter(i => i.id_producto !== productId);
            return prev.map(i => i.id_producto === productId ? { ...i, qty: i.qty - 1 } : i);
        });
    }

    function handleUpdateQtyLocal(itemId: string, qty: number) {
        setHasLocalChanges(true);
        if (itemId.startsWith('new-')) {
            const productId = itemId.replace('new-', '');
            if (qty <= 0) {
                setPendingItems(prev => prev.filter(i => i.id_producto !== productId));
            } else {
                setPendingItems(prev => prev.map(i => i.id_producto === productId ? { ...i, qty } : i));
            }
        } else {
            onUpdateQty(itemId, qty);
        }
    }

    function getPendingQty(productId: string | number): number {
        return pendingItems.find(i => i.id_producto === productId)?.qty ?? 0;
    }

    async function handleConfirmarPedido() {
        if (!table) return;
        if (combinedItems.length === 0) {
            setErrorMsg('Agrega al menos un producto.');
            return;
        }
        setSending(true);
        try {
            await onEnviarCocina?.(table.id, combinedItems, cubiertos);
            setPendingItems([]);
            setHasLocalChanges(false);
        } finally {
            setSending(false);
        }
    }

    function handleCobrar() {
        if (!table || !order) return;
        setShowCobrarModal(true);
    }

    async function handleCobrarConfirm() {
        if (!table || !order) return;
        setCobrandoSending(true);
        try {
            await onCobrar?.(table.id, order.id, total, order.paymentMethod || 'cash');
            setShowCobrarModal(false);
        } finally {
            setCobrandoSending(false);
        }
    }

    async function handleStageClick(stageId: string) {
        if (!order || !onChangeStage) return;
        setChangingStage(stageId);
        try {
            await onChangeStage(order.id, stageId);
        } finally {
            setChangingStage(null);
        }
    }

    if (!table) {
        return (
            <div style={{
                width: 370, minWidth: 370, background: C.bgCard, borderLeft: `1px solid ${C.br}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.t3, fontFamily: C.sans, fontSize: 13
            }}>
                Selecciona una mesa
            </div>
        );
    }

    const stateConfig = {
        occupied: { label: 'Ocupada', color: C.gold, bg: C.goldDim, border: C.goldBorder },
        available: { label: 'Libre', color: C.t3, bg: 'rgba(255,255,255,0.04)', border: C.br },
        attention: { label: '⚠ Atención', color: C.goldVibrant, bg: C.goldDim, border: C.goldBorderStrong },
        ready: { label: '✓ Lista', color: C.teal, bg: C.tealDim, border: C.tealBorder },
    }[table.state] || { label: 'Desconocido', color: C.t3, bg: 'rgba(255,255,255,0.04)', border: C.br };

    return (
        <div style={{
            width: 370, minWidth: 370, background: C.bgCard, borderLeft: `1px solid ${C.br}`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

            {/* ── Panel Header ─────────────────────────────────────────────────── */}
            <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.br}`, flexShrink: 0, background: `linear-gradient(180deg, ${C.bgCard2} 0%, ${C.bgCard} 100%)` }}>
                {errorMsg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(240,82,82,0.1)', border: '1px solid rgba(240,82,82,0.3)', borderRadius: 10, marginBottom: 10, fontSize: 11, color: '#F05252' }}>
                    <AlertTriangle size={12} /> {errorMsg}
                    <button onClick={() => setErrorMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#F05252', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h2 style={{ fontFamily: C.serif, fontSize: 19, fontWeight: 600, color: C.t1, margin: 0, letterSpacing: '-0.2px' }}>
                        Detalle de Comanda
                    </h2>
                    <div style={{
                        padding: '4px 10px', borderRadius: 20, background: stateConfig.bg, border: `1px solid ${stateConfig.border}`,
                        color: stateConfig.color, fontSize: 10, fontFamily: C.sans, fontWeight: 600, letterSpacing: 0.5,
                    }}>
                        {stateConfig.label}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.br}` }}>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.sans, letterSpacing: 0.5, marginBottom: 2 }}>MESA</div>
                        <div style={{ fontSize: 16, fontFamily: C.serif, fontWeight: 600, color: C.goldLight }}>Mesa {table.number}</div>
                    </div>
                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.br}` }}>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.sans, letterSpacing: 0.5, marginBottom: 2 }}>ZONA</div>
                        <div style={{ fontSize: 13, fontFamily: C.sans, fontWeight: 500, color: C.t2 }}>{table.zone}</div>
                    </div>
                    {table.server && (
                        <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.br}` }}>
                            <div style={{ fontSize: 9, color: C.t3, fontFamily: C.sans, letterSpacing: 0.5, marginBottom: 2 }}>MESERO</div>
                            <div style={{ fontSize: 11, fontFamily: C.sans, fontWeight: 500, color: C.t2 }}>{table.server}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Scrollable Body ───────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: `${C.br2} transparent` }}>

                {/* Order Stage Progress */}
                {order && (
                    <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${C.br}` }}>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.sans, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' }}>
                            Estado de Preparación
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            {STAGES.map((stage, idx) => {
                                const done = idx < stageIndex;
                                const active = idx === stageIndex;
                                const future = idx > stageIndex;
                                const StageIcon = stage.icon;
                                const canClick = future && !!onChangeStage && changingStage !== stage.id;
                                const isLoading = changingStage === stage.id;
                                return (
                                    <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flex: idx < STAGES.length - 1 ? 1 : 'unset' }}>
                                        <div
                                            onClick={() => canClick && handleStageClick(stage.id)}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: canClick ? 'pointer' : 'default' }}
                                        >
                                            <motion.div
                                                animate={active ? { scale: [1, 1.12, 1] } : {}}
                                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                                style={{
                                                    width: 30, height: 30, borderRadius: '50%',
                                                    background: done ? `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)` : active ? C.goldDim : 'rgba(255,255,255,0.04)',
                                                    border: done ? 'none' : active ? `2px solid ${C.gold}` : future ? `1px solid ${C.goldBorder}` : `1px solid ${C.br}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: active ? `0 0 12px ${C.goldGlow}` : future ? `0 0 6px ${C.goldGlow}` : 'none',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {isLoading ? (
                                                    <Loader2 size={12} color={C.t2} className="animate-spin" />
                                                ) : (
                                                    <StageIcon size={14} color={done ? '#0E0E18' : active ? C.goldLight : C.t3} strokeWidth={done ? 2.5 : 2} />
                                                )}
                                            </motion.div>
                                            <span style={{ fontSize: 8, fontFamily: C.sans, whiteSpace: 'nowrap', color: done ? C.goldLight : active ? C.gold : C.t3, fontWeight: done || active ? 600 : 400 }}>
                                                {stage.label}
                                            </span>
                                        </div>
                                        {idx < STAGES.length - 1 && (
                                            <div style={{ flex: 1, height: 1.5, marginBottom: 14, background: done ? `linear-gradient(90deg, ${C.gold}, ${C.goldBorder})` : C.br, borderRadius: 2 }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Product Modal */}
                <AnimatePresence>
                    {showProductModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => {
                                if (pendingItems.length > 0) setShowConfirmProductModal(true);
                                else setShowProductModal(false);
                            }}>
                            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                style={{ background: '#1C1C21', border: `1px solid ${C.br}`, borderRadius: 18, padding: 24, width: 420, maxHeight: '70vh', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <span style={{ fontFamily: C.serif, fontSize: 17, color: C.t1, fontWeight: 600 }}>Menú — Agregar Producto</span>
                                    <button onClick={() => {
                                        const tieneItems = pendingItems.length > 0;
                                        if (tieneItems) setShowConfirmProductModal(true);
                                        else setShowProductModal(false);
                                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}><X size={16} /></button>
                                </div>

                                <div style={{ position: 'relative', marginBottom: 12 }}>
                                    <Search size={14} color={C.t3} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={busquedaProductos}
                                        onChange={(e) => setBusquedaProductos(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px 8px 32px',
                                            background: C.bg,
                                            border: `1px solid ${C.br}`,
                                            borderRadius: 10,
                                            color: C.t1,
                                            fontSize: 12,
                                            outline: 'none',
                                            fontFamily: C.sans,
                                        }}
                                    />
                                    {busquedaProductos && (
                                        <button onClick={() => setBusquedaProductos('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}><X size={13} /></button>
                                    )}
                                </div>
                                
                                {productosDisponibles.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: C.t3, padding: 24, fontSize: 12 }}>No hay productos disponibles en este momento.</div>
                                ) : productosFiltrados.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: C.t3, padding: 24, fontSize: 12 }}>No se encontraron productos con esa búsqueda.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {productosFiltrados.map(p => {
                                            const qty = getPendingQty(p.id);
                                            return (
                                                <div key={p.id}
                                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bg, border: `1px solid ${qty > 0 ? C.goldBorder : C.br}`, borderRadius: 12, color: C.t1, fontFamily: C.sans, textAlign: 'left' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                                                        <div style={{ fontSize: 10, color: C.t3 }}>{p.medida} · ${parseFloat(p.costo.toString()).toLocaleString()}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <button onClick={() => handleDecrement(p.id)}
                                                            style={{ width: 26, height: 26, borderRadius: 6, background: C.bg, border: `1px solid ${C.br2}`, color: C.t2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                                                            <Minus size={11} strokeWidth={2.5} />
                                                        </button>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: C.goldLight, minWidth: 22, textAlign: 'center' }}>{qty}</span>
                                                        <button onClick={() => handleIncrement(p.id)}
                                                            style={{ width: 26, height: 26, borderRadius: 6, background: C.goldDim, border: `1px solid ${C.goldBorder}`, color: C.goldLight, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                                                            <Plus size={11} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <button onClick={() => { setHasLocalChanges(true); setBusquedaProductos(''); setShowProductModal(false); }}
                                    style={{ marginTop: 16, width: '100%', height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', color: '#0C0C16', fontWeight: 700, fontFamily: C.sans, fontSize: 12, cursor: 'pointer' }}>
                                    OK — {pendingItems.reduce((s, i) => s + i.qty, 0)} productos
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Cobrar Modal */}
                <AnimatePresence>
                    {showCobrarModal && order && table && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => {
                                if (!cobrandoSending) {
                                    if (order && order.items.length > 0) setShowConfirmCobrarModal(true);
                                    else setShowCobrarModal(false);
                                }
                            }}>
                            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                style={{ background: '#1C1C21', border: `1px solid ${C.br}`, borderRadius: 18, padding: 24, width: 440, maxHeight: '80vh', overflowY: 'auto' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <span style={{ fontFamily: C.serif, fontSize: 17, color: C.t1, fontWeight: 600 }}>Confirmar Cobro</span>
                                    <button onClick={() => { if (!cobrandoSending) setShowCobrarModal(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3 }}><X size={16} /></button>
                                </div>

                                {/* Mesa info */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.br}` }}>
                                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.sans, letterSpacing: 0.5, marginBottom: 2 }}>MESA</div>
                                        <div style={{ fontSize: 15, fontFamily: C.serif, fontWeight: 600, color: C.goldLight }}>Mesa {table.number}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.br}` }}>
                                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.sans, letterSpacing: 0.5, marginBottom: 2 }}>ZONA</div>
                                        <div style={{ fontSize: 13, fontFamily: C.sans, fontWeight: 500, color: C.t2 }}>{table.zone}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.br}` }}>
                                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.sans, letterSpacing: 0.5, marginBottom: 2 }}>MÉTODO</div>
                                        <div style={{ fontSize: 12, fontFamily: C.sans, fontWeight: 600, color: C.goldLight, textTransform: 'capitalize' }}>
                                            {order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'card' ? 'Tarjeta' : order.paymentMethod === 'qr' ? 'QR' : 'Sin definir'}
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, color: C.t3, fontFamily: C.sans, letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>Artículos</div>
                                    {combinedItems.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.br}` }}>
                                            <div style={{ display: 'flex', gap: 6, fontSize: 11, color: C.t1, fontFamily: C.sans }}>
                                                <span style={{ color: C.goldLight, fontWeight: 600 }}>{item.qty}x</span>
                                                <span>{item.name}</span>
                                            </div>
                                            <span style={{ fontSize: 11, fontFamily: C.sans, fontWeight: 600, color: C.t1 }}>${(item.price * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div style={{ borderTop: `1px solid ${C.br}`, paddingTop: 10, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: C.sans, color: C.t3, marginBottom: 4 }}>
                                        <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                                        <span style={{ fontFamily: C.serif, fontSize: 15, fontWeight: 600, color: C.t1 }}>Total</span>
                                        <span style={{ fontFamily: C.serif, fontSize: 24, fontWeight: 700, color: C.goldLight }}>${total.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setShowCobrarModal(false)} disabled={cobrandoSending}
                                        style={{ flex: 1, height: 40, borderRadius: 10, background: C.bg, border: `1px solid ${C.br}`, color: C.t2, fontFamily: C.sans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleCobrarConfirm} disabled={cobrandoSending || !order.paymentMethod}
                                        style={{ flex: 1, height: 40, borderRadius: 10, background: !order.paymentMethod ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`, border: 'none', color: !order.paymentMethod ? C.t3 : '#0C0C16', fontFamily: C.sans, fontSize: 12, fontWeight: 700, cursor: !order.paymentMethod ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        {cobrandoSending ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} strokeWidth={2} />}
                                        {cobrandoSending ? 'Procesando...' : `Cobrar $${total.toLocaleString()}`}
                                    </button>
                                </div>
                                {!order.paymentMethod && (
                                    <div style={{ marginTop: 8, fontSize: 10, color: '#F05252', fontFamily: C.sans, textAlign: 'center' }}>Selecciona un método de pago antes de cobrar</div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Order Items ────────────────────────────────────────────────── */}
                <div style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, color: C.t3, fontFamily: C.sans, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                            Artículos ({combinedItems.reduce((s, i) => s + i.qty, 0)})
                        </span>
                        <button onClick={openProductModal} style={{ fontSize: 10, color: C.gold, fontFamily: C.sans, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Plus size={11} strokeWidth={2.5} /> Agregar
                        </button>
                    </div>

                    {combinedItems.length === 0 ? (
                        <div style={{ padding: '28px 0', textAlign: 'center', color: C.t3, fontSize: 12, fontFamily: C.sans }}>
                            <Receipt size={28} color={C.t3} strokeWidth={1} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.35 }} />
                            {order ? 'Comanda abierta — agrega productos' : 'Mesa disponible — sin comanda activa'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <AnimatePresence>
                                {combinedItems.map(item => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ display: 'flex', gap: 10, padding: '10px', background: C.bgCard2, border: `1px solid ${C.br}`, borderRadius: 14 }}
                                    >
                                        {/* Product Image: Nota: Usa next/image si tienes los dominios configurados */}
                                        <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: 'hidden', border: `1px solid ${C.br}` }}>
                                            <img src={item.image || '/placeholder-image.jpg'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>

                                        {/* Details */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                                                <div>
                                                    <div style={{ fontSize: 12, fontFamily: C.sans, fontWeight: 600, color: C.t1, marginBottom: 1 }}>{item.name}</div>
                                                    <div style={{ fontSize: 9, fontFamily: C.sans, color: C.t3, letterSpacing: 0.4 }}>{item.category}</div>
                                                </div>
                                                <div style={{ fontSize: 13, fontFamily: C.sans, fontWeight: 700, color: C.goldLight, flexShrink: 0 }}>
                                                    ${(item.price * item.qty).toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Note Tags */}
                                            {item.notes && item.notes.length > 0 && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '5px 0 4px' }}>
                                                    {item.notes.map(note => (
                                                        <span key={note} style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.br2}`, fontSize: 9, fontFamily: C.sans, color: C.t2 }}>
                                                            {note}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Qty Controls */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                                <button onClick={() => {
                                                    if (item.id.startsWith('new-')) handleDecrement(item.id_producto);
                                                    else handleUpdateQtyLocal(item.id, item.qty - 1);
                                                }} style={{ width: 22, height: 22, borderRadius: 6, background: C.bg, border: `1px solid ${C.br2}`, color: C.t2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                                                    <Minus size={10} strokeWidth={2.5} />
                                                </button>
                                                <span style={{ fontSize: 13, fontFamily: C.sans, fontWeight: 700, color: C.t1, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                                                <button onClick={() => {
                                                    if (item.id.startsWith('new-')) handleIncrement(item.id_producto);
                                                    else handleUpdateQtyLocal(item.id, item.qty + 1);
                                                }} style={{ width: 22, height: 22, borderRadius: 6, background: C.goldDim, border: `1px solid ${C.goldBorder}`, color: C.goldLight, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                                                    <Plus size={10} strokeWidth={2.5} />
                                                </button>
                                                <span style={{ fontSize: 10, color: C.t3, fontFamily: C.sans, marginLeft: 'auto' }}>${item.price.toLocaleString()} c/u</span>
                                                <button onClick={() => {
                                                    if (item.id.startsWith('new-')) {
                                                        setPendingItems(prev => prev.filter(i => i.id_producto !== item.id_producto));
                                                    } else {
                                                        handleUpdateQtyLocal(item.id, 0);
                                                    }
                                                }} style={{ width: 20, height: 20, borderRadius: 5, background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <X size={11} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* ── Payment & Total ────────────────────────────────────────────── */}
                {combinedItems.length > 0 && (
                    <div style={{ margin: '0 20px 16px', padding: '14px', background: `linear-gradient(160deg, #1C1C28 0%, ${C.bgCard2} 100%)`, border: `1px solid ${C.br}`, borderRadius: 14 }}>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.sans, letterSpacing: 0.6, marginBottom: 12, textTransform: 'uppercase' }}>
                            Resumen & Pago
                        </div>

                        {/* Breakdown */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: C.sans, color: C.t3, marginBottom: 5 }}>
                            <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                        </div>

                        <div style={{ height: 1, background: C.br, margin: '8px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                            <span style={{ fontFamily: C.serif, fontSize: 14, fontWeight: 600, color: C.t1 }}>Total</span>
                            <span style={{ fontFamily: C.serif, fontSize: 22, fontWeight: 700, color: C.goldLight, textShadow: `0 0 20px ${C.goldGlow}` }}>
                                ${total.toLocaleString()}
                            </span>
                        </div>

                        {/* Payment Method Selectors — only when comanda exists */}
                        {order && (
                            <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
                                {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => {
                                    const sel = order.paymentMethod === id;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => onSetPayment(id)}
                                            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, background: sel ? C.goldDim : C.bg, border: `1.5px solid ${sel ? C.goldBorder : C.br}`, color: sel ? C.goldLight : C.t3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', outline: 'none', transition: 'all 0.15s' }}
                                        >
                                            <Icon size={15} strokeWidth={sel ? 2 : 1.7} />
                                            <span style={{ fontSize: 9, fontFamily: C.sans, fontWeight: sel ? 600 : 400, letterSpacing: 0.3 }}>{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(!order || hasLocalChanges || pendingItems.length > 0) ? (
                                <button onClick={handleConfirmarPedido} disabled={sending || combinedItems.length === 0}
                                    style={{ width: '100%', height: 42, borderRadius: 11, background: combinedItems.length === 0 ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`, border: 'none', color: combinedItems.length === 0 ? C.t3 : '#0C0C16', fontFamily: C.sans, fontSize: 12, fontWeight: 700, cursor: combinedItems.length === 0 ? 'default' : 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: combinedItems.length > 0 ? `0 4px 20px ${C.goldGlow}` : 'none', letterSpacing: 0.3 }}>
                                    {sending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
                                    {sending ? 'Procesando...' : 'Confirmar Pedido'}
                                </button>
                            ) : (
                                <button onClick={handleCobrar} disabled={cobrandoSending || combinedItems.length === 0}
                                    style={{ width: '100%', height: 42, borderRadius: 11, background: combinedItems.length === 0 ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${C.gold} 0%, ${C.goldLight} 100%)`, border: 'none', color: combinedItems.length === 0 ? C.t3 : '#0C0C16', fontFamily: C.sans, fontSize: 12, fontWeight: 700, cursor: combinedItems.length === 0 ? 'default' : 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: combinedItems.length > 0 ? `0 4px 20px ${C.goldGlow}` : 'none', letterSpacing: 0.3 }}>
                                    {cobrandoSending ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} strokeWidth={2} />}
                                    {cobrandoSending ? 'Procesando...' : 'Cerrar Comanda y Cobrar'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Table Info Footer ──────────────────────────────────────────── */}
                {order && (
                    <div style={{ margin: '0 20px 20px', padding: '10px 14px', background: C.bgCard2, border: `1px solid ${C.br}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Star size={13} color={C.gold} fill={C.gold} />
                        <span style={{ fontSize: 10, fontFamily: C.sans, color: C.t2, flex: 1 }}>
                            Mesa {table.number} · {table.chairs} sillas · {table.shape === 'circle' ? 'Redonda' : 'Cuadrada'}
                        </span>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <div key={s} style={{ width: 14, height: 14, borderRadius: 3, background: s <= 4 ? C.goldDim : 'rgba(255,255,255,0.04)', border: `1px solid ${s <= 4 ? C.goldBorder : C.br}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: s <= 4 ? C.gold : C.t3 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showConfirmProductModal}
                title="¿Cancelar selección?"
                message="Los productos seleccionados se perderán."
                onMantener={() => setShowConfirmProductModal(false)}
                onSalir={() => { setShowConfirmProductModal(false); setShowProductModal(false); }}
            />
            <ConfirmDialog
                isOpen={showConfirmCobrarModal}
                title="¿Cancelar cobro?"
                message="Se cancelará el proceso de cobro."
                onMantener={() => setShowConfirmCobrarModal(false)}
                onSalir={() => { setShowConfirmCobrarModal(false); setShowCobrarModal(false); }}
            />
        </div>
    );
}