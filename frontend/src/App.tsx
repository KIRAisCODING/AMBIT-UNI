import React, { useState, useEffect } from 'react';
import { Menu, Sparkles, Brain, PanelLeft } from 'lucide-react';
import { ActiveTab, BrainItem, Habit, AreaHierarchy, WorkspaceSelection } from './types';

// Custom Hooks
import { useSettings } from './hooks/useSettings';
import { useAreas } from './hooks/useAreas';
import { useProjects } from './hooks/useProjects';
import { useTasks } from './hooks/useTasks';
import { useHabits } from './hooks/useHabits';
import { useCalendar } from './hooks/useCalendar';
import { useCaptures } from './hooks/useCaptures';
import { useNotes } from './hooks/useNotes';

// Child view imports
import Sidebar from './components/Sidebar';
import CaptureComposer from './components/CaptureComposer';
import InboxView from './components/InboxView';
import NotesView from './components/NotesView';
import UnassignedView from './components/UnassignedView';
import HabitsView from './components/HabitsView';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import BrainChat from './components/BrainChat';
import ProductTour from './components/ProductTour';
import WorkspaceView from './components/WorkspaceView';
import DashboardView from './components/DashboardView';
import LoginPage from './components/LoginPage';

export default function App() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<ActiveTab>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [chatOpen, setChatOpen] = useState(false);

  // Hook integrations
  const { settings, updateSettings, resetData, isAuthenticated, isLoading, logout, user } = useSettings();
  const { hierarchy, updateHierarchy, createSubProject } = useAreas();
  const { items, createTask, updateTask, deleteTask, assignTask, reorderTasks, refreshTasks } = useTasks();
  const { habits, addHabit, toggleHabitDay, deleteHabit, updateHabit } = useHabits();
  const { scheduleTask, refreshCalendar } = useCalendar();
  const { createCapture, refreshCaptures } = useCaptures();
  const { createNote } = useNotes();

  const [selectedSubProject, setSelectedSubProject] = useState<WorkspaceSelection | null>(null);

  const theme = settings.theme;
  const setTheme = (t: 'light' | 'dark') => {
    updateSettings({ theme: t });
  };

  // Global Keyboard Navigation (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K: Focus Quick Capture / Go to Inbox
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('Inbox');
        setSelectedSubProject(null);
        setTimeout(() => {
          const input = document.getElementById('capture-input') as HTMLTextAreaElement | null;
          if (input) input.focus();
        }, 50);
      }

      // Escape: Close active overlays
      if (e.key === 'Escape') {
        if (chatOpen) setChatOpen(false);
        if (window.innerWidth < 768 && sidebarOpen) setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, sidebarOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-textPrimary flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-textSecondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 1. Capture new concepts (with Gemini Integration!)
  const handleCaptureItem = async (
    newItem: Omit<BrainItem, 'id' | 'createdAt'>, 
    runAI: boolean
  ) => {
    let smartSummary: string | undefined = undefined;

    if (runAI) {
      try {
        const response = await fetch('/api/brain/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newItem.content,
            type: newItem.type
          })
        });

        if (response.ok) {
          const aiData = await response.json();
          smartSummary = aiData.smartSummary;
        }
      } catch (err) {
        console.warn("AI extraction bypassed due to network or offline mode:", err);
      }
    }

    if (newItem.assignment === 'now') {
      // Direct filing to Area / Project
      if (newItem.type === 'Habit') {
        await addHabit({ name: newItem.content, areaId: newItem.areaId, area: newItem.area });
      } else if (newItem.type === 'Note') {
        await createNote({
          title: newItem.content,
          content: newItem.content,
          areaId: newItem.areaId || null,
          projectId: newItem.projectId || null,
          subProjectId: newItem.subProjectId || null,
          tags: newItem.tags,
        });
      } else {
        await createTask({
          title: newItem.content,
          areaId: newItem.areaId || null,
          projectId: newItem.projectId || null,
          subProjectId: newItem.subProjectId || null,
          tags: newItem.tags,
          priority: 'NONE',
          status: 'TODO',
        });
        await refreshCalendar();
      }
    } else {
      // Default: frictionless Capture Inbox intake
      const cType = (newItem.type === 'Habit' ? 'HABIT' : newItem.type === 'Note' ? 'NOTE' : 'TASK') as 'TASK' | 'NOTE' | 'HABIT';
      await createCapture(newItem.content, cType);
      await refreshCaptures();
    }
  };

  // 2. Complete/Toggle tasks
  const handleToggleComplete = async (id: string) => {
    const item = items.find(it => it.id === id);
    if (item) {
      await updateTask(id, { completed: !item.completed });
      await refreshCalendar();
    }
  };

  // 3. Delete brain concepts
  const handleDeleteItem = async (id: string) => {
    await deleteTask(id);
    await refreshCalendar();
  };

  // 4. File unassigned ideas
  const handleAssignItem = async (id: string, areaId: string, projectId: string, subProjectId?: string, tags?: string[]) => {
    await assignTask(id, areaId, projectId, subProjectId, tags);
    await refreshCalendar();
  };

  // 5. Schedule date on calendar
  const handleScheduleItem = async (id: string, dateStr: string) => {
    await scheduleTask(id, dateStr);
    await refreshTasks();
  };

  // 6. Habit operations
  const handleAddHabit = (
    name: string, 
    frequency: 'daily' | 'weekly',
    project?: string,
    area?: string,
    subProject?: string
  ) => {
    addHabit(name, frequency, project, area, subProject);
  };

  const handleUpdateHabit = (id: string, updates: Partial<Habit>) => {
    updateHabit(id, updates);
  };

  const handleToggleHabitDay = (id: string, dateStr: string) => {
    toggleHabitDay(id, dateStr);
  };

  const handleDeleteHabit = (id: string) => {
    deleteHabit(id);
  };

  // 7. Settings Operations
  const handleResetData = () => {
    resetData('seed');
  };

  const handleClearAll = () => {
    resetData('clear');
  };

  const handleReorderTasks = (orderedIds: string[]) => {
    reorderTasks(orderedIds);
  };

  // Render view dispatcher
  const renderTabContent = () => {
    if (selectedSubProject) {
      return (
        <WorkspaceView 
          area={selectedSubProject.area}
          project={selectedSubProject.project}
          subProject={selectedSubProject.subProject}
          items={items}
          hierarchy={hierarchy}
          onCreateSubProject={createSubProject}
          onToggleComplete={handleToggleComplete}
          onDeleteItem={handleDeleteItem}
          onAddTask={async (newTask) => {
            await createTask(newTask);
            await refreshCalendar();
          }}
          onUpdateTask={async (id, updates) => {
            await updateTask(id, updates);
            await refreshCalendar();
          }}
          onReorderTasks={handleReorderTasks}
        />
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return (
          <DashboardView
            onNavigateTab={(tab) => {
              setSelectedSubProject(null);
              setActiveTab(tab);
            }}
            onSelectProject={(sel) => {
              setSelectedSubProject(sel);
            }}
            onQuickCapture={async (content, type) => {
              await handleCaptureItem(
                { content, type: type as any, tags: [], assignment: 'later' },
                false
              );
            }}
          />
        );
      case 'Inbox':
        return (
          <InboxView 
            hierarchy={hierarchy}
            onPromoteSuccess={async () => {
              await refreshTasks();
              await refreshCalendar();
            }}
          />
        );
      case 'Notes':
        return (
          <NotesView 
            hierarchy={hierarchy}
          />
        );
      case 'Unassigned':
        return (
          <UnassignedView 
            items={items} 
            onAssignItem={handleAssignItem}
            onDeleteItem={handleDeleteItem}
            hierarchy={hierarchy}
          />
        );
      case 'Habits':
        return (
          <HabitsView 
            habits={habits}
            onAddHabit={handleAddHabit}
            onToggleHabitDay={handleToggleHabitDay}
            onDeleteHabit={handleDeleteHabit}
            onUpdateHabit={handleUpdateHabit}
            hierarchy={hierarchy}
          />
        );
      case 'Calendar':
        return (
          <CalendarView />
        );
      case 'Analytics':
        return (
          <AnalyticsView 
            items={items}
            habits={habits}
            onToggleComplete={handleToggleComplete}
            onDeleteItem={handleDeleteItem}
            hierarchy={hierarchy}
          />
        );
      case 'Settings':
        return (
          <SettingsView 
            onResetData={handleResetData}
            onClearAll={handleClearAll}
            theme={theme}
            setTheme={setTheme}
            settings={settings}
            onUpdateSettings={updateSettings}
            user={user}
            onLogout={logout}
          />
        );
      default:
        return null;
    }
  };

  const showCaptureComposer = (activeTab === 'Inbox' || activeTab === 'Notes' || activeTab === 'Habits' || activeTab === 'Unassigned') && !selectedSubProject;

  return (
    <div className="min-h-screen bg-background text-textPrimary flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        selectedSubProject={selectedSubProject}
        setSelectedSubProject={setSelectedSubProject}
        hierarchy={hierarchy}
        onUpdateHierarchy={updateHierarchy}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenChat={() => setChatOpen(true)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${sidebarOpen ? 'md:pl-72' : 'md:pl-0'}`}>
        
        {/* Workspace Canvas wrapper */}
        <main className={`relative flex-1 px-4 md:px-8 py-6 bg-surfaceSecondary rounded-[32px] border border-border m-4 md:m-6 md:ml-2 shadow-sm ${showCaptureComposer ? 'pb-44' : 'pb-20'}`}>
          {/* Floating Sidebar Toggle when sidebar is closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute left-6 top-6 p-2 bg-surface border border-border rounded-xl shadow-sm text-textSecondary hover:text-textPrimary transition-all duration-200 z-10 flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer"
              title="Open sidebar"
            >
              <Menu size={20} />
            </button>
          )}

          <div className={!sidebarOpen ? "pt-12" : ""}>
            {renderTabContent()}
          </div>
        </main>

        {/* Floating Capture composer (Displayed on Inbox and Habits) */}
        {showCaptureComposer && (
          <CaptureComposer 
            onCapture={handleCaptureItem} 
            hierarchy={hierarchy} 
            activeTab={activeTab} 
            onUpdateHierarchy={updateHierarchy} 
          />
        )}
      </div>

      {/* Side chat panel drawer */}
      <BrainChat 
        items={items}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* Onboarding Product Tour Overlay */}
      <ProductTour 
        onboardingCompleted={settings.onboardingCompleted}
        onUpdateSettings={updateSettings}
        setActiveTab={setActiveTab}
        setSelectedSubProject={setSelectedSubProject}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    </div>
  );
}
