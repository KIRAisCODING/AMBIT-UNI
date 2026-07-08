import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div";
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  interactive?: boolean;
};

/**
 * Renders a reusable card surface.
 */
export function Card({
  as = "article",
  eyebrow,
  title,
  description,
  actions,
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  const Component = as;

  return (
    <Component
      className={cn(
        "rounded-[var(--radius-card)] bg-[var(--surface-lowest)] p-5 shadow-[var(--shadow-card)]",
        interactive &&
          "transition duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:bg-[var(--surface)] hover:shadow-[var(--shadow-float)]",
        className
      )}
      {...props}
    >
      {(eyebrow || title || description || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className="text-base font-semibold text-[var(--text)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Component>
  );
}
