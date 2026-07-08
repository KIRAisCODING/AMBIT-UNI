import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type BadgeTone = "neutral" | "warm" | "success" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  leadingIcon?: ReactNode;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-[var(--surface-container)] text-[var(--text-muted)]",
  warm: "bg-[var(--surface-container-highest)] text-[var(--text)]",
  success: "bg-[#dce9d7] text-[#526b45]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

/**
 * Renders a small badge.
 */
export function Badge({ tone = "neutral", leadingIcon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", toneClasses[tone], className)} {...props}>
      {leadingIcon}
      {children}
    </span>
  );
}
