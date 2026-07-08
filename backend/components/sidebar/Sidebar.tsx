"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ConfirmationModal from "@/components/ConfirmationModal";
import SidebarHeader from "./SidebarHeader";
import SidebarNavigation from "./SidebarNavigation";
import SidebarTree from "./SidebarTree";
import SidebarFooter from "./SidebarFooter";
import type { SidebarArea, SidebarCreateState, SidebarEditState, SidebarProject, SidebarSubProject, SidebarTask } from "./types";

type TaskCreatedEvent = CustomEvent<SidebarTask>;

/**
 * Renders the composed sidebar and owns its data, state, and modal behavior.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSubProjectId = searchParams.get("subProjectId");

  const [areas, setAreas] = useState<SidebarArea[]>([]);
  const [openArea, setOpenArea] = useState<string[]>([]);
  const [openProject, setOpenProject] = useState<string[]>([]);
  const [openSubProject, setOpenSubProject] = useState<string[]>([]);
  const [tasksBySubProject, setTasksBySubProject] = useState<Record<string, SidebarTask[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<Record<string, boolean>>({});
  const [menuId, setMenuId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"area" | "project" | "subProject" | null>(null);
  const [modalTarget, setModalTarget] = useState<{ id: string; name: string } | null>(null);
  const [modalCounts, setModalCounts] = useState({ projects: 0, subProjects: 0, tasks: 0 });
  const [creating, setCreating] = useState<SidebarCreateState | null>(null);
  const [editing, setEditing] = useState<SidebarEditState | null>(null);

  // Loads task rows for the selected subproject without changing app logic.
  const loadTasks = useCallback((subProjectId: string) => {
    setLoadingTasks((prev) => ({ ...prev, [subProjectId]: true }));

    fetch(`/api/tasks?subProjectId=${subProjectId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load tasks");
        return res.json();
      })
      .then((data) => {
        setTasksBySubProject((prev) => ({
          ...prev,
          [subProjectId]: Array.isArray(data) ? data : [],
        }));
      })
      .catch(() => {
        setTasksBySubProject((prev) => ({
          ...prev,
          [subProjectId]: [],
        }));
      })
      .finally(() => {
        setLoadingTasks((prev) => ({ ...prev, [subProjectId]: false }));
      });
  }, []);

  useEffect(() => {
    fetch("/api/sidebar")
      .then((res) => res.json())
      .then((data) => setAreas(Array.isArray(data) ? data : []))
      .catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    if (!activeSubProjectId || areas.length === 0) return;

    for (const area of areas) {
      for (const project of area.projects ?? []) {
        const subProject = (project.subProjects ?? []).find((sp) => sp.id === activeSubProjectId);

        if (subProject) {
          queueMicrotask(() => {
            setOpenArea((prev) => (prev.includes(area.id) ? prev : [...prev, area.id]));
            setOpenProject((prev) => (prev.includes(project.id) ? prev : [...prev, project.id]));
            setOpenSubProject((prev) => (prev.includes(subProject.id) ? prev : [...prev, subProject.id]));

            if (!tasksBySubProject[subProject.id]) {
              loadTasks(subProject.id);
            }
          });
          return;
        }
      }
    }
  }, [activeSubProjectId, areas, loadTasks, tasksBySubProject]);

  useEffect(() => {
    const handleTaskCreated = (event: Event) => {
      const item = (event as TaskCreatedEvent).detail;
      const subProjectId = item?.subProjectId;
      if (!subProjectId) return;

      setTasksBySubProject((prev) => {
        if (!prev[subProjectId]) return prev;

        return {
          ...prev,
          [subProjectId]: [item, ...prev[subProjectId]],
        };
      });
    };

    window.addEventListener("ambit:task-created", handleTaskCreated);

    return () => {
      window.removeEventListener("ambit:task-created", handleTaskCreated);
    };
  }, []);

  // Maintains the same expand/collapse behavior as the original component.
  const toggleId = (id: string, open: string[], setOpen: (value: string[]) => void) => {
    if (open.includes(id)) {
      setOpen(open.filter((item) => item !== id));
    } else {
      setOpen([...open, id]);
    }
  };

  const refreshSidebar = async () => {
    await router.refresh();
    setMenuId(null);
    setModalOpen(false);
    setModalType(null);
    setModalTarget(null);
  };

  const updateAreaName = (id: string, name: string) => {
    setAreas((prev) => prev.map((area) => (area.id === id ? { ...area, name } : area)));
  };

  const updateProjectName = (id: string, name: string) => {
    setAreas((prev) =>
      prev.map((area) => ({
        ...area,
        projects: (area.projects ?? []).map((project) => (project.id === id ? { ...project, name } : project)),
      }))
    );
  };

  const updateSubProjectName = (id: string, name: string) => {
    setAreas((prev) =>
      prev.map((area) => ({
        ...area,
        projects: (area.projects ?? []).map((project) => ({
          ...project,
          subProjects: (project.subProjects ?? []).map((subProject) => (subProject.id === id ? { ...subProject, name } : subProject)),
        })),
      }))
    );
  };

  const removeDeletedNode = () => {
    if (!modalType || !modalTarget) return;

    if (modalType === "area") {
      setAreas((prev) => prev.filter((area) => area.id !== modalTarget.id));
      return;
    }

    if (modalType === "project") {
      setAreas((prev) =>
        prev.map((area) => ({
          ...area,
          projects: (area.projects ?? []).filter((project) => project.id !== modalTarget.id),
        }))
      );
      return;
    }

    setAreas((prev) =>
      prev.map((area) => ({
        ...area,
        projects: (area.projects ?? []).map((project) => ({
          ...project,
          subProjects: (project.subProjects ?? []).filter((subProject) => subProject.id !== modalTarget.id),
        })),
      }))
    );
  };

  const openConfirmation = (
    type: "area" | "project" | "subProject",
    id: string,
    name: string,
    counts: { projects?: number; subProjects?: number; tasks?: number }
  ) => {
    setModalType(type);
    setModalTarget({ id, name });
    setModalCounts({ projects: counts.projects ?? 0, subProjects: counts.subProjects ?? 0, tasks: counts.tasks ?? 0 });
    setModalOpen(true);
  };

  const handleDeleteEverything = async () => {
    if (!modalType || !modalTarget) return;

    await fetch(`/api/${modalType === "area" ? "areas" : modalType === "project" ? "projects" : "subprojects"}/${modalTarget.id}?mode=delete`, {
      method: "DELETE",
    });

    removeDeletedNode();
    await refreshSidebar();
  };

  const handleMoveToUnassigned = async () => {
    if (!modalType || !modalTarget) return;

    await fetch(`/api/${modalType === "area" ? "areas" : modalType === "project" ? "projects" : "subprojects"}/${modalTarget.id}?mode=unassign`, {
      method: "DELETE",
    });

    removeDeletedNode();
    await refreshSidebar();
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setModalTarget(null);
  };

  const openAreaCounts = (area: SidebarArea) => {
    const projectCount = area.projects?.length ?? 0;
    const subProjectCount = (area.projects ?? []).reduce((total, project) => total + (project.subProjects?.length ?? 0), 0);
    const taskCount = (area.projects ?? []).reduce((total, project) => {
      return total + (project.subProjects ?? []).reduce((subTotal, subProject) => {
        return subTotal + (tasksBySubProject[subProject.id]?.length ?? 0);
      }, 0);
    }, 0);

    return { projects: projectCount, subProjects: subProjectCount, tasks: taskCount };
  };

  const openProjectCounts = (project: SidebarProject) => {
    const subProjectCount = project.subProjects?.length ?? 0;
    const taskCount = (project.subProjects ?? []).reduce((total, subProject) => {
      return total + (tasksBySubProject[subProject.id]?.length ?? 0);
    }, 0);

    return { subProjects: subProjectCount, tasks: taskCount };
  };

  const openSubProjectCounts = (subProject: SidebarSubProject) => ({ tasks: tasksBySubProject[subProject.id]?.length ?? 0 });

  const renameSubProject = async (id: string, name: string) => {
    if (!name.trim()) return;

    await fetch(`/api/subprojects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    updateSubProjectName(id, name.trim());
    await refreshSidebar();
  };

  const renameArea = async (id: string, name: string) => {
    if (!name.trim()) return;

    await fetch(`/api/areas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    updateAreaName(id, name.trim());
    await refreshSidebar();
  };

  const renameProject = async (id: string, name: string) => {
    if (!name.trim()) return;

    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    updateProjectName(id, name.trim());
    await refreshSidebar();
  };

  const startEditing = (type: "area" | "project" | "subProject", id: string, name: string) => {
    setEditing({ type, id, name });
    setCreating(null);
    setMenuId(null);
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const submitEditing = async () => {
    if (!editing) return;

    if (editing.type === "area") {
      await renameArea(editing.id, editing.name);
    } else if (editing.type === "project") {
      await renameProject(editing.id, editing.name);
    } else {
      await renameSubProject(editing.id, editing.name);
    }

    setEditing(null);
  };

  const startCreating = (type: "area" | "project" | "subProject", parentId?: string) => {
    setCreating({ type, parentId, name: "" });
    if (type === "project" && parentId) {
      setOpenArea((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
    }
    if (type === "subProject" && parentId) {
      setOpenProject((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
    }
    setMenuId(null);
  };

  const cancelCreating = () => {
    setCreating(null);
  };

  const submitCreating = async () => {
    if (!creating) return;

    const name = creating.name.trim();
    if (!name) return;

    if (creating.type === "area") {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const newArea = await res.json();
      setAreas((prev) => [...prev, { ...newArea, projects: [] }]);
      setCreating(null);
      router.refresh();
      return;
    }

    if (creating.type === "project" && creating.parentId) {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, areaId: creating.parentId }),
      });
      const newProject = await res.json();
      setAreas((prev) =>
        prev.map((area) =>
          area.id === creating.parentId
            ? { ...area, projects: [...(area.projects ?? []), { ...newProject, subProjects: [] }] }
            : area
        )
      );
      setOpenArea((prev) => (prev.includes(creating.parentId!) ? prev : [...prev, creating.parentId!]));
      setCreating(null);
      router.refresh();
      return;
    }

    if (creating.type === "subProject" && creating.parentId) {
      const res = await fetch("/api/subprojects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, projectId: creating.parentId }),
      });
      const newSubProject = await res.json();
      setAreas((prev) =>
        prev.map((area) => ({
          ...area,
          projects: (area.projects ?? []).map((project) =>
            project.id === creating.parentId
              ? { ...project, subProjects: [...(project.subProjects ?? []), newSubProject] }
              : project
          ),
        }))
      );
      setOpenProject((prev) => (prev.includes(creating.parentId!) ? prev : [...prev, creating.parentId!]));
      setCreating(null);
      router.refresh();
    }
  };

  const createInput = (placeholder: string, className = "mt-2") => (
    <div className={className}>
      <input
        autoFocus
        value={creating?.name ?? ""}
        onChange={(e) => setCreating((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            submitCreating();
          }
          if (e.key === "Escape") {
            cancelCreating();
          }
        }}
        onBlur={cancelCreating}
        className="w-full rounded-full border border-transparent bg-[var(--surface-container)] px-4 py-2 text-sm text-[var(--text)] outline-none transition focus:bg-[var(--surface-lowest)] focus:ring-2 focus:ring-[var(--primary)]/20"
        placeholder={placeholder}
      />
    </div>
  );

  const editInput = () => (
    <input
      autoFocus
      value={editing?.name ?? ""}
      onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          submitEditing();
        }
        if (e.key === "Escape") {
          cancelEditing();
        }
      }}
      onBlur={cancelEditing}
      className="w-full rounded-full border border-transparent bg-[var(--surface-container)] px-4 py-2 text-sm text-[var(--text)] outline-none transition focus:bg-[var(--surface-lowest)] focus:ring-2 focus:ring-[var(--primary)]/20"
    />
  );

  const deleteArea = (area: SidebarArea) => {
    openConfirmation("area", area.id, area.name, openAreaCounts(area));
  };

  const deleteProject = (project: SidebarProject) => {
    openConfirmation("project", project.id, project.name, openProjectCounts(project));
  };

  const deleteSubProject = (subProject: SidebarSubProject) => {
    openConfirmation("subProject", subProject.id, subProject.name, openSubProjectCounts(subProject));
  };

  const toggleSubProject = (subProjectId: string, areaId: string, projectId: string) => {
    const isOpening = !openSubProject.includes(subProjectId);

    toggleId(subProjectId, openSubProject, setOpenSubProject);

    if (isOpening && !tasksBySubProject[subProjectId]) {
      loadTasks(subProjectId);
    }

    router.push(`/tasks?areaId=${areaId}&projectId=${projectId}&subProjectId=${subProjectId}`);
  };

  const isInboxActive = pathname === "/" || pathname === "/tasks";
  const isUnassignedActive = pathname === "/unassigned";

  return (
    <>
      <aside className="flex h-screen w-[290px] shrink-0 flex-col bg-[var(--surface)] px-4 py-7">
        <SidebarHeader />
        <SidebarNavigation
          isInboxActive={isInboxActive}
          isUnassignedActive={isUnassignedActive}
          isHabitsActive={pathname === "/habits"}
          isCalendarActive={pathname === "/calendar"}
          isAnalyticsActive={pathname === "/analytics"}
          isSettingsActive={pathname === "/settings"}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">Knowledge Tree</p>
            </div>
            <button type="button" onClick={() => startCreating("area")} className="rounded-full px-2 py-1 text-sm font-normal text-[var(--text-muted)] transition hover:bg-[var(--surface-container)] hover:text-[var(--text)]">
              +
            </button>
          </div>

          {areas.length === 0 && !creating?.type ? (
            <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Define your first area to organize work.</div>
          ) : null}

          <SidebarTree
            areas={areas}
            openArea={openArea}
            openProject={openProject}
            openSubProject={openSubProject}
            tasksBySubProject={tasksBySubProject}
            loadingTasks={loadingTasks}
            creating={creating}
            editing={editing}
            menuId={menuId}
            activeSubProjectId={activeSubProjectId}
            createInput={createInput}
            editInput={editInput}
            onToggleNode={(id, kind) => {
              if (kind === "area") {
                toggleId(id, openArea, setOpenArea);
              } else if (kind === "project") {
                toggleId(id, openProject, setOpenProject);
              }
            }}
            onToggleSubProject={toggleSubProject}
            onStartCreating={startCreating}
            onStartEditing={startEditing}
            onToggleMenu={(id) => setMenuId((prev) => (prev === id ? null : id))}
            onDelete={(kind, item) => {
              if (kind === "area") {
                deleteArea(item as SidebarArea);
              } else if (kind === "project") {
                deleteProject(item as SidebarProject);
              } else {
                deleteSubProject(item as SidebarSubProject);
              }
            }}
            onLoadTasks={loadTasks}
          />
        </div>

        <SidebarFooter
          creatingArea={creating?.type === "area"}
          isUnassignedActive={isUnassignedActive}
          createInput={createInput}
          onStartCreating={() => startCreating("area")}
        />
      </aside>

      <ConfirmationModal
        open={modalOpen}
        title={
          modalType === "area"
            ? `Delete Area "${modalTarget?.name ?? ""}"`
            : modalType === "project"
            ? `Delete Project "${modalTarget?.name ?? ""}"`
            : `Delete SubProject "${modalTarget?.name ?? ""}"`
        }
        description={
          modalType === "area"
            ? "This will remove the selected area and its full hierarchy. You can also move its tasks to Unassigned."
            : modalType === "project"
            ? "This will remove the selected project and its child hierarchy. You can also move its tasks to Unassigned."
            : "This will remove the selected subproject. You can also move its tasks to Unassigned."
        }
        counts={modalCounts}
        onDeleteEverything={handleDeleteEverything}
        onMoveToUnassigned={handleMoveToUnassigned}
        onCancel={closeModal}
      />
    </>
  );
}
