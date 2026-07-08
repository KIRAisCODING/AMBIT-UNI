export type TaskItem = {
  id: string;
  content: string;
  subProjectId?: string | null;
  task?: {
    description?: string | null;
    deadline?: string | null;
    completed?: boolean | null;
  } | null;
};
