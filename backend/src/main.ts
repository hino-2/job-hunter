import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import {
  API_GLOBAL_PREFIX,
  BOOTSTRAP_CONTEXT,
  BOOTSTRAP_FAILED_MESSAGE,
  BOOTSTRAP_FAILURE_EXIT_CODE,
  LISTEN_HOST,
  NEST_FACTORY_OPTIONS,
} from './app.constants';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { NON_ERROR_THROWN_MESSAGE } from './common/common.constants';
import { DEFAULT_API_PORT } from './config/config.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, NEST_FACTORY_OPTIONS);
  const logger = new Logger(BOOTSTRAP_CONTEXT);
  const port = Number(process.env.API_PORT ?? DEFAULT_API_PORT);

  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(port, LISTEN_HOST);

  logger.log(`Job Hunter API слушает порт ${port}, префикс /${API_GLOBAL_PREFIX}`);
}

/**
 * Обработчик обязателен вместе с NEST_FACTORY_OPTIONS: с abortOnError: false ошибка
 * инициализации приходит сюда отказом промиса, а не process.abort(). Причина уходит в лог
 * (её видно в `docker compose logs api`), процесс завершается ненулевым кодом — контейнер
 * честно падает, а не поднимается наполовину живым.
 */
bootstrap().catch((error: unknown) => {
  const logger = new Logger(BOOTSTRAP_CONTEXT);
  const details =
    error instanceof Error ? (error.stack ?? error.message) : NON_ERROR_THROWN_MESSAGE;

  logger.error(BOOTSTRAP_FAILED_MESSAGE, details);
  // Именно exit, а не process.exitCode: до падения могли открыться хендлы (пул pg),
  // и без явного выхода процесс завис бы вместо завершения.
  process.exit(BOOTSTRAP_FAILURE_EXIT_CODE);
});
