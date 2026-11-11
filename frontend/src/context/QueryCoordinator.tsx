import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

export type InvalidationKey =
  | 'dashboard'
  | 'calendar'
  | 'tasks'
  | 'habits'
  | 'notes'
  | 'captures'
  | 'analytics'
  | 'hierarchy';

interface QueryCoordinatorContextValue {
  invalidateQueries: (keys: InvalidationKey[]) => void;
  subscribe: (key: InvalidationKey, callback: () => void) => () => void;
}

const QueryCoordinatorContext = createContext<QueryCoordinatorContextValue | null>(null);

export function QueryCoordinatorProvider({ children }: { children: React.ReactNode }) {
  const subscribersRef = useRef<Map<InvalidationKey, Set<() => void>>>(new Map());
  const lastFocusRef = useRef<number>(Date.now());

  const subscribe = useCallback((key: InvalidationKey, callback: () => void) => {
    if (!subscribersRef.current.has(key)) {
      subscribersRef.current.set(key, new Set());
    }
    const set = subscribersRef.current.get(key)!;
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        subscribersRef.current.delete(key);
      }
    };
  }, []);

  const invalidateQueries = useCallback((keys: InvalidationKey[]) => {
    for (const key of keys) {
      const callbacks = subscribersRef.current.get(key);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb();
          } catch (err) {
            console.error(`Error executing refetch for query key "${key}":`, err);
          }
        });
      }
    }
  }, []);

  // Window Focus and Visibility Auto-Sync (debounced by 4 seconds)
  useEffect(() => {
    const handleRevalidation = () => {
      const now = Date.now();
      if (now - lastFocusRef.current > 4000) {
        lastFocusRef.current = now;
        // Invalidate all active queries to ensure fresh cross-tab and cross-device state
        const allActiveKeys = Array.from(subscribersRef.current.keys());
        if (allActiveKeys.length > 0) {
          invalidateQueries(allActiveKeys);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevalidation();
      }
    };

    window.addEventListener('focus', handleRevalidation);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleRevalidation);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [invalidateQueries]);

  return (
    <QueryCoordinatorContext.Provider value={{ invalidateQueries, subscribe }}>
      {children}
    </QueryCoordinatorContext.Provider>
  );
}

export function useQueryCoordinator(): QueryCoordinatorContextValue {
  const context = useContext(QueryCoordinatorContext);
  if (!context) {
    // Graceful fallback if used outside provider (allows standalone rendering/tests)
    return {
      invalidateQueries: () => {},
      subscribe: () => () => {},
    };
  }
  return context;
}

export function useQuerySubscriber(key: InvalidationKey, refetch: () => void) {
  const { subscribe } = useQueryCoordinator();

  useEffect(() => {
    const unsubscribe = subscribe(key, refetch);
    return () => unsubscribe();
  }, [key, refetch, subscribe]);
}

