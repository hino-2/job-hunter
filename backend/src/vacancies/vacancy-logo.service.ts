import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Application } from '../applications/application.entity';
import { SYNC_OUTCOME } from '../applications/applications.constants';
import { CompanyLogoService } from '../logos/company-logo.service';
import { describeErrorReason } from './vacancy-error.helpers';
import { VacancyProviderRegistry } from './vacancy-provider.registry';
import { CREATE_LOGO_DOWNLOADED_MESSAGE, CREATE_LOGO_FAILED_MESSAGE } from './vacancies.constants';
import type { VacancySourceProvider } from './vacancies.interfaces';
import type { VacancyFetchResult } from './vacancies.type';

/**
 * Единственный владелец правил §4.10 «качать логотип компании или нет» для записей
 * applications. Используется двумя точками входа: массовой/поштучной синхронизацией
 * (VacancySyncService, §4.3 — resolveLogoFile) и созданием записи (§4.4 — downloadOnCreate).
 *
 * downloadOnCreate пишет ТОЛЬКО колонку company_logo_file. Колонки last_sync_*,
 * vacancy_archived, status и position принадлежат VacancySyncService (§4.3) и здесь
 * не трогаются: create-путь не выполняет синхронизацию, а лишь докачивает логотип
 * сразу после INSERT. Сущность не мутируется — ApplicationsService.create() перечитывает
 * запись из БД после вызова downloadOnCreate, поэтому обновлённое значение приходит
 * оттуда, а не из аргумента application.
 *
 * Repository и Application импортируются как значения — этого требует
 * emitDecoratorMetadata для DI (§2.4 п.4).
 */
@Injectable()
export class VacancyLogoService {
  private readonly logger = new Logger(VacancyLogoService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly registry: VacancyProviderRegistry,
    private readonly logos: CompanyLogoService,
  ) {}

  /**
   * §4.10: качать логотип или нет. undefined — «колонку не трогать» (см. комментарий
   * к buildFetchedDecision в vacancy-sync.service.ts), а не null. Порядок отказов: не OK →
   * не узнали о вакансии вообще; нет logoUrl → источник логотип не отдал; файл уже на
   * диске → не перекачиваем (иначе массовый прогон по всем открытым записям заново
   * скачивал бы то, что уже есть). CompanyLogoService.download сам не бросает — здесь
   * дополнительный try/catch не нужен.
   *
   * provider передаётся третьим аргументом ради acquireRequestSlot (§4.11.2): скачивание
   * логотипа обязано идти через тот же троттл, что и страница вакансии этого источника.
   */
  async resolveLogoFile(
    application: Application,
    fetched: VacancyFetchResult,
    provider: VacancySourceProvider,
  ): Promise<string | undefined> {
    if (fetched.outcome !== SYNC_OUTCOME.OK) {
      return undefined;
    }

    const { logoUrl, logoAllowedHostPattern } = fetched.vacancy;

    // Оба поля заполняются парсером источника вместе (§4.10) — logoAllowedHostPattern
    // здесь null означал бы, что парсер прислал URL без allow-list'а, чего не бывает;
    // проверка на всякий случай сохраняет тип allowedHostPattern ниже необязательным.
    if (logoUrl === null || logoAllowedHostPattern === null) {
      return undefined;
    }

    if (
      application.companyLogoFile !== null &&
      (await this.logos.exists(application.companyLogoFile))
    ) {
      return undefined;
    }

    return (
      (await this.logos.download({
        fileKey: application.id,
        logoUrl,
        allowedHostPattern: logoAllowedHostPattern,
        acquireSlot: provider.acquireRequestSlot,
      })) ?? undefined
    );
  }

  /**
   * §4.4/§4.10: докачка логотипа сразу после INSERT записи. fileKey логотипа — это id
   * уже существующей записи, поэтому раньше вставки скачивание невозможно (в превью
   * записи ещё нет). Метод никогда не бросает и не трогает sync-колонки: неизвестный
   * источник не должен превращаться в SKIPPED_UNSUPPORTED, а любой сбой источника или
   * CDN — в ошибку создания записи (§4.4 п.3).
   */
  async downloadOnCreate(application: Application): Promise<void> {
    const { id, vacancySource, vacancyExternalId } = application;

    if (vacancySource === null || vacancyExternalId === null) {
      return;
    }

    const provider = this.registry.find(vacancySource);

    if (provider === null) {
      return;
    }

    try {
      const fetched = await provider.fetchVacancy(vacancyExternalId);
      const fileName = await this.resolveLogoFile(application, fetched, provider);

      if (fileName === undefined) {
        return;
      }

      // Точечный UPDATE одной колонки, а не save(entity): application здесь — снимок
      // на момент INSERT, save() переписал бы им все остальные колонки. affected === 0
      // (запись успели удалить) не ошибка — отдельной ветки не требуется.
      await this.applications.update(id, { companyLogoFile: fileName });

      this.logger.debug(`${CREATE_LOGO_DOWNLOADED_MESSAGE}: ${id}`);
    } catch (error) {
      this.logger.warn(`${CREATE_LOGO_FAILED_MESSAGE} (${id}): ${describeErrorReason(error)}`);
    }
  }
}
