import { HTML_ANY_TAG_PATTERN } from '../common/common.constants';
import { extractBalancedDivBlock, unescapeHtmlEntities } from '../common/html.helpers';
import {
  GEEKJOB_BACKGROUND_IMAGE_URL_PATTERN,
  GEEKJOB_COMPANY_BLOCK_PATTERN,
  GEEKJOB_DESCRIPTION_BLOCK_OPEN_PATTERN,
  GEEKJOB_FIRST_ANCHOR_PATTERN,
  GEEKJOB_LOGO_BOX_PATTERN,
  GEEKJOB_TITLE_PATTERN,
  GEEKJOB_WHITESPACE_RUN_PATTERN,
} from './geekjob.constants';

/** Вырезает теги, раскрывает сущности и схлопывает пробельные серии — общий финальный шаг. */
function cleanText(raw: string): string {
  const withoutTags = raw.replace(HTML_ANY_TAG_PATTERN, ' ');

  return unescapeHtmlEntities(withoutTags).replace(GEEKJOB_WHITESPACE_RUN_PATTERN, ' ').trim();
}

/**
 * §4.13: заголовок вакансии — ровно один <h1> на странице (проверено на живых
 * образцах), безопасный якорь без риска захватить чужой заголовок.
 */
export function readGeekjobTitle(html: string): string | null {
  const match = GEEKJOB_TITLE_PATTERN.exec(html);
  const raw = match?.[1];

  if (raw === undefined) {
    return null;
  }

  const title = cleanText(raw);

  return title.length === 0 ? null : title;
}

/**
 * §4.13: название работодателя — первая ссылка внутри <h5 class="… company-name …">.
 * Вторая ссылка того же блока (id="company-web") — сайт компании, её текст сюда не
 * нужен.
 */
export function readGeekjobCompanyName(html: string): string | null {
  const block = GEEKJOB_COMPANY_BLOCK_PATTERN.exec(html)?.[1];

  if (block === undefined) {
    return null;
  }

  const anchor = GEEKJOB_FIRST_ANCHOR_PATTERN.exec(block)?.[1];

  if (anchor === undefined) {
    return null;
  }

  const name = cleanText(anchor);

  return name.length === 0 ? null : name;
}

/**
 * §4.13/§4.10: src логотипа ТЕКУЩЕЙ вакансии — background-image внутри #logo-box.
 *
 * ВАЖНО: никогда не сопоставлять по классу company-list-logo — тот принадлежит
 * карточкам «похожих вакансий» в сайдбаре, то есть чужим компаниям. #logo-box —
 * единственный блок, который несёт логотип компании именно этой страницы.
 */
export function readGeekjobLogoSrc(html: string): string | null {
  const block = GEEKJOB_LOGO_BOX_PATTERN.exec(html)?.[1];

  if (block === undefined) {
    return null;
  }

  return GEEKJOB_BACKGROUND_IMAGE_URL_PATTERN.exec(block)?.[1] ?? null;
}

/**
 * §4.11.7: внутренний HTML блока <div id="vacancy-description"> — полное описание
 * вакансии. Тот же алгоритм счётчика вложенности, что у it-vacancies.ru (§4.13,
 * common/html.helpers.ts).
 */
export function extractGeekjobDescriptionBlock(html: string): string | null {
  return extractBalancedDivBlock(html, GEEKJOB_DESCRIPTION_BLOCK_OPEN_PATTERN);
}
