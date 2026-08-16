import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Application } from '../applications/application.entity';
import {
  APPLICATION_NOT_FOUND_MESSAGE,
  APPLICATION_ORDER_DIRECTIONS,
  APPLICATION_STATUS,
  SYNC_OUTCOME,
} from '../applications/applications.constants';
import type {
  ApplicationSyncResult,
  ApplicationsSyncSummary,
} from '../applications/applications.interfaces';
import type {
  ApplicationSyncPatch,
  ApplicationSyncSnapshot,
  SyncOutcomeCounts,
} from '../applications/applications.type';
import { mapWithConcurrency } from '../common/async.helpers';
import { describeErrorReason } from './vacancy-error.helpers';
import { VacancyLogoService } from './vacancy-logo.service';
import { normalizeVacancyPosition } from './vacancy-position.helpers';
import { VacancyProviderRegistry } from './vacancy-provider.registry';
import {
  SYNC_CONCURRENCY_ENV_KEY,
  SYNC_FINISHED_MESSAGE,
  SYNC_MIN_DELAY_MS_ENV_KEY,
  SYNC_STARTED_MESSAGE,
  SYNC_UNEXPECTED_ERROR_MESSAGE,
  VACANCY_SKIPPED_UNSUPPORTED_MESSAGE,
  VACANCY_UNKNOWN_SOURCE_MESSAGE,
} from './vacancies.constants';
import type { VacancySyncDecision } from './vacancies.interfaces';
import type { VacancyFetchResult } from './vacancies.type';

/** Нули по всем пяти исходам §4.5: сводка обязана содержать каждый ключ, даже пустой. */
function createEmptyCounts(): SyncOutcomeCounts {
  return {
    [SYNC_OUTCOME.OK]: 0,
    [SYNC_OUTCOME.NOT_FOUND]: 0,
    [SYNC_OUTCOME.SKIPPED_UNSUPPORTED]: 0,
    [SYNC_OUTCOME.RATE_LIMITED]: 0,
    [SYNC_OUTCOME.ERROR]: 0,
  };
}

/**
 * У записи нет источника/внешнего ID, либо источник неизвестен этой версии кода:
 * запрос не делаем, доменные поля не трогаем (§4.5).
 */
function buildSkippedDecision(message: string): VacancySyncDecision {
  return {
    patch: {
      lastSyncOutcome: SYNC_OUTCOME.SKIPPED_UNSUPPORTED,
      lastSyncError: message,
    },
    outcome: SYNC_OUTCOME.SKIPPED_UNSUPPORTED,
    message,
  };
}

/**
 * Правила §4.3 в чистом виде — единственное место, где решается, что писать в запись.
 *
 * Ключевые инварианты: company и result не участвуют вовсе; position перезаписывается
 * только при OK и только непустым нормализованным заголовком источника — пустой или
 * отсутствующий заголовок ручную правку пользователя не трогает; при живой вакансии
 * status не трогается (вручную закрытая запись не открывается заново); last_synced_at
 * обновляется только когда ответ от источника реально получен (OK и NOT_FOUND),
 * а при RATE_LIMITED/ERROR остаётся временем последней успешной синхронизации.
 *
 * logoFile (§4.10) уже вычислен вызывающим (resolveLogoFile) — эта функция только
 * решает, попадёт ли он в патч. undefined, а не null: null в патче означал бы
 * «записать NULL» и затёр бы уже сохранённый логотип, если источник в этот раз
 * логотипа не дал (то же правило, что у position).
 */
