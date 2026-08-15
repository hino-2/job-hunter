import {
  HH_COMPANY_LOGO_ENTRY_PATTERN,
  HH_COMPANY_LOGO_TYPE_GROUP,
  HH_COMPANY_LOGO_TYPE_PRIORITY,
  HH_COMPANY_LOGO_URL_GROUP,
} from './hh.constants';

/**
 * §4.10: URL логотипа компании из встроенного состояния страницы вакансии hh.ru.
 * Вынесена из hh-page.parser.ts в отдельный файл (шаг №26 §14): тем же самым HTML
 * пользуется и HhSearchService.fetchVacancyDescription (§4.11.7) — тот качает
 * страницу вакансии ради описания для ИИ-отбора, но не разбирает её целиком через
 * parseHhVacancyPage (та требует сигнал архивности и годится только для синхронизации).
 *
 * Из каждого типа берётся ПЕРВОЕ вхождение: блок работодателя самой вакансии идёт
 * в состоянии раньше похожих вакансий, у которых логотипы уже чужие. Дальше — первый
 * доступный тип по приоритету, а не первый попавшийся URL: типы в блоке перечислены
 * в порядке hh.ru, и он не совпадает с нужным нам.
 */
export function readHhCompanyLogoSrc(html: string): string | null {
  const urlByType = new Map<string, string>();

  for (const match of html.matchAll(HH_COMPANY_LOGO_ENTRY_PATTERN)) {
    const type = match[HH_COMPANY_LOGO_TYPE_GROUP]?.toLowerCase();
    const url = match[HH_COMPANY_LOGO_URL_GROUP];

    if (type === undefined || url === undefined || urlByType.has(type)) {
      continue;
    }

    urlByType.set(type, url);
  }

  for (const type of HH_COMPANY_LOGO_TYPE_PRIORITY) {
    const url = urlByType.get(type);

    if (url !== undefined) {
      return url;
    }
  }

  return null;
}
