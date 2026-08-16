# Changelog

Development history of job-hunter, formerly kept as SPECIFICATION.md §14. Step numbering is
unchanged — comments across the repo cite these numbers (e.g. "шаг №26 §14"). The normative
specification lives in [SPECIFICATION.md](./SPECIFICATION.md); this file is history only. Newest first.

---

**32. Run budgets sized for a full 40-page sweep.** _(backend)_
`VACANCY_SCAN_MAX_DURATION_MS` default `1800000 → 14400000` (30 min → 4 h) and
`VACANCY_SCAN_MAX_DETAILS` default `60 → 600` (`config.constants.ts`, `.env.example`,
`docker-compose.yml`, §4.11.8, §11). Measured against live results, 6 pages take ~30 minutes, so the
old deadline stopped a run around the sixth page with `stoppedReason: 'DEADLINE'` — far short of the
40 pages step 31 made reachable, and the details budget would have bound next. A repeat run barely
touches either budget: known vacancies are dropped by deduplication before any AI (§4.11.5). A long
deadline is no longer the only escape hatch from a bad run — §4.11.12 added manual stop. No code
change.

**31. Deeper runs, cheaper dedup, stop and resume.** _(backend + frontend)_
`VACANCY_SCAN_MAX_PAGES` default `10 → 40` (§4.11.1, §4.11.8) — now equal to hh.ru's own ceiling, a
default run exhausts the whole result set. Dedup echelon 2 (§4.11.5) moved **before** the title AI
(§4.11.4): at 40 pages most candidates on a re-run are already in the DB, so a re-judged known title
is a wasted AI call; `duplicates` now grows earlier, `rejectedTitle` shrinks to only what the model
actually saw, and `last_seen_at` is refreshed for every known lead on the page. New singleton table
`vacancy_scan_position` (§3.7, migration `CreateVacancyScanPositionTable`) persists a resume position
across restarts, separate from the in-memory `VacancyScanStateService` and from the user-owned
`vacancy_search_settings` row. New `POST /api/vacancy-leads/scan/stop` (§5.7) requests cooperative
cancellation — a boolean flag checked at page and per-lead checkpoints — ending the run with
`stoppedReason: 'STOPPED'`; `POST /scan` now takes an optional `{ mode: 'FRESH' | 'RESUME' }` body,
with `409` covering both "already running" and "no valid saved position" (§4.11.12). `GET /scan/status`
gained `pageProgress` («page N of M»), `stopRequested` and `resume`; the frontend shows a page counter
with a determinate `LinearProgress` and three buttons («Начать поиск», «Продолжить», «Остановить»).
Saving search settings now also invalidates the scan-status cache, so changing `searchText` disables
«Продолжить» immediately (§7.9.4).

**30. Company logo downloaded on record create.** _(backend + frontend)_
`POST /api/applications` now downloads the company logo (§4.10) right after the row is inserted, so a
newly created record can show it without a manual 🔄. New `VacancyLogoService`
(`vacancies/vacancy-logo.service.ts`) owns the §4.10 "download or not" rules for both the sync path
(`VacancySyncService`) and the new create path (`ApplicationsService.create`); the create path writes
only `company_logo_file` — no `last_sync_*`/`status`/`position` change, no `SKIPPED_UNSUPPORTED` for an
unrecognized link, failures are silent (`logger.warn`). One extra throttled source request per create;
frontend raises its request timeout for this call (`CREATE_REQUEST_TIMEOUT_MS = 45 000`).

**29. A summary-row click on «Вакансии» opens the vacancy.** _(frontend)_
`VacancyLeadAccordion`: the summary row opens `vacancyUrl` in a new tab (`window.open`,
`noopener,noreferrer`) instead of expanding; expansion moved onto the `ExpandMore` arrow, now an
`IconButton` with `stopPropagation()`. `Accordion` lost its `onChange` — MUI's own toggle fires on any
summary click, so keeping it would open and expand at once (§7.9.1).

