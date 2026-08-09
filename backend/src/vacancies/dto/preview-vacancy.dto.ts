import { IsString, MaxLength } from 'class-validator';

import { URL_MAX_LENGTH } from '../../applications/applications.constants';
import { TrimText } from '../../common/string.transforms';

/**
 * Тело POST /api/vacancies/preview (§5.3).
 *
 * @IsUrl здесь намеренно нет: по §5.3 нераспознанная ссылка — это 200 с нулями,
 * а не 400. Любая строка законна, решение принимает реестр провайдеров (§4.2).
 * Ограничена только длина — тем же лимитом, что и колонка vacancy_url, из которой
 * этот URL в итоге и приходит.
 */
export class PreviewVacancyDto {
  @IsString()
  @MaxLength(URL_MAX_LENGTH)
  @TrimText()
  url!: string;
}
