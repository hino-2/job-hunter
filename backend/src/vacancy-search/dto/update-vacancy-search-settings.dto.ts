import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Validate,
} from 'class-validator';

import { TrimEachText, TrimText } from '../../common/string.transforms';
import {
  HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN,
  HH_SEARCH_URL_TEXT_PLACEHOLDER_PATTERN,
} from '../../hh/hh.constants';
import { SearchUrlTemplateConstraint } from './search-url-template.validator';
import {
  PLACEHOLDER_DESCRIPTION_PATTERN,
  PLACEHOLDER_KEYWORDS_PATTERN,
  PLACEHOLDER_TITLES_PATTERN,
  VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_DESCRIPTION_MESSAGE,
  VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_KEYWORDS_MESSAGE,
  VACANCY_SEARCH_SETTINGS_PROMPT_MAX_LENGTH,
  VACANCY_SEARCH_SETTINGS_SEARCH_TEXT_LENGTH,
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_MISSING_PAGE_MESSAGE,
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_MISSING_TEXT_MESSAGE,
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_ORIGIN_MESSAGE,
  VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH,
  VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_KEYWORDS_MESSAGE,
  VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_TITLES_MESSAGE,
} from '../vacancy-search.constants';

/**
 * Тело PUT /api/vacancy-search-settings (§5.7). Ресурс один, форма на фронте
 * отправляет его целиком — отсюда PUT, а не PATCH.
 *
 * searchUrlTemplate — обычное поле настроек (§3.6), больше не значение env:
 * оба плейсхолдера ({text}/{page}) проверяются теми же паттернами, что подставляет
 * buildHhSearchUrl (hh/hh.constants.ts), а происхождение (https + хост hh.ru,
 * SSRF-защита) — отдельным ValidatorConstraint (SearchUrlTemplateConstraint),
 * потому что @Matches не умеет разбирать URL.
 *
 * Порядок декораторов: трансформеры (@TrimText/@TrimEachText) выполняются при
 * plainToInstance до всякой валидации, поэтому физическое место в списке декораторов
 * не влияет на порядок — здесь они, как и в остальных DTO проекта, идут последними.
 */
export class UpdateVacancySearchSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(VACANCY_SEARCH_SETTINGS_SEARCH_TEXT_LENGTH)
  @TrimText()
  searchText!: string;

  /** §5.7: без ключевых слов отбор бессмысленен — непустой массив непустых строк. */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @TrimEachText()
  keywords!: string[];

  /** §5.7: допустимо пустой массив — стоп-слова не обязательны. */
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @TrimEachText()
  excludeKeywords!: string[];

  /**
   * §4.12.2: обязаны быть плейсхолдеры {keywords} и {titles} — иначе промпт
   * молчаливо не видит данных, а поймать это по результату почти невозможно.
   * Сообщения начинаются с имени поля ($property) — по этому префиксу фронт
   * кладёт текст под нужный контрол (§5.7).
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(VACANCY_SEARCH_SETTINGS_PROMPT_MAX_LENGTH)
  @Matches(PLACEHOLDER_KEYWORDS_PATTERN, {
    message: VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_KEYWORDS_MESSAGE,
  })
  @Matches(PLACEHOLDER_TITLES_PATTERN, {
    message: VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_TITLES_MESSAGE,
  })
  titlePrompt!: string;

  /** §4.12.2: обязаны быть плейсхолдеры {keywords} и {description}. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(VACANCY_SEARCH_SETTINGS_PROMPT_MAX_LENGTH)
  @Matches(PLACEHOLDER_KEYWORDS_PATTERN, {
    message: VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_KEYWORDS_MESSAGE,
  })
  @Matches(PLACEHOLDER_DESCRIPTION_PATTERN, {
    message: VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_DESCRIPTION_MESSAGE,
  })
  descriptionPrompt!: string;

  @IsBoolean()
  aiEnabled!: boolean;

  /**
   * §3.6/§4.11.1/§5.7: шаблон ссылки на выдачу hh.ru. Плейсхолдеры проверяются
   * @Matches (тот же приём, что у промптов), происхождение — SearchUrlTemplateConstraint
   * (https:// + хост из allow-list hh.ru, §4.2) во избежание SSRF через этот PUT.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(VACANCY_SEARCH_SETTINGS_SEARCH_URL_TEMPLATE_LENGTH)
  @Matches(HH_SEARCH_URL_TEXT_PLACEHOLDER_PATTERN, {
    message: VACANCY_SEARCH_SETTINGS_SEARCH_URL_MISSING_TEXT_MESSAGE,
  })
  @Matches(HH_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN, {
    message: VACANCY_SEARCH_SETTINGS_SEARCH_URL_MISSING_PAGE_MESSAGE,
  })
  @Validate(SearchUrlTemplateConstraint, { message: VACANCY_SEARCH_SETTINGS_SEARCH_URL_ORIGIN_MESSAGE })
  @TrimText()
  searchUrlTemplate!: string;
}
