import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { ChangeEvent } from 'react';

import { COMPANY_MAX_LENGTH, URL_MAX_LENGTH } from '../../constants/application.constants';
import {
  COMPANY_CAREER_SITE_ADD_LABEL,
  COMPANY_CAREER_SITE_CREATE_ERROR_FALLBACK_MESSAGE,
  COMPANY_CAREER_SITE_NAME_LABEL,
  COMPANY_CAREER_SITE_URL_LABEL,
  COMPANY_CAREER_SITES_COUNT_PREFIX,
  COMPANY_CAREER_SITES_COUNT_SUFFIX,
  COMPANY_CAREER_SITES_LOAD_ERROR_MESSAGE,
  COMPANY_CAREER_SITES_SECTION_TITLE,
  EMPTY_COMPANY_CAREER_SITES,
} from '../../constants/company-career-site.constants';
import {
  ACCORDION_ELEVATION,
  COMPANY_CAREER_SITE_ADD_ROW_COL_SPAN,
  SUMMARY_PADDING_X,
} from '../../constants/layout.constants';
import { useCompanyCareerSites } from '../../hooks/useCompanyCareerSites';
import { useCreateCompanyCareerSite } from '../../hooks/useCreateCompanyCareerSite';
import { extractApiErrorMessage } from '../../utils/error.utils';
import {
  validateCompanyCareerSiteName,
  validateCompanyCareerSiteUrl,
} from '../../utils/company-career-site.utils';
import { CompanyCareerSiteRow } from '../CompanyCareerSiteRow/CompanyCareerSiteRow';
import type { CompanyCareerSitesSectionProps } from './company-career-sites-section.interfaces';

/**
 * Раздел «Сайты компаний» (§7.9, §4.14) — свёрнутый по умолчанию Accordion между
 * панелью фильтров и Alert'ом прогона. Неконтролируемый (нет прокинутого expanded/
 * onChange, §10 D13): раскрытость — забота самого Accordion, отдельный useState
 * экрану не нужен, как и во внешнем состоянии VacanciesScreen.
 */
export function CompanyCareerSitesSection({ onError }: CompanyCareerSitesSectionProps) {
  const [nameDraft, setNameDraft] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [isNameTouched, setNameTouched] = useState(false);
  const [isUrlTouched, setUrlTouched] = useState(false);

  const sitesQuery = useCompanyCareerSites();
  const sites = sitesQuery.data ?? EMPTY_COMPANY_CAREER_SITES;

  const handleCreated = () => {
    setNameDraft('');
    setUrlDraft('');
    setNameTouched(false);
    setUrlTouched(false);
  };

  const handleCreateFailed = (error: Error) => {
    onError(extractApiErrorMessage(error, COMPANY_CAREER_SITE_CREATE_ERROR_FALLBACK_MESSAGE));
  };

  const createSite = useCreateCompanyCareerSite({
    onCreated: handleCreated,
    onFailed: handleCreateFailed,
  });

  const nameError = validateCompanyCareerSiteName(nameDraft);
  const urlError = validateCompanyCareerSiteUrl(urlDraft);
  const isAddDisabled = createSite.isPending || nameError !== null || urlError !== null;

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNameDraft(event.target.value);
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUrlDraft(event.target.value);
  };

  const handleAdd = () => {
    setNameTouched(true);
    setUrlTouched(true);

    if (isAddDisabled) {
      return;
    }

    createSite.mutate({ name: nameDraft.trim(), url: urlDraft.trim() });
  };

  return (
    <Accordion disableGutters elevation={ACCORDION_ELEVATION}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: SUMMARY_PADDING_X }}>
        <Typography>
          {COMPANY_CAREER_SITES_SECTION_TITLE}
          {COMPANY_CAREER_SITES_COUNT_PREFIX}
          {sites.length}
          {COMPANY_CAREER_SITES_COUNT_SUFFIX}
        </Typography>
      </AccordionSummary>

      <AccordionDetails>
        {sitesQuery.isError ? (
          <Typography color="error">{COMPANY_CAREER_SITES_LOAD_ERROR_MESSAGE}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{COMPANY_CAREER_SITE_NAME_LABEL}</TableCell>
                <TableCell>{COMPANY_CAREER_SITE_URL_LABEL}</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableHead>

            <TableBody>
              {sites.map((site) => (
                <CompanyCareerSiteRow key={site.id} site={site} onError={onError} />
              ))}

              <TableRow>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={nameDraft}
                    error={isNameTouched && nameError !== null}
                    helperText={isNameTouched ? nameError : null}
                    onChange={handleNameChange}
                    onBlur={() => setNameTouched(true)}
                    slotProps={{
                      htmlInput: {
                        maxLength: COMPANY_MAX_LENGTH,
                        'aria-label': COMPANY_CAREER_SITE_NAME_LABEL,
                      },
                    }}
                  />
                </TableCell>

                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={urlDraft}
                    error={isUrlTouched && urlError !== null}
                    helperText={isUrlTouched ? urlError : null}
                    onChange={handleUrlChange}
                    onBlur={() => setUrlTouched(true)}
                    slotProps={{
                      htmlInput: {
                        maxLength: URL_MAX_LENGTH,
                        'aria-label': COMPANY_CAREER_SITE_URL_LABEL,
                      },
                    }}
                  />
                </TableCell>

                <TableCell colSpan={COMPANY_CAREER_SITE_ADD_ROW_COL_SPAN}>
                  <Button variant="outlined" disabled={isAddDisabled} onClick={handleAdd}>
                    {COMPANY_CAREER_SITE_ADD_LABEL}
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
