import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  label: ReactNode;
};

/**
 * Renders a hover tooltip wrapper.
 */
export function Tooltip({ label, className, children, ...props }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)} {...props}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--primary)] px-2 py-1 text-xs text-[var(--primary-foreground)] opacity-0 shadow-sm transition group-hover:opacity-100">
        {label}
      </span>
    </span>
  );
}