**28. Documentation translated to English and condensed.** _(documentation)_
`SPECIFICATION.md` (3068 → 1664 lines) and `CLAUDE.md` (8.8k → ~4.5k tokens) rewritten in English;
§14 moved here as this file. All `§` numbering is unchanged — code comments cite it — and §14 remains
as a stub pointing here. `README.md` stays Russian; code comments, logs and error strings stay Russian
per §10.

**27. Search run detail budget raised to 60.** _(infrastructure)_
`VACANCY_SCAN_MAX_DETAILS` default `60`, was `30` (`config.constants.ts`, `.env.example`,
`docker-compose.yml`, §4.11.8, §11). No code change; `VACANCY_SCAN_MAX_DURATION_MS` still 30 minutes.

**26. Company logos on the «Вакансии» screen.** _(backend + frontend)_
Added `vacancy_leads.company_logo_file` (migration `AddVacancyLeadCompanyLogoFile`), filled from the
page already fetched for the AI description — no extra request; shared `readHhCompanyLogoSrc` lives in
`hh-company-logo.helpers.ts`. Keyword-only leads never get a logo; no backfill for old rows.

**25. Company logos survive container recreation.** _(infrastructure)_
`COMPANY_LOGO_DIR` in Docker moved from `/tmp` to named volume `logos` (`/var/lib/job-hunter/logos`);
the directory is created in the image owned by `node`, else a fresh volume is `root:root` and writes
fail. Host dev default `os.tmpdir()/job-hunter-logos` kept.

**24. Column alignment in the vacancy lead summary row.** _(frontend)_
`VacancyLeadSummaryRow` always renders the short-salary cell, empty when there is no salary (still no
dash, §7.9.1) — a skipped cell handed its 160px to the growing `position` and `company`.

**23. Sharpened title screening prompt and Cyrillic repair in settings.** _(backend)_
`SharpenVacancyTitlePrompt` rewrites `title_prompt` to §4.12.2, guarded on the previous text so a
user-edited prompt survives. `RepairVacancySearchSettingsEncoding` restores Cyrillic lost to U+FFFD;
its `down()` is empty on purpose — a revert would re-corrupt.

**22. Vacancy search, screening and display from hh.ru.** _(backend + frontend)_
New tables `vacancy_leads` (§3.5) and `vacancy_search_settings` (§3.6, one seeded row); new modules
`vacancy-search/` (§4.11) and `vacancy-ai/` (§4.12); global hh.ru throttle `HH_MAX_REQUESTS_PER_SECOND`;
`scheduler/` untouched — search runs only on the button. Default model `qwen3:4b-instruct` chosen by
measurement, `VACANCY_AI_THINK = false`; lead insert success reads `result.raw`, not `result.identifiers`,
which TypeORM fills even for `ON CONFLICT DO NOTHING` rows.

**21. Clear button on the search field.** _(frontend)_
`FilterBar` search gained an `endAdornment` `IconButton` («Очистить поиск»); always in the markup and
hidden via `visibility`, not conditional render, so the input never narrows mid-typing.

**20. Company logo in the collapsed summary row.** _(backend + frontend)_
New `company_logo_file` (`varchar(64)`, nullable, migration `AddApplicationCompanyLogoFile`, no
backfill) stores a file name, not a URL or bytes; files live in `COMPANY_LOGO_DIR`. The `logos/` module
writes atomically and never throws outward — a download failure must not change the §4.5 outcome; logo
hosts are allow-listed on the original URL **and on every redirect hop**, `svg` excluded. The API
exposes `hasCompanyLogo: boolean`; bytes via `GET /api/applications/:id/logo`, declared above `:id`.

**19. Scheduled sync of open vacancies.** _(backend)_
`scheduler/` calls the same `VacancySyncService.syncOpen()` every `SCHEDULED_SYNC_INTERVAL_MS` (default
30 min, range 60 000…86 400 000), registered via `SchedulerRegistry.addInterval` with no cleanup hook —
a second `deleteInterval` throws on `app.close()`. `SCHEDULED_SYNC_ENABLED` is the string
`'true'`/`'false'`; `@nestjs/schedule` is a `dependency` because the runtime image runs `npm ci --omit=dev`.

