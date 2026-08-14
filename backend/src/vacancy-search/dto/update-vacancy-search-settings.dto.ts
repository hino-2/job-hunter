import { ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

import { TrimEachText, TrimText } from '../../common/string.transforms';
import {
  PLACEHOLDER_DESCRIPTION_PATTERN,
  PLACEHOLDER_KEYWORDS_PATTERN,
  PLACEHOLDER_TITLES_PATTERN,
  VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_DESCRIPTION_MESSAGE,
  VACANCY_SEARCH_SETTINGS_DESCRIPTION_PROMPT_MISSING_KEYWORDS_MESSAGE,
  VACANCY_SEARCH_SETTINGS_PROMPT_MAX_LENGTH,
  VACANCY_SEARCH_SETTINGS_SEARCH_TEXT_LENGTH,
  VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_KEYWORDS_MESSAGE,
  VACANCY_SEARCH_SETTINGS_TITLE_PROMPT_MISSING_TITLES_MESSAGE,
} from '../vacancy-search.constants';

/**
 * Тело PUT /api/vacancy-search-settings (§5.7). Ресурс один, форма на фронте
 * отправляет его целиком — отсюда PUT, а не PATCH.
 *
 * searchUrlTemplate здесь намеренно нет: это значение env, а не настройка,
 * forbidNonWhitelisted даст 400 на попытку его прислать.
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
}
