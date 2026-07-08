import { ChevronIcon } from "./icons";

/**
 * Renders the top header content for the sidebar.
 */
export default function SidebarHeader() {
  return (
    <div className="mb-8 flex items-center justify-between px-2">
      <h2 className="text-xl font-bold leading-none tracking-normal text-[var(--primary)]">AMBIT</h2>
      <button type="button" aria-label="Toggle sidebar" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-container)] hover:text-[var(--text)]">
        <ChevronIcon open={false} />
      </button>
    </div>
  );
}
