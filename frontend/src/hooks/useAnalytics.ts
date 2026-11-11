import { useState, useEffect, useCallback } from 'react';
import { AnalyticsResponse } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQuerySubscriber } from '../context/QueryCoordinator';

export function useAnalytics(timeRange: string = '7days') {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<AnalyticsResponse>('/api/analytics', {
        params: { timeRange },
      });
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useQuerySubscriber('analytics', fetchAnalytics);

  return {
    analyticsData,
    isLoading,
    error,
    refreshAnalytics: fetchAnalytics,
  };
}
