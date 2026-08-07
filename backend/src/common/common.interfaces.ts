/**
 * Единый формат тела ошибки (§5.5). Его отдают штатные HttpException'ы NestJS,
 * его же обязан сохранить глобальный exception filter.
 */
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}
