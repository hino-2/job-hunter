import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HhSearchService } from '../hh/hh-search.service';
import type { HhSearchItem } from '../hh/hh.interfaces';
import type { HhDescriptionResult } from '../hh/hh.type';
import { CompanyLogoService } from '../logos/company-logo.service';
import { VACANCY_AI_BATCH_SIZE_ENV_KEY } from '../vacancy-ai/vacancy-ai.constants';
import { VacancyAiService } from '../vacancy-ai/vacancy-ai.service';
import { buildDedupKey, derivePublishedOn, serializeDedupKey } from './vacancy-lead-key.helpers';
import { buildVacancyLeadRow } from './vacancy-lead.builder';
import { VacancyLeadsService } from './vacancy-leads.service';
import { hasExcluded, isKeywordMatch, matchKeywords } from './vacancy-keywords.helpers';
import { resolveLastPageIndex, resolveTotalPages } from './vacancy-scan-progress.helpers';
import { isExhaustedStop, isResumablePosition } from './vacancy-scan-position.helpers';
import { VacancyScanPositionService } from './vacancy-scan-position.service';
import { VacancyScanStateService } from './vacancy-scan-state.service';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';
import {
  MATCH_SOURCE,
  MS_IN_DAY,
  SCAN_STOPPED_REASON,
  VACANCY_MATCH_MODE_ENV_KEY,
  VACANCY_PREFILTER_MODE_ENV_KEY,
  VACANCY_SCAN_ALREADY_RUNNING_MESSAGE,
  VACANCY_SCAN_FINISHED_MESSAGE,
  VACANCY_SCAN_INITIAL_PAGE,
  VACANCY_SCAN_MAX_AGE_DAYS_ENV_KEY,
  VACANCY_SCAN_MAX_DETAILS_ENV_KEY,
  VACANCY_SCAN_MAX_DURATION_MS_ENV_KEY,
  VACANCY_SCAN_MAX_PAGES_ENV_KEY,
  VACANCY_SCAN_NO_RESUME_POSITION_MESSAGE,
  VACANCY_SCAN_NOT_RUNNING_MESSAGE,
  VACANCY_SCAN_STOP_REQUESTED_MESSAGE,
  VACANCY_SCAN_UNEXPECTED_ERROR_MESSAGE,
} from './vacancy-search.constants';
import type {
  ScanRunHandle,
  VacancyLeadLogoSource,
  VacancyScanDetailsBudget,
  VacancyScanSurvivor,
  VacancySearchSettingsSnapshot,
  VacancyTitleDecision,
} from './vacancy-search.interfaces';
import type { ScanMode, ScanStoppedReason, VacancyMatchMode, VacancyPrefilterMode } from './vacancy-search.type';

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * §4.10 (шаг №26 §14): логотип компании лида берётся из той же страницы вакансии,
 * что hhSearch.fetchVacancyDescription уже загрузила ради описания (§4.11.7) — оба
 * поля результата заполняются вместе (HhSearchService), поэтому null здесь означает
 * «источник логотип не дал», а не «данные неполные».
 */
function resolveLeadLogoSource(descriptionResult: HhDescriptionResult): VacancyLeadLogoSource | null {
  if (!descriptionResult.ok) {
    return null;
  }

  const { logoUrl, logoAllowedHostPattern } = descriptionResult;

  if (logoUrl === null || logoAllowedHostPattern === null) {
    return null;
  }

  return { logoUrl, allowedHostPattern: logoAllowedHostPattern };
}

/**
 * §4.11.4 этап 0: стоп-слова — всегда (кроме VACANCY_PREFILTER_MODE=off); режим 'full'
 * дополнительно требует деterministic-совпадения включающих ключевых слов — дешёвый
 * пре-фильтр перед ИИ. Включающие слова на этапе 0 в дефолтном режиме НЕ проверяются:
 * их семантику оценивает модель (§4.11.4).
 */
