import type { ConcurrencyOptions } from './common.interfaces';

/**
 * Пауза в промисе. Нужна ретраям hh-клиента (§4.6) и массовой синхронизации,
 * которой предписан минимальный интервал между запросами.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Прогоняет worker по всем items с ограничениями §4.6: одновременно не более
 * options.concurrency вызовов, между СТАРТАМИ соседних вызовов — не менее
 * options.minStartDelayMs.
 *
 * Контракт:
 * - порядок результатов совпадает с порядком items;
 * - ошибки не глушатся: реджект worker'а реджектит весь вызов, ловит вызывающий
 *   (массовой синхронизации нужен свой исход на запись, а не общий провал);
 * - отмены при этом нет: остальные воркеры продолжают разбирать очередь в фоне, а их
 *   результаты выбрасываются вместе с отклонённым промисом. Поэтому вызывающий обязан
 *   ловить ошибки внутри самого worker'а, если прогон должен доходить до конца;
 * - пустой массив даёт пустой результат, concurrency больше длины не вешает прогон.
 *
 * Индексы берутся из общего итератора, а не из счётчика с items[i]: при
 * noUncheckedIndexedAccess элемент по индексу имел бы тип TItem | undefined,
 * а `!` и `as` в проекте запрещены.
 */
export async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  options: ConcurrencyOptions,
  worker: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  const queue = items.entries();
  const workerCount = Math.min(options.concurrency, items.length);
  // Момент, раньше которого стартовать следующей задаче нельзя.
  let nextStartAt = 0;

  const runWorker = async (): Promise<void> => {
    for (;;) {
      const next = queue.next();

      if (next.done === true) {
        return;
      }

      const [index, item] = next.value;
      const startAt = Math.max(nextStartAt, Date.now());

      // Слот времени резервируется СИНХРОННО, до первого await: иначе все воркеры
      // прочитали бы один и тот же nextStartAt и ушли бы в hh.ru одновременно.
      nextStartAt = startAt + options.minStartDelayMs;

      const wait = startAt - Date.now();

      if (wait > 0) {
        await delay(wait);
      }

      results[index] = await worker(item);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}
