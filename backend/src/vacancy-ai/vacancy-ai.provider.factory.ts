import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { OllamaAiProvider } from './ollama-ai.provider';
import { OpenAiAiProvider } from './openai-ai.provider';
import { VACANCY_AI_PROVIDER, VACANCY_AI_PROVIDER_ENV_KEY } from './vacancy-ai.constants';
import type { AiProvider } from './vacancy-ai.interfaces';

/**
 * §4.12.1: собирает адаптер под VACANCY_AI_PROVIDER — единственное место, знающее
 * о существовании обоих протоколов. Оба адаптера используют один и тот же
 * HttpService (VacancyAiModule.HttpModule.registerAsync, общий baseURL/таймаут):
 * OpenAiAiProvider лишь добавляет заголовок Authorization на каждый свой запрос.
 */
export function buildVacancyAiProvider(
  http: HttpService,
  configService: ConfigService,
): AiProvider {
  const provider = configService.getOrThrow<string>(VACANCY_AI_PROVIDER_ENV_KEY);

  if (provider === VACANCY_AI_PROVIDER.OPENAI) {
    return new OpenAiAiProvider(http, configService);
  }

  return new OllamaAiProvider(http);
}
