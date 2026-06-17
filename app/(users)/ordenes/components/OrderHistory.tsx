'use client';

import { useState, useMemo } from 'react';
import {
    Search, Calendar, X, ChevronDown, CreditCard,
    Banknote, QrCode, CheckCircle2, XCircle, Clock, ChevronRight,
    User, Hash, Receipt, Percent, Minus, LucideIcon
} from 'lucide-react';
import { C } from './tokens'; // ← Consumiendo los tokens globales

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────────

export type PaymentMethod = 'qr' | 'efectivo' | 'tarjeta';
export type OrderStatus = 'pagado' | 'anulado' | 'en_proceso';

export interface OrderItem {
    name: string;
    qty: number;
    price: number;
}

export interface Order {
    id: string;
    tableNumber: string | number;
    date: string;
    time: string;
    waiter: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    covers: number;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
}

export interface OrdersHistoryProps {
    orders?: Order[]; // Datos inyectados por el componente padre
    onReprintTicket?: (orderId: string) => void;
    onRegisterPayment?: (orderId: string) => void;
}

// ─── CONFIGURATION ──────────────────────────────────────────────────────────────

const payIcons: Record<PaymentMethod, LucideIcon> = {
    qr: QrCode,
    efectivo: Banknote,
    tarjeta: CreditCard,
};

const payLabel: Record<PaymentMethod, string> = {
    qr: 'QR',
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
};

const payColor: Record<PaymentMethod, string> = {
    qr: '#A78BFA',
    efectivo: '#4ADE80',
    tarjeta: '#38BDF8',
};

interface StatusConfig {
    color: string;
    bg: string;
    border: string;
    label: string;
    Icon: LucideIcon;
}

const statusConfig: Record<OrderStatus, StatusConfig> = {
    pagado: { color: '#2DD4BF', bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.25)', label: 'Pagado', Icon: CheckCircle2 },
    anulado: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: 'Anulado', Icon: XCircle },
    en_proceso: { color: C.gold, bg: C.goldDim, border: C.goldBorder, label: 'En Proceso', Icon: Clock },
};

