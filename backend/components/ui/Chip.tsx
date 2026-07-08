import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ChipTone = "neutral" | "warm" | "success" | "danger";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  leadingIcon?: ReactNode;
};

const toneClasses: Record<ChipTone, string> = {
  neutral: "bg-[var(--surface-container)] text-[var(--text-muted)]",
  warm: "bg-[var(--surface-container-highest)] text-[var(--text)]",
  success: "bg-[#dce9d7] text-[#526b45]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

/**
 * Renders a reusable chip label.
 */
export function Chip({
  tone = "neutral",
  leadingIcon,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {leadingIcon}
      {children}
    </span>
  );
}
