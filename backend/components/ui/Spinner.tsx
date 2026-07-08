import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Renders a loading spinner.
 */
export function Spinner({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("h-5 w-5 animate-spin rounded-full border-2 border-[var(--surface-container-high)] border-t-[var(--primary)]", className)}
      {...props}
    />
  );
}
