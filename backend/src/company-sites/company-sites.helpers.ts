import { createHash } from 'node:crypto';
import { Agent } from 'node:https';
import { rootCertificates } from 'node:tls';
import { ConfigService } from '@nestjs/config';
import type { HttpModuleOptions } from '@nestjs/axios';

import { decodeNumericHtmlEntities, htmlToPlainText } from '../common/html.helpers';
import { buildVacancyHttpOptions } from '../vacancies/vacancy-http-options.factory';
import type { VacancyDescriptionResult } from '../vacancies/vacancies.type';
import type { VacancySearchItem } from '../vacancies/vacancies.interfaces';
import {
  COMPANY_SITE_DESCRIPTION_MISSING_MESSAGE,
  COMPANY_SITE_HTTP_ENV_KEYS,
  COMPANY_SITE_MAX_LIST_PAGES,
  COMPANY_SITE_MIN_DESCRIPTION_CHARS,
  HEX_ENCODING,
  HTML_BODY_BLOCK_PATTERN,
  HTML_MAIN_BLOCK_PATTERN,
  HTML_SCRIPT_STYLE_BLOCK_PATTERN,
  MD5_ALGORITHM,
  RUSSIAN_TRUSTED_ROOT_CA_PEM,
} from './company-sites.constants';
import type { CompanySiteAnchor, CompanySiteItemInput } from './company-sites.interfaces';
import type { CompanySiteListResult, CompanySitePageResult } from './company-sites.type';

/**
 * §4.14: опции axios общего HttpService модуля company-sites/ — без baseURL (§4.14/B1).
 * httpsAgent доверяет корням Node плюс «Russian Trusted Root CA» (Минцифры): им
 * подписан team.rzd.ru, и без него запрос к РЖД не проходит TLS-проверку.
 * rejectUnauthorized намеренно не трогается — проверка цепочки остаётся строгой,
 * расширяется лишь список доверенных корней, и только у этого клиента.
 */
export function buildCompanySiteHttpOptions(configService: ConfigService): HttpModuleOptions {
  return {
    ...buildVacancyHttpOptions(configService, COMPANY_SITE_HTTP_ENV_KEYS),
    httpsAgent: new Agent({ ca: [...rootCertificates, RUSSIAN_TRUSTED_ROOT_CA_PEM] }),
  };
}

/**
 * §4.14: external_id сайта компании — md5 канонического vacancyUrl (32 hex-символа,
 * укладывается в varchar(32) той же ширины, что и у остальных источников). URL уже
 * строит сам парсер (константный хост + путь + id), поэтому один и тот же external_id
 * получается на каждом прогоне — дедупликация эшелона 2 (§4.11.5) по нему устойчива.
 */
export function buildCompanySiteExternalId(vacancyUrl: string): string {
  return createHash(MD5_ALGORITHM).update(vacancyUrl).digest(HEX_ENCODING);
}

/**
 * §4.14: единая точка сборки VacancySearchItem для всех парсеров сайтов компаний —
 * то, чего источник не отдаёт (валюта, gross, опыт, форма занятости, формат работы),
 * заполняется null: у company-sites/ таких полей систематически нет, а не «не удалось
 * распарсить». publishedAtIso — first-seen (§3.5), кроме случаев, когда источник даёт
 * настоящую дату (Date.parse не NaN) — тогда используется она.
 */
export function buildCompanySiteItem(input: CompanySiteItemInput): VacancySearchItem {
  const publishedAtIso =
    input.publishedAtIso !== undefined &&
    input.publishedAtIso !== null &&
    !Number.isNaN(Date.parse(input.publishedAtIso))
      ? input.publishedAtIso
      : new Date().toISOString();

  return {
    externalId: buildCompanySiteExternalId(input.vacancyUrl),
    position: input.position,
    company: input.company,
    publishedAtIso,
    vacancyUrl: input.vacancyUrl,
    areaName: input.areaName ?? null,
    salaryFrom: input.salaryFrom ?? null,
    salaryTo: input.salaryTo ?? null,
    salaryCurrency: null,
    salaryGross: null,
    experience: null,
    employmentForm: null,
    workFormats: null,
  };
}

/**
 * §4.14: анкоры списка вакансий по паттерну парсера — group 1 = id, group 2 = внутренний
 * HTML. Дедуплицирует по id, сохраняя порядок первого появления (сайт может повторить
 * один и тот же анкор в нескольких блоках разметки, как навигационное меню kontur.ru).
 *
 * Локальная копия pattern — тот же приём, что extractBalancedDivBlock (common/html.helpers.ts):
 * matchAll мутирует lastIndex общего regex-инстанса, и повторный вызов с константой
 * из *.constants.ts сломал бы следующий парсер, использующий тот же объект.
 */
export function matchVacancyAnchors(html: string, pattern: RegExp): CompanySiteAnchor[] {
  const local = new RegExp(pattern.source, pattern.flags);
  const seen = new Set<string>();
  const anchors: CompanySiteAnchor[] = [];

  for (const match of html.matchAll(local)) {
    const id = match[1];
    const innerHtml = match[2];

    if (id === undefined || innerHtml === undefined || seen.has(id)) {
      continue;
    }

    seen.add(id);
    anchors.push({ id, innerHtml });
  }

  return anchors;
}

