export type ItemType = 'Task' | 'Idea' | 'Note' | 'Journal' | 'Habit';

export interface BrainItem {
  id: string;
  content: string;
  title?: string;
  priority?: 'low' | 'medium' | 'high';
  type: ItemType;
  assignment: 'now' | 'later';
  areaId?: string;
  projectId?: string;
  subProjectId?: string;
  area?: string;
  project?: string;
  subProject?: string;
  tags: string[];
  createdAt: string;
  completed?: boolean;
  completedAt?: string;
  dueDate?: string;
  deadline?: string;
  scheduledDate?: string; // YYYY-MM-DD format
  smartSummary?: string;
  categorySuggestion?: string;
  order?: number;
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'DAILY' | 'WEEKLY';
  streak: number;
  currentStreak?: number;
  longestStreak?: number;
  completedDays?: string[]; // YYYY-MM-DD format
  completedToday?: boolean;
  targetDaysPerWeek?: number | null;
  createdAt: string;
  project?: string;
  area?: string;
  areaId?: string | null;
  subProject?: string;
  notes?: string;
  weeklyProgress?: {
    completed: number;
    target: number;
    targetMet: boolean;
    bonusDays: number;
    currentWeekMonday: string;
    currentWeekSunday: string;
  } | null;
}

export type ActiveTab = 'Dashboard' | 'Inbox' | 'Unassigned' | 'Habits' | 'Calendar' | 'Analytics' | 'Settings';

export interface AreaHierarchy {
  id?: string;
  name: string;
  projects: {
    id?: string;
    name: string;
    areaId?: string;
    subProjects: {
      id?: string;
      name: string;
      projectId?: string;
    }[];
  }[];
}

export interface WorkspaceSelection {
  area: string;
  project?: string;
  subProject?: string;
}

// ==========================================
// DASHBOARD TYPES (Decision 04)
// ==========================================

export interface TodayFocusTask {
  id: string;
  title: string;
  dueDate: string | null;
  scheduledDate: string | null;
  priority: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  category: 'OVERDUE' | 'DUE_TODAY' | 'IN_PROGRESS';
  isOverdue: boolean;
  daysOverdue: number;
  isDueToday: boolean;
  isInProgress: boolean;
  projectName: string | null;
  areaName: string | null;
}

export interface UpcomingTaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  scheduledDate: string | null;
  projectName: string | null;
  areaName: string | null;
}

export interface UpcomingDayGroup {
  date: string;
  dateLabel: string;
  tasks: UpcomingTaskItem[];
}

export interface ActiveProjectSummary {
  id: string;
  name: string;
  areaName: string | null;
  order: number;
  targetDate: string | null;
  totalTasks: number;
  completedTasks: number;
  progressPct: number | null;
  hasTasks: boolean;
}

export interface HabitSnapshotItem {
  id: string;
  name: string;
  streak: number;
  currentStreak: number;
  completedToday: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'daily' | 'weekly';
  targetDaysPerWeek?: number | null;
  weeklyProgress?: {
    completed: number;
    target: number;
    targetMet: boolean;
    bonusDays: number;
    currentWeekMonday: string;
    currentWeekSunday: string;
  } | null;
}

export interface DashboardResponse {
  greeting: {
    userName: string;
    localDate: string;
    greetingText: string;
  };
  inboxSnapshot: {
    unprocessedCount: number;
    recentCaptures: {
      id: string;
      rawContent: string;
      createdAt: string;
    }[];
  };
  todayFocus: {
    overdueCount: number;
    dueTodayCount: number;
    inProgressCount: number;
    tasks: TodayFocusTask[];
    totalCount: number;
  };
  upcomingTasks: UpcomingDayGroup[];
  habitsSnapshot: HabitSnapshotItem[];
  activeProjects: ActiveProjectSummary[];
}

// ==========================================
// CALENDAR TYPES (Decision 10)
// ==========================================

export interface CalendarTaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  scheduledDate: string | null;
  areaId: string | null;
  areaName: string | null;
  projectId: string | null;
  projectName: string | null;
  subProjectId?: string | null;
  subProjectName?: string | null;
}

export interface CalendarHabitLogItem {
  id: string;
  habitId: string;
  date: string;
  completedAt: string;
}

export interface CalendarHabitItem {
  id: string;
  name: string;
  frequency: 'DAILY' | 'WEEKLY';
  targetDaysPerWeek: number | null;
  streak: number;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  areaId: string | null;
  areaName: string | null;
  weeklyProgress?: {
    completed: number;
    target: number;
    targetMet: boolean;
    bonusDays: number;
    currentWeekMonday: string;
    currentWeekSunday: string;
  } | null;
}

export interface CalendarProjectMilestone {
  id: string;
  name: string;
  targetDate: string | null;
  areaId: string;
  areaName: string | null;
}

export interface CalendarResponse {
  startDate: string;
  endDate: string;
  tasks: CalendarTaskItem[];
  unscheduledTasks: CalendarTaskItem[];
  habitLogs: CalendarHabitLogItem[];
  habits: CalendarHabitItem[];
  projectMilestones: CalendarProjectMilestone[];
}

// ==========================================
// ANALYTICS TYPES (Decision 04)
// ==========================================

export interface MomentumDataPoint {
  dateStr: string;
  label: string;
  count: number;
}

export interface ThisWeekMetrics {
  completedThisWeek: number;
  createdThisWeek: number;
  habitCompletionRate: number;
  activeProjectsCount: number;
}

export interface ActiveProjectMetric {
  name: string;
  pct: number;
  total: number;
}

export interface AnalyticsResponse {
  areaProgress: Record<string, number>;
  momentumData: MomentumDataPoint[];
  trendStatus: {
    text: string;
    color: string;
  };
  habitHeatmap: Record<string, number>;
  unassignedCount: number;
  thisWeekMetrics: ThisWeekMetrics;
  activeProjects: ActiveProjectMetric[];
}