function passesPrefilter(
  title: string,
  settings: VacancySearchSettingsSnapshot,
  mode: VacancyPrefilterMode,
  matchMode: VacancyMatchMode,
): boolean {
  if (mode === 'off') {
    return true;
  }

  if (hasExcluded(title, settings.excludeKeywords)) {
    return false;
  }

  if (mode === 'full') {
    const matched = matchKeywords(title, settings.keywords);

    return isKeywordMatch(matched, settings.keywords.length, matchMode);
  }

  return true;
}

/**
 * §4.11: конвейер отбора «стоп-слова → дедупликация → ИИ по названию → загрузка
 * страницы → ИИ по описанию» (§4.11.4). Публичные входы — start(mode) и
 * requestStop() (§4.11.12). start() резолвит стартовую страницу (снимок настроек,
 * для RESUME — сохранённая позиция), а затем СИНХРОННО вызывает
 * VacancyScanStateService.tryStart() (§4.11.9) — единственный check-and-set,
 * второй POST /scan при идущем прогоне получает 409 ДО первого await ниже него.
 *
 * Настройки поиска берутся снимком РОВНО ОДИН РАЗ на старте прогона (§5.7) —
 * VacancySearchSettingsService.getSnapshot(), передаются в run() параметром.
 * Бюджеты и режимы читаются в конструкторе (env не меняется без рестарта — §2.4).
 */
@Injectable()
export class VacancyScanService {
  private readonly logger = new Logger(VacancyScanService.name);
  private readonly maxPages: number;
  private readonly maxDetails: number;
  private readonly maxAgeDays: number;
  private readonly maxDurationMs: number;
  private readonly prefilterMode: VacancyPrefilterMode;
  private readonly matchMode: VacancyMatchMode;
  private readonly aiBatchSize: number;

  constructor(
    private readonly state: VacancyScanStateService,
    private readonly settingsService: VacancySearchSettingsService,
    private readonly position: VacancyScanPositionService,
    private readonly hhSearch: HhSearchService,
    private readonly leadsService: VacancyLeadsService,
    private readonly aiService: VacancyAiService,
    private readonly logos: CompanyLogoService,
    configService: ConfigService,
  ) {
    this.maxPages = configService.getOrThrow<number>(VACANCY_SCAN_MAX_PAGES_ENV_KEY);
    this.maxDetails = configService.getOrThrow<number>(VACANCY_SCAN_MAX_DETAILS_ENV_KEY);
    this.maxAgeDays = configService.getOrThrow<number>(VACANCY_SCAN_MAX_AGE_DAYS_ENV_KEY);
    this.maxDurationMs = configService.getOrThrow<number>(VACANCY_SCAN_MAX_DURATION_MS_ENV_KEY);
    this.prefilterMode = configService.getOrThrow<VacancyPrefilterMode>(VACANCY_PREFILTER_MODE_ENV_KEY);
    this.matchMode = configService.getOrThrow<VacancyMatchMode>(VACANCY_MATCH_MODE_ENV_KEY);
    this.aiBatchSize = configService.getOrThrow<number>(VACANCY_AI_BATCH_SIZE_ENV_KEY);
  }

  /**
   * §5.7 POST /api/vacancy-leads/scan: отвечает сразу (202), прогон уходит в фон.
   * mode === 'RESUME' требует валидную сохранённую позицию (§4.11.12) — иначе 409
   * с отдельным сообщением, не путать с «прогон уже идёт».
   *
   * ВАЖНО: между this.state.tryStart(startPage) и void this.run(...) НЕ ДОЛЖНО быть
   * ни одного await — иначе tryStart() перестаёт быть единственным арбитром
   * конкурентности и два одновременных RESUME могли бы породить два прогона.
   */
  async start(mode: ScanMode): Promise<Date> {
    const settings = await this.settingsService.getSnapshot();
    let startPage: number = VACANCY_SCAN_INITIAL_PAGE;

    if (mode === 'RESUME') {
      const position = await this.position.load();

      if (!isResumablePosition(position, settings.searchText, this.maxPages)) {
        throw new ConflictException(VACANCY_SCAN_NO_RESUME_POSITION_MESSAGE);
      }

      startPage = position.nextPage;
    }

    const handle = this.state.tryStart(startPage);

    if (handle === null) {
      throw new ConflictException(VACANCY_SCAN_ALREADY_RUNNING_MESSAGE);
    }

    const startedAt = new Date();

    // void: run() сама ловит все ошибки (try/finally на state.finish) — необработанный
    // реджект уронил бы процесс (Node --unhandled-rejections=throw), тот же приём,
    // что у ScheduledSyncService.runScheduledSync (§4.7).
    void this.run(handle, settings, startPage);

    return startedAt;
  }

