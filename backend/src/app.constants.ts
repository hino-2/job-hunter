import type { ValidationPipeOptions } from '@nestjs/common';

export const API_GLOBAL_PREFIX = 'api';

export const BOOTSTRAP_CONTEXT = 'Bootstrap';

/** Внутри контейнера слушаем все интерфейсы; наружу порт публикует только сервис web. */
export const LISTEN_HOST = '0.0.0.0';

export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
