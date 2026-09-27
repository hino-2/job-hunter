import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { IconButton, TableCell, TableRow, TextField, Tooltip } from '@mui/material';
import { useState } from 'react';
import type { ChangeEvent } from 'react';

import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from '../../constants/application.constants';
import {
  COMPANY_CAREER_SITE_DELETE_ERROR_FALLBACK_MESSAGE,
  COMPANY_CAREER_SITE_DELETE_LABEL,
  COMPANY_CAREER_SITE_NAME_LABEL,
  COMPANY_CAREER_SITE_PARSER_MISSING_TOOLTIP,
  COMPANY_CAREER_SITE_UPDATE_ERROR_FALLBACK_MESSAGE,
  COMPANY_CAREER_SITE_URL_LABEL,
} from '../../constants/company-career-site.constants';
import { useDeleteCompanyCareerSite } from '../../hooks/useDeleteCompanyCareerSite';
import { useUpdateCompanyCareerSite } from '../../hooks/useUpdateCompanyCareerSite';
import type { UpdateCompanyCareerSiteVariables } from '../../hooks/use-update-company-career-site.interfaces';
import { extractApiErrorMessage } from '../../utils/error.utils';
import {
  validateCompanyCareerSiteName,
  validateCompanyCareerSiteUrl,
} from '../../utils/company-career-site.utils';
import type { CompanyCareerSiteRowProps } from './company-career-site-row.interfaces';

/**
 * Строка сайта компании (§7.9, §5.9): инлайн-правка name/url с сохранением по blur,
 * тем же приёмом, что автосейв полей отклика (§7.3), только без debounce — здесь нет
 * промежуточного «печатает», сохранение случается один раз на выход из поля.
 *
 * Черновики — локальный useState, а не useInlineEdits: тот хук держит состояние
 * сразу всего списка ради коллапса аккордеона по «Свернуть все» (§7.3), здесь
 * такой связи между строками нет, и локальный стейт проще.
 */
export function CompanyCareerSiteRow({ site, onError }: CompanyCareerSiteRowProps) {
  const [nameDraft, setNameDraft] = useState(site.name);
  const [urlDraft, setUrlDraft] = useState(site.url);

  const handleUpdateFailed = (error: Error, variables: UpdateCompanyCareerSiteVariables) => {
    if (variables.patch.name !== undefined) {
      setNameDraft(site.name);
    }

    if (variables.patch.url !== undefined) {
      setUrlDraft(site.url);
    }

    onError(extractApiErrorMessage(error, COMPANY_CAREER_SITE_UPDATE_ERROR_FALLBACK_MESSAGE));
  };

  const updateSite = useUpdateCompanyCareerSite({ onFailed: handleUpdateFailed });

  const handleDeleteFailed = (error: Error) => {
    onError(extractApiErrorMessage(error, COMPANY_CAREER_SITE_DELETE_ERROR_FALLBACK_MESSAGE));
  };

  const deleteSite = useDeleteCompanyCareerSite({ onFailed: handleDeleteFailed });

  const nameError = validateCompanyCareerSiteName(nameDraft);
  const urlError = validateCompanyCareerSiteUrl(urlDraft);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNameDraft(event.target.value);
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUrlDraft(event.target.value);
  };

  const handleNameBlur = () => {
    const trimmed = nameDraft.trim();

    if (nameError !== null || trimmed === site.name) {
      return;
    }

    updateSite.mutate({ id: site.id, patch: { name: trimmed } });
  };

  const handleUrlBlur = () => {
    const trimmed = urlDraft.trim();

    if (urlError !== null || trimmed === site.url) {
      return;
    }

    updateSite.mutate({ id: site.id, patch: { url: trimmed } });
  };

  const handleDelete = () => {
    deleteSite.mutate(site.id);
  };

  return (
    <TableRow>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          value={nameDraft}
          error={nameError !== null}
          helperText={nameError}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          slotProps={{
            htmlInput: { maxLength: COMPANY_MAX_LENGTH, 'aria-label': COMPANY_CAREER_SITE_NAME_LABEL },
          }}
        />
      </TableCell>

      <TableCell>
        <TextField
          size="small"
          fullWidth
          value={urlDraft}
          error={urlError !== null}
          helperText={urlError}
          onChange={handleUrlChange}
          onBlur={handleUrlBlur}
          slotProps={{
            htmlInput: { maxLength: URL_MAX_LENGTH, 'aria-label': COMPANY_CAREER_SITE_URL_LABEL },
          }}
        />
      </TableCell>

      <TableCell>
        {!site.parserSupported ? (
          <Tooltip title={COMPANY_CAREER_SITE_PARSER_MISSING_TOOLTIP}>
            <WarningAmberOutlinedIcon color="warning" />
          </Tooltip>
        ) : null}
      </TableCell>

      <TableCell>
        <IconButton
          aria-label={COMPANY_CAREER_SITE_DELETE_LABEL}
          disabled={deleteSite.isPending}
          onClick={handleDelete}
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