**18. Application favicon.** _(frontend)_
`frontend/public/favicon.ico` plus `<link rel="icon" sizes="any">`; `public/` created for the first time
and copied unhashed to the `dist` root. No Dockerfile or nginx change.

**17. Repair of vacancy source on getmatch-linked records.** _(backend)_
`RepairGetmatchVacancySource` re-derives `vacancy_source`/`vacancy_external_id` from `vacancy_url` in one
idempotent UPDATE. `GeneralizeVacancySource.down()` now nulls `vacancy_external_id` on getmatch rows
before `DROP COLUMN`, so revert → up no longer glues a getmatch id to source `'HH'`.

**16. Position auto-fill from the source vacancy title.** _(backend + frontend)_
§4.3 п. 5 rewritten: on `OK` `position` is always overwritten, even over a manual edit (explicit user
decision); `company` stays untouched. The patch key is conditional — `null` would mean "write NULL", so
an empty source response would wipe the position. Titles are trimmed to column width. No migrations.

**15. getmatch.ru integration and generalization to vacancy sources.** _(backend)_
`VacancySource` (§4.8) puts both sites behind one contract (`vacancies/`, `getmatch/`); the source is the
column `vacancy_source`, not an entity subtype. **`hh_vacancy_type` dropped entirely**, along with
`vacancyType`/`hhVacancyType` in the API. `GeneralizeVacancySource` renames `hh_vacancy_id` →
`vacancy_external_id`, `hh_archived` → `vacancy_archived`, adds `vacancy_source`, converts
`SKIPPED_NOT_HH` → `SKIPPED_UNSUPPORTED`. Env renamed without back-compat:
`HH_SYNC_CONCURRENCY`/`HH_SYNC_MIN_DELAY_MS` → `SYNC_CONCURRENCY`/`SYNC_MIN_DELAY_MS`, plus four
optional `GETMATCH_*` keys.

**14. Accordion expansion delay removed.** _(frontend)_
`useExpandedIds` returns `expandedIds` as data plus a permanently stable `actions`; "is everything
expanded" is the pure `areAllExpanded` in `utils/expanded-ids.utils.ts` — as a hook method it would make
`expandAll` depend on `ids`. `ApplicationFields`/`ApplicationSummaryRow` wrapped in `memo`, transitions
gained `mountOnEnter: true`; the `flush` → `toggle` order in `handleToggle` is §13.10.7 and must stay.

**13. «Где собес» field and two-row expanded layout.** _(frontend)_
§7.2.2 collapsed from three rows to two. `interviewUrl` registered in `EDITABLE_TEXT_FIELDS`,
`URL_TEXT_FIELDS` (else a half-typed link is wiped on `blur`), `EDITABLE_FIELDS`, the label/picker maps
and `buildTextFieldPatch`; deliberately absent from the create form (§7.4).

**12. hh.ru integration switched to parsing the vacancy HTML page.** _(backend)_
The anonymous JSON API began returning `403`, so the client does `GET {HH_SITE_BASE_URL}/vacancy/{id}`
with no query parameters (`robots.txt`: `Disallow: *?*`); parsing is the pure `hh-page.parser.ts`, no
HTML library. Archived state needs consensus of two signals — missing or contradictory is `ERROR`. The
page has no `type.id`, so that rule is gone; `HH_API_BASE_URL` renamed to `HH_SITE_BASE_URL`, no back-compat.

**11. Final pass: §13 acceptance criteria and README.** _(both)_
Full §13 run over static checks, a live compose stack and headless Chrome against a local hh.ru stub; no
divergences found. §13.20 stays partially satisfied — sync unit/e2e and frontend component tests do not
exist under the standing user decision. README rewritten as a run guide.

