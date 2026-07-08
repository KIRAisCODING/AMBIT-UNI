import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

/**
 * Renders the rounded page content container.
 */
export default function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="flex-1 overflow-hidden px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto flex h-full max-w-[1480px] flex-col rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.06)] sm:p-4">
        <div className="flex-1 overflow-hidden rounded-[28px] bg-[var(--surface-low)]/90 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:p-3">
          {children}
        </div>
      </div>
    </main>
  );
}
