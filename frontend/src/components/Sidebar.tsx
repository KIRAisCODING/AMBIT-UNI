import React, { useState } from 'react';
import { 
  Inbox, Folder, Clock, Brain, Calendar, BarChart3, Settings, X, 
  ChevronRight, ChevronDown, Sparkles, Plus, Trash2, FolderOpen, 
  FolderKanban, Hash, FileText, PanelLeftClose
} from 'lucide-react';
import { ActiveTab, AreaHierarchy, WorkspaceSelection } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedSubProject: WorkspaceSelection | null;
  setSelectedSubProject: (sel: WorkspaceSelection | null) => void;
  hierarchy: AreaHierarchy[];
  onUpdateHierarchy: (newHierarchy: AreaHierarchy[]) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  selectedSubProject,
  setSelectedSubProject,
  hierarchy,
  onUpdateHierarchy,
  isOpen, 
  onClose,
  onOpenChat
}: SidebarProps) {
  // Folder expansion state: keys are "area:{areaName}" or "project:{areaName}/{projectName}"
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'area:Work': true,
    'area:Personal': true,
    'project:Work/Product Launch': true,
  });

  // Inline forms state
  const [showAddAreaInput, setShowAddAreaInput] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  const [activeAddProjectArea, setActiveAddProjectArea] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  const [activeAddSubProjectKey, setActiveAddSubProjectKey] = useState<string | null>(null); // "areaName/projectName"
  const [newSubProjectName, setNewSubProjectName] = useState('');

  const navItems = [
    { id: 'Inbox', label: 'Inbox', icon: Inbox },
  ] as const;

  const planningItems = [
    { id: 'Unassigned', label: 'Unassigned', icon: Clock },
    { id: 'Habits', label: 'Habits', icon: Brain },
    { id: 'Calendar', label: 'Calendar', icon: Calendar },
  ] as const;

  const footerItems = [
    { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ] as const;

  const handleTabClick = (tabId: ActiveTab) => {
    setSelectedSubProject(null);
    setActiveTab(tabId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleSubProjectClick = (area: string, project: string, subProject: string) => {
    setSelectedSubProject({ area, project, subProject });
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  // Node operations
  const handleCreateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    if (hierarchy.some(a => a.name.toLowerCase() === newAreaName.trim().toLowerCase())) return;

    const updated = [...hierarchy, { name: newAreaName.trim(), projects: [] }];
    onUpdateHierarchy(updated);
    setNewAreaName('');
    setShowAddAreaInput(false);
    toggleNode(`area:${newAreaName.trim()}`);
  };

  const handleCreateProject = (e: React.FormEvent, areaName: string) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const updated = hierarchy.map(a => {
      if (a.name === areaName) {
        if (a.projects.some(p => p.name.toLowerCase() === newProjectName.trim().toLowerCase())) return a;
        return {
          ...a,
          projects: [...a.projects, { name: newProjectName.trim(), subProjects: [] }]
        };
      }
      return a;
    });

    onUpdateHierarchy(updated);
    toggleNode(`area:${areaName}`);
    setExpandedNodes(prev => ({ ...prev, [`project:${areaName}/${newProjectName.trim()}`]: true }));
    setNewProjectName('');
    setActiveAddProjectArea(null);
  };

  const handleCreateSubProject = (e: React.FormEvent, areaName: string, projectName: string) => {
    e.preventDefault();
    if (!newSubProjectName.trim()) return;

    const updated = hierarchy.map(a => {
      if (a.name === areaName) {
        const updatedProjects = a.projects.map(p => {
          if (p.name === projectName) {
            if (p.subProjects.some(sp => sp.toLowerCase() === newSubProjectName.trim().toLowerCase())) return p;
            return {
              ...p,
              subProjects: [...p.subProjects, newSubProjectName.trim()]
            };
          }
          return p;
        });
        return { ...a, projects: updatedProjects };
      }
      return a;
    });

    onUpdateHierarchy(updated);
    setNewSubProjectName('');
    setActiveAddSubProjectKey(null);
  };

  const handleDeleteArea = (e: React.MouseEvent, areaName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the Area "${areaName}" and all its subfolders?`)) return;

    const updated = hierarchy.filter(a => a.name !== areaName);
    onUpdateHierarchy(updated);
    if (selectedSubProject?.area === areaName) {
      setSelectedSubProject(null);
      setActiveTab('Inbox');
    }
  };

  const handleDeleteProject = (e: React.MouseEvent, areaName: string, projectName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the Project "${projectName}"?`)) return;

    const updated = hierarchy.map(a => {
      if (a.name === areaName) {
        return {
          ...a,
          projects: a.projects.filter(p => p.name !== projectName)
        };
      }
      return a;
    });
    onUpdateHierarchy(updated);
    if (selectedSubProject?.area === areaName && selectedSubProject?.project === projectName) {
      setSelectedSubProject(null);
      setActiveTab('Inbox');
    }
  };

  const handleDeleteSubProject = (e: React.MouseEvent, areaName: string, projectName: string, subProjectName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the SubProject "${subProjectName}"?`)) return;

    const updated = hierarchy.map(a => {
      if (a.name === areaName) {
        const updatedProjects = a.projects.map(p => {
          if (p.name === projectName) {
            return {
              ...p,
              subProjects: p.subProjects.filter(sp => sp !== subProjectName)
            };
          }
          return p;
        });
        return { ...a, projects: updatedProjects };
      }
      return a;
    });
    onUpdateHierarchy(updated);
    if (selectedSubProject?.area === areaName && selectedSubProject?.project === projectName && selectedSubProject?.subProject === subProjectName) {
      setSelectedSubProject(null);
      setActiveTab('Inbox');
    }
  };

  return (
    <>
      {/* Drawer Overlay for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Aside */}
      <aside 
        id="main-drawer"
        className={`fixed left-0 top-0 h-full w-72 z-50 bg-surface border-r border-border px-4 py-8 flex flex-col transition-transform duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between mb-6 px-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-headline font-bold tracking-tighter text-textPrimary">
              AMBIT
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono text-pill-active-text bg-pill-active px-1.5 py-0.5 rounded-full font-semibold">
              v2.5
            </span>
          </div>
          <button 
            className="p-1.5 hover:bg-surfaceSecondary rounded-lg transition-colors text-textSecondary hover:text-textPrimary"
            onClick={onClose}
            title="Close sidebar"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        {/* Navigation Menu (Scrollable) */}
        <nav className="flex-1 overflow-y-auto hide-scrollbar space-y-1 pr-1 pb-4">
          {/* Main Inbox */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedSubProject;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-pill-active text-pill-active-text shadow-sm font-semibold' 
                    : 'text-textSecondary hover:bg-surfaceSecondary hover:text-textPrimary'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-pill-active-text' : 'text-textSecondary'} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}

          {/* Spark Brain Chat Button */}
          <button
            onClick={() => {
              onOpenChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 mt-1.5 rounded-xl font-medium transition-all duration-200 text-left bg-pill-active text-pill-active-text hover:opacity-90 shadow-md group"
          >
            <Sparkles size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-semibold">Ask My Brain</span>
            <span className="ml-auto text-[9px] bg-pill-active-text/20 text-pill-active-text px-1.5 py-0.5 rounded-full font-bold">AI</span>
          </button>

          {/* HIERARCHY EXPLORER SECTION HEADER */}
          <div className="pt-5 pb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-textSecondary/60 flex items-center justify-between group/header">
            <span>Hierarchy Explorer</span>
            <button 
              onClick={() => setShowAddAreaInput(!showAddAreaInput)}
              className="p-0.5 hover:bg-surfaceSecondary rounded transition-colors text-textSecondary hover:text-textPrimary"
              title="Add new Area"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Add Area Inline Form */}
          {showAddAreaInput && (
            <form onSubmit={handleCreateArea} className="px-3 py-1.5 animate-scale-in">
              <input
                type="text"
                autoFocus
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                onBlur={() => {
                  setTimeout(() => {
                    if (!newAreaName.trim()) setShowAddAreaInput(false);
                  }, 200);
                }}
                placeholder="New Area name..."
                className="w-full bg-surfaceSecondary border border-border text-xs px-3 py-2 rounded-lg outline-none text-textPrimary font-semibold placeholder:text-textMuted"
              />
            </form>
          )}

          {/* Renders Hierarchical Tree */}
          <div className="space-y-0.5">
            {hierarchy.map((area) => {
              const areaKey = `area:${area.name}`;
              const isAreaExpanded = !!expandedNodes[areaKey];

              return (
                <div key={area.name} className="space-y-0.5">
                  {/* Area Row */}
                  <div 
                    className="group/item flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                    onClick={() => toggleNode(areaKey)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button className="p-0.5 hover:bg-surfaceSecondary rounded text-textSecondary/75">
                        {isAreaExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <FolderOpen size={20} className="text-textSecondary flex-shrink-0" />
                      <span className="text-xs font-bold tracking-tight truncate text-textPrimary">{area.name}</span>
                    </div>

                    {/* Actions: Add project or Delete Area */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAddProjectArea(area.name);
                        }}
                        className="p-0.5 hover:bg-surfaceSecondary rounded text-textSecondary"
                        title="Add Project"
                      >
                        <Plus size={20} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteArea(e, area.name)}
                        className="p-0.5 hover:bg-red-50 hover:text-red-600 rounded"
                        title="Delete Area"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Inline Add Project Input */}
                  {activeAddProjectArea === area.name && (
                    <form 
                      onSubmit={(e) => handleCreateProject(e, area.name)} 
                      className="ml-6 py-1 pr-2 animate-scale-in"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onBlur={() => {
                          setTimeout(() => {
                            if (!newProjectName.trim()) setActiveAddProjectArea(null);
                          }, 200);
                        }}
                        placeholder="Project name..."
                        className="w-full bg-surfaceSecondary border border-border text-[11px] px-2.5 py-1.5 rounded outline-none text-textPrimary font-semibold placeholder:text-textMuted"
                      />
                    </form>
                  )}

                  {/* Projects in Area */}
                  {isAreaExpanded && (
                    <div className="ml-5 pl-2 border-l border-border space-y-0.5">
                      {area.projects.map((project) => {
                        const projectKey = `project:${area.name}/${project.name}`;
                        const isProjectExpanded = !!expandedNodes[projectKey];

                        return (
                          <div key={project.name} className="space-y-0.5">
                            {/* Project Row */}
                            <div
                              className="group/project flex items-center justify-between px-2 py-1 rounded-md hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                              onClick={() => toggleNode(projectKey)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button className="p-0.5 rounded text-textSecondary/60">
                                  {isProjectExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </button>
                                <FolderKanban size={20} className="text-textSecondary flex-shrink-0" />
                                <span className="text-[11px] font-semibold truncate text-textPrimary">{project.name}</span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/project:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveAddSubProjectKey(`${area.name}/${project.name}`);
                                  }}
                                  className="p-0.5 hover:bg-surfaceSecondary rounded text-textSecondary"
                                  title="Add SubProject"
                                >
                                  <Plus size={20} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteProject(e, area.name, project.name)}
                                  className="p-0.5 hover:bg-red-50 hover:text-red-600 rounded"
                                  title="Delete Project"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>

                            {/* Inline Add SubProject Input */}
                            {activeAddSubProjectKey === `${area.name}/${project.name}` && (
                              <form 
                                onSubmit={(e) => handleCreateSubProject(e, area.name, project.name)}
                                className="ml-6 py-1 pr-2 animate-scale-in"
                              >
                                <input
                                  type="text"
                                  autoFocus
                                  value={newSubProjectName}
                                  onChange={(e) => setNewSubProjectName(e.target.value)}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (!newSubProjectName.trim()) setActiveAddSubProjectKey(null);
                                    }, 200);
                                  }}
                                  placeholder="SubProject name..."
                                  className="w-full bg-surfaceSecondary border border-border text-[11px] px-2 py-1 rounded outline-none text-textPrimary font-semibold placeholder:text-textMuted"
                                />
                              </form>
                            )}

                            {/* SubProjects inside Project */}
                            {isProjectExpanded && (
                              <div className="ml-4 pl-1.5 border-l border-border space-y-0.5 flex flex-col">
                                {project.subProjects.map((subProj) => {
                                  const isSelected = selectedSubProject?.area === area.name &&
                                                     selectedSubProject?.project === project.name &&
                                                     selectedSubProject?.subProject === subProj;

                                  return (
                                    <div
                                      key={subProj}
                                      onClick={() => handleSubProjectClick(area.name, project.name, subProj)}
                                      className={`group/sub flex items-center justify-between px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                                        isSelected
                                          ? 'bg-pill-active text-pill-active-text font-bold'
                                          : 'text-textSecondary hover:bg-surfaceSecondary hover:text-textPrimary'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Hash size={20} className={isSelected ? 'text-pill-active-text' : 'text-textSecondary/70'} />
                                        <span className="truncate">{subProj}</span>
                                      </div>

                                      {/* Delete SubProject Icon */}
                                      <button
                                        onClick={(e) => handleDeleteSubProject(e, area.name, project.name, subProj)}
                                        className="opacity-0 group-hover/sub:opacity-100 p-0.5 hover:bg-red-50 hover:text-red-600 rounded transition-opacity"
                                        title="Delete SubProject"
                                      >
                                        <Trash2 size={20} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PLANNING DIVISION */}
          <div className="pt-5 pb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-textSecondary/60">
            Planning
          </div>

          {planningItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedSubProject;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-pill-active text-pill-active-text shadow-sm font-semibold' 
                    : 'text-textSecondary hover:bg-surfaceSecondary hover:text-textPrimary'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-pill-active-text' : 'text-textSecondary'} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto pt-4 border-t border-border space-y-1 flex-shrink-0">
          {footerItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !selectedSubProject;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-pill-active text-pill-active-text font-semibold' 
                    : 'text-textSecondary hover:bg-surfaceSecondary hover:text-textPrimary'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-pill-active-text' : 'text-textSecondary'} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