**10. Frontend: sync — row button, «Обновить все открытые», progress, summary.** _(frontend)_
The syncing-id set lives inside `useSyncApplication` (`isPending` describes only the last `mutate`) and
reaches the accordion as a `boolean` slice; a disabled 🔄 is wrapped in a `span` with `stopPropagation`.
`buildSyncEchoPatch` carries only sync-owned columns and `404` evicts from cache; `applications[]` from
`sync-open` is never merged — prefix invalidation only, also in `onError`. Timeouts are raised
per-request to 45 000 / 120 000 ms; the 20 000 ms default is shorter than the backend worst case.

**9. Frontend: create (with hh preview) and delete dialogs.** _(frontend)_
Both dialogs are conditionally mounted, so a fresh mount clears the form without `useEffect`; form state
stays inside the dialog. Create/delete mutations run in `App`, preview in the dialog — React Query drops
callbacks of an unmounted observer. No client-side hh link parser (§4.2 is backend-owned); the `POST`
body is built explicitly, since spreading the form trips `forbidNonWhitelisted` (§5.6).

**8. Frontend: fields in `AccordionDetails` plus inline editing with autosave.** _(frontend)_
Drafts live in `App` (`useInlineEdits`), not in the field components — collapsing is triggered from
outside (§13.10.7) and in-component state would need a forbidden `useEffect` on `expanded`. Error
rollback is **per field**, not a record snapshot; patch, rollback and echo go through prefix
`setQueriesData` with a matching `cancelQueries`, and there is no invalidation on success except on
`status`. Client URL validation mirrors the backend and must never be stricter.

**7. Frontend: shell — theme, layout constants, axios client, React Query, accordion list.** _(frontend)_
One state-owning container (`App.tsx`) plus a flat presentational tree; server data only in React Query.
Filtering, search and sorting are server-side (§5.1); the «Открытых: N / M» counter uses a separate
unfiltered observer. Expansion state starts empty and is not persisted (§12); enums are duplicated by
hand (§3.4) with `Record<Union, T>` maps so an unlabelled value fails `tsc`.

**6. Sync: `POST /:id/sync`, `POST /sync-open`, application rules.** _(backend)_
§4.3 in one service: `company`, `position` and `result` are never written, a live vacancy never changes
`status`, and a failed `save()` rolls the entity back from a snapshot. `sync-open` must stay declared
above `:id`; both endpoints answer `200` on any outcome, `404` only for a missing record. **Tests
deliberately skipped by user decision — no new spec files are created in this project**, a decision that
stands for every later step.

**5. hh module: URL parser, HTTP client with retries, `POST /api/hh/preview`.** _(backend)_
`parseHhVacancyId` is a pure function, not a provider, so `ApplicationsService` can call it without an
`applications ↔ hh` cycle. The client retries only on 429 and 5xx and never throws — every failure
becomes a §4.5 outcome. E2e point the base URL at a local stub; **no e2e ever reaches the internet**.

**4. `applications` entity, migration, CRUD, DTOs, e2e.** _(backend)_
Entity per §3.1, migration `CreateApplicationsTable` (19 columns, PK, 2 indexes, idempotent), four DTOs,
five endpoints per §5.1, e2e on a separate `jobhunter_test` database.

**3. Env config and validation, Basic Auth guard, exception filter.** _(backend)_
Every §8 variable is validated at boot, failing fast on an empty `AUTH_PASSWORD`. Basic Auth guards all
`/api/*` except `@Public()` `GET /api/health`, comparing SHA-256 digests with `timingSafeEqual`. Guard
and filter are registered in `app.setup.ts`, so prod and e2e behave identically.

**2. ESLint/Prettier/tsconfig.** Flat config in both workspaces, with
`@stylistic/padding-line-between-statements`.

**1. Repository skeleton and Docker.** npm workspaces monorepo, `docker-compose.yml`, both Dockerfiles,
`nginx.conf`, `.env.example`, README; SPA fallback and data persistence across `docker compose down` / `up`.

---

Steps 4, 6, 8, 10, 12, 13, 14, 15 and 22 required a mandatory `code-reviewer` pass.
