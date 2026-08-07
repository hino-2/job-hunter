/**
 * Пауза в промисе. Нужна ретраям hh-клиента (§4.6) и понадобится массовой
 * синхронизации, которой предписан минимальный интервал между запросами.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
