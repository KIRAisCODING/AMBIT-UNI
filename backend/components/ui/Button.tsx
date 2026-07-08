import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import { Pill } from "./Pill";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:scale-[1.02]",
  secondary: "border-transparent bg-[var(--surface-container)] text-[var(--text)] hover:bg-[var(--surface-container-high)]",
  ghost: "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-container)] hover:text-[var(--text)]",
  icon: "border-transparent bg-[var(--surface-container)] text-[var(--text)] hover:bg-[var(--surface-container-high)]",
  danger: "border-transparent bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[#f4c8c2]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-xs",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-7 text-sm",
};

/**
 * Renders a reusable button.
 */
export function Button({
  className,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <Pill
      as="button"
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border font-semibold shadow-[var(--shadow-pill)] transition duration-300 ease-[var(--ease-out)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </Pill>
  );
}
