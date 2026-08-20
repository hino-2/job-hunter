import { VACANCY_SOURCE } from '../applications/applications.constants';
import {
  hasHhSearchPagePlaceholder,
  isAllowedHhSearchUrlOrigin,
} from '../hh/hh-search-url.helpers';
import {
  hasItVacanciesSearchPagePlaceholder,
  isAllowedItVacanciesSearchUrlOrigin,
} from '../it-vacancies/it-vacancies-search-url.helpers';
import type { VacancyLeadSearchSource } from '../vacancies/vacancies.type';
import type { VacancySearchSettings } from './vacancy-search-settings.entity';
import type { VacancySearchUrlTemplateBySource } from './vacancy-search.type';

/**
 * Чистые функции без DI — тот же приём, что у vacancy-scan-position.helpers.ts:
 * ими пользуются и VacancySearchSettingsService (fail-loud при чтении снимка), и
 * VacancyScanService (выбор шаблона по источнику прогона), зависимостей у них нет,
 * а провайдер заставил бы обоих потребителей импортировать лишний модуль.
 */

/**
 * §5.7: шаблон ссылки на выдачу для каждого источника поиска лидов. Карта, а не
 * два поля снимка: прогон и статус выбирают шаблон по значению source, и switch
 * в каждом потребителе пришлось бы дописывать при появлении третьего источника.
 */
export function buildSearchUrlTemplateBySource(
  entity: VacancySearchSettings,
): VacancySearchUrlTemplateBySource {
  return {
    [VACANCY_SOURCE.HH]: entity.searchUrlTemplate,
    [VACANCY_SOURCE.IT_VACANCIES]: entity.itVacanciesSearchUrlTemplate,
  };
}

/**
 * §4.11.1: плейсхолдер {page} плюс https-хост из allow-list источника. PUT уже не
 * пускает в БД ничего другого, но строку можно испортить прямой правкой SQL — тогда
 * лучше явная 500 при старте прогона, чем 40 запросов подряд по странице 0 или тихий
 * уход куда-то не туда.
 */
export function isValidSearchUrlTemplate(
  template: string,
  source: VacancyLeadSearchSource,
): boolean {
  if (source === VACANCY_SOURCE.IT_VACANCIES) {
    return (
      hasItVacanciesSearchPagePlaceholder(template) && isAllowedItVacanciesSearchUrlOrigin(template)
    );
  }

  return hasHhSearchPagePlaceholder(template) && isAllowedHhSearchUrlOrigin(template);
}
