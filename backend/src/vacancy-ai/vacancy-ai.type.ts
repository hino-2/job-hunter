import type { AI_FAILURE_KIND } from './vacancy-ai.constants';
import type { AiFailure, AiTitleVerdict } from './vacancy-ai.interfaces';

/** §4.12.3: два класса сбоя ИИ-отбора — недоступность провайдера либо непригодный ответ. */
export type AiFailureKind = (typeof AI_FAILURE_KIND)[keyof typeof AI_FAILURE_KIND];

/** Результат одного запроса к модели: текст ответа (ещё не разобранный JSON) либо сбой с классом. */
export type AiChatResult = { ok: true; content: string } | AiFailure;

/** §4.12.4: результат GET /api/tags (Ollama) / GET /v1/models (OpenAI) — имена доступных моделей. */
export type AiModelListResult = { ok: true; models: string[] } | { ok: false; reason: string };

/**
 * §4.12.4/§4.11.9: результат прогрева модели перед прогоном — та же форма, что у
 * AiModelListResult, а не AiFailure: ничего не парсится (тело ответа не читается,
 * см. ollama-ai.provider.ts), значит и различать INVALID_RESPONSE не от чего.
 */
export type AiWarmUpResult = { ok: true } | { ok: false; reason: string };

/**
 * §4.11.4 этап 1 / §4.12.3: недоступность транспорта → { kind: UNAVAILABLE }, run
 * останавливается (§4.11.12); невалидный JSON или длина массива вердиктов ≠ размеру
 * батча → { kind: INVALID_RESPONSE }, пропускается только этот батч (aiSkipped).
 */
export type AiTitleBatchResult = { ok: true; verdicts: AiTitleVerdict[] } | AiFailure;

/**
 * §4.11.4 этап 4: reason уже обрезан вызывающим (vacancy-lead.builder.ts) — здесь он
 * «как есть». Тот же смысл kind, что у AiTitleBatchResult, плюс ungrounded evidence —
 * тоже INVALID_RESPONSE (§4.12.3).
 */
export type AiDescriptionResult = { ok: true; matches: boolean; reason: string } | AiFailure;
