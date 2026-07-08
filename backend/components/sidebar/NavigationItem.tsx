import Link from "next/link";
import type { ReactNode } from "react";

type NavigationItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
};

/**
 * Renders one navigation row for the sidebar.
 */
export default function NavigationItem({ icon, label, active, onClick, href }: NavigationItemProps) {
  const baseClassName = "flex h-11 items-center gap-3 rounded-xl px-4 py-2 transition duration-300 ease-[var(--ease-out)]";
  const activeClassName = "bg-[var(--surface-container-highest)] text-[var(--text)]";
  const idleClassName = "text-[var(--text-muted)] hover:bg-[var(--surface-container)] hover:text-[var(--text)]";

  const content = (
    <>
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseClassName} ${active ? activeClassName : idleClassName}`}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${baseClassName} w-full ${active ? activeClassName : idleClassName}`}>
      {content}
    </button>
  );
}
