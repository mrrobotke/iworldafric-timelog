/**
 * Timelog Provider for React Context
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface TimelogConfig {
  apiBase?: string;
  developerId?: string;
  clientId?: string;
  features?: {
    timer?: boolean;
    weeklyGrid?: boolean;
    charts?: boolean;
    approvals?: boolean;
  };
}

interface TimelogContextValue {
  config: TimelogConfig;
  queryClient: QueryClient;
}

const TimelogContext = createContext<TimelogContextValue | undefined>(undefined);

export function useTimelog() {
  const context = useContext(TimelogContext);
  if (!context) {
    throw new Error('useTimelog must be used within TimelogProvider');
  }
  return context;
}

interface TimelogProviderProps {
  children: ReactNode;
  config?: TimelogConfig;
  queryClient?: QueryClient;
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function TimelogProvider({
  children,
  config = {},
  queryClient = defaultQueryClient,
}: TimelogProviderProps) {
  const value: TimelogContextValue = {
    config: {
      apiBase: '/api/timelog',
      features: {
        timer: true,
        weeklyGrid: true,
        charts: true,
        approvals: false,
        ...config.features,
      },
      ...config,
    },
    queryClient,
  };
  
  return (
    <TimelogContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </TimelogContext.Provider>
  );
}