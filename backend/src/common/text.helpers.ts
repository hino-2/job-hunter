/**
 * Обрезка строки по ширине колонки БД в момент вычисления значения — тот же принцип,
 * что у normalizeVacancyPosition (vacancies/vacancy-position.helpers.ts): источник
 * может отдать более длинную строку, чем колонка способна принять, и без среза
 * здесь save() упал бы QueryFailedError'ом вместо штатного исхода (§4.3 п.5, §4.11.5).
 * Общий хелпер, а не копия в каждом модуле: клампить приходится и ключи дедупликации
 * лидов (§4.11.5), и прочие текстовые поля вакансий (§3.5).
 */
export function clampText(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}
