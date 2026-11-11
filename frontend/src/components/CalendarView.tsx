import React, { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Flag,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FolderKanban,
  Flame,
  Calendar as CalendarIcon,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  CalendarResponse,
  CalendarTaskItem,
  CalendarHabitItem,
  CalendarProjectMilestone,
} from '../types';
import { useCalendar } from '../hooks/useCalendar';

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarView() {
  const today = new Date();
  const todayStr = toLocalDateString(today);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonthIdx, setCurrentMonthIdx] = useState(today.getMonth()); // 0-indexed
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);

  // Month navigation bounds
  const paddedMonth = String(currentMonthIdx + 1).padStart(2, '0');
  const monthStart = `${currentYear}-${paddedMonth}-01`;
  const nextMonthIdx = currentMonthIdx === 11 ? 0 : currentMonthIdx + 1;
  const nextMonthYear = currentMonthIdx === 11 ? currentYear + 1 : currentYear;
  const daysInCurMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const monthEnd = `${currentYear}-${paddedMonth}-${String(daysInCurMonth).padStart(2, '0')}`;

  // Hook integration
  const {
    calendarData,
    isLoading,
    scheduleTask,
    toggleTaskComplete,
    toggleHabitDay,
    refreshCalendar,
  } = useCalendar(monthStart, monthEnd);

  const monthName = new Date(currentYear, currentMonthIdx, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const handlePrev = () => {
    if (viewMode === 'month') {
      if (currentMonthIdx === 0) {
        setCurrentMonthIdx(11);
        setCurrentYear((prev) => prev - 1);
      } else {
        setCurrentMonthIdx((prev) => prev - 1);
      }
    } else {
      setSelectedDateStr((prev) => addDays(prev, -7));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      if (currentMonthIdx === 11) {
        setCurrentMonthIdx(0);
        setCurrentYear((prev) => prev + 1);
      } else {
        setCurrentMonthIdx((prev) => prev + 1);
      }
    } else {
      setSelectedDateStr((prev) => addDays(prev, 7));
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonthIdx(today.getMonth());
    setSelectedDateStr(todayStr);
  };

  // Convert dueDate timestamp to local YYYY-MM-DD string
  const getTaskLocalDueDate = (dueDate: string | null): string | null => {
    if (!dueDate) return null;
    try {
      const d = new Date(dueDate);
      return toLocalDateString(d);
    } catch {
      return dueDate.split('T')[0];
    }
  };

  // 1. Build Monday-First Month Grid
  const calendarGrid = [];
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonthIdx, 1);
  const startDayOffset = (firstDay.getDay() + 6) % 7; // 0 = Monday, ..., 6 = Sunday

  // Previous month padding
  const prevMonthDays = new Date(currentYear, currentMonthIdx, 0).getDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const prevM = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
    const prevY = currentMonthIdx === 0 ? currentYear - 1 : currentYear;
    const dVal = prevMonthDays - i;
    calendarGrid.push({
      dayNum: dVal,
      isCurrentMonth: false,
      dateStr: `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dVal).padStart(2, '0')}`,
    });
  }

  // Active month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarGrid.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr: `${currentYear}-${paddedMonth}-${String(d).padStart(2, '0')}`,
    });
  }

  // Next month padding (total slots: 35 or 42)
  const totalSlots = calendarGrid.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarGrid.length;
  for (let d = 1; d <= remaining; d++) {
    calendarGrid.push({
      dayNum: d,
      isCurrentMonth: false,
      dateStr: `${nextMonthYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }

  // 2. Build Week View Days (Monday to Sunday)
  const [selY, selM, selD] = selectedDateStr.split('-').map(Number);
  const selDate = new Date(selY, selM - 1, selD);
  const selDayOfWeek = (selDate.getDay() + 6) % 7; // Monday = 0
  const weekMondayStr = addDays(selectedDateStr, -selDayOfWeek);
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const dStr = addDays(weekMondayStr, i);
    const [y, m, d] = dStr.split('-').map(Number);
    return {
      dateStr: dStr,
      dayNum: d,
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    };
  });

  // Extract tasks and logs from calendarData
  const allTasks = calendarData?.tasks || [];
  const unscheduledTasks = calendarData?.unscheduledTasks || [];
  const habitLogs = calendarData?.habitLogs || [];
  const habits = calendarData?.habits || [];
  const milestones = calendarData?.projectMilestones || [];

  // Helper to find items for a specific date
  const getItemsForDate = (dateStr: string) => {
    // Planned tasks (scheduledDate === dateStr)
    const plannedTasks = allTasks.filter((t) => t.scheduledDate === dateStr);
    // Deadline tasks (dueDate local === dateStr)
    const deadlineTasks = allTasks.filter(
      (t) => getTaskLocalDueDate(t.dueDate) === dateStr
    );
    // Completed habits for date
    const dateLogs = habitLogs.filter((l) => l.date === dateStr);
    const completedHabits = dateLogs
      .map((l) => habits.find((h) => h.id === l.habitId))
      .filter(Boolean) as CalendarHabitItem[];

    // Milestones for date
    const dateMilestones = milestones.filter((m) => m.targetDate === dateStr);

    return {
      plannedTasks,
      deadlineTasks,
      completedHabits,
      dateMilestones,
    };
  };

  // Selected Date items
  const selectedDetails = getItemsForDate(selectedDateStr);

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in space-y-6 pb-12">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-textPrimary tracking-tight">
            Calendar Planner
          </h1>
          <p className="text-sm text-textSecondary mt-0.5 font-medium">
            Temporal alignment for tasks, planned work, deadlines, and habits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Backlog Drawer Toggle Button */}
          <button
            onClick={() => setBacklogOpen(!backlogOpen)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              backlogOpen
                ? 'bg-pill-active text-pill-active-text border-transparent shadow-sm'
                : 'bg-surface hover:bg-surfaceSecondary border-border text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Layers size={14} />
            <span>Unscheduled Backlog</span>
            {unscheduledTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surfaceSecondary text-textPrimary border border-border">
                {unscheduledTasks.length}
              </span>
            )}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-surfaceSecondary p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-surface text-textPrimary shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-surface text-textPrimary shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Week
            </button>
          </div>

          {/* Period Navigation */}
          <div className="flex items-center gap-1 bg-surfaceSecondary p-1 rounded-xl border border-border">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-surface rounded-lg text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
              title="Previous period"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-0.5 text-xs font-semibold text-textSecondary hover:text-textPrimary rounded-lg hover:bg-surface transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-surface rounded-lg text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
              title="Next period"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unscheduled Backlog Drawer (Decision 10 Section 8.1) */}
      {backlogOpen && (
        <div className="bg-surface border border-border rounded-2xl p-5 canvas-shadow space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-textSecondary" />
              <h3 className="font-bold text-sm text-textPrimary">Unscheduled Task Backlog</h3>
              <span className="text-xs text-textSecondary font-mono">
                ({unscheduledTasks.length} active tasks awaiting planned dates)
              </span>
            </div>
            <button
              onClick={() => setBacklogOpen(false)}
              className="text-textSecondary hover:text-textPrimary p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {unscheduledTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
              {unscheduledTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-surfaceSecondary border border-border rounded-xl flex flex-col justify-between gap-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono font-bold uppercase text-textSecondary">
                        {task.priority !== 'NONE' ? task.priority : 'Normal'}
                      </span>
                      {task.areaName && (
                        <span className="text-[10px] text-textSecondary truncate max-w-[100px]">
                          {task.areaName}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-textPrimary line-clamp-2">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 font-medium">
                        <Flag size={10} />
                        Deadline: {getTaskLocalDueDate(task.dueDate)}
                      </p>
                    )}
                  </div>

                  {/* Scheduling quick presets */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-1 flex-wrap">
                    <button
                      onClick={() => scheduleTask(task.id, todayStr)}
                      className="px-2 py-0.5 bg-surface hover:bg-pill border border-border rounded text-[10px] font-medium text-textPrimary transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => scheduleTask(task.id, addDays(todayStr, 1))}
                      className="px-2 py-0.5 bg-surface hover:bg-pill border border-border rounded text-[10px] font-medium text-textPrimary transition-colors cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      onClick={() => scheduleTask(task.id, addDays(todayStr, 7))}
                      className="px-2 py-0.5 bg-surface hover:bg-pill border border-border rounded text-[10px] font-medium text-textPrimary transition-colors cursor-pointer"
                    >
                      +7 Days
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-textSecondary">
              All active tasks have been allocated a scheduled execution date!
            </div>
          )}
        </div>
      )}

      {/* 3. Main Calendar Layout: Grid (Col Span 8) + Selected Date Detail (Col Span 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Calendar Grid Container (8 of 12 cols = ~67%) */}
        <div className="lg:col-span-8 bg-surface border border-border rounded-2xl p-6 canvas-shadow space-y-4">
          {/* Grid Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="font-headline font-bold text-lg text-textPrimary">
              {viewMode === 'month' ? monthName : `Week of ${weekMondayStr}`}
            </h2>
            <div className="flex items-center gap-3 text-xs text-textSecondary font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Planned Work
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Deadline
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Routine
              </span>
            </div>
          </div>

          {/* 3.1 Month View (Strict Monday–Sunday) */}
          {viewMode === 'month' && (
            <div>
              {/* Weekday Header: MON through SUN */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarGrid.map((slot) => {
                  const isToday = slot.dateStr === todayStr;
                  const isSelected = slot.dateStr === selectedDateStr;
                  const { plannedTasks, deadlineTasks, completedHabits, dateMilestones } =
                    getItemsForDate(slot.dateStr);

                  // Unique task set for cell
                  const dayTaskIds = new Set([
                    ...plannedTasks.map((t) => t.id),
                    ...deadlineTasks.map((t) => t.id),
                  ]);
                  const totalItemsCount = dayTaskIds.size;

                  return (
                    <div
                      key={slot.dateStr}
                      onClick={() => setSelectedDateStr(slot.dateStr)}
                      className={`min-h-[92px] p-2 border rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-textPrimary bg-textPrimary/5 ring-1 ring-textPrimary'
                          : slot.isCurrentMonth
                          ? 'border-border bg-surface hover:border-textSecondary/40'
                          : 'border-border bg-surfaceSecondary opacity-40 hover:opacity-70'
                      }`}
                    >
                      {/* Top Header in Cell */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold px-1 rounded ${
                            isToday
                              ? 'bg-pill-active text-pill-active-text'
                              : isSelected
                              ? 'text-textPrimary font-bold'
                              : 'text-textSecondary'
                          }`}
                        >
                          {slot.dayNum}
                        </span>

                        {/* Routine completed dot */}
                        {completedHabits.length > 0 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-green-500"
                            title={`${completedHabits.length} habits completed`}
                          />
                        )}
                      </div>

                      {/* Commitment Pills in Cell */}
                      <div className="mt-1 space-y-1 overflow-hidden">
                        {Array.from(dayTaskIds)
                          .slice(0, 2)
                          .map((taskId) => {
                            const task = allTasks.find((t) => t.id === taskId);
                            if (!task) return null;
                            const isPlanned = task.scheduledDate === slot.dateStr;
                            const isDue = getTaskLocalDueDate(task.dueDate) === slot.dateStr;
                            const isBoth = isPlanned && isDue;

                            return (
                              <div
                                key={taskId}
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate border flex items-center gap-1 ${
                                  task.status === 'COMPLETED'
                                    ? 'bg-surfaceSecondary text-textSecondary/60 line-through border-border'
                                    : isBoth
                                    ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                                    : isDue
                                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                    : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {isBoth ? (
                                  <Layers size={10} className="shrink-0" />
                                ) : isDue ? (
                                  <Flag size={10} className="shrink-0" />
                                ) : (
                                  <Clock size={10} className="shrink-0" />
                                )}
                                <span className="truncate">{task.title}</span>
                              </div>
                            );
                          })}

                        {totalItemsCount > 2 && (
                          <div className="text-[9px] font-semibold text-textSecondary font-mono pl-1">
                            +{totalItemsCount - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3.2 Week View (Strict Monday–Sunday) */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((col) => {
                const isToday = col.dateStr === todayStr;
                const isSelected = col.dateStr === selectedDateStr;
                const { plannedTasks, deadlineTasks, completedHabits } = getItemsForDate(
                  col.dateStr
                );
                const dayTaskIds = new Set([
                  ...plannedTasks.map((t) => t.id),
                  ...deadlineTasks.map((t) => t.id),
                ]);

                return (
                  <div
                    key={col.dateStr}
                    onClick={() => setSelectedDateStr(col.dateStr)}
                    className={`min-h-[380px] p-2.5 border rounded-xl flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-textPrimary bg-textPrimary/5 ring-1 ring-textPrimary'
                        : isToday
                        ? 'border-blue-400 bg-surface'
                        : 'border-border bg-surface hover:border-textSecondary/40'
                    }`}
                  >
                    <div>
                      {/* Column Header */}
                      <div className="text-center border-b border-border pb-2 mb-2">
                        <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">
                          {col.dayName}
                        </span>
                        <span
                          className={`text-sm font-mono font-bold inline-block px-1.5 rounded mt-0.5 ${
                            isToday
                              ? 'bg-pill-active text-pill-active-text'
                              : isSelected
                              ? 'text-textPrimary font-bold'
                              : 'text-textSecondary'
                          }`}
                        >
                          {col.dayNum}
                        </span>
                      </div>

                      {/* Task cards list */}
                      <div className="space-y-1.5 overflow-y-auto max-h-[300px]">
                        {Array.from(dayTaskIds).map((taskId) => {
                          const task = allTasks.find((t) => t.id === taskId);
                          if (!task) return null;
                          const isPlanned = task.scheduledDate === col.dateStr;
                          const isDue = getTaskLocalDueDate(task.dueDate) === col.dateStr;
                          const isBoth = isPlanned && isDue;

                          return (
                            <div
                              key={taskId}
                              className={`p-1.5 rounded-lg border text-[11px] font-medium flex flex-col gap-1 ${
                                task.status === 'COMPLETED'
                                  ? 'bg-surfaceSecondary text-textSecondary/60 line-through border-border'
                                  : isBoth
                                  ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                                  : isDue
                                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="flex items-center gap-1 font-semibold truncate">
                                  {isBoth ? (
                                    <Layers size={11} className="shrink-0" />
                                  ) : isDue ? (
                                    <Flag size={11} className="shrink-0" />
                                  ) : (
                                    <Clock size={11} className="shrink-0" />
                                  )}
                                  <span className="truncate">{task.title}</span>
                                </span>
                              </div>

                              {task.projectName && (
                                <span className="text-[9px] text-textSecondary opacity-80 truncate">
                                  {task.projectName}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Routine completion indicator */}
                    {completedHabits.length > 0 && (
                      <div className="pt-2 border-t border-border text-[10px] text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>{completedHabits.length} routines</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Selected-Date Detail Pane (4 of 12 cols = ~33%) */}
        <div className="lg:col-span-4 bg-surface border border-border rounded-2xl p-6 canvas-shadow space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4">
            <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider block">
              Selected Day Schedule
            </span>
            <h3 className="text-base font-bold text-textPrimary font-headline mt-1">
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
          </div>

          {/* Section: Planned Work for Today */}
          <div>
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-500" />
              <span>Scheduled Work ({selectedDetails.plannedTasks.length})</span>
            </h4>

            {selectedDetails.plannedTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDetails.plannedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-surfaceSecondary border border-border rounded-xl flex items-start justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={() => toggleTaskComplete(task.id, task.status)}
                        className="mt-0.5 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                      >
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`font-semibold text-textPrimary break-words ${
                            task.status === 'COMPLETED' ? 'line-through text-textSecondary/50' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.projectName && (
                          <span className="text-[10px] text-textSecondary mt-0.5 block truncate">
                            {task.projectName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reschedule button */}
                    <button
                      onClick={() => scheduleTask(task.id, null)}
                      className="text-[10px] text-textSecondary hover:text-red-500 font-medium transition-colors cursor-pointer shrink-0"
                      title="Unschedule (move to backlog)"
                    >
                      Clear
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-textSecondary italic py-2">
                No planned work scheduled for this date.
              </p>
            )}
          </div>

          {/* Section: Deadlines for Today */}
          <div>
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Flag size={14} className="text-red-500" />
              <span>Deadlines Today ({selectedDetails.deadlineTasks.length})</span>
            </h4>

            {selectedDetails.deadlineTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDetails.deadlineTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-surfaceSecondary border border-border rounded-xl flex items-start justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        onClick={() => toggleTaskComplete(task.id, task.status)}
                        className="mt-0.5 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                      >
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <Circle size={16} />
                        )}
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`font-semibold text-textPrimary break-words ${
                            task.status === 'COMPLETED' ? 'line-through text-textSecondary/50' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.areaName && (
                          <span className="text-[10px] text-textSecondary mt-0.5 block truncate">
                            Area: {task.areaName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-textSecondary italic py-2">No deadlines due on this date.</p>
            )}
          </div>

          {/* Section: Routines & Habits */}
          <div>
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-500" />
              <span>Routines & Habits</span>
            </h4>

            {habits.length > 0 ? (
              <div className="space-y-2">
                {habits.map((habit) => {
                  const isLogged = habitLogs.some(
                    (l) => l.habitId === habit.id && l.date === selectedDateStr
                  );

                  return (
                    <div
                      key={habit.id}
                      className="p-2.5 bg-surfaceSecondary border border-border rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <button
                          onClick={() => toggleHabitDay(habit.id, selectedDateStr)}
                          className="text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                          title="Toggle check-in for this date"
                        >
                          {isLogged ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : (
                            <Circle size={16} />
                          )}
                        </button>
                        <span
                          className={`font-medium truncate ${
                            isLogged ? 'line-through text-textSecondary/60' : 'text-textPrimary'
                          }`}
                        >
                          {habit.name}
                        </span>
                      </div>

                      {habit.weeklyProgress && (
                        <span className="text-[10px] text-textSecondary font-mono shrink-0">
                          {habit.weeklyProgress.completed}/{habit.weeklyProgress.target}w
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-textSecondary italic py-2">No habits configured.</p>
            )}
          </div>

          {/* Section: Project Milestones */}
          {selectedDetails.dateMilestones.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FolderKanban size={14} className="text-purple-500" />
                <span>Project Milestones</span>
              </h4>

              <div className="space-y-1.5">
                {selectedDetails.dateMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-surfaceSecondary border border-border rounded-xl text-xs flex items-center justify-between"
                  >
                    <span className="font-semibold text-textPrimary truncate">{m.name}</span>
                    {m.areaName && (
                      <span className="text-[10px] text-textSecondary">{m.areaName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
