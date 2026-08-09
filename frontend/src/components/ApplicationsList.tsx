import { Alert, Button, Skeleton, Stack } from '@mui/material';

import { EMPTY_PENDING_TEXT_VALUES, EMPTY_SAVED_FIELDS } from '../constants/application.constants';
import {
  ACCORDION_GAP,
  LIST_SKELETON_COUNT,
  SUMMARY_MIN_HEIGHT_PX,
} from '../constants/layout.constants';
import { ApplicationAccordion } from './ApplicationAccordion';
import type { ApplicationsListProps } from './applications-list.interfaces';
import { EmptyState } from './EmptyState';

/** Список аккордеонов и все его состояния: загрузка, ошибка, пусто, данные (§7.8). */
export function ApplicationsList({
  applications,
  isPending,
  isError,
  isFilterActive,
  onRetry,
  onResetFilters,
  expandedIds,
  onToggle,
  pendingById,
  savedById,
  editHandlers,
  onAdd,
  syncingIds,
  onSync,
  onDelete,
}: ApplicationsListProps) {
  if (isPending) {
    // Высота скелетона равна высоте свёрнутой шапки — иначе список «прыгал» бы,
    // когда заглушки сменяются данными.
    return (
      <Stack spacing={ACCORDION_GAP}>
        {Array.from({ length: LIST_SKELETON_COUNT }, (_unused, index) => (
          <Skeleton key={index} variant="rounded" height={SUMMARY_MIN_HEIGHT_PX} />
        ))}
      </Stack>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={onRetry}>
            Повторить
          </Button>
        }
      >
        Не удалось загрузить список вакансий
      </Alert>
    );
  }

  if (applications.length === 0) {
    // Человеку, который просто неудачно отфильтровал, предлагать «+ Добавить» вредно —
    // ему нужна другая кнопка.
    return isFilterActive ? (
      <EmptyState
        title="Ничего не найдено"
        description="Измените фильтры или поисковый запрос"
        actionLabel="Сбросить фильтры"
        onAction={onResetFilters}
      />
    ) : (
      <EmptyState title="Пока нет ни одной записи" actionLabel="+ Добавить" onAction={onAdd} />
    );
  }

  return (
    <Stack spacing={ACCORDION_GAP}>
      {applications.map((application) => (
        <ApplicationAccordion
          key={application.id}
          application={application}
          // Именно срезы по id, а не словари целиком: иначе правка в одной записи
          // меняла бы проп у всех и memo на аккордеоне ничего бы не спасал.
          // ?? обязателен — в tsconfig включён noUncheckedIndexedAccess.
          pending={pendingById[application.id] ?? EMPTY_PENDING_TEXT_VALUES}
          savedFields={savedById[application.id] ?? EMPTY_SAVED_FIELDS}
          handlers={editHandlers}
          expanded={expandedIds.has(application.id)}
          onToggle={onToggle}
          isSyncing={syncingIds.has(application.id)}
          onSync={onSync}
          onDelete={onDelete}
        />
      ))}
    </Stack>
  );
}
