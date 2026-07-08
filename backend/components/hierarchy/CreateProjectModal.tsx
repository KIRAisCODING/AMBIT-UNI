import CreateHierarchyModal from "./CreateHierarchyModal";
import type { CreateHierarchyModalProps } from "./types";

/**
 * Renders the create-project modal.
 */
export default function CreateProjectModal(props: Omit<CreateHierarchyModalProps, "title" | "placeholder">) {
  return <CreateHierarchyModal {...props} title="Create Project" placeholder="Project name" />;
}
