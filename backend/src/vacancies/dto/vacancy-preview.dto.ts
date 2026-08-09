import type { VacancySource } from '../../applications/applications.type';
import { normalizeVacancyPosition } from '../vacancy-position.helpers';
import type { Vacancy, VacancyPreviewResponse, VacancyRef } from '../vacancies.interfaces';

/**
 * Ответ POST /api/vacancies/preview (§5.3). В БД ничего не пишется — это подсказка
 * для формы создания записи (§4.4).
 *
 * Маппинг написан руками, как и в ApplicationDto: имена полей API (company, position)
 * не совпадают с именами полей источника (employerName, name), и это единственное
 * место, где такое соответствие зафиксировано.
 */
export class VacancyPreviewDto implements VacancyPreviewResponse {
  source!: VacancySource | null;
  vacancyExternalId!: string | null;
  company!: string | null;
  position!: string | null;
  archived!: boolean | null;

  /** Ссылка не распознана ни одним источником: все поля null, статус 200. */
  static empty(): VacancyPreviewDto {
    const dto = new VacancyPreviewDto();

    dto.source = null;
    dto.vacancyExternalId = null;
    dto.company = null;
    dto.position = null;
    dto.archived = null;

    return dto;
  }

  static fromVacancy(ref: VacancyRef, vacancy: Vacancy): VacancyPreviewDto {
    const dto = new VacancyPreviewDto();

    dto.source = ref.source;
    dto.vacancyExternalId = ref.externalId;
    dto.company = vacancy.employerName;
    // Та же нормализация, что и при синхронизации (§4.3 п.5): без среза по ширине
    // колонки форма получила бы значение, которое @MaxLength(POSITION_MAX_LENGTH)
    // отобьёт 400 при попытке сохранить запись как есть.
    dto.position = normalizeVacancyPosition(vacancy.name);
    dto.archived = vacancy.archived;

    return dto;
  }
}
