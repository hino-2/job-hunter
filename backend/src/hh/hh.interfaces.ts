/**
 * Формы данных поиска по hh.ru (§4.11.3), общие для парсера (hh-search.parser.ts)
 * и сервиса (hh-search.service.ts). Значения полей — «как отдал источник», без
 * среза по ширине колонки БД: клампинг делает конвейер отбора (§4.11.4, шаг B6)
 * при записи в vacancy_leads, тем же принципом, что normalizeVacancyPosition
 * у applications (§4.3).
 */

/**
 * §4.11.3 шаг 3: результат сужения unknown → провалидированное состояние страницы
 * выдачи, явными предикатами (isHhSearchState в hh-search.parser.ts). Отсутствие
 * vacancySearchResult/vacancies/paging — fail-loud (§4.11.3): исход ERROR, а не
 * «нашли 0 вакансий».
 *
 * paging типизирован как Record, а не разложен до lastPage.page: проверено на
 * живой выдаче (14.08.2026, text=fullstack&search_period=7, totalResults=175) —
 * при короткой пагинации (≤4 видимых страниц) hh.ru отдаёт `paging.lastPage: null`,
 * а не объект с page (тот встречается только при длинной пагинации, как в примере
 * §4.11.1 с totalResults≈180 и 39 страницами). Читает поле readLastPage в
 * hh-search.parser.ts — мягкая деградация в null, а не fail-loud: «сколько ещё
 * страниц» не обязательно для разбора текущей.
 */
export interface HhSearchState {
  vacancySearchResult: {
    vacancies: unknown[];
    paging: Record<string, unknown>;
  };
}

/**
 * §4.11.3: один элемент выдачи после разбора. vacancyUrl уже канонический
 * ({HH_SITE_BASE_URL}/vacancy/{externalId}) — links.desktop из состояния игнорируется,
 * он несёт региональный хост (§4.11.3).
 */
export interface HhSearchItem {
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
  /** Через запятую (HH_SEARCH_WORK_FORMATS_SEPARATOR) — уже готово к записи в колонку. */
  workFormats: string | null;
}

/**
 * §4.11.1/§5.7: вход HhSearchService.fetchSearchPage. Шаблон приезжает СЮДА как
 * данные снимка настроек прогона (VacancyScanService, vacancy-search/), а не через
 * DI VacancySearchSettingsService — модульная зависимость зафиксирована в одну
 * сторону (vacancy-search → hh), hh/ не имеет права знать о vacancy-search/.
 */
export interface HhSearchPageRequest {
  searchUrlTemplate: string;
  searchText: string;
  page: number;
}

/** §4.11.3: результат разбора страницы выдачи целиком. */
export interface HhSearchPage {
  items: HhSearchItem[];
  /**
   * paging.lastPage.page — потолок глубины прогона (min с VACANCY_SCAN_MAX_PAGES,
   * §4.11.1). `null`, когда hh.ru не показывает джамп на последнюю страницу
   * (короткая пагинация, см. комментарий к HhSearchState) — вызывающий (шаг B6)
   * в этом случае опирается только на бюджет VACANCY_SCAN_MAX_PAGES и на пустую
   * страницу как сигнал конца выдачи.
   */
  lastPage: number | null;
  /** Сколько элементов выдачи отброшено из-за отсутствия обязательного поля (§4.11.3). */
  skippedInvalid: number;
}
