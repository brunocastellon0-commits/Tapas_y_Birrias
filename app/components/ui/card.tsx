import * as React from "react";
import { cn } from "../../utils/utils";

// Card principal
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        "w-full h-full bg-card text-card-foreground flex flex-col gap-4 rounded-xl border",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

// Card Header
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "px-6 pt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "CardHeader";

// Card Title (Usamos HTMLHeadingElement porque es un <h4>)
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4
      ref={ref}
      data-slot="card-title"
      className={cn("text-lg font-semibold leading-tight", className)}
      {...props}
    />
  )
);
Card.displayName = "CardTitle";

// Card Description (Usamos HTMLParagraphElement porque es un <p>)
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "CardDescription";

// Card Action
const CardAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn("self-start justify-self-end", className)}
      {...props}
    />
  )
);
Card.displayName = "CardAction";

// Card Content
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("px-6 pb-6 flex-1", className)}
      {...props}
    />
  )
);
Card.displayName = "CardContent";

// Card Footer
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 pt-4", className)}
      {...props}
    />
  )
);
Card.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};