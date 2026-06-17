'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Package, Loader2, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import type { Producto, Categoria } from './ProductosTab';

interface Props {
  productos: Producto[];
  categorias: Categoria[];
}

interface TopProducto {
  producto_id: number;
  nombre_producto: string;
  cantidad: number;
  total_vendido: number;
}

interface ReporteData {
  topProductos: TopProducto[];
  cargando: boolean;
}

type Periodo = 'semana' | 'mes' | 'todo';

function getDateRange(periodo: Periodo): { desde: string; hasta: string } {
  const ahora = new Date();
  const hasta = ahora.toISOString();
  let desde: Date;

  switch (periodo) {
    case 'semana':
      desde = new Date(ahora);
      desde.setDate(desde.getDate() - 7);
      break;
    case 'mes':
      desde = new Date(ahora);
      desde.setMonth(desde.getMonth() - 1);
      break;
    default:
      desde = new Date(0);
  }

  return { desde: desde.toISOString(), hasta };
}

export function ReportesTab({ productos, categorias }: Props) {
  const supabase = createClient();
  const [data, setData] = useState<ReporteData>({
    topProductos: [],
    cargando: true,
  });
  const [periodo, setPeriodo] = useState<Periodo>('todo');

  useEffect(() => {
    cargarReportes();
  }, [periodo]);

  async function cargarReportes() {
    setData((prev) => ({ ...prev, cargando: true }));
    const { desde, hasta } = getDateRange(periodo);

    const { data: items } = await supabase
      .from('comanda_items')
      .select('producto_id, nombre_producto, cantidad, precio_unitario, created_at')
      .gte('created_at', desde)
      .lte('created_at', hasta);

    if (items) {
      const agrupado: Record<number, { nombre: string; cantidad: number; total: number }> = {};

      items.forEach((i: any) => {
        if (!agrupado[i.producto_id]) {
          agrupado[i.producto_id] = { nombre: i.nombre_producto, cantidad: 0, total: 0 };
        }
        agrupado[i.producto_id].cantidad += i.cantidad;
        agrupado[i.producto_id].total += i.cantidad * i.precio_unitario;
      });

      const top = Object.entries(agrupado)
        .map(([id, v]) => ({
          producto_id: Number(id),
          nombre_producto: v.nombre,
          cantidad: v.cantidad,
          total_vendido: v.total,
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);

      setData({ topProductos: top, cargando: false });
    } else {
      setData((prev) => ({ ...prev, cargando: false }));
    }
  }

  const activos = productos.filter((p) => p.activo);
  const inactivos = productos.filter((p) => !p.activo);
  const precioPromedio = activos.length
    ? activos.reduce((s, p) => s + p.precio, 0) / activos.length
    : 0;
  const valorInventario = productos.reduce((s, p) => s + p.costo * p.stock, 0);
  const valorVentaInventario = productos.reduce((s, p) => s + p.precio * p.stock, 0);
  const stockBajo = productos.filter((p) => p.activo && p.stock <= 10);
  const sinStock = productos.filter((p) => p.activo && p.stock === 0);

  const distribucionCategorias = useMemo(() => {
    return categorias.map((cat) => {
      const count = productos.filter((p) => p.categoria_id === cat.id).length;
      return { ...cat, count };
    }).filter((c) => c.count > 0);
  }, [categorias, productos]);

  const sinCategoria = productos.filter((p) => !p.categoria_id).length;

  const margenPromedio = activos.length
    ? activos.reduce((s, p) => s + (p.precio - p.costo), 0) / activos.length
    : 0;
  const margenPorcPromedio = precioPromedio > 0
    ? ((margenPromedio / precioPromedio) * 100).toFixed(1)
    : '0';

  const ingresosPeriodo = data.topProductos.reduce((s, p) => s + p.total_vendido, 0);

  const kpis = [
    { label: 'Productos Activos', value: activos.length, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Valor Inventario (costo)', value: `$${valorInventario.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Valor Venta Potencial', value: `$${valorVentaInventario.toLocaleString()}`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Precio Promedio', value: `$${precioPromedio.toFixed(2)}`, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  const periodos: { key: Periodo; label: string }[] = [
    { key: 'semana', label: 'Última semana' },
    { key: 'mes', label: 'Último mes' },
    { key: 'todo', label: 'Todo el historial' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.3 }}
            className="bg-[#13161C] border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-xs text-gray-400 mt-1">{kpi.label}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Productos más vendidos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-[#13161C] border border-white/10 rounded-2xl"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Top 10 Más Vendidos</h3>
                  {!data.cargando && data.topProductos.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{ingresosPeriodo.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })} en ventas</p>
                  )}
                </div>
              </div>

              <div className="flex bg-[#0c0e12] border border-white/10 rounded-lg overflow-hidden">
                {periodos.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriodo(p.key)}
                    className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      periodo === p.key
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {data.cargando ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : data.topProductos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Sin datos de ventas en este período</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {data.topProductos.map((item, idx) => {
                const maxCant = data.topProductos[0]?.cantidad || 1;
                const barWidth = (item.cantidad / maxCant) * 100;
                const medallas = ['🥇', '🥈', '🥉'];
                return (
                  <motion.div
                    key={item.producto_id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-gray-500 w-4 shrink-0">{idx < 3 ? medallas[idx] : `#${idx + 1}`}</span>
                        <span className="text-sm text-white truncate max-w-[160px]">{item.nombre_producto}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400 font-mono">{item.cantidad} uds</span>
                        <span className="text-xs text-emerald-400 font-mono w-16 text-right">${item.total_vendido.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Alertas de stock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-[#13161C] border border-white/10 rounded-2xl"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Alertas de Stock</h3>
                {stockBajo.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{stockBajo.length} productos con stock bajo</p>
                )}
              </div>
            </div>
          </div>

          {stockBajo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Todo en orden — sin alertas de stock</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {stockBajo.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm text-white truncate block ${!p.activo ? 'line-through opacity-50' : ''}`}>
                      {p.nombre}
                    </span>
                    <span className="text-xs text-gray-500">{p.medida}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-medium ${
                      p.stock === 0 ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {p.stock === 0 ? 'Sin stock' : `${p.stock}`}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      p.stock === 0 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {p.stock === 0 ? 'Crítico' : 'Bajo'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Distribución por categoría */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="bg-[#13161C] border border-white/10 rounded-2xl"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-teal-400" />
              </div>
              <h3 className="text-white font-semibold text-sm">Distribución por Categoría</h3>
            </div>
          </div>

          {distribucionCategorias.length === 0 && sinCategoria === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs">Sin datos de categorías</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {distribucionCategorias.map((cat, idx) => {
                const maxCount = Math.max(...distribucionCategorias.map((c) => c.count), 1);
                const barWidth = (cat.count / maxCount) * 100;
                const colors = ['bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{cat.nombre}</span>
                      <span className="text-sm text-gray-400 font-mono">{cat.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[idx % colors.length]}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
              {sinCategoria > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-400">Sin categoría</span>
                    <span className="text-sm text-gray-400 font-mono">{sinCategoria}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full"
                      style={{ width: `${(sinCategoria / Math.max(...distribucionCategorias.map((c) => c.count), 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Resumen de márgenes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="bg-[#13161C] border border-white/10 rounded-2xl"
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold text-sm">Resumen de Márgenes</h3>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0c0e12] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Margen Promedio</div>
                <div className="text-lg font-bold text-white">
                  ${margenPromedio.toFixed(2)}
                </div>
                <div className="text-xs text-emerald-400">{margenPorcPromedio}% sobre precio</div>
              </div>

              <div className="bg-[#0c0e12] rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Productos</div>
                <div className="text-lg font-bold text-white">{productos.length}</div>
                <div className="text-xs text-gray-400">
                  {inactivos.length} inactivos
                </div>
              </div>
            </div>

            <div className="bg-[#0c0e12] rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-2">Productos con mayor margen</div>
              {productos
                .filter((p) => p.activo && p.costo > 0)
                .sort((a, b) => (b.precio - b.costo) / b.costo - (a.precio - a.costo) / a.costo)
                .slice(0, 5)
                .map((p, idx) => {
                  const margen = p.precio - p.costo;
                  const porc = ((margen / p.costo) * 100).toFixed(0);
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <span className="text-gray-300 truncate max-w-[200px]">{p.nombre}</span>
                      <span className="text-emerald-400 font-mono text-xs">
                        +{porc}%
                      </span>
                    </motion.div>
                  );
                })}
              {productos.filter((p) => p.activo && p.costo > 0).length === 0 && (
                <p className="text-xs text-gray-500 py-2">Sin datos disponibles</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
