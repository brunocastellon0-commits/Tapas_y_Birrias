  "use client";
  import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Bell, TrendingUp, Package } from "lucide-react";

// Tipamos estrictamente los tipos de novedades permitidos
export type NewsType = "update" | "reminder" | "feature";

// Definimos la estructura de cada ítem de novedad
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  type: NewsType;
  date: string;
}

// Interfaz para las props del componente
interface NewsCardProps {
  items?: NewsItem[]; // Lo hacemos opcional por si acaso no hay datos aún
}

export function NewsCard({ items = [] }: NewsCardProps) {
  // Función tipada para obtener el ícono
  const getIcon = (type: NewsType) => {
    switch (type) {
      case "update":
        return <Package className="w-4 h-4" />;
      case "reminder":
        return <Bell className="w-4 h-4" />;
      case "feature":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Función tipada para obtener las clases de color Dark Mode
  const getBadgeColor = (type: NewsType) => {
    switch (type) {
      case "update":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "reminder":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      case "feature":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      default:
        return "bg-gray-800 text-gray-400 border border-gray-700";
    }
  };

  return (
    <Card className="border border-[rgba(6,182,212,0.08)] bg-[#111520] shadow-lg shadow-black/20 hover:border-[rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300">
      <CardHeader className="pb-4 border-b border-[rgba(6,182,212,0.05)]">
        <CardTitle className="text-xl font-bold text-[#F0F4FF] font-['Inter']">
          Últimas Novedades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {items.length === 0 ? (
          <p className="text-[rgba(240,244,255,0.4)] text-sm text-center py-4">
            No hay novedades por el momento.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1 pb-4 border-b border-[rgba(6,182,212,0.05)] last:border-0 last:pb-0 group"
            >
              <div className="flex items-center gap-3">
                {/* Badge con ícono */}
                <Badge
                  variant="outline"
                  className={`h-8 w-8 p-0 flex items-center justify-center rounded-lg transition-colors ${getBadgeColor(
                    item.type
                  )}`}
                >
                  {getIcon(item.type)}
                </Badge>
                {/* Título de la novedad */}
                <p className="text-[rgba(240,244,255,0.7)] text-sm font-semibold group-hover:text-[#F0F4FF] transition-colors">
                  {item.title}
                </p>
              </div>
              {/* Descripción y fecha */}
              <p className="text-[rgba(240,244,255,0.4)] text-sm ml-11 leading-snug font-light">
                {item.description}
              </p>
              <p className="text-[rgba(240,244,255,0.2)] text-xs mt-1 ml-11 font-mono">
                {item.date}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}