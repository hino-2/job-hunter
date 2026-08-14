import type { MATCH_SOURCE } from './vacancy-search.constants';

/** §4.12: кто подтвердил соответствие вакансии профилю — детерминированный отбор или ИИ. */
export type MatchSource = (typeof MATCH_SOURCE)[keyof typeof MATCH_SOURCE];
