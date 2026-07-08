import React, { useState } from 'react';
import { 
  Check, Calendar, Tag, Plus, ArrowLeft, ArrowUpRight, AlertCircle, Trash2, Edit2, CheckCircle2, Circle, Eye, Sparkles, AlertTriangle, GripVertical
} from 'lucide-react';
import { BrainItem, ItemType } from '../types';

interface WorkspaceViewProps {
  area: string;
  project: string;
  subProject: string;
  items: BrainItem[];
  onToggleComplete: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onAddTask: (task: Omit<BrainItem, 'id' | 'createdAt'>) => void;
  onUpdateTask: (id: string, updates: Partial<BrainItem>) => void;
  onReorderTasks?: (orderedIds: string[]) => void;
}

export default function WorkspaceView({
  area,
  project,
  subProject,
  items,
  onToggleComplete,
  onDeleteItem,
  onAddTask,
  onUpdateTask,
  onReorderTasks
}: WorkspaceViewProps) {
  // Filter tasks belonging only to this specific SubProject
  const subProjectItems = items.filter(
    item => item.assignment === 'now' && 
            item.area === area && 
            item.project === project && 
            item.subProject === subProject
  );

  // Sort tasks using the custom sequential order field
  const sortedSubProjectItems = [...subProjectItems].sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 0;
    const orderB = b.order !== undefined ? b.order : 0;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // States
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTags, setNewTaskTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Inline editing state for expanded tasks
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editDate, setEditDate] = useState('');

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

    onAddTask({
      content: newTaskContent.trim(),
      title: actualTitle,
      type: 'Task',
      assignment: 'now',
      area,
      project,
      subProject,
      priority: newTaskPriority,
      scheduledDate: newTaskDate || undefined,
      tags: [...newTaskTags, area, project],
      completed: false,
      order: maxOrder + 1
    });

    // Reset Form
    setNewTaskTitle('');
    setNewTaskContent('');
    setNewTaskPriority('medium');
    setNewTaskDate('');
    setNewTaskTags([]);
    setShowNewForm(false);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in">
      {/* Workspace Header */}
      <div className="border-b border-border pb-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-textSecondary font-semibold mb-1.5 uppercase tracking-wider">
            <span>{area}</span>
            <span>/</span>
            <span>{project}</span>
            <span>/</span>
            <span className="text-textPrimary font-mono">{subProject}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-textPrimary flex items-center gap-2">
            <span>{subProject} Workspace</span>
            <span className="text-xs bg-pill-active text-pill-active-text px-2 py-0.5 rounded-full font-mono font-bold">
              {subProjectItems.length} task{subProjectItems.length !== 1 ? 's' : ''}
            </span>
          </h2>
        </div>

        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-1.5 bg-pill-active text-pill-active-text hover:opacity-90 px-4.5 py-2 rounded-full text-xs font-semibold shadow-md transition-all self-start sm:self-center cursor-pointer"
        >
          <Plus size={20} />
          <span>Add Task</span>
        </button>
      </div>

      {/* New Task Inline Form */}
      {showNewForm && (
        <form 
          onSubmit={handleCreateTaskSubmit}
          className="bg-surface border border-border rounded-[24px] p-6 mb-8 canvas-shadow animate-scale-in"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
            <h3 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
              <CheckCircle2 size={20} />
              <span>Create Task in {subProject}</span>
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
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
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
                className="w-full bg-surfaceSecondary border border-border text-sm px-4 py-2.5 rounded-xl outline-none text-textPrimary min-h-[80px] focus:ring-1 focus:ring-accent"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setNewTaskPriority(prio)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all uppercase tracking-wider cursor-pointer ${
                        newTaskPriority === prio
                          ? prio === 'high' 
                            ? 'bg-red-500 text-white border-red-500 shadow-sm' 
                            : prio === 'medium'
                              ? 'bg-pill-active text-pill-active-text border-pill-active shadow-sm'
                              : 'bg-gray-500 text-white border-gray-500 shadow-sm'
                          : 'bg-transparent border-border text-textSecondary hover:text-textPrimary'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">Tags (Press Enter to add)</label>
                <div className="flex items-center gap-1.5 flex-wrap bg-surfaceSecondary border border-border p-2 rounded-xl min-h-[42px]">
                  {newTaskTags.map(t => (
                    <span key={t} className="bg-surface border border-border text-textSecondary px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <span>{t}</span>
                      <button type="button" onClick={() => setNewTaskTags(newTaskTags.filter(x => x !== t))} className="hover:text-red-500 text-[8px] cursor-pointer">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTagToNewTask}
                    placeholder="+ Tag..."
                    className="bg-transparent border-none text-xs focus:ring-0 p-0 outline-none placeholder:text-textMuted text-textPrimary font-semibold max-w-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3">
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
      {subProjectItems.length === 0 ? (
        <div className="bg-surface border border-border rounded-[28px] canvas-shadow p-12 text-center flex flex-col items-center justify-center min-h-[45vh]">
          <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textSecondary">
            <Check size={20} />
          </div>
          <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
            Task Queue Clear!
          </h3>
          <p className="text-sm text-textSecondary max-w-sm">
            All tasks inside {subProject} are completed. Add a new task to resume.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {sortedSubProjectItems.map((item) => {
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
                className={`group bg-surface border rounded-[24px] p-5 canvas-shadow transition-all duration-300 ${
                  isExpanded 
                    ? 'border-textPrimary ring-1 ring-textPrimary/10 shadow-lg' 
                    : dragOverId === item.id
                      ? 'border-dashed border-textPrimary bg-surfaceSecondary scale-[1.01] shadow-md'
                      : item.completed 
                        ? 'border-border hover:border-textSecondary/45 opacity-60' 
                        : 'border-border hover:border-textSecondary/45'
                }`}
              >
                {/* Header Row (Summary View) */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Drag Handle Icon */}
                    <div 
                      className="mt-1.5 text-textSecondary/30 group-hover:text-textSecondary/70 transition-colors cursor-grab active:cursor-grabbing shrink-0"
                      title="Drag to reorder"
                    >
                      <GripVertical size={20} />
                    </div>

                    {/* Completion checkbox circular toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(item.id);
                      }}
                      className="mt-1 flex-shrink-0 text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                    >
                      {item.completed ? (
                        <CheckCircle2 size={20} className="text-textPrimary" />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0" onClick={() => handleToggleExpand(item.id)}>
                      {/* Priority and Date indicators */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* Priority Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          item.priority === 'high' ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-200 border-red-200 dark:border-red-900/40' :
                          item.priority === 'low' ? 'bg-surfaceSecondary border-border text-textSecondary' :
                          'bg-surfaceSecondary border-border text-textPrimary'
                        }`}>
                          {item.priority || 'medium'}
                        </span>

                        {/* Smart Summary Badge */}
                        {item.smartSummary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold text-yellow-700 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900/40">
                            <Sparkles size={20} />
                            <span>AI Analyzed</span>
                          </span>
                        )}

                        {/* Deadline */}
                        {item.scheduledDate && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-textSecondary font-mono font-medium">
                            <Calendar size={20} />
                            <span>{new Date(item.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </span>
                        )}
                      </div>

                      {/* Title or First Line */}
                      <h3 className={`text-base font-bold text-textPrimary leading-snug ${
                        item.completed ? 'line-through text-textSecondary/40' : ''
                      }`}>
                        {item.title || item.smartSummary || item.content.split('\n')[0]}
                      </h3>

                      {/* Snippet / Description Preview (Only when collapsed) */}
                      {!isExpanded && (
                        <p className="text-xs text-textSecondary mt-1.5 line-clamp-1 leading-relaxed">
                          {item.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleExpand(item.id)}
                      className="p-1.5 hover:bg-pill rounded-full text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                      title={isExpanded ? "Collapse inline view" : "Expand inline view"}
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-textSecondary rounded-full transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Expanded Sub-view (Never Navigates Away, No Modals!) */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-border animate-fade-in space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-textSecondary mb-1">Edit Title</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-surfaceSecondary border border-border text-xs font-bold p-2.5 rounded-lg text-textPrimary outline-none focus:ring-1 focus:ring-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-textSecondary mb-1">Edit Deadline</label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full bg-surfaceSecondary border border-border text-xs p-2.5 rounded-lg text-textPrimary outline-none font-mono focus:ring-1 focus:ring-accent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-textSecondary mb-1">Edit Content/Description</label>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={4}
                            className="w-full bg-surfaceSecondary border border-border text-xs p-2.5 rounded-lg text-textPrimary outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-xs font-semibold text-textSecondary mb-1">Edit Priority</label>
                            <div className="flex gap-1.5">
                              {(['low', 'medium', 'high'] as const).map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setEditPriority(p)}
                                  className={`px-3 py-1 text-[10px] font-bold rounded uppercase tracking-wider border transition-all cursor-pointer ${
                                    editPriority === p 
                                      ? 'bg-pill-active text-pill-active-text border-pill-active' 
                                      : 'bg-transparent text-textSecondary border-border'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3.5 py-1.5 text-xs font-semibold text-textSecondary hover:bg-surfaceSecondary rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="bg-pill-active text-pill-active-text px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:opacity-95 transition-colors cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs font-medium text-textPrimary">
                        {/* Full description */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">Scope Description</span>
                          <p className="text-sm text-textPrimary leading-relaxed whitespace-pre-wrap font-medium">
                            {item.content || "No detailed scope has been added to this task."}
                          </p>
                        </div>

                        {/* Smart generated AI metadata if present */}
                        {item.smartSummary && (
                          <div className="bg-yellow-50/40 dark:bg-yellow-950/10 p-3.5 rounded-xl border border-yellow-100 dark:border-yellow-900/25">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">
                              <Sparkles size={20} />
                              <span>Gemini Smart Synthesizer</span>
                            </div>
                            <p className="text-xs text-textPrimary leading-relaxed font-semibold">{item.smartSummary}</p>
                          </div>
                        )}

                        {/* Info details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surfaceSecondary/50 border border-border/60 p-3 rounded-xl">
                          <div>
                            <span className="text-[9px] text-textSecondary uppercase tracking-wider font-bold block mb-0.5">Assigned to</span>
                            <span className="font-semibold text-textPrimary">{subProject}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-textSecondary uppercase tracking-wider font-bold block mb-0.5">Priority</span>
                            <span className="font-semibold uppercase text-textPrimary">{item.priority || 'medium'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-textSecondary uppercase tracking-wider font-bold block mb-0.5">Created on</span>
                            <span className="font-mono text-textPrimary">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-textSecondary uppercase tracking-wider font-bold block mb-0.5">Status</span>
                            <span className="font-semibold text-textPrimary">{item.completed ? '✓ Completed' : '○ Active'}</span>
                          </div>
                        </div>

                        {/* Associated Tags */}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <Tag size={20} className="text-textSecondary" />
                            {item.tags.map(t => (
                              <span key={t} className="text-[10px] text-textSecondary bg-pill px-2 py-0.5 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between border-t border-border pt-3">
                          <button
                            onClick={() => startEditing(item)}
                            className="flex items-center gap-1.5 text-xs text-textSecondary hover:text-textPrimary font-semibold transition-colors cursor-pointer"
                          >
                            <Edit2 size={20} />
                            <span>Edit Scope Details</span>
                          </button>

                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 size={20} />
                            <span>Erase Task</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
