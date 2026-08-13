import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

import {
  BOOLEAN_ENV_VALUES,
  DEFAULT_API_PORT,
  DEFAULT_COMPANY_LOGO_DIR,
  DEFAULT_COMPANY_LOGO_REQUEST_TIMEOUT_MS,
  DEFAULT_DATABASE_PORT,
  DEFAULT_GETMATCH_MAX_RETRIES,
  DEFAULT_GETMATCH_REQUEST_TIMEOUT_MS,
  DEFAULT_GETMATCH_SITE_BASE_URL,
  DEFAULT_GETMATCH_USER_AGENT,
  DEFAULT_HH_MAX_RETRIES,
  DEFAULT_HH_REQUEST_TIMEOUT_MS,
  DEFAULT_HH_SITE_BASE_URL,
  DEFAULT_LOG_LEVEL,
  DEFAULT_NODE_ENV,
  DEFAULT_SCHEDULED_SYNC_ENABLED,
  DEFAULT_SCHEDULED_SYNC_INTERVAL_MS,
  DEFAULT_SYNC_CONCURRENCY,
  DEFAULT_SYNC_MIN_DELAY_MS,
  LOG_LEVELS,
  MAX_RETRIES_MAX,
  NODE_ENVS,
  REQUEST_TIMEOUT_MAX_MS,
  REQUEST_TIMEOUT_MIN_MS,
  SCHEDULED_SYNC_INTERVAL_MAX_MS,
  SCHEDULED_SYNC_INTERVAL_MIN_MS,
  SYNC_CONCURRENCY_MAX,
  SYNC_MIN_DELAY_MAX_MS,
  TCP_PORT_MAX,
  TCP_PORT_MIN,
} from './config.constants';

/**
 * Схема переменных окружения. Проверяется один раз при старте через
 * ConfigModule.forRoot({ validate }). Любая ошибка = падение процесса,
 * чтобы нельзя было случайно поднять инстанс без пароля или без БД.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsIn(NODE_ENVS)
  NODE_ENV: string = DEFAULT_NODE_ENV;

  @IsOptional()
  @IsIn(LOG_LEVELS)
  LOG_LEVEL: string = DEFAULT_LOG_LEVEL;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER!: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TCP_PORT_MIN)
  @Max(TCP_PORT_MAX)
  DATABASE_PORT: number = DEFAULT_DATABASE_PORT;

  @IsString()
  @IsNotEmpty()
  AUTH_USER!: string;

  @IsString()
  @IsNotEmpty({
    message: 'AUTH_PASSWORD обязателен: без него инстанс был бы открыт без авторизации',
  })
  AUTH_PASSWORD!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  HH_SITE_BASE_URL: string = DEFAULT_HH_SITE_BASE_URL;

  @IsString()
  @IsNotEmpty({ message: 'HH_USER_AGENT обязателен: hh.ru отвечает 400 на запросы без него' })
  HH_USER_AGENT!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(REQUEST_TIMEOUT_MIN_MS)
  @Max(REQUEST_TIMEOUT_MAX_MS)
  HH_REQUEST_TIMEOUT_MS: number = DEFAULT_HH_REQUEST_TIMEOUT_MS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RETRIES_MAX)
  HH_MAX_RETRIES: number = DEFAULT_HH_MAX_RETRIES;

  /**
   * §4.9: в отличие от HH_USER_AGENT (обязателен) — все четыре ключа getmatch
   * опциональны с безопасными дефолтами, разведка не обнаружила у getmatch.ru
   * требований к конкретному User-Agent.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  GETMATCH_SITE_BASE_URL: string = DEFAULT_GETMATCH_SITE_BASE_URL;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  GETMATCH_USER_AGENT: string = DEFAULT_GETMATCH_USER_AGENT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(REQUEST_TIMEOUT_MIN_MS)
  @Max(REQUEST_TIMEOUT_MAX_MS)
  GETMATCH_REQUEST_TIMEOUT_MS: number = DEFAULT_GETMATCH_REQUEST_TIMEOUT_MS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_RETRIES_MAX)
  GETMATCH_MAX_RETRIES: number = DEFAULT_GETMATCH_MAX_RETRIES;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SYNC_CONCURRENCY_MAX)
  SYNC_CONCURRENCY: number = DEFAULT_SYNC_CONCURRENCY;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(SYNC_MIN_DELAY_MAX_MS)
  SYNC_MIN_DELAY_MS: number = DEFAULT_SYNC_MIN_DELAY_MS;

  /**
   * §4.7. Строка 'true'/'false', а не boolean: разбор — в ScheduledSyncService,
   * см. комментарий к BOOLEAN_ENV_VALUES.
   */
  @IsOptional()
  @IsIn(BOOLEAN_ENV_VALUES)
  SCHEDULED_SYNC_ENABLED: string = DEFAULT_SCHEDULED_SYNC_ENABLED;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(SCHEDULED_SYNC_INTERVAL_MIN_MS)
  @Max(SCHEDULED_SYNC_INTERVAL_MAX_MS)
  SCHEDULED_SYNC_INTERVAL_MS: number = DEFAULT_SCHEDULED_SYNC_INTERVAL_MS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TCP_PORT_MIN)
  @Max(TCP_PORT_MAX)
  API_PORT: number = DEFAULT_API_PORT;

  /**
   * §4.10. Каталог эфемерный (tmpdir по умолчанию) — docker-volume для него не заводим,
   * пересоздание контейнера самолечится ближайшей синхронизацией.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  COMPANY_LOGO_DIR: string = DEFAULT_COMPANY_LOGO_DIR;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(REQUEST_TIMEOUT_MIN_MS)
  @Max(REQUEST_TIMEOUT_MAX_MS)
  COMPANY_LOGO_REQUEST_TIMEOUT_MS: number = DEFAULT_COMPANY_LOGO_REQUEST_TIMEOUT_MS;
}

export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, raw, {
    exposeDefaultValues: true,
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, { skipMissingProperties: false, whitelist: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join('; '))
      .join('\n  - ');

    throw new Error(`Некорректная конфигурация окружения:\n  - ${details}`);
  }

  return validated;
}
