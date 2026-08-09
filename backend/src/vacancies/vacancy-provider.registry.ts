import { Injectable } from '@nestjs/common';

import type { VacancySource } from '../applications/applications.type';
import { GetmatchApiService } from '../getmatch/getmatch-api.service';
import { HhApiService } from '../hh/hh-api.service';
import { VACANCY_SOURCE_ORDER } from './vacancies.constants';
import type { VacancyResolution, VacancySourceProvider } from './vacancies.interfaces';

/**
 * Единственная точка диспетчеризации по источнику вакансии (§4.8): и разбор
 * пользовательской ссылки, и поиск провайдера по колонке vacancy_source записи.
 *
 * HhApiService и GetmatchApiService импортируются как значения — этого требует
 * emitDecoratorMetadata для DI (§2.4 п.4). Добавление третьего источника —
 * один параметр конструктора и одна запись в byId, файл больше никто не трогает.
 */
@Injectable()
export class VacancyProviderRegistry {
  private readonly byId: ReadonlyMap<VacancySource, VacancySourceProvider>;

  constructor(hh: HhApiService, getmatch: GetmatchApiService) {
    // Аннотация элемента кортежа обязательна: без неё TS выводит union конкретных
    // сервисов, а не VacancySourceProvider, и Map получает несовместимый тип значений.
    const entries: [VacancySource, VacancySourceProvider][] = [
      [hh.source, hh],
      [getmatch.source, getmatch],
    ];

    this.byId = new Map(entries);
  }

  /** Первый провайдер (в порядке VACANCY_SOURCE_ORDER), чей parseUrl вернул ID. */
  resolveByUrl(rawUrl: string | null | undefined): VacancyResolution | null {
    for (const source of VACANCY_SOURCE_ORDER) {
      const provider = this.byId.get(source);

      if (provider === undefined) {
        continue;
      }

      const externalId = provider.parseUrl(rawUrl);

      if (externalId !== null) {
        return { ref: { source, externalId }, provider };
      }
    }

    return null;
  }

  /** null — источник из БД неизвестен этой версии кода: даёт SKIPPED_UNSUPPORTED, а не 500. */
  find(source: VacancySource): VacancySourceProvider | null {
    return this.byId.get(source) ?? null;
  }
}
