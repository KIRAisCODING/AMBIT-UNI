import React, { useState } from 'react';
import { 
  Sparkles, Check, FolderOpen, ArrowRight, Trash2, Tag, X 
} from 'lucide-react';
import { BrainItem, AreaHierarchy } from '../types';

interface UnassignedViewProps {
  items: BrainItem[];
  onAssignItem: (id: string, areaId: string, projectId: string, subProjectId?: string, tags?: string[]) => void;
  onDeleteItem: (id: string) => void;
  hierarchy: AreaHierarchy[];
}

export default function UnassignedView({ 
  items, 
  onAssignItem,
  onDeleteItem,
  hierarchy = []
}: UnassignedViewProps) {
  const unassignedItems = items.filter(it => it.assignment === 'later');

  // Interactive assign state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSubProjectId, setSelectedSubProjectId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleStartAssigning = (item: BrainItem) => {
    setAssigningId(item.id);
    setSelectedAreaId(item.areaId || '');
    setSelectedProjectId(item.projectId || '');
    setSelectedSubProjectId(item.subProjectId || '');
    setSelectedTags(item.tags ? [...item.tags] : []);
    setTagInput('');
  };

  const handleAreaChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedProjectId('');
    setSelectedSubProjectId('');
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSubProjectId('');
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
    } else {
      e.preventDefault();
    }
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleConfirmAssign = (id: string) => {
    if (!selectedAreaId || !selectedProjectId) return;
    const trimmed = tagInput.trim();
    const finalTags = (trimmed && !selectedTags.includes(trimmed)) ? [...selectedTags, trimmed] : selectedTags;
    onAssignItem(id, selectedAreaId, selectedProjectId, selectedSubProjectId || undefined, finalTags);
    setAssigningId(null);
    setSelectedTags([]);
    setTagInput('');
  };

  const handleCancelAssign = () => {
    setAssigningId(null);
    setSelectedTags([]);
    setTagInput('');
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in">
      {/* View Header */}
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl font-headline font-bold text-textPrimary mb-1">
          Unassigned Inbox
        </h2>
        <p className="text-sm text-textSecondary">
          These are thoughts and notes you captured fast to clear your mind. Organise them when you have time.
        </p>
      </div>

      {unassignedItems.length === 0 ? (
        <div className="bg-surface border border-border rounded-[28px] canvas-shadow p-12 text-center flex flex-col items-center justify-center min-h-[40vh]">
          <div className="mb-4 inline-flex p-4 rounded-full bg-surfaceSecondary text-textSecondary border border-border">
            <Check size={20} />
          </div>
          <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
            All clear!
          </h3>
          <p className="text-sm text-textSecondary max-w-sm">
            You don't have any unassigned thoughts. Every captured idea is fully structured and filed!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {unassignedItems.map((item) => {
            const isAssigning = assigningId === item.id;
            const areaObj = hierarchy.find(a => a.id === selectedAreaId);
            const availableProjects = areaObj?.projects || [];
            const projObj = availableProjects.find(p => p.id === selectedProjectId);
            const availableSubProjects = projObj?.subProjects || [];

            return (
              <div 
                key={item.id}
                className="bg-surface border border-border hover:border-textSecondary/40 rounded-2xl p-5 canvas-shadow transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Content info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-pill text-textSecondary">
                      {item.type}
                    </span>
                    <span className="text-[10px] text-textSecondary font-mono">
                      Captured {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {item.smartSummary && (
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-textPrimary bg-surfaceSecondary border border-border rounded-lg px-2.5 py-1 w-fit">
                      <Sparkles size={20} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span>{item.smartSummary}</span>
                    </div>
                  )}

                  <p className="text-sm text-textPrimary leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>

                  {/* Static tags when not assigning */}
                  {!isAssigning && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-textSecondary bg-pill px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment Controls */}
                <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                  {isAssigning ? (
                    <div className="flex flex-col gap-2.5 bg-surfaceSecondary border border-border p-3 rounded-2xl animate-scale-in w-full md:w-auto">
                      {/* Cascading Dropdowns */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Area */}
                        <select 
                          value={selectedAreaId}
                          onChange={(e) => handleAreaChange(e.target.value)}
                          className="bg-surface border border-border rounded-lg text-xs py-1.5 px-2.5 font-medium text-textPrimary focus:ring-1 focus:ring-accent outline-none"
                        >
                          <option value="">Select an Area</option>
                          {hierarchy.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>

                        <ArrowRight size={16} className="text-textSecondary" />

                        {/* Project */}
                        <select 
                          value={selectedProjectId}
                          onChange={(e) => handleProjectChange(e.target.value)}
                          className="bg-surface border border-border rounded-lg text-xs py-1.5 px-2.5 font-medium text-textPrimary focus:ring-1 focus:ring-accent outline-none"
                          disabled={!selectedAreaId || availableProjects.length === 0}
                        >
                          {availableProjects.length === 0 ? (
                            <option value="">{selectedAreaId ? 'No Projects' : 'Select an Area first'}</option>
                          ) : (
                            <><option value="">Select a Project</option>{availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>
                          )}
                        </select>

                        <ArrowRight size={16} className="text-textSecondary" />

                        {/* Subproject */}
                        <select 
                          value={selectedSubProjectId}
                          onChange={(e) => setSelectedSubProjectId(e.target.value)}
                          className="bg-surface border border-border rounded-lg text-xs py-1.5 px-2.5 font-mono text-textPrimary focus:ring-1 focus:ring-accent outline-none"
                          disabled={!selectedProjectId || availableSubProjects.length === 0}
                        >
                          {availableSubProjects.length === 0 ? (
                            <option value="">{selectedProjectId ? 'No Subprojects' : 'Select a Project first'}</option>
                          ) : (
                            <><option value="">Optional</option>{availableSubProjects.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}</>
                          )}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleConfirmAssign(item.id)}
                          className="bg-pill-active text-pill-active-text px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-all cursor-pointer ml-auto"
                        >
                          File Item
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelAssign}
                          className="text-xs text-textSecondary hover:text-textPrimary px-2 py-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Interactive Tags Section in Assignment Flow */}
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-surface border border-border rounded-xl min-h-[38px]">
                        <span className="text-[10px] font-semibold text-textSecondary flex items-center gap-1 mr-1">
                          <Tag size={12} />
                          Tags:
                        </span>
                        {selectedTags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center gap-1 px-2.5 py-0.5 bg-surfaceSecondary rounded-lg text-xs text-textSecondary border border-border transition-colors animate-fade-in"
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
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="+ Tag..."
                          className="bg-transparent border-none focus:ring-0 text-xs px-2 py-0.5 max-w-[100px] text-textPrimary outline-none font-medium placeholder:text-textMuted/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartAssigning(item)}
                        className="flex items-center gap-1.5 bg-pill hover:opacity-90 text-textPrimary px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer"
                      >
                        <FolderOpen size={20} />
                        <span>Organise & File</span>
                      </button>
                      
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-textSecondary rounded-full transition-colors cursor-pointer"
                        title="Delete thought"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
