import type { VACANCY_SOURCE } from '../applications/applications.constants';
import type { VacancySource } from '../applications/applications.type';

/**
 * §5.8: COMPANY_SITE исключён — у сайтов компаний нет своего единого сайта-источника
 * (это сборный список чужих сайтов, §4.14), поэтому у него нет и своей иконки: карты
 * ниже (source-icon.constants.ts) типизированы этим сужением, а не полным VacancySource,
 * и попытка проиндексировать их значением COMPANY_SITE не пройдёт компиляцию.
 */
export type SourceIconSource = Exclude<VacancySource, typeof VACANCY_SOURCE.COMPANY_SITE>;
