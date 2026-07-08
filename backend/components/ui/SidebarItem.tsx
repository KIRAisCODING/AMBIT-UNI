import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type SidebarItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  depth?: 0 | 1 | 2;
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
};

const depthClasses: Record<NonNullable<SidebarItemProps["depth"]>, string> = {
  0: "pl-3",
  1: "pl-6",
  2: "pl-9",
};

/**
 * Renders a reusable sidebar item row.
 */
export function SidebarItem({
  active = false,
  depth = 0,
  leadingIcon,
  trailingAction,
  className,
  children,
  type = "button",
  ...props
}: SidebarItemProps) {
  return (
    <div className="group flex items-center gap-1">
      <button
        type={type}
        className={cn(
          "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl pr-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
          depthClasses[depth],
          active
            ? "bg-[var(--surface-container-highest)] font-semibold text-[var(--text)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-container)] hover:text-[var(--text)]",
          className
        )}
        {...props}
      >
        {leadingIcon}
        <span className="truncate">{children}</span>
      </button>
      {trailingAction && (
        <div className="opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {trailingAction}
        </div>
      )}
    </div>
  );
}
