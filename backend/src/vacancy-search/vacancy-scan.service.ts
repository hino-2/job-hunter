import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ConcurrencyOptions } from '../common/common.interfaces';
import { mapWithConcurrency } from '../common/async.helpers';
import type {
  VacancyLeadSearchProvider,
  VacancySearchItem,
} from '../vacancies/vacancies.interfaces';
import type {
  VacancyDescriptionResult,
  VacancyLeadSearchSource,
} from '../vacancies/vacancies.type';
import { VACANCY_LEAD_SEARCH_SOURCES } from '../vacancies/vacancies.constants';
import { CompanyLogoService } from '../logos/company-logo.service';
import {
  AI_FAILURE_KIND,
  VACANCY_AI_BATCH_SIZE_ENV_KEY,
  VACANCY_AI_CONCURRENCY_ENV_KEY,
} from '../vacancy-ai/vacancy-ai.constants';
import { VacancyAiService } from '../vacancy-ai/vacancy-ai.service';
import { buildDedupKey, derivePublishedOn, serializeDedupKey } from './vacancy-lead-key.helpers';
import { VacancyLeadSearchRegistry } from './vacancy-lead-search.registry';
import { buildVacancyLeadRow } from './vacancy-lead.builder';
import { VacancyLeadsService } from './vacancy-leads.service';
import { hasExcluded, isKeywordMatch, matchKeywords } from './vacancy-keywords.helpers';
import { resolveLastPageIndex, resolveTotalPages } from './vacancy-scan-progress.helpers';
import { isExhaustedStop, isResumablePosition } from './vacancy-scan-position.helpers';
import { resolvePageStop } from './vacancy-scan-stop.helpers';
import { VacancyScanPositionService } from './vacancy-scan-position.service';
import { VacancyScanStateService } from './vacancy-scan-state.service';
import { VacancySearchSettingsService } from './vacancy-search-settings.service';
import {
  MATCH_SOURCE,
  MS_IN_DAY,
  SCAN_SOURCE_ALL,
  SCAN_STOPPED_REASON,
  VACANCY_MATCH_MODE_ENV_KEY,
  VACANCY_PREFILTER_MODE_ENV_KEY,
  VACANCY_PREFILTER_MODE_WITHOUT_SEARCH_QUERY,
  VACANCY_SCAN_AI_DISABLED_MESSAGE,
  VACANCY_SCAN_ALREADY_RUNNING_MESSAGE,
  VACANCY_SCAN_AI_MIN_START_DELAY_MS,
  VACANCY_SCAN_FINISHED_MESSAGE,
  VACANCY_SCAN_INITIAL_PAGE,
  VACANCY_SCAN_MAX_AGE_DAYS_ENV_KEY,
  VACANCY_SCAN_MAX_DURATION_MS_ENV_KEY,
  VACANCY_SCAN_MAX_PAGES_ENV_KEY,
  VACANCY_SCAN_MESSAGE_JOIN_SEPARATOR,
  VACANCY_SCAN_NO_RESUME_POSITION_MESSAGE,
  VACANCY_SCAN_NOT_RUNNING_MESSAGE,
  VACANCY_SCAN_SOURCE_MESSAGE_SEPARATOR,
  VACANCY_SCAN_STOP_REQUESTED_MESSAGE,
  VACANCY_SCAN_UNEXPECTED_ERROR_MESSAGE,
} from './vacancy-search.constants';
import type {
  ScanRunHandle,
  VacancyLeadLogoSource,
  VacancyScanLegResult,
  VacancyScanSourcePlan,
  VacancyScanSurvivor,
  VacancySearchSettingsSnapshot,
  VacancyTitleDecision,
  VacancyTitleStageResult,
} from './vacancy-search.interfaces';
import type {
  ScanMode,
  ScanSourceSelection,
  ScanStoppedReason,
  VacancyMatchMode,
  VacancyPrefilterMode,
} from './vacancy-search.type';

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * §4.11.0/§4.11.11: склеивает сообщения нескольких ног мультипрогона (и/или причины
 * текущей ноги) в одну строку ScanStatusDto.message — пустые/null отбрасываются,
 * остаток соединяется VACANCY_SCAN_MESSAGE_JOIN_SEPARATOR; null, если склеивать нечего.
 */
function joinScanMessages(parts: readonly (string | null)[]): string | null {
  const nonEmpty = parts.filter((part): part is string => part !== null && part !== '');

  if (nonEmpty.length === 0) {
    return null;
  }

  return nonEmpty.join(VACANCY_SCAN_MESSAGE_JOIN_SEPARATOR);
}

/**
 * §4.10 (шаг №26 §14): логотип компании лида берётся из той же страницы вакансии,
 * что provider.fetchVacancyDescription уже загрузила ради описания (§4.11.7) — оба
 * поля результата заполняются вместе (контракт VacancyLeadSearchProvider), поэтому
 * null здесь означает «источник логотип не дал», а не «данные неполные».
 */
