"use client";


import React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../../utils/utils";

// 1. Tipamos extrayendo los props originales de Radix UI con React.ComponentProps

// Root
const Avatar = ({ 
  className, 
  children, 
  ...props 
}: React.ComponentProps<typeof AvatarPrimitive.Root>) => {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </AvatarPrimitive.Root>
  );
};

// Image
const AvatarImage = ({ 
  className, 
  ...props 
}: React.ComponentProps<typeof AvatarPrimitive.Image>) => {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
};

// Fallback
const AvatarFallback = ({ 
  className, 
  children, 
  ...props 
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) => {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  );
};

export { Avatar, AvatarImage, AvatarFallback };