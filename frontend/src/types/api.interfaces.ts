/**
 * Тело ошибки любого эндпоинта (§5.5). Единый формат даёт глобальный exception filter
 * бэкенда, поэтому разбирать ответ достаточно в одном месте (utils/error.utils.ts).
 *
 * message — строка либо массив строк: массив приходит от ValidationPipe, по строке
 * на каждое нарушенное правило.
 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}
