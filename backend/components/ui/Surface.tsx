import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type SurfaceTone = "default" | "muted" | "sunken";
type SurfacePadding = "none" | "sm" | "md" | "lg";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
};

const toneClasses: Record<SurfaceTone, string> = {
  default: "bg-[var(--surface-lowest)] shadow-[var(--shadow-card)]",
  muted: "bg-[var(--surface-container)]",
  sunken: "bg-[var(--surface-low)] shadow-inner",
};

const paddingClasses: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

/**
 * Renders a reusable surface.
 */
export function Surface({
  tone = "default",
  padding = "md",
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)]",
        toneClasses[tone],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
