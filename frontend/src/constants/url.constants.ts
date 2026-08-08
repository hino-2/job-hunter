/**
 * Зеркало URL_VALIDATION_OPTIONS бэкенда (backend/src/applications/applications.constants.ts:187):
 * protocols http/https, require_protocol: false, require_tld: true. Дублируется вручную
 * тем же приёмом, что и enum-ы (§3.4) — shared-пакета в проекте нет.
 *
 * Нужно это ровно для одного: не отправлять PATCH, на который @IsUrl гарантированно
 * ответит 400. Точного повторения библиотечного алгоритма не требуется, но ошибаться
 * в строгую сторону нельзя: отвергнутая здесь ссылка не сохранится вообще никогда.
 */

/** Тип — readonly string[], а не литеральный кортеж: иначе includes не примет строку. */
export const URL_ALLOWED_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/** require_protocol: false — схему дописываем сами, чтобы строку принял конструктор URL. */
export const URL_DEFAULT_SCHEME = 'https://';

export const URL_SCHEME_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;

export const URL_HOSTNAME_SEPARATOR = '.';

/** Минимум две метки: домен верхнего уровня обязателен (require_tld: true). */
export const URL_HOSTNAME_MIN_LABELS = 2;

/**
 * Домен верхнего уровня: либо буквенный, либо punycode-форма. Второй вариант обязателен —
 * конструктор URL приводит кириллический хост к xn--…, а validator такой TLD принимает.
 */
export const URL_TLD_PATTERN = /^([a-z]{2,}|xn[a-z\d-]{2,})$/i;

/** Метка домена: буквы и цифры, дефис допустим, но не по краям. */
export const URL_HOSTNAME_LABEL_PATTERN = /^[a-z\d]([a-z\d-]*[a-z\d])?$/i;

/** IP-адрес хостом validator принимает и без домена верхнего уровня (проверка isIP). */
export const URL_IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

/** IPv6 конструктор URL отдаёт в скобках: https://[::1]/ → hostname === '[::1]'. */
export const URL_IPV6_PREFIX = '[';
