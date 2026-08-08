import {
  URL_ALLOWED_PROTOCOLS,
  URL_DEFAULT_SCHEME,
  URL_HOSTNAME_LABEL_PATTERN,
  URL_HOSTNAME_MIN_LABELS,
  URL_HOSTNAME_SEPARATOR,
  URL_IPV4_PATTERN,
  URL_IPV6_PREFIX,
  URL_SCHEME_PATTERN,
  URL_TLD_PATTERN,
} from '../constants/url.constants';

/**
 * Разбор строки со ссылкой одним конструктором URL. Он же отсеивает опасные схемы:
 * javascript:alert(1) не содержит '://', поэтому получает префикс https:// и падает
 * на невалидном порте — в href такая строка не попадёт.
 */
function parseUrl(value: string): URL | null {
  const candidate = URL_SCHEME_PATTERN.test(value) ? value : `${URL_DEFAULT_SCHEME}${value}`;

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/** Хост в объёме require_tld: true — FQDN либо IP-адрес. */
function isAllowedHostname(hostname: string): boolean {
  if (URL_IPV4_PATTERN.test(hostname) || hostname.startsWith(URL_IPV6_PREFIX)) {
    return true;
  }

  const labels = hostname.split(URL_HOSTNAME_SEPARATOR);
  const tld = labels.at(-1);

  if (labels.length < URL_HOSTNAME_MIN_LABELS || tld === undefined) {
    return false;
  }

  if (!URL_TLD_PATTERN.test(tld)) {
    return false;
  }

  return labels.every((label) => URL_HOSTNAME_LABEL_PATTERN.test(label));
}

/**
 * Можно ли отправить это значение в PATCH. Пустая строка валидна: это очистка поля в null,
 * а @IsOptional на бэкенде такое пропускает.
 */
export function isSavableUrl(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return true;
  }

  const url = parseUrl(trimmed);

  if (url === null) {
    return false;
  }

  return URL_ALLOWED_PROTOCOLS.includes(url.protocol) && isAllowedHostname(url.hostname);
}

/**
 * Абсолютный href для кнопки OpenInNew (§7.2.2). Значение без схемы получает https://,
 * невалидное — null, и тогда кнопка рисуется неактивной.
 */
export function toExternalHref(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0 || !isSavableUrl(trimmed)) {
    return null;
  }

  const url = parseUrl(trimmed);

  return url === null ? null : url.href;
}
