import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { VACANCY_LEADS_QUERY_KEY } from '../constants/query.constants';
import { DEFAULT_VACANCY_LEADS_HIDDEN_FILTER } from '../constants/vacancy-search.constants';
import type { VacancyLead, VacancyLeadsQueryParams } from '../types/vacancy-search.interfaces';
import type { VacancyLeadsHiddenFilter } from '../types/vacancy-search.type';

/**
 * Единственное место, знающее форму кэша списка лидов (§7.9.3, §5.7), тем же приёмом,
 * что applications-cache.utils.ts: префиксный фильтр по VACANCY_LEADS_QUERY_KEY
 * накрывает разом все закэшированные комбинации фильтров.
 *
 * У лида теперь два мутируемых поля. Смена hidden — это смена членства в текущей
 * выборке (hidden=exclude/only), поэтому скрытие всегда убирает запись из текущего
 * кэша целиком, а не подменяет в ней одно поле (removeVacancyLeadFromCaches /
 * insertVacancyLeadIntoCaches). А смена hasApplication (§7.9.1, POST :id/apply) —
 * это правка значения на месте: сама запись остаётся в выборке, меняется только
 * булев признак, поэтому здесь нужен обычный patch (patchVacancyLeadInCaches),
 * как у откликов.
 */

export function readVacancyLeadFromCaches(client: QueryClient, id: string): VacancyLead | undefined {
  const caches = client.getQueriesData<VacancyLead[]>({ queryKey: VACANCY_LEADS_QUERY_KEY });

  for (const [, items] of caches) {
    const found = items?.find((item) => item.id === id);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/** Точечная правка полей лида на месте (§7.9.1), тем же приёмом, что patchApplicationInCaches. */
export function patchVacancyLeadInCaches(
  client: QueryClient,
  id: string,
  patch: Partial<VacancyLead>,
): void {
  client.setQueriesData<VacancyLead[]>({ queryKey: VACANCY_LEADS_QUERY_KEY }, (items) => {
    if (items === undefined) {
      return items;
    }

    // Та же ссылка, если записи в этом кэше нет — иначе React Query пометит изменёнными
    // все закэшированные варианты фильтров и вызовет лишние рендеры.
    if (!items.some((item) => item.id === id)) {
      return items;
    }

    return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
  });
}

/** Оптимистичное скрытие/возврат (§7.9.3): запись пропадает из текущей выборки сразу. */
export function removeVacancyLeadFromCaches(client: QueryClient, id: string): void {
  client.setQueriesData<VacancyLead[]>({ queryKey: VACANCY_LEADS_QUERY_KEY }, (items) => {
    if (items === undefined) {
      return items;
    }

    // Та же ссылка, если записи в этом кэше нет — иначе React Query пометит изменёнными
    // все закэшированные варианты фильтров и вызовет лишние рендеры.
    if (!items.some((item) => item.id === id)) {
      return items;
    }

    return items.filter((item) => item.id !== id);
  });
}

/**
 * Ключ закэшированного запроса — [...VACANCY_LEADS_QUERY_KEY, params] (единственный
 * производитель этого префикса — useVacancyLeads.ts), поэтому приведение типа безопасно:
 * никто другой ключи этого префикса не создаёт.
 */
function resolveHiddenFilter(queryKey: QueryKey): VacancyLeadsHiddenFilter {
  const params = queryKey[1] as VacancyLeadsQueryParams | undefined;

  return params?.hidden ?? DEFAULT_VACANCY_LEADS_HIDDEN_FILTER;
}

/** Подходит ли лид с данным hidden под hidden-фильтр конкретного закэшированного запроса. */
function matchesHiddenFilter(hiddenFilter: VacancyLeadsHiddenFilter, hidden: boolean): boolean {
  if (hiddenFilter === 'all') {
    return true;
  }

  return hiddenFilter === 'only' ? hidden : !hidden;
}

/**
 * Синхронный откат скрытия/возврата при сбое PATCH (§7.9.3, тот же приём, что §7.3):
 * запись возвращается в кэш немедленно, без похода в сеть — инвалидацией здесь
 * обходиться нельзя, у неудачного PATCH сеть чаще всего и есть причина сбоя.
 *
 * В отличие от removeVacancyLeadFromCaches, «записи нет по id» здесь недостаточно:
 * присутствие в кэше само по себе означало, что запись уже прошла фильтр этого кэша,
 * а у вставки такой опоры нет. Кэшей одновременно живёт несколько (например, «Скрытые»
 * и обычный список одновременно в staleTime), и снимок с hidden, не подходящим под
 * hidden-фильтр конкретного кэша, вставлять в него нельзя — иначе, например, нескрытая
 * запись при неудачном скрытии осела бы в выборке «Скрытые» до случайного рефетча.
 */
export function insertVacancyLeadIntoCaches(client: QueryClient, lead: VacancyLead): void {
  const caches = client.getQueriesData<VacancyLead[]>({ queryKey: VACANCY_LEADS_QUERY_KEY });

  for (const [queryKey, items] of caches) {
    if (items === undefined || items.some((item) => item.id === lead.id)) {
      continue;
    }

    if (!matchesHiddenFilter(resolveHiddenFilter(queryKey), lead.hidden)) {
      continue;
    }

    // В начало массива — без учёта sort/order этого кэша: восстановленная запись до
    // следующего рефетча может стоять не на своём месте. Осознанный размен, чинить
    // не обязательно — само исправится обновлением с сервера.
    client.setQueryData<VacancyLead[]>(queryKey, [lead, ...items]);
  }
}
