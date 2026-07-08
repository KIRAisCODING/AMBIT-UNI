"use client";

import { useEffect, useState } from "react";
import ComposerInput from "./inbox/ComposerInput";
import SendButton from "./inbox/SendButton";
import Toolbar from "./inbox/Toolbar";
import type { AreaOption, InboxMode, ProjectOption, SubProjectOption } from "./inbox/types";

type InboxComposerProps = {
  mode?: InboxMode;
  areaId?: string;
  projectId?: string;
  subProjectId?: string;
  onCreated?: () => void;
};

/**
 * Renders the Inbox composer and owns item creation behavior.
 */
export default function InboxComposer({ mode, areaId, projectId, subProjectId, onCreated }: InboxComposerProps) {
  const effectiveMode: InboxMode = mode ?? (subProjectId ? "subproject" : "global");

  const [content, setContent] = useState("");
  const [type, setType] = useState("task");
  const [assignNow, setAssignNow] = useState(effectiveMode === "subproject");
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [subProjects, setSubProjects] = useState<SubProjectOption[]>([]);
  const [selectedArea, setSelectedArea] = useState(areaId || "");
  const [selectedProject, setSelectedProject] = useState(projectId || "");
  const [selectedSubProject, setSelectedSubProject] = useState(subProjectId || "");

  useEffect(() => {
    fetch("/api/areas")
      .then((res) => res.json())
      .then(setAreas);
  }, []);

  useEffect(() => {
    if (!selectedArea) return;

    fetch(`/api/projects?areaId=${selectedArea}`)
      .then((res) => res.json())
      .then(setProjects);
  }, [selectedArea]);

  useEffect(() => {
    if (!selectedProject) return;

    fetch(`/api/subprojects?projectId=${selectedProject}`)
      .then((res) => res.json())
      .then(setSubProjects);
  }, [selectedProject]);

  // Creates an Inbox item while preserving the current assignment rules.
  const createItem = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    const assigned = effectiveMode === "subproject" ? true : effectiveMode === "unassigned" ? false : assignNow;
    const finalAreaId = effectiveMode === "subproject" ? areaId : assignNow ? selectedArea : null;
    const finalProjectId = effectiveMode === "subproject" ? projectId : assignNow ? selectedProject : null;
    const finalSubProjectId = effectiveMode === "subproject" ? subProjectId : assignNow ? selectedSubProject : null;

    const res = await fetch("/api/inbox", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: trimmedContent,
        type,
        assigned,
        areaId: assigned ? finalAreaId : null,
        projectId: assigned ? finalProjectId : null,
        subProjectId: assigned ? finalSubProjectId : null,
      }),
    });

    const newItem = await res.json();
    setContent("");
    onCreated?.();
    window.dispatchEvent(
      new CustomEvent("ambit:task-created", {
        detail: newItem,
      })
    );
  };

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-3 rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:p-4">
      <Toolbar
        effectiveMode={effectiveMode}
        assignNow={assignNow}
        type={type}
        areas={areas}
        projects={projects}
        subProjects={subProjects}
        selectedArea={selectedArea}
        selectedProject={selectedProject}
        selectedSubProject={selectedSubProject}
        onToggleAssignNow={() => setAssignNow(!assignNow)}
        onTypeChange={setType}
        onAreaChange={(value) => {
          setSelectedArea(value);
          setSelectedProject("");
          setSelectedSubProject("");
        }}
        onProjectChange={(value) => {
          setSelectedProject(value);
          setSelectedSubProject("");
        }}
        onSubProjectChange={setSelectedSubProject}
      />

      <ComposerInput content={content} onContentChange={setContent} />

      <SendButton
        onClick={createItem}
        disabled={
          !content.trim() ||
          (effectiveMode === "subproject" && (!areaId || !projectId || !subProjectId)) ||
          (effectiveMode === "global" && assignNow && (!selectedArea || !selectedProject || !selectedSubProject))
        }
      />
    </section>
  );
}
