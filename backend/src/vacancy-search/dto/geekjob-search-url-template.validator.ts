import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

import { isAllowedGeekjobSearchUrlOrigin } from '../../geekjob/geekjob-search-url.helpers';
import {
  GEEKJOB_SEARCH_URL_TEMPLATE_CONSTRAINT_NAME,
  VACANCY_SEARCH_SETTINGS_GEEKJOB_SEARCH_URL_ORIGIN_MESSAGE,
} from '../vacancy-search.constants';

/**
 * §5.7: происхождение шаблона ссылки (https:// + хост из allow-list geekjob.ru) —
 * часть валидации PUT /api/vacancy-search-settings, не покрываемая @Matches (тот
 * проверяет только наличие плейсхолдера). Зеркало ItVacanciesSearchUrlTemplateConstraint:
 * отдельный ValidatorConstraint, а не один с параметром источника, потому что
 * @Validate конструирует класс без аргументов. value типизировано как unknown — на
 * момент вызова class-validator ещё не гарантировал @IsString.
 */
@ValidatorConstraint({ name: GEEKJOB_SEARCH_URL_TEMPLATE_CONSTRAINT_NAME, async: false })
export class GeekjobSearchUrlTemplateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    return typeof value === 'string' && isAllowedGeekjobSearchUrlOrigin(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return VACANCY_SEARCH_SETTINGS_GEEKJOB_SEARCH_URL_ORIGIN_MESSAGE;
  }
}
