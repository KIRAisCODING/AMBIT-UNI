import React, { useState, useEffect } from 'react';
import { Menu, Sparkles, Brain, PanelLeft } from 'lucide-react';
import { DEFAULT_ITEMS, DEFAULT_HABITS, DEFAULT_HIERARCHY } from './data';
import { ActiveTab, BrainItem, Habit, AreaHierarchy, WorkspaceSelection } from './types';

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

  // Database states
  const [items, setItems] = useState<BrainItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [hierarchy, setHierarchy] = useState<AreaHierarchy[]>([]);
  const [selectedSubProject, setSelectedSubProject] = useState<WorkspaceSelection | null>(null);

  // Theme selection state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load from LocalStorage
  useEffect(() => {
    const storedItems = localStorage.getItem('ambit_brain_items');
    const storedHabits = localStorage.getItem('ambit_habits');
    const storedHierarchy = localStorage.getItem('ambit_hierarchy');
    const storedTheme = localStorage.getItem('ambit_theme') as 'light' | 'dark' | null;

    if (storedItems) {
      setItems(JSON.parse(storedItems));
    } else {
      setItems(DEFAULT_ITEMS);
      localStorage.setItem('ambit_brain_items', JSON.stringify(DEFAULT_ITEMS));
    }

    if (storedHabits) {
      setHabits(JSON.parse(storedHabits));
    } else {
      setHabits(DEFAULT_HABITS);
      localStorage.setItem('ambit_habits', JSON.stringify(DEFAULT_HABITS));
    }

    if (storedHierarchy) {
      setHierarchy(JSON.parse(storedHierarchy));
    } else {
      setHierarchy(DEFAULT_HIERARCHY);
      localStorage.setItem('ambit_hierarchy', JSON.stringify(DEFAULT_HIERARCHY));
    }

    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // Sync theme with HTML root class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ambit_theme', theme);
  }, [theme]);

  // Save changes to LocalStorage helper
  const saveItems = (updatedItems: BrainItem[]) => {
    setItems(updatedItems);
    localStorage.setItem('ambit_brain_items', JSON.stringify(updatedItems));
  };

  const saveHabits = (updatedHabits: Habit[]) => {
    setHabits(updatedHabits);
    localStorage.setItem('ambit_habits', JSON.stringify(updatedHabits));
  };

  const saveHierarchy = (updatedHierarchy: AreaHierarchy[]) => {
    setHierarchy(updatedHierarchy);
    localStorage.setItem('ambit_hierarchy', JSON.stringify(updatedHierarchy));
  };

  // 1. Capture new concepts (with Gemini Integration!)
  const handleCaptureItem = async (
    newItem: Omit<BrainItem, 'id' | 'createdAt'>, 
    runAI: boolean
  ) => {
    // Intercept habit capturing from floating composer
    if (newItem.type === 'Habit') {
      const newHabit: Habit = {
        id: `habit-${Date.now()}`,
        name: newItem.content,
        frequency: 'daily',
        streak: 0,
        longestStreak: 0,
        completedDays: [],
        createdAt: new Date().toISOString(),
        area: newItem.assignment === 'now' ? newItem.area : undefined,
        project: newItem.assignment === 'now' ? newItem.project : undefined,
        subProject: newItem.assignment === 'now' ? newItem.subProject : undefined,
        notes: ''
      };
      saveHabits([newHabit, ...habits]);
      return;
    }

    const itemID = `item-${Date.now()}`;
    const createdAt = new Date().toISOString();

    let finalItem: BrainItem = {
      id: itemID,
      createdAt,
      ...newItem
    };

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
          
          // Enrich with Gemini-derived schema metadata
          finalItem.smartSummary = aiData.smartSummary;
          
          // Merge generated tags with user tags
          if (aiData.suggestedTags && Array.isArray(aiData.suggestedTags)) {
            const uniqueTags = Array.from(new Set([...newItem.tags, ...aiData.suggestedTags]));
            finalItem.tags = uniqueTags;
          }

          // Auto-categorize if assigned now
          if (newItem.assignment === 'now') {
            if (aiData.suggestedArea) finalItem.area = aiData.suggestedArea;
            if (aiData.suggestedProject) finalItem.project = aiData.suggestedProject;
            if (aiData.suggestedSubProject) finalItem.subProject = aiData.suggestedSubProject;
          }
        }
      } catch (err) {
        console.warn("AI extraction bypassed due to network or offline mode:", err);
      }
    }

    const updated = [finalItem, ...items];
    saveItems(updated);
  };

  // 2. Complete/Toggle tasks
  const handleToggleComplete = (id: string) => {
    const updated = items.map(it => {
      if (it.id === id) {
        return { ...it, completed: !it.completed };
      }
      return it;
    });
    saveItems(updated);
  };

  // 3. Delete brain concepts
  const handleDeleteItem = (id: string) => {
    const updated = items.filter(it => it.id !== id);
    saveItems(updated);
  };

  // 4. File unassigned ideas
  const handleAssignItem = (id: string, area: string, project: string, subProject: string) => {
    const updated = items.map(it => {
      if (it.id === id) {
        // Automatically append the category name as a semantic tag too
        const uniqueTags = Array.from(new Set([...it.tags, area, project]));
        return {
          ...it,
          assignment: 'now' as const,
          area,
          project,
          subProject,
          tags: uniqueTags
        };
      }
      return it;
    });
    saveItems(updated);
  };

  // 5. Schedule date on calendar
  const handleScheduleItem = (id: string, dateStr: string) => {
    const updated = items.map(it => {
      if (it.id === id) {
        return { ...it, scheduledDate: dateStr || undefined };
      }
      return it;
    });
    saveItems(updated);
  };

  // 6. Habit operations
  const handleAddHabit = (
    name: string, 
    frequency: 'daily' | 'weekly',
    project?: string,
    area?: string,
    subProject?: string
  ) => {
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name,
      frequency,
      streak: 0,
      longestStreak: 0,
      completedDays: [],
      createdAt: new Date().toISOString(),
      project,
      area,
      subProject,
      notes: ''
    };
    saveHabits([newHabit, ...habits]);
  };

  const handleUpdateHabit = (id: string, updates: Partial<Habit>) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        return { ...h, ...updates };
      }
      return h;
    });
    saveHabits(updated);
  };

  const handleToggleHabitDay = (id: string, dateStr: string) => {
    const updated = habits.map(habit => {
      if (habit.id === id) {
        let completedDays = [...habit.completedDays];
        const isAlreadyCompleted = completedDays.includes(dateStr);

        if (isAlreadyCompleted) {
          completedDays = completedDays.filter(d => d !== dateStr);
        } else {
          completedDays.push(dateStr);
        }

        // Simple dynamic streak computation based on consecutive daily finishes
        completedDays.sort();
        let streak = 0;
        const today = new Date();
        const datesSet = new Set(completedDays);

        // Check backwards from today or yesterday
        let checkDate = new Date();
        // If today is completed or yesterday is completed, continue the streak count
        if (datesSet.has(checkDate.toISOString().split('T')[0])) {
          while (datesSet.has(checkDate.toISOString().split('T')[0])) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          }
        } else {
          // If today isn't completed, check if yesterday was to preserve active streak
          checkDate.setDate(checkDate.getDate() - 1);
          if (datesSet.has(checkDate.toISOString().split('T')[0])) {
            while (datesSet.has(checkDate.toISOString().split('T')[0])) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            }
          }
        }

        return {
          ...habit,
          completedDays,
          streak
        };
      }
      return habit;
    });
    saveHabits(updated);
  };

  const handleDeleteHabit = (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    saveHabits(updated);
  };

  // 7. Settings Operations
  const handleResetData = () => {
    saveItems(DEFAULT_ITEMS);
    saveHabits(DEFAULT_HABITS);
    saveHierarchy(DEFAULT_HIERARCHY);
  };

  const handleClearAll = () => {
    saveItems([]);
    saveHabits([]);
    saveHierarchy([]);
  };

  const handleReorderTasks = (orderedIds: string[]) => {
    const updated = items.map(it => {
      const idx = orderedIds.indexOf(it.id);
      if (idx !== -1) {
        return { ...it, order: idx };
      }
      return it;
    });
    saveItems(updated);
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
            const taskID = `item-${Date.now()}`;
            const createdAt = new Date().toISOString();
            const item: BrainItem = {
              id: taskID,
              createdAt,
              ...newTask
            };
            saveItems([item, ...items]);
          }}
          onUpdateTask={(id, updates) => {
            const updated = items.map(it => {
              if (it.id === id) {
                return { ...it, ...updates };
              }
              return it;
            });
            saveItems(updated);
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
            items={items}
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
        onUpdateHierarchy={saveHierarchy}
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

