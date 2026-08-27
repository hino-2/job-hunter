import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { clampText } from '../common/text.helpers';
import {
  VACANCY_AI_COMPANY_PLACEHOLDER,
  VACANCY_AI_DESCRIPTION_JSON_SCHEMA,
  VACANCY_AI_DESCRIPTION_MAX_CHARS_ENV_KEY,
  VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS,
  VACANCY_AI_DESCRIPTION_PLACEHOLDER,
  VACANCY_AI_EVIDENCE_LOG_MAX_CHARS,
  VACANCY_AI_EVIDENCE_UNGROUNDED_MESSAGE,
  VACANCY_AI_INVALID_RESPONSE_MESSAGE,
  VACANCY_AI_KEYWORDS_JOIN_SEPARATOR,
  VACANCY_AI_KEYWORDS_PLACEHOLDER,
  VACANCY_AI_MODEL_ENV_KEY,
  VACANCY_AI_PROVIDER_TOKEN,
  VACANCY_AI_TIMEOUT_MS_ENV_KEY,
  VACANCY_AI_TITLE_JSON_SCHEMA,
  VACANCY_AI_TITLE_PLACEHOLDER,
  VACANCY_AI_TITLES_PLACEHOLDER,
} from './vacancy-ai.constants';
import {
  formatTitlesBlock,
  isEvidenceGrounded,
  renderPrompt,
  resolveTitleMaxOutputTokens,
} from './vacancy-ai.helpers';
import type {
  AiDescriptionRequest,
  AiJsonSchema,
  AiProvider,
  AiTitleBatchRequest,
} from './vacancy-ai.interfaces';
import { parseDescriptionVerdict, parseTitleVerdicts } from './vacancy-ai.parsers';
import type { AiChatResult, AiDescriptionResult, AiTitleBatchResult } from './vacancy-ai.type';

function describeChatFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * §4.12: единственная точка общения с моделью для конвейера отбора (vacancy-scan.service.ts,
 * шаг B7). Рендерит промпт из настроек (§4.12.2) подстановкой плейсхолдеров, зовёт
 * AiProvider, сужает ответ через vacancy-ai.parsers.ts, обрезает описание по
 * VACANCY_AI_DESCRIPTION_MAX_CHARS ДО отправки (§4.11.7 — экономия токенов, а не
 * обрезка уже полученного вердикта).
 *
 * Любой сбой — таймаут, недоступный контейнер, невалидный JSON, несовпадение длины
 * массива вердиктов с батчем, а на этапе описания ещё и цитата (evidence), не
 * найденная в реальном тексте описания (isEvidenceGrounded) — превращается в
 * { ok: false, reason } с warn в лог, без ретраев (§4.12.3: повтор к перегруженной
 * модели только удвоит ожидание) и без исключений наружу: конвейер сам решает про
 * фолбэк на ключевые слова.
 *
 * ai_title_reason/ai_description_reason НЕ обрезаются здесь по ширине колонки (500) —
 * это делает vacancy-lead.builder.ts, единственное место среза значений перед записью (§10).
 *
 * §4.12.3: каждый запрос к модели идёт с потолком генерации (maxOutputTokens —
 * AiChatRequest, num_predict/max_tokens у адаптеров). Генерация, оборванная этим
 * потолком, даёт невалидный/неполный JSON — то есть намеренно тот же класс сбоя, что
 * и невалидный ответ модели: { ok: false }, фолбэк на ключевые слова, счётчик
 * aiFallbacks и warn в лог, никакого отдельного пути обработки не заводится. Потолок —
 * это ГРАНИЦА, а не резервирование: недогенерированные токены ничего не стоят, поэтому
 * щедрый потолок бесплатен в обычном случае, а его единственная задача — остановить
 * убежавшую генерацию. Отсюда правило выбора значений (vacancy-ai.constants.ts): каждый
 * потолок обязан лежать заметно выше точки насыщения JSON Schema, которую он ограничивает,
 * иначе он режет легитимный многословный, но валидный по схеме ответ раньше, чем модель
 * успевает закрыть JSON. Рост aiFallbacks после смены этих значений — сигнал, что потолок
 * всё ещё занижен относительно схемы, а не что модель стала хуже отвечать.
 */
@Injectable()
export class VacancyAiService {
  private readonly logger = new Logger(VacancyAiService.name);
  readonly model: string;
  private readonly timeoutMs: number;
  private readonly descriptionMaxChars: number;

