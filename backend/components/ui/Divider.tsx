import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Renders a visual divider.
 */
export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("border-0 border-t border-[var(--surface-container)]", className)} {...props} />;
}
