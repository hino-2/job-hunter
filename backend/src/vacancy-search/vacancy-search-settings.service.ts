import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { hasHhSearchUrlPlaceholders, isAllowedHhSearchUrlOrigin } from '../hh/hh-search-url.helpers';
import type { UpdateVacancySearchSettingsDto } from './dto/update-vacancy-search-settings.dto';
import { parseKeywordList } from './vacancy-keywords.helpers';
import { VacancySearchSettings } from './vacancy-search-settings.entity';
import {
  KEYWORD_LIST_JOIN_SEPARATOR,
  VACANCY_SEARCH_SETTINGS_INVALID_URL_TEMPLATE_MESSAGE,
  VACANCY_SEARCH_SETTINGS_MISSING_MESSAGE,
  VACANCY_SEARCH_SETTINGS_SINGLETON_ID,
} from './vacancy-search.constants';
import type { VacancySearchSettingsSnapshot } from './vacancy-search.interfaces';

/**
 * §3.6: единственная строка настроек поиска. Строку засевает миграция
 * CreateVacancySearchSettingsTable — сервис её НЕ создаёт: второй путь появления
 * данных означал бы гонку на старте. Отсутствие строки — повреждение схемы,
 * а не штатный случай, поэтому find() отвечает 500 (с логом), а не подставляет
 * дефолты молча.
 */
@Injectable()
export class VacancySearchSettingsService {
  private readonly logger = new Logger(VacancySearchSettingsService.name);

  constructor(
    @InjectRepository(VacancySearchSettings)
    private readonly settings: Repository<VacancySearchSettings>,
  ) {}

  async find(): Promise<VacancySearchSettings> {
    const entity = await this.settings.findOneBy({ id: VACANCY_SEARCH_SETTINGS_SINGLETON_ID });

    if (entity === null) {
      this.logger.error(
        'Строка настроек поиска вакансий отсутствует в БД: миграция ' +
          'CreateVacancySearchSettingsTable не выполнена или строка удалена вручную',
      );

      throw new InternalServerErrorException(VACANCY_SEARCH_SETTINGS_MISSING_MESSAGE);
    }

    return entity;
  }

  /**
   * §5.7: снимок с уже разобранными списками ключевых/стоп-слов — читает конвейор
   * поиска (§4.11.4, шаг B6) ровно один раз при старте прогона.
   *
   * searchUrlTemplate проверяется здесь же fail-loud (плейсхолдеры + https-хост
   * hh.ru): PUT уже не пускает в БД ничего другого, но строку можно испортить
   * прямой правкой SQL — тогда лучше явная 500 при старте прогона, чем 40 запросов
   * подряд по странице 0 или тихий уход куда-то не туда. Значение НЕ логируется —
   * шаблон может быть большим и по сути не секрет, но сообщение и так исчерпывающее.
   */
  async getSnapshot(): Promise<VacancySearchSettingsSnapshot> {
    const entity = await this.find();

    if (
      !hasHhSearchUrlPlaceholders(entity.searchUrlTemplate) ||
      !isAllowedHhSearchUrlOrigin(entity.searchUrlTemplate)
    ) {
      this.logger.error(
        'Шаблон ссылки на выдачу hh.ru в настройках повреждён: нет плейсхолдеров' +
          ' {text}/{page} либо хост не входит в allow-list hh.ru',
      );

      throw new InternalServerErrorException(VACANCY_SEARCH_SETTINGS_INVALID_URL_TEMPLATE_MESSAGE);
    }

    return {
      searchText: entity.searchText,
      keywords: parseKeywordList(entity.keywords),
      excludeKeywords: parseKeywordList(entity.excludeKeywords),
      titlePrompt: entity.titlePrompt,
      descriptionPrompt: entity.descriptionPrompt,
      aiEnabled: entity.aiEnabled,
      searchUrlTemplate: entity.searchUrlTemplate,
      updatedAt: entity.updatedAt,
    };
  }

  async update(dto: UpdateVacancySearchSettingsDto): Promise<VacancySearchSettings> {
    const entity = await this.find();

    entity.searchText = dto.searchText;
    entity.keywords = dto.keywords.join(KEYWORD_LIST_JOIN_SEPARATOR);
    entity.excludeKeywords =
      dto.excludeKeywords.length > 0 ? dto.excludeKeywords.join(KEYWORD_LIST_JOIN_SEPARATOR) : null;
    entity.titlePrompt = dto.titlePrompt;
    entity.descriptionPrompt = dto.descriptionPrompt;
    entity.aiEnabled = dto.aiEnabled;
    entity.searchUrlTemplate = dto.searchUrlTemplate;

    return this.settings.save(entity);
  }
}
