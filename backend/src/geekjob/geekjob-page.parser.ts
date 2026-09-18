import type { Vacancy } from '../vacancies/vacancies.interfaces';
import { resolveVacancyLogoUrl } from '../vacancies/vacancy-logo-url.helpers';
import { GEEKJOB_LOGO_ALLOWED_HOST_PATTERN } from './geekjob.constants';
import {
  readGeekjobCompanyName,
  readGeekjobLogoSrc,
  readGeekjobTitle,
} from './geekjob-html.helpers';

/**
 * §4.3, §4.10, §4.13: разбор страницы вакансии geekjob.ru для синхронизации. Чистая
 * функция, как и parseItVacanciesVacancyPage/parseHhVacancyPage: без зависимостей и
 * состояния, никогда не бросает.
 *
 * Отсутствие заголовка — fail-loud null (исход ERROR): значит вёрстка изменилась, и
 * молча писать «вакансия активна» на основании нераспознанной страницы нельзя.
 * «Вакансии нет» приезжает статусом 404 (проверено live), а не пустой страницей,
 * поэтому третьего состояния (как ABSENT у getmatch) здесь не нужно.
 *
 * archived — всегда false: см. §4.13, «НЕ ПРОВЕРЕНО». Ни на актуальной, ни на
 * архивной (2022 год) живой странице маркера снятия нет, обе отвечают 200 и
 * рендерят кнопку «Откликнуться». Единственный надёжный признак архивности —
 * log.archived из JSON выдачи (§4.11.3), а он недоступен по одному id — только
 * в постраничном списке.
 */
export function parseGeekjobVacancyPage(html: unknown, siteBaseUrl: string): Vacancy | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const name = readGeekjobTitle(html);

  if (name === null) {
    return null;
  }

  const logoUrl = resolveVacancyLogoUrl(
    readGeekjobLogoSrc(html),
    siteBaseUrl,
    GEEKJOB_LOGO_ALLOWED_HOST_PATTERN,
  );

  return {
    name,
    archived: false,
    employerName: readGeekjobCompanyName(html),
    logoUrl,
    // Тот же allow-list, которым уже проверили logoUrl (§4.10) — CompanyLogoService
    // повторит эту проверку на каждом хопе редиректа, а не только на исходном URL.
    logoAllowedHostPattern: logoUrl === null ? null : GEEKJOB_LOGO_ALLOWED_HOST_PATTERN,
  };
}
