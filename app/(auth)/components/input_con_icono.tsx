import React from "react";

// 1. Definimos la interfaz para las propiedades del componente
interface InputConIconoProps {
  id: string;
  type: React.HTMLInputTypeAttribute; // Especifica tipos válidos de input (text, password, email, etc.)
  placeholder: string;
  Icon?: React.ElementType; // Permite pasar un componente de ícono (ej. de lucide-react o heroicons)
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Tipado exacto para el evento de cambio
  gradient?: string; // Es opcional porque tiene un valor por defecto
}

// 2. Asignamos la interfaz al componente funcional usando React.FC
const InputConIcono: React.FC<InputConIconoProps> = ({ 
  id, 
  type, 
  placeholder, 
  Icon, 
  value, 
  onChange, 
  gradient = "bg-gradient-to-br from-cyan-700 to-cyan-500" 
}) => {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-[rgba(240,244,255,0.4)] font-medium mb-1 ml-1 text-sm">
        {placeholder}
      </label>
      <div className="flex items-center border border-[rgba(6,182,212,0.08)] rounded-2xl px-4 py-3 bg-[#07080B] shadow-inner focus-within:ring-1 focus-within:ring-cyan-500 focus-within:border-cyan-500 transition-all duration-300 hover:border-[rgba(6,182,212,0.15)] group">
        
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${gradient} text-white mr-3 shadow-lg shadow-black/40 group-focus-within:scale-110 transition-transform`}>
          {/* Se renderiza el ícono solo si se pasa por las props */}
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        
        <input
          type={type}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          className="flex-1 outline-none text-white placeholder-gray-600 bg-transparent text-sm"
        />
      </div>
    </div>
  );
};

export default InputConIcono;