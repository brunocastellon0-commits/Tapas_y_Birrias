import React, { ReactNode, MouseEventHandler } from "react";


interface BotonSocialProps {
  children: ReactNode; 
  onClick?: MouseEventHandler<HTMLButtonElement>; 
}


const BotonSocial = ({ children, onClick }: BotonSocialProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#111520] border border-[rgba(6,182,212,0.08)] shadow-lg shadow-black/40 hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:scale-110 transition-all duration-300 cursor-pointer group hover:bg-[#1C2133]"
    >
      {children}
    </button>
  );
};

export default BotonSocial;