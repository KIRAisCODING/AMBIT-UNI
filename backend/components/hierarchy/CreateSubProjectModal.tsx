import CreateHierarchyModal from "./CreateHierarchyModal";
import type { CreateHierarchyModalProps } from "./types";

/**
 * Renders the create-subproject modal.
 */
export default function CreateSubProjectModal(props: Omit<CreateHierarchyModalProps, "title" | "placeholder">) {
  return <CreateHierarchyModal {...props} title="Create SubProject" placeholder="Sub-project name" />;
}
