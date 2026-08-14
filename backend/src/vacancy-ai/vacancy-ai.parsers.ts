import { VACANCY_AI_VERDICT_FIELD, VACANCY_AI_VERDICTS_FIELD } from './vacancy-ai.constants';
import type { AiTitleVerdict } from './vacancy-ai.interfaces';

/**
 * Сужение unknown → провалидированные вердикты модели (§4.12.3). Общие
 * unknown-narrowing хелперы (isRecord/readString/…) объявлены здесь же, а не
 * переиспользованы из hh/hh-json-ld.helpers.ts: модуль vacancy-ai не должен знать
 * про hh.ru, а копия трёх однострочных функций дешевле лишней межмодульной связи.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === 'string' ? value : null;
}

export function readBoolean(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key];

  return typeof value === 'boolean' ? value : null;
}

export function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];

  return typeof value === 'number' ? value : null;
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * §4.12.3: схема оборачивает массив в { verdicts: [...] } (root OpenAI-схемы обязан
 * быть объектом), но принимаем и голый массив — Ollama не требует root-объект,
 * и не всякая модель дословно следует обёртке.
 */
function extractVerdictEntries(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    // Array.isArray сужает unknown до any[] (сигнатура lib.es5) — приводим обратно к unknown[].
    return value as unknown[];
  }

  if (isRecord(value) && Array.isArray(value[VACANCY_AI_VERDICTS_FIELD])) {
    return value[VACANCY_AI_VERDICTS_FIELD] as unknown[];
  }

  return null;
}

function parseTitleVerdictEntry(entry: unknown): AiTitleVerdict | null {
  if (!isRecord(entry)) {
    return null;
  }

  const index = readNumber(entry, VACANCY_AI_VERDICT_FIELD.INDEX);
  const matches = readBoolean(entry, VACANCY_AI_VERDICT_FIELD.MATCHES);
  const reason = readString(entry, VACANCY_AI_VERDICT_FIELD.REASON);

  if (index === null || matches === null || reason === null) {
    return null;
  }

  return { index, matches, reason };
}

/**
 * §4.12.3: длина массива обязана совпасть ровно с размером батча — иначе весь батч
 * уходит в фолбэк на ключевые слова (несовпадение длины — тот же класс сбоя, что
 * невалидный JSON). Соответствие «вердикт → название» — по ПОЗИЦИИ в массиве, а не по
 * полю index: промпт требует «в том же порядке», и это единственная гарантия,
 * на которую вызывающий (vacancy-scan.service.ts) может положиться.
 */
export function parseTitleVerdicts(content: string, expectedLength: number): AiTitleVerdict[] | null {
  const parsed = parseJson(content);

  if (parsed === null) {
    return null;
  }

  const entries = extractVerdictEntries(parsed);

  if (entries === null || entries.length !== expectedLength) {
    return null;
  }

  const verdicts: AiTitleVerdict[] = [];

  for (const entry of entries) {
    const verdict = parseTitleVerdictEntry(entry);

    if (verdict === null) {
      return null;
    }

    verdicts.push(verdict);
  }

  return verdicts;
}

/** §4.12.3: схема этапа 4 — один объект { matches, reason }, без обёртки. */
export function parseDescriptionVerdict(content: string): { matches: boolean; reason: string } | null {
  const parsed = parseJson(content);

  if (!isRecord(parsed)) {
    return null;
  }

  const matches = readBoolean(parsed, VACANCY_AI_VERDICT_FIELD.MATCHES);
  const reason = readString(parsed, VACANCY_AI_VERDICT_FIELD.REASON);

  if (matches === null || reason === null) {
    return null;
  }

  return { matches, reason };
}
