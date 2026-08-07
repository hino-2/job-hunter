import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

import { API_GLOBAL_PREFIX, VALIDATION_PIPE_OPTIONS } from './app.constants';

/**
 * Единственное место, где настраивается приложение целиком: префикс /api,
 * глобальный ValidationPipe, а позже — exception filter и Basic Auth guard.
 *
 * Вызывают и main.ts, и фабрика e2e-тестов, поэтому тесты автоматически
 * получают ровно то же поведение, что и продакшен-инстанс.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
}
