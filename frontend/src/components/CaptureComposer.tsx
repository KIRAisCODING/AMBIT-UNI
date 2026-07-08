import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ArrowUp, X, Sparkles, AlertCircle 
} from 'lucide-react';
import { ItemType, BrainItem, AreaHierarchy } from '../types';

interface CaptureComposerProps {
  onCapture: (newItem: Omit<BrainItem, 'id' | 'createdAt'>, runAI: boolean) => Promise<void>;
  hierarchy: AreaHierarchy[];
  activeTab?: string;
}

export default function CaptureComposer({ onCapture, hierarchy, activeTab }: CaptureComposerProps) {
  const [content, setContent] = useState('');
  const [assignment, setAssignment] = useState<'now' | 'later'>('now');
  const [type, setType] = useState<ItemType>('Task');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (activeTab === 'Habits') {
      setType('Habit');
    } else {
      setType('Task');
    }
  }, [activeTab]);

  // Categorization state
  const [area, setArea] = useState('Work');
  const [project, setProject] = useState('Product Launch');
  const [subProject, setSubProject] = useState('Backend');

  // Modal selector state
  const [activeMenuType, setActiveMenuType] = useState<'Area' | 'Project' | 'SubProject' | null>(null);

  // Tags state
  const [tags, setTags] = useState<string[]>(['Hackathon', 'SIH']);
  const [tagInput, setTagInput] = useState('');

  // AI loading and status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Helper lists derived dynamically from hierarchy
  const areasList = hierarchy.map(a => a.name);
  
  const currentAreaNode = hierarchy.find(a => a.name === area);
  const projectsList = currentAreaNode ? currentAreaNode.projects.map(p => p.name) : [];

  const currentProjectNode = currentAreaNode?.projects.find(p => p.name === project);
  const subProjectsList = currentProjectNode ? currentProjectNode.subProjects : [];

  const handleOpenMenu = (menuType: 'Area' | 'Project' | 'SubProject') => {
    setActiveMenuType(menuType);
  };

  const handleSelectOption = (value: string) => {
    if (activeMenuType === 'Area') {
      setArea(value);
      // Auto-update project and subproject defaults when switching area
      const targetArea = hierarchy.find(a => a.name === value);
      if (targetArea && targetArea.projects.length > 0) {
        setProject(targetArea.projects[0].name);
        if (targetArea.projects[0].subProjects.length > 0) {
          setSubProject(targetArea.projects[0].subProjects[0]);
        } else {
          setSubProject('');
        }
      } else {
        setProject('');
        setSubProject('');
      }
    } else if (activeMenuType === 'Project') {
      setProject(value);
      // Auto-update subproject defaults when switching project
      const targetProj = currentAreaNode?.projects.find(p => p.name === value);
      if (targetProj && targetProj.subProjects.length > 0) {
        setSubProject(targetProj.subProjects[0]);
      } else {
        setSubProject('');
      }
    } else if (activeMenuType === 'SubProject') {
      setSubProject(value);
    }
    
    // Add selected value as tag too, just like the mockup!
    if (!tags.includes(value)) {
      setTags([...tags, value]);
    }
    setActiveMenuType(null);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    setIsAnalyzing(true);
    try {
      await onCapture({
        content: content.trim(),
        type,
        assignment,
        area: assignment === 'now' ? area : undefined,
        project: assignment === 'now' ? project : undefined,
        subProject: assignment === 'now' ? subProject : undefined,
        tags,
        completed: type === 'Task' ? false : undefined
      }, aiEnabled);

      // Reset
      setContent('');
      // Keep selected category defaults but clear user tags to prevent cluttering next entries
      setTags(['Hackathon', 'SIH']);
    } catch (err) {
      console.error("Submit Capture Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl z-40">
      {/* Action Switching & Contextual Pills */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Assign Now vs Later Toggle */}
            <div className="flex bg-pill/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-border">
              <button 
                type="button"
                onClick={() => setAssignment('now')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  assignment === 'now' 
                    ? 'bg-pill-active text-pill-active-text shadow-sm' 
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                Assign now
              </button>
              <button 
                type="button"
                onClick={() => setAssignment('later')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  assignment === 'later' 
                    ? 'bg-pill-active text-pill-active-text shadow-sm' 
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                Assign later
              </button>
            </div>

            {/* Type Selector Dropdown */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-pill/90 backdrop-blur-sm rounded-full text-xs font-semibold text-textSecondary hover:bg-pill transition-colors shadow-sm cursor-pointer"
              >
                <span>{type}</span>
                <ChevronDown size={14} className="text-textSecondary" />
              </button>
              
              {showTypeDropdown && (
                <div className="absolute left-0 bottom-10 mb-1 bg-surface border border-border shadow-xl rounded-xl p-1 z-50 w-28">
                  {(['Task', 'Idea', 'Note', 'Journal', 'Habit'] as ItemType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setType(t);
                        setShowTypeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-surfaceSecondary rounded-lg text-xs font-medium text-textPrimary transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Auto-Analyze Switch */}
            <button
              type="button"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shadow-sm cursor-pointer ${
                aiEnabled 
                  ? 'bg-pill-active text-pill-active-text hover:opacity-90' 
                  : 'bg-pill text-textSecondary hover:opacity-90'
              }`}
              title="Toggle Gemini Auto-Tag & Auto-Categorization"
            >
              <Sparkles size={12} className={aiEnabled ? 'text-yellow-400' : 'text-textSecondary'} />
              <span>AI {aiEnabled ? 'Active' : 'Off'}</span>
            </button>
          </div>

          {/* Hierarchical Context Selection (Only visible when 'Assign now' is active) */}
          {assignment === 'now' && (
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
              <div className="flex bg-pill/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-border">
                <button 
                  type="button"
                  onClick={() => handleOpenMenu('Area')}
                  className="px-3.5 py-1 text-xs font-semibold bg-pill-active text-pill-active-text rounded-full hover:opacity-90 transition-all"
                >
                  {area}
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenMenu('Project')}
                  className="px-3.5 py-1 text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors rounded-full cursor-pointer"
                >
                  {project}
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenMenu('SubProject')}
                  className="px-3.5 py-1 text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors rounded-full cursor-pointer"
                >
                  {subProject}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Input Container */}
      <form 
        onSubmit={handleSubmit}
        className="bg-surface rounded-[24px] shadow-2xl p-2 transition-all focus-within:ring-2 focus-within:ring-accent border border-border"
      >
        <div className="relative flex flex-col">
          {/* Main Textarea */}
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full bg-transparent border-none focus:ring-0 text-base md:text-lg p-4 pb-2 resize-none placeholder:text-textMuted/60 min-h-[96px] text-textPrimary outline-none"
            placeholder={
              isAnalyzing 
                ? "Gemini is analyzing your thought..." 
                : `Capture a ${type.toLowerCase()} idea... (Shift+Enter for new line)`
            }
            rows={3}
            disabled={isAnalyzing}
          />

          {/* Tags and Send Row */}
          <div className="flex items-center justify-between p-2 pt-1 flex-wrap gap-2">
            {/* Tags Container */}
            <div className="flex flex-wrap items-center gap-1.5 max-w-[80%]">
              {tags.map((tag) => (
                <div 
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 bg-surfaceSecondary hover:opacity-90 rounded-lg text-xs text-textSecondary border border-border transition-colors animate-fade-in"
                >
                  <span className="text-[11px] font-medium">{tag}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-red-100 dark:hover:bg-red-950/20 rounded-full p-0.5 cursor-pointer"
                  >
                    <X size={10} className="text-textSecondary" />
                  </button>
                </div>
              ))}
              
              {/* Inline Tag Input */}
              <input 
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Tag..."
                className="bg-transparent border-none focus:ring-0 text-xs px-2 py-1 max-w-[80px] text-textSecondary outline-none font-medium placeholder:text-textMuted/50"
              />
            </div>

            {/* Submit Arrow Button */}
            <button 
              type="submit"
              disabled={!content.trim() || isAnalyzing}
              className={`w-11 h-11 bg-pill-active text-pill-active-text rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 shrink-0 cursor-pointer ${
                (!content.trim() || isAnalyzing) ? 'opacity-40 cursor-not-allowed scale-100' : ''
              }`}
            >
              {isAnalyzing ? (
                <Sparkles size={18} className="animate-pulse text-yellow-400" />
              ) : (
                <ArrowUp size={18} />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Dynamic Popover Modal Selection Menu */}
      {activeMenuType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setActiveMenuType(null)}
          />
          {/* Modal Card */}
          <div className="relative bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest font-bold text-textSecondary">
                Select {activeMenuType}
              </h3>
              <button 
                type="button"
                onClick={() => setActiveMenuType(null)}
                className="p-1 hover:bg-surfaceSecondary rounded-full transition-colors cursor-pointer text-textSecondary"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto hide-scrollbar">
              {(activeMenuType === 'Area' ? areasList : activeMenuType === 'Project' ? projectsList : subProjectsList).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  className="w-full text-left px-4 py-3 hover:bg-surfaceSecondary rounded-xl text-sm font-medium text-textPrimary transition-colors cursor-pointer"
                >
                  {option}
                </button>
              ))}
              {(activeMenuType === 'Area' ? areasList : activeMenuType === 'Project' ? projectsList : subProjectsList).length === 0 && (
                <div className="text-xs text-textSecondary/60 text-center py-6 font-medium">
                  No folders available. Create some in the Sidebar first!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
