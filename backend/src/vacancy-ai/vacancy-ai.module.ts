import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildVacancyAiHttpOptions } from './vacancy-ai-http-options.factory';
import { VACANCY_AI_PROVIDER_TOKEN } from './vacancy-ai.constants';
import { VacancyAiService } from './vacancy-ai.service';
import { buildVacancyAiProvider } from './vacancy-ai.provider.factory';

/**
 * §4.12: адаптер к локальной модели (Ollama) и к OpenAI-совместимым API. TypeORM
 * здесь не нужен — модуль ничего не знает о БД, конвейер отбора (vacancy-search/,
 * шаг B7) сам решает, что писать в vacancy_leads по результату VacancyAiService.
 *
 * HttpModule.registerAsync — один HttpService на оба протокола (общие baseURL/таймаут
 * из VACANCY_AI_BASE_URL/VACANCY_AI_TIMEOUT_MS), как HhModule для источников вакансий.
 * Провайдер по токену собирает vacancy-ai.provider.factory.ts — единственное место,
 * решающее, Ollama это или OpenAI (VACANCY_AI_PROVIDER).
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: buildVacancyAiHttpOptions,
    }),
  ],
  providers: [
    {
      provide: VACANCY_AI_PROVIDER_TOKEN,
      inject: [HttpService, ConfigService],
      useFactory: buildVacancyAiProvider,
    },
    VacancyAiService,
  ],
  exports: [VacancyAiService],
})
export class VacancyAiModule {}
