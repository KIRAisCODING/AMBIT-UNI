"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import WorkspaceCard from "@/components/WorkspaceCard";
import { Button, Card, Input, Pill, Textarea } from "@/components/ui";

type TaskDetails = {
  description?: string | null;
  deadline?: string | null;
  completed?: boolean | null;
};

export default function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadTask = async () => {
      const { id } = await params;
      const res = await fetch(`/api/tasks/${id}`);
      const data = (await res.json()) as TaskDetails | null;

      if (!isActive || !data) return;

      setDescription(data.description || "");
      setDeadline(data.deadline ? data.deadline.split("T")[0] : "");
      setCompleted(data.completed || false);
    };

    loadTask();

    return () => {
      isActive = false;
    };
  }, [params]);

  const saveTask = async () => {
    const { id } = await params;

    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        deadline,
        completed,
      }),
    });
  };

  return (
    <AppLayout>
      <WorkspaceCard title="Task Details" subtitle="Refine the task metadata without leaving the Ambit workspace.">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Card className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]" as="section">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">Task metadata</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Keep notes, deadlines, and completion state aligned with the rest of your workspace.</p>
              </div>
              <Pill className={`h-9 px-3 text-xs ${completed ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--surface-container)] text-[var(--text-muted)]"}`}>
                {completed ? "Completed" : "In progress"}
              </Pill>
            </div>

            <div className="space-y-4">
              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="min-h-48"
              />

              <Input
                label="Deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="max-w-xs"
              />

              <label className="inline-flex w-fit items-center gap-3 rounded-full border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] shadow-[var(--shadow-pill)]">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Completed
              </label>
            </div>
          </Card>

          <Button onClick={saveTask} className="w-fit">
            Save
          </Button>
        </div>
      </WorkspaceCard>
    </AppLayout>
  );
}
