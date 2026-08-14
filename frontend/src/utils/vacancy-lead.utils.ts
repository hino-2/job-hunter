import dayjs from 'dayjs';

import {
  EMPLOYMENT_FORM_LABELS,
  EXPERIENCE_LABELS,
  KEYWORD_LIST_JOIN_SEPARATOR,
  SALARY_FROM_LABEL,
  SALARY_GROSS_SUFFIX,
  SALARY_NET_SUFFIX,
  SALARY_TO_LABEL,
  SALARY_VALUE_SEPARATOR,
  WORK_FORMAT_LABELS,
} from '../constants/vacancy-search.constants';
import { DATE_SHORT_FORMAT, DATE_TIME_DISPLAY_FORMAT } from '../constants/layout.constants';
import type { VacancyLead, VacancyLeadsFilters } from '../types/vacancy-search.interfaces';

/**
 * Форматирование и производные лида (§7.9.1). Пустые поля не показываются вовсе
 * (а не выводятся прочерками, в отличие от откликов §7.8) — у половины вакансий
 * hh.ru зарплаты нет, поэтому функции возвращают null, а не плейсхолдер.
 */

/** Короткая зарплата свёрнутой шапки: «от 300 000 ₽» либо диапазон, без «до вычета». */
export function formatSalaryShort(lead: VacancyLead): string | null {
  const { salaryFrom, salaryTo, salaryCurrency } = lead;

  if (salaryFrom === null && salaryTo === null) {
    return null;
  }

  const currency = salaryCurrency ?? '';
  const from = salaryFrom !== null ? `${SALARY_FROM_LABEL}${SALARY_VALUE_SEPARATOR}${salaryFrom}` : null;
  const to = salaryTo !== null ? `${SALARY_TO_LABEL}${SALARY_VALUE_SEPARATOR}${salaryTo}` : null;
  const range = [from, to].filter((part): part is string => part !== null).join(SALARY_VALUE_SEPARATOR);

  return `${range}${SALARY_VALUE_SEPARATOR}${currency}`.trim();
}

/** Полная зарплата раскрытого состояния: с явной пометкой «до вычета»/«на руки». */
export function formatSalaryFull(lead: VacancyLead): string | null {
  const short = formatSalaryShort(lead);

  if (short === null) {
    return null;
  }

  if (lead.salaryGross === null) {
    return short;
  }

  return `${short}${lead.salaryGross ? SALARY_GROSS_SUFFIX : SALARY_NET_SUFFIX}`;
}

/** publishedOn — уже голая дата (§3.5), не момент времени: форматировать без учёта TZ. */
export function formatPublishedOnShort(publishedOn: string): string {
  return dayjs(publishedOn).format(DATE_SHORT_FORMAT);
}

export function formatPublishedAtFull(publishedAt: string | null): string | null {
  if (publishedAt === null) {
    return null;
  }

  return dayjs(publishedAt).format(DATE_TIME_DISPLAY_FORMAT);
}

export function formatFirstSeenAt(firstSeenAt: string): string {
  return dayjs(firstSeenAt).format(DATE_TIME_DISPLAY_FORMAT);
}

/** Значение из партиального словаря с фолбэком на сырое значение hh.ru (§7.9.1). */
export function lookupLabelOrRaw(dictionary: Partial<Record<string, string>>, value: string): string {
  return dictionary[value] ?? value;
}

export function formatExperience(experience: string | null): string | null {
  return experience === null ? null : lookupLabelOrRaw(EXPERIENCE_LABELS, experience);
}

export function formatEmploymentForm(employmentForm: string | null): string | null {
  return employmentForm === null ? null : lookupLabelOrRaw(EMPLOYMENT_FORM_LABELS, employmentForm);
}

export function formatWorkFormats(workFormats: string[] | null): string | null {
  if (workFormats === null || workFormats.length === 0) {
    return null;
  }

  return workFormats.map((format) => lookupLabelOrRaw(WORK_FORMAT_LABELS, format)).join(KEYWORD_LIST_JOIN_SEPARATOR);
}

export function formatMatchedKeywords(matchedKeywords: string[] | null): string | null {
  if (matchedKeywords === null || matchedKeywords.length === 0) {
    return null;
  }

  return matchedKeywords.join(KEYWORD_LIST_JOIN_SEPARATOR);
}

/**
 * Активен ли поиск по тексту (§7.8-эквивалент) — отдельно от переключателя «Скрытые»:
 * у пустого списка под каждым из этих двух фильтров свой текст (§7.9.1), а не общий.
 */
export function isVacancyLeadsSearchActive(filters: VacancyLeadsFilters): boolean {
  return filters.search.trim().length > 0;
}
