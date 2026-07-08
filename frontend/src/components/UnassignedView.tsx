import React, { useState } from 'react';
import { 
  Sparkles, Check, FolderOpen, ArrowRight, Trash2, Tag, Calendar 
} from 'lucide-react';
import { BrainItem, AreaHierarchy } from '../types';

interface UnassignedViewProps {
  items: BrainItem[];
  onAssignItem: (id: string, area: string, project: string, subProject: string) => void;
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
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSubProject, setSelectedSubProject] = useState('');

  const handleStartAssigning = (item: BrainItem) => {
    setAssigningId(item.id);
    const defaultArea = hierarchy[0]?.name || '';
    const defaultProject = hierarchy[0]?.projects[0]?.name || '';
    const defaultSubProject = hierarchy[0]?.projects[0]?.subProjects[0] || '';
    setSelectedArea(defaultArea);
    setSelectedProject(defaultProject);
    setSelectedSubProject(defaultSubProject);
  };

  const handleAreaChange = (areaName: string) => {
    setSelectedArea(areaName);
    const areaObj = hierarchy.find(a => a.name === areaName);
    const projName = areaObj?.projects[0]?.name || '';
    setSelectedProject(projName);
    const subProjName = areaObj?.projects[0]?.subProjects[0] || '';
    setSelectedSubProject(subProjName);
  };

  const handleProjectChange = (projectName: string) => {
    setSelectedProject(projectName);
    const areaObj = hierarchy.find(a => a.name === selectedArea);
    const projObj = areaObj?.projects.find(p => p.name === projectName);
    const subProjName = projObj?.subProjects[0] || '';
    setSelectedSubProject(subProjName);
  };

  const handleConfirmAssign = (id: string) => {
    onAssignItem(id, selectedArea, selectedProject, selectedSubProject);
    setAssigningId(null);
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
            const areaObj = hierarchy.find(a => a.name === selectedArea);
            const availableProjects = areaObj?.projects || [];
            const projObj = availableProjects.find(p => p.name === selectedProject);
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

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-textSecondary bg-pill px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment Controls */}
                <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                  {isAssigning ? (
                    <div className="flex flex-wrap items-center gap-2 bg-surfaceSecondary border border-border p-2 rounded-xl animate-scale-in">
                      {/* Area */}
                      <select 
                        value={selectedArea}
                        onChange={(e) => handleAreaChange(e.target.value)}
                        className="bg-surface border border-border rounded-lg text-xs py-1.5 px-2.5 font-medium text-textPrimary focus:ring-1 focus:ring-accent outline-none"
                      >
                        {hierarchy.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                      </select>

                      <ArrowRight size={20} className="text-textSecondary" />

                      {/* Project */}
                      <select 
                        value={selectedProject}
                        onChange={(e) => handleProjectChange(e.target.value)}
                        className="bg-surface border border-border rounded-lg text-xs py-1.5 px-2.5 font-medium text-textPrimary focus:ring-1 focus:ring-accent outline-none"
                        disabled={availableProjects.length === 0}
                      >
                        {availableProjects.length === 0 ? (
                          <option value="">No Projects</option>
                        ) : (
                          availableProjects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)
                        )}
                      </select>

                      <ArrowRight size={20} className="text-textSecondary" />

                      {/* Subproject */}
                      <select 
                        value={selectedSubProject}
                        onChange={(e) => setSelectedSubProject(e.target.value)}
                        className="bg-surface border border-border rounded-lg text-xs py-1.5 px-2.5 font-mono text-textPrimary focus:ring-1 focus:ring-accent outline-none"
                        disabled={availableSubProjects.length === 0}
                      >
                        {availableSubProjects.length === 0 ? (
                          <option value="">No Subprojects</option>
                        ) : (
                          availableSubProjects.map(sp => <option key={sp} value={sp}>{sp}</option>)
                        )}
                      </select>

                      <button
                        onClick={() => handleConfirmAssign(item.id)}
                        className="bg-pill-active text-pill-active-text px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                      >
                        File Item
                      </button>
                      <button
                        onClick={() => setAssigningId(null)}
                        className="text-xs text-textSecondary hover:text-textPrimary px-2 py-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
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
