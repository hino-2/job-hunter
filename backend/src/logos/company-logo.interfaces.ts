/**
 * Запрос на скачивание логотипа (§4.10): fileKey — application.id, logoUrl — уже
 * абсолютный. allowedHostPattern — allow-list хоста источника, которым уже проверен
 * сам logoUrl (§4.10, resolveVacancyLogoUrl); download() повторяет эту же проверку
 * на каждом хопе редиректа через beforeRedirect — иначе SSRF-защита покрывала бы
 * только первый запрос, а CDN мог бы 3xx-нуть на произвольный хост.
 */
export interface CompanyLogoDownloadRequest {
  fileKey: string;
  logoUrl: string;
  allowedHostPattern: RegExp;
  /**
   * §4.11.2: слот общего троттла источника (hh.ru — есть, HhRequestThrottle;
   * getmatch.ru — нет). Модуль logos/ про hh.ru не знает ничего — функция приезжает
   * данными от VacancySyncService (provider.acquireRequestSlot), а не импортом.
   */
  acquireSlot?: () => Promise<void>;
}

/**
 * Опции запроса, которые follow-redirects передаёт в beforeRedirect на каждом хопе
 * редиректа (§4.10) — из них guard читает только итоговый хост цели редиректа.
 * Индексная сигнатура, а не именованное поле hostname: axios типизирует свой
 * beforeRedirect параметром Record<string, any>, и именно с индексной сигнатурой
 * (any → unknown) этот тип остаётся присваиваемым без приведения через as и без
 * протаскивания any в свой код (§10 п.4) — с точным {hostname: string} tsc отказывает
 * в присваивании функции в поле beforeRedirect (контравариантность параметров).
 */
export interface CompanyLogoRedirectOptions {
  [key: string]: unknown;
}

/** Прочитанный с диска файл логотипа плюс метаданные для ответа §5.1. */
export interface CompanyLogoContent {
  buffer: Buffer;
  contentType: string;
  length: number;
}
