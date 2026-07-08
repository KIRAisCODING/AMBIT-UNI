import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type IconButtonVariant = "default" | "ghost" | "dark";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const variantClasses: Record<IconButtonVariant, string> = {
  default: "border-transparent bg-[var(--surface-container)] text-[var(--text)] hover:bg-[var(--surface-container-high)]",
  ghost: "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-container)] hover:text-[var(--text)]",
  dark: "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:scale-105",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

/**
 * Renders a reusable icon button.
 */
export function IconButton({
  label,
  icon,
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition duration-300 ease-[var(--ease-out)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
