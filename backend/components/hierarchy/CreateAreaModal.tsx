import CreateHierarchyModal from "./CreateHierarchyModal";
import type { CreateHierarchyModalProps } from "./types";

/**
 * Renders the create-area modal.
 */
export default function CreateAreaModal(props: Omit<CreateHierarchyModalProps, "title" | "placeholder">) {
  return <CreateHierarchyModal {...props} title="Create Area" placeholder="Area name" />;
}
