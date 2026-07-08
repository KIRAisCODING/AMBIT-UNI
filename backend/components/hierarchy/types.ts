import type { ReactNode } from "react";

export type HierarchyCardProps = {
  name: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export type CreateHierarchyModalProps = {
  open: boolean;
  name: string;
  title: string;
  placeholder: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};
