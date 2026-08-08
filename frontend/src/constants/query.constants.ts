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

/**
 * Корневой ключ всех запросов списка. Полный ключ — [...APPLICATIONS_QUERY_KEY, params],
 * поэтому префиксная инвалидация по этому ключу накрывает и список, и счётчик шапки.
 */
export const APPLICATIONS_QUERY_KEY = ['applications'] as const;

/**
 * Задержка поиска. Без неё каждое нажатие клавиши — отдельный HTTP-запрос и отдельная
 * запись в кэше React Query. 300 мс заметно меньше 800 мс автосейва (§7.3): поиск
 * должен ощущаться живым.
 */
export const SEARCH_DEBOUNCE_MS = 300;
