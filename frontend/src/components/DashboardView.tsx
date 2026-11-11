import React, { useState } from 'react';
import {
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Calendar,
  Flame,
  ChevronRight,
  FolderKanban,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { ActiveTab, WorkspaceSelection } from '../types';

interface DashboardViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectProject: (selection: WorkspaceSelection) => void;
  onQuickCapture: (content: string, type: string) => Promise<void>;
}

export default function DashboardView({
  onNavigateTab,
  onSelectProject,
  onQuickCapture,
}: DashboardViewProps) {
  const {
    dashboard,
    isLoading,
    error,
    refreshDashboard,
    toggleTaskComplete,
    toggleHabitToday,
  } = useDashboard();

  // Quick capture state
  const [captureContent, setCaptureContent] = useState('');
  const [captureType, setCaptureType] = useState<'Task' | 'Note' | 'Habit'>('Task');
  const [isSubmittingCapture, setIsSubmittingCapture] = useState(false);

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = captureContent.trim();
    if (!trimmed) return;

    try {
      setIsSubmittingCapture(true);
      await onQuickCapture(trimmed, captureType);
      setCaptureContent('');
      await refreshDashboard();
    } catch (err) {
      console.error('Failed to submit quick capture:', err);
    } finally {
      setIsSubmittingCapture(false);
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="w-full max-w-[1440px] mx-auto py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-textSecondary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-textSecondary font-mono">Loading Operational Briefing...</span>
        </div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="w-full max-w-[1440px] mx-auto py-8">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-300 text-sm">
          <p className="font-bold">Error loading dashboard</p>
          <p className="text-xs mt-1">{error}</p>
          <button
            onClick={() => refreshDashboard()}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const greeting = dashboard?.greeting;
  const inbox = dashboard?.inboxSnapshot;
  const todayFocus = dashboard?.todayFocus;
  const upcoming = dashboard?.upcomingTasks || [];
  const habits = dashboard?.habitsSnapshot || [];
  const projects = dashboard?.activeProjects || [];

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-8 animate-fade-in pb-12">
      {/* 1. Top Briefing Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-textPrimary tracking-tight">
            {greeting?.greetingText}, {greeting?.userName}
          </h1>
          <p className="text-sm text-textSecondary mt-0.5 font-medium">
            Operational Briefing ·{' '}
            {greeting?.localDate
              ? new Date(greeting.localDate + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Today'}
          </p>
        </div>

        {/* Inbox Triage Pill */}
        {inbox && (
          <button
            onClick={() => onNavigateTab('Inbox')}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-surfaceSecondary hover:bg-surface border border-border hover:border-textSecondary/40 rounded-full text-xs font-medium text-textPrimary transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span>
              {inbox.unprocessedCount} {inbox.unprocessedCount === 1 ? 'Capture' : 'Captures'} pending triage
            </span>
            <ChevronRight size={14} className="text-textSecondary" />
          </button>
        )}
      </div>

      {/* 2. Quick Capture Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 canvas-shadow">
        <form onSubmit={handleCaptureSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-1 bg-surfaceSecondary p-1 rounded-xl border border-border shrink-0">
            {(['Task', 'Note', 'Habit'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCaptureType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  captureType === t
                    ? 'bg-pill-active text-pill-active-text shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={captureContent}
              onChange={(e) => setCaptureContent(e.target.value)}
              placeholder={`Quick capture ${captureType.toLowerCase()}... (Press Enter to capture)`}
              disabled={isSubmittingCapture}
              className="w-full bg-surfaceSecondary border border-border focus:border-textPrimary text-textPrimary text-sm rounded-xl px-4 py-2 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!captureContent.trim() || isSubmittingCapture}
            className="px-5 py-2 bg-textPrimary text-background font-semibold text-xs rounded-xl hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shrink-0"
          >
            Capture ↵
          </button>
        </form>
      </div>

      {/* 3. Main Operational Grid: Asymmetrical 2-Column (65% / 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Primary Operational Stream (7 of 12 cols = ~60-65%) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section A: Today / Focus Stream */}
          <div className="bg-surface border border-border rounded-2xl p-6 canvas-shadow">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-headline font-bold text-textPrimary">Today & Focus</h2>
                {todayFocus && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-surfaceSecondary text-textSecondary border border-border">
                    {todayFocus.totalCount}
                  </span>
                )}
              </div>

              {/* Status breakdown pills */}
              {todayFocus && (
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  {todayFocus.overdueCount > 0 && (
                    <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/30">
                      {todayFocus.overdueCount} Overdue
                    </span>
                  )}
                  {todayFocus.dueTodayCount > 0 && (
                    <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/30">
                      {todayFocus.dueTodayCount} Due Today
                    </span>
                  )}
                  {todayFocus.inProgressCount > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/30">
                      {todayFocus.inProgressCount} In Progress
                    </span>
                  )}
                </div>
              )}
            </div>

            {todayFocus?.tasks && todayFocus.tasks.length > 0 ? (
              <div className="space-y-2.5">
                {todayFocus.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-surfaceSecondary hover:bg-surface border border-border hover:border-textSecondary/40 rounded-xl flex items-start gap-3 transition-all group"
                  >
                    <button
                      onClick={() => toggleTaskComplete(task.id)}
                      className="mt-0.5 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                      title="Toggle completion"
                    >
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle2 size={18} className="text-green-600" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Category Badge */}
                        {task.category === 'OVERDUE' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <AlertTriangle size={11} />
                            Overdue {task.daysOverdue}d
                          </span>
                        )}
                        {task.category === 'DUE_TODAY' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Clock size={11} />
                            Due Today
                          </span>
                        )}
                        {task.category === 'IN_PROGRESS' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            In Progress
                          </span>
                        )}

                        {/* Priority Badge */}
                        {task.priority !== 'NONE' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border text-textSecondary">
                            {task.priority}
                          </span>
                        )}

                        {/* Area / Project tag */}
                        {task.projectName && (
                          <span className="text-[10px] font-medium text-textSecondary truncate max-w-[140px]">
                            {task.projectName}
                          </span>
                        )}
                      </div>

                      <p
                        className={`text-sm text-textPrimary font-medium leading-relaxed break-words ${
                          task.status === 'COMPLETED' ? 'line-through text-textSecondary/50' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                  </div>
                ))}

                {todayFocus.totalCount > todayFocus.tasks.length && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => onNavigateTab('Unassigned')}
                      className="text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      View all {todayFocus.totalCount} tasks in Tasks view →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center">
                <CheckCircle2 size={32} className="text-green-500/40 mb-2" />
                <p className="text-sm font-semibold text-textPrimary">All clear for today!</p>
                <p className="text-xs text-textSecondary mt-1">
                  No overdue or urgent tasks pending your attention.
                </p>
              </div>
            )}
          </div>

          {/* Section B: Upcoming Timeline (Next 7 Days) */}
          <div className="bg-surface border border-border rounded-2xl p-6 canvas-shadow">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-textSecondary" />
                <h2 className="text-lg font-headline font-bold text-textPrimary">
                  Upcoming Horizon (Next 7 Days)
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('Calendar')}
                className="text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                View Full Calendar →
              </button>
            </div>

            {upcoming.length > 0 ? (
              <div className="space-y-4">
                {upcoming.map((group) => (
                  <div key={group.date} className="space-y-2">
                    <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                      <span>{group.dateLabel}</span>
                      <span className="text-[10px] font-mono text-textSecondary/60">
                        ({group.tasks.length})
                      </span>
                    </h3>

                    <div className="space-y-1.5 pl-2 border-l-2 border-border">
                      {group.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-2.5 bg-surfaceSecondary hover:bg-surface border border-border rounded-lg flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-pill-active shrink-0" />
                            <span className="font-medium text-textPrimary truncate">{task.title}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.projectName && (
                              <span className="text-[10px] text-textSecondary bg-surface px-1.5 py-0.5 rounded border border-border truncate max-w-[100px]">
                                {task.projectName}
                              </span>
                            )}
                            {task.priority !== 'NONE' && (
                              <span className="text-[9px] font-mono font-bold uppercase text-textSecondary">
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-textSecondary">
                No commitments scheduled for the next 7 days.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contextual Pulse (5 of 12 cols = ~35-40%) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Section C: Daily Habits Pulse */}
          <div className="bg-surface border border-border rounded-2xl p-6 canvas-shadow">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-orange-500" />
                <h2 className="text-lg font-headline font-bold text-textPrimary">Daily Habits Pulse</h2>
              </div>
              <button
                onClick={() => onNavigateTab('Habits')}
                className="text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors cursor-pointer"
              >
                All Habits →
              </button>
            </div>

            {habits.length > 0 ? (
              <div className="space-y-2.5">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="p-3 bg-surfaceSecondary hover:bg-surface border border-border rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => toggleHabitToday(habit.id)}
                        className="text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                        title="Check in for today"
                      >
                        {habit.completedToday ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="truncate">
                        <p
                          className={`text-xs font-semibold text-textPrimary truncate ${
                            habit.completedToday ? 'line-through text-textSecondary/60' : ''
                          }`}
                        >
                          {habit.name}
                        </p>
                        {habit.weeklyProgress && (
                          <p className="text-[10px] text-textSecondary mt-0.5">
                            Weekly: {habit.weeklyProgress.completed}/{habit.weeklyProgress.target} days
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 font-mono text-xs font-bold shrink-0">
                      <Flame size={12} />
                      <span>{habit.currentStreak}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-textSecondary">
                No active habits configured.{' '}
                <button
                  onClick={() => onNavigateTab('Habits')}
                  className="text-textPrimary font-semibold underline cursor-pointer"
                >
                  Create one →
                </button>
              </div>
            )}
          </div>

          {/* Section D: Active Projects Snapshot */}
          <div className="bg-surface border border-border rounded-2xl p-6 canvas-shadow">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban size={18} className="text-textSecondary" />
                <h2 className="text-lg font-headline font-bold text-textPrimary">Active Projects</h2>
              </div>
              <span className="text-[10px] text-textSecondary font-mono uppercase tracking-wider">
                Prioritized
              </span>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() =>
                      onSelectProject({
                        area: proj.areaName || '',
                        project: proj.name,
                      })
                    }
                    className="p-3.5 bg-surfaceSecondary hover:bg-surface border border-border hover:border-textSecondary/40 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-textPrimary group-hover:text-blue-600 transition-colors truncate">
                        {proj.name}
                      </h4>
                      {proj.areaName && (
                        <span className="text-[10px] font-medium text-textSecondary bg-surface px-2 py-0.5 rounded border border-border shrink-0">
                          {proj.areaName}
                        </span>
                      )}
                    </div>

                    {proj.hasTasks ? (
                      <div>
                        <div className="flex items-center justify-between text-xs text-textSecondary mb-1 font-mono">
                          <span>
                            {proj.completedTasks}/{proj.totalTasks} Tasks
                          </span>
                          <span className="font-bold text-textPrimary">{proj.progressPct}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${proj.progressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-textSecondary font-medium italic">
                        No tasks yet
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-textSecondary">
                No active projects found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

