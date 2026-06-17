import React from "react";

// 1. Definimos la interfaz para las propiedades
interface TarjetaCaracteristicaProps {
  Icon?: React.ElementType; // Permite pasar componentes de íconos (como los de lucide-react)
  texto: string;            // El texto descriptivo de la tarjeta
  gradient?: string;        // Opcional, ya que tiene un valor por defecto
}

// 2. Aplicamos la interfaz al componente con React.FC
const TarjetaCaracteristica: React.FC<TarjetaCaracteristicaProps> = ({ 
  Icon, 
  texto, 
  gradient = "bg-gradient-to-br from-cyan-700 to-cyan-500" 
}) => {
  return (
    <div className="group bg-[#111520] rounded-2xl p-4 border border-[rgba(6,182,212,0.08)] hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300 cursor-pointer flex items-center gap-3">
      <div className={`w-12 h-12 rounded-full ${gradient} flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-black/40`}>
        {/* Renderizamos el icono de Lucide de forma segura */}
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="text-gray-200 font-semibold text-base group-hover:text-white transition-colors">
        {texto}
      </div>
    </div>
  );
};

export default TarjetaCaracteristica;