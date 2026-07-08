"use client";

import AppLayout from "@/components/AppLayout";
import { Card, Button, Input, Pill } from "@/components/ui";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="flex h-full flex-col gap-6 rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-[color:var(--border)]/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Preferences</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-4xl">Settings</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Adjust your workspace defaults and personal preferences.</p>
          </div>
          <Pill>Ready</Pill>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card as="section" className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
            <h2 className="text-lg font-semibold text-[var(--text)]">Workspace defaults</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input label="Display name" defaultValue="Ambit" />
              <Input label="Default area" defaultValue="Work" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button>Save changes</Button>
            </div>
          </Card>

          <Card as="section" className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
            <h2 className="text-lg font-semibold text-[var(--text)]">Notifications</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">The backend remains the source of truth, and these settings are currently surfaced as a UI shell.</p>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
