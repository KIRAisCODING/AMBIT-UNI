"use client";

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  description: string;
  counts: {
    projects?: number;
    subProjects?: number;
    tasks?: number;
  };
  onDeleteEverything: () => Promise<void> | void;
  onMoveToUnassigned: () => Promise<void> | void;
  onCancel: () => void;
};

/**
 * Renders the destructive hierarchy confirmation modal.
 */
export default function ConfirmationModal({
  open,
  title,
  description,
  counts,
  onDeleteEverything,
  onMoveToUnassigned,
  onCancel,
}: ConfirmationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>

        <div className="mt-4 space-y-2 rounded-[var(--radius-panel)] bg-[var(--surface-container)] p-4 text-sm text-[var(--text-muted)]">
          {typeof counts.projects === "number" && <div>Projects: {counts.projects}</div>}
          {typeof counts.subProjects === "number" && <div>SubProjects: {counts.subProjects}</div>}
          {typeof counts.tasks === "number" && <div>Tasks: {counts.tasks}</div>}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-full bg-[var(--surface-container)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--text)]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--surface-container-highest)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:brightness-95"
            onClick={onMoveToUnassigned}
          >
            Move Tasks To Unassigned
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--danger)] transition hover:brightness-95"
            onClick={onDeleteEverything}
          >
            Delete Everything
          </button>
        </div>
      </div>
    </div>
  );
}
