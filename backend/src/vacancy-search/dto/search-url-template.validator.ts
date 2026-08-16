import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

import { isAllowedHhSearchUrlOrigin } from '../../hh/hh-search-url.helpers';
import {
  SEARCH_URL_TEMPLATE_CONSTRAINT_NAME,
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_ORIGIN_MESSAGE,
} from '../vacancy-search.constants';

/**
 * §5.7: происхождение шаблона ссылки (https:// + хост из allow-list hh.ru) — часть
 * валидации PUT /api/vacancy-search-settings, не покрываемая @Matches (тот проверяет
 * только наличие плейсхолдеров). value типизировано как unknown — на момент вызова
 * class-validator ещё не гарантировал @IsString, поэтому нестроковое значение здесь
 * просто не проходит проверку, а не бросает.
 */
@ValidatorConstraint({ name: SEARCH_URL_TEMPLATE_CONSTRAINT_NAME, async: false })
export class SearchUrlTemplateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    return typeof value === 'string' && isAllowedHhSearchUrlOrigin(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return VACANCY_SEARCH_SETTINGS_SEARCH_URL_ORIGIN_MESSAGE;
  }
}
