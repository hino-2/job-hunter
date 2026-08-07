import type { NestApplicationOptions, ValidationPipeOptions } from '@nestjs/common';

export const API_GLOBAL_PREFIX = 'api';

export const BOOTSTRAP_CONTEXT = 'Bootstrap';

/**
 * abortOnError: false — с дефолтным true Nest на любой ошибке инициализации вызывает
 * process.abort(), то есть SIGABRT с возможным core dump, а в дампе лежит весь process.env
 * вместе с AUTH_PASSWORD и POSTGRES_PASSWORD. Вместо этого NestFactory.create отклоняет
 * промис, а main.ts сам логирует причину и выходит с ненулевым кодом.
 */
export const NEST_FACTORY_OPTIONS: NestApplicationOptions = { abortOnError: false };

export const BOOTSTRAP_FAILED_MESSAGE = 'Не удалось запустить Job Hunter API';

export const BOOTSTRAP_FAILURE_EXIT_CODE = 1;

/** Внутри контейнера слушаем все интерфейсы; наружу порт публикует только сервис web. */
export const LISTEN_HOST = '0.0.0.0';

export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  // exposeUnsetFields: false — не создавать в DTO ключи для полей, которых не было
  // в теле запроса. Иначе PATCH не смог бы отличить «поле не передано» от «передан null».
  transformOptions: { exposeUnsetFields: false },
};
