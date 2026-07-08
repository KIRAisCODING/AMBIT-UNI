import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

/**
 * Renders a reusable text/date input field.
 */
export function Input({ label, hint, className, id, ...props }: InputProps) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
          {label}
        </span>
      ) : null}
      <input
        id={id}
        className={cn(
          "h-12 w-full rounded-[999px] border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-5 text-sm text-[var(--text)] outline-none transition duration-300 ease-[var(--ease-out)] placeholder:text-[var(--text-subtle)] focus:bg-[var(--surface-lowest)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {hint ? <span className="mt-1.5 block text-xs text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
}
