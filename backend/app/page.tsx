"use client";

import AppLayout from "@/components/AppLayout";
import InboxComposer from "@/components/InboxComposer";
import WorkspaceCard from "@/components/WorkspaceCard";

export default function Home() {
  return (
    <AppLayout>
      <WorkspaceCard
        footer={
          <div className="mx-auto w-full max-w-[760px]">
            <InboxComposer mode="global" />
          </div>
        }
      >
        <div className="relative flex h-full min-h-[60vh] items-center justify-center overflow-hidden rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface-container))] px-6 py-12 text-center shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:px-10">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:40px_40px]" />
          <div className="relative z-10 max-w-xl animate-[ambit-fade-in_0.8s_var(--ease-out)_forwards]">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-lowest)] text-[var(--primary)] shadow-[var(--shadow-pill)]">
              <span className="text-3xl font-semibold">✦</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-normal text-[var(--primary)] sm:text-4xl">
              Clear Your Mind
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--text-muted)] sm:text-lg">
              A quiet space for important thoughts before they find their place in your external brain.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--text-subtle)]">
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-lowest)] px-3 py-1.5 shadow-[var(--shadow-pill)]">Capture fast</span>
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-lowest)] px-3 py-1.5 shadow-[var(--shadow-pill)]">Assign later</span>
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-lowest)] px-3 py-1.5 shadow-[var(--shadow-pill)]">Stay organized</span>
            </div>
          </div>
        </div>
      </WorkspaceCard>
    </AppLayout>
  );
}