  /**
   * §4.11.12: отмена приходит из другого HTTP-запроса — сюда только через
   * VacancyScanStateService.requestStop(), который сам решает, идёт ли прогон.
   */
  requestStop(): void {
    if (!this.state.requestStop()) {
      throw new ConflictException(VACANCY_SCAN_NOT_RUNNING_MESSAGE);
    }

    this.logger.log(VACANCY_SCAN_STOP_REQUESTED_MESSAGE);
  }

  /** ОБЯЗАН вызывать state.finish() на любом пути, включая исключение — иначе статус навсегда останется RUNNING. */
  private async run(
    handle: ScanRunHandle,
    settings: VacancySearchSettingsSnapshot,
    startPage: number,
  ): Promise<void> {
    let stoppedReason: ScanStoppedReason = SCAN_STOPPED_REASON.COMPLETED;
    let message: string | null = null;
    let resumePage = startPage;

    try {
      // startPage === 0 заодно стирает позицию прошлого прогона: свежий прогон,
      // умерший на нулевой странице, не должен оставлять после себя нечего продолжать.
      await this.position.save(startPage, settings.searchText);

      const deadlineAt = Date.now() + this.maxDurationMs;
      const ageCutoffMs = Date.now() - this.maxAgeDays * MS_IN_DAY;
      const seenInRun = new Set<string>();
      const detailsBudget: VacancyScanDetailsBudget = { opened: 0 };
      let lastPage: number | null = null;
      let outcome: ScanStoppedReason | null = null;

      for (let page = startPage; page < this.maxPages; page += 1) {
        if (lastPage !== null && page > lastPage) {
          outcome = SCAN_STOPPED_REASON.LAST_PAGE;
          break;
        }

        if (handle.isStopRequested()) {
          outcome = SCAN_STOPPED_REASON.STOPPED;
          break;
        }

        if (Date.now() >= deadlineAt) {
          outcome = SCAN_STOPPED_REASON.DEADLINE;
          break;
        }

        handle.setCurrentPage(page);
        resumePage = page;

        const pageResult = await this.hhSearch.fetchSearchPage(settings.searchText, page);

        if (!pageResult.ok) {
          // §4.11.3: неразбираемая страница выдачи — fail-loud, останов прогона.
          outcome = SCAN_STOPPED_REASON.ERROR;
          message = pageResult.message;
          break;
        }

        handle.increment('pagesFetched');
        handle.increment('itemsSeen', pageResult.page.items.length);
        handle.increment('skippedInvalid', pageResult.page.skippedInvalid);

        if (pageResult.page.lastPage !== null) {
          lastPage = resolveLastPageIndex(pageResult.page.lastPage, this.maxPages);
          handle.setTotalPages(resolveTotalPages(lastPage, this.maxPages));
        }

        if (pageResult.page.items.length === 0) {
          // §4.11.1: короткая пагинация без lastPage — конец выдачи сигнализирует пустая страница.
          outcome = SCAN_STOPPED_REASON.COMPLETED;
          break;
        }

        const pageStop = await this.processPage(
          pageResult.page.items,
          settings,
          handle,
          seenInRun,
          ageCutoffMs,
          deadlineAt,
          detailsBudget,
        );

        if (pageStop !== null) {
          outcome = pageStop;
          break;
        }

        // Страница обработана целиком — сохраняем позицию ДО следующей: SIGKILL
        // между страницами не должен стоить больше одной страницы (§4.11.12).
        resumePage = page + 1;
        await this.position.save(resumePage, settings.searchText);
      }

      stoppedReason = outcome ?? SCAN_STOPPED_REASON.MAX_PAGES;
    } catch (error) {
      stoppedReason = SCAN_STOPPED_REASON.ERROR;
      message = describeError(error);
      this.logger.error(VACANCY_SCAN_UNEXPECTED_ERROR_MESSAGE, message);
    } finally {
      // Порядок важен: GET .../scan/status, который первым увидит DONE, обязан уже
      // видеть финальную позицию (§4.11.12) — поэтому позиция пишется ДО state.finish().
      if (isExhaustedStop(stoppedReason)) {
        await this.position.clear();
      } else {
        await this.position.save(resumePage, settings.searchText);
      }

      this.state.finish(stoppedReason, message);
      this.logger.log(`${VACANCY_SCAN_FINISHED_MESSAGE}: ${stoppedReason}`);
    }
  }

