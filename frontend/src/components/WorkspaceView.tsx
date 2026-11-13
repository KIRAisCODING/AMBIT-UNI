import React, { useState } from 'react';
import { 
  Check, Calendar, Tag, Plus, ArrowLeft, ArrowUpRight, AlertCircle, Trash2, Edit2, 
  CheckCircle2, Circle, Eye, Sparkles, AlertTriangle, GripVertical, Folder, X,
  FileText, Brain, Zap, CheckSquare
} from 'lucide-react';
import { BrainItem, ItemType, AreaHierarchy, Note, Habit } from '../types';
import EditInboxItemModal from './EditInboxItemModal';

interface WorkspaceViewProps {
  area: string;
  project?: string;
  subProject?: string;
  items: BrainItem[];
  notes?: Note[];
  habits?: Habit[];
  hierarchy?: AreaHierarchy[];
  onCreateSubProject?: (name: string, projectId: string) => Promise<void>;
  onToggleComplete: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddTask: (task: Omit<BrainItem, 'id' | 'createdAt'>) => void;
  onUpdateTask: (id: string, updates: Partial<BrainItem>) => void;
  onReorderTasks?: (orderedIds: string[]) => void;
  onCreateNote?: (noteInput: any) => Promise<any>;
  onDeleteNote?: (id: string) => Promise<void>;
  onAddHabit?: (name: string, frequency: 'daily' | 'weekly', project?: string, area?: string, subProject?: string) => Promise<any> | void;
  onToggleHabitDay?: (id: string, dateStr: string) => Promise<any> | void;
}

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WorkspaceView({
  area,
  project,
  subProject,
  items,
  notes = [],
  habits = [],
  hierarchy = [],
  onCreateSubProject,
  onToggleComplete,
  onDeleteItem,
  onAddTask,
  onUpdateTask,
  onReorderTasks,
  onCreateNote,
  onDeleteNote,
  onAddHabit,
  onToggleHabitDay,
}: WorkspaceViewProps) {
  // Find current hierarchy node to inspect subprojects
  const currentAreaNode = hierarchy.find(a => a.name === area || a.id === area);
  const currentProjectNode = currentAreaNode?.projects.find(p => p.name === project || p.id === project);
  const availableSubProjects = currentProjectNode?.subProjects || [];
  const selectedSubProjectNode = availableSubProjects.find(sp => sp.name === subProject || sp.id === subProject);

  // Workspace sub-tabs: 'tasks' | 'notes' | 'habits'
  const isAreaWorkspace = Boolean(area && !project && !subProject);
  const [activeSection, setActiveSection] = useState<'tasks' | 'notes' | 'habits'>('tasks');

  // Helpers to safely resolve hierarchy identifiers and names across legacy and normalized entities
  const getAreaId = (it: any) => it.areaId || (typeof it.area === 'object' ? it.area?.id : null);
  const getAreaName = (it: any) => (typeof it.area === 'string' ? it.area : it.area?.name) || it.areaName || '';
  const getProjectId = (it: any) => it.projectId || (typeof it.project === 'object' ? it.project?.id : null);
  const getProjectName = (it: any) => (typeof it.project === 'string' ? it.project : it.project?.name) || it.projectName || '';
  const getSubProjectId = (it: any) => it.subProjectId || (typeof it.subProject === 'object' ? it.subProject?.id : null);
  const getSubProjectName = (it: any) => (typeof it.subProject === 'string' ? it.subProject : it.subProject?.name) || it.subProjectName || '';

  // 1. Filter tasks belonging to this Area, Project, or SubProject
  const subProjectItems = items.filter(item => {
    const isAssigned = item.assignment === 'now' || Boolean(
      item.areaId || item.projectId || item.subProjectId || 
      getAreaId(item) || getProjectId(item) || getSubProjectId(item) ||
      getAreaName(item) || getProjectName(item) || getSubProjectName(item)
    );
    if (!isAssigned) return false;

    if (subProject) {
      const matchSub = (selectedSubProjectNode?.id && getSubProjectId(item) === selectedSubProjectNode.id) ||
        (getSubProjectName(item).toLowerCase() === subProject.toLowerCase());
      return matchSub;
    }

    if (project) {
      const matchProj = (currentProjectNode?.id && getProjectId(item) === currentProjectNode.id) ||
        (getProjectName(item).toLowerCase() === project.toLowerCase());
      return matchProj;
    }

    const matchArea = (currentAreaNode?.id && getAreaId(item) === currentAreaNode.id) ||
      (getAreaName(item).toLowerCase() === area.toLowerCase());
    return matchArea;
  });

  // Sort tasks using the custom sequential order field
  const sortedSubProjectItems = [...subProjectItems].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 0;
    const orderB = b.order !== undefined ? b.order : 0;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // 2. Filter notes belonging to this Area, Project, or Subproject
  const workspaceNotes = notes.filter((n) => {
    if (n.archivedAt) return false;

    if (subProject) {
      return Boolean(
        (selectedSubProjectNode?.id && n.subProjectId === selectedSubProjectNode.id) ||
        (typeof n.subProject === 'object' && n.subProject?.name?.toLowerCase() === subProject.toLowerCase()) ||
        ((n.subProject as any) === subProject)
      );
    }

    if (project) {
      return Boolean(
        (currentProjectNode?.id && n.projectId === currentProjectNode.id) ||
        (typeof n.project === 'object' && n.project?.name?.toLowerCase() === project.toLowerCase()) ||
        ((n.project as any) === project)
      );
    }

    return Boolean(
      (currentAreaNode?.id && n.areaId === currentAreaNode.id) ||
      (typeof n.area === 'object' && n.area?.name?.toLowerCase() === area.toLowerCase()) ||
      ((n.area as any) === area)
    );
  });

  // 3. Filter habits belonging to this Area (Habits only link to Area)
  const workspaceHabits = habits.filter((h) => {
    if (!isAreaWorkspace) return false;
    return (currentAreaNode?.id && h.areaId === currentAreaNode.id) ||
      (typeof h.area === 'object' && h.area?.name?.toLowerCase() === area.toLowerCase()) ||
      (typeof h.area === 'string' && h.area.toLowerCase() === area.toLowerCase());
  });

  // States
  const [activeSubProjectFilter, setActiveSubProjectFilter] = useState<string>('all');
  const [showAddSubProjectForm, setShowAddSubProjectForm] = useState(false);
  const [newSubProjectName, setNewSubProjectName] = useState('');
  const [isCreatingSubProject, setIsCreatingSubProject] = useState(false);
  const [subProjectError, setSubProjectError] = useState('');
  const [newTaskSubProject, setNewTaskSubProject] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingModalItem, setEditingModalItem] = useState<BrainItem | null>(null);

  // Inline editing state for expanded tasks
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editDate, setEditDate] = useState('');

  // Note creator state in workspace
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [noteTagInput, setNoteTagInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Habit creator state in workspace
  const [showNewHabitForm, setShowNewHabitForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [isSubmittingHabit, setIsSubmittingHabit] = useState(false);

  const directTasksCount = subProjectItems.filter(it => !getSubProjectId(it) && !getSubProjectName(it)).length;

  const handleCreateSubProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubProjectName.trim() || !currentProjectNode?.id) return;
    const name = newSubProjectName.trim();
    if (availableSubProjects.some(sp => sp.name.toLowerCase() === name.toLowerCase())) {
      setSubProjectError('Subproject already exists');
      return;
    }
    setIsCreatingSubProject(true);
    setSubProjectError('');
    try {
      if (onCreateSubProject) {
        await onCreateSubProject(name, currentProjectNode.id);
      }
      setNewSubProjectName('');
      setShowAddSubProjectForm(false);
    } catch (err: any) {
      setSubProjectError(err.message || 'Failed to create subproject');
    } finally {
      setIsCreatingSubProject(false);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId) {
      const sourceIndex = sortedSubProjectItems.findIndex(it => it.id === sourceId);
      const targetIndex = sortedSubProjectItems.findIndex(it => it.id === targetId);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newItems = [...sortedSubProjectItems];
        const [removed] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        
        if (onReorderTasks) {
          onReorderTasks(newItems.map(it => it.id));
        }
      }
    }
  };

  const handleToggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(id);
      setEditingId(null);
    }
  };

  const startEditing = (item: BrainItem) => {
    setEditingId(item.id);
    setEditTitle(item.title || item.content.split(' ').slice(0, 6).join(' ') + '...');
    setEditContent(item.content);
    setEditPriority(item.priority || 'medium');
    setEditDate(item.scheduledDate || '');
  };

  const saveEdit = (id: string) => {
    onUpdateTask(id, {
      title: editTitle,
      content: editContent,
      priority: editPriority,
      scheduledDate: editDate || undefined
    });
    setEditingId(null);
  };

  const handleAddTagToNewTask = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      if (!newTaskTags.includes(newTagInput.trim())) {
        setNewTaskTags([...newTaskTags, newTagInput.trim()]);
      }
      setNewTagInput('');
    }
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim() && !newTaskTitle.trim()) return;

    const actualTitle = newTaskTitle.trim() || newTaskContent.trim().split(' ').slice(0, 5).join(' ') + '...';
    
    // Find next order index
    const maxOrder = subProjectItems.reduce((max, it) => {
      const ord = it.order !== undefined ? it.order : 0;
      return ord > max ? ord : max;
    }, 0);

    const targetSub = newTaskSubProject 
      ? availableSubProjects.find(sp => sp.name === newTaskSubProject || sp.id === newTaskSubProject)
      : selectedSubProjectNode;

    onAddTask({
      content: newTaskContent.trim(),
      title: actualTitle,
      type: 'Task',
      assignment: 'now',
      areaId: currentAreaNode?.id || undefined,
      projectId: currentProjectNode?.id || undefined,
      subProjectId: targetSub?.id || undefined,
      area: currentAreaNode?.name || area,
      project: currentProjectNode?.name || project || undefined,
      subProject: subProject || (newTaskSubProject ? newTaskSubProject : undefined),
      priority: newTaskPriority,
      scheduledDate: newTaskDate || undefined,
      tags: newTaskTags,
      completed: false,
      order: maxOrder + 1
    });

    // Reset Form
    setNewTaskTitle('');
    setNewTaskContent('');
    setNewTaskPriority('medium');
    setNewTaskDate('');
    setNewTaskTags([]);
    setNewTaskSubProject('');
    setShowNewForm(false);
  };

  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() && !newNoteTitle.trim()) return;
    if (!onCreateNote) return;

    setIsSubmittingNote(true);
    try {
      await onCreateNote({
        title: newNoteTitle.trim() || null,
        content: newNoteContent.trim(),
        areaId: currentAreaNode?.id || null,
        projectId: currentProjectNode?.id || null,
        subProjectId: selectedSubProjectNode?.id || null,
        tags: newNoteTags,
      });

      setNewNoteTitle('');
      setNewNoteContent('');
      setNewNoteTags([]);
      setNoteTagInput('');
      setShowNewNoteForm(false);
    } catch (err) {
      console.error('Failed to create workspace note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleCreateHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim() || !onAddHabit) return;

    setIsSubmittingHabit(true);
    try {
      await onAddHabit(
        newHabitName.trim(),
        newHabitFreq,
        undefined,
        currentAreaNode?.id || currentAreaNode?.name || area
      );
      setNewHabitName('');
      setShowNewHabitForm(false);
    } catch (err) {
      console.error('Failed to create workspace habit:', err);
    } finally {
      setIsSubmittingHabit(false);
    }
  };

  const displayedItems = sortedSubProjectItems.filter(item => {
    if (activeSubProjectFilter === 'all') return true;
    if (activeSubProjectFilter === '__direct__') {
      return !getSubProjectId(item) && !getSubProjectName(item);
    }
    return getSubProjectName(item).toLowerCase() === activeSubProjectFilter.toLowerCase() ||
           getSubProjectId(item) === activeSubProjectFilter;
  });

  const last7Days = (() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push({
        dateStr: toLocalDateString(d),
        dayName: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isToday: i === 0
      });
    }
    return list;
  })();

  const todayStr = toLocalDateString(new Date());

  return (
    <div id="tour-workspace-view" className="w-full max-w-[1440px] mx-auto animate-fade-in">
      {/* Workspace Header */}
      <div className="border-b border-border pb-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-textSecondary font-semibold mb-1.5 uppercase tracking-wider">
            <span>{area}</span>
            {project && (
              <>
                <span>/</span>
                <span>{project}</span>
              </>
            )}
            {subProject && (
              <>
                <span>/</span>
                <span className="text-textPrimary font-mono">{subProject}</span>
              </>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-textPrimary flex items-center gap-2">
            <span>{subProject ? `${subProject} Workspace` : project ? `${project} Workspace` : `${area} Workspace`}</span>
            <span className="text-xs bg-pill-active text-pill-active-text px-2.5 py-0.5 rounded-full font-mono font-bold">
              {subProjectItems.length} task{subProjectItems.length !== 1 ? 's' : ''}
            </span>
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {project && !subProject && (
            <button
              onClick={() => setShowAddSubProjectForm(!showAddSubProjectForm)}
              className="flex items-center gap-1.5 bg-pill hover:opacity-90 text-textSecondary hover:text-textPrimary px-3.5 py-2 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Add an optional subproject"
            >
              <Plus size={16} />
              <span>Add subproject</span>
            </button>
          )}

          {activeSection === 'tasks' && (
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>Add Task</span>
            </button>
          )}

          {activeSection === 'notes' && (
            <button
              onClick={() => setShowNewNoteForm(!showNewNoteForm)}
              className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>New Note</span>
            </button>
          )}

          {activeSection === 'habits' && (
            <button
              onClick={() => setShowNewHabitForm(!showNewHabitForm)}
              className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>New Habit</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Section Switcher: Tasks | Notes | Habits (if Area) */}
      <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
        <button
          onClick={() => setActiveSection('tasks')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'tasks'
              ? 'bg-pill-active text-pill-active-text shadow-sm'
              : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary'
          }`}
        >
          <CheckSquare size={16} />
          <span>Tasks ({subProjectItems.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('notes')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeSection === 'notes'
              ? 'bg-pill-active text-pill-active-text shadow-sm'
              : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary'
          }`}
        >
          <FileText size={16} />
          <span>Notes ({workspaceNotes.length})</span>
        </button>

        {isAreaWorkspace && (
          <button
            onClick={() => setActiveSection('habits')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'habits'
                ? 'bg-pill-active text-pill-active-text shadow-sm'
                : 'text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary'
            }`}
          >
            <Brain size={16} />
            <span>Habits & Routines ({workspaceHabits.length})</span>
          </button>
        )}
      </div>

      {/* Inline Add Subproject Form */}
      {showAddSubProjectForm && (
        <form 
          onSubmit={handleCreateSubProjectSubmit}
          className="bg-surface border border-border rounded-2xl p-4 mb-6 canvas-shadow animate-scale-in max-w-md"
        >
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">
              Add subproject
            </h4>
            <button
              type="button"
              onClick={() => { setShowAddSubProjectForm(false); setSubProjectError(''); }}
              className="text-textSecondary hover:text-textPrimary p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-textSecondary mb-3">
            Organise this project further with an optional subproject.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={newSubProjectName}
              onChange={(e) => setNewSubProjectName(e.target.value)}
              placeholder="Subproject name..."
              className="flex-1 bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={isCreatingSubProject || !newSubProjectName.trim()}
              className="bg-pill-active text-pill-active-text px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isCreatingSubProject ? 'Creating...' : 'Create'}
            </button>
          </div>
          {subProjectError && (
            <p className="text-[11px] text-red-500 font-medium mt-2">{subProjectError}</p>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: TASKS */}
      {/* ========================================================================= */}
      {activeSection === 'tasks' && (
        <div>
          {/* Subprojects Filter Strip - Only shown when project has subprojects */}
          {project && !subProject && availableSubProjects.length > 0 && (
            <div className="flex items-center gap-1.5 mb-6 overflow-x-auto hide-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setActiveSubProjectFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  activeSubProjectFilter === 'all'
                    ? 'bg-pill-active text-pill-active-text shadow-sm'
                    : 'bg-pill text-textSecondary hover:text-textPrimary'
                }`}
              >
                All Tasks ({subProjectItems.length})
              </button>
              {directTasksCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSubProjectFilter('__direct__')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    activeSubProjectFilter === '__direct__'
                      ? 'bg-pill-active text-pill-active-text shadow-sm'
                      : 'bg-pill text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  Direct Tasks ({directTasksCount})
                </button>
              )}
              {availableSubProjects.map(sp => {
                const count = subProjectItems.filter(it => 
                  getSubProjectId(it) === sp.id || getSubProjectName(it).toLowerCase() === sp.name.toLowerCase()
                ).length;
                return (
                  <button
                    key={sp.id || sp.name}
                    type="button"
                    onClick={() => setActiveSubProjectFilter(sp.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      activeSubProjectFilter.toLowerCase() === sp.name.toLowerCase()
                        ? 'bg-pill-active text-pill-active-text shadow-sm'
                        : 'bg-pill text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    <Folder size={13} className="opacity-70" />
                    <span>{sp.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* New Task Inline Form */}
          {showNewForm && (
            <form 
              onSubmit={handleCreateTaskSubmit}
              className="bg-surface border border-border rounded-[24px] p-6 mb-8 canvas-shadow animate-scale-in"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
                  <CheckCircle2 size={18} className="text-accent" />
                  <span>Create Task in {subProject || project || area}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="text-xs text-textSecondary hover:text-textPrimary font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-textSecondary mb-1.5">Task Title *</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary font-medium focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-textSecondary mb-1.5">Deadline / Scheduled Date</label>
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary font-medium font-mono focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Detailed Description</label>
                  <textarea
                    value={newTaskContent}
                    onChange={(e) => setNewTaskContent(e.target.value)}
                    placeholder="Describe the actionable scope of this task..."
                    className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary min-h-[70px] focus:ring-1 focus:ring-accent"
                    rows={2}
                  />
                </div>

                {/* Optional Subproject selection inside task creator - only if project has subprojects */}
                {availableSubProjects.length > 0 && !subProject && (
                  <div>
                    <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                      Subproject <span className="text-textSecondary/60 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={newTaskSubProject}
                      onChange={(e) => setNewTaskSubProject(e.target.value)}
                      className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary font-medium font-mono focus:ring-1 focus:ring-accent"
                    >
                      <option value="">None (Directly under {project})</option>
                      {availableSubProjects.map(sp => (
                        <option key={sp.id || sp.name} value={sp.name}>{sp.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-pill-active text-pill-active-text hover:opacity-90 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Task Stack List */}
          {displayedItems.length === 0 ? (
            <div className="bg-surface border border-border rounded-[28px] canvas-shadow p-12 text-center flex flex-col items-center justify-center min-h-[35vh]">
              <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textSecondary border border-border">
                <Check size={20} />
              </div>
              <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
                Task Queue Clear!
              </h3>
              <p className="text-sm text-textSecondary max-w-sm">
                No active tasks found in this view. Add a new task to organize your work.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item.id)}
                    className={`group bg-surface border rounded-[20px] p-4 canvas-shadow transition-all duration-200 ${
                      isExpanded 
                        ? 'border-textPrimary ring-1 ring-textPrimary/10 shadow-md' 
                        : item.completed 
                          ? 'border-border opacity-60' 
                          : 'border-border hover:border-textSecondary/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleComplete(item.id)}
                        className="mt-0.5 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer shrink-0"
                      >
                        {item.completed ? (
                          <CheckCircle2 size={18} className="text-green-500 fill-green-500/10" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => handleToggleExpand(item.id)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-sm font-semibold text-textPrimary cursor-pointer ${item.completed ? 'line-through text-textSecondary' : ''}`}>
                            {item.title || item.content}
                          </span>

                          {item.priority && item.priority !== 'NONE' && (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono ${
                              item.priority === 'high' || item.priority === 'HIGH' || item.priority === 'URGENT'
                                ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/20 dark:text-red-400'
                                : 'bg-surfaceSecondary text-textSecondary border border-border'
                            }`}>
                              {item.priority}
                            </span>
                          )}

                          {getSubProjectName(item) && !subProject && (
                            <span className="text-[10px] text-textSecondary bg-surfaceSecondary border border-border px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                              <Folder size={10} />
                              <span>{getSubProjectName(item)}</span>
                            </span>
                          )}
                        </div>

                        {item.scheduledDate && (
                          <div className="text-[10px] text-textSecondary flex items-center gap-1 font-mono">
                            <Calendar size={11} />
                            <span>{item.scheduledDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Hover Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingModalItem(item)}
                          className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-surfaceSecondary rounded-lg transition-colors cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 text-textSecondary hover:text-red-500 hover:bg-surfaceSecondary rounded-lg transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: NOTES */}
      {/* ========================================================================= */}
      {activeSection === 'notes' && (
        <div>
          {/* New Note Inline Form */}
          {showNewNoteForm && (
            <form
              onSubmit={handleCreateNoteSubmit}
              className="bg-surface border border-border rounded-[24px] p-6 mb-8 canvas-shadow animate-scale-in"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
                  <FileText size={18} className="text-accent" />
                  <span>Create Note in {subProject || project || area}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewNoteForm(false)}
                  className="text-xs text-textSecondary hover:text-textPrimary font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Title (Optional)</label>
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="Note heading or reference..."
                    className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Content (Markdown) *</label>
                  <textarea
                    required
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write your documentation, meeting notes, or ideas..."
                    className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary min-h-[100px] font-mono text-xs focus:ring-1 focus:ring-accent"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewNoteForm(false)}
                    className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNoteContent.trim()}
                    className="bg-pill-active text-pill-active-text hover:opacity-90 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {workspaceNotes.length === 0 ? (
            <div className="bg-surface border border-border rounded-[28px] canvas-shadow p-12 text-center flex flex-col items-center justify-center min-h-[30vh]">
              <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textSecondary border border-border">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
                No notes in this workspace
              </h3>
              <p className="text-xs text-textSecondary max-w-sm">
                Add references, documentation, or technical specs directly to this workspace.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspaceNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-surface border border-border hover:border-textSecondary/40 rounded-2xl p-5 canvas-shadow transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-textPrimary truncate">
                        {note.title || 'Untitled Note'}
                      </h4>
                      {onDeleteNote && (
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-textSecondary hover:text-red-500 transition-opacity cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-textSecondary line-clamp-3 whitespace-pre-wrap font-sans">
                      {note.content}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-textSecondary font-mono">
                    <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: HABITS (Area Workspace Only) */}
      {/* ========================================================================= */}
      {activeSection === 'habits' && isAreaWorkspace && (
        <div>
          {/* New Habit Inline Form */}
          {showNewHabitForm && (
            <form
              onSubmit={handleCreateHabitSubmit}
              className="bg-surface border border-border rounded-[24px] p-6 mb-8 canvas-shadow animate-scale-in max-w-md"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
                  <Brain size={18} className="text-accent" />
                  <span>Add Habit to {area}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewHabitForm(false)}
                  className="text-xs text-textSecondary hover:text-textPrimary font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Habit Name *</label>
                  <input
                    type="text"
                    required
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="e.g. Daily Standup Review..."
                    className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">Frequency</label>
                  <select
                    value={newHabitFreq}
                    onChange={(e) => setNewHabitFreq(e.target.value as any)}
                    className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl text-textPrimary outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewHabitForm(false)}
                    className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingHabit || !newHabitName.trim()}
                    className="bg-pill-active text-pill-active-text hover:opacity-90 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingHabit ? 'Adding...' : 'Add Habit'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {workspaceHabits.length === 0 ? (
            <div className="bg-surface border border-border rounded-[28px] canvas-shadow p-12 text-center flex flex-col items-center justify-center min-h-[30vh]">
              <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textSecondary border border-border">
                <Brain size={24} />
              </div>
              <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
                No habits assigned to {area}
              </h3>
              <p className="text-xs text-textSecondary max-w-sm">
                Build momentum by attaching daily and weekly routines to this Life Area.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workspaceHabits.map((habit) => {
                const isCompletedToday = Boolean(habit.completedToday);

                return (
                  <div
                    key={habit.id}
                    className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {onToggleHabitDay && (
                        <button
                          onClick={() => onToggleHabitDay(habit.id, todayStr)}
                          className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                            isCompletedToday
                              ? 'bg-green-500 text-white'
                              : 'bg-surfaceSecondary text-textSecondary border border-border hover:border-textPrimary'
                          }`}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold text-textPrimary">{habit.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-textSecondary font-mono mt-0.5">
                          <span className="uppercase">{habit.frequency}</span>
                          {(habit.streak > 0 || (habit.currentStreak || 0) > 0) && (
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                              <Zap size={11} className="fill-current" />
                              <span>{habit.currentStreak || habit.streak}d streak</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 7-day strip */}
                    <div className="flex items-center gap-1.5">
                      {last7Days.map((d) => {
                        const isDone = d.isToday
                          ? isCompletedToday
                          : (Array.isArray(habit.completedDays) && habit.completedDays.includes(d.dateStr));
                        return (
                          <div
                            key={d.dateStr}
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-mono ${
                              isDone ? 'bg-green-500 text-white font-bold' : 'bg-surfaceSecondary text-textSecondary/40'
                            }`}
                            title={`${d.dateStr}: ${isDone ? 'Completed' : 'Missed'}`}
                          >
                            {d.dayName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingModalItem && (
        <EditInboxItemModal
          item={editingModalItem}
          hierarchy={hierarchy}
          onSave={async (id, updates) => {
            onUpdateTask(id, updates);
            setEditingModalItem(null);
          }}
          onClose={() => setEditingModalItem(null)}
        />
      )}
    </div>
  );
}