function resolveLeadLogoSource(
  descriptionResult: VacancyDescriptionResult,
): VacancyLeadLogoSource | null {
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
 * §4.11.4 этап 3.5: те же стоп-слова, что и этап 0, но теперь по полному тексту
 * описания — единственному месту, где это описание вообще существует (страница
 * вакансии уже загружена этапом 3). Проверка стоит СТРОГО перед вызовом ИИ по
 * описанию: запрос к модели — это ~6 КБ чата и таймаут до 120 с, а стоп-слово в
 * описании отбраковывает вакансию бесплатно, без единого токена — дешёвое решение
 * «пропустить» вместо ожидания UNAVAILABLE/INVALID_RESPONSE с этапа 4. Возвращает
 * СПИСОК совпавших слов (matchKeywords, а не hasExcluded) — вызывающему нужны сами
 * слова для лога, а не факт совпадения.
 *
 * Требование этапа 'full' по включающим словам сюда намеренно НЕ расширено: решить,
 * действительно ли перечисленные в профиле технологии нужны вакансии как основные, —
 * работа модели (§4.11.4), а не детерминированного совпадения подстроки. На тексте
 * описания (тысячи символов) такое совпадение матчило бы почти всё подряд и обесценило
 * бы саму идею этапа 4.
 */
function findExcludedInDescription(
  description: string,
  settings: VacancySearchSettingsSnapshot,
  mode: VacancyPrefilterMode,
): string[] {
  if (mode === 'off') {
    return [];
  }

  return matchKeywords(description, settings.excludeKeywords);
}

/**
 * §4.11/§4.11.0: конвейер отбора «стоп-слова → дедупликация → ИИ по названию →
 * загрузка страницы → ИИ по описанию» (§4.11.4). Публичные входы — start(mode,
 * selection) и requestStop() (§4.11.12). selection === 'ALL' (SCAN_SOURCE_ALL)
 * прогоняет ВСЕ источники поиска лидов последовательно, одной «ногой» за раз
 * (buildPlan/run/runSource ниже) — конкретный источник даёт план из одной ноги, тот
 * же код обслуживает оба случая. Источник каждой ноги резолвится в провайдера через
 * VacancyLeadSearchRegistry, а шаблон ссылки на выдачу берётся из снимка настроек по
 * тому же source — сам конвейер об источниках больше ничего не знает (§4.11).
 * start() строит план (buildPlan) — резолвит стартовую страницу каждой ноги (снимок
 * настроек, для RESUME — сохранённая позиция), а затем СИНХРОННО вызывает
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
  private readonly maxAgeDays: number;
  private readonly maxDurationMs: number;
  private readonly prefilterMode: VacancyPrefilterMode;
  private readonly matchMode: VacancyMatchMode;
  private readonly aiBatchSize: number;
  /**
   * §4.11.4/§4.12.4: общий на оба конкурентных пула страницы (батчи названий,
   * детали) — они никогда не выполняются одновременно в рамках одной страницы
   * (processPage ждёт весь пул названий до старта пула деталей), поэтому один
   * объект опций безопасен для обоих. minStartDelayMs = 0 намеренно
   * (VACANCY_SCAN_AI_MIN_START_DELAY_MS, vacancy-search.constants.ts).
   */
  private readonly aiConcurrency: ConcurrencyOptions;

  constructor(
    private readonly state: VacancyScanStateService,
    private readonly settingsService: VacancySearchSettingsService,
    private readonly position: VacancyScanPositionService,
    private readonly leadSearchRegistry: VacancyLeadSearchRegistry,
    private readonly leadsService: VacancyLeadsService,
    private readonly aiService: VacancyAiService,
    private readonly logos: CompanyLogoService,
    configService: ConfigService,
  ) {
    this.maxPages = configService.getOrThrow<number>(VACANCY_SCAN_MAX_PAGES_ENV_KEY);
    this.maxAgeDays = configService.getOrThrow<number>(VACANCY_SCAN_MAX_AGE_DAYS_ENV_KEY);
    this.maxDurationMs = configService.getOrThrow<number>(VACANCY_SCAN_MAX_DURATION_MS_ENV_KEY);
    this.prefilterMode = configService.getOrThrow<VacancyPrefilterMode>(
      VACANCY_PREFILTER_MODE_ENV_KEY,
    );
    this.matchMode = configService.getOrThrow<VacancyMatchMode>(VACANCY_MATCH_MODE_ENV_KEY);
    this.aiBatchSize = configService.getOrThrow<number>(VACANCY_AI_BATCH_SIZE_ENV_KEY);
    this.aiConcurrency = {
      concurrency: configService.getOrThrow<number>(VACANCY_AI_CONCURRENCY_ENV_KEY),
      minStartDelayMs: VACANCY_SCAN_AI_MIN_START_DELAY_MS,
    };
  }

  /**
   * §5.7 POST /api/vacancy-leads/scan: отвечает сразу (202), прогон уходит в фон.
   * mode === 'RESUME' требует хотя бы одну ногу с валидной сохранённой позицией
   * (§4.11.12) — иначе 409 с отдельным сообщением, не путать с «прогон уже идёт».
   *
   * ВАЖНО: между this.state.tryStart(...) и void this.run(...) НЕ ДОЛЖНО быть ни
   * одного await — иначе tryStart() перестаёт быть единственным арбитром
   * конкурентности и два одновременных RESUME могли бы породить два прогона.
   */
  async start(mode: ScanMode, selection: ScanSourceSelection): Promise<Date> {
    const settings = await this.settingsService.getSnapshot();

    if (!settings.aiEnabled) {
      // §5.7: отбор теперь только ИИ — без него прогон не может отобрать ни одной
      // вакансии, поэтому запуск отказан ДО построения плана и tryStart().
      throw new ConflictException(VACANCY_SCAN_AI_DISABLED_MESSAGE);
    }

    // §4.11.0: 'ALL' разворачивается в полный список источников поиска лидов,
    // прогоняемых по очереди; конкретный источник — план из одной ноги тем же кодом.
    const sources: readonly VacancyLeadSearchSource[] =
      selection === SCAN_SOURCE_ALL ? VACANCY_LEAD_SEARCH_SOURCES : [selection];
    const plan = await this.buildPlan(mode, sources, settings);
    const [firstLeg] = plan;

    if (firstLeg === undefined) {
      // §4.11.12: достижимо только на RESUME — ни у одного источника выбора нет
      // валидной сохранённой позиции (FRESH всегда даёт хотя бы одну ногу).
      throw new ConflictException(VACANCY_SCAN_NO_RESUME_POSITION_MESSAGE);
    }

    const handle = this.state.tryStart(selection, firstLeg.source, firstLeg.startPage);

    if (handle === null) {
      throw new ConflictException(VACANCY_SCAN_ALREADY_RUNNING_MESSAGE);
    }

    const startedAt = new Date();

    // void: run() сама ловит все ошибки (try/finally на state.finish) — необработанный
    // реджект уронил бы процесс (Node --unhandled-rejections=throw), тот же приём,
    // что у ScheduledSyncService.runScheduledSync (§4.7).
    void this.run(handle, settings, plan);

    return startedAt;
  }

  /**
   * §4.11.0/§4.11.12: план мультипрогона — по одной ноге на источник, в порядке
   * sources. FRESH включает КАЖДЫЙ источник (стартовая страница — 0). RESUME
   * включает только источники с валидной сохранённой позицией
   * (isResumablePosition) — источник без валидной позиции ПРОПУСКАЕТСЯ, а не
   * перезапускается с нулевой страницы: иначе «Продолжить» по всем источникам
   * молча стало бы «Начать» для части из них.
   */
  private async buildPlan(
    mode: ScanMode,
    sources: readonly VacancyLeadSearchSource[],
    settings: VacancySearchSettingsSnapshot,
  ): Promise<VacancyScanSourcePlan[]> {
    const plan: VacancyScanSourcePlan[] = [];

    for (const source of sources) {
      const provider = this.leadSearchRegistry.require(source);
      const searchUrlTemplate = settings.searchUrlTemplateBySource[source];

      if (mode === 'FRESH') {
        plan.push({ source, provider, searchUrlTemplate, startPage: VACANCY_SCAN_INITIAL_PAGE });
        continue;
      }

      // Позиция и ссылка на выдачу — того же источника: продолжать прогон одного
      // источника с позиции другого нельзя (§4.11.12).
      const position = await this.position.load(source);

      if (!isResumablePosition(position, searchUrlTemplate, this.maxPages)) {
        continue;
      }

      plan.push({ source, provider, searchUrlTemplate, startPage: position.nextPage });
    }

    return plan;
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

  /**
   * §4.11.0: драйвер всего прогона — прогревает модель РОВНО ОДИН РАЗ (не на
   * каждую ногу), затем листает plan по одной ноге за раз через runSource().
   * ОБЯЗАН вызывать state.finish() на любом пути, включая исключение — иначе
   * статус навсегда останется RUNNING.
   *
   * §4.11.8: deadlineAt/ageCutoffMs — общие значения на ВЕСЬ прогон, а не на ногу:
   * дедлайн делится между источниками. seenInRun тоже общий на весь прогон (тот же
   * Set листается через все ноги), но его ключ теперь несёт источник первым
   * компонентом (§4.11.5) — поэтому кросспост вакансии на
   * hh.ru и geekjob.ru больше НЕ гасится более ранней ногой: у каждого источника
   * своя копия ключа, и обе доходят до выборки. Региональные клоны ВНУТРИ одной
   * ноги продолжают схлопываться тем же общим Set — ключ для них не меняется.
   */
  private async run(
    handle: ScanRunHandle,
    settings: VacancySearchSettingsSnapshot,
    plan: readonly VacancyScanSourcePlan[],
  ): Promise<void> {
    let stoppedReason: ScanStoppedReason = SCAN_STOPPED_REASON.COMPLETED;
    let message: string | null = null;

    try {
      // §4.11.9: прогрев модели — ПЕРВОЕ действие ИИ в прогоне, до того, как вообще
      // начнётся листание выдачи, и ОДИН раз на весь прогон, а не на каждую ногу.
      // Идёт ДО deadlineAt намеренно: время загрузки модели в память не должно
      // откусывать от бюджета VACANCY_SCAN_MAX_DURATION_MS — иначе холодный старт
      // мог бы съесть весь бюджет прогона ещё до первой страницы.
      const warmUpStartedAt = Date.now();
      const warmUp = await this.aiService.warmUp();

      // Снимается на ОБОИХ исходах до ветвления — иначе неудачный прогрев оставил бы
      // aiWarmingUp: true до самого state.finish() в finally.
      handle.setAiWarmingUp(false);

      if (!warmUp.ok) {
        // §4.11.9/§4.12.3: недоступная модель — тот же класс сбоя, что и AI_UNAVAILABLE
        // в середине прогона (§4.11.12): прогон завершается резюмируемо, а не тянется
        // дальше к заведомо мёртвой модели.
        stoppedReason = SCAN_STOPPED_REASON.AI_UNAVAILABLE;
        message = warmUp.reason;

        return;
      }

      this.logger.log(`Прогрев модели: ${Date.now() - warmUpStartedAt} мс`);

      const deadlineAt = Date.now() + this.maxDurationMs;
      const ageCutoffMs = Date.now() - this.maxAgeDays * MS_IN_DAY;
      const seenInRun = new Set<string>();
      const isMultiSource = plan.length > 1;
      const errors: string[] = [];

      for (const leg of plan) {
        if (handle.isStopRequested()) {
          stoppedReason = SCAN_STOPPED_REASON.STOPPED;
          message = joinScanMessages(errors);
          break;
        }

        this.logger.log(`Нога прогона: источник ${leg.source}, старт со страницы ${leg.startPage}`);

        const result = await this.runSource(
          handle,
          settings,
          leg,
          deadlineAt,
          ageCutoffMs,
          seenInRun,
        );

        if (result.reason === SCAN_STOPPED_REASON.ERROR) {
          // §4.11.3/§4.11.11: ERROR теперь приходит только от неожиданного исключения
          // внутри ноги (одна неудачная страница выдачи сама по себе больше не
          // прерывает ногу — она пропускается и считается в pagesFailed). Такое
          // исключение не отменяет соседние источники — ошибка запоминается, и цикл
          // переходит к следующей ноге; префикс с именем источника появляется только
          // в мультипрогоне, где иначе не понять, чья ошибка.
          errors.push(
            isMultiSource
              ? `${leg.source}${VACANCY_SCAN_SOURCE_MESSAGE_SEPARATOR}${result.message ?? ''}`
              : (result.message ?? ''),
          );
          stoppedReason = SCAN_STOPPED_REASON.ERROR;
          message = joinScanMessages(errors);
          continue;
        }

        if (!isExhaustedStop(result.reason)) {
          // STOPPED/DEADLINE/AI_UNAVAILABLE — общий дедлайн и кооперативная остановка,
          // они завершают ВЕСЬ прогон, а не только текущую ногу.
          stoppedReason = result.reason;
          message = joinScanMessages([result.message, ...errors]);
          break;
        }

        // Выдача этой ноги исчерпана целиком — если до неё не было ошибок на других
        // источниках, её причина/сообщение и есть итог прогона на данный момент;
        // если были — прогон остаётся ERROR, а этот источник просто пройден.
        if (errors.length === 0) {
          stoppedReason = result.reason;
          message = result.message;
        }
      }
    } catch (error) {
      stoppedReason = SCAN_STOPPED_REASON.ERROR;
      message = describeError(error);
      this.logger.error(VACANCY_SCAN_UNEXPECTED_ERROR_MESSAGE, message);
    } finally {
      this.state.finish(stoppedReason, message);
      this.logger.log(`${VACANCY_SCAN_FINISHED_MESSAGE}: ${stoppedReason}`);
    }
  }

  /**
   * §4.11.0: одна нога мультипрогона — тело сегодняшнего run() без прогрева модели
   * и без state.finish() (оба общие на весь прогон, см. run() выше). MAX_PAGES
   * остаётся бюджетом ЭТОЙ ноги — каждый источник листается заново с нулевого
   * счётчика страниц. Пишет СВОЮ позицию (position.save/clear) в СВОЁМ finally —
   * до того, как run() дойдёт до следующей ноги или до общего state.finish(),
   * поэтому гарантия §4.11.12 («позиция обновлена раньше, чем статус увидел бы
   * DONE») держится по построению и для мультипрогона.
   */
  private async runSource(
    handle: ScanRunHandle,
    settings: VacancySearchSettingsSnapshot,
    plan: VacancyScanSourcePlan,
    deadlineAt: number,
    ageCutoffMs: number,
    seenInRun: Set<string>,
  ): Promise<VacancyScanLegResult> {
    const { source, provider, searchUrlTemplate, startPage } = plan;
    let stoppedReason: ScanStoppedReason = SCAN_STOPPED_REASON.COMPLETED;
    let message: string | null = null;
    let resumePage = startPage;

    handle.startSource(source, startPage);

    try {
      // startPage === 0 заодно стирает позицию прошлого прогона этого источника:
      // нога, умершая на нулевой странице, не должна оставлять после себя нечего
      // продолжать.
      await this.position.save(source, startPage, searchUrlTemplate);

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

        const pageResult = await provider.fetchSearchPage({ searchUrlTemplate, page });

        if (!pageResult.ok) {
          // §4.11.3/§4.11.11: одна неудачная страница (таймаут/5xx/неразбираемый ответ)
          // больше не обрывает ногу — она пропускается и учитывается в pagesFailed,
          // листание продолжается со следующей страницы.
          // ponytail: нет потолка подряд идущих сбоев — худший случай VACANCY_SCAN_MAX_PAGES × (таймаут × попытки)
          // в пределах дедлайна прогона; добавить счётчик подряд идущих сбоев, если источник лежит целиком.
          handle.increment('pagesFailed');
          this.logger.warn(`Страница выдачи ${source} (page=${page}) пропущена: ${pageResult.message}`);
          resumePage = page + 1;
          await this.position.save(source, resumePage, searchUrlTemplate);
          continue;
        }

        handle.increment('pagesFetched');
        handle.increment('itemsSeen', pageResult.page.items.length);
        handle.increment('skippedInvalid', pageResult.page.skippedInvalid);

        if (pageResult.page.lastPage !== null) {
          lastPage = resolveLastPageIndex(pageResult.page.lastPage, this.maxPages);
          handle.setTotalPages(resolveTotalPages(lastPage, this.maxPages));
        }

        if (pageResult.page.items.length === 0 && pageResult.page.lastPage === null) {
          // §4.11.1/D3: пустая страница означает конец выдачи ТОЛЬКО когда источник не
          // репортит lastPage (короткая пагинация hh.ru/it-vacancies.ru). Когда lastPage
          // известен — компания без вакансий или без парсера (§4.14) тоже даёт пустую
          // страницу, и это не конец ноги: листание продолжается до page > lastPage
          // (LAST_PAGE ниже), иначе прогон COMPANY_SITE остановился бы на первой же
          // компании без вакансий, не дойдя до остальных строк списка.
          outcome = SCAN_STOPPED_REASON.COMPLETED;
          break;
        }

        const pageStop = await this.processPage(
          pageResult.page.items,
          settings,
          provider,
          handle,
          seenInRun,
          ageCutoffMs,
          deadlineAt,
        );

        if (pageStop !== null) {
          outcome = pageStop;
          break;
        }

        // Страница обработана целиком — сохраняем позицию ДО следующей: SIGKILL
        // между страницами не должен стоить больше одной страницы (§4.11.12).
        resumePage = page + 1;
        await this.position.save(source, resumePage, searchUrlTemplate);
      }

      stoppedReason = outcome ?? SCAN_STOPPED_REASON.MAX_PAGES;
    } catch (error) {
      stoppedReason = SCAN_STOPPED_REASON.ERROR;
      message = describeError(error);
      this.logger.error(VACANCY_SCAN_UNEXPECTED_ERROR_MESSAGE, message);
    } finally {
      // Порядок важен: GET .../scan/status, который первым увидит DONE (или следующую
      // ногу), обязан уже видеть финальную позицию ЭТОГО источника (§4.11.12) —
      // поэтому позиция пишется ДО того, как run() пойдёт дальше.
      if (isExhaustedStop(stoppedReason)) {
        await this.position.clear(source);
      } else {
        await this.position.save(source, resumePage, searchUrlTemplate);
      }
    }

    return { reason: stoppedReason, message };
  }

  /**
   * §4.11.4/§4.14: эффективный режим детерминированного отбора для конкретного
   * провайдера — глобальный VACANCY_PREFILTER_MODE для источников с достоверной
   * датой, и всегда 'full' для источников без неё (сайты компаний, D4б): у них нет
   * своего поискового запроса, ключевые слова профиля его заменяют целиком.
   */
  private resolvePrefilterMode(provider: VacancyLeadSearchProvider): VacancyPrefilterMode {
    return provider.publicationDateKnown
      ? this.prefilterMode
      : VACANCY_PREFILTER_MODE_WITHOUT_SEARCH_QUERY;
  }

  /**
   * §4.11.5/§4.14: эшелон 2 дедупликации, выбранный по источнику — известная дата
   * публикации сверяется по четвёрке (источник, компания, должность, дата), а её
   * отсутствие (D4б) — по external_id (findExistingByExternalIds). Результат
   * выровнен по позиции с survivors: existingIds[i] относится к survivors[i].
   */
  private async findExistingLeadIds(
    provider: VacancyLeadSearchProvider,
    survivors: readonly VacancyScanSurvivor[],
  ): Promise<(string | undefined)[]> {
    if (provider.publicationDateKnown) {
      const existingByKey = await this.leadsService.findExistingKeys(
        provider.source,
        survivors.map((survivor) => survivor.dedupKey),
      );

      return survivors.map((survivor) => existingByKey.get(serializeDedupKey(survivor.dedupKey)));
    }

    const existingByExternalId = await this.leadsService.findExistingByExternalIds(
      provider.source,
      survivors.map((survivor) => survivor.item.externalId),
    );

    return survivors.map((survivor) => existingByExternalId.get(survivor.item.externalId));
  }

  /** Обрабатывает одну страницу выдачи целиком; null — продолжать листать дальше. */
  private async processPage(
    items: readonly VacancySearchItem[],
    settings: VacancySearchSettingsSnapshot,
    provider: VacancyLeadSearchProvider,
    handle: ScanRunHandle,
    seenInRun: Set<string>,
    ageCutoffMs: number,
    deadlineAt: number,
  ): Promise<ScanStoppedReason | null> {
    const survivors: VacancyScanSurvivor[] = [];
    const prefilterMode = this.resolvePrefilterMode(provider);
    let skippedOldOnPage = 0;

    for (const item of items) {
      // §4.11.4/§4.14: источники без достоверной даты выдачи (publicationDateKnown = false,
      // сайты компаний) не проходят отсечку по возрасту вовсе — publishedAtIso у них
      // first-seen (§3.5), а не настоящая дата публикации, и отсекать по ней старые
      // вакансии означало бы отсекать наугад.
      if (provider.publicationDateKnown) {
        const publishedAtMs = Date.parse(item.publishedAtIso);

        if (Number.isNaN(publishedAtMs) || publishedAtMs < ageCutoffMs) {
          handle.increment('skippedOld');
          skippedOldOnPage += 1;
          continue;
        }
      }

      if (!passesPrefilter(item.position, settings, prefilterMode, this.matchMode)) {
        handle.increment('skippedExcluded');
        continue;
      }

      const dedupKey = buildDedupKey(
        provider.source,
        item.company,
        item.position,
        derivePublishedOn(item.publishedAtIso),
      );
      const serialized = serializeDedupKey(dedupKey);

      if (seenInRun.has(serialized)) {
        // §4.11.5 эшелон 1: региональные клоны — тождественные источник+компания+должность+дата,
        // до всякого ИИ. Проверка теперь ограничена источником — копия того же названия с
        // другого источника сюда не попадёт (ключ начинается с provider.source).
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
    const existingIds = await this.findExistingLeadIds(provider, survivors);
    const duplicateIds: string[] = [];
    const fresh: VacancyScanSurvivor[] = [];

    for (let index = 0; index < survivors.length; index += 1) {
      const survivor = survivors[index];

      if (survivor === undefined) {
        // Недостижимо на практике: existingIds строится map()'ом по survivors, длины
        // равны по построению — проверка нужна только из-за noUncheckedIndexedAccess.
        continue;
      }

      const existingId = existingIds[index];

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

    // §4.11.12: чекпойнт ПЕРЕД этапом названий — прежний цикл проверял остановку
    // первым делом на КАЖДОМ кандидате, здесь же кандидаты уходят в пул сразу все,
    // так что единственная синхронная точка перед его стартом отвечает строго
    // отзывчивее прежнего (не позже, а раньше). Внутри самого пула названий
    // чекпойнта намеренно нет: воркер, увидевший остановку, обязан был бы что-то
    // вернуть, а matches: false испортило бы rejectedTitle.
    if (handle.isStopRequested()) {
      return SCAN_STOPPED_REASON.STOPPED;
    }

    const titleStage = await this.decideTitleMatches(fresh, settings, handle);

    if (titleStage.stop !== null) {
      // §4.11.12: модель недоступна на этапе названий — решения, уже собранные с
      // других чанков этой же страницы, намеренно отбрасываются: resumePage
      // остаётся этой же страницей, повторный проход после «Продолжить» встретит
      // тех же кандидатов заново, а дедупликация (§4.11.5) делает это дёшево.
      return titleStage.stop;
    }

    const matched: VacancyTitleDecision[] = [];

    for (const decision of titleStage.decisions) {
      if (decision.matches) {
        matched.push(decision);
      } else {
        handle.increment('rejectedTitle');
      }
    }

    if (matched.length === 0) {
      return null;
    }

    const startedAt = Date.now();

    const detailStops = await mapWithConcurrency(matched, this.aiConcurrency, (decision) =>
      this.processDetailSafely(decision, settings, provider, handle, deadlineAt),
    );

    // §4.11.2: единственная строка лога на страницу — дешёвый способ убедиться
    // впоследствии, что пул деталей не выродился в последовательный проход.
    this.logger.log(
      `Этап деталей страницы: кандидатов ${matched.length}, ${Date.now() - startedAt} мс`,
    );

    return resolvePageStop(detailStops);
  }

  /**
   * Unit of work конкурентного пула деталей (§4.11.4 этапы 3–4). Не бросает
   * исключений наружу по той же причине, что decideTitleChunk выше: осиротевший
   * воркер mapWithConcurrency не должен мутировать handle уже после того, как
   * вызывающий поймал бы реджект.
   *
   * catch инкрементирует descriptionsFailed, а не failed: у insertLead уже есть
   * собственный try/catch, отображающий сбой вставки в failed (§4.6), так что
   * исключение, долетевшее досюда, означает, что вакансия вообще не прошла этапы
   * 3–4 — fail-closed, следующий прогон встретит её снова (§4.11.7, §4.11.8).
   */
  private async processDetailSafely(
    decision: VacancyTitleDecision,
    settings: VacancySearchSettingsSnapshot,
    provider: VacancyLeadSearchProvider,
    handle: ScanRunHandle,
    deadlineAt: number,
  ): Promise<ScanStoppedReason | null> {
    // §4.11.12: чекпойнт на старте обработки кандидата — при конкурентном пуле это
    // стартовая точка КАЖДОГО воркера, а не единственная точка цикла, поэтому задержка
    // остановки не растёт по сравнению с прежним последовательным циклом.
    if (handle.isStopRequested()) {
      return SCAN_STOPPED_REASON.STOPPED;
    }

    if (Date.now() >= deadlineAt) {
      return SCAN_STOPPED_REASON.DEADLINE;
    }

    try {
      return await this.processDetail(decision, settings, provider, handle);
    } catch (error) {
      handle.increment('descriptionsFailed');
      this.logger.warn(`Вакансия ${decision.item.externalId}: ${describeError(error)}`);

      return null;
    }
  }

  /**
   * §4.11.4 этап 2: ИИ батчами до VACANCY_AI_BATCH_SIZE. Батчи гонятся через
   * mapWithConcurrency (до VACANCY_AI_CONCURRENCY штук одновременно, §4.12.4) —
   * единственное, что раньше держало три слота Ollama (OLLAMA_NUM_PARALLEL, шаг №50
   * §14) простаивающими, был последовательный цикл. mapWithConcurrency гарантирует
   * порядок результатов по порядку items, поэтому плоский массив решений ниже
   * собирается явным вложенным for…of, а не .flat() — гарантия порядка видна в
   * месте вызова, а не спрятана внутри метода массива. Первая же недоступность
   * модели (kind === UNAVAILABLE) на любом чанке останавливает страницу — решения
   * остальных чанков намеренно отбрасываются вызывающим (processPage).
   */
  private async decideTitleMatches(
    survivors: readonly VacancyScanSurvivor[],
    settings: VacancySearchSettingsSnapshot,
    handle: ScanRunHandle,
  ): Promise<VacancyTitleStageResult> {
    const chunks: VacancyScanSurvivor[][] = [];

    for (let start = 0; start < survivors.length; start += this.aiBatchSize) {
      chunks.push(survivors.slice(start, start + this.aiBatchSize));
    }

    const chunkResults = await mapWithConcurrency(chunks, this.aiConcurrency, (chunk) =>
      this.decideTitleChunk(chunk, settings, handle),
    );
    const decisions: VacancyTitleDecision[] = [];
    let stop: ScanStoppedReason | null = null;

    for (const chunkResult of chunkResults) {
      for (const decision of chunkResult.decisions) {
        decisions.push(decision);
      }

      // Первый непустой стоп среди чанков побеждает — их порядок в chunkResults
      // совпадает с порядком chunks (гарантия mapWithConcurrency), но при
      // единственной причине (AI_UNAVAILABLE) порядок здесь не важен.
      stop ??= chunkResult.stop;
    }

    return { decisions, stop };
  }

  /**
   * Тело одной итерации прежнего последовательного цикла decideTitleMatches — теперь
   * unit of work пула mapWithConcurrency. ОБЯЗАН не бросать исключений наружу:
   * mapWithConcurrency реджектит весь вызов при реджекте одного воркера и НЕ отменяет
   * остальных (см. комментарий самого хелпера) — осиротевшие воркеры продолжили бы
   * мутировать handle уже после того, как вызывающий поймал бы исключение и пошёл
   * дальше. Тот же принцип изоляции, что у syncOneSafely (§4.6).
   */
  private async decideTitleChunk(
    chunk: readonly VacancyScanSurvivor[],
    settings: VacancySearchSettingsSnapshot,
    handle: ScanRunHandle,
  ): Promise<VacancyTitleStageResult> {
    try {
      const aiResult = await this.aiService.judgeTitles({
        titlePrompt: settings.titlePrompt,
        keywords: settings.keywords,
        items: chunk.map((survivor) => ({
          title: survivor.item.position,
          company: survivor.item.company,
        })),
      });

      if (!aiResult.ok) {
        if (aiResult.kind === AI_FAILURE_KIND.UNAVAILABLE) {
          this.logger.warn(`Батч названий остановлен — модель недоступна: ${aiResult.reason}`);

          return { decisions: [], stop: SCAN_STOPPED_REASON.AI_UNAVAILABLE };
        }

        handle.increment('aiSkipped', chunk.length);
        this.logger.warn(`Батч названий пропущен — ответ модели непригоден: ${aiResult.reason}`);

        return { decisions: [], stop: null };
      }

      const decisions: VacancyTitleDecision[] = [];

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
          matchedKeywords: matchKeywords(survivor.item.position, settings.keywords),
          aiTitleReason: verdict.reason,
        });
      }

      return { decisions, stop: null };
    } catch (error) {
      // Та же ветка, что и INVALID_RESPONSE выше — вызов judgeTitles сам не бросает
      // (§4.12.3), поэтому сюда попадает только по-настоящему неожиданный сбой;
      // прогон продолжается, батч пропущен, а не остановлен.
      handle.increment('aiSkipped', chunk.length);
      this.logger.warn(`Батч названий пропущен — неожиданная ошибка: ${describeError(error)}`);

      return { decisions: [], stop: null };
    }
  }

  /** §4.11.4 этапы 3–4: загрузка описания и ИИ-вердикт по нему. */
  private async processDetail(
    decision: VacancyTitleDecision,
    settings: VacancySearchSettingsSnapshot,
    provider: VacancyLeadSearchProvider,
    handle: ScanRunHandle,
  ): Promise<ScanStoppedReason | null> {
    const descriptionResult = await provider.fetchVacancyDescription(decision.item);

    if (!descriptionResult.ok) {
      // §4.11.7: fail-closed — вакансия не сохраняется, следующий прогон встретит её снова.
      handle.increment('descriptionsFailed');
      this.logger.warn(`Вакансия ${decision.item.externalId}: ${descriptionResult.message}`);

      return null;
    }

    const excludedInDescription = findExcludedInDescription(
      descriptionResult.description,
      settings,
      this.resolvePrefilterMode(provider),
    );

    if (excludedInDescription.length > 0) {
      // §4.11.4 этап 3.5: тот же счётчик, что у этапа 0 (§4.11.11 — «отсеян стоп-словами»,
      // без разницы, по названию или по описанию); rejectedDescription означает отказ
      // МОДЕЛИ, а не детерминированный фильтр, поэтому не подходит.
      handle.increment('skippedExcluded');
      this.logger.log(
        `Вакансия ${decision.item.externalId}: стоп-слова в описании — ${excludedInDescription.join(', ')}`,
      );

      return null;
    }

    const aiResult = await this.aiService.judgeDescription({
      descriptionPrompt: settings.descriptionPrompt,
      keywords: settings.keywords,
      title: decision.item.position,
      company: decision.item.company,
      description: descriptionResult.description,
    });

    if (!aiResult.ok) {
      if (aiResult.kind === AI_FAILURE_KIND.UNAVAILABLE) {
        this.logger.warn(
          `Вакансия ${decision.item.externalId}: модель недоступна — ${aiResult.reason}`,
        );

        return SCAN_STOPPED_REASON.AI_UNAVAILABLE;
      }

      // Непригодный ответ (невалидный JSON либо ungrounded evidence) — вакансия не
      // сохраняется, но не считается отказом (rejectedDescription): сама модель ничего
      // не решила, следующий прогон встретит её снова.
      handle.increment('aiSkipped');
      this.logger.warn(
        `Вакансия ${decision.item.externalId}: ответ модели по описанию непригоден — ${aiResult.reason}`,
      );

      return null;
    }

    if (!aiResult.matches) {
      handle.increment('rejectedDescription');

      return null;
    }

    const logo = resolveLeadLogoSource(descriptionResult);

    await this.insertLead(decision, handle, provider, aiResult.reason, logo);

    return null;
  }

  /**
   * §4.11.4 этап 5: INSERT ... ON CONFLICT DO NOTHING. Ошибка одной строки не срывает прогон (§4.6).
   * Логотип скачивается СТРОГО после успешной вставки — attachCompanyLogo сам себя изолирует
   * (§4.10, шаг №26 §14), сбой скачивания не превращает created в failed.
   */
  private async insertLead(
    decision: VacancyTitleDecision,
    handle: ScanRunHandle,
    provider: VacancyLeadSearchProvider,
    aiDescriptionReason: string | null,
    logo: VacancyLeadLogoSource | null,
  ): Promise<void> {
    const row = buildVacancyLeadRow({
      item: decision.item,
      source: provider.source,
      positionKey: decision.dedupKey.positionKey,
      companyKey: decision.dedupKey.companyKey,
      publishedOn: decision.dedupKey.publishedOn,
      matchedKeywords: decision.matchedKeywords,
      matchSource: MATCH_SOURCE.AI,
      aiModel: this.aiService.model,
      aiTitleReason: decision.aiTitleReason,
      aiDescriptionReason,
    });

    try {
      const insertedId = await this.leadsService.insertIgnoringConflict(row);

      if (insertedId !== null) {
        handle.increment('created');

        if (logo !== null) {
          await this.attachCompanyLogo(insertedId, logo, provider);
        }
      } else {
        // §4.11.5 эшелон 3: гонка с параллельной вставкой того же ключа — сам прогон один
        // (§4.11.10), но уникальный индекс остаётся источником истины, а не наш SELECT.
        handle.increment('duplicates');
      }
    } catch (error) {
      handle.increment('failed');
      this.logger.warn(
        `Не удалось сохранить вакансию ${decision.item.externalId}: ${describeError(error)}`,
      );
    }
  }

  /**
   * §4.10 (шаг №26 §14): собственный try/catch — сбой скачивания/записи логотипа не
   * должен переводить уже созданный лид в failed, insertLead() к этому моменту уже
   * учла created. CompanyLogoService.download() и так не бросает исключений, но
   * defensive try/catch остаётся симметричным остальным местам конвейера (§4.6).
   */
  private async attachCompanyLogo(
    id: string,
    logo: VacancyLeadLogoSource,
    provider: VacancyLeadSearchProvider,
  ): Promise<void> {
    try {
      const fileName = await this.logos.download({
        fileKey: id,
        logoUrl: logo.logoUrl,
        allowedHostPattern: logo.allowedHostPattern,
        // Троттл ТОГО ЖЕ источника, чью страницу мы качаем: со слотом другого источника
        // логотип обходил бы его лимит частоты (§4.11.2).
        acquireSlot: provider.acquireRequestSlot,
      });

      if (fileName !== null) {
        await this.leadsService.setCompanyLogoFile(id, fileName);
      }
    } catch (error) {
      this.logger.warn(`Не удалось сохранить логотип компании лида ${id}: ${describeError(error)}`);
    }
  }
}
