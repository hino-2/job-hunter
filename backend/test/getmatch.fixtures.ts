import type { GetmatchPageFixtureOptions } from './e2e.interfaces';
import { TEST_GETMATCH_VACANCY_ID } from './test.constants';

/**
 * Провенанс шаблона: разведка (`getmatch-research.md`) сняла разметку с трёх живых
 * страниц getmatch.ru — активной, снятой (`is_active: false`) и несуществующей
 * (`initialVacancy: null` при HTTP 200). Ниже не дамп реальной страницы (~300 КБ),
 * а минимальный шаблон, воспроизводящий только то, что разбирает
 * getmatch-page.parser.ts: несколько тегов self.__next_f.push и ключ
 * "initialVacancy" внутри склеенного из них payload.
 */

const DEFAULT_POSITION = 'Node.js Developer';

const DEFAULT_COMPANY_NAME = 'Acme';

const DEFAULT_CHUNK_COUNT = 3;

/**
 * Длина префикса перед разрезом ключа "initialVacancy" — заведомо меньше длины
 * самого ключа (17 символов), поэтому разрез приходится строго на середину
 * буквенной части ключа, а не на его границу.
 */
const KEY_SPLIT_OFFSET = 4;

/** self.__next_f.push([1,"..."]) — тот же формат, что отдаёт браузеру Next.js. */
function buildFlightScript(payload: string): string {
  const literal = JSON.stringify([1, payload]);

  return `<script>self.__next_f.push(${literal})</script>`;
}

/**
 * Фрагмент flight-payload с самим ключом initialVacancy: объект вакансии, null
 * (снята/не существует) или вовсе без ключа (страница не распознана) — три
 * состояния §4.9. offer_description нарочно содержит фигурные скобки и
 * экранированную кавычку — ровно то, что обязан пережить посимвольный скан
 * баланса скобок extractJsonObject (§9).
 */
function buildInitialVacancyFragment(options: GetmatchPageFixtureOptions): string {
  const {
    position = DEFAULT_POSITION,
    companyName = DEFAULT_COMPANY_NAME,
    isActive = true,
    initialVacancy = 'object',
  } = options;

  if (initialVacancy === 'missing') {
    return '"someOtherField":123';
  }

  if (initialVacancy === 'null') {
    return '"initialVacancy":null';
  }

  const vacancy = {
    id: Number(TEST_GETMATCH_VACANCY_ID),
    is_active: isActive,
    position,
    company: { name: companyName },
    offer_description: 'Стек: {React}, \\"NestJS\\" и { PostgreSQL }',
  };

  return `"initialVacancy":${JSON.stringify(vacancy)}`;
}

/**
 * Строит минимальную HTML-страницу вакансии getmatch.ru для e2e (§4.9, §9):
 * несколько чанков self.__next_f.push, а сам фрагмент с ключом initialVacancy
 * разрезан ПОСЕРЕДИНЕ ключа между двумя чанками — без этого тест не проверяет
 * склейку payload, обязательную для getmatch-page.parser.ts.
 */
export function buildGetmatchVacancyPage(options: GetmatchPageFixtureOptions = {}): string {
  const chunkCount = options.chunks ?? DEFAULT_CHUNK_COUNT;
  const fragment = buildInitialVacancyFragment(options);
  const splitAt = Math.min(KEY_SPLIT_OFFSET, fragment.length);

  const chunks = [
    `{"someField":1,${fragment.slice(0, splitAt)}`,
    `${fragment.slice(splitAt)},"trailingField":2}`,
  ];

  while (chunks.length < chunkCount) {
    chunks.push('{"noise":true}');
  }

  return (
    '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head><body>' +
    chunks.map(buildFlightScript).join('') +
    '</body></html>'
  );
}
