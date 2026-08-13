import type { InlineEditHandlers } from '../../hooks/use-inline-edits.interfaces';
import type { Application } from '../../types/application.interfaces';
import type { EditableField } from '../../types/application.type';

export interface ApplicationFieldsProps {
  /** Запись, уже смерженная с черновиками: поля и шапка обязаны показывать одно и то же. */
  application: Application;
  savedFields: ReadonlySet<EditableField>;
  handlers: InlineEditHandlers;
}