  /** Обрабатывает одну страницу выдачи целиком; null — продолжать листать дальше. */
  private async processPage(
    items: readonly HhSearchItem[],
    settings: VacancySearchSettingsSnapshot,
    handle: ScanRunHandle,
    seenInRun: Set<string>,
    ageCutoffMs: number,
    deadlineAt: number,
    detailsBudget: VacancyScanDetailsBudget,
  ): Promise<ScanStoppedReason | null> {
    const survivors: VacancyScanSurvivor[] = [];
    let skippedOldOnPage = 0;

    for (const item of items) {
      const publishedAtMs = Date.parse(item.publishedAtIso);

      if (Number.isNaN(publishedAtMs) || publishedAtMs < ageCutoffMs) {
        handle.increment('skippedOld');
        skippedOldOnPage += 1;
        continue;
      }

      if (!passesPrefilter(item.position, settings, this.prefilterMode, this.matchMode)) {
        handle.increment('skippedExcluded');
        continue;
      }

      const dedupKey = buildDedupKey(item.company, item.position, derivePublishedOn(item.publishedAtIso));
      const serialized = serializeDedupKey(dedupKey);

      if (seenInRun.has(serialized)) {
        // §4.11.5 эшелон 1: региональные клоны — тождественные компания+должность+дата, до всякого ИИ.
        handle.increment('duplicates');
        continue;
      }

      seenInRun.add(serialized);
      survivors.push({ item, dedupKey });
    }

    if (items.length > 0 && skippedOldOnPage === items.length) {
      // §4.11.6: вся страница ушла в просроченные — при сортировке по свежести дальше будут только более старые.
      return SCAN_STOPPED_REASON.AGE_LIMIT;
    }

    if (survivors.length === 0) {
      return null;
    }

    // §4.11.5 эшелон 2: один SELECT по ключам страницы — ДО ИИ по названию. При 40
    // страницах большинство позиций уже в БД, и повторный ИИ-запрос по уже известному
    // названию — потерянные токены; last_seen_at при этом обновляется у КАЖДОГО
    // известного лида страницы, а не только у тех, что прошли бы ИИ.
    const existingByKey = await this.leadsService.findExistingKeys(
      survivors.map((survivor) => survivor.dedupKey),
    );
    const duplicateIds: string[] = [];
    const fresh: VacancyScanSurvivor[] = [];

    for (const survivor of survivors) {
      const existingId = existingByKey.get(serializeDedupKey(survivor.dedupKey));

      if (existingId !== undefined) {
        handle.increment('duplicates');
        duplicateIds.push(existingId);
        continue;
      }

      fresh.push(survivor);
    }

    await this.leadsService.touchLastSeen(duplicateIds);

    if (fresh.length === 0) {
      return null;
    }

    const decisions = await this.decideTitleMatches(fresh, settings, handle);
    const matched: VacancyTitleDecision[] = [];

    for (const decision of decisions) {
      if (decision.matches) {
        matched.push(decision);
      } else {
        handle.increment('rejectedTitle');
      }
    }

    if (matched.length === 0) {
      return null;
    }

    for (const decision of matched) {
      // §4.11.12: проверка ПЕРВОЙ — покрывает и ветку без ИИ (KEYWORDS) ниже, иначе
      // остановка не срабатывала бы, пока отбор идёт целиком по ключевым словам.
      if (handle.isStopRequested()) {
        return SCAN_STOPPED_REASON.STOPPED;
      }

      if (decision.matchSource === MATCH_SOURCE.KEYWORDS) {
        // §4.11.4: без ИИ (выключен или батч не ответил) описание не грузим —
        // этапы 3–4 пропускаются целиком, вакансия сразу идёт на вставку. Страница
        // вакансии не открывалась вовсе, поэтому логотипа взять неоткуда (§4.10).
        await this.insertLead(decision, handle, null, null);
        continue;
      }

      if (Date.now() >= deadlineAt) {
        return SCAN_STOPPED_REASON.DEADLINE;
      }

      if (detailsBudget.opened >= this.maxDetails) {
        return SCAN_STOPPED_REASON.MAX_DETAILS;
      }

      detailsBudget.opened += 1;
      await this.processDetail(decision, settings, handle);
    }

    return null;
  }

