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

// Child view imports
import Sidebar from './components/Sidebar';
import CaptureComposer from './components/CaptureComposer';
import InboxView from './components/InboxView';
import UnassignedView from './components/UnassignedView';
import HabitsView from './components/HabitsView';
import CalendarView from './components/CalendarView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import BrainChat from './components/BrainChat';
import WorkspaceView from './components/WorkspaceView';

export default function App() {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<ActiveTab>('Inbox');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [chatOpen, setChatOpen] = useState(false);

  // Hook integrations
  const { settings, updateSettings, resetData } = useSettings();
  const { hierarchy, updateHierarchy } = useAreas();
  const { items, createTask, updateTask, deleteTask, assignTask, reorderTasks } = useTasks();
  const { habits, addHabit, toggleHabitDay, deleteHabit, updateHabit } = useHabits();
  const { calendarItems, scheduleItem } = useCalendar();

  const [selectedSubProject, setSelectedSubProject] = useState<WorkspaceSelection | null>(null);

  const theme = settings.theme;
  const setTheme = (t: 'light' | 'dark') => {
    updateSettings({ theme: t });
  };

  // 1. Capture new concepts (with Gemini Integration!)
  const handleCaptureItem = async (
    newItem: Omit<BrainItem, 'id' | 'createdAt'>, 
    runAI: boolean
  ) => {
    // Intercept habit capturing from floating composer
    if (newItem.type === 'Habit') {
      await addHabit(newItem.content, 'daily', newItem.project, newItem.area, newItem.subProject);
      return;
    }

    let finalItem = { ...newItem } as any;

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
          finalItem.smartSummary = aiData.smartSummary;
          if (aiData.suggestedTags && Array.isArray(aiData.suggestedTags)) {
            finalItem.tags = Array.from(new Set([...newItem.tags, ...aiData.suggestedTags]));
          }
        }
      } catch (err) {
        console.warn("AI extraction bypassed due to network or offline mode:", err);
      }
    }

    await createTask(finalItem);
  };

  // 2. Complete/Toggle tasks
  const handleToggleComplete = (id: string) => {
    const item = items.find(it => it.id === id);
    if (item) {
      updateTask(id, { completed: !item.completed });
    }
  };

  // 3. Delete brain concepts
  const handleDeleteItem = (id: string) => {
    deleteTask(id);
  };

  // 4. File unassigned ideas
  const handleAssignItem = (id: string, area: string, project: string, subProject: string) => {
    assignTask(id, area, project, subProject);
  };

  // 5. Schedule date on calendar
  const handleScheduleItem = (id: string, dateStr: string) => {
    scheduleItem(id, dateStr);
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
          onToggleComplete={handleToggleComplete}
          onDeleteItem={handleDeleteItem}
          onAddTask={(newTask) => {
            createTask(newTask);
          }}
          onUpdateTask={(id, updates) => {
            updateTask(id, updates);
          }}
          onReorderTasks={handleReorderTasks}
        />
      );
    }

    switch (activeTab) {
      case 'Inbox':
        return (
          <InboxView 
            items={items} 
            onToggleComplete={handleToggleComplete}
            onDeleteItem={handleDeleteItem}
            onScheduleItem={handleScheduleItem}
          />
        );
      case 'Unassigned':
        return (
          <UnassignedView 
            items={items} 
            onAssignItem={handleAssignItem}
            onDeleteItem={handleDeleteItem}
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
          <CalendarView 
            items={calendarItems}
            onScheduleItem={handleScheduleItem}
          />
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
          />
        );
      default:
        return null;
    }
  };

  const showCaptureComposer = (activeTab === 'Inbox' || activeTab === 'Habits' || activeTab === 'Unassigned') && !selectedSubProject;

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
              className="absolute left-6 top-6 p-2 bg-surface border border-border rounded-xl shadow-sm text-textSecondary hover:text-textPrimary transition-all duration-200 z-10 flex items-center justify-center hover:scale-105 active:scale-95"
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
          <CaptureComposer onCapture={handleCaptureItem} hierarchy={hierarchy} activeTab={activeTab} />
        )}
      </div>

      {/* Side chat panel drawer */}
      <BrainChat 
        items={items}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}

