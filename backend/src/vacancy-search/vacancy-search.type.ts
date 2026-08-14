import type { VACANCY_MATCH_MODES } from '../config/config.constants';
import type { MATCH_SOURCE } from './vacancy-search.constants';

/** §4.12: кто подтвердил соответствие вакансии профилю — детерминированный отбор или ИИ. */
export type MatchSource = (typeof MATCH_SOURCE)[keyof typeof MATCH_SOURCE];

/**
 * §4.11.4: режим отбора по ключевым словам, когда ИИ выключен или недоступен.
 * Тип выведен из VACANCY_MATCH_MODES (config/config.constants.ts) — единственного
 * места, перечисляющего допустимые значения VACANCY_MATCH_MODE (там же валидируется
 * env при старте), а не продублирован здесь отдельным union.
 */
export type VacancyMatchMode = (typeof VACANCY_MATCH_MODES)[number];
