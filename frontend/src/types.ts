export type ItemType = 'Task' | 'Idea' | 'Note' | 'Journal' | 'Habit';

export interface BrainItem {
  id: string;
  content: string;
  title?: string;
  priority?: 'low' | 'medium' | 'high';
  type: ItemType;
  assignment: 'now' | 'later';
  area?: string;
  project?: string;
  subProject?: string;
  tags: string[];
  createdAt: string;
  completed?: boolean;
  completedAt?: string;
  scheduledDate?: string; // YYYY-MM-DD format
  smartSummary?: string;
  categorySuggestion?: string;
  order?: number;
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completedDays: string[]; // YYYY-MM-DD format
  createdAt: string;
  project?: string;
  area?: string;
  subProject?: string;
  longestStreak?: number;
  notes?: string;
}

export type ActiveTab = 'Inbox' | 'Unassigned' | 'Habits' | 'Calendar' | 'Analytics' | 'Settings';

export interface AreaHierarchy {
  name: string;
  projects: {
    name: string;
    subProjects: string[];
  }[];
}

export interface WorkspaceSelection {
  area: string;
  project: string;
  subProject: string;
}
