import React, { useState } from 'react';
import { 
  Sparkles, Trash2, Database, HelpCircle, BookOpen, KeyRound, AlertTriangle, 
  Eye, Laptop, Sun, Moon, Keyboard, Bell, User, Check, ShieldCheck, Cpu
} from 'lucide-react';

interface SettingsViewProps {
  onResetData: () => void;
  onClearAll: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  settings?: {
    userName: string;
    userEmail: string;
    dailyReviewReminder: boolean;
    streakAlerts: boolean;
    calendarSync: boolean;
  };
  onUpdateSettings?: (updates: any) => void;
  user?: {
    name: string;
    email: string;
    initials: string;
    image?: string;
  } | null;
  onLogout?: () => void;
}

const safeConfirm = (message: string): boolean => {
  try {
    return window.confirm(message);
  } catch (err) {
    console.warn("confirm() blocked or failed, defaulting to true:", err);
    return true;
  }
};

const safeAlert = (message: string): void => {
  try {
    window.alert(message);
  } catch (err) {
    console.warn("alert() blocked or failed:", err);
  }
};


export default function SettingsView({ 
  onResetData, 
  onClearAll,
  theme,
  setTheme,
  settings,
  onUpdateSettings,
  user,
  onLogout
}: SettingsViewProps) {
  // Mock Settings States
  const [dailyReviewReminder, setDailyReviewReminder] = useState(settings?.dailyReviewReminder ?? true);
  const [streakAlerts, setStreakAlerts] = useState(settings?.streakAlerts ?? true);
  const [calendarSync, setCalendarSync] = useState(settings?.calendarSync ?? false);
  const [userName, setUserName] = useState(settings?.userName ?? 'Senior Product Designer');
  const [userEmail, setUserEmail] = useState(settings?.userEmail ?? 'architect@ambit.ai');
  const [autoArchive, setAutoArchive] = useState(true);

  // Sync state with settings when loaded asynchronously
  React.useEffect(() => {
    if (settings) {
      setDailyReviewReminder(settings.dailyReviewReminder);
      setStreakAlerts(settings.streakAlerts);
      setCalendarSync(settings.calendarSync);
      setUserName(settings.userName);
      setUserEmail(settings.userEmail);
    }
  }, [settings]);

  // Keyboard Shortcuts List
  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Open Brain Chat Command Menu' },
    { keys: ['Shift', 'Enter'], desc: 'New Line in Capture Composer' },
    { keys: ['⌘', 'I'], desc: 'Jump to Inbox Tab' },
    { keys: ['⌘', 'U'], desc: 'Jump to Unassigned Tab' },
    { keys: ['⌘', 'H'], desc: 'Jump to Habits Tracker' },
    { keys: ['Esc'], desc: 'Close Drawers & Floating popovers' },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="border-b border-border pb-5 mb-8">
        <h2 className="text-2xl md:text-3xl font-headline font-bold text-textPrimary mb-1">
          App Settings
        </h2>
        <p className="text-sm text-textSecondary">
          Configure visual themes, keyboard shortcuts, personal notification schedules, and manage storage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Appearance, Shortcuts & Notifications */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Appearance (Theme Selection) */}
          <div className="bg-surface border border-border p-6 rounded-3xl canvas-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider mb-5 border-b border-border pb-3">
              <Eye size={20} />
              <span>Appearance & Design Layout</span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-textPrimary mb-3">Color Scheme</h4>
              <p className="text-xs text-textSecondary mb-4">
                Choose a visual theme that suits your eyes and helps you maintain focus. Light mode provides high contrast; Dark mode reduces visual fatigue in dim environments.
              </p>
              
              <div className="grid grid-cols-2 gap-3.5 max-w-md">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-pill-active text-pill-active-text border-pill-active'
                      : 'bg-transparent border-border hover:border-textSecondary/45 text-textSecondary'
                  }`}
                >
                  <Sun size={20} />
                  <span>Light Mode (Cosmic Slate)</span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-pill-active text-pill-active-text border-pill-active'
                      : 'bg-transparent border-border hover:border-textSecondary/45 text-textSecondary'
                  }`}
                >
                  <Moon size={20} />
                  <span>Dark Mode (Midnight Blue)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="bg-surface border border-border p-6 rounded-3xl canvas-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-border pb-3">
              <Keyboard size={20} />
              <span>Keyboard Shortcuts Quick Reference</span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-textSecondary">
                Ambit is optimized for keyboard-only navigation, allowing power users to capture thoughts instantly without using the mouse.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {shortcuts.map((sh, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surfaceSecondary border border-border text-xs">
                    <span className="font-semibold text-textSecondary">{sh.desc}</span>
                    <div className="flex gap-1">
                      {sh.keys.map((k, kIdx) => (
                        <kbd key={kIdx} className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-bold font-mono shadow-sm text-textPrimary">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notification Alerts Settings */}
          <div className="bg-surface border border-border p-6 rounded-3xl canvas-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-border pb-3">
              <Bell size={20} />
              <span>Workspace Notification Rules</span>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-textPrimary block mb-0.5">Daily Review Reminder</label>
                  <span className="text-[11px] text-textSecondary block leading-relaxed">
                    Remind me at 9:00 PM to review and file unassigned notes captured during the day.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dailyReviewReminder}
                  onChange={(e) => {
                    setDailyReviewReminder(e.target.checked);
                    onUpdateSettings?.({ dailyReviewReminder: e.target.checked });
                  }}
                  className="rounded border-border text-textPrimary focus:ring-accent w-4 h-4 mt-0.5 cursor-pointer"
                />
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-border pt-3.5">
                <div className="flex-1">
                  <label className="text-xs font-bold text-textPrimary block mb-0.5">Habit Streaks Alerts</label>
                  <span className="text-[11px] text-textSecondary block leading-relaxed">
                    Notify me when a habit is close to breaking its active consecutive streak.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={streakAlerts}
                  onChange={(e) => {
                    setStreakAlerts(e.target.checked);
                    onUpdateSettings?.({ streakAlerts: e.target.checked });
                  }}
                  className="rounded border-border text-textPrimary focus:ring-accent w-4 h-4 mt-0.5 cursor-pointer"
                />
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-border pt-3.5">
                <div className="flex-1">
                  <label className="text-xs font-bold text-textPrimary block mb-0.5">Google Calendar Smart Synchronization</label>
                  <span className="text-[11px] text-textSecondary block leading-relaxed">
                    Automatically push tasks with scheduled deadlines directly to my personal calendar.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={calendarSync}
                  onChange={(e) => {
                    setCalendarSync(e.target.checked);
                    onUpdateSettings?.({ calendarSync: e.target.checked });
                  }}
                  className="rounded border-border text-textPrimary focus:ring-accent w-4 h-4 mt-0.5 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Database Operations */}
          <div className="bg-surface border border-border p-6 rounded-3xl canvas-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-border pb-3">
              <Database size={20} />
              <span>Sandbox Database Storage</span>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-textPrimary">Reset to Workspace Defaults</h4>
                  <p className="text-xs text-textSecondary mt-1 max-w-md">
                    Restores the initial high-quality seeded tasks, ideas, journals, and habits. Perfect for testing and prototyping.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (safeConfirm("Restore seeded items? This will reset custom content.")) {
                      onResetData();
                      safeAlert("Workspace reset complete!");
                    }
                  }}
                  className="bg-pill-active text-pill-active-text hover:opacity-90 px-4.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors text-center shrink-0 cursor-pointer"
                >
                  Seed Default Data
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-5">
                <div>
                  <h4 className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                    <AlertTriangle size={20} />
                    <span>Hard Reset Sandbox</span>
                  </h4>
                  <p className="text-xs text-textSecondary mt-1 max-w-md">
                    Permanently deletes all tasks, ideas, journals, and habit histories from your local storage. This action is irreversible.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (safeConfirm("Permanently erase ALL items? This cannot be undone.")) {
                      onClearAll();
                      safeAlert("Sandbox cleared!");
                    }
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-300 px-4.5 py-2 rounded-xl text-xs font-semibold transition-colors text-center shrink-0 cursor-pointer"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Account & Gemini Intelligence Details */}
        <div className="space-y-6">
          
          {/* Account Details Card */}
          <div className="bg-surface border border-border p-6 rounded-3xl canvas-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-border pb-3">
              <User size={20} />
              <span>Personal Profile</span>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-pill-active text-pill-active-text flex items-center justify-center font-bold text-sm">
                    {user?.initials || userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'SP'}
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={() => onUpdateSettings?.({ userName })}
                    className="bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-textPrimary outline-none w-full truncate"
                    title="Edit profile name"
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    onBlur={() => onUpdateSettings?.({ userEmail })}
                    className="bg-transparent border-none focus:ring-0 p-0 text-xs text-textSecondary outline-none w-full truncate"
                    title="Edit profile email"
                    disabled
                  />
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-300 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  Sign Out
                </button>
              )}

              <div className="space-y-2 bg-surfaceSecondary/50 border border-border/60 p-3.5 rounded-xl text-[11px] font-medium text-textPrimary">
                <div className="flex justify-between">
                  <span className="text-textSecondary">Workspace tier:</span>
                  <span className="font-semibold text-textPrimary flex items-center gap-1">
                    <ShieldCheck size={20} className="text-green-600" />
                    <span>Ambit Pro (Sandbox)</span>
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                  <span className="text-textSecondary">Active nodes:</span>
                  <span className="font-semibold font-mono">1,482 blocks</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5">
                  <span className="text-textSecondary">Uptime rating:</span>
                  <span className="font-semibold text-green-600">99.99%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gemini AI Settings details */}
          <div className="bg-surface border border-border p-6 rounded-3xl canvas-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-border pb-3">
              <Cpu size={20} />
              <span>Gemini Intelligence Core</span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-textPrimary flex items-center gap-1.5">
                  <span>Active AI Engine:</span>
                  <span className="bg-surfaceSecondary text-textPrimary text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    gemini-2.5-flash
                  </span>
                </h4>
                <p className="text-[11px] text-textSecondary mt-1.5 leading-relaxed font-medium">
                  AMBIT uses Google's latest high-speed multimodal reasoning model. The API key is securely handled on the server side and is never exposed to the client or browser, complying with security guidelines.
                </p>
              </div>

              <div className="bg-surfaceSecondary/50 border border-border/40 p-4 rounded-xl space-y-2 text-xs text-textPrimary leading-relaxed font-medium">
                <div className="font-bold flex items-center gap-1.5">
                  <BookOpen size={20} />
                  <span>How Gemini enhances your External Brain:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-textSecondary pl-1">
                  <li><b>Semantic Extraction:</b> Automatically parses content to generate 10-word actionable smart summaries.</li>
                  <li><b>Cognitive Association:</b> Extracts 2-3 relevant tags/hashtags without manual tagging.</li>
                  <li><b>Contextual Retrieval:</b> Enables you to query your entire notes database in natural language using the "Ask My Brain" Chat Assistant.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
