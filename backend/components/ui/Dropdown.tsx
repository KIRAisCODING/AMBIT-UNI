import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

type DropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
};

/**
 * Renders a reusable dropdown field.
 */
export function Dropdown({
  label,
  hint,
  className,
  id,
  children,
  ...props
}: DropdownProps) {
  return (
    <label className="block">
      {label && (
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
          {label}
        </span>
      )}
      <select
        id={id}
        className={cn(
          "h-12 w-full rounded-[999px] border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-5 text-sm text-[var(--text)] outline-none transition duration-300 ease-[var(--ease-out)] focus:bg-[var(--surface-lowest)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {hint && <span className="mt-1.5 block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
