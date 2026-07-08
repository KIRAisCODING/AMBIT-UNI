import type { ReactNode } from "react";
import TreeNode from "./TreeNode";
import type { SidebarArea, SidebarCreateState, SidebarEditState, SidebarProject, SidebarSubProject, SidebarTask } from "./types";

type SidebarTreeProps = {
  areas: SidebarArea[];
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

/**
 * Renders the full area/project/subproject hierarchy.
 */
export default function SidebarTree(props: SidebarTreeProps) {
  return (
    <div className="space-y-1">
      {props.areas.map((area, index) => (
        <TreeNode
          key={area.id}
          kind="area"
          item={area}
          depth={0}
          isLastChild={index === props.areas.length - 1}
          openArea={props.openArea}
          openProject={props.openProject}
          openSubProject={props.openSubProject}
          tasksBySubProject={props.tasksBySubProject}
          loadingTasks={props.loadingTasks}
          creating={props.creating}
          editing={props.editing}
          menuId={props.menuId}
          activeSubProjectId={props.activeSubProjectId}
          createInput={props.createInput}
          editInput={props.editInput}
          onToggleNode={props.onToggleNode}
          onToggleSubProject={props.onToggleSubProject}
          onStartCreating={props.onStartCreating}
          onStartEditing={props.onStartEditing}
          onToggleMenu={props.onToggleMenu}
          onDelete={props.onDelete}
          onLoadTasks={props.onLoadTasks}
        />
      ))}
    </div>
  );
}