  constructor(
    @Inject(VACANCY_AI_PROVIDER_TOKEN) private readonly provider: AiProvider,
    configService: ConfigService,
  ) {
    this.model = configService.getOrThrow<string>(VACANCY_AI_MODEL_ENV_KEY);
    this.timeoutMs = configService.getOrThrow<number>(VACANCY_AI_TIMEOUT_MS_ENV_KEY);
    this.descriptionMaxChars = configService.getOrThrow<number>(
      VACANCY_AI_DESCRIPTION_MAX_CHARS_ENV_KEY,
    );
  }

  async judgeTitles(request: AiTitleBatchRequest): Promise<AiTitleBatchResult> {
    if (request.items.length === 0) {
      return { ok: true, verdicts: [] };
    }

    const prompt = renderPrompt(request.titlePrompt, {
      [VACANCY_AI_KEYWORDS_PLACEHOLDER]: request.keywords.join(VACANCY_AI_KEYWORDS_JOIN_SEPARATOR),
      [VACANCY_AI_TITLES_PLACEHOLDER]: formatTitlesBlock(request.items),
    });

    const chatResult = await this.chat(
      prompt,
      VACANCY_AI_TITLE_JSON_SCHEMA,
      resolveTitleMaxOutputTokens(request.items.length),
    );

    if (!chatResult.ok) {
      this.logger.warn(`ИИ по названию недоступен: ${chatResult.reason}`);

      return { ok: false, reason: chatResult.reason };
    }

    const verdicts = parseTitleVerdicts(chatResult.content, request.items.length);

    if (verdicts === null) {
      this.logger.warn(
        `ИИ по названию вернул невалидный ответ (ожидался массив вердиктов длиной ${request.items.length})`,
      );

      return { ok: false, reason: VACANCY_AI_INVALID_RESPONSE_MESSAGE };
    }

    return { ok: true, verdicts };
  }

  async judgeDescription(request: AiDescriptionRequest): Promise<AiDescriptionResult> {
    const description = clampText(request.description, this.descriptionMaxChars);

    const prompt = renderPrompt(request.descriptionPrompt, {
      [VACANCY_AI_KEYWORDS_PLACEHOLDER]: request.keywords.join(VACANCY_AI_KEYWORDS_JOIN_SEPARATOR),
      [VACANCY_AI_TITLE_PLACEHOLDER]: request.title,
      [VACANCY_AI_COMPANY_PLACEHOLDER]: request.company,
      [VACANCY_AI_DESCRIPTION_PLACEHOLDER]: description,
    });

    const chatResult = await this.chat(
      prompt,
      VACANCY_AI_DESCRIPTION_JSON_SCHEMA,
      VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS,
    );

    if (!chatResult.ok) {
      this.logger.warn(`ИИ по описанию недоступен: ${chatResult.reason}`);

      return { ok: false, reason: chatResult.reason };
    }

    const verdict = parseDescriptionVerdict(chatResult.content);

    if (verdict === null) {
      this.logger.warn('ИИ по описанию вернул невалидный ответ');

      return { ok: false, reason: VACANCY_AI_INVALID_RESPONSE_MESSAGE };
    }

    // §4.12.3: цитата проверяется ТОЛЬКО при matches === true — при отрицательном
    // вердикте ничего не сохраняется, значит сфабрикованная цитата ничего не стоит,
    // а требование проверять её и там превратило бы верный reject в фолбэк, который
    // ещё мог бы создать лид. Сверяем с ТОЙ ЖЕ обрезанной description, что реально
    // ушла модели (переменная выше), а не с исходным request.description.
    if (verdict.matches && !isEvidenceGrounded(verdict.evidence, description)) {
      this.logger.warn(
        `ИИ по описанию сослался на текст, которого нет в описании: ` +
          `«${clampText(verdict.evidence, VACANCY_AI_EVIDENCE_LOG_MAX_CHARS)}»`,
      );

      return { ok: false, reason: VACANCY_AI_EVIDENCE_UNGROUNDED_MESSAGE };
    }

    return { ok: true, matches: verdict.matches, reason: verdict.reason };
  }

  /** §4.12.4: проверка при старте (VacancyAiCheckService) — не роняет процесс, только warn. */
  async checkModelAvailable(): Promise<boolean> {
    const result = await this.provider.listModels();

    return result.ok && result.models.includes(this.model);
  }

  /** try/catch — защита в глубину: оба адаптера уже не бросают, но контракт AiProvider этого не гарантирует извне. */
  private async chat(
    prompt: string,
    jsonSchema: AiJsonSchema,
    maxOutputTokens: number,
  ): Promise<AiChatResult> {
    try {
      return await this.provider.chat({
        model: this.model,
        prompt,
        jsonSchema,
        timeoutMs: this.timeoutMs,
        maxOutputTokens,
      });
    } catch (error) {
      return { ok: false, reason: describeChatFailure(error) };
    }
  }
}
