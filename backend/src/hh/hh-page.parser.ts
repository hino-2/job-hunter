import { JSON_LD_FIELD } from '../vacancies/vacancies.constants';
import type { Vacancy } from '../vacancies/vacancies.interfaces';
import {
  extractJsonLdEntries,
  findJobPosting,
  isRecord,
  readString,
} from '../vacancies/vacancy-json-ld.helpers';
import { resolveVacancyLogoUrl } from '../vacancies/vacancy-logo-url.helpers';
import { readHhCompanyLogoSrc } from './hh-company-logo.helpers';
import {
  HH_ARCHIVED_FLAG_GROUP,
  HH_ARCHIVED_FLAG_PATTERN,
  HH_ARCHIVED_MARKER,
  HH_ARCHIVED_TRUE_TOKEN,
  HH_LOGO_ALLOWED_HOST_PATTERN,
} from './hh.constants';

/**
 * Признак архивности — консенсус токенов "archived":true|false (обычных и
 * HTML-экранированных &quot;/&#34;) плюс data-qa-маркер, который есть только на
 * архивной странице (ещё один токен true). Пусто или противоречие → null (§4.1):
 * односигнальный детектор ломался бы тихо при малейшей правке вёрстки hh.ru,
 * а здесь любое расхождение сразу превращается в исход ERROR (fail-loud).
 *
 * Глобальный регекс на уровне модуля безопасен именно с matchAll: он не мутирует
 * lastIndex между вызовами — в отличие от .test()/.exec() на том же регексе.
 */
function resolveArchived(html: string): boolean | null {
  const tokens = [...html.matchAll(HH_ARCHIVED_FLAG_PATTERN)].map(
    (match) => match[HH_ARCHIVED_FLAG_GROUP] === HH_ARCHIVED_TRUE_TOKEN,
  );

  if (html.includes(HH_ARCHIVED_MARKER)) {
    tokens.push(true);
  }

  if (tokens.length === 0) {
    return null;
  }

  if (tokens.every((token) => token)) {
    return true;
  }

  if (tokens.every((token) => !token)) {
    return false;
  }

  return null;
}

/**
 * Разбор HTML-страницы вакансии hh.ru (§4.1). Чистая функция, а не метод сервиса
 * и не провайдер — тот же аргумент, что и у hh-url.parser.ts: нет зависимостей
 * и состояния, DI ничего не даёт.
 *
 * Вход — unknown, а не string: тип внешнего HTTP-ответа неизвестен статически,
 * и narrowing обязан быть явным, а не предположением о настройке клиента.
 *
 * archived обязателен — на нём построены правила §4.3, его отсутствие или
 * противоречивость делает ответ бесполезным для синхронизации (исход ERROR).
 * name и employerName из JSON-LD опциональны и деградируют мягко: они питают
 * только автозаполнение (§4.4), отсутствие блока ld+json — не ошибка разбора.
 *
 * Никогда не бросает: любой мусор на входе — это null, а не исключение.
 *
 * logoBaseUrl (§4.10) нужен для абсолютизации URL логотипа компании — состояние
 * страницы отдаёт его относительным (/employer-logo/…), но может отдать и абсолютный;
 * logoUrl заполняется в ОБОИХ return, потому что блок логотипа лежит вне JSON-LD
 * и от его наличия не зависит.
 */
export function parseHhVacancyPage(html: unknown, logoBaseUrl: string): Vacancy | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const archived = resolveArchived(html);

  if (archived === null) {
    return null;
  }

  const logoUrl = resolveVacancyLogoUrl(
    readHhCompanyLogoSrc(html),
    logoBaseUrl,
    HH_LOGO_ALLOWED_HOST_PATTERN,
  );
  const jobPosting = findJobPosting(extractJsonLdEntries(html));

  // Тот же allow-list, которым уже проверили logoUrl (§4.10) — CompanyLogoService
  // повторит эту проверку на каждом хопе редиректа, а не только на исходном URL.
  const logoAllowedHostPattern = logoUrl === null ? null : HH_LOGO_ALLOWED_HOST_PATTERN;

  if (jobPosting === null) {
    return { name: null, archived, employerName: null, logoUrl, logoAllowedHostPattern };
  }

  const hiringOrganization = jobPosting[JSON_LD_FIELD.HIRING_ORGANIZATION];

  return {
    name: readString(jobPosting, JSON_LD_FIELD.TITLE),
    archived,
    employerName: isRecord(hiringOrganization)
      ? readString(hiringOrganization, JSON_LD_FIELD.NAME)
      : null,
    logoUrl,
    logoAllowedHostPattern,
  };
}
