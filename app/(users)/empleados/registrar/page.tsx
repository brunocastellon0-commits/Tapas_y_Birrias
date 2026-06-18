'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertTriangle, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DashboardSidebar } from '@/app/components/layout/sidebar';

interface EmployeeFormData {
  nombre: string;
  apellido: string;
  cargo_id: string;
  sucursal_id: string;
  fechaIngreso: string;
  fechaSalida: string;
  email: string;
  tarifa_hora: string;
  es_salario_fijo: boolean;
}

interface SelectOption {
  id: string;
  nombre: string;
}

const cargosMock: SelectOption[] = [
  { id: "1", nombre: "Desarrollador Frontend" },
  { id: "2", nombre: "Desarrollador Backend" },
  { id: "3", nombre: "Gerente de Proyecto" },
];

const sucursalesMock: SelectOption[] = [
  { id: "1", nombre: "Sucursal Central" },
  { id: "2", nombre: "Sucursal Norte" },
];

const inputClass = "w-full px-3 py-2 rounded-xl border outline-none transition-all bg-[#07080B] border-[rgba(6,182,212,0.08)] text-[#F0F4FF] placeholder-[rgba(240,244,255,0.3)] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm";
const errorClass = "border-red-500/50 focus:border-red-500 focus:ring-red-500/30";
const labelClass = "text-sm font-medium text-[rgba(240,244,255,0.4)] mb-1.5 block";

