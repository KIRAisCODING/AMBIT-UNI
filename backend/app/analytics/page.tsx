"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, Pill } from "@/components/ui";

type TaskItem = {
  id: string;
  content: string;
  completed?: boolean | null;
  type?: string;
};

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []));
  }, []);

  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  return (
    <AppLayout>
      <div className="flex h-full flex-col gap-6 rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-[color:var(--border)]/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Insights</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-4xl">Analytics</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">A lightweight overview of the current task pipeline and completion rate.</p>
          </div>
          <Pill>{rate}% complete</Pill>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card as="article" className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">Task completion</p>
            <h2 className="mt-3 text-4xl font-semibold text-[var(--text)]">{completed}/{total}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Completed tasks compared with the active workload.</p>
          </Card>

          <Card as="article" className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">Active items</p>
            <h2 className="mt-3 text-4xl font-semibold text-[var(--text)]">{total - completed}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Open work remaining for the current workspace.</p>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
