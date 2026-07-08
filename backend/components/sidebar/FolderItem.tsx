import type { ReactNode } from "react";
import { ChevronIcon } from "./icons";

type FolderItemProps = {
  icon: ReactNode;
  title: string;
  expanded: boolean;
  depth: number;
  active?: boolean;
  taskCount?: number;
  actions?: ReactNode;
  onExpand: () => void;
};

/**
 * Renders one folder row in the sidebar hierarchy.
 */
export default function FolderItem({ icon, title, expanded, depth, active, taskCount, actions, onExpand }: FolderItemProps) {
  return (
    <div className="space-y-1">
      <div className="group relative flex items-center rounded-xl px-2 py-1.5 transition duration-300 ease-[var(--ease-out)] hover:bg-[var(--surface-container)]">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 12}px` }}>
          <button type="button" className="flex h-6 w-6 items-center justify-center text-[var(--text-muted)]" onClick={onExpand}>
            <ChevronIcon open={expanded} />
          </button>
          <span className="flex h-6 w-6 items-center justify-center text-[var(--text-muted)]">{icon}</span>
        </div>

        <button type="button" className={`ml-1 flex flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left ${active ? "bg-[var(--surface-container-highest)]" : ""}`} onClick={onExpand}>
          <span className="truncate text-sm font-medium text-[var(--text)]">{title}</span>
          {taskCount !== undefined ? <span className="text-xs text-[var(--text-subtle)]">{taskCount}</span> : null}
        </button>

        {actions ? <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">{actions}</div> : null}
      </div>
    </div>
  );
}
