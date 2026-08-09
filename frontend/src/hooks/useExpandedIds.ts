import { useCallback, useMemo, useState } from 'react';

import type { ExpandedIdsActions, ExpandedIdsController } from './use-expanded-ids.interfaces';

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
 *
 * Множество отдаётся данными, а не предикатом: предикат замкнут на состояние и менял бы
 * идентичность всего, что от него зависит, на каждый toggle. Проекция «есть ли id
 * в множестве» делается в списке, чтобы в memo-аккордеон уходил boolean-срез — тот же
 * приём, что уже применён для `syncingIds`.
 */
export function useExpandedIds(): ExpandedIdsController {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set<string>());

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

  // Все четыре мутатора имеют пустые deps, поэтому actions держит постоянную идентичность
  // на всё время жизни экрана (см. доккомментарий к ExpandedIdsActions).
  const actions = useMemo<ExpandedIdsActions>(
    () => ({ toggle, expand, expandAll, collapseAll }),
    [toggle, expand, expandAll, collapseAll],
  );

  return useMemo<ExpandedIdsController>(() => ({ expandedIds, actions }), [expandedIds, actions]);
}
