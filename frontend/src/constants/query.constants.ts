import type { QueryClientConfig } from '@tanstack/react-query';

export const QUERY_CLIENT_OPTIONS: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
};

export const HEALTH_QUERY_KEY = ['health'] as const;
