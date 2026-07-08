import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, ArrowUp, X, Sparkles, AlertCircle 
} from 'lucide-react';
import { ItemType, BrainItem, AreaHierarchy } from '../types';

interface CaptureComposerProps {
  onCapture: (newItem: Omit<BrainItem, 'id' | 'createdAt'>, runAI: boolean) => Promise<void>;
  hierarchy: AreaHierarchy[];
  activeTab?: string;
  onUpdateHierarchy?: (newHierarchy: AreaHierarchy[]) => void;
}

export default function CaptureComposer({ onCapture, hierarchy, activeTab, onUpdateHierarchy }: CaptureComposerProps) {
  const [content, setContent] = useState('');
  const [assignment, setAssignment] = useState<'now' | 'later'>('later');
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
  const [area, setArea] = useState('');
  const [project, setProject] = useState('');
  const [subProject, setSubProject] = useState('');

  // Modal selector state
  const [activeMenuType, setActiveMenuType] = useState<'Area' | 'Project' | 'SubProject' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // AI loading and status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Load defaults from hierarchy dynamically
  useEffect(() => {
    if (hierarchy && hierarchy.length > 0) {
      const defaultArea = hierarchy[0].name;
      const defaultProj = hierarchy[0].projects[0]?.name || '';
      const defaultSub = hierarchy[0].projects[0]?.subProjects[0] || '';
      setArea(defaultArea);
      setProject(defaultProj);
      setSubProject(defaultSub);
    }
  }, [hierarchy]);

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
    let newTags = [...tags];
    const addTag = (val: string) => {
      if (val && !newTags.includes(val)) {
        newTags.push(val);
      }
    };

    if (activeMenuType === 'Area') {
      setArea(value);
      addTag(value);
      // Auto-update project and subproject defaults when switching area
      const targetArea = hierarchy.find(a => a.name === value);
      if (targetArea && targetArea.projects.length > 0) {
        const nextProj = targetArea.projects[0].name;
        setProject(nextProj);
        addTag(nextProj);
        if (targetArea.projects[0].subProjects.length > 0) {
          const nextSub = targetArea.projects[0].subProjects[0];
          setSubProject(nextSub);
          addTag(nextSub);
        } else {
          setSubProject('');
        }
      } else {
        setProject('');
        setSubProject('');
      }
    } else if (activeMenuType === 'Project') {
      setProject(value);
      addTag(value);
      // Auto-update subproject defaults when switching project
      const targetProj = currentAreaNode?.projects.find(p => p.name === value);
      if (targetProj && targetProj.subProjects.length > 0) {
        const nextSub = targetProj.subProjects[0];
        setSubProject(nextSub);
        addTag(nextSub);
      } else {
        setSubProject('');
      }
    } else if (activeMenuType === 'SubProject') {
      setSubProject(value);
      addTag(value);
    }
    
    setTags(newTags);
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

  const handleCreateAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    if (hierarchy.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      setErrorMsg('Area already exists.');
      return;
    }
    const updated = [...hierarchy, { name, projects: [] }];
    if (onUpdateHierarchy) {
      await onUpdateHierarchy(updated);
    }
    const oldArea = area;
    setArea(name);
    setProject('');
    setSubProject('');
    setTags(prev => [...prev.filter(x => x !== oldArea), name]);
    setNewItemName('');
    setErrorMsg('');
    setActiveMenuType(null);
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    const currentArea = hierarchy.find(a => a.name === area);
    if (currentArea?.projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setErrorMsg('Project already exists.');
      return;
    }
    const updated = hierarchy.map(a => {
      if (a.name === area) {
        return {
          ...a,
          projects: [...a.projects, { name, subProjects: [] }]
        };
      }
      return a;
    });
    if (onUpdateHierarchy) {
      await onUpdateHierarchy(updated);
    }
    const oldProj = project;
    setProject(name);
    setSubProject('');
    setTags(prev => [...prev.filter(x => x !== oldProj), name]);
    setNewItemName('');
    setErrorMsg('');
    setActiveMenuType(null);
  };

  const handleCreateSubProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    const currentArea = hierarchy.find(a => a.name === area);
    const currentProj = currentArea?.projects.find(p => p.name === project);
    if (currentProj?.subProjects.some(sp => sp.toLowerCase() === name.toLowerCase())) {
      setErrorMsg('Subproject already exists.');
      return;
    }
    const updated = hierarchy.map(a => {
      if (a.name === area) {
        return {
          ...a,
          projects: a.projects.map(p => {
            if (p.name === project) {
              return {
                ...p,
                subProjects: [...p.subProjects, name]
              };
            }
            return p;
          })
        };
      }
      return a;
    });
    if (onUpdateHierarchy) {
      await onUpdateHierarchy(updated);
    }
    const oldSub = subProject;
    setSubProject(name);
    setTags(prev => [...prev.filter(x => x !== oldSub), name]);
    setNewItemName('');
    setErrorMsg('');
    setActiveMenuType(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    if (assignment === 'now' && (!area || !project || !subProject)) {
      alert("Please select or create Area, Project, and SubProject to assign now.");
      return;
    }

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
      setTags([]);
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
            <div className="flex bg-pill/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-border h-[35px] items-center">
              <button 
                type="button"
                onClick={() => setAssignment('now')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer h-[31px] flex items-center justify-center ${
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
                className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer h-[31px] flex items-center justify-center ${
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
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-pill/90 backdrop-blur-sm rounded-full text-xs font-semibold text-textSecondary hover:bg-pill transition-colors shadow-sm cursor-pointer h-[31px]"
              >
                <span>{type}</span>
                <ChevronDown size={20} className="text-textSecondary" />
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
              className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shadow-sm cursor-pointer h-[31px] ${
                aiEnabled 
                  ? 'bg-pill-active text-pill-active-text hover:opacity-90' 
                  : 'bg-pill text-textSecondary hover:opacity-90'
              }`}
              title="Toggle Gemini Auto-Tag & Auto-Categorization"
            >
              <Sparkles size={20} className={aiEnabled ? 'text-yellow-400' : 'text-textSecondary'} />
              <span>AI {aiEnabled ? 'Active' : 'Off'}</span>
            </button>
          </div>

          {/* Hierarchical Context Selection (Only visible when 'Assign now' is active) */}
          {assignment === 'now' && (
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
              <div className="flex bg-pill/90 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-border h-[35px] items-center">
                <button 
                  type="button"
                  onClick={() => handleOpenMenu('Area')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full hover:opacity-90 transition-all cursor-pointer h-[31px] flex items-center justify-center ${
                    area ? 'bg-pill-active text-pill-active-text shadow-sm' : 'text-textSecondary/75'
                  }`}
                >
                  Area
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenMenu('Project')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full hover:opacity-90 transition-all cursor-pointer h-[31px] flex items-center justify-center ${
                    project ? 'bg-pill-active text-pill-active-text shadow-sm' : 'text-textSecondary/75'
                  }`}
                >
                  Project
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenMenu('SubProject')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full hover:opacity-90 transition-all cursor-pointer h-[31px] flex items-center justify-center ${
                    subProject ? 'bg-pill-active text-pill-active-text shadow-sm' : 'text-textSecondary/75'
                  }`}
                >
                  SubProject
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
                    <X size={20} className="text-textSecondary" />
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
                <Sparkles size={20} className="animate-pulse text-yellow-400" />
              ) : (
                <ArrowUp size={20} />
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
            onClick={() => {
              setActiveMenuType(null);
              setNewItemName('');
              setErrorMsg('');
            }}
          />
          {/* Modal Card */}
          <div className="relative bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-border animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest font-bold text-textSecondary">
                Select {activeMenuType}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setActiveMenuType(null);
                  setNewItemName('');
                  setErrorMsg('');
                }}
                className="p-1 hover:bg-surfaceSecondary rounded-full transition-colors cursor-pointer text-textSecondary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1 max-h-[40vh] overflow-y-auto hide-scrollbar">
              {activeMenuType === 'Area' && (
                <>
                  {areasList.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className="w-full text-left px-4 py-3 hover:bg-surfaceSecondary rounded-xl text-sm font-medium text-textPrimary transition-colors cursor-pointer"
                    >
                      {option}
                    </button>
                  ))}
                  {areasList.length === 0 && (
                    <div className="text-xs text-textSecondary/60 text-center py-6 font-medium">
                      No Areas yet.
                    </div>
                  )}
                  <form onSubmit={handleCreateAreaSubmit} className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="New Area Name..." 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent"
                      />
                      <button type="submit" className="bg-pill-active text-pill-active-text px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 cursor-pointer">
                        + Create
                      </button>
                    </div>
                    {errorMsg && <p className="text-[10px] text-red-500 font-medium px-1">{errorMsg}</p>}
                  </form>
                </>
              )}

              {activeMenuType === 'Project' && (
                <>
                  {!area ? (
                    <div className="text-xs text-textSecondary/60 text-center py-6 font-medium">
                      Select an Area first.
                    </div>
                  ) : (
                    <>
                      {projectsList.map((option) => (
                        <button
                          key={option}
                          type="button;;"
                          onClick={() => handleSelectOption(option)}
                          className="w-full text-left px-4 py-3 hover:bg-surfaceSecondary rounded-xl text-sm font-medium text-textPrimary transition-colors cursor-pointer"
                        >
                          {option}
                        </button>
                      ))}
                      {projectsList.length === 0 && (
                        <div className="text-xs text-textSecondary/60 text-center py-6 font-medium">
                          No Projects yet.
                        </div>
                      )}
                      <form onSubmit={handleCreateProjectSubmit} className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="New Project Name..." 
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-1 bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent"
                          />
                          <button type="submit" className="bg-pill-active text-pill-active-text px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 cursor-pointer">
                            + Create
                          </button>
                        </div>
                        {errorMsg && <p className="text-[10px] text-red-500 font-medium px-1">{errorMsg}</p>}
                      </form>
                    </>
                  )}
                </>
              )}

              {activeMenuType === 'SubProject' && (
                <>
                  {!project ? (
                    <div className="text-xs text-textSecondary/60 text-center py-6 font-medium">
                      Select a Project first.
                    </div>
                  ) : (
                    <>
                      {subProjectsList.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSelectOption(option)}
                          className="w-full text-left px-4 py-3 hover:bg-surfaceSecondary rounded-xl text-sm font-medium text-textPrimary transition-colors cursor-pointer"
                        >
                          {option}
                        </button>
                      ))}
                      {subProjectsList.length === 0 && (
                        <div className="text-xs text-textSecondary/60 text-center py-6 font-medium">
                          No Subprojects yet.
                        </div>
                      )}
                      <form onSubmit={handleCreateSubProjectSubmit} className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="New Subproject Name..." 
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-1 bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-xl outline-none text-textPrimary focus:ring-1 focus:ring-accent"
                          />
                          <button type="submit" className="bg-pill-active text-pill-active-text px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 cursor-pointer">
                            + Create
                          </button>
                        </div>
                        {errorMsg && <p className="text-[10px] text-red-500 font-medium px-1">{errorMsg}</p>}
                      </form>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
