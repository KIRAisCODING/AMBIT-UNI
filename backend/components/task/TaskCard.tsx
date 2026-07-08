"use client";

import { useState } from "react";
import TaskEditor from "./TaskEditor";
import type { TaskItem } from "./types";
import { Button, Card, Input, Pill } from "@/components/ui";

type TaskCardProps = {
  task: TaskItem;
  onDeleted?: (id: string) => void;
};

/**
 * Renders one task card and owns task edit state.
 */
export default function TaskCard({ task, onDeleted }: TaskCardProps) {
  const [description, setDescription] = useState(task.task?.description || "");
  const [deadline, setDeadline] = useState(task.task?.deadline?.split("T")[0] || "");
  const [completed, setCompleted] = useState(task.task?.completed || false);
  const [title, setTitle] = useState(task.content);

  const renameTask = async () => {
    await fetch(`/api/tasks/${task.id}/rename`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: title,
      }),
    });
  };

  const deleteTask = async () => {
    const confirmed = confirm("Delete task?");

    if (!confirmed) return;

    await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
    });

    onDeleted?.(task.id);
  };

  const save = async () => {
    await fetch("/api/tasks/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inboxItemId: task.id,
        description,
        deadline,
        completed,
      }),
    });
  };

  return (
    <Card className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]" interactive>
      <div className="mb-5 flex flex-col gap-4 rounded-[24px] border border-[color:var(--border)]/60 bg-[var(--surface-low)]/80 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="h-8 px-3 text-[11px]">Task</Pill>
            <Pill className={`h-8 px-3 text-[11px] ${completed ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--surface-container)] text-[var(--text-muted)]"}`}>
              {completed ? "Completed" : "Active"}
            </Pill>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold sm:flex-1" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={renameTask} variant="secondary" size="sm">
            Rename
          </Button>

          <Button onClick={deleteTask} variant="danger" size="sm">
            Delete
          </Button>
        </div>
      </div>

      <TaskEditor
        description={description}
        deadline={deadline}
        completed={completed}
        onDescriptionChange={setDescription}
        onDeadlineChange={setDeadline}
        onCompletedChange={setCompleted}
        onSave={save}
      />
    </Card>
  );
}
