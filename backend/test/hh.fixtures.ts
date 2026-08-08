import type { HhPageFixtureOptions } from './e2e.interfaces';
import { TEST_VACANCY_ID } from './test.constants';

/**
 * Провенанс шаблона: два реальных URL с hh.ru, на которых сверялась разметка —
 * https://hh.ru/vacancy/133230073 (открытая, «ITea RS d.o.o.» /
 * «Back-end Node. JS-developer (Senior)») и https://hh.ru/vacancy/134496202
 * (архивная, «WEKINGS» / «Middle Backend Developer (Node js)»). Реальную страницу
 * (~772 КБ) в репозиторий не кладём — ниже минимальный шаблон, воспроизводящий
 * только те фрагменты разметки, которые разбирает hh-page.parser.ts: JSON-LD
 * JobPosting и токены archived (обычный и HTML-экранированный варианты кавычек).
 */

const DEFAULT_TITLE = 'Node.js Developer';
const DEFAULT_EMPLOYER_NAME = 'Acme';

function resolveField(value: string | null | undefined, fallback: string): string | null {
  return value === undefined ? fallback : value;
}

function buildJsonLdBlock(title: string | null, employerName: string | null): string {
  const jobPosting: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    datePosted: '2026-01-01T00:00:00+0300',
    validThrough: '2026-02-01T00:00:00+0300',
  };

  if (title !== null) {
    jobPosting.title = title;
  }

  if (employerName !== null) {
    jobPosting.hiringOrganization = { '@type': 'Organization', name: employerName };
  }

  return `<script type="application/ld+json">${JSON.stringify(jobPosting)}</script>`;
}

/**
 * Токены признака архивности (§4.1): 'both' — обычная и HTML-экранированная форма,
 * согласованные с archived; 'none' — ни одного токена (страница «не распознана»);
 * 'conflicting' — токены противоречат друг другу (страница тоже «не распознана»).
 * data-qa-маркер архивной страницы добавляется только в согласованном случае
 * ('both') и только при archived === true — иначе он сам стал бы лишним сигналом
 * в тестах на отсутствие/противоречие признака.
 */
function buildArchivedMarkup(mode: 'both' | 'none' | 'conflicting', archived: boolean): string {
  if (mode === 'none') {
    return '';
  }

  if (mode === 'conflicting') {
    return (
      `<div data-params='{"vacancyId":"${TEST_VACANCY_ID}","archived": "true"}'></div>` +
      `<div data-state="{&#34;status&#34;:{&#34;active&#34;:true,&#34;archived&#34;:false}}"></div>`
    );
  }

  const flag = archived ? 'true' : 'false';
  const marker = archived
    ? '<span data-qa="vacancy-title-archived-text">Вакансия в архиве</span>'
    : '';

  return (
    `${marker}` +
    `<div data-params='{"vacancyId":"${TEST_VACANCY_ID}","archived": "${flag}"}'></div>` +
    `<div data-state="{&#34;status&#34;:{&#34;active&#34;:true,&#34;archived&#34;:${flag}}}"></div>`
  );
}

/**
 * Строит минимальную HTML-страницу вакансии hh.ru для тестов hh-page.parser.ts
 * (через hh-api.service.spec.ts) и e2e (hh-preview.e2e-spec.ts). Не дамп реальной
 * страницы, а шаблон из тех фрагментов, которые разбирает парсер.
 */
export function buildHhVacancyPage(options: HhPageFixtureOptions = {}): string {
  const {
    title,
    employerName,
    archived = false,
    withJsonLd = true,
    brokenJsonLd = false,
    archivedTokens = 'both',
  } = options;

  const resolvedTitle = resolveField(title, DEFAULT_TITLE);
  const resolvedEmployerName = resolveField(employerName, DEFAULT_EMPLOYER_NAME);

  const jsonLd = brokenJsonLd
    ? '<script type="application/ld+json">{это не json,,,}</script>'
    : withJsonLd
      ? buildJsonLdBlock(resolvedTitle, resolvedEmployerName)
      : '';

  return (
    '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">' +
    `<meta property="og:title" content="${resolvedTitle ?? 'Вакансия'}">` +
    `${jsonLd}` +
    '</head><body>' +
    `<div data-qa="vacancy-title">${resolvedTitle ?? ''}</div>` +
    buildArchivedMarkup(archivedTokens, archived) +
    '</body></html>'
  );
}
