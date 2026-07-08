export type SidebarTask = {
  id: string;
  content: string;
  subProjectId?: string | null;
};

export type SidebarSubProject = {
  id: string;
  name: string;
};

export type SidebarProject = {
  id: string;
  name: string;
  subProjects?: SidebarSubProject[];
};

export type SidebarArea = {
  id: string;
  name: string;
  projects?: SidebarProject[];
};

export type SidebarCreateState = {
  type: "area" | "project" | "subProject";
  parentId?: string;
  name: string;
};

export type SidebarEditState = {
  type: "area" | "project" | "subProject";
  id: string;
  name: string;
};
