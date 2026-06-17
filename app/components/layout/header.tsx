"use client";


import React from "react";
import { Bell } from "lucide-react";
// Asegúrate de que estos paths sean correctos para tu proyecto (Shadcn UI)
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

// 1. Definimos las propiedades (Props) para hacer el componente dinámico y puro visualmente
interface DashboardHeaderProps {
  systemName?: string;
  systemSubtitle?: string;
  systemInitials?: string;
  userName?: string;
  userInitials?: string;
  avatarUrl?: string;
  notificationCount?: number;
}

export function DashboardHeader({
  // 2. Asignamos valores por defecto para mantener el diseño original si no se pasan props
  systemName = "Lila Management",
  systemSubtitle = "Sistema ERP",
  systemInitials = "LM",
  userName = "Carlos Méndez",
  userInitials = "CM",
  avatarUrl = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
  notificationCount = 3,
}: DashboardHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0C0E14]/90 backdrop-blur-md border-b border-[rgba(6,182,212,0.08)] z-50 shadow-lg shadow-black/20">
      <div className="h-full px-6 flex items-center justify-between">
        
        {/* Logo y nombre del sistema */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-700 to-cyan-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <span className="text-white font-semibold text-lg font-['Inter']">
              {systemInitials}
            </span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-snug font-['Inter'] tracking-wide">
              {systemName}
            </h1>
            <p className="text-cyan-400 text-xs leading-none font-medium uppercase tracking-wider">
              {systemSubtitle}
            </p>
          </div>
        </div>

        {/* Área derecha: notificaciones y usuario */}
        <div className="flex items-center gap-4">
          
          {/* Notificaciones */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-[rgba(6,182,212,0.1)] text-[rgba(240,244,255,0.4)] hover:text-cyan-400 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {/* Solo renderiza el badge si hay notificaciones */}
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 rounded-full bg-cyan-500 hover:bg-cyan-500 text-white text-xs font-bold ring-2 ring-[#0C0E14]">
                {notificationCount}
              </Badge>
            )}
          </Button>

          {/* Usuario */}
          <div className="flex items-center gap-3 pl-4 border-l border-[rgba(6,182,212,0.08)]">
            <div className="text-right hidden sm:block"> 
              <p className="text-[rgba(240,244,255,0.4)] text-sm leading-none">Bienvenido,</p>
              <p className="text-[#F0F4FF] text-sm font-medium leading-none mt-1">
                {userName}
              </p>
            </div>
            
            <Avatar className="w-10 h-10 border-2 border-cyan-500 cursor-pointer hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-300">
              <AvatarImage src={avatarUrl} alt={`Avatar de ${userName}`} />
              <AvatarFallback className="bg-cyan-700 text-white font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}