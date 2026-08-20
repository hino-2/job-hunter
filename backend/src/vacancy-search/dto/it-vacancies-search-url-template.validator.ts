import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

import { isAllowedItVacanciesSearchUrlOrigin } from '../../it-vacancies/it-vacancies-search-url.helpers';
import {
  IT_VACANCIES_SEARCH_URL_TEMPLATE_CONSTRAINT_NAME,
  VACANCY_SEARCH_SETTINGS_IT_VACANCIES_SEARCH_URL_ORIGIN_MESSAGE,
} from '../vacancy-search.constants';

/**
 * §5.7: происхождение шаблона ссылки (https:// + хост из allow-list it-vacancies.ru) —
 * часть валидации PUT /api/vacancy-search-settings, не покрываемая @Matches (тот
 * проверяет только наличие плейсхолдера). Зеркало SearchUrlTemplateConstraint: два
 * отдельных ValidatorConstraint'а, а не один с параметром источника, потому что
 * @Validate конструирует класс без аргументов. value типизировано как unknown — на
 * момент вызова class-validator ещё не гарантировал @IsString.
 */
@ValidatorConstraint({ name: IT_VACANCIES_SEARCH_URL_TEMPLATE_CONSTRAINT_NAME, async: false })
export class ItVacanciesSearchUrlTemplateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    return typeof value === 'string' && isAllowedItVacanciesSearchUrlOrigin(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return VACANCY_SEARCH_SETTINGS_IT_VACANCIES_SEARCH_URL_ORIGIN_MESSAGE;
  }
}
