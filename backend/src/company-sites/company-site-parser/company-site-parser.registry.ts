import { Injectable } from '@nestjs/common';

import { HhSearchSiteParser } from '../parsers/hh-search/hh-search.parser';
import { KonturSiteParser } from '../parsers/kontur/kontur.parser';
import { X5SiteParser } from '../parsers/x5/x5.parser';
import type { CompanySiteParser } from '../company-sites.interfaces';

/**
 * §4.14: единственная точка диспетчеризации парсера сайта компании по хосту строки —
 * тот же приём, что у VacancyProviderRegistry/VacancyLeadSearchRegistry: добавление
 * парсера — один параметр конструктора и один элемент массива, файл больше никто не
 * трогает. Это же и SSRF-граница (§4.14): resolve никогда не делает сетевой запрос
 * сам, только сравнивает хост распознанного URL со списком парсеров.
 */
@Injectable()
export class CompanySiteParserRegistry {
  private readonly parsers: readonly CompanySiteParser[];

  constructor(hhSearch: HhSearchSiteParser, kontur: KonturSiteParser, x5: X5SiteParser) {
    this.parsers = [hhSearch, kontur, x5];
  }

  /** null на любом мусоре или на URL без подходящего парсера — никогда не бросает. */
  resolve(rawUrl: string): CompanySiteParser | null {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      return null;
    }

    return this.parsers.find((parser) => parser.matches(url)) ?? null;
  }
}
