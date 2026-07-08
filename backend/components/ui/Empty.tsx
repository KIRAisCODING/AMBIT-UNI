import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type EmptyProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
};

/**
 * Renders an empty-state message.
 */
export function Empty({ title, description, className, children, ...props }: EmptyProps) {
  return (
    <div className={cn("rounded-[var(--radius-card)] bg-[var(--surface-lowest)] p-8 text-center shadow-[var(--shadow-card)]", className)} {...props}>
      {title ? <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3> : null}
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
      {children}
    </div>
  );
}