const CARD: React.CSSProperties = {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.br}`,
    borderRadius: '16px',
    boxShadow: `0 0 0 1px ${C.goldDim}, 0 8px 28px rgba(0,0,0,0.4)`,
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────────

export function OrdersHistory({ 
    orders = [], 
    onReprintTicket, 
    onRegisterPayment 
}: OrdersHistoryProps) {
    
    // Filters State
    const [search, setSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todos'>('todos');
    const [payFilter, setPayFilter] = useState<PaymentMethod | 'todos'>('todos');
    const [dateFilter, setDateFilter] = useState<'hoy' | 'semana' | 'mes'>('hoy');
    const [waiterFilter, setWaiterFilter] = useState<string>('Todos');
    
    // UI State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [waiterDropOpen, setWaiterDropOpen] = useState<boolean>(false);

    // Derived Data
    const dynamicWaiters = useMemo(() => {
        const set = new Set(orders.map(o => o.waiter));
        return ['Todos', ...Array.from(set)];
    }, [orders]);

    const filtered = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        
        return orders.filter((o) => {
            if (statusFilter !== 'todos' && o.status !== statusFilter) return false;
            if (payFilter !== 'todos' && o.paymentMethod !== payFilter) return false;
            if (waiterFilter !== 'Todos' && o.waiter !== waiterFilter) return false;
            
            // Nota: Lógica simple de fecha, en un sistema real 'semana' y 'mes' requerirían parsing de fechas
            if (dateFilter === 'hoy' && !o.date.startsWith(todayStr)) return false;
            
            if (search) {
                const s = search.toLowerCase();
                if (!o.id.toLowerCase().includes(s) &&
                    !o.waiter.toLowerCase().includes(s) &&
                    !`mesa ${o.tableNumber}`.toLowerCase().includes(s)) {
                    return false;
                }
            }
            return true;
        });
    }, [orders, statusFilter, payFilter, waiterFilter, dateFilter, search]);

    const totalRevenue = filtered.filter(o => o.status === 'pagado').reduce((s, o) => s + o.total, 0);

    return (
        <div className="flex" style={{ fontFamily: C.sans, alignItems: 'flex-start' }}>
            {/* ── Main content ───────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 style={{ fontFamily: C.serif, color: C.t1, fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.2 }}>
                            Historial de Pedidos
                        </h1>
                        <p style={{ color: C.t3, fontSize: '0.82rem', marginTop: '4px' }}>
                            {filtered.length} pedidos · Recaudado: <span style={{ color: C.gold, fontWeight: 600 }}>${totalRevenue.toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                {/* Filters card */}
                <div className="p-4" style={CARD}>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4A4A5A' }} />
                            <input
                                type="text"
                                placeholder="Buscar pedido, mesa, mesero..."
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

                        {/* Date filter */}
                        <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {(['hoy', 'semana', 'mes'] as const).map((d) => (
                                <button key={d} onClick={() => setDateFilter(d)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 capitalize"
                                    style={{
                                        backgroundColor: dateFilter === d ? C.goldDim : 'transparent',
                                        color: dateFilter === d ? C.gold : C.t3,
                                        border: dateFilter === d ? `1px solid ${C.goldBorder}` : '1px solid transparent',
                                        fontSize: '0.78rem',
                                        fontWeight: dateFilter === d ? 600 : 400,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Calendar className="w-3 h-3" />
                                    {d === 'hoy' ? 'Hoy' : d === 'semana' ? 'Semana' : 'Mes'}
                                </button>
                            ))}
                        </div>

                        {/* Status filter */}
                        <div className="flex items-center gap-1.5">
                            {(['todos', 'pagado', 'en_proceso', 'anulado'] as const).map((s) => {
                                const cfg = s !== 'todos' ? statusConfig[s] : null;
                                const isActive = statusFilter === s;
                                return (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className="px-3 py-1.5 rounded-lg transition-all duration-200"
                                        style={{
                                            backgroundColor: isActive ? (cfg ? cfg.bg : 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.03)',
                                            border: isActive ? `1px solid ${cfg ? cfg.border : 'rgba(255,255,255,0.15)'}` : '1px solid rgba(255,255,255,0.06)',
                                            color: isActive ? (cfg ? cfg.color : C.t1) : C.t3,
                                            fontSize: '0.75rem',
                                            fontWeight: isActive ? 600 : 400,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {s === 'todos' ? 'Todos' : cfg?.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Payment method filter */}
                        <div className="flex items-center gap-1.5">
                            {(['todos', 'qr', 'efectivo', 'tarjeta'] as const).map((pm) => {
                                const isActive = payFilter === pm;
                                const PMIcon = pm !== 'todos' ? payIcons[pm as PaymentMethod] : null;
                                const pmColor = pm !== 'todos' ? payColor[pm as PaymentMethod] : '#8B8B99';
                                return (
                                    <button key={pm} onClick={() => setPayFilter(pm)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
                                        style={{
                                            backgroundColor: isActive ? `${pmColor}15` : 'rgba(255,255,255,0.03)',
                                            border: isActive ? `1px solid ${pmColor}30` : '1px solid rgba(255,255,255,0.06)',
                                            color: isActive ? pmColor : C.t3,
                                            fontSize: '0.75rem',
                                            fontWeight: isActive ? 600 : 400,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {PMIcon && <PMIcon className="w-3 h-3" />}
                                        {pm === 'todos' ? 'Todo método' : payLabel[pm as PaymentMethod]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Waiter filter */}
                        <div className="relative">
                            <button
                                onClick={() => setWaiterDropOpen(!waiterDropOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200"
                                style={{
                                    backgroundColor: waiterFilter !== 'Todos' ? C.tealDim : 'rgba(255,255,255,0.03)',
                                    border: waiterFilter !== 'Todos' ? `1px solid ${C.tealBorder}` : '1px solid rgba(255,255,255,0.06)',
                                    color: waiterFilter !== 'Todos' ? C.teal : C.t3,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <User className="w-3 h-3" />
                                {waiterFilter !== 'Todos' ? waiterFilter : 'Mesero'}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {waiterDropOpen && (
                                <div
                                    className="absolute left-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden z-50"
                                    style={{ backgroundColor: C.bgCard2, border: `1px solid ${C.br}`, boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}
                                >
                                    {dynamicWaiters.map((w) => (
                                        <button
                                            key={w}
                                            onClick={() => { setWaiterFilter(w); setWaiterDropOpen(false); }}
                                            className="w-full text-left px-3 py-2 transition-all duration-150 hover:bg-white/5"
                                            style={{
                                                color: waiterFilter === w ? C.teal : C.t3,
                                                fontSize: '0.8rem',
                                                fontWeight: waiterFilter === w ? 500 : 400,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {w}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Clear filters */}
                        {(statusFilter !== 'todos' || payFilter !== 'todos' || waiterFilter !== 'Todos' || search) && (
                            <button
                                onClick={() => { setStatusFilter('todos'); setPayFilter('todos'); setWaiterFilter('Todos'); setSearch(''); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                style={{ color: C.t3, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                                <X className="w-3 h-3" />
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Orders list */}
                <div className="space-y-2">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <Receipt className="w-6 h-6" style={{ color: '#3A3A4A' }} />
                            </div>
                            <p style={{ color: C.t3, fontSize: '0.88rem' }}>No se encontraron pedidos</p>
                        </div>
                    ) : (
                        filtered.map((order) => {
                            const sc = statusConfig[order.status];
                            const StatusIcon = sc.Icon;
                            const PayIcon = payIcons[order.paymentMethod];
                            const pColor = payColor[order.paymentMethod];
                            const isSelected = selectedOrder?.id === order.id;

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(isSelected ? null : order)}
                                    className="flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200"
                                    style={{
                                        backgroundColor: isSelected ? C.bgCard2 : C.bgCard,
                                        border: isSelected ? `1px solid ${C.goldBorder}` : `1px solid ${C.br}`,
                                        boxShadow: isSelected ? `0 0 0 1px rgba(212,175,55,0.06), 0 4px 20px rgba(0,0,0,0.4)` : 'none',
                                    }}
                                >
                                    {/* ID */}
                                    <div style={{ color: C.gold, fontSize: '0.85rem', fontWeight: 700, width: '60px', flexShrink: 0 }}>
                                        {order.id}
                                    </div>

                                    {/* Table */}
                                    <div style={{ color: C.t2, fontSize: '0.85rem', width: '66px', flexShrink: 0 }}>
                                        Mesa {order.tableNumber}
                                    </div>

                                    {/* Date & Time */}
                                    <div style={{ width: '110px', flexShrink: 0 }}>
                                        <div style={{ color: C.t2, fontSize: '0.8rem' }}>{order.date}</div>
                                        <div style={{ color: C.t3, fontSize: '0.72rem' }}>{order.time}</div>
                                    </div>

                                    {/* Waiter */}
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                                            style={{ background: C.tealDim, color: C.teal, border: `1px solid ${C.tealBorder}`, fontSize: '0.55rem' }}
                                        >
                                            {order.waiter.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <span style={{ color: C.t3, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {order.waiter}
                                        </span>
                                    </div>

                                    {/* Payment method */}
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                                        style={{ backgroundColor: `${pColor}12`, border: `1px solid ${pColor}25` }}
                                    >
                                        <PayIcon className="w-3 h-3" style={{ color: pColor }} />
                                        <span style={{ color: pColor, fontSize: '0.72rem', fontWeight: 500 }}>
                                            {payLabel[order.paymentMethod]}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                                        style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}
                                    >
                                        <StatusIcon className="w-3 h-3" style={{ color: sc.color }} />
                                        <span style={{ color: sc.color, fontSize: '0.72rem', fontWeight: 600 }}>
                                            {sc.label}
                                        </span>
                                    </div>

                                    {/* Items count */}
                                    <div style={{ color: C.t3, fontSize: '0.78rem', width: '52px', textAlign: 'right', flexShrink: 0 }}>
                                        {order.items.length} ítems
                                    </div>

                                    {/* Total */}
                                    <div style={{ color: C.t1, fontSize: '0.92rem', fontWeight: 700, width: '72px', textAlign: 'right', flexShrink: 0 }}>
                                        ${order.total.toLocaleString()}
                                    </div>

                                    {/* Chevron */}
                                    <ChevronRight
                                        className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                                        style={{ color: isSelected ? C.gold : '#3A3A4A', transform: isSelected ? 'rotate(90deg)' : 'none' }}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Detail Panel ───────────────────────────────────────────────── */}
            {selectedOrder && (
                <div
                    className="flex-shrink-0 overflow-y-auto"
                    style={{
                        width: '380px',
                        position: 'sticky',
                        top: 0,
                        maxHeight: 'calc(100vh - 57px)',
                        backgroundColor: C.bgCard,
                        borderLeft: `1px solid ${C.br}`,
                        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
                    }}
                >
                    {/* Panel header */}
                    <div
                        className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
                        style={{
                            backgroundColor: C.bgCard,
                            borderBottom: `1px solid ${C.br}`,
                        }}
                    >
                        <div>
                            <div style={{ fontFamily: C.serif, color: C.t1, fontSize: '1.05rem', fontWeight: 600 }}>
                                Detalle del Pedido
                            </div>
                            <div style={{ color: C.t3, fontSize: '0.75rem', marginTop: '1px' }}>
                                {selectedOrder.id} · Mesa {selectedOrder.tableNumber}
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                            style={{ color: C.t3, cursor: 'pointer', border: 'none', background: 'transparent' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        {/* Order meta */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Fecha', value: `${selectedOrder.date} ${selectedOrder.time}`, icon: Calendar },
                                { label: 'Mesero', value: selectedOrder.waiter, icon: User },
                                { label: 'Cubiertos', value: `${selectedOrder.covers} personas`, icon: Hash },
                                { label: 'Método de Pago', value: payLabel[selectedOrder.paymentMethod], icon: payIcons[selectedOrder.paymentMethod] },
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
                                    <div style={{ color: C.t2, fontSize: '0.82rem', fontWeight: 500 }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Status badge */}
                        {(() => {
                            const sc = statusConfig[selectedOrder.status];
                            const SI = sc.Icon;
                            return (
                                <div
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl"
                                    style={{ backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}
                                >
                                    <SI className="w-4 h-4" style={{ color: sc.color }} />
                                    <span style={{ color: sc.color, fontSize: '0.85rem', fontWeight: 600 }}>
                                        Estado: {sc.label}
                                    </span>
                                </div>
                            );
                        })()}

                        {/* Items list */}
                        <div>
                            <div style={{ color: C.t3, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '10px' }}>
                                Ítems del Pedido
                            </div>
                            <div className="space-y-1.5">
                                {selectedOrder.items.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between px-3 py-2 rounded-xl"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                                    >
                                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                            <span
                                                className="px-1.5 py-0.5 rounded-md flex-shrink-0"
                                                style={{ backgroundColor: C.goldDim, color: C.gold, fontSize: '0.65rem', fontWeight: 700 }}
                                            >
                                                ×{item.qty}
                                            </span>
                                            <span style={{ color: C.t2, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <span style={{ color: C.t3, fontSize: '0.82rem', flexShrink: 0, marginLeft: '8px' }}>
                                            ${(item.price * item.qty).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals breakdown */}
                        <div
                            className="rounded-xl overflow-hidden"
                            style={{ border: `1px solid ${C.br2}` }}
                        >
                            <div style={{ borderBottom: `1px solid ${C.br}`, padding: '0' }}>
                                {[
                                    { label: 'Subtotal', value: selectedOrder.subtotal, icon: Receipt, muted: false },
                                    { label: 'IVA (10.5%)', value: selectedOrder.tax, icon: Percent, muted: true },
                                    ...(selectedOrder.discount > 0
                                        ? [{ label: 'Descuento aplicado', value: -selectedOrder.discount, icon: Minus, muted: true }]
                                        : []),
                                ].map(({ label, value, icon: Icon, muted }, idx, arr) => (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between px-4 py-2.5"
                                        style={{
                                            borderBottom: idx < arr.length - 1 ? `1px solid ${C.br}` : 'none',
                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-3.5 h-3.5" style={{ color: C.t3 }} />
                                            <span style={{ color: muted ? C.t3 : C.t2, fontSize: '0.8rem' }}>{label}</span>
                                        </div>
                                        <span style={{ color: value < 0 ? C.teal : (muted ? C.t3 : C.t2), fontSize: '0.85rem' }}>
                                            {value < 0 ? '-' : ''}${Math.abs(value).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {/* Total */}
                            <div
                                className="flex items-center justify-between px-4 py-3.5"
                                style={{ backgroundColor: C.goldDim, borderTop: `1px solid ${C.goldBorder}` }}
                            >
                                <span style={{ color: C.t1, fontSize: '0.88rem', fontWeight: 600 }}>Total Final</span>
                                <span style={{ fontFamily: C.serif, color: C.gold, fontSize: '1.3rem', fontWeight: 700 }}>
                                    ${selectedOrder.total.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        {selectedOrder.status !== 'anulado' && (
                            <div className="flex gap-2 pb-2">
                                <button
                                    onClick={() => onReprintTicket?.(selectedOrder.id)}
                                    className="flex-1 py-2.5 rounded-xl transition-all duration-200 hover:opacity-85"
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${C.br2}`,
                                        color: C.t2,
                                        fontSize: '0.78rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Reimprimir Ticket
                                </button>
                                {selectedOrder.status === 'en_proceso' && (
                                    <button
                                        onClick={() => onRegisterPayment?.(selectedOrder.id)}
                                        className="flex-1 py-2.5 rounded-xl transition-all duration-200 hover:opacity-85"
                                        style={{
                                            background: `linear-gradient(135deg, ${C.teal} 0%, #0F766E 100%)`,
                                            color: '#0F1A19',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: 'none',
                                            boxShadow: `0 4px 12px ${C.tealDim}`,
                                        }}
                                    >
                                        Registrar Pago
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}