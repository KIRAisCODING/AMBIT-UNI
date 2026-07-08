"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import InboxComposer from "@/components/InboxComposer";
import { Button, Card, Dropdown, Empty, Pill } from "@/components/ui";

type InboxItem = {
  id: string;
  content: string;
};

type AreaOption = {
  id: string;
  name: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type SubProjectOption = {
  id: string;
  name: string;
};

export default function UnassignedPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [subProjects, setSubProjects] = useState<SubProjectOption[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSubProject, setSelectedSubProject] = useState("");

  const loadItems = () => {
    fetch("/api/inbox")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load inbox");
        return res.json();
      })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    loadItems();

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

  const assignItem = async () => {
    if (!assigningId || !selectedArea || !selectedProject || !selectedSubProject) {
      return;
    }

    await fetch(`/api/inbox/${assigningId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        areaId: selectedArea,
        projectId: selectedProject,
        subProjectId: selectedSubProject,
      }),
    });

    setAssigningId(null);
    setSelectedArea("");
    setSelectedProject("");
    setSelectedSubProject("");

    loadItems();
  };

  return (
    <AppLayout>
      <div className="flex h-full flex-col gap-6 rounded-[32px] border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.05)] sm:p-8">
        <header className="flex flex-col gap-4 border-b border-[color:var(--border)]/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Planning</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--text)] sm:text-4xl">Unassigned</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Loose thoughts stay here until they are ready for an area, project, and subproject.</p>
          </div>

          <Pill>{items.length} item{items.length === 1 ? "" : "s"}</Pill>
        </header>

        <Card as="section" title="Quick capture" description="New entries stay unassigned until you place them." className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
          <div className="mx-auto w-full max-w-[780px]">
            <InboxComposer mode="unassigned" onCreated={loadItems} />
          </div>
        </Card>

        <section className="min-h-0 flex-1 space-y-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">Inbox stack</h2>
          </div>

          {items.length === 0 ? (
            <Empty title="Nothing waiting" description="Unassigned items will appear here after capture. This keeps the rest of Ambit clean until each item has a home." />
          ) : (
            items.map((item) => (
              <Card key={item.id} as="article" interactive className="border border-[color:var(--border)]/70 bg-[linear-gradient(135deg,var(--surface-lowest),var(--surface))]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Pill className="h-8 px-3 text-xs">Unassigned</Pill>
                    <p className="mt-4 text-base leading-7 text-[var(--text)]">{item.content}</p>
                  </div>

                  <Button onClick={() => setAssigningId(item.id)}>Assign</Button>
                </div>

                {assigningId === item.id && (
                  <div className="mt-5 rounded-[24px] border border-[color:var(--border)]/70 bg-[var(--surface-low)] p-4 shadow-[var(--shadow-card)]">
                    <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Choose destination</h3>

                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <Dropdown value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
                        <option value="">Area</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </Dropdown>

                      <Dropdown value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                        <option value="">Project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </Dropdown>

                      <Dropdown value={selectedSubProject} onChange={(e) => setSelectedSubProject(e.target.value)}>
                        <option value="">SubProject</option>
                        {subProjects.map((subProject) => (
                          <option key={subProject.id} value={subProject.id}>
                            {subProject.name}
                          </option>
                        ))}
                      </Dropdown>

                      <Button onClick={assignItem}>Confirm</Button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </section>
      </div>
    </AppLayout>
  );
}
