import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

import type { VacancySource } from '../applications/applications.type';
import { HhSearchService } from '../hh/hh-search.service';
import { ItVacanciesSearchService } from '../it-vacancies/it-vacancies-search.service';
import type { VacancyLeadSearchProvider } from '../vacancies/vacancies.interfaces';
import type { VacancyLeadSearchSource } from '../vacancies/vacancies.type';
import { VACANCY_LEAD_SEARCH_PROVIDER_MISSING_MESSAGE } from './vacancy-search.constants';

/**
 * Единственная точка диспетчеризации прогона поиска лидов по источнику (§4.11):
 * тот же приём, что у VacancyProviderRegistry для синхронизации, но свой контракт
 * (VacancyLeadSearchProvider) и своё подмножество источников — getmatch.ru выдачи
 * для поиска не даёт.
 *
 * Сервисы импортируются как значения — этого требует emitDecoratorMetadata для DI
 * (§2.4 п.4). Добавление источника поиска — один параметр конструктора и одна
 * запись в entries.
 */
@Injectable()
export class VacancyLeadSearchRegistry {
  private readonly logger = new Logger(VacancyLeadSearchRegistry.name);
  private readonly bySource: ReadonlyMap<VacancySource, VacancyLeadSearchProvider>;

  constructor(hh: HhSearchService, itVacancies: ItVacanciesSearchService) {
    // Аннотация элемента кортежа обязательна: без неё TS выводит union конкретных
    // сервисов, а не VacancyLeadSearchProvider, и Map получает несовместимый тип значений.
    const entries: [VacancySource, VacancyLeadSearchProvider][] = [
      [hh.source, hh],
      [itVacancies.source, itVacancies],
    ];

    this.bySource = new Map(entries);
  }

  /**
   * Недостижимо на практике: значение source приходит из StartScanDto, где его уже
   * отфильтровал @IsIn(VACANCY_LEAD_SEARCH_SOURCES). Поэтому 500 с логом, а не 400 —
   * отсутствие провайдера означает рассинхронизацию этого реестра со списком
   * источников поиска, то есть баг, а не плохой запрос.
   */
  require(source: VacancyLeadSearchSource): VacancyLeadSearchProvider {
    const provider = this.bySource.get(source);

    if (provider === undefined) {
      this.logger.error(
        `Провайдер поиска лидов для источника ${source} не зарегистрирован: ` +
          'VACANCY_LEAD_SEARCH_SOURCES и VacancyLeadSearchRegistry разошлись',
      );

      throw new InternalServerErrorException(VACANCY_LEAD_SEARCH_PROVIDER_MISSING_MESSAGE);
    }

    return provider;
  }
}
