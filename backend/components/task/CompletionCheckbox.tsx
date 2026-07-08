type CompletionCheckboxProps = {
  completed: boolean;
  onCompletedChange: (value: boolean) => void;
};

/**
 * Renders the task completion checkbox.
 */
export default function CompletionCheckbox({ completed, onCompletedChange }: CompletionCheckboxProps) {
  return (
    <div>
      <label className="inline-flex items-center gap-3 rounded-full border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] shadow-[var(--shadow-pill)]">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => onCompletedChange(e.target.checked)}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Completed
      </label>
    </div>
  );
}
