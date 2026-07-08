import type { ReactNode } from "react";
import FolderItem from "./FolderItem";
import TreeConnector from "./TreeConnector";
import type { SidebarArea, SidebarProject, SidebarSubProject, SidebarTask, SidebarCreateState, SidebarEditState } from "./types";
import { FolderIcon } from "./icons";

type TreeNodeProps = {
  kind: "area" | "project" | "subproject";
  item: SidebarArea | SidebarProject | SidebarSubProject;
  depth: number;
  isLastChild: boolean;
  areaId?: string;
  projectId?: string;
  openArea: string[];
  openProject: string[];
  openSubProject: string[];
  tasksBySubProject: Record<string, SidebarTask[]>;
  loadingTasks: Record<string, boolean>;
  creating: SidebarCreateState | null;
  editing: SidebarEditState | null;
  menuId: string | null;
  activeSubProjectId: string | null;
  createInput: (placeholder: string, className?: string) => ReactNode;
  editInput: () => ReactNode;
  onToggleNode: (id: string, kind: "area" | "project" | "subproject") => void;
  onToggleSubProject: (subProjectId: string, areaId: string, projectId: string) => void;
  onStartCreating: (type: "area" | "project" | "subProject", parentId?: string) => void;
  onStartEditing: (type: "area" | "project" | "subProject", id: string, name: string) => void;
  onToggleMenu: (id: string) => void;
  onDelete: (kind: "area" | "project" | "subProject", item: SidebarArea | SidebarProject | SidebarSubProject) => void;
  onLoadTasks: (subProjectId: string) => void;
};

const iconButtonClassName =
  "flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--text)]";

const menuButtonClassName =
  "rounded-full bg-[var(--surface-container)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-container-high)] hover:text-[var(--text)]";

const dangerButtonClassName =
  "rounded-full bg-[var(--danger-soft)] px-3 py-1.5 text-xs font-medium text-[var(--danger)] transition hover:brightness-95";

/**
 * Recursively renders areas, projects, subprojects, and tasks.
 */
