import type { ReactNode } from "react";

type WorkspaceProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

/**
 * Renders the full application workspace shell.
 */
export default function Workspace({ sidebar, children }: WorkspaceProps) {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.65),transparent_26%),var(--bg)] text-[var(--text)]">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
