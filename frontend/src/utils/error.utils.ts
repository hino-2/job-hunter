import axios from 'axios';

import { API_ERROR_MESSAGE_SEPARATOR } from '../constants/api.constants';
import type { ApiErrorBody } from '../types/api.interfaces';

/**
 * Разбор ошибок HTTP по §5.5. Тело ответа — данные извне, поэтому оно приходит как unknown
 * и сужается явными предикатами (§10, п.5): доверять форме ответа нельзя даже своему
 * бэкенду — 502 от nginx или обрыв соединения дадут совсем другое тело или вообще никакого.
 */

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('statusCode' in value) || !('message' in value) || !('error' in value)) {
    return false;
  }

  const { statusCode, message, error } = value;

  return (
    typeof statusCode === 'number' &&
    (typeof message === 'string' || isStringArray(message)) &&
    typeof error === 'string'
  );
}

/**
 * Текст для Snackbar'а. fallback возвращается всегда, когда сервер не объяснил причину:
 * таймаут, обрыв сети, 502 от nginx, HTML вместо JSON.
 *
 * Параметр isAxiosError указан явным unknown: без него дженерик по умолчанию any,
 * и обращение к error.response.data завалило бы сборку на no-unsafe-member-access.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<unknown>(error)) {
    return fallback;
  }

  const body = error.response?.data;

  if (!isApiErrorBody(body)) {
    return fallback;
  }

  const text =
    typeof body.message === 'string'
      ? body.message
      : body.message.join(API_ERROR_MESSAGE_SEPARATOR);

  return text.length > 0 ? text : fallback;
}

/**
 * HTTP-статус ответа, если ошибка вообще пришла от сервера. Нужен там, где severity
 * Snackbar'а зависит от статуса (404 preview §4.4 — штатный исход, а не сбой).
 */
export function extractApiErrorStatus(error: unknown): number | null {
  if (!axios.isAxiosError<unknown>(error)) {
    return null;
  }

  return error.response?.status ?? null;
}
