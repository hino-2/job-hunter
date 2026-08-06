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
  DEFAULT_API_PORT,
  DEFAULT_DATABASE_PORT,
  DEFAULT_HH_API_BASE_URL,
  DEFAULT_HH_MAX_RETRIES,
  DEFAULT_HH_REQUEST_TIMEOUT_MS,
  DEFAULT_HH_SYNC_CONCURRENCY,
  DEFAULT_HH_SYNC_MIN_DELAY_MS,
  DEFAULT_LOG_LEVEL,
  DEFAULT_NODE_ENV,
  HH_MAX_RETRIES_MAX,
  HH_REQUEST_TIMEOUT_MAX_MS,
  HH_REQUEST_TIMEOUT_MIN_MS,
  HH_SYNC_CONCURRENCY_MAX,
  HH_SYNC_MIN_DELAY_MAX_MS,
  LOG_LEVELS,
  NODE_ENVS,
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
  HH_API_BASE_URL: string = DEFAULT_HH_API_BASE_URL;

  @IsString()
  @IsNotEmpty({ message: 'HH_USER_AGENT обязателен: hh.ru отвечает 400 на запросы без него' })
  HH_USER_AGENT!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(HH_REQUEST_TIMEOUT_MIN_MS)
  @Max(HH_REQUEST_TIMEOUT_MAX_MS)
  HH_REQUEST_TIMEOUT_MS: number = DEFAULT_HH_REQUEST_TIMEOUT_MS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(HH_MAX_RETRIES_MAX)
  HH_MAX_RETRIES: number = DEFAULT_HH_MAX_RETRIES;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HH_SYNC_CONCURRENCY_MAX)
  HH_SYNC_CONCURRENCY: number = DEFAULT_HH_SYNC_CONCURRENCY;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(HH_SYNC_MIN_DELAY_MAX_MS)
  HH_SYNC_MIN_DELAY_MS: number = DEFAULT_HH_SYNC_MIN_DELAY_MS;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(TCP_PORT_MIN)
  @Max(TCP_PORT_MAX)
  API_PORT: number = DEFAULT_API_PORT;
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
