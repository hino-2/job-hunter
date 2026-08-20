import type { SYNC_OUTCOME } from '../applications/applications.constants';
import type {
  ApplicationSyncPatch,
  SyncOutcome,
  VacancySource,
} from '../applications/applications.type';
import type {
  VacancyDescriptionResult,
  VacancyFetchFailureOutcome,
  VacancyFetchResult,
  VacancySearchPageResult,
} from './vacancies.type';

/**
 * Провалидированный срез страницы вакансии, общий для всех источников (§4.3).
 *
 * archived обязателен: на нём построены правила §4.3, его отсутствие или
 * противоречивость делает ответ бесполезным для синхронизации (исход ERROR).
 * name и employerName деградируют мягко (§4.4): они питают только автозаполнение,
 * отсутствие данных на странице — не ошибка разбора.
 */
export interface Vacancy {
  name: string | null;
  archived: boolean;
  employerName: string | null;
  /**
   * §4.10: абсолютный http(s)-URL с доверенного для этого источника хоста
   * (проверка allow-list в resolveVacancyLogoUrl), либо null. Деградирует мягко,
   * как name/employerName — отсутствие логотипа на странице не ошибка разбора.
   */
  logoUrl: string | null;
  /**
   * §4.10 (SSRF на редиректах): тот же allow-list хоста источника, которым только что
   * проверили logoUrl. resolveVacancyLogoUrl отсекает только исходный URL — CDN может
   * ответить 3xx на произвольный хост, и axios/follow-redirects пойдёт туда без
   * вопросов. Поле летит вместе с logoUrl до CompanyLogoDownloadRequest, чтобы
   * CompanyLogoService повторил ту же проверку на каждом хопе редиректа, а не только
   * на первом запросе. null, когда логотипа нет — тогда скачивания не будет вовсе.
   */
  logoAllowedHostPattern: RegExp | null;
}

/** Пара «источник + внешний ID», уже распознанная реестром из пользовательской ссылки. */
export interface VacancyRef {
  source: VacancySource;
  externalId: string;
}

export interface VacancyFetchSuccess {
  outcome: typeof SYNC_OUTCOME.OK;
  vacancy: Vacancy;
}

export interface VacancyFetchFailure {
  outcome: VacancyFetchFailureOutcome;
  /** Человекочитаемый текст для last_sync_error (§3.1) и для тела ответа preview. */
  message: string;
}

/**
 * Результат одной попытки запроса плюс признак, имеет ли смысл её повторять.
 * Флаг живёт отдельно от результата, потому что наружу он не нужен: §4.6
 * разрешает ретраи только на 429 и 5xx, а вызывающий видит уже итоговый результат.
 *
 * Обобщён по TResult (с шага 22, §4.11): fetchWithRetries переиспользуют сервисы
 * поиска лидов для страниц выдачи и описаний (VacancySearchPageResult /
 * VacancyDescriptionResult), у которых нет общего с VacancyFetchResult контракта —
 * дискриминант там `ok`, а не `outcome`.
 */
export interface VacancyRequestAttempt<TResult> {
  result: TResult;
  retryable: boolean;
}

/**
 * Контракт источника вакансии. Реализуют HhApiService и (с фазы B3) GetmatchApiService —
 * каждый сам implements этот интерфейс, отдельных классов-обёрток нет (§3 блюпринта).
 */
export interface VacancySourceProvider {
  readonly source: VacancySource;
  /** Внешний ID вакансии из пользовательской ссылки или null. Никогда не бросает (§4.2). */
  parseUrl(rawUrl: string | null | undefined): string | null;
  /** Исключений наружу не выпускает: любой сбой — исход из §4.5. */
  fetchVacancy(externalId: string): Promise<VacancyFetchResult>;
  /**
   * §4.11.2: слот общего троттла источника, если у него есть лимит частоты (hh.ru —
   * есть, HhRequestThrottle; getmatch.ru — нет). Скачивание логотипа компании (§4.10)
   * зовёт его перед запросом к CDN источника — так модуль logos/ не узнаёт о hh.ru
   * напрямую, слот приезжает данными через VacancyResolution.provider.
   */
  readonly acquireRequestSlot?: () => Promise<void>;
}

/**
 * Результат распознавания ссылки: ref и уже найденный провайдер — чтобы вызывающему
 * не приходилось второй раз обращаться в реестр и проверять null.
 */
export interface VacancyResolution {
  ref: VacancyRef;
  provider: VacancySourceProvider;
}

/**
 * onRetry получает весь результат попытки, а не только исход: у VacancyFetchResult
 * это `outcome`, у результатов поиска лидов — `ok` (vacancies.type.ts), а хелпер
 * fetchWithRetries о конкретной форме результата ничего не знает.
 */
