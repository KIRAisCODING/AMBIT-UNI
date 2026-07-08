type TypeSelectorProps = {
  type: string;
  onTypeChange: (value: string) => void;
};

/**
 * Renders the Inbox item type selector.
 */
export default function TypeSelector({ type, onTypeChange }: TypeSelectorProps) {
  return (
    <label className="inline-flex items-center rounded-full border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] shadow-[var(--shadow-pill)] transition duration-300 ease-[var(--ease-out)] hover:bg-[var(--surface-container-high)]">
      <span className="mr-2">Task</span>
      <select value={type} onChange={(e) => onTypeChange(e.target.value)} className="bg-transparent pr-2 outline-none">
        <option value="task">Task</option>
        <option value="habit">Habit</option>
      </select>
    </label>
  );
}
