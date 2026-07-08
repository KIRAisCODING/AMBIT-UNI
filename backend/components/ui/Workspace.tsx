import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type WorkspaceProps = HTMLAttributes<HTMLDivElement> & {
  header?: ReactNode;
  sidebar?: ReactNode;
};

/**
 * Renders a reusable workspace surface.
 */
export function Workspace({
  header,
  sidebar,
  className,
  children,
  ...props
}: WorkspaceProps) {
  return (
    <div
      className={cn("min-h-full bg-[var(--bg)] text-[var(--text)]", className)}
      {...props}
    >
      {header}
      <div className="flex min-h-full">
        {sidebar}
        <main className="min-w-0 flex-1 px-6 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
