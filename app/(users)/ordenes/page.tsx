'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Calculator, Circle } from 'lucide-react';

import { DashboardSidebar } from '@/app/components/layout/sidebar';
import TableMapView, { TableData } from './components/TableMapView';
import CajaPanel from './components/CajaPanel';
import CajaHistorial from './components/CajaHistorial';
import { OrderPanel, OrderItem, Product, Table, Order } from './components/OrderPanel';
import { OrdersHistory, Order as HistoryOrder } from './components/OrderHistory';
import { C } from './components/tokens';

export default function ServicioPage() {
  return (
    <Suspense fallback={null}>
      <ServicioContent />
    </Suspense>
  );
}

function ServicioContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'operacion' | 'historial' | 'caja'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'historial') return 'historial';
    if (tab === 'caja') return 'caja';
    return 'operacion';
  });
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [productos, setProductos] = useState<Product[]>([]);
  const [historial, setHistorial] = useState<HistoryOrder[]>([]);
  const [occupiedTableIds, setOccupiedTableIds] = useState<Set<number>>(new Set());
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cajaOpen, setCajaOpen] = useState(false);

  useEffect(() => {
    cargarProductos();
    cargarHistorial();
    cargarComandasActivas();
    verificarCaja();
  }, []);

  async function verificarCaja() {
    const { count } = await supabase
      .from('aperturas_caja')
      .select('*', { count: 'exact', head: true })
      .eq('abierta', true);
    setCajaAbierta((count ?? 0) > 0);
  }

  async function cargarComandasActivas() {
    const { data } = await supabase
      .from('comandas')
      .select('id, mesa_id, etapa, items:comanda_items(*)')
      .in('etapa', ['tomada', 'en-cocina', 'lista', 'entregada']);

    if (data) {
      const ocupadas = new Set(data.map((c: any) => c.mesa_id));
      setOccupiedTableIds(ocupadas);
    }
  }

  async function cargarProductos() {
    const { data } = await supabase.from('productos').select('*').eq('activo', true);
    if (data) {
      setProductos(
        data.map((p: any) => ({
          id: p.id,
          name: p.nombre,
          category: '',
          costo: p.precio,
          medida: p.medida,
          stock: p.stock,
        }))
      );
    }
  }

  async function cargarHistorial() {
    const { data: comandas } = await supabase
      .from('comandas')
      .select(
        `
        id, mesa_id, total, created_at, etapa,
        mesa:mesa_id(numero),
        usuario:usuario_id(nombre, apellido),
        pago:pagos(metodo)
      `
      )
      .in('etapa', ['cerrada', 'anulada'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (comandas) {
      setHistorial(
        comandas.map((c: any) => ({
          id: `#${String(c.id).padStart(4, '0')}`,
          tableNumber: c.mesa?.numero ?? '',
          date: new Date(c.created_at).toLocaleDateString('es-ES'),
          time: new Date(c.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          waiter: c.usuario ? `${c.usuario.nombre} ${c.usuario.apellido}` : '',
          paymentMethod: c.pago?.[0]?.metodo === 'qr' ? 'qr' : c.pago?.[0]?.metodo === 'tarjeta' ? 'tarjeta' : 'efectivo',
          status: c.etapa === 'anulada' ? 'anulado' : 'pagado',
          covers: 0,
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: c.total,
        }))
      );
    }
  }

  const handleTableSelect = useCallback(
    async (tableData: TableData | null) => {
      if (!tableData) {
        setSelectedTableId(null);
        setSelectedTable(null);
        setCurrentOrder(null);
        return;
      }

      setSelectedTableId(tableData.id);
      setSelectedTable({
        id: tableData.id,
        number: tableData.numero,
        zone: tableData.zona,
        state: tableData.state === 'occupied' ? 'occupied' : 'available',
        chairs: tableData.sillas,
        shape: tableData.shape,
      });

      const { data: comanda } = await supabase
        .from('comandas')
        .select('*, items:comanda_items(*)')
        .eq('mesa_id', tableData.id)
        .in('etapa', ['tomada', 'en-cocina', 'lista', 'entregada'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (comanda) {
        setCurrentOrder({
          id: comanda.id,
          stage: comanda.etapa,
          paymentMethod: undefined,
          items: (comanda.items ?? []).map((i: any) => ({
            id: String(i.id),
            id_producto: i.producto_id,
            name: i.nombre_producto,
            category: '',
            price: i.precio_unitario,
            qty: i.cantidad,
            notes: i.notas ?? [],
          })),
        });
      } else {
        setCurrentOrder(null);
      }
    },
    [supabase]
  );

  const handleAbrirMesa = useCallback(
    async (tableId: string | number) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: comanda } = await supabase
        .from('comandas')
        .insert({
          mesa_id: Number(tableId),
          usuario_id: user.user.id,
          etapa: 'tomada',
          cubiertos: 2,
          total: 0,
        })
        .select()
        .single();

      if (comanda) {
        setCurrentOrder({
          id: comanda.id,
          stage: 'tomada',
          paymentMethod: undefined,
          items: [],
        });
        cargarComandasActivas();
      }
    },
    [supabase]
  );

  const handleEnviarCocina = useCallback(
    async (tableId: string | number, items: OrderItem[], cubiertos: number) => {
      const { data: user } = await supabase.auth.getUser();

      let comandaId: number;

      if (currentOrder && currentOrder.id) {
        comandaId = Number(currentOrder.id);
      } else {
        const { data: newComanda } = await supabase
          .from('comandas')
          .insert({
            mesa_id: Number(tableId),
            usuario_id: user.user?.id ?? '',
            etapa: 'tomada',
            cubiertos,
            total: 0,
          })
          .select()
          .single();
        if (!newComanda) return;
        comandaId = newComanda.id;
      }

      const itemsToInsert = items
        .filter((i) => i.qty > 0)
        .map((i) => ({
          comanda_id: comandaId,
          producto_id: Number(i.id_producto),
          nombre_producto: i.name,
          precio_unitario: i.price,
          cantidad: i.qty,
          notas: i.notes.length > 0 ? i.notes : null,
        }));

      if (itemsToInsert.length > 0) {
        await supabase.from('comanda_items').insert(itemsToInsert);
      }

      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = Math.round(subtotal * 0.105);
      await supabase
        .from('comandas')
        .update({ etapa: 'en-cocina', total: subtotal + tax, cubiertos })
        .eq('id', comandaId);

      setCurrentOrder({
        ...currentOrder,
        id: comandaId,
        stage: 'en-cocina',
        items: items.map((i) => ({ ...i, id: `tmp-${i.id_producto}` })),
      });

      cargarComandasActivas();
    },
    [supabase, currentOrder]
  );

  const handleCobrar = useCallback(
    async (tableId: string | number, orderId: string | number, total: number, paymentMethod: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const methodMap: Record<string, 'efectivo' | 'tarjeta' | 'qr'> = {
        cash: 'efectivo',
        card: 'tarjeta',
        qr: 'qr',
      };

      const { error } = await supabase.from('pagos').insert({
        comanda_id: Number(orderId),
        metodo: methodMap[paymentMethod] ?? 'efectivo',
        monto: total,
        usuario_id: user.user.id,
      });

      if (error) {
        alert('Error al registrar pago: ' + error.message);
        return;
      }

      await supabase.from('comandas').update({ etapa: 'cerrada' }).eq('id', Number(orderId));

      setCurrentOrder(null);
      setSelectedTable(null);
      setSelectedTableId(null);
      cargarComandasActivas();
      cargarHistorial();
    },
    [supabase]
  );

  const handleMovimientoCaja = useCallback(
    async (tipo: 'entrada' | 'salida', monto: number, descripcion: string) => {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('movimientos_caja').insert({
        tipo,
        monto,
        descripcion,
        usuario_id: user.user?.id ?? '',
      });
    },
    [supabase]
  );

  const handleUpdateQty = (itemId: string, qty: number) => {
    if (!currentOrder) return;
    setCurrentOrder((prev: Order | null) => {
      if (!prev) return null;
      return {
        ...prev,
        items: qty === 0
          ? prev.items.filter((i) => i.id !== itemId)
          : prev.items.map((i) => (i.id === itemId ? { ...i, qty } : i)),
      };
    });
  };

  const handleSetPayment = (method: string) => {
    if (!currentOrder) return;
    setCurrentOrder((prev) => {
      if (!prev) return null;
      return { ...prev, paymentMethod: method as any };
    });
  };

  return (
    <div className="min-h-screen bg-[#0C0E14]">
      <DashboardSidebar />

      <div
        style={{
          marginLeft: '16rem',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: C.bg,
          fontFamily: C.sans,
        }}
      >
        <header
          style={{
            height: 60,
            background: C.bgCard,
            borderBottom: `1px solid ${C.br}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 16,
          }}
        >
          <div
            style={{
              color: C.t1,
              fontWeight: 700,
              fontSize: 18,
              fontFamily: C.serif,
              marginRight: 24,
            }}
          >
            Mesas
          </div>

          <button
            onClick={() => setActiveTab('operacion')}
            style={{
              background: activeTab === 'operacion' ? C.goldDim : 'transparent',
              border: `1px solid ${activeTab === 'operacion' ? C.goldBorder : 'transparent'}`,
              color: activeTab === 'operacion' ? C.goldLight : C.t3,
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === 'operacion' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Operación en Vivo
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            style={{
              background: activeTab === 'historial' ? C.tealDim : 'transparent',
              border: `1px solid ${activeTab === 'historial' ? C.tealBorder : 'transparent'}`,
              color: activeTab === 'historial' ? C.teal : C.t3,
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === 'historial' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Historial de Comandas
          </button>

          <button
            onClick={() => setActiveTab('caja')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'caja' ? (cajaAbierta ? C.tealDim : C.goldDim) : 'transparent',
              border: `1px solid ${activeTab === 'caja' ? (cajaAbierta ? C.tealBorder : C.goldBorder) : 'transparent'}`,
              color: activeTab === 'caja' ? (cajaAbierta ? C.teal : C.goldLight) : C.t3,
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: activeTab === 'caja' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Circle size={8} fill={cajaAbierta ? C.teal : C.t3} color={cajaAbierta ? C.teal : C.t3} />
            <Calculator size={14} />
            Caja
          </button>

          {activeTab === 'caja' && (
            <button
              onClick={() => setCajaOpen(true)}
              style={{
                background: cajaAbierta ? 'rgba(240,82,82,0.1)' : C.tealDim,
                border: `1px solid ${cajaAbierta ? 'rgba(240,82,82,0.3)' : C.tealBorder}`,
                color: cajaAbierta ? '#F05252' : C.teal,
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              {cajaAbierta ? 'Cerrar Caja' : 'Abrir Caja'}
            </button>
          )}
        </header>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {activeTab === 'operacion' ? (
            <div style={{ flex: 1, display: 'flex', width: '100%' }}>
              <div style={{ flex: 1, padding: 24, overflow: 'hidden' }}>
                <TableMapView
                  onTableSelect={handleTableSelect}
                  selectedTableId={selectedTableId}
                  occupiedTableIds={occupiedTableIds}
                />
              </div>

              <OrderPanel
                table={selectedTable}
                order={currentOrder}
                productosDisponibles={productos}
                onUpdateQty={handleUpdateQty}
                onSetPayment={handleSetPayment}
                onAbrirMesa={handleAbrirMesa}
                onEnviarCocina={handleEnviarCocina}
                onCobrar={handleCobrar}
                onMovimientoCaja={handleMovimientoCaja}
              />
            </div>
          ) : activeTab === 'historial' ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <OrdersHistory
                orders={historial}
                onReprintTicket={(id) => console.log('Reimprimir', id)}
                onRegisterPayment={(id) => console.log('Pagar', id)}
              />
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <CajaHistorial />
            </div>
          )}
        </main>
      </div>

      <CajaPanel isOpen={cajaOpen} onClose={() => { setCajaOpen(false); verificarCaja(); }} />
    </div>
  );
}
