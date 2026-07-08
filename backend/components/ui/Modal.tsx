import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ModalProps = HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
};

/**
 * Renders a reusable modal dialog.
 */
export function Modal({
  open,
  title,
  description,
  footer,
  className,
  children,
  ...props
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "w-full max-w-md rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]",
          className
        )}
        {...props}
      >
        {(title || description) && (
          <div className="mb-5">
            {title && (
              <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
            )}
            {description && (
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
