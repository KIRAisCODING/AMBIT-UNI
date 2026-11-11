import React, { useState } from 'react';
import { X, CheckCircle2, FileText, CheckSquare, Sparkles, Folder, Calendar, Tag, AlertCircle } from 'lucide-react';
import { Capture, AreaHierarchy, TaskPriority } from '../types';
import { PromoteCaptureOptions } from '../hooks/useCaptures';

interface PromoteCaptureModalProps {
  capture: Capture;
  hierarchy: AreaHierarchy[];
  onPromote: (id: string, options: PromoteCaptureOptions) => Promise<any>;
  onClose: () => void;
}

export default function PromoteCaptureModal({
  capture,
  hierarchy = [],
  onPromote,
  onClose,
}: PromoteCaptureModalProps) {
  // Target type: default to capture.type ('TASK', 'NOTE', 'HABIT')
  const [targetType, setTargetType] = useState<'TASK' | 'NOTE' | 'HABIT'>(
    capture.type || 'TASK'
  );

  // Common fields
  const [title, setTitle] = useState(capture.rawContent);
  const [content, setContent] = useState(capture.rawContent);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NONE');
  const [dueDate, setDueDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Hierarchy assignment
  const [areaId, setAreaId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [subProjectId, setSubProjectId] = useState('');

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Habit specific
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState<number>(5);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected hierarchy helpers
  const selectedArea = hierarchy.find((a) => a.id === areaId);
  const availableProjects = selectedArea?.projects || [];
  const selectedProject = availableProjects.find((p) => p.id === projectId);
  const availableSubProjects = selectedProject?.subProjects || [];

  const handleAreaChange = (newAreaId: string) => {
    setAreaId(newAreaId);
    setProjectId('');
    setSubProjectId('');
  };

  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    setSubProjectId('');
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const pendingTag = tagInput.trim();
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;

    try {
      const options: PromoteCaptureOptions = {
        targetType,
        areaId: areaId || null,
        tags: finalTags,
      };

      if (targetType === 'TASK') {
        options.title = title.trim() || 'Untitled Task';
        options.description = description.trim() || undefined;
        options.priority = priority;
        options.dueDate = dueDate || null;
        options.scheduledDate = scheduledDate || null;
        options.projectId = projectId || null;
        options.subProjectId = subProjectId || null;
      } else if (targetType === 'NOTE') {
        options.title = title.trim() || 'Untitled Note';
        options.content = content.trim();
        options.projectId = projectId || null;
        options.subProjectId = subProjectId || null;
      } else if (targetType === 'HABIT') {
        options.title = title.trim() || 'Untitled Habit';
        options.frequency = frequency;
        options.targetDaysPerWeek = frequency === 'WEEKLY' ? targetDaysPerWeek : null;
      }

      await onPromote(capture.id, options);
      onClose();
    } catch (err: any) {
      console.error('Promotion error:', err);
      setError(err.message || 'Failed to promote capture');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-[28px] w-full max-w-xl max-h-[90vh] overflow-y-auto canvas-shadow p-6 md:p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-accent/10 text-accent font-semibold">
              <Sparkles size={18} />
            </span>
            <h2 className="text-xl md:text-2xl font-headline font-bold text-textPrimary">
              Organize Capture
            </h2>
          </div>
          <p className="text-xs md:text-sm text-textSecondary">
            Convert this raw capture into a first-class Task, Note, or Habit.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Target Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-2">
              CONVERT TO
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('TASK')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  targetType === 'TASK'
                    ? 'border-accent bg-accent/10 text-accent shadow-sm'
                    : 'border-border bg-surfaceSecondary text-textSecondary hover:text-textPrimary'
                }`}
              >
                <CheckSquare size={16} />
                <span>Task</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('NOTE')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  targetType === 'NOTE'
                    ? 'border-accent bg-accent/10 text-accent shadow-sm'
                    : 'border-border bg-surfaceSecondary text-textSecondary hover:text-textPrimary'
                }`}
              >
                <FileText size={16} />
                <span>Note</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetType('HABIT')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  targetType === 'HABIT'
                    ? 'border-accent bg-accent/10 text-accent shadow-sm'
                    : 'border-border bg-surfaceSecondary text-textSecondary hover:text-textPrimary'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>Habit</span>
              </button>
            </div>
          </div>

          {/* Title or Habit Name */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1.5">
              {targetType === 'HABIT' ? 'HABIT NAME' : 'TITLE'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surfaceSecondary border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder:text-textMuted focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
              placeholder={targetType === 'HABIT' ? 'e.g. Read 20 pages' : 'e.g. Complete quarterly report'}
            />
          </div>

          {/* Note Content / Task Description */}
          {targetType === 'NOTE' && (
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                MARKDOWN CONTENT
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
                className="w-full bg-surfaceSecondary border border-border rounded-xl p-3 text-sm text-textPrimary placeholder:text-textMuted focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-mono"
                placeholder="Write your note in Markdown..."
              />
            </div>
          )}

          {targetType === 'TASK' && (
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                DESCRIPTION (OPTIONAL)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-surfaceSecondary border border-border rounded-xl p-3 text-sm text-textPrimary placeholder:text-textMuted focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                placeholder="Additional details or acceptance criteria..."
              />
            </div>
          )}

          {/* Task-specific Priority & Dates */}
          {targetType === 'TASK' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  PRIORITY
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                >
                  <option value="NONE">None</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  DUE DATE (DEADLINE)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  SCHEDULED DATE (PLANNED)
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Habit-specific Frequency & Target */}
          {targetType === 'HABIT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                  FREQUENCY
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'DAILY' | 'WEEKLY')}
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                >
                  <option value="DAILY">Daily Routine</option>
                  <option value="WEEKLY">Weekly Habit</option>
                </select>
              </div>

              {frequency === 'WEEKLY' && (
                <div>
                  <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                    TARGET DAYS PER WEEK
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={targetDaysPerWeek}
                    onChange={(e) => setTargetDaysPerWeek(Number(e.target.value))}
                    className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Hierarchy Placement: Area (and Project/SubProject for Task & Note) */}
          <div className="pt-2 border-t border-border">
            <label className="block text-xs font-semibold text-textSecondary mb-2 flex items-center gap-1.5">
              <Folder size={14} />
              <span>HIERARCHY PLACEMENT</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <select
                  value={areaId}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                >
                  <option value="">No Area (Standalone)</option>
                  {hierarchy.map((a) => (
                    <option key={a.id || a.name} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {targetType !== 'HABIT' && (
                <div>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    disabled={!areaId}
                    className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer disabled:opacity-40"
                  >
                    <option value="">No Project</option>
                    {availableProjects.map((p) => (
                      <option key={p.id || p.name} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType !== 'HABIT' && (
                <div>
                  <select
                    value={subProjectId}
                    onChange={(e) => setSubProjectId(e.target.value)}
                    disabled={!projectId}
                    className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer disabled:opacity-40"
                  >
                    <option value="">No Subproject</option>
                    {availableSubProjects.map((sp) => (
                      <option key={sp.id || sp.name} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tags (for Task & Note) */}
          {targetType !== 'HABIT' && (
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1.5">
                <Tag size={14} />
                <span>TAGS</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add a tag..."
                  className="flex-1 bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 rounded-xl bg-surfaceSecondary border border-border hover:bg-surface text-xs font-semibold text-textPrimary cursor-pointer"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-pill text-textSecondary"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-accent text-accent-text font-semibold text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>Complete & Move</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

