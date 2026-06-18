"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Coffee, TrendingUp, Store, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

import InputConIcono from "../components/input_con_icono";
import BotonSocial from "../components/boton";
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

            <div className="flex items-center text-[rgba(240,244,255,0.3)] my-8 text-sm">
              <div className="flex-1 h-px bg-[rgba(6,182,212,0.08)]" />
              <span className="px-3 font-medium">O continúa con</span>
              <div className="flex-1 h-px bg-[rgba(6,182,212,0.08)]" />
            </div>

            <div className="flex justify-center gap-4 mb-8">
              <BotonSocial>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </BotonSocial>
              
              <BotonSocial>
                 <svg className="w-5 h-5" viewBox="0 0 23 23">
                   <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                   <path fill="#f35325" d="M1 1h10v10H1z"/>
                   <path fill="#81bc06" d="M12 1h10v10H12z"/>
                   <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                   <path fill="#ffba08" d="M12 12h10v10H12z"/>
                 </svg>
              </BotonSocial>
              
              <BotonSocial>
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-1.04 4.36-.67c.69.11 1.83.5 2.65 1.51-3.7 2.19-2.9 7.79 1.91 9.39-.77 2-1.98 2.37-2.73 3.27-1.27 1.54-2.14 1.45-1.27.73zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              </BotonSocial>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;