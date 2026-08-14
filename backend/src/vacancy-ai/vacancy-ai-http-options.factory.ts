import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { VACANCY_AI_BASE_URL_ENV_KEY, VACANCY_AI_TIMEOUT_MS_ENV_KEY } from './vacancy-ai.constants';

/**
 * §4.12: validateStatus всегда true — ветвление по HTTP-статусу живёт в адаптерах
 * (ollama-ai.provider.ts / openai-ai.provider.ts), а catch остаётся ровно транспортом
 * (таймаут, DNS, отказ в соединении), тот же приём, что у vacancy-http-options.factory.ts.
 * responseType не переопределяется: тело — JSON, дефолтный парсинг axios подходит.
 */
function acceptAnyStatus(): boolean {
  return true;
}

export function buildVacancyAiHttpOptions(configService: ConfigService): HttpModuleOptions {
  return {
    baseURL: configService.getOrThrow<string>(VACANCY_AI_BASE_URL_ENV_KEY),
    timeout: configService.getOrThrow<number>(VACANCY_AI_TIMEOUT_MS_ENV_KEY),
    validateStatus: acceptAnyStatus,
  };
}
