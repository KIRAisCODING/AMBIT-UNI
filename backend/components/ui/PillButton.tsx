import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: ReactNode;
};

/**
 * Renders a reusable pill button.
 */
export function PillButton({
  active = false,
  icon,
  className,
  children,
  type = "button",
  ...props
}: PillButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-[var(--shadow-pill)] transition duration-300 ease-[var(--ease-out)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "border-transparent bg-[var(--surface-container)] text-[var(--text-muted)] hover:bg-[var(--surface-container-high)] hover:text-[var(--text)]",
        className
      )}
      aria-pressed={active}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
