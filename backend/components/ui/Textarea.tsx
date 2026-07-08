import type { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
};

/**
 * Renders a reusable textarea field.
 */
export function Textarea({
  label,
  hint,
  className,
  id,
  ...props
}: TextareaProps) {
  return (
    <label className="block">
      {label && (
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
          {label}
        </span>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full resize-none rounded-[24px] border border-[color:var(--border)]/70 bg-[var(--surface-low)] p-5 text-sm leading-6 text-[var(--text)] outline-none transition duration-300 ease-[var(--ease-out)] placeholder:text-[var(--text-subtle)] focus:bg-[var(--surface-lowest)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {hint && <span className="mt-1.5 block text-xs text-[var(--text-muted)]">{hint}</span>}
    </label>
  );
}
