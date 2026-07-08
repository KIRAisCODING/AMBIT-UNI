import type { CreateHierarchyModalProps } from "./types";

/**
 * Renders a hierarchy creation modal.
 */
export default function CreateHierarchyModal({
  open,
  name,
  title,
  placeholder,
  onNameChange,
  onSubmit,
  onCancel,
}: CreateHierarchyModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[var(--radius-card)] bg-[var(--surface)] p-6 shadow-[var(--shadow-float)]">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
          className="w-full rounded-full border border-transparent bg-[var(--surface-container)] px-4 py-2 text-sm text-[var(--text)] outline-none transition focus:bg-[var(--surface-lowest)] focus:ring-2 focus:ring-[var(--primary)]/20"
          placeholder={placeholder}
        />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-full bg-[var(--surface-container)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--text)]">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition hover:scale-[1.02]">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
