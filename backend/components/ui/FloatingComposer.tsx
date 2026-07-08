import type { FormHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type FloatingComposerProps = FormHTMLAttributes<HTMLFormElement> & {
  header?: ReactNode;
  footer?: ReactNode;
};

/**
 * Renders a reusable floating composer form.
 */
export function FloatingComposer({
  header,
  footer,
  className,
  children,
  ...props
}: FloatingComposerProps) {
  return (
    <form
      className={cn(
        "rounded-[var(--radius-card)] bg-[var(--surface-lowest)] p-5 shadow-[var(--shadow-float)]",
        className
      )}
      {...props}
    >
      {header && <div className="mb-4">{header}</div>}
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-4 flex items-center justify-end gap-3">{footer}</div>}
    </form>
  );
}
