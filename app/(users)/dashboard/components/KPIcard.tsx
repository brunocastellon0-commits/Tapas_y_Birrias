"use client";
import React from "react";
import { Card, CardContent } from "../../../components/ui/card";

// Definimos los tipos permitidos para los esquemas de color
type ColorScheme = "purple" | "blue" | "green" | "orange" | "amber";

// Tipamos la estructura del objeto de clases para evitar errores
type ColorClasses = Record<
  ColorScheme,
  {
    bg: string;
    border: string;
    icon: string;
    shadow: string;
  }
>;

const colorClasses: ColorClasses = {
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    icon: "text-purple-400",
    shadow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
  },
  blue: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    icon: "text-cyan-400",
    shadow: "shadow-[0_0_15px_rgba(6,182,212,0.15)]",
  },
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "text-emerald-400",
    shadow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    icon: "text-orange-400",
    shadow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "text-amber-400",
    shadow: "shadow-[0_0_15px_rgba(245,158,12,0.15)]",
  }
};

// Interfaz para las props del componente
interface KPICardProps {
  title: string;
  value: string | number;
  IconComponent?: React.ElementType; 
  trend?: string;
  trendUp?: boolean;
  color: ColorScheme;
}

export function KPICard({
  title,
  value,
  IconComponent,
  trend,
  trendUp,
  color,
}: KPICardProps) {
  // TypeScript ahora asegura que 'color' siempre será una clave válida
  const selectedColor = colorClasses[color] || colorClasses.purple;

  return (
    <Card className="border border-[rgba(6,182,212,0.08)] bg-[#111520] hover:border-[rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[rgba(240,244,255,0.4)] text-sm font-medium mb-2 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-[#F0F4FF] text-3xl font-bold mb-1 font-['Inter']">
              {value}
            </p>

            {/* Indicador de Tendencia */}
            {trend && (
              <div
                className={`flex items-center text-sm font-bold ${
                  trendUp ? "text-emerald-400" : "text-red-400"
                }`}
              >
                <span className="mr-1">{trendUp ? "↑" : "↓"}</span>
                <span>{trend}</span>
              </div>
            )}
          </div>

          {/* Contenedor del Ícono con colores dinámicos Dark Mode */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-all duration-300 group hover:scale-110 ${selectedColor.bg} ${selectedColor.border} ${selectedColor.shadow}`}
          >
            {IconComponent && (
              <IconComponent
                className={`w-7 h-7 ${selectedColor.icon} group-hover:text-white transition-colors`}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}