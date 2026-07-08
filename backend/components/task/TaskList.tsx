"use client";

import { useEffect, useState } from "react";
import { Empty, Pill } from "@/components/ui";
import TaskCard from "./TaskCard";
import type { TaskItem } from "./types";

type TaskListProps = {
  subProjectId: string;
};

/**
 * Renders the task list for a selected subproject.
 */
export default function TaskList({ subProjectId }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subProjectId) {
      return;
    }

    const loadTasks = () => {
      setLoading(true);

      fetch(`/api/tasks?subProjectId=${subProjectId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load tasks");
          return res.json();
        })
        .then((data) => setTasks(Array.isArray(data) ? data : []))
        .catch(() => setTasks([]))
        .finally(() => setLoading(false));
    };

    loadTasks();

    const handleTaskCreated = (event: Event) => {
      const item = (event as CustomEvent).detail;
      if (item?.subProjectId === subProjectId) {
        loadTasks();
      }
    };

    window.addEventListener("ambit:task-created", handleTaskCreated);

    return () => {
      window.removeEventListener("ambit:task-created", handleTaskCreated);
    };
  }, [subProjectId]);

  if (!subProjectId) {
    return <Empty title="Select a subproject" description="Choose a subproject from the sidebar to view its tasks." className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]" />;
  }

  if (loading) {
    return (
      <div className="rounded-[32px] border border-[color:var(--border)]/70 bg-[var(--surface-lowest)] p-6 text-sm text-[var(--text-muted)] shadow-[var(--shadow-card)]">
        Loading tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return <Empty title="No tasks yet" description="Capture a task from the composer below and it will appear here." className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[color:var(--border)]/70 bg-[var(--surface-low)]/80 px-4 py-3 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">Active workspace</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Keep the subproject board and composer in sync as work progresses.</p>
        </div>
        <Pill>{tasks.length} task{tasks.length === 1 ? "" : "s"}</Pill>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDeleted={(id: string) => setTasks((prev) => prev.filter((item) => item.id !== id))} />
        ))}
      </div>
    </div>
  );
}
