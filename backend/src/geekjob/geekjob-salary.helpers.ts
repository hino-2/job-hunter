import type { GeekjobSalaryRange } from './geekjob.interfaces';
import {
  GEEKJOB_SALARY_CURRENCY_BY_SYMBOL,
  GEEKJOB_SALARY_FROM_PREFIX,
  GEEKJOB_SALARY_NUMBER_PATTERN,
  GEEKJOB_SALARY_RANGE_SEPARATOR_PATTERN,
  GEEKJOB_SALARY_THOUSAND_MULTIPLIER,
  GEEKJOB_SALARY_THOUSAND_SUFFIX_PATTERN,
  GEEKJOB_SALARY_TO_PREFIX,
} from './geekjob.constants';

/**
 * §4.13: разбор короткой формы оклада из JSON выдачи geekjob.ru — "100K — 180K ₽",
 * "от 800 €", "до 150K ₽", "27.2K ₽" (единственное число — точный оклад, from = to),
 * "" (не указан). Полная форма ("от 180 000 до 280 000 ₽") существует только на
 * странице вакансии и по §12 парсингу не подлежит — данные для лида берутся только
 * из выдачи (§4.11.3).
 *
 * Никогда не бросает: любой мусор на входе — все поля null.
 */
export function parseGeekjobSalary(raw: unknown): GeekjobSalaryRange {
  if (typeof raw !== 'string') {
    return { salaryFrom: null, salaryTo: null, salaryCurrency: null };
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { salaryFrom: null, salaryTo: null, salaryCurrency: null };
  }

  const salaryCurrency = readCurrency(trimmed);
  const parts = trimmed
    .split(GEEKJOB_SALARY_RANGE_SEPARATOR_PATTERN)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length >= 2) {
    return {
      salaryFrom: readNumber(parts[0] ?? ''),
      salaryTo: readNumber(parts[1] ?? ''),
      salaryCurrency,
    };
  }

  const single = parts[0];

  if (single === undefined) {
    return { salaryFrom: null, salaryTo: null, salaryCurrency: null };
  }

  if (single.startsWith(GEEKJOB_SALARY_FROM_PREFIX)) {
    return { salaryFrom: readNumber(single), salaryTo: null, salaryCurrency };
  }

  if (single.startsWith(GEEKJOB_SALARY_TO_PREFIX)) {
    return { salaryFrom: null, salaryTo: readNumber(single), salaryCurrency };
  }

  // Единственное число без «от»/«до» — точный оклад: from и to совпадают.
  const value = readNumber(single);

  return { salaryFrom: value, salaryTo: value, salaryCurrency };
}

function readCurrency(value: string): string | null {
  for (const [symbol, code] of Object.entries(GEEKJOB_SALARY_CURRENCY_BY_SYMBOL)) {
    if (value.includes(symbol)) {
      return code;
    }
  }

  return null;
}

function readNumber(value: string): number | null {
  const match = GEEKJOB_SALARY_NUMBER_PATTERN.exec(value);
  const rawNumber = match?.[1];

  if (rawNumber === undefined) {
    return null;
  }

  const normalized = Number(rawNumber.replace(',', '.'));

  if (!Number.isFinite(normalized)) {
    return null;
  }

  const suffix = match?.[2];
  const isThousands = suffix !== undefined && GEEKJOB_SALARY_THOUSAND_SUFFIX_PATTERN.test(suffix);
  const result = isThousands ? normalized * GEEKJOB_SALARY_THOUSAND_MULTIPLIER : normalized;

  return result <= 0 ? null : result;
}
