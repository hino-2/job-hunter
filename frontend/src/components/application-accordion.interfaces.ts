import type { Application } from '../types/application.interfaces';

export interface ApplicationAccordionProps {
  application: Application;
  expanded: boolean;
  onToggle: (id: string, expanded: boolean) => void;
  onSync?: (id: string) => void;
  onDelete?: (id: string) => void;
}
