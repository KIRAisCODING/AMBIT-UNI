"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import TaskList from "@/components/TaskList";
import InboxComposer from "@/components/InboxComposer";
import WorkspaceCard from "@/components/WorkspaceCard";

function TasksContent() {
  const searchParams = useSearchParams();
  const areaId = searchParams.get("areaId") ?? "";
  const projectId = searchParams.get("projectId") ?? "";
  const subProjectId = searchParams.get("subProjectId") ?? "";

  return (
    <WorkspaceCard
      title="Tasks"
      subtitle="The active subproject workspace. Capture stays contextual here."
      footer={
        <div className="mx-auto w-full max-w-[780px]">
          <InboxComposer
            mode="subproject"
            areaId={areaId}
            projectId={projectId}
            subProjectId={subProjectId}
          />
        </div>
      }
      className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]"
    >
      <TaskList subProjectId={subProjectId} />
    </WorkspaceCard>
  );
}

export default function TasksPage() {
  return (
    <AppLayout>
      <Suspense fallback={<WorkspaceCard title="Tasks">Loading tasks...</WorkspaceCard>}>
        <TasksContent />
      </Suspense>
    </AppLayout>
  );
}
