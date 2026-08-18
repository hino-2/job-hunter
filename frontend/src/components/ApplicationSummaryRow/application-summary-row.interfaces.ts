import type { InlineEditHandlers } from '../../hooks/use-inline-edits.interfaces';
import type { Application } from '../../types/application.interfaces';

export interface ApplicationSummaryRowProps {
  application: Application;
  /**
   * Подсветка «сохранено» (§7.3) для Select'ов «Статус» и «Результат» шапки — плоские
   * булевы, а не срез Set'а: этот компонент под memo, а весь Set пересоздаётся на
   * автосейве ЛЮБОГО поля записи (company, notes, даты собесов…), не только этих двух —
   * иначе шапка перерисовывалась бы на сохранениях полей, которых она не показывает
   * (тот же приём, что и isSyncing/expandedIds.has(id) в ApplicationsList.tsx).
   */
  isStatusSaved: boolean;
  isResultSaved: boolean;
  handlers: InlineEditHandlers;
  /** §7.6: у этой записи /sync в полёте — спиннер вместо иконки, кнопка disabled. */
  isSyncing: boolean;
  onSync: (id: string) => void;
  /** Кнопка «Отказ компании»: сразу пишет result = REJECTED_BY_COMPANY (§7.3). */
  onRejectByCompany: (id: string) => void;
}
