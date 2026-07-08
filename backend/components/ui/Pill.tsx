import type { ReactNode } from "react";
import { cn } from "./cn";

type PillBaseProps = {
  active?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type PillAsSpan = {
  as?: "span";
} & PillBaseProps & React.HTMLAttributes<HTMLSpanElement>;

type PillAsButton = {
  as: "button";
} & PillBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

type PillAsAnchor = {
  as: "a";
} & PillBaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type PillProps = PillAsSpan | PillAsButton | PillAsAnchor;

/**
 * Renders a compact pill label.
 */
export function Pill({
  as = "span",
  active = false,
  icon,
  className,
  children,
  ...props
}: PillProps) {
  const Component = as as any;

  return (
    <Component
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-transparent bg-[var(--surface-container)] px-6 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-pill)] transition duration-300 ease-[var(--ease-out)]",
        active && "bg-[var(--primary)] text-[var(--primary-foreground)]",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </Component>
  );
}
