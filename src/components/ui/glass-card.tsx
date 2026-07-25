import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dark glassmorphism panel matching the dashboard's navy aesthetic.
 * Use for Sage-style overlays, modals, and premium surfaces.
 */
export const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-white/10 bg-slate-900/60 text-slate-100 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl",
      className,
    )}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";
