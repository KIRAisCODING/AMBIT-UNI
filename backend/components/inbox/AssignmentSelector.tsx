import type { AreaOption, ProjectOption, SubProjectOption } from "./types";

type AssignmentSelectorProps = {
  areas: AreaOption[];
  projects: ProjectOption[];
  subProjects: SubProjectOption[];
  selectedArea: string;
  selectedProject: string;
  selectedSubProject: string;
  onAreaChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onSubProjectChange: (value: string) => void;
};

const pillClassName =
  "inline-flex items-center rounded-full border border-[color:var(--border)]/70 bg-[var(--surface-container)] px-4 py-2 text-sm font-medium text-[var(--text)] shadow-[var(--shadow-pill)]";

const labelClassName =
  "mr-2 text-xs uppercase tracking-[0.16em] text-[var(--text-subtle)]";

/**
 * Renders the Inbox assignment selectors.
 */
export default function AssignmentSelector({
  areas,
  projects,
  subProjects,
  selectedArea,
  selectedProject,
  selectedSubProject,
  onAreaChange,
  onProjectChange,
  onSubProjectChange,
}: AssignmentSelectorProps) {
  return (
    <>
      <label className={pillClassName}>
        <span className={labelClassName}>Area</span>
        <select value={selectedArea} className="bg-transparent pr-2 outline-none" onChange={(e) => onAreaChange(e.target.value)}>
          <option value="">Select</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>

      <label className={pillClassName}>
        <span className={labelClassName}>Project</span>
        <select value={selectedProject} className="bg-transparent pr-2 outline-none" onChange={(e) => onProjectChange(e.target.value)}>
          <option value="">Select</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className={pillClassName}>
        <span className={labelClassName}>SubProject</span>
        <select value={selectedSubProject} className="bg-transparent pr-2 outline-none" onChange={(e) => onSubProjectChange(e.target.value)}>
          <option value="">Select</option>
          {subProjects.map((subproject) => (
            <option key={subproject.id} value={subproject.id}>
              {subproject.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
