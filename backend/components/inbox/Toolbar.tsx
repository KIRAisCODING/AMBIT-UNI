import AssignmentSelector from "./AssignmentSelector";
import TypeSelector from "./TypeSelector";
import type { AreaOption, InboxMode, ProjectOption, SubProjectOption } from "./types";

type ToolbarProps = {
  effectiveMode: InboxMode;
  assignNow: boolean;
  type: string;
  areas: AreaOption[];
  projects: ProjectOption[];
  subProjects: SubProjectOption[];
  selectedArea: string;
  selectedProject: string;
  selectedSubProject: string;
  onToggleAssignNow: () => void;
  onTypeChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onSubProjectChange: (value: string) => void;
};

/**
 * Renders the Inbox composer toolbar.
 */
export default function Toolbar({
  effectiveMode,
  assignNow,
  type,
  areas,
  projects,
  subProjects,
  selectedArea,
  selectedProject,
  selectedSubProject,
  onToggleAssignNow,
  onTypeChange,
  onAreaChange,
  onProjectChange,
  onSubProjectChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[24px] border border-[color:var(--border)]/60 bg-[var(--surface-low)]/70 p-2">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto hide-scrollbar">
        {effectiveMode === "global" && assignNow ? (
          <AssignmentSelector
            areas={areas}
            projects={projects}
            subProjects={subProjects}
            selectedArea={selectedArea}
            selectedProject={selectedProject}
            selectedSubProject={selectedSubProject}
            onAreaChange={onAreaChange}
            onProjectChange={onProjectChange}
            onSubProjectChange={onSubProjectChange}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto hide-scrollbar">
        {effectiveMode === "global" ? (
          <button
            onClick={onToggleAssignNow}
            className="inline-flex items-center rounded-full border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] shadow-[var(--shadow-pill)] transition duration-300 ease-[var(--ease-out)] hover:bg-[var(--surface-container-high)] hover:text-[var(--text)]"
          >
            {assignNow ? "Assign now" : "Assign later"}
          </button>
        ) : null}

        <TypeSelector type={type} onTypeChange={onTypeChange} />
      </div>
    </div>
  );
}
