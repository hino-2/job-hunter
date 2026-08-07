import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import { API_GLOBAL_PREFIX, VALIDATION_PIPE_OPTIONS } from './app.constants';
import { BasicAuthGuard } from './auth/basic-auth.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';

/**
 * Единственное место, где настраивается приложение целиком: префикс /api, глобальный
 * ValidationPipe, глобальный Basic Auth guard (§6) и глобальный exception filter (§5.5).
 *
 * Вызывают и main.ts, и фабрика e2e-тестов, поэтому тесты автоматически получают ровно
 * то же поведение, что и продакшен-инстанс. Guard и filter создаются здесь вручную,
 * а не через APP_GUARD/APP_FILTER, чтобы не появилось второе место настройки.
 *
 * ВАЖНО про порядок: app.get() валиден ДО app.init() — инстансы провайдеров создаются
 * внутри NestFactory.create() и внутри compile() тестового модуля. Глобальные guard'ы
 * и фильтры вычитываются из ApplicationConfig уже на резолве роутов внутри init(),
 * поэтому регистрировать их здесь корректно (это же место работает и для setGlobalPrefix).
 */
export function configureApp(app: INestApplication): void {
  const reflector = app.get(Reflector);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  app.useGlobalGuards(new BasicAuthGuard(reflector, configService));
  app.useGlobalFilters(new HttpExceptionFilter());
}