export interface VacancyRetryOptions<TResult> {
  maxRetries: number;
  onRetry(pauseMs: number, attempt: number, result: TResult): void;
}

/** Имена env-переменных, из которых собираются опции axios конкретного источника. */
export interface VacancyHttpEnvKeys {
  baseUrl: string;
  timeoutMs: string;
  userAgent: string;
}

/** Решение по одной записи до её сохранения (§4.3): какие колонки записать и что показать. */
export interface VacancySyncDecision {
  patch: ApplicationSyncPatch;
  outcome: SyncOutcome;
  /** null только при OK; иначе тот же текст, что уходит в last_sync_error. */
  message: string | null;
}

/** Тело ответа POST /api/vacancies/preview (§5.3). Реализуется VacancyPreviewDto. */
export interface VacancyPreviewResponse {
  source: VacancySource | null;
  vacancyExternalId: string | null;
  company: string | null;
  position: string | null;
  archived: boolean | null;
}

/**
 * §4.11.3: один элемент выдачи после разбора, общий для всех источников поиска
 * лидов. Значения полей — «как отдал источник», без среза по ширине колонки БД:
 * клампинг делает конвейер отбора (§4.11.4) при записи в vacancy_leads, тем же
 * принципом, что normalizeVacancyPosition у applications (§4.3).
 *
 * vacancyUrl уже канонический ({SITE_BASE_URL}/…/{externalId}) — региональные и
 * трекинговые ссылки из разметки источника игнорируются (§4.11.3).
 *
 * Поля, которых источник не отдаёт, приезжают null: у it-vacancies.ru так
 * заполняются salaryCurrency (источник рапортует RUB даже для оклада в $),
 * salaryGross, experience, employmentForm и workFormats.
 */
export interface VacancySearchItem {
  externalId: string;
  position: string;
  company: string;
  /** ISO-строка со смещением источника, как есть, без пересчёта таймзон (§4.11.6). */
  publishedAtIso: string;
  vacancyUrl: string;
  areaName: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  salaryCurrency: string | null;
  salaryGross: boolean | null;
  experience: string | null;
  employmentForm: string | null;
  /** Через запятую — уже готово к записи в колонку. */
  workFormats: string | null;
}

/**
 * §4.11.1/§5.7: вход VacancyLeadSearchProvider.fetchSearchPage. Шаблон приезжает
 * СЮДА как данные снимка настроек прогона (VacancyScanService, vacancy-search/), а
 * не через DI VacancySearchSettingsService — модульная зависимость зафиксирована в
 * одну сторону (vacancy-search → модули источников), источник не имеет права знать
 * о vacancy-search/. Поисковый запрос уже часть searchUrlTemplate — отдельного
 * поля searchText нет.
 */
export interface VacancySearchPageRequest {
  searchUrlTemplate: string;
  page: number;
}

/** §4.11.3: результат разбора страницы выдачи целиком. */
export interface VacancySearchPage {
  items: VacancySearchItem[];
  /**
   * Потолок глубины прогона (min с VACANCY_SCAN_MAX_PAGES, §4.11.1). `null`, когда
   * источник не показывает номер последней страницы: у hh.ru это короткая
   * пагинация без джампа (см. HhSearchState), у it-vacancies.ru — всегда, потому
   * что видно только окно пагинации, и принять его за потолок означало бы
   * обрезать прогон из 14 страниц на пятой. Вызывающий тогда опирается только на
   * бюджет VACANCY_SCAN_MAX_PAGES и на пустую страницу как признак конца выдачи.
   */
  lastPage: number | null;
  /** Сколько элементов выдачи отброшено из-за отсутствия обязательного поля (§4.11.3). */
  skippedInvalid: number;
}

/**
 * §4.11.1: контракт источника поиска лидов — вторая, независимая от §4.3 роль
 * источника. Реализуют HhSearchService и ItVacanciesSearchService; getmatch.ru
 * сознательно вне списка (VACANCY_LEAD_SEARCH_SOURCES) — у него есть только
 * синхронизация одной вакансии по ссылке.
 *
 * acquireRequestSlot обязателен, в отличие от VacancySourceProvider: прогон поиска
 * делает десятки запросов подряд, и источник без лимита частоты тут недопустим.
 */
export interface VacancyLeadSearchProvider {
  readonly source: VacancySource;
  readonly acquireRequestSlot: () => Promise<void>;
  /** Исключений наружу не выпускает: любой сбой — { ok: false, message }. */
  fetchSearchPage(request: VacancySearchPageRequest): Promise<VacancySearchPageResult>;
  /** Исключений наружу не выпускает: любой сбой — { ok: false, message }. */
  fetchVacancyDescription(externalId: string): Promise<VacancyDescriptionResult>;
}
