import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { NON_ERROR_THROWN_MESSAGE } from '../common/common.constants';
import { TRUE_ENV_VALUE } from '../config/config.constants';
import { VacancySyncService } from '../vacancies/vacancy-sync.service';
import {
  MS_IN_MINUTE,
  SCHEDULED_SYNC_DISABLED_MESSAGE,
  SCHEDULED_SYNC_ENABLED_ENV_KEY,
  SCHEDULED_SYNC_ENABLED_MESSAGE,
  SCHEDULED_SYNC_FAILED_MESSAGE,
  SCHEDULED_SYNC_INTERVAL_MS_ENV_KEY,
  SCHEDULED_SYNC_INTERVAL_NAME,
  SCHEDULED_SYNC_OVERLAP_MESSAGE,
  SCHEDULED_SYNC_TICK_MESSAGE,
} from './scheduler.constants';

/**
 * §4.7: тот же прогон, что у `POST /api/applications/sync-open`, но по расписанию
 * внутри процесса `api`. VacancySyncService, SchedulerRegistry и ConfigService
 * импортируются как значения — это требует emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class ScheduledSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduledSyncService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;
  private isRunning = false;

  constructor(
    private readonly vacancySyncService: VacancySyncService,
    private readonly schedulerRegistry: SchedulerRegistry,
    configService: ConfigService,
  ) {
    // Сравнение со строкой намеренное: любая неожиданность даёт false (выключено),
    // а не «молча включено».
    this.enabled =
      configService.getOrThrow<string>(SCHEDULED_SYNC_ENABLED_ENV_KEY) === TRUE_ENV_VALUE;
    this.intervalMs = configService.getOrThrow<number>(SCHEDULED_SYNC_INTERVAL_MS_ENV_KEY);
  }

  /**
   * onApplicationBootstrap, а не onModuleInit: к этой фазе уже подняты все модули,
   * включая БД, — та же фаза, в которой монтирует свои задачи сам SchedulerOrchestrator.
   *
   * Первого прогона при старте нет намеренно: рестарт-петля (restart: unless-stopped)
   * превратилась бы в серию полных прогонов по чужим источникам, а долгий прогон
   * конкурировал бы с прогревом и healthcheck.
   */
  onApplicationBootstrap(): void {
    if (!this.enabled) {
      this.logger.log(SCHEDULED_SYNC_DISABLED_MESSAGE);

      return;
    }

    const interval = setInterval(() => {
      // void: колбэк setInterval синхронный, необработанный реджект уронил бы процесс
      // (Node 22, --unhandled-rejections=throw по умолчанию). Ошибки гасит runScheduledSync.
      void this.runScheduledSync();
    }, this.intervalMs);

    this.schedulerRegistry.addInterval(SCHEDULED_SYNC_INTERVAL_NAME, interval);

    this.logger.log(`${SCHEDULED_SYNC_ENABLED_MESSAGE} ${this.intervalMs / MS_IN_MINUTE} мин`);
  }

  private async runScheduledSync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(SCHEDULED_SYNC_OVERLAP_MESSAGE);

      return;
    }

    this.isRunning = true;
    this.logger.debug(SCHEDULED_SYNC_TICK_MESSAGE);

    try {
      // Сводку прогона не логируем — её уже пишет VacancySyncService.syncOpen(),
      // дубль был бы шумом.
      await this.vacancySyncService.syncOpen();
    } catch (error) {
      const details =
        error instanceof Error ? (error.stack ?? error.message) : NON_ERROR_THROWN_MESSAGE;

      this.logger.error(SCHEDULED_SYNC_FAILED_MESSAGE, details);
    } finally {
      // Обязателен: без него единственное исключение навсегда заклинило бы флаг.
      this.isRunning = false;
    }
  }
}
