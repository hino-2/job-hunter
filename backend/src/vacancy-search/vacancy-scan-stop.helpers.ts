import { SCAN_PAGE_STOP_PRECEDENCE } from './vacancy-search.constants';
import type { ScanStoppedReason } from './vacancy-search.type';

/**
 * §4.11.12: сводит причины остановки, собранные с конкурентных воркеров пула
 * деталей одной страницы (плюс причину планирующего прохода, planPageWork), в
 * одну — по приоритету SCAN_PAGE_STOP_PRECEDENCE (vacancy-search.constants.ts).
 * Если ни одна причина из таблицы приоритета не встретилась, но встретилась
 * какая-то ДРУГАЯ ненулевая причина — она не должна молча потеряться (защита на
 * случай, если в SCAN_STOPPED_REASON добавят значение и забудут вписать его в
 * таблицу), поэтому возвращается первая такая. null — если ВСЕ переданные причины
 * null (страница дообработана целиком, продолжать листать дальше). Чистая функция.
 */
export function resolvePageStop(
  reasons: ReadonlyArray<ScanStoppedReason | null>,
): ScanStoppedReason | null {
  for (const candidate of SCAN_PAGE_STOP_PRECEDENCE) {
    if (reasons.some((reason) => reason === candidate)) {
      return candidate;
    }
  }

  const fallback = reasons.find((reason) => reason !== null);

  return fallback ?? null;
}
