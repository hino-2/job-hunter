import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  DIALOG_CONTENT_PADDING_TOP,
  FIELD_GAP,
  MULTILINE_MAX_ROWS_PROMPT,
  MULTILINE_MAX_ROWS_URL_TEMPLATE,
  MULTILINE_MIN_ROWS_PROMPT,
  MULTILINE_MIN_ROWS_URL_TEMPLATE,
  SETTINGS_DIALOG_MAX_WIDTH,
} from '../../constants/layout.constants';
import {
  AI_ENABLED_DESCRIPTION,
  AI_ENABLED_LABEL,
  DEFAULT_DESCRIPTION_PROMPT,
  DEFAULT_SEARCH_URL_TEMPLATE,
  DEFAULT_TITLE_PROMPT,
  DESCRIPTION_PROMPT_HINT,
  DESCRIPTION_PROMPT_LABEL,
  DESCRIPTION_PROMPT_MISSING_PLACEHOLDERS_MESSAGE,
  EXCLUDE_KEYWORDS_LABEL,
  KEYWORDS_HINT,
  KEYWORDS_LABEL,
  KEYWORDS_REQUIRED_MESSAGE,
  PLACEHOLDER_DESCRIPTION_PATTERN,
  PLACEHOLDER_KEYWORDS_PATTERN,
  PLACEHOLDER_TITLES_PATTERN,
  PROMPT_MAX_LENGTH,
  PROMPT_REQUIRED_MESSAGE,
  PROMPT_TOO_LONG_MESSAGE,
  RESET_PROMPT_LABEL,
  RESET_SEARCH_URL_TEMPLATE_LABEL,
  SEARCH_TEXT_LABEL,
  SEARCH_TEXT_MAX_LENGTH,
  SEARCH_TEXT_REQUIRED_MESSAGE,
  SEARCH_TEXT_TOO_LONG_MESSAGE,
  SEARCH_URL_TEMPLATE_HINT,
  SEARCH_URL_TEMPLATE_INVALID_MESSAGE,
  SEARCH_URL_TEMPLATE_LABEL,
  SEARCH_URL_TEMPLATE_MAX_LENGTH,
  SEARCH_URL_TEMPLATE_MISSING_PLACEHOLDERS_MESSAGE,
  SEARCH_URL_TEMPLATE_PAGE_PLACEHOLDER_PATTERN,
  SEARCH_URL_TEMPLATE_REQUIRED_MESSAGE,
  SEARCH_URL_TEMPLATE_TEXT_PLACEHOLDER_PATTERN,
  SEARCH_URL_TEMPLATE_TOO_LONG_MESSAGE,
  SETTINGS_DIALOG_TITLE,
  SETTINGS_LOAD_ERROR_MESSAGE,
  TITLE_PROMPT_HINT,
  TITLE_PROMPT_LABEL,
  TITLE_PROMPT_MISSING_PLACEHOLDERS_MESSAGE,
  URL_PREVIEW_LABEL,
} from '../../constants/vacancy-search.constants';
import { useUpdateVacancySearchSettings } from '../../hooks/useUpdateVacancySearchSettings';
import { useVacancySearchSettings } from '../../hooks/useVacancySearchSettings';
import type { SearchSettingsFormValues } from '../../types/vacancy-search-settings-form.interfaces';
import { extractFieldValidationErrors } from '../../utils/error.utils';
import {
  buildSearchUrlPreview,
  buildSettingsFormValues,
  buildSettingsUpdatePayload,
  hasAllPlaceholders,
  isValidSearchUrlTemplateShape,
  parseKeywordsInput,
} from '../../utils/vacancy-search-settings.utils';
import { SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS } from './search-settings-dialog.constants';
import type {
  SearchSettingsDialogProps,
  SearchSettingsFormProps,
} from './search-settings-dialog.interfaces';

/**
 * Форма настроек поиска (§7.9.4), смонтированная только после загрузки настроек —
 * тем же приёмом, что CreateApplicationDialog: свежий монтаж сам даёт чистое
 * состояние, useEffect на смену пропа не нужен.
 */