  /** §4.11.4 этап 2: ИИ батчами до VACANCY_AI_BATCH_SIZE либо (ИИ выключен/недоступен) ключевые слова. */
  private async decideTitleMatches(
    survivors: readonly VacancyScanSurvivor[],
    settings: VacancySearchSettingsSnapshot,
    handle: ScanRunHandle,
  ): Promise<VacancyTitleDecision[]> {
    if (!settings.aiEnabled) {
      return survivors.map((survivor) => this.decideByKeywordsOnly(survivor, settings));
    }

    const decisions: VacancyTitleDecision[] = [];

    for (let start = 0; start < survivors.length; start += this.aiBatchSize) {
      const chunk = survivors.slice(start, start + this.aiBatchSize);

      const aiResult = await this.aiService.judgeTitles({
        titlePrompt: settings.titlePrompt,
        keywords: settings.keywords,
        items: chunk.map((survivor) => ({
          title: survivor.item.position,
          company: survivor.item.company,
        })),
      });

      if (!aiResult.ok) {
        handle.increment('aiFallbacks');
        this.logger.warn(`Фолбэк на ключевые слова (батч названий): ${aiResult.reason}`);

        for (const survivor of chunk) {
          decisions.push(this.decideByKeywordsOnly(survivor, settings));
        }

        continue;
      }

      for (let index = 0; index < chunk.length; index += 1) {
        const survivor = chunk[index];
        const verdict = aiResult.verdicts[index];

        if (survivor === undefined || verdict === undefined) {
          // Недостижимо на практике: judgeTitles гарантирует verdicts.length === chunk.length
          // (иначе вернул бы ok: false) — проверка нужна только из-за noUncheckedIndexedAccess.
          continue;
        }

        decisions.push({
          item: survivor.item,
          dedupKey: survivor.dedupKey,
          matches: verdict.matches,
          matchSource: MATCH_SOURCE.AI,
          matchedKeywords: matchKeywords(survivor.item.position, settings.keywords),
          aiTitleReason: verdict.reason,
        });
      }
    }

    return decisions;
  }

  private decideByKeywordsOnly(
    survivor: VacancyScanSurvivor,
    settings: VacancySearchSettingsSnapshot,
  ): VacancyTitleDecision {
    const matched = matchKeywords(survivor.item.position, settings.keywords);
    const matches = isKeywordMatch(matched, settings.keywords.length, this.matchMode);

    return {
      item: survivor.item,
      dedupKey: survivor.dedupKey,
      matches,
      matchSource: MATCH_SOURCE.KEYWORDS,
      matchedKeywords: matched,
      aiTitleReason: null,
    };
  }

