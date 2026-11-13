import React, { useState } from 'react';
import { 
  CheckSquare, Plus, Search, Tag, Folder, AlertCircle, CheckCircle2, Circle, 
  Trash2, Edit2, Calendar, Sparkles, X, ChevronRight, ArrowRight
} from 'lucide-react';
import { Task, BrainItem, AreaHierarchy, TaskPriority, TaskStatus } from '../types';
import EditInboxItemModal from './EditInboxItemModal';

interface TasksViewProps {
  tasks: (Task | BrainItem)[];
  hierarchy: AreaHierarchy[];
  onCreateTask: (taskInput: any) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<any>) => Promise<any>;
  onDeleteTask: (id: string) => Promise<void>;
  onToggleComplete: (id: string) => Promise<void>;
  onAssignTask: (id: string, areaId: string, projectId: string, subProjectId?: string, tags?: string[]) => Promise<any>;
  initialFilter?: string; // 'all' | 'unassigned' | areaId
}

export default function TasksView({
  tasks,
  hierarchy = [],
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onAssignTask,
  initialFilter = 'all',
}: TasksViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('NONE');
  const [newDueDate, setNewDueDate] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newAreaId, setNewAreaId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newSubProjectId, setNewSubProjectId] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Assign Modal State
  const [assigningTask, setAssigningTask] = useState<any>(null);
  const [assignAreaId, setAssignAreaId] = useState('');
  const [assignProjectId, setAssignProjectId] = useState('');
  const [assignSubProjectId, setAssignSubProjectId] = useState('');
  const [assignTags, setAssignTags] = useState<string[]>([]);
  const [assignTagInput, setAssignTagInput] = useState('');

  // Selected area/project nodes for cascading dropdowns in creator
  const selectedAreaNode = hierarchy.find((a) => a.id === newAreaId);
  const availableProjects = selectedAreaNode?.projects || [];
  const selectedProjectNode = availableProjects.find((p) => p.id === newProjectId);
  const availableSubProjects = selectedProjectNode?.subProjects || [];

  // Selected nodes for assign modal
  const assignAreaNode = hierarchy.find((a) => a.id === assignAreaId);
  const assignAvailableProjects = assignAreaNode?.projects || [];
  const assignProjectNode = assignAvailableProjects.find((p) => p.id === assignProjectId);
  const assignAvailableSubProjects = assignProjectNode?.subProjects || [];

  // Counts
  const unassignedCount = tasks.filter((t) => !t.areaId && !t.projectId && !t.subProjectId).length;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // 1. Completion filter
    const isCompleted = (task as any).status === 'COMPLETED' || Boolean((task as any).completed) || Boolean(task.completedAt);
    if (!showCompleted && isCompleted) return false;

    // 2. Main placement filter: 'all' | 'unassigned' | areaId
    if (selectedFilter === 'unassigned') {
      if (task.areaId || task.projectId || task.subProjectId) return false;
    } else if (selectedFilter !== 'all') {
      // Must match area
      const matchesArea = task.areaId === selectedFilter || 
        (typeof task.area === 'object' && task.area?.id === selectedFilter) ||
        (task.area === selectedFilter);
      if (!matchesArea) return false;
    }

    // 3. Priority filter
    if (selectedPriority !== 'all') {
      if (String(task.priority).toUpperCase() !== selectedPriority) return false;
    }

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (task.title || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      const matchTags = Array.isArray(task.tags) && task.tags.some((t: any) => 
        (typeof t === 'string' ? t : t.name || '').toLowerCase().includes(q)
      );
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    return true;
  });

  // Sort tasks: high priority first, then order, then newest
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const prioScore: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const diff = (prioScore[b.priority] || 0) - (prioScore[a.priority] || 0);
    if (diff !== 0) return diff;
    if (a.order !== b.order) return a.order - b.order;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsSubmitting(true);
    try {
      const targetArea = hierarchy.find((a) => a.id === newAreaId);
      const targetProj = targetArea?.projects.find((p) => p.id === newProjectId);
      const targetSub = targetProj?.subProjects.find((sp) => sp.id === newSubProjectId);

      const pendingTag = tagInput.trim();
      const finalTags = pendingTag && !newTags.includes(pendingTag) ? [...newTags, pendingTag] : newTags;

      await onCreateTask({
        title,
        description: newDescription.trim() || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        scheduledDate: newScheduledDate || undefined,
        areaId: newAreaId || null,
        projectId: newProjectId || null,
        subProjectId: newSubProjectId || null,
        area: targetArea?.name || undefined,
        project: targetProj?.name || undefined,
        subProject: targetSub?.name || undefined,
        tags: finalTags,
        status: 'TODO',
      });

      // Reset Form
      setNewTitle('');
      setNewDescription('');
      setNewPriority('NONE');
      setNewDueDate('');
      setNewScheduledDate('');
      setNewAreaId('');
      setNewProjectId('');
      setNewSubProjectId('');
      setNewTags([]);
      setTagInput('');
      setShowNewTaskForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartAssign = (task: any) => {
    setAssigningTask(task);
    setAssignAreaId(task.areaId || '');
    setAssignProjectId(task.projectId || '');
    setAssignSubProjectId(task.subProjectId || '');
    setAssignTags(Array.isArray(task.tags) ? task.tags.map((t: any) => typeof t === 'string' ? t : t.name) : []);
    setAssignTagInput('');
  };

  const handleConfirmAssign = async () => {
    if (!assigningTask || !assignAreaId) return;

    const pendingTag = assignTagInput.trim();
    const finalTags = pendingTag && !assignTags.includes(pendingTag) ? [...assignTags, pendingTag] : assignTags;

    try {
      await onAssignTask(
        assigningTask.id,
        assignAreaId,
        assignProjectId || '',
        assignSubProjectId || undefined,
        finalTags
      );
      setAssigningTask(null);
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in relative p-6 md:p-8 rounded-[32px] overflow-hidden border border-border/40 shadow-sm">
      {/* Background Gradient */}
      <div 
        className="absolute inset-0 -z-10 bg-gradient-to-t from-surface/95 via-surface/80 to-surface/35 backdrop-blur-md pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)'
        }}
      />

      {/* Header with Title and Add Task Action */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-headline font-bold text-textPrimary flex items-center gap-2">
              <CheckSquare className="text-accent" size={24} />
              <span>Tasks & Actions</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-surfaceSecondary border border-border text-textSecondary">
              {tasks.length} total
            </span>
          </div>
          <p className="text-xs text-textSecondary mt-0.5">
            Your unified task backlog across all Life Areas, Projects, and Unassigned actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textSecondary">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-xs text-textPrimary outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 max-w-full">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-pill-active text-pill-active-text shadow-sm'
                : 'bg-pill text-textSecondary hover:text-textPrimary'
            }`}
          >
            All Tasks ({tasks.length})
          </button>

          <button
            onClick={() => setSelectedFilter('unassigned')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === 'unassigned'
                ? 'bg-pill-active text-pill-active-text shadow-sm'
                : 'bg-pill text-textSecondary hover:text-textPrimary'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Unassigned</span>
            <span className="text-[10px] opacity-75 font-mono">({unassignedCount})</span>
          </button>

          {hierarchy.map((area) => {
            const count = tasks.filter((t) => t.areaId === area.id || (typeof t.area === 'object' && t.area?.id === area.id)).length;
            return (
              <button
                key={area.id || area.name}
                onClick={() => setSelectedFilter(selectedFilter === area.id ? 'all' : (area.id || area.name))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedFilter === area.id || selectedFilter === area.name
                    ? 'bg-pill-active text-pill-active-text shadow-sm'
                    : 'bg-pill text-textSecondary hover:text-textPrimary'
                }`}
              >
                <Folder size={12} className="opacity-70" />
                <span>{area.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-surface border border-border text-xs px-2.5 py-1.5 rounded-xl text-textSecondary outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Toggle completed */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showCompleted
                ? 'bg-surfaceSecondary text-textPrimary border-border'
                : 'text-textSecondary hover:text-textPrimary border-transparent'
            }`}
          >
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </button>
        </div>
      </div>

      {/* New Task Inline Creator Form */}
      {showNewTaskForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-surface border border-border rounded-[24px] p-6 mb-8 canvas-shadow animate-scale-in"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
              <CheckCircle2 size={18} className="text-accent" />
              <span>Create New First-Class Task</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowNewTaskForm(false)}
              className="text-xs text-textSecondary hover:text-textPrimary font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5">Task Title *</label>
              <input
                type="text"
                required
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What needs to be accomplished?"
                className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary font-medium focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5">Description (Optional)</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Add actionable details or context..."
                className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2 rounded-xl outline-none text-textPrimary min-h-[60px] focus:ring-1 focus:ring-accent"
                rows={2}
              />
            </div>

            {/* Hierarchy Assignment */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  Life Area <span className="text-textSecondary/60 font-normal">(Leave unassigned if standalone)</span>
                </label>
                <select
                  value={newAreaId}
                  onChange={(e) => {
                    setNewAreaId(e.target.value);
                    setNewProjectId('');
                    setNewSubProjectId('');
                  }}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="">Unassigned (None)</option>
                  {hierarchy.map((a) => (
                    <option key={a.id || a.name} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  Project <span className="text-textSecondary/60 font-normal">(Optional)</span>
                </label>
                <select
                  disabled={!newAreaId}
                  value={newProjectId}
                  onChange={(e) => {
                    setNewProjectId(e.target.value);
                    setNewSubProjectId('');
                  }}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-40"
                >
                  <option value="">Directly in Area</option>
                  {availableProjects.map((p) => (
                    <option key={p.id || p.name} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  Subproject <span className="text-textSecondary/60 font-normal">(Optional)</span>
                </label>
                <select
                  disabled={!newProjectId || availableSubProjects.length === 0}
                  value={newSubProjectId}
                  onChange={(e) => setNewSubProjectId(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-40"
                >
                  <option value="">Directly in Project</option>
                  {availableSubProjects.map((sp) => (
                    <option key={sp.id || sp.name} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="NONE">None</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="bg-pill-active text-pill-active-text hover:opacity-90 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="bg-surface border border-border rounded-[28px] canvas-shadow p-12 text-center flex flex-col items-center justify-center min-h-[35vh]">
          <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textSecondary border border-border">
            <CheckSquare size={24} />
          </div>
          <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
            {selectedFilter === 'unassigned' ? 'No unassigned tasks' : searchQuery ? 'No matching tasks found' : 'Task list clear!'}
          </h3>
          <p className="text-xs text-textSecondary max-w-sm">
            {selectedFilter === 'unassigned'
              ? 'All tasks are organized under Life Areas and Projects.'
              : 'Add a new first-class task to populate this view.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task) => {
            const isCompleted = (task as any).status === 'COMPLETED' || Boolean((task as any).completed) || Boolean(task.completedAt);
            const isUnassigned = !task.areaId && !task.projectId && !task.subProjectId;

            const areaName = typeof task.area === 'object' ? task.area?.name : (task.area || null);
            const projName = typeof task.project === 'object' ? task.project?.name : (task.project || null);
            const subName = typeof task.subProject === 'object' ? task.subProject?.name : (task.subProject || null);

            return (
              <div
                key={task.id}
                className={`bg-surface border rounded-2xl p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:border-textSecondary/40 ${
                  isCompleted ? 'border-border opacity-60' : 'border-border shadow-xs'
                }`}
              >
                {/* Left: Checkbox & Title */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleComplete(task.id)}
                    className="mt-0.5 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-green-500 fill-green-500/10" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-sm font-semibold text-textPrimary truncate ${isCompleted ? 'line-through text-textSecondary' : ''}`}>
                        {task.title}
                      </span>

                      {/* Priority Tag */}
                      {task.priority && task.priority !== 'NONE' && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono ${
                          task.priority === 'HIGH' || task.priority === 'URGENT'
                            ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                            : task.priority === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                              : 'bg-surfaceSecondary text-textSecondary border border-border'
                        }`}>
                          {task.priority}
                        </span>
                      )}

                      {/* Hierarchy Badge */}
                      {isUnassigned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Unassigned</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-textSecondary bg-surfaceSecondary border border-border px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                          <Folder size={10} />
                          <span>{[areaName, projName, subName].filter(Boolean).join(' / ')}</span>
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-textSecondary line-clamp-1 mb-1.5">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata strip: dates & tags */}
                    <div className="flex items-center gap-3 text-[10px] text-textSecondary font-mono flex-wrap">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </span>
                      )}
                      {task.scheduledDate && (
                        <span className="flex items-center gap-1 text-accent">
                          <Calendar size={11} />
                          <span>Scheduled: {task.scheduledDate}</span>
                        </span>
                      )}
                      {Array.isArray(task.tags) && task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {task.tags.map((t: any) => (
                            <span key={typeof t === 'string' ? t : t.name} className="bg-pill px-1.5 py-0.2 rounded text-[9px]">
                              #{typeof t === 'string' ? t : t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {isUnassigned && (
                    <button
                      onClick={() => handleStartAssign(task)}
                      className="px-2.5 py-1 text-xs font-semibold bg-pill hover:bg-pill-active text-textPrimary hover:text-pill-active-text rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title="Assign to Area or Project"
                    >
                      <span>Assign</span>
                      <ArrowRight size={12} />
                    </button>
                  )}

                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary rounded-lg transition-colors cursor-pointer"
                    title="Edit Task"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-textSecondary hover:text-red-500 hover:bg-surfaceSecondary rounded-lg transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Assign Dialog for Unassigned Tasks */}
      {assigningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface border border-border rounded-[24px] p-6 max-w-md w-full canvas-shadow">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2">
                <Folder size={16} className="text-accent" />
                <span>Assign Task to Hierarchy</span>
              </h3>
              <button
                onClick={() => setAssigningTask(null)}
                className="text-textSecondary hover:text-textPrimary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-textSecondary mb-4">
              Filing: <span className="font-semibold text-textPrimary font-sans">{assigningTask.title}</span>
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">Life Area *</label>
                <select
                  value={assignAreaId}
                  onChange={(e) => {
                    setAssignAreaId(e.target.value);
                    setAssignProjectId('');
                    setAssignSubProjectId('');
                  }}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium"
                >
                  <option value="">Select an Area...</option>
                  {hierarchy.map((a) => (
                    <option key={a.id || a.name} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  Project <span className="text-textSecondary/60 font-normal">(Optional: leave blank to file directly under Area)</span>
                </label>
                <select
                  disabled={!assignAreaId}
                  value={assignProjectId}
                  onChange={(e) => {
                    setAssignProjectId(e.target.value);
                    setAssignSubProjectId('');
                  }}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-40"
                >
                  <option value="">Directly in Area</option>
                  {assignAvailableProjects.map((p) => (
                    <option key={p.id || p.name} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  Subproject <span className="text-textSecondary/60 font-normal">(Optional)</span>
                </label>
                <select
                  disabled={!assignProjectId || assignAvailableSubProjects.length === 0}
                  value={assignSubProjectId}
                  onChange={(e) => setAssignSubProjectId(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent font-medium disabled:opacity-40"
                >
                  <option value="">Directly in Project</option>
                  {assignAvailableSubProjects.map((sp) => (
                    <option key={sp.id || sp.name} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningTask(null)}
                className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!assignAreaId}
                onClick={handleConfirmAssign}
                className="bg-pill-active text-pill-active-text hover:opacity-90 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-40"
              >
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditInboxItemModal
          item={{
            id: editingTask.id,
            content: editingTask.title,
            title: editingTask.title,
            type: 'Task',
            assignment: editingTask.areaId ? 'now' : 'later',
            areaId: editingTask.areaId || undefined,
            projectId: editingTask.projectId || undefined,
            subProjectId: editingTask.subProjectId || undefined,
            tags: Array.isArray(editingTask.tags) ? editingTask.tags.map((t: any) => typeof t === 'string' ? t : t.name) : [],
            createdAt: editingTask.createdAt,
            scheduledDate: editingTask.scheduledDate || undefined,
          }}
          hierarchy={hierarchy}
          onSave={async (id, updates: any) => {
            await onUpdateTask(id, {
              title: updates.title || updates.content,
              description: updates.description,
              areaId: updates.areaId || null,
              projectId: updates.projectId || null,
              subProjectId: updates.subProjectId || null,
              tags: updates.tags,
              scheduledDate: updates.scheduledDate || null,
            });
            setEditingTask(null);
          }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