function buildFetchedDecision(
  fetched: VacancyFetchResult,
  logoFile: string | undefined,
): VacancySyncDecision {
  if (fetched.outcome === SYNC_OUTCOME.OK) {
    const { vacancy } = fetched;
    const patch: ApplicationSyncPatch = {
      vacancyArchived: vacancy.archived,
      lastSyncedAt: new Date(),
      lastSyncOutcome: SYNC_OUTCOME.OK,
      lastSyncError: null,
    };

    // §4.3: снятая вакансия закрывает и запись. Обратного перехода нет — в ветке
    // живой вакансии status не появляется ни при каких условиях.
    if (vacancy.archived) {
      patch.status = APPLICATION_STATUS.CLOSED;
    }

    const position = normalizeVacancyPosition(vacancy.name);

    // Условный ключ, а не безусловная запись: null в патче означал бы «записать
    // NULL» и затёр бы должность, введённую пользователем вручную.
    if (position !== null) {
      patch.position = position;
    }

    // Условный ключ по тому же принципу, что у position (§4.10): отсутствие ключа
    // означает «колонку не трогать».
    if (logoFile !== undefined) {
      patch.companyLogoFile = logoFile;
    }

    return { patch, outcome: SYNC_OUTCOME.OK, message: null };
  }

  if (fetched.outcome === SYNC_OUTCOME.NOT_FOUND) {
    // §4.3: вакансию сняли или удалили — штатный исход. vacancy_archived не трогаем:
    // данных о вакансии источник нам не отдал.
    return {
      patch: {
        status: APPLICATION_STATUS.CLOSED,
        lastSyncedAt: new Date(),
        lastSyncOutcome: SYNC_OUTCOME.NOT_FOUND,
        lastSyncError: fetched.message,
      },
      outcome: SYNC_OUTCOME.NOT_FOUND,
      message: fetched.message,
    };
  }

  // RATE_LIMITED и ERROR: о вакансии мы ничего не узнали, поэтому фиксируем только
  // сам факт неудачи.
  return {
    patch: { lastSyncOutcome: fetched.outcome, lastSyncError: fetched.message },
    outcome: fetched.outcome,
    message: fetched.message,
  };
}

function summarize(results: ApplicationSyncResult[]): ApplicationsSyncSummary {
  const counts = createEmptyCounts();
  let closed = 0;

  for (const result of results) {
    counts[result.outcome] += 1;

    if (result.closed) {
      closed += 1;
    }
  }

  return { total: results.length, counts, closed, results };
}

function describeCounts(counts: SyncOutcomeCounts): string {
  return Object.entries(counts)
    .map(([outcome, count]) => `${outcome}=${count}`)
    .join(', ');
}

/**
 * Значения sync-колонок ДО применения патча. Снимаются перед Object.assign, чтобы
 * откатить сущность, если save() не прошёл.
 */
function takeSyncSnapshot(application: Application): ApplicationSyncSnapshot {
  return {
    position: application.position,
    status: application.status,
    vacancyArchived: application.vacancyArchived,
    companyLogoFile: application.companyLogoFile,
    lastSyncedAt: application.lastSyncedAt,
    lastSyncOutcome: application.lastSyncOutcome,
    lastSyncError: application.lastSyncError,
  };
}

