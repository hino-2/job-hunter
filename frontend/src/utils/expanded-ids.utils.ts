/**
 * Все ли переданные id раскрыты (§7.2.4, кнопка «Свернуть все» ↔ «Развернуть все»).
 *
 * Пустой список сознательно не считается «всё раскрыто» — иначе кнопка на пустом
 * экране показывала бы «Свернуть все».
 *
 * Отдельная функция, а не метод useExpandedIds: ей нужны id текущего списка, которых
 * хук не знает, а передача их внутрь хука сделала бы expandAll зависимым от ids
 * и убила бы постоянную идентичность ExpandedIdsActions.
 */
export function areAllExpanded(expandedIds: ReadonlySet<string>, ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => expandedIds.has(id));
}
