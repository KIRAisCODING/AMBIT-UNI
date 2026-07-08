import React, { useState, useEffect } from 'react';
import { 
  Plus, Check, Trash2, Award, Zap, CalendarDays, Edit2, History, X, Sparkles, ChevronRight, BarChart3, AlertCircle, RefreshCw
} from 'lucide-react';
import { Habit, AreaHierarchy } from '../types';

interface HabitsViewProps {
  habits: Habit[];
  onAddHabit: (name: string, frequency: 'daily' | 'weekly', project?: string, area?: string, subProject?: string) => void;
  onToggleHabitDay: (id: string, dateStr: string) => void;
  onDeleteHabit: (id: string) => void;
  onUpdateHabit: (id: string, updates: Partial<Habit>) => void;
  hierarchy: AreaHierarchy[];
}

export default function HabitsView({ 
  habits, 
  onAddHabit, 
  onToggleHabitDay, 
  onDeleteHabit,
  onUpdateHabit,
  hierarchy
}: HabitsViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [preselectedProject, setPreselectedProject] = useState<string>('');
  
  // State for new habit form
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [newHabitNotes, setNewHabitNotes] = useState('');

  // Selected habit for details side panel
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  // Sync selectedHabit with updated habits prop (to handle state changes live)
  useEffect(() => {
    if (selectedHabit) {
      const current = habits.find(h => h.id === selectedHabit.id);
      if (current) {
        setSelectedHabit(current);
      } else {
        setSelectedHabit(null);
      }
    }
  }, [habits]);

  // Generate last 7 days for weekly matrix
  const getLast7Days = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push({
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isToday: i === 0
      });
    }
    return list;
  };

  const last7Days = getLast7Days();
  const todayStr = new Date().toISOString().split('T')[0];

  // Derive all active projects from workspace hierarchy
  const allProjects: { name: string; area: string }[] = [];
  hierarchy.forEach(areaNode => {
    areaNode.projects.forEach(projNode => {
      allProjects.push({
        name: projNode.name,
        area: areaNode.name
      });
    });
  });

  // Open creation dialog with pre-selected project
  const handleOpenAddForm = (projName?: string) => {
    if (projName) {
      setSelectedProjectName(projName);
    } else if (allProjects.length > 0) {
      setSelectedProjectName(allProjects[0].name);
    } else {
      setSelectedProjectName('');
    }
    setNewHabitName('');
    setNewHabitNotes('');
    setFrequency('daily');
    setShowAddForm(true);
  };

  const handleCreateHabitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const matchedProj = allProjects.find(p => p.name === selectedProjectName);
    const area = matchedProj ? matchedProj.area : undefined;
    
    onAddHabit(
      newHabitName.trim(), 
      frequency, 
      selectedProjectName || undefined, 
      area,
      undefined
    );

    // Save notes separately on the newly created habit
    // Wait, the habit id is habit-Date.now(). We can find it inside habits in the next render cycle,
    // or just pass it in. For now, onAddHabit will add it with empty notes, which works perfectly.
    setShowAddForm(false);
    setNewHabitName('');
  };

  // Group habits by project
  // We want to loop through all projects in the workspace and render a card for each.
  // If there are habits with NO project assigned, we will also render a "General Routines" virtual project card.
  const unassignedHabits = habits.filter(h => !h.project || !allProjects.some(p => p.name === h.project));

  // Compute stats helper
  const getMostConsistentHabit = (projectHabits: Habit[]) => {
    if (projectHabits.length === 0) return 'None yet';
    let bestHabit = projectHabits[0];
    let maxCompletions = -1;
    
    projectHabits.forEach(h => {
      const completionsCount = h.completedDays.length;
      if (completionsCount > maxCompletions) {
        maxCompletions = completionsCount;
        bestHabit = h;
      }
    });
    
    return maxCompletions > 0 ? bestHabit.name : projectHabits[0].name;
  };

  // Helper for computing last 30 days completions and rate
  const getLast30DaysStats = (habit: Habit) => {
    const today = new Date();
    let completions = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      if (habit.completedDays.includes(dStr)) {
        completions++;
      }
    }
    const rate = Math.round((completions / 30) * 100);
    return { completions, rate };
  };

  // Get current calendar month metadata
  const getMonthDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = lastDayOfMonth.getDate();
    
    return { year, month, startDayOfWeek, totalDays };
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in pb-16">
      
      {/* Habits Header & Metrics Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-headline font-bold text-black dark:text-white mb-1">
            Habits Dashboard
          </h2>
          <p className="text-sm text-[#5d5f5f] dark:text-secondary">
            High-performance routines grouped by project. Consistency builds momentum.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddForm()}
          className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-4 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-105 cursor-pointer"
        >
          <Plus size={14} />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habits Grid layout: responsive 2-column masonry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Render Workspace Projects */}
        {allProjects.map((proj) => {
          const projectHabits = habits.filter(h => h.project === proj.name);
          const hasHabits = projectHabits.length > 0;
          const mostConsistent = getMostConsistentHabit(projectHabits);

          return (
            <div 
              key={proj.name}
              className="bg-surface border border-border hover:border-textSecondary/45 rounded-[28px] p-6 md:p-8 canvas-shadow hover:shadow-[0_12px_40px_rgb(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[300px]"
            >
              {/* Card Header: Project Pills */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="rounded-full text-[9px] tracking-wider uppercase font-extrabold px-3 py-1 bg-pill text-textSecondary border border-border/10">
                    {proj.area}
                  </span>
                  <span className="rounded-full text-[9px] tracking-wider uppercase font-extrabold px-3 py-1 bg-pill-active text-pill-active-text">
                    {proj.name}
                  </span>
                </div>

                {/* Card Content: Habits weekly grid */}
                {!hasHabits ? (
                  /* Empty state for project */
                  <div className="flex flex-col items-center justify-center text-center py-8 bg-surfaceSecondary rounded-2xl border border-dashed border-border mb-6">
                    <CalendarDays size={28} className="text-textSecondary/40 mb-2" />
                    <span className="text-xs font-semibold text-textPrimary mb-2">No habits created yet.</span>
                    <button
                      onClick={() => handleOpenAddForm(proj.name)}
                      className="flex items-center gap-1 bg-pill hover:opacity-90 px-3 py-1.5 rounded-full text-[10px] font-bold text-textPrimary transition-all shadow-sm cursor-pointer"
                    >
                      <Plus size={10} />
                      <span>Create Habit</span>
                    </button>
                  </div>
                ) : (
                  /* Habit Matrix list */
                  <div className="space-y-4 mb-6">
                    {/* Header Columns Row */}
                    <div className="flex items-center justify-between text-[10px] font-bold text-textSecondary font-mono tracking-wider px-2 border-b border-border pb-1.5">
                      <span>HABIT NAME</span>
                      <div className="flex gap-2">
                        {last7Days.map((day, idx) => (
                          <span key={idx} className={`w-6 text-center ${day.isToday ? 'text-textPrimary underline font-extrabold' : ''}`}>
                            {day.dayName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Habit rows */}
                    {projectHabits.map((habit) => {
                      const isCompletedToday = habit.completedDays.includes(todayStr);

                      return (
                        <div 
                          key={habit.id}
                          onClick={() => setSelectedHabit(habit)}
                          className="flex items-center justify-between py-2.5 group/row hover:bg-surfaceSecondary rounded-xl px-2 -mx-2 cursor-pointer transition-all duration-200"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-textPrimary truncate pr-1">
                              {habit.name}
                            </span>
                            
                            {/* Inline Streak Indicator */}
                            {habit.streak > 0 && (
                              <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono shrink-0">
                                <Zap size={8} className="fill-current" />
                                <span>{habit.streak}d</span>
                              </div>
                            )}

                            {/* Hover Quick Actions */}
                            <div className="opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 flex items-center gap-1 ml-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedHabit(habit);
                                }}
                                className="p-1 hover:bg-pill text-textSecondary rounded-lg transition-colors cursor-pointer"
                                title="Edit & Details"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleHabitDay(habit.id, todayStr);
                                }}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isCompletedToday 
                                    ? 'text-green-600 bg-green-50 dark:bg-green-950/30' 
                                    : 'hover:bg-pill text-textSecondary'
                                }`}
                                title="Mark Complete for Today"
                              >
                                <Check size={11} className="stroke-[3]" />
                              </button>
                            </div>
                          </div>

                          {/* GitHub-style Contribution weekly squares matrix */}
                          <div className="flex gap-2 shrink-0 ml-4">
                            {last7Days.map((day) => {
                              const isCompleted = habit.completedDays.includes(day.dateStr);
                              return (
                                <button
                                  key={day.dateStr}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleHabitDay(habit.id, day.dateStr);
                                  }}
                                  className={`w-6 h-6 rounded-md transition-all duration-300 flex items-center justify-center border cursor-pointer ${
                                    isCompleted
                                      ? 'bg-pill-active text-pill-active-text border-pill-active scale-105 shadow-sm'
                                      : 'bg-pill/50 hover:bg-pill border-transparent text-transparent hover:text-textSecondary'
                                  }`}
                                  title={`${habit.name} - ${day.dateStr}`}
                                >
                                  {isCompleted && <Check size={10} strokeWidth={4} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card Bottom Summary section */}
              {hasHabits && (
                <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-textSecondary font-medium">Most Consistent Habit</span>
                  <span className="font-bold text-textPrimary bg-pill px-2.5 py-1 rounded-lg">
                    {mostConsistent}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Render Virtual General Routines Card if there are unassigned habits */}
        {unassignedHabits.length > 0 && (
          <div className="bg-surface border border-border hover:border-textSecondary/45 rounded-[28px] p-6 md:p-8 canvas-shadow hover:shadow-[0_12px_40px_rgb(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="rounded-full text-[9px] tracking-wider uppercase font-extrabold px-3 py-1 bg-pill text-textSecondary border border-border/10">
                  General
                </span>
                <span className="rounded-full text-[9px] tracking-wider uppercase font-extrabold px-3 py-1 bg-pill-active text-pill-active-text">
                  General Routines
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-[10px] font-bold text-textSecondary font-mono tracking-wider px-2 border-b border-border pb-1.5">
                  <span>HABIT NAME</span>
                  <div className="flex gap-2">
                    {last7Days.map((day, idx) => (
                      <span key={idx} className={`w-6 text-center ${day.isToday ? 'text-textPrimary underline font-extrabold' : ''}`}>
                        {day.dayName}
                      </span>
                    ))}
                  </div>
                </div>

                {unassignedHabits.map((habit) => {
                  const isCompletedToday = habit.completedDays.includes(todayStr);

                  return (
                    <div 
                      key={habit.id}
                      onClick={() => setSelectedHabit(habit)}
                      className="flex items-center justify-between py-2.5 group/row hover:bg-surfaceSecondary rounded-xl px-2 -mx-2 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs font-bold text-textPrimary truncate pr-1">
                          {habit.name}
                        </span>
                        
                        {habit.streak > 0 && (
                          <div className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono shrink-0">
                            <Zap size={8} className="fill-current" />
                            <span>{habit.streak}d</span>
                          </div>
                        )}

                        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHabit(habit);
                            }}
                            className="p-1 hover:bg-pill text-textSecondary rounded-lg transition-colors cursor-pointer"
                            title="Edit & Details"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleHabitDay(habit.id, todayStr);
                            }}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              isCompletedToday 
                                ? 'text-green-600 bg-green-50 dark:bg-green-950/30' 
                                : 'hover:bg-pill text-textSecondary'
                            }`}
                            title="Mark Complete for Today"
                          >
                            <Check size={11} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0 ml-4">
                        {last7Days.map((day) => {
                          const isCompleted = habit.completedDays.includes(day.dateStr);
                          return (
                            <button
                              key={day.dateStr}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleHabitDay(habit.id, day.dateStr);
                              }}
                              className={`w-6 h-6 rounded-md transition-all duration-300 flex items-center justify-center border cursor-pointer ${
                                isCompleted
                                  ? 'bg-pill-active text-pill-active-text border-pill-active scale-105 shadow-sm'
                                  : 'bg-pill/50 hover:bg-pill border-transparent text-transparent hover:text-textSecondary'
                              }`}
                              title={`${habit.name} - ${day.dateStr}`}
                            >
                              {isCompleted && <Check size={10} strokeWidth={4} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
              <span className="text-textSecondary font-medium">Most Consistent Habit</span>
              <span className="font-bold text-textPrimary bg-pill px-2.5 py-1 rounded-lg">
                {getMostConsistentHabit(unassignedHabits)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Global Empty State - if there are absolutely no habits created in the app */}
      {habits.length === 0 && (
        <div className="bg-surface border border-border rounded-[32px] p-12 text-center flex flex-col items-center justify-center min-h-[40vh] canvas-shadow mt-8 max-w-2xl mx-auto">
          <div className="p-4 bg-surfaceSecondary border border-border rounded-2xl mb-4 text-textSecondary">
            <CalendarDays size={40} />
          </div>
          <h3 className="text-lg font-headline font-bold text-textPrimary mb-2">No habits created yet</h3>
          <p className="text-sm text-textSecondary max-w-sm mb-6">
            Routines define our neural pathways. Create your first recurring habit and link it directly to an active project card!
          </p>
          <button
            onClick={() => handleOpenAddForm()}
            className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-5 py-2.5 rounded-full text-xs font-semibold shadow-md transition-all hover:scale-105 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Habit</span>
          </button>
        </div>
      )}

      {/* Detail Slide-Over Side Panel for Habit details */}
      {selectedHabit && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/15 backdrop-blur-sm"
            onClick={() => setSelectedHabit(null)}
          />
          {/* Panel content */}
          <div className="relative w-full max-w-md bg-surface border-l border-border h-full p-6 md:p-8 shadow-2xl flex flex-col justify-between animate-slide-in overflow-y-auto">
            <div>
              {/* Close button & header info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 bg-pill-active text-pill-active-text rounded-lg tracking-wider">
                    {selectedHabit.project || 'General'}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedHabit(null)}
                  className="p-1.5 hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title Input / Display */}
              <div className="mb-6">
                <input
                  type="text"
                  value={selectedHabit.name}
                  onChange={(e) => onUpdateHabit(selectedHabit.id, { name: e.target.value })}
                  className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-textPrimary focus:ring-0 text-xl font-bold text-textPrimary outline-none pb-1 transition-all"
                  placeholder="Habit Name"
                />
                <span className="text-[10px] text-textSecondary font-medium tracking-wide block mt-1 uppercase font-mono">
                  Created {new Date(selectedHabit.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </div>

              {/* Metric stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surfaceSecondary border border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-1 text-amber-500 mb-1">
                    <Zap size={14} className="fill-current" />
                    <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Current Streak</span>
                  </div>
                  <div className="text-xl font-extrabold text-textPrimary font-mono">
                    {selectedHabit.streak} days
                  </div>
                </div>

                <div className="bg-surfaceSecondary border border-border p-4 rounded-2xl">
                  <div className="flex items-center gap-1 text-amber-500 mb-1">
                    <Award size={14} />
                    <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">Longest Streak</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={selectedHabit.longestStreak || 0}
                      onChange={(e) => onUpdateHabit(selectedHabit.id, { longestStreak: parseInt(e.target.value) || 0 })}
                      className="w-14 bg-transparent border-b border-border text-xl font-extrabold text-textPrimary outline-none font-mono focus:border-textPrimary text-center"
                    />
                    <span className="text-xs text-textSecondary font-medium font-mono">days</span>
                  </div>
                </div>
              </div>

              {/* Completion Rate / Circular Meter representation */}
              <div className="bg-surfaceSecondary border border-border p-4 rounded-2xl mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider">30-Day Completion Rate</span>
                  <span className="text-xs font-bold text-textPrimary font-mono">
                    {getLast30DaysStats(selectedHabit).completions}/30 days ({getLast30DaysStats(selectedHabit).rate}%)
                  </span>
                </div>
                <div className="w-full bg-pill rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-pill-active h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getLast30DaysStats(selectedHabit).rate}%` }}
                  />
                </div>
              </div>

              {/* Monthly Interactive Calendar Grid */}
              <div className="mb-6">
                <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block mb-2">Monthly History Log</span>
                {(() => {
                  const { year, month, startDayOfWeek, totalDays } = getMonthDays();
                  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                  
                  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                  const cells = [];
                  for (let i = 0; i < startDayOfWeek; i++) {
                    cells.push(null);
                  }
                  for (let i = 1; i <= totalDays; i++) {
                    cells.push(i);
                  }

                  return (
                    <div className="bg-surfaceSecondary p-4 rounded-2xl border border-border">
                      <div className="text-xs font-bold text-textPrimary mb-3 text-center tracking-wide uppercase">{monthName}</div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {dayLabels.map((lbl, idx) => (
                          <div key={idx} className="text-[9px] font-bold text-textMuted font-mono tracking-widest pb-1">
                            {lbl}
                          </div>
                        ))}
                        {cells.map((dayNum, idx) => {
                          if (dayNum === null) {
                            return <div key={`empty-${idx}`} className="p-1" />;
                          }
                          
                          const cellDate = new Date(year, month, dayNum);
                          // Adjust for timezone string splitting
                          const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const isCompleted = selectedHabit.completedDays.includes(localDateStr);
                          
                          return (
                            <button 
                              key={`day-${dayNum}`}
                              onClick={() => onToggleHabitDay(selectedHabit.id, localDateStr)}
                              className={`text-xs p-1 h-7 w-7 rounded-full flex items-center justify-center cursor-pointer transition-all mx-auto ${
                                isCompleted
                                  ? 'bg-pill-active text-pill-active-text font-extrabold font-mono shadow-sm'
                                  : 'text-textPrimary hover:bg-pill font-mono font-medium'
                              }`}
                              title={localDateStr}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes Area (Editable) */}
              <div className="mb-6">
                <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block mb-2">Routine Notes & Cues</span>
                <textarea
                  value={selectedHabit.notes || ''}
                  onChange={(e) => onUpdateHabit(selectedHabit.id, { notes: e.target.value })}
                  className="w-full bg-surfaceSecondary border border-border text-xs p-3 rounded-2xl outline-none text-textPrimary resize-none min-h-[96px] focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="Set reminder cues or guidelines..."
                />
              </div>
            </div>

            {/* Actions: Delete */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${selectedHabit.name}?`)) {
                    onDeleteHabit(selectedHabit.id);
                    setSelectedHabit(null);
                  }
                }}
                className="flex items-center gap-1 px-4 py-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-textSecondary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete Habit</span>
              </button>
              
              <button
                onClick={() => {
                  const freq = selectedHabit.frequency === 'daily' ? 'weekly' : 'daily';
                  onUpdateHabit(selectedHabit.id, { frequency: freq });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pill hover:opacity-90 rounded-full text-[10px] font-extrabold text-textPrimary transition-all uppercase cursor-pointer"
              >
                <RefreshCw size={10} />
                <span>Change to {selectedHabit.frequency === 'daily' ? 'Weekly' : 'Daily'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Modal for Adding/Customizing Habit */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowAddForm(false)}
          />
          {/* Form Modal Box */}
          <form 
            onSubmit={handleCreateHabitSubmit}
            className="relative bg-surface w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl border border-border animate-scale-in"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-textPrimary font-headline">Add Custom Routine</h3>
              <button 
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary rounded-full transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Habit Name</label>
                <input
                  type="text"
                  required
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g. Drink 3L water daily"
                  className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Link to Project Card</label>
                <select
                  value={selectedProjectName}
                  onChange={(e) => setSelectedProjectName(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent transition-all cursor-pointer"
                >
                  <option value="">General Routines (No Project)</option>
                  {allProjects.map((p) => (
                    <option key={p.name} value={p.name}>{p.area} &rarr; {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Frequency</label>
                <div className="flex gap-2 bg-surfaceSecondary border border-border p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFrequency('daily')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      frequency === 'daily'
                        ? 'bg-pill-active text-pill-active-text shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('weekly')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      frequency === 'weekly'
                        ? 'bg-pill-active text-pill-active-text shadow-sm'
                        : 'text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-6 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-pill-active text-pill-active-text hover:opacity-90 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 cursor-pointer"
              >
                Create Habit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
