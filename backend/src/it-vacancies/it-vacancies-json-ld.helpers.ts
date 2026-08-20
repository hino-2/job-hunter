import { isRecord, readString } from '../vacancies/vacancy-json-ld.helpers';
import { resolveVacancyLogoUrl } from '../vacancies/vacancy-logo-url.helpers';
import { JSON_LD_FIELD } from '../vacancies/vacancies.constants';
import {
  IT_VACANCIES_ADDRESS_SEPARATOR,
  IT_VACANCIES_ISO_DATE_PATTERN,
  IT_VACANCIES_JSON_LD_FIELD,
  IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN,
  IT_VACANCIES_NAIVE_DATE_DAY_GROUP,
  IT_VACANCIES_NAIVE_DATE_PATTERN,
  IT_VACANCIES_NAIVE_DATE_TIME_GROUP,
  IT_VACANCIES_TIME_ZONE_OFFSET,
} from './it-vacancies.constants';

/**
 * Чтение полей JobPosting, специфичных для it-vacancies.ru. Отдельный файл, а не
 * копии в трёх парсерах модуля: логотип нужен и разбору страницы для синхронизации
 * (§4.3), и разбору описания для поиска лидов (§4.11.7) — источник у них один и тот
 * же блок ld+json, и расхождение при первой правке разметки было бы гарантировано.
 * Тот же приём, что у hh-company-logo.helpers.ts.
 */

/**
 * §4.10: hiringOrganization.logo. Значение источника уже абсолютное
 * (api.it-vacancies.ru), но абсолютизация относительно logoBaseUrl оставлена —
 * относительный src не должен молча превращаться в null, а проверку allow-list
 * и протокола делает всё равно resolveVacancyLogoUrl.
 */
export function readItVacanciesLogoUrl(
  posting: Record<string, unknown> | null,
  logoBaseUrl: string,
): string | null {
  if (posting === null) {
    return null;
  }

  const hiringOrganization = posting[JSON_LD_FIELD.HIRING_ORGANIZATION];

  if (!isRecord(hiringOrganization)) {
    return null;
  }

  return resolveVacancyLogoUrl(
    readString(hiringOrganization, IT_VACANCIES_JSON_LD_FIELD.LOGO),
    logoBaseUrl,
    IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN,
  );
}

/**
 * §4.11.6: datePosted приходит в двух форматах. На странице вакансии — ISO-8601 в
 * UTC, он проходит как есть. В выдаче — наивный «2026-03-29 02:00:56» без смещения;
 * ему дописывается IT_VACANCIES_TIME_ZONE_OFFSET, иначе Date разобрал бы строку с
 * пробелом как локальное время сервера и published_on поехал бы вместе с таймзоной
 * контейнера.
 *
 * Никакого пересчёта таймзон: наружу уходит ISO-строка со смещением источника, как
 * и у hh.ru — сравнение с бюджетом возраста делает конвейер отбора.
 */
export function normalizeItVacanciesDate(rawDate: string | null): string | null {
  if (rawDate === null) {
    return null;
  }

  const trimmed = rawDate.trim();

  if (IT_VACANCIES_ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const naive = IT_VACANCIES_NAIVE_DATE_PATTERN.exec(trimmed);

  if (naive === null) {
    return null;
  }

  const day = naive[IT_VACANCIES_NAIVE_DATE_DAY_GROUP];
  const time = naive[IT_VACANCIES_NAIVE_DATE_TIME_GROUP];

  if (day === undefined || time === undefined) {
    return null;
  }

  return `${day}T${time}${IT_VACANCIES_TIME_ZONE_OFFSET}`;
}

/**
 * §4.11.3: jobLocation.address бывает объектом PostalAddress (выдача) и простой
 * строкой «Москва, Калужско-Рижская линия, метро Китай-город» (страница вакансии).
 * Во втором случае берётся часть до первой запятой — колонка area_name хранит город,
 * а не адрес станции метро. Мягкая деградация в null: региона может не быть вовсе.
 */
export function readItVacanciesAreaName(posting: Record<string, unknown>): string | null {
  const jobLocation = posting[IT_VACANCIES_JSON_LD_FIELD.JOB_LOCATION];

  if (!isRecord(jobLocation)) {
    return null;
  }

  const address = jobLocation[IT_VACANCIES_JSON_LD_FIELD.ADDRESS];

  if (typeof address === 'string') {
    const [locality] = address.split(IT_VACANCIES_ADDRESS_SEPARATOR);
    const trimmed = locality?.trim() ?? '';

    return trimmed.length === 0 ? null : trimmed;
  }

  if (!isRecord(address)) {
    return null;
  }

  const locality = readString(address, IT_VACANCIES_JSON_LD_FIELD.ADDRESS_LOCALITY)?.trim() ?? '';

  return locality.length === 0 ? null : locality;
}
