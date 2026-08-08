/**
 * Единый формат тела ошибки (§5.5). Его отдают штатные HttpException'ы NestJS,
 * его же обязан сохранить глобальный exception filter.
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

/**
 * Параметры массового прогона (§4.6): потолок одновременно работающих задач и
 * минимальная пауза между их стартами.
 */
export interface ConcurrencyOptions {
  concurrency: number;
  minStartDelayMs: number;
}
