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

/**
 * Задержка автосейва текстового поля (§7.3). Заметно больше 300 мс поиска намеренно:
 * поиск обязан ощущаться живым, а запись в БД на каждой паузе в наборе — нет.
 */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Корневой ключ списка найденных вакансий (§5.7). После перехода прогона
 * RUNNING → DONE/ERROR список инвалидируется целиком по этому ключу (§7.9.2) —
 * клиенту заранее неизвестно, куда новые записи попадут в текущей сортировке
 * и проходят ли они под активный поиск (та же логика, что у APPLICATIONS_QUERY_KEY).
 */
export const VACANCY_LEADS_QUERY_KEY = ['vacancy-leads'] as const;

/**
 * Отдельный ключ статуса прогона (§5.7, §7.9.2): опрашивается независимо от списка
 * лидов и не должен инвалидироваться вместе с ним по общему префиксу.
 */
export const VACANCY_SCAN_STATUS_QUERY_KEY = ['vacancy-scan-status'] as const;

export const VACANCY_SEARCH_SETTINGS_QUERY_KEY = ['vacancy-search-settings'] as const;

/** §7.9.2: пока прогон RUNNING, статус опрашивается раз в 2 секунды. */
export const SCAN_STATUS_POLL_INTERVAL_MS = 2000;
