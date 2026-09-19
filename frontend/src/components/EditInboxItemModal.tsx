import React, { useState, useEffect } from 'react';
import { X, Folder, Calendar, Tag, AlertCircle } from 'lucide-react';
import { BrainItem, ItemType, AreaHierarchy } from '../types';

interface EditInboxItemModalProps {
  item: BrainItem;
  hierarchy: AreaHierarchy[];
  onSave: (id: string, updates: Partial<BrainItem>) => Promise<void>;
  onClose: () => void;
}

export default function EditInboxItemModal({
  item,
  hierarchy = [],
  onSave,
  onClose,
}: EditInboxItemModalProps) {
  const [content, setContent] = useState(item.content || '');
  const [type, setType] = useState<ItemType>(item.type || 'Task');
  const [scheduledDate, setScheduledDate] = useState(item.scheduledDate || '');

  // Hierarchy selection state
  const [areaId, setAreaId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [subProjectId, setSubProjectId] = useState<string>('');

  // Tags state
  const [tags, setTags] = useState<string[]>(item.tags ? [...item.tags] : []);
  const [tagInput, setTagInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize hierarchy IDs and state on mount / item change
  useEffect(() => {
    setContent(item.content || '');
    setType(item.type || 'Task');
    setScheduledDate(item.scheduledDate || '');
    setTags(item.tags ? [...item.tags] : []);
    setTagInput('');
    setErrorMsg('');

    let resolvedAreaId = item.areaId || '';
    if (!resolvedAreaId && item.area) {
      const foundArea = hierarchy.find(a => a.name.toLowerCase() === item.area?.toLowerCase());
      if (foundArea?.id) resolvedAreaId = foundArea.id;
    }
    setAreaId(resolvedAreaId);

    const areaNode = hierarchy.find(a => a.id === resolvedAreaId);
    let resolvedProjectId = item.projectId || '';
    if (!resolvedProjectId && item.project && areaNode) {
      const foundProj = areaNode.projects.find(p => p.name.toLowerCase() === item.project?.toLowerCase());
      if (foundProj?.id) resolvedProjectId = foundProj.id;
    }
    setProjectId(resolvedProjectId);

    const projNode = areaNode?.projects.find(p => p.id === resolvedProjectId);
    let resolvedSubProjectId = item.subProjectId || '';
    if (!resolvedSubProjectId && item.subProject && projNode) {
      const foundSub = projNode.subProjects.find(sp => sp.name.toLowerCase() === item.subProject?.toLowerCase());
      if (foundSub?.id) resolvedSubProjectId = foundSub.id;
    }
    setSubProjectId(resolvedSubProjectId);
  }, [item, hierarchy]);

  // Cascading options
  const selectedArea = hierarchy.find(a => a.id === areaId);
  const availableProjects = selectedArea?.projects || [];
  const selectedProject = availableProjects.find(p => p.id === projectId);
  const availableSubProjects = selectedProject?.subProjects || [];

  const handleAreaChange = (newAreaId: string) => {
    setAreaId(newAreaId);
    setProjectId('');
    setSubProjectId('');
    setErrorMsg('');
  };

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    setSubProjectId('');
    setErrorMsg('');
  };

  const handleSubProjectChange = (newSubProjectId: string) => {
    setSubProjectId(newSubProjectId);
    setErrorMsg('');
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Content cannot be empty.');
      return;
    }

    if (subProjectId && !projectId) {
      setErrorMsg('A Subproject requires a Project to be selected.');
      return;
    }
    if (projectId && !areaId) {
      setErrorMsg('A Project requires an Area to be selected.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const targetArea = hierarchy.find(a => a.id === areaId);
      const targetProj = targetArea?.projects.find(p => p.id === projectId);
      const targetSub = targetProj?.subProjects.find(sp => sp.id === subProjectId);

      await onSave(item.id, {
        content: content.trim(),
        type,
        areaId: areaId || undefined,
        projectId: projectId || undefined,
        subProjectId: subProjectId || undefined,
        area: targetArea?.name || undefined,
        project: targetProj?.name || undefined,
        subProject: targetSub?.name || undefined,
        tags,
        scheduledDate: scheduledDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative bg-surface w-full max-w-lg rounded-[28px] p-6 md:p-8 shadow-2xl border border-border animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold text-textSecondary">
              Edit Item
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pill text-textSecondary">
              {type}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-surfaceSecondary rounded-full transition-colors text-textSecondary hover:text-textPrimary cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1.5">
              Content / Description
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={3}
              className="w-full bg-surfaceSecondary border border-border rounded-xl p-3 text-sm text-textPrimary outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-textMuted"
              placeholder="Enter thought or task content..."
              required
            />
          </div>

          {/* Type & Schedule Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5">
                Item Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ItemType)}
                className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs font-medium text-textPrimary outline-none focus:ring-1 focus:ring-accent"
              >
                {(['Task', 'Idea', 'Note', 'Journal'] as ItemType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1">
                <Calendar size={13} />
                <span>Scheduled Date</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs font-medium text-textPrimary outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Hierarchy Cascade Selection */}
          <div className="p-3.5 bg-surfaceSecondary/60 border border-border rounded-2xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-textSecondary">
              <Folder size={14} />
              <span>External Brain Hierarchy</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Area */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-textSecondary/80 mb-1">
                  Area
                </label>
                <select
                  value={areaId}
                  onChange={e => handleAreaChange(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs font-medium text-textPrimary outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">None (Unassigned)</option>
                  {hierarchy.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-textSecondary/80 mb-1">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
                  disabled={!areaId || availableProjects.length === 0}
                  className="w-full bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs font-medium text-textPrimary outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                >
                  <option value="">
                    {!areaId ? 'Select Area first' : availableProjects.length === 0 ? 'No Projects' : 'None'}
                  </option>
                  {availableProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* SubProject (Optional) */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-textSecondary/80 mb-1">
                  Subproject <span className="normal-case font-normal text-textSecondary/60">(Optional)</span>
                </label>
                <select
                  value={subProjectId}
                  onChange={e => handleSubProjectChange(e.target.value)}
                  disabled={!projectId || availableSubProjects.length === 0}
                  className="w-full bg-surface border border-border rounded-xl px-2.5 py-1.5 text-xs font-medium text-textPrimary outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 font-mono"
                >
                  <option value="">
                    {!projectId ? 'Select Project first' : availableSubProjects.length === 0 ? 'No Subprojects' : 'None (Optional)'}
                  </option>
                  {availableSubProjects.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1">
              <Tag size={13} />
              <span>Tags ({tags.length})</span>
            </label>

            {/* Tag Container */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-surfaceSecondary border border-border rounded-xl min-h-[42px]">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 bg-surface rounded-lg text-xs text-textSecondary border border-border transition-colors animate-fade-in"
                >
                  <span className="text-[11px] font-medium text-textPrimary">{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-red-100 dark:hover:bg-red-950/20 rounded-full p-0.5 cursor-pointer text-textSecondary hover:text-red-500"
                    title={`Remove ${tag}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Inline Tag Input */}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Tag..."
                className="bg-transparent border-none focus:ring-0 text-xs px-2 py-1 max-w-[120px] text-textPrimary outline-none font-medium placeholder:text-textMuted/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-textSecondary hover:text-textPrimary rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-pill-active text-pill-active-text text-xs font-semibold rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
