import { useState, useEffect } from 'react';

export function useAnalytics(timeRange: string = '7days') {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return {
    analyticsData,
    isLoading,
    refreshAnalytics: fetchAnalytics,
  };
}