/**
 * Применение результатов источника вакансии к записям (§4.3) и массовый прогон
 * по §4.6. Единственное место, где вычисляются колонки last_sync_*.
 *
 * Переезд hh/hh-sync.service.ts (шаг B2): диспетчеризация по source теперь идёт
 * через VacancyProviderRegistry, а не напрямую через HhApiService.
 *
 * Репозиторием сервис владеет сам, а не ходит в ApplicationsService: иначе
 * VacanciesModule пришлось бы импортировать ApplicationsModule, который сам
 * импортирует VacanciesModule ради этого сервиса, — то есть цикл модулей и
 * forwardRef. Цена — дублирование findOneBy с NotFoundException; она принята
 * сознательно (наследуется от прежнего решения для hh-sync.service.ts).
 *
 * §4.10 «качать логотип или нет» этот класс больше не решает сам — правило переехало
 * в VacancyLogoService (resolveLogoFile), общий с create-путём (§4.4); здесь остаётся
 * только вызов и запись результата в патч по правилам §4.3.
 *
 * Repository, Application и ConfigService импортируются как значения: этого
 * требует emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class VacancySyncService {
  private readonly logger = new Logger(VacancySyncService.name);
  private readonly concurrency: number;
  private readonly minStartDelayMs: number;

  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly registry: VacancyProviderRegistry,
    private readonly vacancyLogos: VacancyLogoService,
    configService: ConfigService,
  ) {
    this.concurrency = configService.getOrThrow<number>(SYNC_CONCURRENCY_ENV_KEY);
    this.minStartDelayMs = configService.getOrThrow<number>(SYNC_MIN_DELAY_MS_ENV_KEY);
  }

  /** §5.2 POST /api/applications/:id/sync. Единственное исключение наружу — 404 «нет записи». */
  async syncById(id: string): Promise<ApplicationSyncResult> {
    const application = await this.applications.findOneBy({ id });

    if (application === null) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }

    return this.syncOne(application);
  }

  /** §5.2 POST /api/applications/sync-open: все записи со status = OPEN, прочие не трогаем. */
  async syncOpen(): Promise<ApplicationsSyncSummary> {
    const applications = await this.applications.find({
      where: { status: APPLICATION_STATUS.OPEN },
      order: {
        createdAt: APPLICATION_ORDER_DIRECTIONS.asc,
        id: APPLICATION_ORDER_DIRECTIONS.asc,
      },
    });

    if (applications.length === 0) {
      return summarize([]);
    }

    this.logger.log(`${SYNC_STARTED_MESSAGE}: ${applications.length}`);

    const results = await mapWithConcurrency(
      applications,
      { concurrency: this.concurrency, minStartDelayMs: this.minStartDelayMs },
      (application) => this.syncOneSafely(application),
    );
    const summary = summarize(results);

    this.logger.log(
      `${SYNC_FINISHED_MESSAGE}: обработано ${summary.total},` +
        ` закрыто ${summary.closed}, исходы ${describeCounts(summary.counts)}`,
    );

    return summary;
  }

  /**
   * Обёртка для массового прогона: ошибка одной записи (например, отказ БД при save)
   * не должна срывать остальные (§4.6).
   *
   * Повторно сохранять исход в БД здесь нельзя — если упало именно сохранение, вторая
   * попытка упадёт так же. Поэтому такая запись остаётся в БД нетронутой: ERROR виден
   * только в ответе, в last_sync_outcome он не попадает. Сущность к этому моменту уже
   * откачена в syncOne, иначе в applications[] уехало бы состояние, которого в БД нет.
   *
   * Наружу отдаётся обобщённый текст, а подробности (сообщение драйвера с SQL и
   * параметрами) уходят только в лог — так же, как это делает фильтр ошибок с 500-ми (§5.5).
   */
  private async syncOneSafely(application: Application): Promise<ApplicationSyncResult> {
    try {
      return await this.syncOne(application);
    } catch (error) {
      this.logger.warn(
        `Запись ${application.id} (${application.company}):` +
          ` ${SYNC_UNEXPECTED_ERROR_MESSAGE} — ${describeErrorReason(error)}`,
      );

      return {
        application,
        outcome: SYNC_OUTCOME.ERROR,
        message: SYNC_UNEXPECTED_ERROR_MESSAGE,
        closed: false,
      };
    }
  }

  private async syncOne(application: Application): Promise<ApplicationSyncResult> {
    const decision = await this.decide(application);
    // Снимаем статус ДО патча: closed в сводке — это именно переход OPEN → CLOSED
    // в текущем прогоне, а не «запись сейчас закрыта».
    const wasOpen = application.status === APPLICATION_STATUS.OPEN;
    const snapshot = takeSyncSnapshot(application);

    Object.assign(application, decision.patch);

    try {
      await this.applications.save(application);
    } catch (error) {
      // В БД не записалось ничего, а сущность уже замутирована патчем. Без отката
      // вызывающий отдал бы её в ответе как сохранённую («Обновлено» и свежее время
      // синхронизации при фактическом ERROR).
      Object.assign(application, snapshot);

      throw error;
    }

    const closed = wasOpen && application.status === APPLICATION_STATUS.CLOSED;

    // Логируем только сбои: OK, NOT_FOUND и SKIPPED_UNSUPPORTED — штатные исходы (§4.5).
    // RATE_LIMITED и ERROR всегда приходят с текстом, но проверка на null нужна ещё и
    // затем, чтобы сузить тип message для шаблона.
    if (
      decision.message !== null &&
      (decision.outcome === SYNC_OUTCOME.RATE_LIMITED || decision.outcome === SYNC_OUTCOME.ERROR)
    ) {
      this.logger.warn(
        `Запись ${application.id} (${application.company}):` +
          ` ${decision.outcome} — ${decision.message}`,
      );
    }

    return { application, outcome: decision.outcome, message: decision.message, closed };
  }

  private async decide(application: Application): Promise<VacancySyncDecision> {
    const { vacancySource, vacancyExternalId } = application;

    if (vacancySource === null || vacancyExternalId === null) {
      return buildSkippedDecision(VACANCY_SKIPPED_UNSUPPORTED_MESSAGE);
    }

    const provider = this.registry.find(vacancySource);

    if (provider === null) {
      return buildSkippedDecision(VACANCY_UNKNOWN_SOURCE_MESSAGE);
    }

    const fetched = await provider.fetchVacancy(vacancyExternalId);

    return buildFetchedDecision(
      fetched,
      await this.vacancyLogos.resolveLogoFile(application, fetched, provider),
    );
  }
}
