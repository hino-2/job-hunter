import { STATUS_CODES } from 'node:http';

import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  CLIENT_ERROR_MIN_STATUS,
  EXCEPTION_FILTER_CONTEXT,
  HEADERS_ALREADY_SENT_MESSAGE,
  INTERNAL_SERVER_ERROR_MESSAGE,
  NON_ERROR_THROWN_MESSAGE,
  SERVER_ERROR_MIN_STATUS,
  UNKNOWN_ERROR_TEXT,
} from './common.constants';
import type { ErrorResponse } from './common.interfaces';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

function resolveErrorText(status: number): string {
  return STATUS_CODES[status] ?? UNKNOWN_ERROR_TEXT;
}

/**
 * Тело HttpException пропускается как есть только в разрешённых формах (string / string[]),
 * благодаря чему ValidationPipe сохраняет свой массив сообщений, а ParseUUIDPipe и
 * NotFoundException — свои тексты. Всё остальное отбрасывается: наружу уходят ровно
 * statusCode, message, error, а statusCode всегда берётся из getStatus(), а не из тела.
 */
function buildHttpExceptionResponse(exception: HttpException): ErrorResponse {
  const status = exception.getStatus();
  const raw: unknown = exception.getResponse();

  if (typeof raw === 'string') {
    return { statusCode: status, message: raw, error: resolveErrorText(status) };
  }

  if (isRecord(raw)) {
    const rawMessage = raw.message;
    const rawError = raw.error;
    const message =
      typeof rawMessage === 'string' || isStringArray(rawMessage) ? rawMessage : exception.message;

    return {
      statusCode: status,
      message,
      error: typeof rawError === 'string' ? rawError : resolveErrorText(status),
    };
  }

  return { statusCode: status, message: exception.message, error: resolveErrorText(status) };
}

/**
 * Распознаёт форму библиотеки http-errors: числовой statusCode на объекте, который при этом
 * не является HttpException. Так бросается express.json(), который Nest регистрирует сам:
 * PayloadTooLargeError (413, тело больше дефолтного лимита 100kb) и UnsupportedMediaTypeError
 * (415, неизвестный charset).
 *
 * Без этой ветки они превращались бы в 500 — причём доступный анониму, потому что тело
 * парсится ДО guard'ов: каждый такой запрос писал бы в лог строку уровня error со стеком,
 * то есть позволял бесплатно надувать логи. Ровно это же место в Nest закрывает
 * BaseExceptionFilter.handleUnknownError.
 *
 * Возвращаем только 4xx: ошибку с 5xx-статусом отдаёт обезличенная общая ветка. Текст самой
 * ошибки наружу не пропускаем — только стандартную расшифровку кода из http.STATUS_CODES.
 */
function resolveClientErrorStatus(exception: unknown): number | null {
  if (!isRecord(exception)) {
    return null;
  }

  const status = exception.statusCode;

  if (
    typeof status !== 'number' ||
    status < CLIENT_ERROR_MIN_STATUS ||
    status >= SERVER_ERROR_MIN_STATUS
  ) {
    return null;
  }

  return status;
}

/**
 * Приводит любое брошенное значение к трём полям §5.5. Total-функция: ветки без return нет,
 * поэтому не бывает ситуации, когда исключение утекло бы наружу как 200.
 */
function buildErrorResponse(exception: unknown): ErrorResponse {
  if (exception instanceof HttpException) {
    return buildHttpExceptionResponse(exception);
  }

  const clientErrorStatus = resolveClientErrorStatus(exception);

  if (clientErrorStatus !== null) {
    const errorText = resolveErrorText(clientErrorStatus);

    return { statusCode: clientErrorStatus, message: errorText, error: errorText };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: INTERNAL_SERVER_ERROR_MESSAGE,
    error: resolveErrorText(HttpStatus.INTERNAL_SERVER_ERROR),
  };
}

/**
 * Глобальный exception filter (§5.5): единый формат тела ошибки, стек — только в лог.
 *
 * @Catch() без аргументов ловит вообще всё, включая QueryFailedError и TypeError.
 *
 * Ответ отправляется через response.status().json(), а НЕ через writeHead / response.set()
 * с полной заменой заголовков: иначе затёрся бы WWW-Authenticate, который BasicAuthGuard
 * успевает поставить до throw.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter<unknown> {
  private readonly logger = new Logger(EXCEPTION_FILTER_CONTEXT);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const payload = buildErrorResponse(exception);

    this.logException(exception, request, payload.statusCode);

    // Отправка ответа уже началась (@Res(), стрим, интерсептор): менять статус и тело нельзя.
    // Попытка дала бы ERR_HTTP_HEADERS_SENT внутри самого фильтра — тело §5.5 всё равно
    // потерялось бы, зато в логе появилась бы вторая, вводящая в заблуждение запись.
    if (response.headersSent) {
      this.logger.warn(`${HEADERS_ALREADY_SENT_MESSAGE}: ${request.method} ${request.url}`);
      response.end();

      return;
    }

    response.status(payload.statusCode).json(payload);
  }

  /**
   * В лог идут только метод, путь и статус. Ни headers (там Authorization),
   * ни body (там пользовательские данные) не логируются никогда.
   */
  private logException(exception: unknown, request: Request, status: number): void {
    const location = `${request.method} ${request.url} → ${status}`;

    if (status >= SERVER_ERROR_MIN_STATUS) {
      // String(exception) на unknown запрещён правилом no-base-to-string, да и бесполезен.
      const stack =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : NON_ERROR_THROWN_MESSAGE;

      this.logger.error(location, stack);

      return;
    }

    this.logger.debug(location);
  }
}