/**
 * §4.14/D11: HTML страницы вакансии сайта компании → plain text описания. script/style/
 * noscript вырезаются целиком (их содержимое — не текст страницы), затем предпочтение
 * <main> над <body> над всем документом — большинство SPA-каркасов кладут содержательную
 * разметку в <main>, а <body> тянет за собой шапку/подвал/меню без пользы для ИИ-отбора.
 *
 * Текст короче COMPANY_SITE_MIN_DESCRIPTION_CHARS считается пустой оболочкой (страница
 * не отрендерилась на сервере) — fail-closed, null вместо огрызка описания.
 */
export function extractPageText(html: string): string | null {
  const stripped = html.replace(HTML_SCRIPT_STYLE_BLOCK_PATTERN, '');
  const main = HTML_MAIN_BLOCK_PATTERN.exec(stripped)?.[1];
  const body = HTML_BODY_BLOCK_PATTERN.exec(stripped)?.[1];
  const source = main ?? body ?? stripped;
  const text = decodeNumericHtmlEntities(htmlToPlainText(source));

  return text.length >= COMPANY_SITE_MIN_DESCRIPTION_CHARS ? text : null;
}

/** §4.14: null → fail-closed (вакансия не проходит этап 4, следующий прогон встретит её снова). */
export function toDescriptionResult(text: string | null): VacancyDescriptionResult {
  if (text === null) {
    return { ok: false, message: COMPANY_SITE_DESCRIPTION_MISSING_MESSAGE };
  }

  return { ok: true, description: text, logoUrl: null, logoAllowedHostPattern: null };
}

/**
 * §4.14: листает страницы списка вакансий компании через fetchPage(index), 0-based.
 * Останавливается, когда страница сообщает !hasMore, когда страница не добавила ни
 * одного НОВОГО external_id (страховка от источника, зацикленно отдающего последнюю
 * страницу и после конца выдачи — это и есть случай kontur.ru: ?page=N игнорируется,
 * сервер каждый раз отдаёт один и тот же список), либо на COMPANY_SITE_MAX_LIST_PAGES.
 *
 * Одна неудачная страница проваливает компанию целиком (!ok на любом шаге — сразу
 * возврат этого результата): §4.14 — один сбойный список компании считается одним
 * pagesFailed на уровне CompanySiteSearchService, частичный список не сохраняется.
 *
 * ponytail: потолок COMPANY_SITE_MAX_LIST_PAGES жёсткий, без адаптации под реальный
 * размер списка конкретного источника — поднять при появлении источника с более
 * глубокой пагинацией.
 */
/**
 * §4.14/Stage 3: тело JSON-ответа сайта компании — та же нормализация, что
 * coercePayload у geekjob (geekjob-search.parser.ts): HttpModule общего клиента
 * настроен на responseType: 'text', но axios иногда всё равно приносит уже
 * распарсенный объект (угадывает по Content-Type ответа), а иногда — сырую строку.
 * Строка, которая не парсится, — null (источник вернул не JSON), а не исключение.
 */
export function parseJsonBody(payload: unknown): unknown {
  if (typeof payload !== 'string') {
    return payload;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

/** §4.14/Stage 3: id вакансии в JSON-ответе — непустая строка либо конечное число, приведённое к строке. */
export function readId(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  if (typeof value === 'string') {
    return value.length > 0 ? value : null;
  }

  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

/** §4.14/Stage 3: массив внутри JSON-ответа, либо null, если поля нет или оно не массив. */
export function readArray(source: Record<string, unknown>, key: string): unknown[] | null {
  const value = source[key];

  return Array.isArray(value) ? value : null;
}

/**
 * §4.14/Stage 3: несколько текстовых полей JSON-ответа (rzd: description/
 * responsibilities/requirements/conditions; wildberries: data.description/duties/
 * requirements/conditions) → одно описание. Поля этих источников тоже несут
 * HTML-разметку, поэтому проходят тем же путём, что HTML-парсеры: htmlToPlainText,
 * затем decodeNumericHtmlEntities.
 */
export function joinDescriptionParts(parts: readonly (string | null)[]): string | null {
  const nonEmpty = parts.filter(
    (part): part is string => part !== null && part.trim().length > 0,
  );

  if (nonEmpty.length === 0) {
    return null;
  }

  return decodeNumericHtmlEntities(htmlToPlainText(nonEmpty.join('\n\n')));
}

export async function collectPagedVacancies(
  fetchPage: (index: number) => Promise<CompanySitePageResult>,
): Promise<CompanySiteListResult> {
  const items: VacancySearchItem[] = [];
  const seenExternalIds = new Set<string>();
  let skippedInvalid = 0;

  for (let index = 0; index < COMPANY_SITE_MAX_LIST_PAGES; index += 1) {
    const page = await fetchPage(index);

    if (!page.ok) {
      return page;
    }

    skippedInvalid += page.skippedInvalid;

    let addedOnPage = 0;

    for (const item of page.items) {
      if (seenExternalIds.has(item.externalId)) {
        continue;
      }

      seenExternalIds.add(item.externalId);
      items.push(item);
      addedOnPage += 1;
    }

    if (!page.hasMore || addedOnPage === 0) {
      break;
    }
  }

  return { ok: true, items, skippedInvalid };
}
