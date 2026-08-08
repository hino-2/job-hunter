import type { HhPreviewResponse, HhVacancy } from '../hh.interfaces';

/**
 * Ответ POST /api/hh/preview (§5.3). В БД ничего не пишется — это подсказка
 * для формы создания записи (§4.4).
 *
 * Маппинг написан руками, как и в ApplicationDto: имена полей API (company, position)
 * не совпадают с именами полей hh.ru (employer.name, name), и это единственное место,
 * где такое соответствие зафиксировано.
 */
export class HhPreviewDto implements HhPreviewResponse {
  hhVacancyId!: string | null;
  company!: string | null;
  position!: string | null;
  archived!: boolean | null;
  vacancyType!: string | null;

  /** Ссылка не распознана как вакансия hh.ru: все поля null, статус 200. */
  static empty(): HhPreviewDto {
    const dto = new HhPreviewDto();

    dto.hhVacancyId = null;
    dto.company = null;
    dto.position = null;
    dto.archived = null;
    dto.vacancyType = null;

    return dto;
  }

  static fromVacancy(hhVacancyId: string, vacancy: HhVacancy): HhPreviewDto {
    const dto = new HhPreviewDto();

    dto.hhVacancyId = hhVacancyId;
    dto.company = vacancy.employerName;
    dto.position = vacancy.name;
    dto.archived = vacancy.archived;
    // §4.1: страница вакансии не содержит type.id — поле сохранено в контракте
    // ответа (§5.3), но теперь всегда null.
    dto.vacancyType = null;

    return dto;
  }
}
