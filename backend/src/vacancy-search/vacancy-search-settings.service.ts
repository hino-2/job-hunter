import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { HH_SEARCH_URL_TEMPLATE_ENV_KEY } from '../hh/hh.constants';
import type { UpdateVacancySearchSettingsDto } from './dto/update-vacancy-search-settings.dto';
import { parseKeywordList } from './vacancy-keywords.helpers';
import { VacancySearchSettings } from './vacancy-search-settings.entity';
import {
  KEYWORD_LIST_JOIN_SEPARATOR,
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

  /** §5.7: только на чтение — значение env, нужное фронту для предпросмотра URL. */
  readonly searchUrlTemplate: string;

  constructor(
    @InjectRepository(VacancySearchSettings)
    private readonly settings: Repository<VacancySearchSettings>,
    configService: ConfigService,
  ) {
    this.searchUrlTemplate = configService.getOrThrow<string>(HH_SEARCH_URL_TEMPLATE_ENV_KEY);
  }

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
   */
  async getSnapshot(): Promise<VacancySearchSettingsSnapshot> {
    const entity = await this.find();

    return {
      searchText: entity.searchText,
      keywords: parseKeywordList(entity.keywords),
      excludeKeywords: parseKeywordList(entity.excludeKeywords),
      titlePrompt: entity.titlePrompt,
      descriptionPrompt: entity.descriptionPrompt,
      aiEnabled: entity.aiEnabled,
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

    return this.settings.save(entity);
  }
}
