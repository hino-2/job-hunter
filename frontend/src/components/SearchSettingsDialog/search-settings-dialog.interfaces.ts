import type { SearchSettingsFormValues } from '../../types/vacancy-search-settings-form.interfaces';
import type { VacancySearchSettings } from '../../types/vacancy-search.interfaces';

export interface SearchSettingsDialogProps {
  onClose: () => void;
  onSaved: () => void;
  onSaveFailed: (error: Error) => void;
}

export interface SearchSettingsFormProps {
  settings: VacancySearchSettings;
  isSaving: boolean;
  onSubmit: (values: SearchSettingsFormValues) => void;
  onClose: () => void;
  serverFieldErrors: Partial<Record<string, string>>;
  onFieldEdited: (field: string) => void;
}