  /** §4.11.4 этапы 3–4: только для matchSource === 'AI' — загрузка описания и ИИ-вердикт по нему. */
  private async processDetail(
    decision: VacancyTitleDecision,
    settings: VacancySearchSettingsSnapshot,
    handle: ScanRunHandle,
  ): Promise<void> {
    const descriptionResult = await this.hhSearch.fetchVacancyDescription(decision.item.externalId);

    if (!descriptionResult.ok) {
      // §4.11.7: fail-closed — вакансия не сохраняется, следующий прогон встретит её снова.
      handle.increment('descriptionsFailed');
      this.logger.warn(`Вакансия ${decision.item.externalId}: ${descriptionResult.message}`);

      return;
    }

    const aiResult = await this.aiService.judgeDescription({
      descriptionPrompt: settings.descriptionPrompt,
      keywords: settings.keywords,
      title: decision.item.position,
      company: decision.item.company,
      description: descriptionResult.description,
    });

    if (!aiResult.ok) {
      // §4.12.3: тот же принцип фолбэка, что на этапе названия — решение по описанию
      // принимают ключевые слова, matchSource переключается на KEYWORDS.
      handle.increment('aiFallbacks');
      this.logger.warn(
        `Фолбэк на ключевые слова (описание вакансии ${decision.item.externalId}): ${aiResult.reason}`,
      );

      const matchedInDescription = matchKeywords(descriptionResult.description, settings.keywords);

      if (!isKeywordMatch(matchedInDescription, settings.keywords.length, this.matchMode)) {
        handle.increment('rejectedDescription');

        return;
      }

      await this.insertLead(
        { ...decision, matchSource: MATCH_SOURCE.KEYWORDS, matchedKeywords: matchedInDescription },
        handle,
        null,
        resolveLeadLogoSource(descriptionResult),
      );

      return;
    }

    if (!aiResult.matches) {
      handle.increment('rejectedDescription');

      return;
    }

    const logo = resolveLeadLogoSource(descriptionResult);

    await this.insertLead(decision, handle, aiResult.reason, logo);
  }

  /**
   * §4.11.4 этап 5: INSERT ... ON CONFLICT DO NOTHING. Ошибка одной строки не срывает прогон (§4.6).
   * Логотип скачивается СТРОГО после успешной вставки — attachCompanyLogo сам себя изолирует
   * (§4.10, шаг №26 §14), сбой скачивания не превращает created в failed.
   */
  private async insertLead(
    decision: VacancyTitleDecision,
    handle: ScanRunHandle,
    aiDescriptionReason: string | null,
    logo: VacancyLeadLogoSource | null,
  ): Promise<void> {
    const row = buildVacancyLeadRow({
      item: decision.item,
      positionKey: decision.dedupKey.positionKey,
      companyKey: decision.dedupKey.companyKey,
      publishedOn: decision.dedupKey.publishedOn,
      matchedKeywords: decision.matchedKeywords,
      matchSource: decision.matchSource,
      aiModel: decision.matchSource === MATCH_SOURCE.AI ? this.aiService.model : null,
      aiTitleReason: decision.aiTitleReason,
      aiDescriptionReason,
    });

    try {
      const insertedId = await this.leadsService.insertIgnoringConflict(row);

      if (insertedId !== null) {
        handle.increment('created');

        if (logo !== null) {
          await this.attachCompanyLogo(insertedId, logo);
        }
      } else {
        // §4.11.5 эшелон 3: гонка с параллельной вставкой того же ключа — сам прогон один
        // (§4.11.10), но уникальный индекс остаётся источником истины, а не наш SELECT.
        handle.increment('duplicates');
      }
    } catch (error) {
      handle.increment('failed');
      this.logger.warn(`Не удалось сохранить вакансию ${decision.item.externalId}: ${describeError(error)}`);
    }
  }

  /**
   * §4.10 (шаг №26 §14): собственный try/catch — сбой скачивания/записи логотипа не
   * должен переводить уже созданный лид в failed, insertLead() к этому моменту уже
   * учла created. CompanyLogoService.download() и так не бросает исключений, но
   * defensive try/catch остаётся симметричным остальным местам конвейера (§4.6).
   */
  private async attachCompanyLogo(id: string, logo: VacancyLeadLogoSource): Promise<void> {
    try {
      const fileName = await this.logos.download({
        fileKey: id,
        logoUrl: logo.logoUrl,
        allowedHostPattern: logo.allowedHostPattern,
        acquireSlot: this.hhSearch.acquireRequestSlot,
      });

      if (fileName !== null) {
        await this.leadsService.setCompanyLogoFile(id, fileName);
      }
    } catch (error) {
      this.logger.warn(`Не удалось сохранить логотип компании лида ${id}: ${describeError(error)}`);
    }
  }
}
