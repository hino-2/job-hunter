import { OPENAI_STRICT_UNSUPPORTED_SCHEMA_KEYWORDS } from './vacancy-ai.constants';
import { isRecord } from './vacancy-ai.parsers';

/**
 * §4.12.3: OpenAI structured outputs с strict: true отвечает 400 на неподдерживаемые
 * ключевые слова валидации JSON Schema (maxLength в их числе) — общая схема
 * (vacancy-ai.constants.ts) остаётся источником истины в одном месте, а протокольная
 * особенность OpenAI живёт в адаптере, а не просачивается в схему, которой пользуется
 * и Ollama.
 */
function stripUnsupportedSchemaValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Array.isArray сужает unknown до any[] (сигнатура lib.es5) — приводим обратно к unknown[].
    return (value as unknown[]).map((entry) => stripUnsupportedSchemaValue(entry));
  }

  if (isRecord(value)) {
    return stripUnsupportedSchemaKeywords(value);
  }

  return value;
}

export function stripUnsupportedSchemaKeywords(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (OPENAI_STRICT_UNSUPPORTED_SCHEMA_KEYWORDS.includes(key)) {
      continue;
    }

    result[key] = stripUnsupportedSchemaValue(value);
  }

  return result;
}
