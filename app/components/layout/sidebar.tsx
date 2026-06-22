"use client";
import React, { useState, useEffect } from "react";
import { LayoutDashboard, UtensilsCrossed, Package, UserPlus, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SESSION_ADMIN_KEY = 'tyb_admin_check';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "mesas",
    label: "Mesas",
    icon: UtensilsCrossed,
    path: "/ordenes",
  },
  {
    id: "productos",
    label: "Productos",
    icon: Package,
    path: "/productos",
  },
  {
    id: "registrar",
    label: "Registrar",
    icon: UserPlus,
    path: "/empleados/registrar",
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const cached = sessionStorage.getItem(SESSION_ADMIN_KEY);
      if (!cached) return false;
      return JSON.parse(cached).sucursalId !== undefined;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const cached = sessionStorage.getItem(SESSION_ADMIN_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.expiry > Date.now()) {
          setIsAdmin(parsed.sucursalId !== undefined);
          return;
        }
      } catch {}
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('usuarios').select('cargo_id, sucursal_id, cargos!inner(nombre)').eq('id', user.id).single().then(({ data: usuario }) => {
        if (!usuario) return;
        const esAdmin = (usuario as any).cargos?.nombre === 'Administrador';
        setIsAdmin(esAdmin);
        if (esAdmin) {
          sessionStorage.setItem(SESSION_ADMIN_KEY, JSON.stringify({
            sucursalId: (usuario as any).sucursal_id ?? null,
            expiry: Date.now() + 30 * 60 * 1000,
          }));
        }
      });
    });
  }, []);

  const visibleNavItems = navItems.filter((item) =>
    item.id === 'productos' ? isAdmin : true
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[#0C0E14] border-r border-[rgba(6,182,212,0.08)] overflow-y-auto z-40 hidden md:block">
      <nav className="p-4 space-y-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
          const IconComponent = item.icon;

          const buttonClasses = `
            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm border group
            ${
              isActive
                ? "bg-gradient-to-r from-cyan-700 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] border-[rgba(6,182,212,0.25)]"
                : "text-[rgba(240,244,255,0.4)] border-transparent hover:bg-[rgba(6,182,212,0.08)] hover:text-[#F0F4FF] hover:border-[rgba(6,182,212,0.15)]"
            }
          `;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={buttonClasses.trim()}
            >
              <span className={`transition-colors ${isActive ? "text-white" : "text-cyan-400 group-hover:text-white"}`}>
                <IconComponent className="w-5 h-5" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[rgba(6,182,212,0.08)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm border border-transparent text-[rgba(240,244,255,0.4)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 group"
          >
            <span className="text-[rgba(240,244,255,0.3)] group-hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
