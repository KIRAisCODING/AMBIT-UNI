import type { HierarchyCardProps } from "./types";

/**
 * Renders one hierarchy card surface.
 */
export default function HierarchyCard({ name, description, actions, children }: HierarchyCardProps) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--surface-lowest)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--text)]">{name}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
