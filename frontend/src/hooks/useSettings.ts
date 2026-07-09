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

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; initials: string; image?: string } | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'SP';
  };

  useEffect(() => {
    async function loadAuthAndSettings() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const session = await sessionRes.json().catch(() => null);
          if (session && session.user) {
            setUser({
              name: session.user.name || 'Senior Product Designer',
              email: session.user.email || 'architect@ambit.ai',
              initials: getInitials(session.user.name || 'Senior Product Designer'),
              image: session.user.image,
            });
            setIsAuthenticated(true);

            // Now load settings from database
            const settingsRes = await fetch('/api/settings');
            if (settingsRes.ok) {
              const data = await settingsRes.json();
              setSettings({
                userName: data.userName,
                userEmail: data.userEmail,
                theme: data.theme as 'light' | 'dark',
                dailyReviewReminder: data.dailyReviewReminder,
                streakAlerts: data.streakAlerts,
                calendarSync: data.calendarSync,
              });

              // Sync theme on HTML root element directly on load
              if (data.theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Failed to load session or settings:', err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuthAndSettings();
  }, []);

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
        
        if (user) {
          setUser({
            ...user,
            name: data.userName,
            email: data.userEmail,
            initials: getInitials(data.userName),
          });
        }

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

  const login = () => {
    window.location.href = "/api/auth/signin/google";
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
    window.location.href = '/';
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
