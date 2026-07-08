"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, Empty, Pill } from "@/components/ui";

type Item = {
  id: string;
  content: string;
  scheduledDate?: string | null;
  type?: string;
  completed?: boolean;
};

export default function CalendarPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/inbox")
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }, []);

  return (
    <AppLayout>
      <div className="flex h-full flex-col gap-6 rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-[color:var(--border)]/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Planning</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-4xl">Calendar</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Upcoming and scheduled entries from the inbox and tasks.</p>
          </div>
          <Pill>{items.filter((item) => item.scheduledDate).length} scheduled</Pill>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.filter((item) => item.scheduledDate).length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <Empty title="No scheduled items" description="Schedule items from the inbox or task workspace to see them here." />
            </div>
          ) : (
            items.filter((item) => item.scheduledDate).map((item) => (
              <Card key={item.id} as="article" interactive className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">{item.scheduledDate}</p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">{item.content}</h2>
                <p className="mt-3 text-sm text-[var(--text-muted)]">{item.type ?? "Entry"}</p>
              </Card>
            ))
          )}
        </section>
      </div>
    </AppLayout>
  );
}
