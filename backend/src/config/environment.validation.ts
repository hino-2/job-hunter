import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
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
  DEFAULT_HH_MAX_REQUESTS_PER_SECOND,
  DEFAULT_HH_MAX_RETRIES,
  DEFAULT_HH_REQUEST_TIMEOUT_MS,
  DEFAULT_HH_SITE_BASE_URL,
  DEFAULT_LOG_LEVEL,
  DEFAULT_NODE_ENV,
  DEFAULT_SCHEDULED_SYNC_ENABLED,
  DEFAULT_SCHEDULED_SYNC_INTERVAL_MS,
  DEFAULT_SYNC_CONCURRENCY,
  DEFAULT_SYNC_MIN_DELAY_MS,
  DEFAULT_VACANCY_AI_BASE_URL,
  DEFAULT_VACANCY_AI_BATCH_SIZE,
  DEFAULT_VACANCY_AI_DESCRIPTION_MAX_CHARS,
  DEFAULT_VACANCY_AI_MODEL,
  DEFAULT_VACANCY_AI_PROVIDER,
  DEFAULT_VACANCY_AI_TIMEOUT_MS,
  DEFAULT_VACANCY_LEADS_LIST_LIMIT,
  DEFAULT_VACANCY_MATCH_MODE,
  DEFAULT_VACANCY_PREFILTER_MODE,
  DEFAULT_VACANCY_SCAN_MAX_AGE_DAYS,
  DEFAULT_VACANCY_SCAN_MAX_DETAILS,
  DEFAULT_VACANCY_SCAN_MAX_DURATION_MS,
  DEFAULT_VACANCY_SCAN_MAX_PAGES,
  HH_MAX_REQUESTS_PER_SECOND_MAX,
  HH_MAX_REQUESTS_PER_SECOND_MIN,
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
  VACANCY_AI_PROVIDERS,
  VACANCY_MATCH_MODES,
  VACANCY_PREFILTER_MODES,
  VACANCY_SCAN_MAX_PAGES_MAX,
  VACANCY_SCAN_MAX_PAGES_MIN,
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
   * §4.10. Дефолт (tmpdir) рассчитан на дев-режим, где приложение работает прямо на хосте.
   * В Docker переменная указывает на именованный том logos — иначе файлы пропадали бы
   * при каждом пересоздании контейнера.
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

  /**
   * §4.11.2. Диапазон §8 проверяется целиком: значение выше 50 — это уже не троттл,
   * а его отсутствие, и попасть туда опечаткой в .env нельзя (см. комментарий
   * к HH_MAX_REQUESTS_PER_SECOND_MIN в config.constants.ts).
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(HH_MAX_REQUESTS_PER_SECOND_MIN)
  @Max(HH_MAX_REQUESTS_PER_SECOND_MAX)
  HH_MAX_REQUESTS_PER_SECOND: number = DEFAULT_HH_MAX_REQUESTS_PER_SECOND;

  /** §4.11.8: бюджеты одного прогона поиска (§4.11). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(VACANCY_SCAN_MAX_PAGES_MIN)
  @Max(VACANCY_SCAN_MAX_PAGES_MAX)
  VACANCY_SCAN_MAX_PAGES: number = DEFAULT_VACANCY_SCAN_MAX_PAGES;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_SCAN_MAX_DETAILS: number = DEFAULT_VACANCY_SCAN_MAX_DETAILS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_SCAN_MAX_AGE_DAYS: number = DEFAULT_VACANCY_SCAN_MAX_AGE_DAYS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_SCAN_MAX_DURATION_MS: number = DEFAULT_VACANCY_SCAN_MAX_DURATION_MS;

  /** §4.11.4: что проверяется детерминированно до/вместо ИИ. */
  @IsOptional()
  @IsIn(VACANCY_PREFILTER_MODES)
  VACANCY_PREFILTER_MODE: string = DEFAULT_VACANCY_PREFILTER_MODE;

  @IsOptional()
  @IsIn(VACANCY_MATCH_MODES)
  VACANCY_MATCH_MODE: string = DEFAULT_VACANCY_MATCH_MODE;

  /** §5.7: предохранитель ответа GET /api/vacancy-leads, а не пагинация. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_LEADS_LIST_LIMIT: number = DEFAULT_VACANCY_LEADS_LIST_LIMIT;

  /** §4.12.1: протокол общения с моделью. */
  @IsOptional()
  @IsIn(VACANCY_AI_PROVIDERS)
  VACANCY_AI_PROVIDER: string = DEFAULT_VACANCY_AI_PROVIDER;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  VACANCY_AI_BASE_URL: string = DEFAULT_VACANCY_AI_BASE_URL;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  VACANCY_AI_MODEL: string = DEFAULT_VACANCY_AI_MODEL;

  /**
   * §8: обязателен только при VACANCY_AI_PROVIDER=openai — для дефолтного ollama
   * ключ не нужен вовсе, поэтому проверка условная, а не сквозной @IsNotEmpty.
   */
  @ValidateIf((env: EnvironmentVariables) => env.VACANCY_AI_PROVIDER === 'openai')
  @IsString()
  @IsNotEmpty({
    message: 'VACANCY_AI_API_KEY обязателен при VACANCY_AI_PROVIDER=openai',
  })
  VACANCY_AI_API_KEY?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_AI_BATCH_SIZE: number = DEFAULT_VACANCY_AI_BATCH_SIZE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_AI_TIMEOUT_MS: number = DEFAULT_VACANCY_AI_TIMEOUT_MS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  VACANCY_AI_DESCRIPTION_MAX_CHARS: number = DEFAULT_VACANCY_AI_DESCRIPTION_MAX_CHARS;
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
