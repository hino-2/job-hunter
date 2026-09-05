# Job Hunter — specification index

**Version:** 1.0
**Date:** 2026-08-06
**Status:** approved for development

This specification is the single source of truth for requirements. Anything not described here is
**out of scope** (see [§12](12.0-out-of-scope-do-not-build.md)). Development history is no longer
tracked (see [§14](14.0-development-history.md)).

## How to read this directory

The specification is split **one file per (sub)section**. Read **only the file for the § you
need** — never the directory as a whole, and never several files "for context". A `§N.M` citation
in code (`§4.3`, `§7.2`, `§4.11.12`) maps to the file whose name starts with that exact number.

Section numbering is frozen: over 1200 comments in `backend/` and `frontend/` cite `§N.M`. Never
renumber a section. When a section is added, give it the next free number and add a row below.

A file named `N.0-…` holds the introductory text of section `N` — what is common to all its
subsections. It exists only where such text exists: a section that is nothing but a container for
its subsections (§1, §3, §7, §9, §4.12) has no file of its own, only the rows below.

## Index

| §       | File                                                                                                                             | What is inside                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1.1     | [1.1-what-this-is.md](1.1-what-this-is.md)                                                                                       | What the application is: a personal tracker of submitted job applications         |
| 1.2     | [1.2-operating-conditions.md](1.2-operating-conditions.md)                                                                       | Single user, local Docker, desktop browser, expected load                         |
| 1.3     | [1.3-key-principle.md](1.3-key-principle.md)                                                                                     | Maximum simplicity — no speculative abstractions                                  |
| 2.0     | [2.0-technology-stack.md](2.0-technology-stack.md)                                                                               | Intro: the listed versions are the installed and verified ones                    |
| 2.1     | [2.1-backend.md](2.1-backend.md)                                                                                                 | Backend stack table                                                               |
| 2.2     | [2.2-frontend.md](2.2-frontend.md)                                                                                               | Frontend stack table                                                              |
| 2.3     | [2.3-infrastructure.md](2.3-infrastructure.md)                                                                                   | Docker services and published ports                                               |
| 2.4     | [2.4-fixed-technical-decisions.md](2.4-fixed-technical-decisions.md)                                                             | Frozen decisions that must not be revisited (TypeScript 5.9.3, no `@nestjs/cli`)  |
| 3.1     | [3.1-table-applications.md](3.1-table-applications.md)                                                                           | Columns of the main `applications` table                                          |
| 3.2     | [3.2-enum-applicationstatus.md](3.2-enum-applicationstatus.md)                                                                   | `ApplicationStatus` values and their Russian UI labels                            |
| 3.3     | [3.3-enum-applicationresult.md](3.3-enum-applicationresult.md)                                                                   | `ApplicationResult` values and their Russian UI labels                            |
| 3.4     | [3.4-code-placement-requirements-mandatory.md](3.4-code-placement-requirements-mandatory.md)                                     | Where enums, types and constants must physically live                             |
| 3.5     | [3.5-table-vacancy-leads.md](3.5-table-vacancy-leads.md)                                                                         | `vacancy_leads` — candidate vacancies found by search                             |
| 3.6     | [3.6-table-vacancy-search-settings.md](3.6-table-vacancy-search-settings.md)                                                     | `vacancy_search_settings` — search settings edited in the UI                      |
| 3.7     | [3.7-table-vacancy-scan-position.md](3.7-table-vacancy-scan-position.md)                                                         | `vacancy_scan_position` — saved resume position of a search run                   |
| 4.0     | [4.0-integration-with-vacancy-sources.md](4.0-integration-with-vacancy-sources.md)                                               | Intro: which parts of section 4 are common and which are per-source               |
| 4.1     | [4.1-what-we-use-hh-ru.md](4.1-what-we-use-hh-ru.md)                                                                             | hh.ru: the public HTML vacancy page, no OAuth                                     |
| 4.2     | [4.2-extracting-source-and-external-id-from-a-url.md](4.2-extracting-source-and-external-id-from-a-url.md)                       | Per-source URL parsers and shared link normalization                              |
| 4.3     | [4.3-rules-for-applying-a-sync-result.md](4.3-rules-for-applying-a-sync-result.md)                                               | What a sync may and may not overwrite                                             |
| 4.4     | [4.4-autofill-on-create.md](4.4-autofill-on-create.md)                                                                           | Preview fills the create form without saving                                      |
| 4.5     | [4.5-enum-syncoutcome.md](4.5-enum-syncoutcome.md)                                                                               | `SyncOutcome` values and their meaning                                            |
| 4.6     | [4.6-request-reliability.md](4.6-request-reliability.md)                                                                         | Timeouts, retries, throttling                                                     |
| 4.7     | [4.7-background-sync.md](4.7-background-sync.md)                                                                                 | The scheduled run inside the `api` process                                        |
| 4.8     | [4.8-sources-and-providers.md](4.8-sources-and-providers.md)                                                                     | `VacancySource`, the provider registry, dispatch by source                        |
| 4.9     | [4.9-the-getmatch-ru-source.md](4.9-the-getmatch-ru-source.md)                                                                   | getmatch.ru: page paths and parsing specifics                                     |
| 4.10    | [4.10-company-logo.md](4.10-company-logo.md)                                                                                     | Downloading, storing and serving the company logo                                 |
| 4.11.0  | [4.11.0-vacancy-search-overview.md](4.11.0-vacancy-search-overview.md)                                                           | Vacancy search: a pipeline separate from sync that finds new vacancies            |
| 4.11.1  | [4.11.1-search-results-source-and-link-template.md](4.11.1-search-results-source-and-link-template.md)                           | Where results come from and how the search URL is built                           |
| 4.11.2  | [4.11.2-request-rate-and-the-per-source-throttle.md](4.11.2-request-rate-and-the-per-source-throttle.md)                         | Request rate and the per-source throttle                                          |
| 4.11.3  | [4.11.3-parsing-the-search-results-page.md](4.11.3-parsing-the-search-results-page.md)                                           | Parsing the search results page                                                   |
| 4.11.4  | [4.11.4-screening-pipeline.md](4.11.4-screening-pipeline.md)                                                                     | The screening pipeline applied to each candidate                                  |
| 4.11.5  | [4.11.5-deduplication.md](4.11.5-deduplication.md)                                                                               | Deduplication of found vacancies                                                  |
| 4.11.6  | [4.11.6-publication-date.md](4.11.6-publication-date.md)                                                                         | How the publication date is obtained                                              |
| 4.11.7  | [4.11.7-vacancy-description.md](4.11.7-vacancy-description.md)                                                                   | How the vacancy description is obtained and stored                                |
| 4.11.8  | [4.11.8-run-budgets.md](4.11.8-run-budgets.md)                                                                                   | Budgets that bound a single run                                                   |
| 4.11.9  | [4.11.9-the-run-is-asynchronous.md](4.11.9-the-run-is-asynchronous.md)                                                           | The run is asynchronous; how progress is exposed                                  |
| 4.11.10 | [4.11.10-manual-start-only.md](4.11.10-manual-start-only.md)                                                                     | Search starts only manually — never on a schedule                                 |
| 4.11.11 | [4.11.11-run-summary.md](4.11.11-run-summary.md)                                                                                 | The run summary and its counters                                                  |
| 4.11.12 | [4.11.12-stopping-and-resuming-a-run.md](4.11.12-stopping-and-resuming-a-run.md)                                                 | Stopping a run and resuming from the saved position                               |
| 4.12.1  | [4.12.1-the-decision.md](4.12.1-the-decision.md)                                                                                 | AI screening by a local model in Ollama: the decision — which model, and why local |
| 4.12.2  | [4.12.2-two-prompts.md](4.12.2-two-prompts.md)                                                                                   | AI screening: the two prompts used                                                |
| 4.12.3  | [4.12.3-response-format-and-reliability.md](4.12.3-response-format-and-reliability.md)                                           | AI screening: response format and reliability of the model output                 |
| 4.12.4  | [4.12.4-container-and-resources.md](4.12.4-container-and-resources.md)                                                           | AI screening: the Ollama container and its resource limits                        |
| 4.12.5  | [4.12.5-rejected-alternatives.md](4.12.5-rejected-alternatives.md)                                                               | AI screening: alternatives that were rejected                                     |
| 4.12.6  | [4.12.6-conclusion-is-a-local-4b-model-enough.md](4.12.6-conclusion-is-a-local-4b-model-enough.md)                               | AI screening: is a local 4B model enough                                          |
| 5.0     | [5.0-rest-api.md](5.0-rest-api.md)                                                                                               | Intro: base path, JSON, ISO 8601 dates, camelCase DTOs                            |
| 5.1     | [5.1-resource-applications.md](5.1-resource-applications.md)                                                                     | CRUD endpoints of `applications`                                                  |
| 5.2     | [5.2-sync.md](5.2-sync.md)                                                                                                       | Sync endpoints — one record and all open records                                  |
| 5.3     | [5.3-vacancy-preview.md](5.3-vacancy-preview.md)                                                                                 | The preview endpoint shared by all sources                                        |
| 5.4     | [5.4-service-endpoints.md](5.4-service-endpoints.md)                                                                             | Service endpoints (`GET /api/health`)                                             |
| 5.5     | [5.5-error-format.md](5.5-error-format.md)                                                                                       | The single error response format                                                  |
| 5.6     | [5.6-validation.md](5.6-validation.md)                                                                                           | Global `ValidationPipe` settings                                                  |
| 5.7     | [5.7-found-vacancies-vacancy-leads.md](5.7-found-vacancies-vacancy-leads.md)                                                     | Endpoints of `vacancy-leads` and `vacancy-search-settings`                        |
| 6.0     | [6.0-authorization.md](6.0-authorization.md)                                                                                     | HTTP Basic Auth on all `/api/*` except `GET /api/health`                          |
| 7.1     | [7.1-overall-structure-single-screen.md](7.1-overall-structure-single-screen.md)                                                 | Overall screen structure and the `AppBar`                                         |
| 7.2     | [7.2-record-list-accordions.md](7.2-record-list-accordions.md)                                                                   | The record list: accordions, summary row, field composition                       |
| 7.3     | [7.3-autosave-inline-edit.md](7.3-autosave-inline-edit.md)                                                                       | Inline edit autosave: blur and debounce rules                                     |
| 7.4     | [7.4-adding-a-record.md](7.4-adding-a-record.md)                                                                                 | The «+ Добавить» dialog                                                           |
| 7.5     | [7.5-deletion.md](7.5-deletion.md)                                                                                               | Deletion is not exposed in the UI                                                 |
| 7.6     | [7.6-sync-single-record.md](7.6-sync-single-record.md)                                                                           | The 🔄 button of a single record                                                  |
| 7.7     | [7.7-sync-all-open-records.md](7.7-sync-all-open-records.md)                                                                     | The bulk run and its progress indication                                          |
| 7.8     | [7.8-other-ui-requirements.md](7.8-other-ui-requirements.md)                                                                     | Russian labels, date formats, remaining UI rules                                  |
| 7.9     | [7.9-tabs-and-vacancies-screen.md](7.9-tabs-and-vacancies-screen.md)                                                             | Tabs and the «Вакансии» screen                                                    |
| 8.0     | [8.0-configuration-env.md](8.0-configuration-env.md)                                                                             | Every env variable, its default and its meaning                                   |
| 9.1     | [9.1-docker-compose-yml-services.md](9.1-docker-compose-yml-services.md)                                                         | The `docker-compose.yml` services                                                 |
| 9.2     | [9.2-requirements.md](9.2-requirements.md)                                                                                       | Requirements on the Docker setup                                                  |
| 10.0    | [10.0-code-conventions-mandatory.md](10.0-code-conventions-mandatory.md)                                                         | Mandatory code conventions for both applications                                  |
| 11.0    | [11.0-repository-structure.md](11.0-repository-structure.md)                                                                     | The monorepo layout, directory by directory                                       |
| 12.0    | [12.0-out-of-scope-do-not-build.md](12.0-out-of-scope-do-not-build.md)                                                           | What must **not** be built                                                        |
| 13.0    | [13.0-acceptance-criteria.md](13.0-acceptance-criteria.md)                                                                       | Acceptance criteria                                                               |
| 14.0    | [14.0-development-history.md](14.0-development-history.md)                                                                       | Anchor for `§14` citations — history no longer tracked                            |
