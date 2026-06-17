"use client";
import React, { useEffect, useState } from "react";
import { UtensilsCrossed, ClipboardList, DollarSign, Users, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DashboardSidebar } from "@/app/components/layout/sidebar";

interface Resumen {
  mesasOcupadas: number;
  mesasLibres: number;
  comandasActivas: number;
  totalDia: number;
  cubiertosHoy: number;
}

export default function DashboardHome() {
  const supabase = createClient();
  const [resumen, setResumen] = useState<Resumen>({
    mesasOcupadas: 0,
    mesasLibres: 0,
    comandasActivas: 0,
    totalDia: 0,
    cubiertosHoy: 0,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarResumen();
  }, []);

  async function cargarResumen() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString();

    const [{ count: totalMesas }, comandasActivas, pagosHoy] = await Promise.all([
      supabase.from("mesas").select("*", { count: "exact", head: true }).eq("activa", true),
      supabase.from("comandas").select("id, cubiertos, mesa_id").in("etapa", ["tomada", "en-cocina", "lista", "entregada"]),
      supabase.from("pagos").select("monto, created_at").gte("created_at", hoyStr),
    ]);

    const activas = comandasActivas.data ?? [];
    const mesasOcupadasIds = new Set(activas.map((c: any) => c.mesa_id));
    const pagos = pagosHoy.data ?? [];

    setResumen({
      mesasOcupadas: mesasOcupadasIds.size,
      mesasLibres: (totalMesas ?? 0) - mesasOcupadasIds.size,
      comandasActivas: activas.length,
      totalDia: pagos.reduce((s: number, p: any) => s + Number(p.monto), 0),
      cubiertosHoy: activas.reduce((s: number, c: any) => s + (c.cubiertos ?? 0), 0),
    });

    setCargando(false);
  }

  const kpis = [
    { label: "Mesas Ocupadas", value: resumen.mesasOcupadas, total: resumen.mesasOcupadas + resumen.mesasLibres, icon: UtensilsCrossed, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Comandas Activas", value: resumen.comandasActivas, icon: ClipboardList, color: "text-cyan-300", bg: "bg-cyan-400/10" },
    { label: "Total del Día", value: `$${resumen.totalDia.toLocaleString()}`, icon: DollarSign, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Cubiertos Hoy", value: resumen.cubiertosHoy, icon: Users, color: "text-cyan-300", bg: "bg-cyan-400/10" },
  ];

  return (
    <div className="min-h-screen bg-[#0C0E14] text-[rgba(240,244,255,0.7)]">
      <DashboardSidebar />

      <main className="md:ml-64 p-6 pt-24">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-[#F0F4FF] mb-2">Dashboard</h1>
          <p className="text-[rgba(240,244,255,0.4)] text-sm mb-8">Resumen del día — {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>

          {cargando ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-[#111520] border border-[rgba(6,182,212,0.08)] rounded-2xl p-5 hover:border-[rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                        <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                      </div>
                    </div>
                    <div className={`text-2xl font-bold text-[#F0F4FF]`}>{kpi.value}{kpi.total !== undefined && <span className="text-sm text-[rgba(240,244,255,0.3)] font-normal ml-1">/ {kpi.total}</span>}</div>
                    <div className="text-xs text-[rgba(240,244,255,0.4)] mt-1">{kpi.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/ordenes" className="group bg-[#111520] border border-[rgba(6,182,212,0.08)] rounded-2xl p-6 hover:border-cyan-500/30 hover:bg-[#141822] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[#F0F4FF] font-semibold">Ir a Mesas</div>
                      <div className="text-xs text-[rgba(240,244,255,0.4)] mt-0.5">Gestionar pedidos y comandas</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[rgba(240,244,255,0.3)] group-hover:text-cyan-400 transition-colors" />
                  </div>
                </Link>

                <Link href="/ordenes?tab=historial" className="group bg-[#111520] border border-[rgba(6,182,212,0.08)] rounded-2xl p-6 hover:border-cyan-500/30 hover:bg-[#141822] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-400/10 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-cyan-300" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[#F0F4FF] font-semibold">Ver Historial</div>
                      <div className="text-xs text-[rgba(240,244,255,0.4)] mt-0.5">Comandas cerradas y pagos</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[rgba(240,244,255,0.3)] group-hover:text-cyan-300 transition-colors" />
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
