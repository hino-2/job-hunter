import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { VacancyAiService } from '../vacancy-ai/vacancy-ai.service';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';
import {
  VACANCY_AI_CHECK_FAILED_MESSAGE,
  VACANCY_AI_MODEL_UNAVAILABLE_MESSAGE,
} from './vacancy-search.constants';

/**
 * §4.12.4: разовая проверка доступности модели при старте процесса — только
 * предупреждение в лог, старт `api` она не роняет ни при каком исходе. При
 * ai_enabled = false проверка вообще не идёт в сеть — это гарантия, на которой
 * держится e2e (test/hh-stub.server.ts не поднимает заглушку ollama, а фикстуры
 * настроек по умолчанию выключают ИИ).
 */
@Injectable()
export class VacancyAiCheckService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VacancyAiCheckService.name);

  constructor(
    private readonly settingsService: VacancySearchSettingsService,
    private readonly aiService: VacancyAiService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const settings = await this.settingsService.getSnapshot();

      if (!settings.aiEnabled) {
        return;
      }

      const available = await this.aiService.checkModelAvailable();

      if (!available) {
        this.logger.warn(VACANCY_AI_MODEL_UNAVAILABLE_MESSAGE);
      }
    } catch (error) {
      // Сбой самой проверки (например, БД ещё не готова) — не повод ронять старт процесса.
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`${VACANCY_AI_CHECK_FAILED_MESSAGE}: ${message}`);
    }
  }
}