export default function TreeNode({
  kind,
  item,
  depth,
  isLastChild,
  areaId,
  projectId,
  openArea,
  openProject,
  openSubProject,
  tasksBySubProject,
  loadingTasks,
  creating,
  editing,
  menuId,
  activeSubProjectId,
  createInput,
  editInput,
  onToggleNode,
  onToggleSubProject,
  onStartCreating,
  onStartEditing,
  onToggleMenu,
  onDelete,
  onLoadTasks,
}: TreeNodeProps) {
  if (kind === "area") {
    const area = item as SidebarArea;
    const expanded = openArea.includes(area.id);
    const actions = (
      <>
        <button type="button" aria-label={`Add project to ${area.name}`} className={iconButtonClassName} onClick={() => onStartCreating("project", area.id)}>
          <span className="text-sm">+</span>
        </button>
        <button type="button" aria-label={`More actions for ${area.name}`} className={iconButtonClassName} onClick={() => onToggleMenu(area.id)}>
          <span className="text-sm">...</span>
        </button>
      </>
    );

    return (
      <div className="relative">
        <div className="flex items-start">
          {depth > 0 ? <TreeConnector isLastChild={isLastChild} level={1} /> : null}
          <div className="min-w-0 flex-1">
            <FolderItem icon={<FolderIcon />} title={area.name} expanded={expanded} depth={depth} onExpand={() => onToggleNode(area.id, "area")} actions={actions} />

            {menuId === area.id ? (
              <div className="mb-2 ml-8 flex flex-wrap gap-2">
                <button type="button" className={menuButtonClassName} onClick={() => onStartEditing("area", area.id, area.name)}>Rename</button>
                <button type="button" className={dangerButtonClassName} onClick={() => onDelete("area", area)}>Delete</button>
              </div>
            ) : null}

            {expanded ? (
              <div className="mt-1">
                {creating?.type === "project" && creating.parentId === area.id ? createInput("Project name", "mb-2") : null}
                {(area.projects ?? []).map((project, index) => (
                  <TreeNode
                    key={project.id}
                    kind="project"
                    item={project}
                    depth={depth + 1}
                    isLastChild={index === (area.projects ?? []).length - 1}
                    areaId={area.id}
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
                    onToggleNode={onToggleNode}
                    onToggleSubProject={onToggleSubProject}
                    onStartCreating={onStartCreating}
                    onStartEditing={onStartEditing}
                    onToggleMenu={onToggleMenu}
                    onDelete={onDelete}
                    onLoadTasks={onLoadTasks}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (kind === "project") {
    const project = item as SidebarProject;
    const expanded = openProject.includes(project.id);
    const actions = (
      <>
        <button type="button" aria-label={`Add sub-project to ${project.name}`} className={iconButtonClassName} onClick={() => onStartCreating("subProject", project.id)}>
          <span className="text-sm">+</span>
        </button>
        <button type="button" aria-label={`More actions for ${project.name}`} className={iconButtonClassName} onClick={() => onToggleMenu(project.id)}>
          <span className="text-sm">...</span>
        </button>
      </>
    );

    return (
      <div className="relative">
        <div className="flex items-start">
          <TreeConnector isLastChild={isLastChild} level={1} />
          <div className="min-w-0 flex-1">
            {editing?.type === "project" && editing.id === project.id ? <div className="flex-1 pr-2">{editInput()}</div> : <FolderItem icon={<FolderIcon />} title={project.name} expanded={expanded} depth={depth} onExpand={() => onToggleNode(project.id, "project")} actions={actions} />}

            {menuId === project.id ? (
              <div className="mb-2 ml-8 flex flex-wrap gap-2">
                <button type="button" className={menuButtonClassName} onClick={() => onStartEditing("project", project.id, project.name)}>Rename</button>
                <button type="button" className={dangerButtonClassName} onClick={() => onDelete("project", project)}>Delete</button>
              </div>
            ) : null}

            {expanded ? (
              <div className="mt-1">
                {creating?.type === "subProject" && creating.parentId === project.id ? createInput("Sub-project name", "mb-2") : null}
                {(project.subProjects ?? []).map((subProject, index) => (
                  <TreeNode
                    key={subProject.id}
                    kind="subproject"
                    item={subProject}
                    depth={depth + 1}
                    isLastChild={index === (project.subProjects ?? []).length - 1}
                    areaId={areaId}
                    projectId={project.id}
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
                    onToggleNode={onToggleNode}
                    onToggleSubProject={onToggleSubProject}
                    onStartCreating={onStartCreating}
                    onStartEditing={onStartEditing}
                    onToggleMenu={onToggleMenu}
                    onDelete={onDelete}
                    onLoadTasks={onLoadTasks}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const subProject = item as SidebarSubProject;
  const expanded = openSubProject.includes(subProject.id);
  const actions = (
    <button type="button" aria-label={`More actions for ${subProject.name}`} className={iconButtonClassName} onClick={() => onToggleMenu(subProject.id)}>
      <span className="text-sm">...</span>
    </button>
  );

  return (
    <div className="relative">
      <div className="flex items-start">
        <TreeConnector isLastChild={isLastChild} level={2} />
        <div className="min-w-0 flex-1">
          {editing?.type === "subProject" && editing.id === subProject.id ? <div className="flex-1 pr-2">{editInput()}</div> : <FolderItem icon={<FolderIcon />} title={subProject.name} expanded={expanded} depth={depth} active={activeSubProjectId === subProject.id} onExpand={() => onToggleSubProject(subProject.id, areaId ?? "", projectId ?? "")} actions={actions} />}

          {menuId === subProject.id ? (
            <div className="mb-2 ml-8 flex flex-wrap gap-2">
              <button type="button" className={menuButtonClassName} onClick={() => onStartEditing("subProject", subProject.id, subProject.name)}>Rename</button>
              <button type="button" className={dangerButtonClassName} onClick={() => onDelete("subProject", subProject)}>Delete</button>
            </div>
          ) : null}

          {expanded ? (
            <div className="mt-1">
              <div className="space-y-1 pt-1">
                {loadingTasks[subProject.id] ? (
                  <p className="text-sm text-[var(--text-muted)]">Loading tasks...</p>
                ) : (tasksBySubProject[subProject.id] ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No tasks in this sub-project yet.</p>
                ) : (
                  (tasksBySubProject[subProject.id] ?? []).map((task, taskIndex) => {
                    const isLastTask = taskIndex === (tasksBySubProject[subProject.id] ?? []).length - 1;

                    return (
                      <div key={task.id} className="flex items-start">
                        <TreeConnector isLastChild={isLastTask} level={3} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate rounded-[10px] bg-[var(--surface-container)] px-2 py-1.5 text-xs text-[var(--text-muted)]" title={task.content}>
                            {task.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