function SearchSettingsForm({
  settings,
  isSaving,
  onSubmit,
  onClose,
  serverFieldErrors,
  onFieldEdited,
}: SearchSettingsFormProps) {
  const [values, setValues] = useState<SearchSettingsFormValues>(() =>
    buildSettingsFormValues(settings),
  );
  const valuesRef = useRef(values);
  const [isSearchTextTouched, setSearchTextTouched] = useState(false);
  const [isKeywordsTouched, setKeywordsTouched] = useState(false);
  const [isTitlePromptTouched, setTitlePromptTouched] = useState(false);
  const [isDescriptionPromptTouched, setDescriptionPromptTouched] = useState(false);
  const [isSearchUrlTemplateTouched, setSearchUrlTemplateTouched] = useState(false);

  const writeValues = (next: SearchSettingsFormValues) => {
    valuesRef.current = next;
    setValues(next);
  };

  const patchValues = (patch: Partial<SearchSettingsFormValues>) => {
    writeValues({ ...valuesRef.current, ...patch });
  };

  const trimmedSearchText = values.searchText.trim();
  const isSearchTextEmpty = trimmedSearchText.length === 0;
  const isSearchTextTooLong = values.searchText.length > SEARCH_TEXT_MAX_LENGTH;
  const isKeywordsEmpty = parseKeywordsInput(values.keywordsText).length === 0;
  const isTitlePromptEmpty = values.titlePrompt.trim().length === 0;
  const isTitlePromptTooLong = values.titlePrompt.length > PROMPT_MAX_LENGTH;
  const isTitlePromptMissingPlaceholders = !hasAllPlaceholders(values.titlePrompt, [
    PLACEHOLDER_KEYWORDS_PATTERN,
    PLACEHOLDER_TITLES_PATTERN,
  ]);
  const isDescriptionPromptEmpty = values.descriptionPrompt.trim().length === 0;
  const isDescriptionPromptTooLong = values.descriptionPrompt.length > PROMPT_MAX_LENGTH;
  const isDescriptionPromptMissingPlaceholders = !hasAllPlaceholders(values.descriptionPrompt, [
    PLACEHOLDER_KEYWORDS_PATTERN,
    PLACEHOLDER_DESCRIPTION_PATTERN,
  ]);
  const trimmedSearchUrlTemplate = values.searchUrlTemplate.trim();
  const isSearchUrlTemplateEmpty = trimmedSearchUrlTemplate.length === 0;
  const isSearchUrlTemplateTooLong = values.searchUrlTemplate.length > SEARCH_URL_TEMPLATE_MAX_LENGTH;
  const isSearchUrlTemplateMissingPlaceholders = !hasAllPlaceholders(values.searchUrlTemplate, [
    SEARCH_URL_TEMPLATE_TEXT_PLACEHOLDER_PATTERN,
    SEARCH_URL_TEMPLATE_PAGE_PLACEHOLDER_PATTERN,
  ]);
  const isSearchUrlTemplateMalformed = !isValidSearchUrlTemplateShape(values.searchUrlTemplate);

  // Заведомо невалидные значения на сервер не отправляются вовсе (§10): каждая проверка
  // здесь дублирует правило UpdateVacancySearchSettingsDto (§5.7).
  const isSubmitDisabled =
    isSaving ||
    isSearchTextEmpty ||
    isSearchTextTooLong ||
    isKeywordsEmpty ||
    isTitlePromptEmpty ||
    isTitlePromptTooLong ||
    isTitlePromptMissingPlaceholders ||
    isDescriptionPromptEmpty ||
    isDescriptionPromptTooLong ||
    isDescriptionPromptMissingPlaceholders ||
    isSearchUrlTemplateEmpty ||
    isSearchUrlTemplateTooLong ||
    isSearchUrlTemplateMissingPlaceholders ||
    isSearchUrlTemplateMalformed;

  const titlePromptClientError = !isTitlePromptTouched
    ? null
    : isTitlePromptEmpty
      ? PROMPT_REQUIRED_MESSAGE
      : isTitlePromptTooLong
        ? PROMPT_TOO_LONG_MESSAGE
        : isTitlePromptMissingPlaceholders
          ? TITLE_PROMPT_MISSING_PLACEHOLDERS_MESSAGE
          : null;
  const titlePromptError = titlePromptClientError ?? serverFieldErrors.titlePrompt ?? null;

  const descriptionPromptClientError = !isDescriptionPromptTouched
    ? null
    : isDescriptionPromptEmpty
      ? PROMPT_REQUIRED_MESSAGE
      : isDescriptionPromptTooLong
        ? PROMPT_TOO_LONG_MESSAGE
        : isDescriptionPromptMissingPlaceholders
          ? DESCRIPTION_PROMPT_MISSING_PLACEHOLDERS_MESSAGE
          : null;
  const descriptionPromptError =
    descriptionPromptClientError ?? serverFieldErrors.descriptionPrompt ?? null;

  const searchUrlTemplateClientError = !isSearchUrlTemplateTouched
    ? null
    : isSearchUrlTemplateEmpty
      ? SEARCH_URL_TEMPLATE_REQUIRED_MESSAGE
      : isSearchUrlTemplateTooLong
        ? SEARCH_URL_TEMPLATE_TOO_LONG_MESSAGE
        : isSearchUrlTemplateMissingPlaceholders
          ? SEARCH_URL_TEMPLATE_MISSING_PLACEHOLDERS_MESSAGE
          : isSearchUrlTemplateMalformed
            ? SEARCH_URL_TEMPLATE_INVALID_MESSAGE
            : null;
  const searchUrlTemplateError =
    searchUrlTemplateClientError ?? serverFieldErrors.searchUrlTemplate ?? null;

  const searchTextError = !isSearchTextTouched
    ? null
    : isSearchTextEmpty
      ? SEARCH_TEXT_REQUIRED_MESSAGE
      : isSearchTextTooLong
        ? SEARCH_TEXT_TOO_LONG_MESSAGE
        : null;

  const handleSearchTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    patchValues({ searchText: event.target.value });
  };

  const handleKeywordsChange = (event: ChangeEvent<HTMLInputElement>) => {
    patchValues({ keywordsText: event.target.value });
  };

  const handleExcludeKeywordsChange = (event: ChangeEvent<HTMLInputElement>) => {
    patchValues({ excludeKeywordsText: event.target.value });
  };

  const handleTitlePromptChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    patchValues({ titlePrompt: event.target.value });
    onFieldEdited('titlePrompt');
  };

  const handleDescriptionPromptChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    patchValues({ descriptionPrompt: event.target.value });
    onFieldEdited('descriptionPrompt');
  };

  const handleResetTitlePrompt = () => {
    patchValues({ titlePrompt: DEFAULT_TITLE_PROMPT });
    onFieldEdited('titlePrompt');
  };

  const handleResetDescriptionPrompt = () => {
    patchValues({ descriptionPrompt: DEFAULT_DESCRIPTION_PROMPT });
    onFieldEdited('descriptionPrompt');
  };

  const handleAiEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    patchValues({ aiEnabled: event.target.checked });
  };

  const handleSearchUrlTemplateChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    patchValues({ searchUrlTemplate: event.target.value });
    onFieldEdited('searchUrlTemplate');
  };

  const handleResetSearchUrlTemplate = () => {
    patchValues({ searchUrlTemplate: DEFAULT_SEARCH_URL_TEMPLATE });
    onFieldEdited('searchUrlTemplate');
  };

  const handleSubmit = () => {
    setSearchTextTouched(true);
    setKeywordsTouched(true);
    setTitlePromptTouched(true);
    setDescriptionPromptTouched(true);
    setSearchUrlTemplateTouched(true);
    onSubmit(valuesRef.current);
  };

  const urlPreview = buildSearchUrlPreview(values.searchUrlTemplate, values.searchText);

  return (
    <>
      <DialogContent sx={{ pt: DIALOG_CONTENT_PADDING_TOP }}>
        <Stack spacing={FIELD_GAP}>
          <TextField
            autoFocus
            fullWidth
            label={SEARCH_TEXT_LABEL}
            value={values.searchText}
            error={searchTextError !== null}
            helperText={searchTextError ?? undefined}
            onChange={handleSearchTextChange}
            onBlur={() => setSearchTextTouched(true)}
            slotProps={{ htmlInput: { maxLength: SEARCH_TEXT_MAX_LENGTH } }}
          />

          <Stack spacing={0}>
            <TextField
              fullWidth
              multiline
              minRows={MULTILINE_MIN_ROWS_URL_TEMPLATE}
              maxRows={MULTILINE_MAX_ROWS_URL_TEMPLATE}
              label={SEARCH_URL_TEMPLATE_LABEL}
              value={values.searchUrlTemplate}
              error={searchUrlTemplateError !== null}
              helperText={searchUrlTemplateError ?? SEARCH_URL_TEMPLATE_HINT}
              onChange={handleSearchUrlTemplateChange}
              onBlur={() => setSearchUrlTemplateTouched(true)}
              slotProps={{ htmlInput: { maxLength: SEARCH_URL_TEMPLATE_MAX_LENGTH } }}
            />
            <Button
              size="small"
              onClick={handleResetSearchUrlTemplate}
              sx={{ alignSelf: 'flex-start' }}
            >
              {RESET_SEARCH_URL_TEMPLATE_LABEL}
            </Button>
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {URL_PREVIEW_LABEL}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {urlPreview}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label={KEYWORDS_LABEL}
            value={values.keywordsText}
            error={isKeywordsTouched && isKeywordsEmpty}
            helperText={isKeywordsTouched && isKeywordsEmpty ? KEYWORDS_REQUIRED_MESSAGE : KEYWORDS_HINT}
            onChange={handleKeywordsChange}
            onBlur={() => setKeywordsTouched(true)}
          />

          <TextField
            fullWidth
            label={EXCLUDE_KEYWORDS_LABEL}
            value={values.excludeKeywordsText}
            helperText={KEYWORDS_HINT}
            onChange={handleExcludeKeywordsChange}
          />

          <Stack spacing={0}>
            <TextField
              fullWidth
              multiline
              minRows={MULTILINE_MIN_ROWS_PROMPT}
              maxRows={MULTILINE_MAX_ROWS_PROMPT}
              label={TITLE_PROMPT_LABEL}
              value={values.titlePrompt}
              error={titlePromptError !== null}
              helperText={titlePromptError ?? TITLE_PROMPT_HINT}
              onChange={handleTitlePromptChange}
              onBlur={() => setTitlePromptTouched(true)}
              slotProps={{ htmlInput: { maxLength: PROMPT_MAX_LENGTH } }}
            />
            <Button size="small" onClick={handleResetTitlePrompt} sx={{ alignSelf: 'flex-start' }}>
              {RESET_PROMPT_LABEL}
            </Button>
          </Stack>

          <Stack spacing={0}>
            <TextField
              fullWidth
              multiline
              minRows={MULTILINE_MIN_ROWS_PROMPT}
              maxRows={MULTILINE_MAX_ROWS_PROMPT}
              label={DESCRIPTION_PROMPT_LABEL}
              value={values.descriptionPrompt}
              error={descriptionPromptError !== null}
              helperText={descriptionPromptError ?? DESCRIPTION_PROMPT_HINT}
              onChange={handleDescriptionPromptChange}
              onBlur={() => setDescriptionPromptTouched(true)}
              slotProps={{ htmlInput: { maxLength: PROMPT_MAX_LENGTH } }}
            />
            <Button
              size="small"
              onClick={handleResetDescriptionPrompt}
              sx={{ alignSelf: 'flex-start' }}
            >
              {RESET_PROMPT_LABEL}
            </Button>
          </Stack>

          <FormControlLabel
            control={<Switch checked={values.aiEnabled} onChange={handleAiEnabledChange} />}
            label={
              <Stack spacing={0}>
                <Typography variant="body2">{AI_ENABLED_LABEL}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {AI_ENABLED_DESCRIPTION}
                </Typography>
              </Stack>
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button disabled={isSaving} onClick={onClose}>
          Отмена
        </Button>

        <Button variant="contained" disabled={isSubmitDisabled} onClick={handleSubmit}>
          {isSaving ? <CircularProgress size={20} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Диалог настроек поиска (§7.9.4) — не отдельная вкладка ("настройки правят редко").
 * Двухфазный монтаж: пока GET не ответил, показываем облегчённый Dialog с загрузкой/
 * ошибкой, а форму (SearchSettingsForm) монтируем только когда settings уже есть —
 * тем же способом, что и CreateApplicationDialog, только источник начальных значений
 * здесь асинхронный.
 */
export function SearchSettingsDialog({ onClose, onSaved, onSaveFailed }: SearchSettingsDialogProps) {
  const settingsQuery = useVacancySearchSettings();
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<string, string>>>({});

  const handleSaved = () => {
    onSaved();
  };

  const handleFailed = (error: Error) => {
    const fieldErrors = extractFieldValidationErrors(error, SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS);

    if (Object.keys(fieldErrors).length > 0) {
      setServerFieldErrors(fieldErrors);

      return;
    }

    onSaveFailed(error);
  };

  const updateSettings = useUpdateVacancySearchSettings({
    onSaved: handleSaved,
    onFailed: handleFailed,
  });

  const handleFieldEdited = (field: string) => {
    setServerFieldErrors((previous) =>
      previous[field] === undefined ? previous : { ...previous, [field]: undefined },
    );
  };

  const handleSubmit = (values: SearchSettingsFormValues) => {
    setServerFieldErrors({});
    updateSettings.mutate(buildSettingsUpdatePayload(values));
  };

  return (
    <Dialog open fullWidth maxWidth={SETTINGS_DIALOG_MAX_WIDTH} onClose={onClose}>
      <DialogTitle>{SETTINGS_DIALOG_TITLE}</DialogTitle>

      {settingsQuery.data === undefined ? (
        <DialogContent sx={{ pt: DIALOG_CONTENT_PADDING_TOP }}>
          {settingsQuery.isError ? (
            <Typography color="error">{SETTINGS_LOAD_ERROR_MESSAGE}</Typography>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: FIELD_GAP }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
      ) : (
        <SearchSettingsForm
          settings={settingsQuery.data}
          isSaving={updateSettings.isPending}
          onSubmit={handleSubmit}
          onClose={onClose}
          serverFieldErrors={serverFieldErrors}
          onFieldEdited={handleFieldEdited}
        />
      )}

      {settingsQuery.data === undefined ? (
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      ) : null}
    </Dialog>
  );
}
