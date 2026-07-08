import type { ReactNode } from "react";

type WorkspaceCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Renders the workspace content card.
 */
export default function WorkspaceCard({
  title,
  subtitle,
  children,
  footer,
  className = "",
}: WorkspaceCardProps) {
  return (
    <section className={`flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-lowest)] shadow-[var(--shadow-card)] ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-[var(--surface-container)] px-6 py-5 sm:px-8">
          {title ? (
            <h2 className="text-2xl font-semibold tracking-normal text-[var(--text)]">
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8">{children}</div>

      {footer ? <div className="border-t border-[var(--surface-container)] px-6 py-6 sm:px-8">{footer}</div> : null}
    </section>
  );
}