export default function RegistrarEmpleadoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState<EmployeeFormData>({
    nombre: "",
    apellido: "",
    cargo_id: "",
    sucursal_id: "",
    fechaIngreso: "",
    fechaSalida: "",
    email: "",
    tarifa_hora: "0.00",
    es_salario_fijo: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({});
  const [status, setStatus] = useState<{ status: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name as keyof EmployeeFormData;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (Object.keys(errors).length > 0) setErrors({});
    if (status) setStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ status: 'loading', message: "Creando usuario..." });

    const newErrors: Partial<Record<keyof EmployeeFormData, string>> = {};
    const requiredFields: (keyof EmployeeFormData)[] = ["nombre", "apellido", "email", "cargo_id", "fechaIngreso", "tarifa_hora"];
    requiredFields.forEach((key) => {
      if (!formData[key] && formData[key] !== false) newErrors[key] = "Campo obligatorio";
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStatus({ status: 'error', message: "Complete todos los campos obligatorios." });
      setIsSubmitting(false);
      return;
    }

    const passwordGenerada = crypto.randomUUID().slice(0, 12) + "A1!";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: passwordGenerada,
      options: { data: { nombre: formData.nombre, apellido: formData.apellido } },
    });

    if (authError || !authData.user) {
      setStatus({ status: 'error', message: "Error al crear usuario." });
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("usuarios").insert({
      id: authData.user.id,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      cargo_id: formData.cargo_id ? parseInt(formData.cargo_id) : null,
      sucursal_id: formData.sucursal_id ? parseInt(formData.sucursal_id) : null,
      fecha_ingreso: formData.fechaIngreso,
      fecha_salida: formData.fechaSalida || null,
      tarifa_hora: parseFloat(formData.tarifa_hora) || 0,
      es_salario_fijo: formData.es_salario_fijo,
    });

    if (insertError) {
      setStatus({ status: 'error', message: "Error al guardar el perfil." });
      setIsSubmitting(false);
      return;
    }

    setStatus({ status: 'success', message: `Usuario registrado. Contraseña: ${passwordGenerada}` });
    setTimeout(() => { router.push("/dashboard"); }, 5000);
  };

  const StatusIcon = status?.status === 'success' ? CheckCircle : status?.status === 'error' ? XCircle : Loader2;

  return (
    <div className="min-h-screen bg-[#0C0E14]">
      <DashboardSidebar />
      <div className="md:ml-64 flex flex-col min-h-screen bg-[#0C0E14]">
        <header className="h-[60px] bg-[#141822] border-b border-[rgba(6,182,212,0.08)] flex items-center px-6 gap-4">
          <span
            className="text-[#F0F4FF] font-bold text-lg mr-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Registrar Empleado
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto bg-[#111520] border border-[rgba(6,182,212,0.08)] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-[#F0F4FF] font-semibold text-lg">Nuevo Registro</h2>
                <p className="text-[rgba(240,244,255,0.3)] text-sm">Complete la información del nuevo colaborador.</p>
              </div>
            </div>

            {status && (
              <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm ${
                status.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                status.status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                <StatusIcon className={`w-5 h-5 ${status.status === 'loading' ? 'animate-spin' : ''}`} />
                <span className="flex-1">{status.message}</span>
                {status.status !== 'loading' && (
                  <button onClick={() => setStatus(null)} className="text-current/60 hover:text-current transition-colors cursor-pointer">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-6 border-b border-[rgba(6,182,212,0.08)]">
                <legend className="text-base font-semibold text-cyan-400 mb-4 w-full col-span-full">
                  Datos Básicos
                </legend>

                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                    className={`${inputClass} ${errors.nombre ? errorClass : ''}`} placeholder="Ej. Juan" />
                  {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
                </div>

                <div>
                  <label className={labelClass}>Apellido *</label>
                  <input type="text" name="apellido" value={formData.apellido} onChange={handleChange}
                    className={`${inputClass} ${errors.apellido ? errorClass : ''}`} placeholder="Ej. Pérez" />
                  {errors.apellido && <p className="text-red-400 text-xs mt-1">{errors.apellido}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Correo electrónico *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className={`${inputClass} ${errors.email ? errorClass : ''}`} placeholder="ejemplo@correo.com" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
              </fieldset>

              <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-6 border-b border-[rgba(6,182,212,0.08)]">
                <legend className="text-base font-semibold text-cyan-400 mb-4 w-full col-span-full">
                  Asignación y Fechas
                </legend>

                <div>
                  <label className={labelClass}>Cargo *</label>
                  <select name="cargo_id" value={formData.cargo_id} onChange={handleChange}
                    className={`${inputClass} ${errors.cargo_id ? errorClass : ''}`}>
                    <option value="">Seleccione cargo</option>
                    {cargosMock.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  {errors.cargo_id && <p className="text-red-400 text-xs mt-1">{errors.cargo_id}</p>}
                </div>

                <div>
                  <label className={labelClass}>Sucursal</label>
                  <select name="sucursal_id" value={formData.sucursal_id} onChange={handleChange} className={inputClass}>
                    <option value="">Seleccione sucursal</option>
                    {sucursalesMock.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Fecha de ingreso *</label>
                  <input type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange}
                    className={`${inputClass} ${errors.fechaIngreso ? errorClass : ''}`} />
                  {errors.fechaIngreso && <p className="text-red-400 text-xs mt-1">{errors.fechaIngreso}</p>}
                </div>

                <div>
                  <label className={labelClass}>Fecha de salida (opcional)</label>
                  <input type="date" name="fechaSalida" value={formData.fechaSalida} onChange={handleChange} className={inputClass} />
                </div>
              </fieldset>

              <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-2">
                <legend className="text-base font-semibold text-cyan-400 mb-4 w-full col-span-full">
                  Datos de Nómina
                </legend>

                <div>
                  <label className={labelClass}>Tarifa por Hora *</label>
                  <input type="number" step="0.01" name="tarifa_hora" value={formData.tarifa_hora} onChange={handleChange}
                    className={`${inputClass} ${errors.tarifa_hora ? errorClass : ''}`} placeholder="0.00" />
                  {errors.tarifa_hora && <p className="text-red-400 text-xs mt-1">{errors.tarifa_hora}</p>}
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="es_salario_fijo" checked={formData.es_salario_fijo} onChange={handleChange}
                      className="accent-cyan-500 w-4 h-4 bg-[#07080B] border-[rgba(6,182,212,0.15)] rounded" />
                    <span className="text-sm text-gray-400">Tiene salario fijo</span>
                  </label>
                </div>
              </fieldset>

              <button type="submit" disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-cyan-700 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-2xl font-bold shadow-lg shadow-[rgba(6,182,212,0.2)] hover:shadow-[rgba(6,182,212,0.4)] hover:scale-[1.02] transition-all duration-300 border border-[rgba(6,182,212,0.15)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                ) : "Registrar Nuevo Empleado"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
