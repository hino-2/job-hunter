import type { VacancySource } from '../../types/application.type';

export interface SourceIconProps {
  /** null — только у отклика, чья ссылка не распозналась при разборе (§4.2). */
  source: VacancySource | null;
}
