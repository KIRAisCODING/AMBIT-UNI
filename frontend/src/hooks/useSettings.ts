import { useState, useEffect } from 'react';

export interface UserSettings {
  userName: string;
  userEmail: string;
  theme: 'light' | 'dark';
  dailyReviewReminder: boolean;
  streakAlerts: boolean;
  calendarSync: boolean;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>({
    userName: 'Senior Product Designer',
    userEmail: 'architect@ambit.ai',
    theme: 'light',
    dailyReviewReminder: true,
    streakAlerts: true,
    calendarSync: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Authentication abstractions (prepared for Google OAuth)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user, setUser] = useState<{ name: string; email: string; initials: string }>({
    name: 'Senior Product Designer',
    email: 'architect@ambit.ai',
    initials: 'SP',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings({
            userName: data.userName,
            userEmail: data.userEmail,
            theme: data.theme as 'light' | 'dark',
            dailyReviewReminder: data.dailyReviewReminder,
            streakAlerts: data.streakAlerts,
            calendarSync: data.calendarSync,
          });
          setUser({
            name: data.userName,
            email: data.userEmail,
            initials: getInitials(data.userName),
          });

          // Sync theme on HTML root element directly on load
          if (data.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'SP';
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        const newSettings = {
          userName: data.userName,
          userEmail: data.userEmail,
          theme: data.theme as 'light' | 'dark',
          dailyReviewReminder: data.dailyReviewReminder,
          streakAlerts: data.streakAlerts,
          calendarSync: data.calendarSync,
        };
        setSettings(newSettings);
        setUser({
          name: data.userName,
          email: data.userEmail,
          initials: getInitials(data.userName),
        });

        // Set theme on HTML root element directly
        if (updates.theme) {
          if (updates.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const resetData = async (action: 'clear' | 'seed') => {
    try {
      await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset data:', err);
    }
  };

  const login = async () => {
    console.log('Redirecting to Google OAuth login...');
    setIsAuthenticated(true);
  };

  const logout = async () => {
    console.log('Logging out...');
    setIsAuthenticated(false);
  };

  return {
    settings,
    user,
    isAuthenticated,
    isLoading,
    updateSettings,
    resetData,
    login,
    logout,
  };
}
