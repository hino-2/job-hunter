import type { QueryClient } from '@tanstack/react-query';

import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import type { Application } from '../types/application.interfaces';

/**
 * Единственное место, знающее форму кэша списка (§7.3). Обе функции работают префиксным
 * фильтром по APPLICATIONS_QUERY_KEY: он накрывает разом все закэшированные комбинации
 * фильтров и ключ счётчика шапки, так что оптимистичная правка видна везде, где запись
 * показана.
 */

export function readApplicationFromCaches(
  client: QueryClient,
  id: string,
): Application | undefined {
  const caches = client.getQueriesData<Application[]>({ queryKey: APPLICATIONS_QUERY_KEY });

  for (const [, items] of caches) {
    const found = items?.find((item) => item.id === id);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

export function patchApplicationInCaches(
  client: QueryClient,
  id: string,
  patch: Partial<Application>,
): void {
  client.setQueriesData<Application[]>({ queryKey: APPLICATIONS_QUERY_KEY }, (items) => {
    if (items === undefined) {
      return items;
    }

    // Возвращаем ту же ссылку, если записи в этом кэше нет: иначе React Query пометит
    // изменёнными все закэшированные варианты фильтров и вызовет лишние рендеры.
    if (!items.some((item) => item.id === id)) {
      return items;
    }

    return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  });
}
