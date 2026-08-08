import { useCallback, useMemo, useState } from 'react';

import type { ExpandedIdsController } from './use-expanded-ids.interfaces';

/**
 * Раскрытость аккордеонов (§7.2): множество id вместо одного «текущего», потому что
 * раскрытие независимое и несколько записей могут быть раскрыты одновременно.
 *
 * Стартовое множество пустое — это и даёт «при загрузке все свёрнуты» (§13.10.2)
 * без единого эффекта и без синхронизации с данными списка.
 *
 * Персистентности нет и быть не должно: §12 прямо запрещает сохранять раскрытость
 * между сессиями. id уже удалённых записей из множества не вычищаются — они безвредны,
 * потому что без записи нет и аккордеона.
 */
export function useExpandedIds(): ExpandedIdsController {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set<string>());

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  // Каждый мутатор создаёт новое множество: мутация состояния на месте невидима для React
  // и запрещена правилами React Compiler.
  const toggle = useCallback((id: string, expanded: boolean) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);

      if (expanded) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }, []);

  const expand = useCallback((id: string) => {
    setExpandedIds((previous) => {
      if (previous.has(id)) {
        return previous;
      }

      const next = new Set(previous);

      next.add(id);

      return next;
    });
  }, []);

  const expandAll = useCallback((ids: readonly string[]) => {
    setExpandedIds(new Set(ids));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set<string>());
  }, []);

  const areAllExpanded = useCallback(
    (ids: readonly string[]) => ids.length > 0 && ids.every((id) => expandedIds.has(id)),
    [expandedIds],
  );

  return useMemo(
    () => ({ isExpanded, toggle, expand, expandAll, collapseAll, areAllExpanded }),
    [isExpanded, toggle, expand, expandAll, collapseAll, areAllExpanded],
  );
}
