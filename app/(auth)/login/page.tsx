"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Coffee, TrendingUp, Store, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

import InputConIcono from "../components/input_con_icono";
import TarjetaCaracteristica from "../components/tarjeta_caracteristica";

const Login = () => {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [identifier, setIdentifier] = useState(""); 
  const [password, setPassword] = useState("");

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      setCargando(false);

      if (res.status === 429) {
        const data = await res.json();
        setError(data.error || "Demasiados intentos. Espera 60 segundos.");
        return;
      }

      if (res.status === 401) {
        const data = await res.json();
        setError(data.error || "Credenciales inválidas.");
        setRemaining(data.remaining ?? null);
        return;
      }

      if (!res.ok) {
        setError("Error del servidor. Intenta de nuevo.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setCargando(false);
      setError("Error de conexión. Verifica que el servidor esté corriendo.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#07080B] p-5 relative overflow-hidden">
      
      {/* Fondos decorativos */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex w-full max-w-[1000px] min-h-[600px] bg-[#111520] border border-[rgba(6,182,212,0.15)] rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 animate-fadeIn relative z-10">
        
        {/* Lado Izquierdo */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-[#07080B] via-cyan-900 to-[#111520] text-white p-10 flex-col justify-center relative overflow-hidden border-r border-[rgba(6,182,212,0.08)]">
          <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><circle cx=\\'50\\' cy=\\'50\\' r=\\'40\\' stroke=\\'white\\' stroke-width=\\'2\\' fill=\\'none\\'/></svg>')] bg-[length:200px]" />

          <div className="flex items-center mb-8 relative z-10">
            <div className="w-[50px] h-[50px] bg-[#111520] border border-[rgba(6,182,212,0.15)] rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-black/20">
              <Coffee className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-['Inter'] tracking-wide">LILA Management</div>
          </div>

          <div className="welcome-text bg-black/20 backdrop-blur-sm border border-[rgba(6,182,212,0.08)] p-6 rounded-2xl relative z-10 mb-8">
            <h1 className="text-3xl mb-3 font-bold text-white">
              Bienvenido de nuevo
            </h1>
            <p className="text-[rgba(240,244,255,0.4)] leading-relaxed font-light">
              Accede a tu cuenta de LILA Management para gestionar todas las sucursales desde un solo lugar.
            </p>
          </div>

          <div className="mt-4 relative z-10 space-y-4">
            <TarjetaCaracteristica Icon={TrendingUp} texto="Gestión integral de ventas" />
            <TarjetaCaracteristica Icon={Store} texto="Control multi-sucursal" />
            <TarjetaCaracteristica Icon={ShieldCheck} texto="Recursos Humanos AI" />
          </div>
        </div>

        {/* Lado Derecho */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center bg-[#111520]">
          <div className="max-w-[400px] mx-auto w-full">
            <div className="text-center mb-10">
              <h2 className="text-3xl text-[#F0F4FF] font-bold mb-2 font-['Inter']">Iniciar Sesión</h2>
              <p className="text-[rgba(240,244,255,0.4)] text-sm">
                Ingresa tu usuario o correo y contraseña
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 text-center">
                  <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  {error}
                  {remaining !== null && remaining > 0 && (
                    <span className="block text-xs text-red-400/70 mt-1">{remaining} intento(s) restante(s)</span>
                  )}
                </div>
              )}
              <InputConIcono
                id="identifier"
                type="text"
                placeholder="Usuario o Correo"
                Icon={User}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <InputConIcono
                id="password"
                type="password"
                placeholder="Contraseña"
                Icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex justify-between items-center text-sm text-[rgba(240,244,255,0.4)] mb-4">
                <label className="flex items-center space-x-2 cursor-pointer hover:text-[#F0F4FF] transition-colors">
                  <input type="checkbox" className="accent-cyan-500 w-4 h-4 bg-[#07080B] border-[rgba(6,182,212,0.15)] rounded" />
                  <span>Recordarme</span>
                </label>
                <a href="#" className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-700 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-2xl font-bold shadow-lg shadow-[rgba(6,182,212,0.2)] hover:shadow-[rgba(6,182,212,0.4)] hover:scale-[1.02] transition-all duration-300 border border-[rgba(6,182,212,0.15)]"
                disabled={cargando}
              >
                {cargando ? (
                   <span className="flex items-center justify-center gap-2">
                     <Loader2 className="w-5 h-5 animate-spin" /> Iniciando...
                   </span>
                ) : "Ingresar al Sistema"}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;