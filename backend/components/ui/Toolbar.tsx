import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
  leading?: ReactNode;
  trailing?: ReactNode;
};

/**
 * Renders a reusable toolbar.
 */
export function Toolbar({
  leading,
  trailing,
  className,
  children,
  ...props
}: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex min-h-12 flex-col gap-3 border-b border-[var(--surface-container)] bg-[var(--surface-low)]/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">{leading ?? children}</div>
      {trailing && <div className="flex items-center gap-2">{trailing}</div>}
    </div>
  );
}
