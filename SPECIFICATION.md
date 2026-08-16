# Job Hunter — project specification

**Version:** 1.0
**Date:** 2026-08-06
**Status:** approved for development

This document is the single source of truth for requirements. Anything not described here is
**out of scope** (see §12). Development history lives in `CHANGELOG.md`.

---

## 1. Purpose and context

### 1.1 What this is

A personal tracker of submitted job applications: contacts, interview dates, notes and the final
result per entry. Vacancy status (open / withdrawn) is pulled automatically from the source vacancy
page (hh.ru or getmatch.ru).

### 1.2 Operating conditions

- Single user (the owner), single installation; runs **locally in Docker** via `docker compose up`.
- Desktop browser access. No mobile adaptation. **No** multi-tenancy, roles, registration or sharing.
- Load: a few requests per minute; hundreds of records at most.

### 1.3 Key principle

**Maximum simplicity.** No "for the future" abstractions, microservices, event sourcing, cache
layers, feature flags or i18n frameworks. Straightforward CRUD plus one external integrator.

---

## 2. Technology stack

> Versions below are the ones actually installed and verified on build (see `package-lock.json`).

### 2.1 Backend

| Component     | Choice                                            | Note                                                             |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| Language      | TypeScript **5.9.3** (strict)                     | `strict: true`, `noUncheckedIndexedAccess: true`. Not 7.x — §2.4 |
| Runtime       | Node.js 22 LTS                                    |                                                                  |
| Framework     | NestJS 11.1                                       | REST, no GraphQL                                                 |
| ORM           | TypeORM **1.1.x**                                 | `synchronize: false`, migrations only                            |
| DB            | PostgreSQL 16                                     | docker-compose service                                           |
| HTTP client   | `@nestjs/axios` 4                                 | fetches the source vacancy page (hh.ru, getmatch.ru)             |
| Validation    | `class-validator` + `class-transformer`           | global `ValidationPipe`                                          |
| Logging       | built-in NestJS `Logger`                          | no external aggregators                                          |
| Tests         | Jest 30 + ts-jest                                 | unit for URL parser and services; e2e for controllers            |
| Build / watch | `tsc` + `node --watch --require ts-node/register` | `@nestjs/cli` deliberately unused — §2.4                         |

### 2.2 Frontend

| Component    | Choice                                                            | Note                                                    |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Language     | TypeScript **5.9.3** (strict)                                     | `verbatimModuleSyntax: true`                            |
| Framework    | React 19                                                          |                                                         |
| Build        | Vite **8**                                                        |                                                         |
| UI           | MUI **v9** (`@mui/material`) + Emotion                            | default theme, light                                    |
| Icons        | `@mui/icons-material` 9                                           |                                                         |
| Dates        | `@mui/x-date-pickers` **9** + `dayjs` (AdapterDayjs, locale `ru`) | `DateTimePicker`                                        |
| API access   | `axios` + TanStack Query v5                                       | server state lives only in React Query                  |
| Global state | **none** (do not use Redux/Zustand)                               | local `useState` + React Query cache                    |
| Routing      | **none** (single screen)                                          |                                                         |
| Tests        | Vitest 4 + React Testing Library                                  | cover the create form and autosave — _deferred, §13.20_ |

### 2.3 Infrastructure

- `docker-compose.yml` — 3 services: `db`, `api`, `web`.
- `web` — nginx, serves the built React static files and proxies `/api/*` to `api`.
- Single user entry point: `http://127.0.0.1:8080`.

### 2.4 Fixed technical decisions

Already made and verified — must not be revisited without cause.

1. **TypeScript exactly 5.9.3, not 7.x.** `typescript-eslint` supports `typescript <6.1.0`, `ts-jest`
   supports `<7`; on TS 7 the project loses the linter and the backend tests (§10, §13). 5.9.3 is the
   version NestJS 11 pulls in and tests against.
2. **`@stylistic/padding-line-between-statements`, not the core ESLint rule** — the core rule is
   deprecated since ESLint 8.53 and removed in ESLint 11 (`availableUntil: 11.0.0`). Behaviour is
   identical; one config for both workspaces — `eslint.shared.mjs`. `eslint-config-prettier` does not
   disable it (verified).
3. **No `@nestjs/cli`** (~400 dev packages for `build` + `watch` only). Build is
   `tsc -p tsconfig.build.json`, dev is `node --watch --require ts-node/register src/main.ts`;
   `ts-node` is needed for the TypeORM CLI anyway. esbuild/swc/tsx **must not** be used for dev: no
   `emitDecoratorMetadata`, without which Nest DI and TypeORM mapping break.
4. **`consistent-type-imports` is disabled on the backend** — with `emitDecoratorMetadata` a class
   used only as a constructor parameter type (e.g. `DataSource`) must be imported as a value, or Nest
   cannot build DI. The rule is enabled on the frontend.
5. **`data-source.ts` exports exactly ONE `DataSource`** (only `export default`). TypeORM 1.x fails
   with `Given data source file must contain only one export of DataSource instance` if the file has
   both a named and a default export.
6. **Shared tooling lives in the root `devDependencies`** (TypeScript, ESLint, Prettier,
   typescript-eslint, @stylistic) so versions do not drift between workspaces; specific dependencies
   stay in their own workspace.
7. **The vacancy page is parsed with a regex + `JSON.parse`, without an HTML library.** hh.ru needs
   exactly two lexical operations (the body of `<script type="application/ld+json">` — a raw text
   element — and a search for `archived` tokens); cheerio/jsdom would build a full tree from 772 KB
   per request at concurrency 3. Same for getmatch.ru (§4.9), whose page carries data in the Next.js
   RSC/flight payload (`self.__next_f.push(...)`): a regex extracting the payload chunks plus
   `JSON.parse` of the object assembled from them, delimited by a character-by-character brace-balance
   scan — a regex cannot safely delimit an object of unbounded depth.
8. **The scheduler (§4.7) is `@nestjs/schedule` inside the `api` process, with the interval registered
   dynamically through `SchedulerRegistry`, not the `@Interval` decorator** — the decorator needs a
   literal at class-declaration time, while interval and on/off switch come from env, so a static
   schedule could be neither disabled nor overridden without a rebuild. System cron and a separate
   scheduler container are rejected: a second configuration site, own Basic Auth credentials, and no
   overlap protection (one boolean flag in-process). `ScheduleModule.forRoot()` is called exactly
   once, in `scheduler/scheduler.module.ts` (same principle as `TypeOrmModule.forRootAsync` living in
   `database.module.ts`, not `app.module.ts`). No custom interval-cleanup hook:
   `SchedulerOrchestrator.beforeApplicationShutdown()` clears intervals by registry key itself, and a
   second `deleteInterval` would throw on `app.close()`.

---

## 3. Data model

### 3.1 Table `applications`

| Column (DB)           | DB type        | Req. | Default             | Description                                                           |
| --------------------- | -------------- | ---- | ------------------- | --------------------------------------------------------------------- |
| `id`                  | `uuid` PK      | yes  | `gen_random_uuid()` | Record identifier                                                     |
| `company`             | `varchar(255)` | yes  | —                   | Company name                                                          |
| `position`            | `varchar(255)` | no   | `null`              | Position/vacancy title. Auto-filled from hh.ru                        |
| `vacancy_url`         | `text`         | no   | `null`              | Link to the vacancy description page                                  |
| `resume_url`          | `text`         | no   | `null`              | Link to the résumé used to apply                                      |
| `interview_url`       | `text`         | no   | `null`              | Link to the interview call (Google Meet, Zoom, …)                     |
| `status`              | `varchar(16)`  | yes  | `'OPEN'`            | Vacancy status. Enum, see §3.2                                        |
| `result`              | `varchar(32)`  | yes  | `'IN_PROGRESS'`     | Outcome of the conversation. Enum, see §3.3                           |
| `employer_contact`    | `text`         | no   | `null`              | Free text: HR name, phone, telegram, email                            |
| `hr_interview_at`     | `timestamptz`  | no   | `null`              | HR interview date/time                                                |
| `tech_interview_at`   | `timestamptz`  | no   | `null`              | Tech interview date/time                                              |
| `notes`               | `text`         | no   | `null`              | Free-form notes                                                       |
| `vacancy_source`      | `varchar(16)`  | no   | `null`              | Vacancy source. Enum, see §4.8 (`'HH'` \| `'GETMATCH'` \| `null`)     |
| `vacancy_external_id` | `varchar(32)`  | no   | `null`              | Source-side vacancy ID extracted from `vacancy_url`                   |
| `vacancy_archived`    | `boolean`      | no   | `null`              | Last archived flag value reported by the source                       |
| `company_logo_file`   | `varchar(64)`  | no   | `null`              | Company logo file name on disk (`COMPANY_LOGO_DIR`, §4.10), not a URL |
| `last_synced_at`      | `timestamptz`  | no   | `null`              | Time of the last **successful** sync                                  |
| `last_sync_outcome`   | `varchar(32)`  | no   | `null`              | Result of the last sync attempt. Enum, see §4.5                       |
| `last_sync_error`     | `text`         | no   | `null`              | Human-readable error message of the last attempt; `null` on success   |
| `created_at`          | `timestamptz`  | yes  | `now()`             | When the record was added                                             |
| `updated_at`          | `timestamptz`  | yes  | `now()`             | Auto-updated on any change                                            |

**Indexes:**

- PK on `id`.
- Index on `status` (list filtering and selection for bulk sync).
- Index on `created_at DESC` (default sort).
- **No uniqueness on `vacancy_external_id`** — the user may apply to one vacancy twice with
  different résumés, and different sources may in principle return colliding numeric IDs.

**Deletion:** physical (`DELETE`). No soft delete.

### 3.2 Enum `ApplicationStatus`

| Value    | UI label (ru) |
| -------- | ------------- |
| `OPEN`   | Открыта       |
| `CLOSED` | Закрыта       |

`OPEN` is the initial value on record creation.

### 3.3 Enum `ApplicationResult`

| Value                 | UI label (ru)  |
| --------------------- | -------------- |
| `IN_PROGRESS`         | В процессе     |
| `OFFER`               | Оффер          |
| `REJECTED_BY_COMPANY` | Отказ компании |
| `DECLINED_BY_ME`      | Отказался сам  |
| `NO_RESPONSE`         | Нет ответа     |
| `VACANCY_WITHDRAWN`   | Вакансия снята |

`IN_PROGRESS` is the initial value on record creation.

### 3.4 Code placement requirements (mandatory)

Per the project code conventions (§10):

- Enum values and their ru labels, length limits, defaults, regexes, timeouts, concurrency limits —
  **only** in the `*.constants.ts` of the corresponding module.
- Types in `*.type.ts`, interfaces in `*.interfaces.ts` of the corresponding module. Inline
  type/interface declarations in implementation files are forbidden.
- The status, result and **vacancy source (`VacancySource`, §4.8)** enums are defined once on the
  backend and **duplicated by hand** on the frontend in its own `*.constants.ts` (no shared package —
  needless complexity for a two-app monorepo; a mismatch is caught by an e2e test on the list of
  allowed values).

### 3.5 Table `vacancy_leads`

Candidate vacancies found by the hh.ru search (§4.11). The table is **independent** of
`applications`: a lead is not yet an application, and there is no foreign key between the tables and
never will be. A user who decides to apply creates an entry in «Отклики» the normal way (§7.4);
there is no automatic lead-to-application conversion (§12).

| Column (DB)             | DB type        | Req. | Default             | Description                                                                                                                                                                             |
| ----------------------- | -------------- | ---- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | `uuid` PK      | yes  | `gen_random_uuid()` | Record identifier                                                                                                                                                                       |
| `source`                | `varchar(16)`  | yes  | `'HH'`              | Vacancy source, same `VacancySource` enum (§4.8). Always `'HH'` for now                                                                                                                 |
| `external_id`           | `varchar(32)`  | yes  | —                   | Source-side vacancy ID taken from the search results page                                                                                                                               |
| `position`              | `varchar(255)` | yes  | —                   | Vacancy title = position as the source returned it (truncated to width)                                                                                                                 |
| `company`               | `varchar(255)` | yes  | —                   | Company name from the search results page (truncated to width)                                                                                                                          |
| `position_key`          | `varchar(255)` | yes  | —                   | Normalized position — part of the deduplication key (§4.11.5)                                                                                                                           |
| `company_key`           | `varchar(255)` | yes  | —                   | Normalized company — part of the deduplication key (§4.11.5)                                                                                                                            |
| `published_on`          | `date`         | yes  | —                   | Publication date in the source's calendar — part of the dedup key (§4.11.6)                                                                                                             |
| `published_at`          | `timestamptz`  | no   | `null`              | Full publication timestamp (sorting and display). Exposed as UTC-ISO like all §5 dates; the original `+03:00` offset is not preserved — the calendar date is owned by `published_on`    |
| `vacancy_url`           | `text`         | yes  | —                   | Canonical address `{HH_SITE_BASE_URL}/vacancy/{external_id}`, no query                                                                                                                  |
| `area_name`             | `varchar(128)` | no   | `null`              | Vacancy region from the search results page (`area.name`)                                                                                                                               |
| `salary_from`           | `integer`      | no   | `null`              | Salary "from" (`compensation.from`)                                                                                                                                                     |
| `salary_to`             | `integer`      | no   | `null`              | Salary "to" (`compensation.to`)                                                                                                                                                         |
| `salary_currency`       | `varchar(8)`   | no   | `null`              | Currency code (`compensation.currencyCode`: `RUR`, `USD`, `UZS`, …)                                                                                                                     |
| `salary_gross`          | `boolean`      | no   | `null`              | Whether the amount is before tax (`compensation.gross`)                                                                                                                                 |
| `experience`            | `varchar(32)`  | no   | `null`              | Required experience (`workExperience`: `noExperience`, `between1And3`, …)                                                                                                               |
| `employment_form`       | `varchar(32)`  | no   | `null`              | Employment form (`employmentForm`: `FULL`, `PART`, `PROJECT`, …)                                                                                                                        |
| `work_formats`          | `varchar(64)`  | no   | `null`              | Comma-separated work format (`REMOTE`, `HYBRID`, `ON_SITE`)                                                                                                                             |
| `matched_keywords`      | `text`         | no   | `null`              | Comma-separated matched keywords (deterministic screening, §4.11.4)                                                                                                                     |
| `match_source`          | `varchar(16)`  | yes  | `'KEYWORDS'`        | What confirmed the match: `'KEYWORDS'` \| `'AI'` (§4.12)                                                                                                                                |
| `ai_model`              | `varchar(64)`  | no   | `null`              | Model that issued the verdict (to compare quality across models)                                                                                                                        |
| `ai_title_reason`       | `varchar(500)` | no   | `null`              | Short model rationale on the vacancy title (§4.12)                                                                                                                                      |
| `ai_description_reason` | `varchar(500)` | no   | `null`              | Short model rationale on the vacancy description (§4.12)                                                                                                                                |
| `company_logo_file`     | `varchar(64)`  | no   | `null`              | Company logo file name on disk (`COMPANY_LOGO_DIR`, §4.10), not a URL. Filled only for leads that reached the vacancy page fetch (§4.11.7); stays `null` forever for keyword-only leads |
| `hidden_at`             | `timestamptz`  | no   | `null`              | When the user hid the vacancy (§5.7). `null` — visible                                                                                                                                  |
| `first_seen_at`         | `timestamptz`  | yes  | `now()`             | When the vacancy first appeared in one of our runs                                                                                                                                      |
| `last_seen_at`          | `timestamptz`  | yes  | `now()`             | When the vacancy was last seen in the results (updated on a duplicate)                                                                                                                  |
| `created_at`            | `timestamptz`  | yes  | `now()`             |                                                                                                                                                                                         |
| `updated_at`            | `timestamptz`  | yes  | `now()`             | Auto-updated on any change                                                                                                                                                              |

**There is deliberately no `description` column.** The description is downloaded and fed to the model
(§4.11.7) but never stored; only the short rationale (`ai_description_reason`) is kept.

**Indexes:**

- PK on `id`.
- **UNIQUE (`company_key`, `position_key`, `published_on`)** — the materialized deduplication rule
  of §4.11.5. A unique index rather than a code check: insertion uses `ON CONFLICT DO NOTHING`, and
  this is the only protection against a race between the manual and the scheduled run.
- Index on `published_on DESC` — default list sort (§5.7).
- No separate index for `hidden_at`: the table is hundreds of rows, and the `hidden_at IS NULL`
  filter is cheaper than an index at that size.

**No uniqueness on `external_id`, deliberately** — the same vacancy is published under a separate ID
per region (observed live: `136238361`…`136238364`, same title, company and publication time). The
"position + company + date" key collapses them into one row; an ID key does not.

**The source is not part of the deduplication key**: a vacancy with the same triple on another job
board is the same vacancy.

**There is no deletion, there is hiding.** `DELETE` is not exposed (§5.7): a deleted row would take
the dedup key with it and the vacancy would return on the next run. Hiding sets `hidden_at` and
removes the record from the default list while leaving the key in place.

### 3.6 Table `vacancy_search_settings`

Search settings the user edits **in the frontend** (§7.9), not in `.env`: search text, keywords and
the two AI prompts. Env keeps only infrastructure (addresses, limits, budgets, §8).

The table holds **exactly one row**: `id smallint PK` with `CHECK (id = 1)`. Not a key-value settings
table: the field set is known, the types differ, and "a second search configuration" is out of scope
(§12).

| Column (DB)          | DB type        | Req. | Default   | Description                                                                         |
| -------------------- | -------------- | ---- | --------- | ----------------------------------------------------------------------------------- |
| `id`                 | `smallint` PK  | yes  | `1`       | Always `1` (`CHECK (id = 1)`)                                                       |
| `search_text`        | `varchar(512)` | yes  | see below | Substituted into `{text}` of the link template (§4.11.1), URL-encoded on assembly   |
| `keywords`           | `text`         | yes  | see below | Comma-separated keywords: used both for deterministic screening and for the prompts |
| `exclude_keywords`   | `text`         | no   | `null`    | Comma-separated exclude keywords (§4.11.4)                                          |
| `title_prompt`       | `text`         | yes  | see §4.12 | Stage 1 prompt — vacancy title evaluation                                           |
| `description_prompt` | `text`         | yes  | see §4.12 | Stage 2 prompt — vacancy description evaluation                                     |
| `ai_enabled`         | `boolean`      | yes  | `false`   | Whether AI screening (§4.12) is on. Off — keyword screening only                    |
| `updated_at`         | `timestamptz`  | yes  | `now()`   |                                                                                     |

The row is created **by the migration itself** (`INSERT … ON CONFLICT DO NOTHING`) with default
values, not by code on first access: the service reading the settings must not be able to create
them, otherwise there is a second data-creation path and a race at startup.

Default `search_text` is `fullstack`; keyword and prompt defaults are in §4.11.4 and §4.12.

### 3.7 Table `vacancy_scan_position`

The saved resume position of a search run (§4.11.12) — where «Продолжить» would restart from.
**Not** a column of `vacancy_search_settings` (§3.6): the position is written by the server on
every processed page, while the settings row is a user-owned resource read and replaced whole by
`GET`/`PUT /api/vacancy-search-settings` with `forbidNonWhitelisted` (§5.7). Mixing the two would
(a) bump the settings `updated_at` on every page, breaking the "changes apply from the next run"
signal and the frontend settings cache, (b) force a read-only field into the `PUT` body — the wart
the spec already tolerates only for `searchUrlTemplate`, (c) create a lost-update race between a
per-page write and a user `PUT` of the whole row. A separate singleton table keeps both lifecycles
and both contracts clean.

The table holds **exactly one row**: `id smallint PK` with `CHECK (id = 1)`, the same pattern as
§3.6, seeded by the migration itself — the service must never create the row.

| Column (DB)   | DB type        | Req. | Default | Description                                                                 |
| ------------- | -------------- | ---- | ------- | ---------------------------------------------------------------------------- |
| `id`          | `smallint` PK  | yes  | `1`     | Always `1` (`CHECK (id = 1)`)                                                |
| `next_page`   | `integer`      | yes  | `0`     | 0-based page to resume from on the next `RESUME` start                       |
| `search_text` | `varchar(512)` | no   | `null`  | `search_text` (§3.6) the position was saved under — a resume is only offered when it still matches the current settings |
| `updated_at`  | `timestamptz`  | yes  | `now()` | Auto-updated on every save (once per processed page during a run)           |

`next_page = 0` together with `search_text = null` (the seeded/cleared state) is never resumable
(§4.11.12): `isResumablePosition` also requires `next_page > 0` and `next_page < VACANCY_SCAN_MAX_PAGES`.
`search_text` travels with the position rather than being re-read from `vacancy_search_settings` at
resume time, so a settings change between saving the position and clicking «Продолжить» reliably
disables the button instead of silently resuming a different search.

---

## 4. Integration with vacancy sources

Vacancy data is pulled from the page of a **source** — hh.ru or getmatch.ru. §4.8 defines the source
concept, the provider registry and dispatch by `vacancy_source`; §4.9 covers getmatch.ru; §§4.1–4.7
describe hh.ru. §4.3/§4.5/§4.6 are common to all sources; hosts, paths and page format are per-source.

### 4.1 What we use (hh.ru)

The **public HTML vacancy page**, without OAuth and without a user token (anonymous
`GET https://api.hh.ru/vacancies/{id}` answers `403`; OAuth is out of scope, §12):

```
GET {HH_SITE_BASE_URL}/vacancy/{vacancy_id}
Headers:
  User-Agent: <значение из env HH_USER_AGENT>   # обязателен, иначе 400
  Accept: text/html,application/xhtml+xml
responseType: text
Редиректы следуются (302 → 200)
```

- archived flag — consensus of tokens `"archived":true|false` (incl. HTML-escaped `&quot;`/`&#34;`) and
  the marker `data-qa="vacancy-title-archived-text"` (archived pages only). No signal, or contradicting
  tokens → outcome `ERROR` (fail-loud).
- `title` and `hiringOrganization.name` from `<script type="application/ld+json">`
  (`schema.org/JobPosting`) → `position` and `company`, degrading softly to `null`. **Not available:**
  `type.id` (`open`/`closed`/`anonymous`/`direct`).
- **robots.txt:** `Disallow: *?*` for `User-agent: *` — the URL must be strictly canonical, no query
  parameters. A vacancy is identical across regional domains (`spb.hh.ru`, `hh.kz`, …), so the request
  always goes to `HH_SITE_BASE_URL`, never the domain of the user's link.
- **Out of scope** (§12): `/negotiations`, OAuth flow, refresh tokens, account linking, browser
  emulation, anti-bot evasion. `result` is filled only by the user.

### 4.2 Extracting source and external ID from a URL

One pure parser per source; shared link normalization (trim, prepend `https://` when the scheme is
missing, reject non-http(s) protocols) lives in one common helper (§4.8).

- **hh.ru** hosts (regex in `*.constants.ts`), path `/vacancy/{digits}`, external ID = digit group:
  `^([a-z0-9-]+\.)*(hh\.ru|hh\.kz|hh\.uz|hh1\.az|rabota\.by|headhunter\.ge|headhunter\.kg)$`
- **getmatch.ru** host `^(www\.)?getmatch\.ru$`, path `/vacancies/{digits}` with optional `-{slug}` and
  trailing slash, external ID = digit group; the slug is not needed in the source request.
- A parser must accept query strings, trailing slash, fragment, `http://`, missing slug, surrounding
  whitespace and a missing scheme (assume `https://`); it returns `null` (never throws) on an empty
  string, invalid URL, foreign host or unrecognized path.

`vacancy_source`/`vacancy_external_id` are computed on the backend **on every create and every change of
`vacancy_url`**, including clearing it to `null`; the frontend must not send them. The parser yields only
the external ID — the request host always comes from the source's `*_SITE_BASE_URL`, never from the
region/subdomain in the user's URL.

### 4.3 Rules for applying a sync result

Common to all sources, applied to the result already normalized to the common shape (§4.8). On a
successful fetch:

1. Write `vacancy_archived`, `last_synced_at`, `OK`, `last_sync_error = null`, `position` (item 4).
2. `archived === true` → `status = 'CLOSED'`; `archived === false` → do **not** change `status` (a manual
   close must not be rolled back).
3. `result` is **never** changed automatically — only the user owns it.
4. On `OK`, `position` is **always overwritten** with the source's title, even if edited manually; if the
   source gave no title (`null`, or empty after `trim()`), `position` must be left alone, never nulled.
   The title is normalized by one helper (`trim` + clamp to the `position` column width) shared with
   preview §4.4 — otherwise an over-long title gives a 500 instead of a §4.5 outcome. `company` is
   **not** overwritten by sync; autofill for it works only in §4.4.
5. The company logo (`company_logo_file`, §4.10) is downloaded only on `OK`, only if the source gave a
   logo URL, and only if no file exists on disk yet — the patch key must be **conditional**, so a missing
   logo or an existing file does not touch the column.

The close signal is only `archived`; neither source exposes a `type.id` analogue. "Vacancy does not
exist" (hh.ru — HTTP 404; getmatch.ru — HTTP 200 with `initialVacancy: null`): `status = 'CLOSED'`,
`last_sync_outcome = 'NOT_FOUND'`, `last_synced_at = now()`, `last_sync_error` = explanatory text — a
normal outcome, not an error.

### 4.4 Autofill on create

`POST /api/vacancies/preview` (§5.3), common to all sources, returns parsed data **without saving to the
DB**. The frontend calls it from `onBlur` of the «Ссылка на вакансию» field in the create form when the
URL is recognized (§4.2), shows a loading indicator on the field, and fills `company`/`position` only if
the user has not typed them; suggestions stay editable. `position` gets the §4.3 item 4 normalization. A
preview error must not block saving and is shown as a non-blocking notification. `vacancyType` is not in
the preview contract — neither source has an analogue.

On `POST /api/applications` the backend additionally downloads the company logo (§4.10) **after** the row
is inserted — `fileKey` must be an existing record id, so this cannot reuse the preview request (which
runs before any row exists and whose contract never carries `logoUrl`, §4.2). This is therefore a second
request to the source, sharing §4.10's rules (`vacancies/vacancy-logo.service.ts`) with sync. The create
path writes **only** `company_logo_file`: an unrecognized or unsupported `vacancy_url` produces no
`SKIPPED_UNSUPPORTED` (no `last_sync_*` column is touched at all), and any failure (unrecognized source,
network error, no logo on the page, CDN failure) is silent — `logger.warn`/`debug` only, record id only —
and `POST` still answers `201` with the record as inserted.

### 4.5 Enum `SyncOutcome`

| Value                 | Meaning                                                                                 | UI label (ru)               |
| --------------------- | --------------------------------------------------------------------------------------- | --------------------------- |
| `OK`                  | Data fetched and applied (including the `position` overwrite, §4.3)                     | Обновлено                   |
| `NOT_FOUND`           | Vacancy withdrawn/deleted: 404 at hh.ru, `"initialVacancy":null` at getmatch.ru (§4.9)  | Вакансия не найдена (снята) |
| `SKIPPED_UNSUPPORTED` | No recognizable source in `vacancy_url`, or `vacancy_source` unknown to the code (§4.8) | Источник не поддерживается  |
| `RATE_LIMITED`        | The source returned 429 after all retries                                               | Лимит запросов источника    |
| `ERROR`               | Network error, timeout, 5xx, `403`, unrecognized source page                            | Ошибка обновления           |

### 4.6 Request reliability

- Timeout **10 000 ms** (`HH_REQUEST_TIMEOUT_MS`/`GETMATCH_REQUEST_TIMEOUT_MS`). Retries: up to **2** on
  429 and 5xx, exponential backoff (500 ms, 1500 ms); none on 4xx other than 429 (including `403`). Count
  is per source (`HH_MAX_RETRIES`/`GETMATCH_MAX_RETRIES`); backoff and limits are shared (§4.8).
- Bulk sync: concurrency **at most 3**, **at least 200 ms** between request starts
  (`SYNC_CONCURRENCY`/`SYNC_MIN_DELAY_MS` — shared, since a run may mix `vacancy_source` values).
- An error on one record **must not** abort a bulk run: it lands in that record's
  `last_sync_outcome`/`last_sync_error` and in the response summary.
- `VACANCY_MAX_RESPONSE_BYTES` = 4 MiB (hh.ru page ≈ 164 KB gzipped / 772 KB raw; getmatch ≈ 300 KB).
- All of the above are constants in `*.constants.ts` (shared in `vacancies/`, per-source in
  `hh/`/`getmatch/`), overridable via env (§8).

### 4.7 Background sync

A run starts on a schedule inside the `api` process — the same `VacancySyncService.syncOpen()` as
`POST /api/applications/sync-open` (§5.2), with §4.3 rules and §4.6 limits. Scheduler is
`@nestjs/schedule` in-process, module `scheduler/` (§11): no system cron, queues, workers or separate
scheduler container (§2.4 item 8).

- `SCHEDULED_SYNC_INTERVAL_MS` (default `1 800 000` ms = 30 min, range `60 000`…`86 400 000`) and
  `SCHEDULED_SYNC_ENABLED` (`'true'`/`'false'`, default `'true'`), both in §8. Registered dynamically via
  `SchedulerRegistry.addInterval()`, not the `@Interval` decorator (§2.4 item 8).
- **First run one interval after start, not at start** — a restart loop (`restart: unless-stopped`) would
  otherwise become a series of full runs against third parties.
- **Runs must not overlap**: an in-memory boolean flag suffices (one `api` instance §9.1, single-threaded
  Node). A tick finding the previous run unfinished is skipped with `warn`.
- **Manual runs neither block nor are blocked**: briefly up to `2 × SYNC_CONCURRENCY` simultaneous
  requests are possible.
- **Errors must not escape**: per-record failures follow §4.6; an unexpected run exception goes to the
  `error` log and must not crash the process.
- Logs: `log` once at startup (enabled/disabled), `debug` per tick, `warn` on a skipped tick, `error` on
  a run exception. Run totals are written by `syncOpen()`, not the scheduler.
- Stopping the container aborts the current run; leftovers are picked up next tick. **Scheduler state is
  not exposed in the API** — no status endpoint, no frontend polling (§12).

### 4.8 Sources and providers

`VacancySource` (values `'HH'` | `'GETMATCH'`) generalizes both sites behind one contract.

- The enum lives in `applications/applications.constants.ts` next to `SyncOutcome`: module dependency
  runs `vacancies`/`hh`/`getmatch` → `applications`, so a back-reference would be a cycle.
- **`VacancySourceProvider`** (in `vacancies/`): `source`, `parseUrl(url): string | null` (pure, never
  throws), `fetchVacancy(externalId): Promise<VacancyFetchResult>` (never lets an exception escape — any
  failure becomes a §4.5 outcome). Implemented by `HhApiService`/`GetmatchApiService` themselves.
- **`VacancyProviderRegistry` is the single dispatch point**: `resolveByUrl(url)` returns the first
  recognized source + external ID (host sets do not overlap, so order does not matter); `find(source)`
  returns the provider for a record's `vacancy_source`. **An unknown source is not a 500**: `find` returns
  `null` and sync yields `SKIPPED_UNSUPPORTED`.
- **Retries, limits and HTTP client options are a shared framework** (`vacancies/`): backoff, timeout,
  size cap, `validateStatus`. Per-source: env keys (base URL, User-Agent, own timeout/retries), page
  path, error texts.

### 4.9 The getmatch.ru source

Page path `/vacancies/{id}-{slug}`; the slug is optional — `/vacancies/{id}` serves the same page with no
redirect, and the canonical request is always slug-free and query-free:
`GET {GETMATCH_SITE_BASE_URL}/vacancies/{id}`. No public JSON API — HTML page only, and JSON-LD is
unusable (present only for active vacancies, gone for withdrawn ones). The reliable source is the
**Next.js RSC/flight payload**: several `<script>self.__next_f.push([1,"…escaped JSON…"])</script>` tags
whose second array elements are chunks of one text that must be joined (the key may straddle two chunks),
then searched for the literal key `"initialVacancy":`:

| `"initialVacancy":`     | Parse state  | Outcome §4.5                       |
| ----------------------- | ------------ | ---------------------------------- |
| object                  | `PARSED`     | `OK` (+ `archived = !is_active`)   |
| `null`                  | `ABSENT`     | `NOT_FOUND` — HTTP status is `200` |
| key absent / unparsable | `UNPARSABLE` | `ERROR` (fail-loud)                |

**A nonexistent vacancy returns HTTP 200**, not 404, so `NOT_FOUND` comes from the page parser, not the
response status; the three-way state collapses into an ordinary `VacancyFetchResult`, leaving the §4.8
contract unchanged. Extracted from `initialVacancy`: `is_active` (boolean, required — absence or wrong
type → `ERROR`, fail-loud) → `archived = !is_active`; `position` → `position`; `company.name` → `company`
(both text fields degrade softly). The object is delimited by a character-wise brace-balance scan honoring
strings and escaping, not a regex — a regex cannot safely delimit unbounded-depth JSON without
catastrophic backtracking (§2.4 item 7). The external ID is clamped to the `vacancy_external_id` column
width. Unlike `HH_USER_AGENT` (required — hh.ru answers `400` without it), `GETMATCH_USER_AGENT` is
optional with a safe default.

### 4.10 Company logo

During sync (§4.3) the backend also downloads the company logo to a file on disk; the DB stores only the
**file name** (`company_logo_file`, §3.1), never a URL or bytes, and `ApplicationResponse` exposes only a
boolean `hasCompanyLogo`.

Two entry points share one rule set — "download or not" — in `vacancies/vacancy-logo.service.ts`
(`VacancyLogoService.resolveLogoFile`): the sync path (§4.3 item 5, `VacancySyncService.decide`) and the
create path (§4.4, `ApplicationsService.create` via `VacancyLogoService.downloadOnCreate`). Rules: `OK`
outcome only, `logoUrl`/`logoAllowedHostPattern` both required, an already-downloaded file is not
re-fetched, `fileKey = application.id`, and the throttle slot comes from the source provider
(`acquireRequestSlot`, §4.11.2). `VacancySyncService` keeps only the §4.3 patch (`last_sync_*`,
`vacancy_archived`, `status`, `position`); it does not decide on the logo itself anymore.

| Source      | Where the logo address lives                                           |
| ----------- | ---------------------------------------------------------------------- |
| hh.ru       | page state: `"logos":{"logo":[{"@type":…,"@url":"/employer-logo/…"}]}` |
| getmatch.ru | `<img src="…">` inside `div.b-company-logotype`                        |

At hh.ru the **state** is parsed, not the markup — the `<img>` inside `div[data-qa="vacancy-company-logo"]`
has no `src` in the server response. The state JSON arrives HTML-escaped (`&#34;`), so
`HH_COMPANY_LOGO_ENTRY_PATTERN` catches all three quote forms, like `HH_ARCHIVED_FLAG_PATTERN`. The first
occurrence of each type is taken; the type is chosen by `HH_COMPANY_LOGO_TYPE_PRIORITY`: `vacancyPage` →
`medium` → `employerPage` → `searchResultsPage` → `small` → `ORIGINAL` (`ORIGINAL` last on purpose —
unscaled it easily exceeds the size limit). These two constants in `hh/hh.constants.ts` are the **single
edit point** when hh.ru changes format.

The address is absolutized against the source's `*_SITE_BASE_URL` and checked against its host allow-list
(`hhcdn.ru`/`hh.ru`; `getmatch.ru`) — this blocks SSRF and guarantees e2e against local stubs
(`127.0.0.1`) downloads nothing. The result (absolute http(s) URL from a trusted host, or `null`) is
`Vacancy.logoUrl`, degrading softly, with the allow-list pattern as `Vacancy.logoAllowedHostPattern`.
`CompanyLogoService.download` follows up to `COMPANY_LOGO_MAX_REDIRECTS` (3) redirects, and a CDN could
`3xx` to an arbitrary host — so the allow-list **must** be re-checked on **every** redirect hop via
`beforeRedirect`, not only the initial URL; a host outside it aborts the download with `null`.

`CompanyLogoService` takes a `fileKey` (record id) and an absolute URL and returns a file name or `null`;
it **never throws** — any failure (timeout, CDN 404, non-image, no directory permission) becomes `null`
and leaves the sync outcome unchanged.

- `COMPANY_LOGO_DIR`: default `os.tmpdir()/job-hunter-logos` for host dev; in Docker
  `/var/lib/job-hunter/logos` on the **named volume** `logos`. The directory is created in the image owned
  by `node`, so a fresh volume inherits that owner instead of `root:root`.
- If a file vanishes the column stays filled, the endpoint answers `404`, the summary row shows the letter
  fallback, and the next sync re-downloads.
- Writes are atomic: `writeFile` to a `.tmp` file with a suffix unique per `download()` call, then
  `rename` — a manual 🔄 and a scheduled run may write the same file concurrently, and a unique `.tmp`
  path stops one write renaming another's half-written buffer into the final file. The `.tmp` file is
  cleaned up on `writeFile`/`rename` failure too.
- **Content-Type → extension allow-list:** `image/png`, `image/jpeg`, `image/webp`, `image/gif`.
  **`image/svg+xml` is not supported** — SVG can carry script and both sources deliver raster logos;
  responses also carry `X-Content-Type-Options: nosniff`.
- Limits: `COMPANY_LOGO_REQUEST_TIMEOUT_MS` (default 5000 ms, no retries), file size ≤ 512 KiB, download
  at most once per record (until the file is deleted).

`GET /api/applications/:id/logo` (§5.1): `200` with bytes and correct `Content-Type`,
`Cache-Control: private, max-age=3600`; `404` — no record, no logo, or file gone; `400` — invalid UUID;
`401` — no Basic Auth (global guard, like all `/api/*`, supplied by the browser for `<img>` within the
same protection space, §6).

**Vacancy lead logo (step #26, §14).** The same `logos/` module (same allow-list, storage, limits) serves
`vacancy_leads` (`company_logo_file`, §3.5) with no extra HTTP request:
`HhSearchService.fetchVacancyDescription` (§4.11.7) already downloads the vacancy page, parsed by the same
`readHhCompanyLogoSrc`. The download starts **only after** the row is inserted
(`VacancyLeadsService.insertIgnoringConflict`) — `fileKey` must be an existing record id
(`COMPANY_LOGO_FILE_KEY_PATTERN`) — and a duplicate causes no repeat download. A lead-logo failure does
not count into `created`/`failed` (§4.11.11); only `logger.warn` with the record id, no URL. **Deliberate
limitation:** vacancies selected keyword-only without AI (§4.11.4, `matchSource = 'KEYWORDS'`) never get a
logo, and no backfill is done. `VacancyLeadDto` exposes boolean `hasCompanyLogo`; bytes come from
`GET /api/vacancy-leads/:id/logo` (§5.7), behaving identically to the applications endpoint including
status codes, headers and Basic Auth.

### 4.11 Vacancy search on hh.ru

A pipeline separate from sync (§4.3): it does not update existing applications but **finds new vacancies**
into `vacancy_leads` (§3.5) for a separate tab (§7.9). Module `vacancy-search/`, dependencies
`VacancySearchModule → { HhModule, VacancyAiModule }`, no back-references.

#### 4.11.1 Search results source and link template

The public HTML search page, requested with the same `User-Agent` and `Accept` headers as the vacancy page
(§4.1), `responseType: text`, redirects followed. Template (env `HH_SEARCH_URL_TEMPLATE`, default):

```
https://ekaterinburg.hh.ru/search/vacancy?text={text}&salary=&ored_clusters=true&work_schedule_by_days=FIVE_ON_TWO_OFF&order_by=publication_time&page={page}
```

- `{text}` — the search string from settings (§3.6, `search_text`), edited on the frontend (§7.9) and
  substituted via `encodeURIComponent`; it changes often, hence DB, while the template is env. `{page}` —
  `0, 1, 2, …`, substituted automatically. Both placeholders are mandatory: a template missing either must
  fail startup with a clear error (without `{page}` the run would read the first page forever).
- **`order_by=publication_time` is mandatory in substance:** it gives "newest first", on which the early
  stop by age (§4.11.6) depends; with relevance sorting the rule never fires and a run always reaches
  `VACANCY_SCAN_MAX_PAGES`.
- The regional host `ekaterinburg.hh.ru` is harmless: state content is domain-independent, and
  `vacancy_url` always stores the canonical address on `HH_SITE_BASE_URL`.
- **Depth ceiling — 40 pages** (`paging.lastPage.page = 39`; hh.ru serves at most 2000 positions per
  query). A run stops at `min(paging.lastPage.page, VACANCY_SCAN_MAX_PAGES - 1)`. The default
  `VACANCY_SCAN_MAX_PAGES` is **40** (§4.11.8), i.e. equal to hh.ru's own ceiling: a default run
  now exhausts the whole available result set, so `MAX_PAGES` and `LAST_PAGE` coincide on a full
  run.
- **Verified on live results (14.08.2026):** anonymous request → `200`, ~1.3 MB HTML, **50 vacancies per
  page**, all metadata in the page state block, not the markup.

**Working without an hh.ru login is fixed.** `resume=` is ignored anonymously; `api.hh.ru` answers `403`
anonymously and "job seeker" API support ended 15.12.2025. No cookie session, headless browser or captcha
solving exists in the project (§12); the selection is reproduced with **explicit filters** in `text` and
the template, and a captcha page is outcome `ERROR`. **The `robots.txt` constraint is a deliberate
exception:** the search page exists only with query parameters, while the vacancy page request stays
strictly canonical (§4.1); compensation is an honest `User-Agent` with contact info, a hard rate ceiling
(§4.11.2), run budgets (§4.11.8) and no parallel runs.

> **Known consequences of the default template.** No `search_field=name` (hh.ru also matches `text` in
> description and company name — more noise) and no `search_period` (freshness is cut by
> `VACANCY_SCAN_MAX_AGE_DAYS`). Both are accepted anonymously and are the cheapest speedup.

#### 4.11.2 Request rate and the shared hh.ru throttle

**No more than 2 requests per second to hh.ru**, across all requests, not just search. Hence a
**process-wide throttle `HhRequestThrottle`** (module `hh/`) through which **every** outgoing hh.ru request
passes: vacancy page on sync and preview, results page and vacancy page during search, logo downloads from
`hhcdn.ru`. It is a minimum interval between request starts (`1000 / HH_MAX_REQUESTS_PER_SECOND`, default
`2` → 500 ms); the slot is reserved **synchronously before the `await`**, as in `mapWithConcurrency`
(§4.6), otherwise all waiters start at once. The throttle only delays: it never cancels a request and never
changes §4.5 outcomes; the accepted side effect is slower scheduled sync (50 open records ≈ 25 s instead of
≈ 10 s). In e2e it is effectively disabled (`applyTestEnvironment` sets a large
`HH_MAX_REQUESTS_PER_SECOND`). Other limits are the shared §4.6 ones: `HH_REQUEST_TIMEOUT_MS`, retries only
on 429/5xx (`HH_MAX_RETRIES`, backoff 500/1500 ms), `VACANCY_MAX_RESPONSE_BYTES` (4 MiB; measured page
1.3 MB). Search run concurrency is **1** — pages are fetched strictly sequentially, because whether to page
further depends on parsing the previous page.

#### 4.11.3 Parsing the search results page

State sits in `<template id="HH-Lux-InitialState">…</template>`, HTML-escaped. Order: extract the tag
contents with a regex (no HTML libraries, §2.4 item 7); unescape `&quot;`/`&#34;` → `"`, `&#39;` → `'`,
`&lt;` → `<`, `&gt;` → `>`, and **`&amp;` → `&` last** (otherwise `&amp;quot;` becomes a quote and breaks
the JSON); `JSON.parse`; narrow `unknown` → `HhSearchState` with explicit predicates (§10 item 5); take
`vacancySearchResult.vacancies[]` and `vacancySearchResult.paging.lastPage.page`. **Fail-loud**: no tag,
unparsable JSON or missing `vacancySearchResult.vacancies` → outcome `ERROR` and the run stops — never
"found 0 vacancies".

| State field                                          | Destination                         | Requirement                             |
| ---------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| `vacancyId`                                          | `external_id`                       | required, else item skipped             |
| `name`                                               | `position`, screening input §4.11.4 | required                                |
| `company.name`                                       | `company`                           | required                                |
| `creationTime` (ISO with offset)                     | `published_at` / `published_on`     | required (fallback `publicationTime.$`) |
| `area.name`                                          | `area_name`                         | soft-degrades to `null`                 |
| `compensation.{from,to,currencyCode,gross}`          | `salary_*`                          | soft-degrades to `null`                 |
| `workExperience` (`noExperience`, `between1And3`, …) | `experience`                        | soft-degrades to `null`                 |
| `employmentForm` (`FULL`, `PART`, `PROJECT`, …)      | `employment_form`                   | soft-degrades to `null`                 |
| `workFormats[].workFormatsElement[]`                 | `work_formats` (comma-separated)    | soft-degrades to `null`                 |
| `links.desktop`                                      | unused                              | —                                       |

- A missing **required** field skips only that item: counter `skippedInvalid`, logged at `debug`.
- **`company.name` falls back to `company.visibleName`** — anonymous employers have no `name`; safe for
  the deduplication key, since a depersonalized name does not change between runs.
- **`paging.lastPage` may be `null`** (filled only for long pagination) and is **not** fail-loud:
  fail-loud triggers on a missing `vacancies` array or missing `paging`, while `lastPage: null` only means
  "depth unknown" — the run continues to the page budget or an empty page.
- `links.desktop` is ignored deliberately (regional host); `vacancy_url` stores canonical
  `{HH_SITE_BASE_URL}/vacancy/{external_id}`. All other state fields (tags, labels, application counters,
  address, contacts, promo properties) are neither extracted nor stored (§12).

#### 4.11.4 Screening pipeline

Two stages over two texts: the **title** from the results page, then the **description** from the vacancy
page. Both are judged by the same model, with different prompts from settings (§3.6, §4.12).

```
элемент выдачи
   │
   ├─0─ стоп-слова (детерминированно)              ── отсеян → skippedExcluded
   ├─1─ дедупликация по (компания+должность+дата)  ── есть в БД → duplicates
   ├─2─ ИИ по названию   (title_prompt)            ── нет → rejectedTitle
   ├─3─ загрузка страницы вакансии → описание
   ├─4─ ИИ по описанию   (description_prompt)      ── нет → rejectedDescription
   └─5─ INSERT … ON CONFLICT DO NOTHING            ── created
```

- **Stage 0.** Any match from `exclude_keywords` (§3.6) drops the vacancy before any AI; including keywords
  are **not** checked here — their semantics is exactly what the model must judge. `VACANCY_PREFILTER_MODE`
  = `exclude_only` (default) | `full` (also check including keywords) | `off`.
- **Stage 1** (§4.11.5) runs **before** the title AI, over every candidate that survived stage 0 and the
  within-run dedup: the publication date is already known from the results page (§4.11.6), so a known
  vacancy is filtered out — and its `last_seen_at` refreshed — without spending a single AI token on it. At
  the default 40-page depth most positions on a re-run are already in the DB, so moving this stage ahead of
  the title AI is a deliberate token-cost cut, not just a reordering; `duplicates` grows earlier and
  `rejectedTitle` now counts only vacancies the model actually saw.
- **Stage 2.** A batch of up to `VACANCY_AI_BATCH_SIZE` titles (§4.12) with settings keywords substituted;
  verdict = boolean + `ai_title_reason`.
- **Stage 3** (§4.11.7) goes through the same throttle. **Stage 4** is one request per vacancy
  (descriptions must not be batched — each is thousands of characters); verdict = boolean +
  `ai_description_reason`.

**When AI is disabled** (`ai_enabled = false`) **or unavailable**, the pipeline degenerates into
deterministic keyword screening (word-boundary matching, `VACANCY_MATCH_MODE` = `any` | `all`), and stages
3–4 are **skipped entirely**. Such leads get `match_source = 'KEYWORDS'` and a filled `matched_keywords`.
**Word normalization** (stage 0 and the no-AI mode): `trim`, lowercase, `ё` → `е`, collapse whitespace
runs. Comparison is by **word boundaries**, not substring (`go` inside "Django", `qa` inside "Аква") and
not whole-string equality. A key with a space or hyphen (`full stack`, `full-stack`) is allowed and matches
as a phrase. Default `keywords`: `fullstack, full-stack, full stack, node.js, nodejs, react, typescript`;
default `exclude_keywords`: `1С, 1C, php, java, стажёр, стажер, junior`.

#### 4.11.5 Deduplication

The key is **normalized company + normalized position + publication date** (`company_key`, `position_key`,
`published_on`), materialized by a unique index (§3.5). Normalization uses the §4.11.4 function plus a
clamp to column width. Normalized values must be stored as **separate columns**, not an index expression
(a functional index would need an `IMMUTABLE` DB function). Three echelons:

1. **Within a run** — a `Set` of processed keys, applied **right after exclude keywords, before AI**: one
   results page easily holds regional clones with identical title, company and date. A clone counts into
   `duplicates`, not `rejectedTitle`.
2. **Against the DB, before the title AI** (§4.11.4 stage 1) — one `SELECT` over every survivor of stage 0
   and echelon 1 (`WHERE (company_key, position_key, published_on) IN (…)`); a hit updates `last_seen_at`
   and counts into `duplicates`, never reaching the model. Running this **before** rather than after the
   title AI is the point: at the default 40-page depth most candidates on a re-run are already known, and
   judging their title again would be a wasted AI call. As a consequence `last_seen_at` is now refreshed for
   every known lead on the page, not only for those that would have passed the title model.
3. **On insert** — `INSERT … ON CONFLICT DO NOTHING`; the unique index stays the source of truth.

A duplicate is not silent: the existing row's `last_seen_at` is updated and it counts into `duplicates`.
**A hidden vacancy is still a duplicate** — `hidden_at` must not affect deduplication, otherwise hidden
entries would return every run. The date is part of the key on purpose: without it a re-publication of the
same vacancy a month later would be collapsed.

#### 4.11.6 Publication date

**The date is in the results state**: each vacancy has `creationTime` (`"2026-08-11T11:09:53.978+03:00"`)
and `publicationTime` (`{"@timestamp": …, "$": "…"}`), so the vacancy page is never opened for the date —
only for the description (§4.11.7), after deduplication. `published_on` is **the date from the ISO string
as-is**, no timezone conversion (→ `2026-08-11`): the string already carries the hh.ru calendar offset, and
converting to UTC would shift the date for everything published before 03:00 Moscow time and make the
deduplication key depend on the container timezone. `published_at` keeps the full timestamp for sorting and
display. Vacancies older than `VACANCY_SCAN_MAX_AGE_DAYS` (default 30) are dropped right after parsing,
before any AI; since the default template sorts by publication date, a page consisting entirely of expired
vacancies also stops the run (`stoppedReason = 'AGE_LIMIT'`).

#### 4.11.7 Vacancy description

From the vacancy page's `<script type="application/ld+json">` (`schema.org/JobPosting`), field
`description` — an HTML string (~2.2 KB on a real vacancy).

- Fetched **only** for vacancies that reached stage 3 (§4.11.4). Truncated at
  `VACANCY_AI_DESCRIPTION_MAX_CHARS` (default 6000). **Not stored in the DB** (§3.5) — only the verdict and
  `ai_description_reason` remain.
- Before being sent to the model the HTML is **converted to plain text**: tags stripped,
  `<li>`/`<p>`/`<br>` → newlines, entities expanded, whitespace runs collapsed. No sanitizer library is
  needed — the string never reaches a browser and is never rendered as HTML.
- Missing JSON-LD or `description`, or a request failure (timeout, 429 after retries, 5xx, captcha) → the
  vacancy **fails** stage 4 and is not stored; counter `descriptionsFailed`. Fail-closed: it will be met
  again next run since it is not in the DB.
- The same page is parsed for the company logo (§4.10) — no separate request; the logo is downloaded after
  the row is inserted, so a stage-4 failure also means no logo.

#### 4.11.8 Run budgets

| Limiter                        | Default   | Purpose                                                          |
| ------------------------------ | --------- | ---------------------------------------------------------------- |
| `VACANCY_SCAN_MAX_PAGES`       | `40`      | 2000 positions per run; equal to hh.ru's own ceiling (§4.11.1)   |
| `VACANCY_SCAN_MAX_DETAILS`     | `600`      | Vacancy pages opened per run — costs both requests and AI       |
| `VACANCY_SCAN_MAX_AGE_DAYS`    | `30`       | Freshness cutoff (§4.11.6)                                      |
| `VACANCY_SCAN_MAX_DURATION_MS` | `14400000` | Hard run deadline — 4 hours                                     |

Hitting a budget is not an error: the run reports `stoppedReason` and the next picks up the rest. One
vacancy's error does not abort a run (§4.6): a description failure is `descriptionsFailed`, an insert
failure is `failed`. Only an unparsable results page aborts a run (§4.11.3, fail-loud). The deadline is
dominated by the local model, not hh.ru — hh.ru requests at 2 rps take ≈ 20 s.

**Both budgets are sized for one full 40-page sweep.** Measured against live results: 6 pages took 30
minutes, so all 40 need roughly 3.5 hours, and the previous `1800000` / `60` defaults cut a run off around
the sixth page. A repeat run barely touches either budget — known vacancies are dropped by deduplication
before any AI (§4.11.5), so only genuinely new positions reach stage 3. A run that goes wrong no longer has
to wait out the deadline either: it can be stopped by hand (§4.11.12).

#### 4.11.9 The run is asynchronous

Inference time means a run does **not** fit a synchronous HTTP response (unlike `POST /sync-open`).

- `POST /api/vacancy-leads/scan` starts the run and answers `202 Accepted` **immediately** (§5.7). Overlap
  is excluded by a boolean flag: a second `POST /scan` during a run answers `409` (§5.7).
- Run state lives **in `api` process memory** — one instance (§9.1), single-threaded Node; a runs table and
  advisory locks would be speculative abstraction (same reasoning as §4.7). A container restart aborts the
  run; the status is then `IDLE` and created leads stay in the DB. **The one exception is the resume
  position** (§3.7, §4.11.12): it is written to the DB after every processed page precisely so that a
  restart does not also cost «Продолжить» — `resume.available` on `GET /scan/status` is computed from that
  row, not from process memory.
- `GET /api/vacancy-leads/scan/status` returns status and current counters; the frontend polls every 2
  seconds while `RUNNING` (§7.9). **Polling, not a queue or worker** — WebSocket/SSE, brokers and separate
  containers stay out of scope (§12).

#### 4.11.10 Manual start only

**A run starts exclusively from the frontend button** (`POST /api/vacancy-leads/scan`, §5.7, §7.9.2).
`scheduler/` (§4.7) registers **no second interval**, §8 has no `VACANCY_SCAN_ENABLED` /
`VACANCY_SCAN_INTERVAL_MS`, and this step does not touch `scheduler/` files; scheduled application sync is
unchanged. A run loads the CPU with the local model (§4.12), so the user must pick the moment.

#### 4.11.11 Run summary

| Field                 | Meaning                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `pagesFetched`        | Results pages read                                                                                 |
| `itemsSeen`           | Results items parsed                                                                               |
| `skippedInvalid`      | Items missing required fields                                                                      |
| `skippedOld`          | Cut off by `VACANCY_SCAN_MAX_AGE_DAYS`                                                             |
| `skippedExcluded`     | Cut off by exclude keywords (stage 0)                                                              |
| `rejectedTitle`       | Model rejected by title (stage 1)                                                                  |
| `duplicates`          | Already in the DB or in this same run                                                              |
| `descriptionsFailed`  | Description unavailable — vacancy not stored (§4.11.7)                                             |
| `rejectedDescription` | Model rejected by description (stage 4)                                                            |
| `created`             | Rows actually inserted                                                                             |
| `failed`              | Insert errors                                                                                      |
| `aiFallbacks`         | Times AI was unavailable and keywords decided (§4.12)                                              |
| `stoppedReason`       | `COMPLETED` \| `LAST_PAGE` \| `MAX_PAGES` \| `MAX_DETAILS` \| `DEADLINE` \| `AGE_LIMIT` \| `STOPPED` \| `ERROR` |
| `message`             | Explanation on `ERROR`, otherwise `null`                                                           |

`GET …/scan/status` returns the same counters during a run — that is the progress display, alongside the
`pageProgress` indicator (§4.11.12): «page N of M». `STOPPED` (§4.11.12) is a user-requested stop, not a
failure — like every other non-`ERROR` reason it is still an operation result reported with HTTP `200`.
Since dedup now runs before the title AI (§4.11.4, §4.11.5), `duplicates` counts hits found either within
the run or already in the DB before the title model ever ran, and `rejectedTitle` counts only candidates
the model actually judged.

#### 4.11.12 Stopping and resuming a run

**Stopping is cooperative, not preemptive.** `POST /api/vacancy-leads/scan/stop` (§5.7) sets a boolean flag
on the in-memory run state and answers `202` immediately; `409` if nothing is running. The flag is exposed
through the run's own handle (`isStopRequested()`), so a stop requested after a run has already finished can
never leak into the next one — `tryStart()` resets the flag on every start. Nothing in flight is aborted: the
running `run()` observes the flag at the next checkpoint — the start of the next results page, and the start
of processing each surviving candidate within a page — and only then unwinds with `stoppedReason = 'STOPPED'`.
A stop can therefore take as long as the slowest in-flight step (one hh.ru request or one AI call,
§4.11.2/§4.12); `GET /scan/status` exposes `stopRequested: true` while this is pending so the frontend can
show "stopping…" rather than implying the run has already ended.

**The resume position** (§3.7, table `vacancy_scan_position`) is saved after every fully processed page and
also once at the very start of a run (which also clears a stale position left by an older run). On
termination the `finally` block either **clears** the position — for the exhaustion outcomes `COMPLETED`,
`LAST_PAGE`, `MAX_PAGES`, `AGE_LIMIT`, where there is nothing sensible left to continue — or **saves** it —
for `STOPPED`, `DEADLINE`, `MAX_DETAILS`, `ERROR`, where a next page genuinely remains. This bookkeeping
happens **before** `state.finish()`, so any `GET /scan/status` that first observes the run as no longer
`RUNNING` already sees the final, correct resume availability.

**Resuming re-runs the last, possibly partially processed page** rather than skipping straight to the next
one: this is safe and cheap precisely because dedup (§4.11.5) now runs before the title AI — any lead already
inserted from that page on the previous attempt is filtered out by the DB lookup before a single AI token is
spent on it again.

**A resume is only offered when it still matches.** `isResumablePosition` requires the saved `search_text`
to equal the current settings' `search_text`, and `0 < next_page < VACANCY_SCAN_MAX_PAGES`. `search_text` is
stored **with** the position (not re-read from `vacancy_search_settings` at resume time) so that editing the
search string between saving a position and clicking «Продолжить» reliably disables the button instead of
silently resuming a different search; `PUT /api/vacancy-search-settings` therefore also invalidates the
frontend's scan-status cache (§7.9.4). Lowering `VACANCY_SCAN_MAX_PAGES` below a saved `next_page` after the
fact self-heals on the next `FRESH` run: the loop body never executes, `stoppedReason` falls through to
`MAX_PAGES`, and the position is cleared like any other exhaustion.

**Two start modes** travel in the `POST /scan` body (§5.7): `FRESH` (default, starts at page 0) and `RESUME`
(starts at the saved `next_page`). Both still go through the same synchronous `tryStart()` check-and-set, so
a `409` for "a run is already in progress" is unaffected; `RESUME` additionally answers `409` when no valid
saved position exists, with a distinct message (§5.5).

### 4.12 AI screening: a local model in Ollama

#### 4.12.1 The decision

**A local model in Ollama**: a separate `ollama` container, a **4B instruct** class model (default
`qwen3:4b-instruct`), over HTTP from the `api` process. No keys, quotas or outbound header leaks; a run
costs only local CPU/RAM, which is what makes the second, description-based stage affordable. Cloud free
tiers (Groq, OpenRouter `:free`, Gemini, Mistral, Cloudflare) remain a **fallback** needing no extra code:
the adapter speaks two protocols (`VACANCY_AI_PROVIDER` = `ollama` | `openai`), so switching is three env
variables.

#### 4.12.2 Two prompts

Two prompts in settings (§3.6, §7.9): `title_prompt` (stage 1, the **title**) and `description_prompt`
(stage 4, the **description**). Placeholders expanded before sending:

| Placeholder     | Allowed in           | Replaced with                                          |
| --------------- | -------------------- | ------------------------------------------------------ |
| `{keywords}`    | both prompts         | The `keywords` list from settings, comma-separated     |
| `{titles}`      | `title_prompt` only  | Numbered list of the batch's titles                    |
| `{title}`       | `description_prompt` | Current vacancy title                                  |
| `{company}`     | both prompts         | Company name                                           |
| `{description}` | `description_prompt` | Description, converted to text and truncated (§4.11.7) |

Validation on saving settings (§5.7): `title_prompt` must contain `{keywords}` and `{titles}`,
`description_prompt` must contain `{keywords}` and `{description}`; otherwise `400` with a clear message.
Default prompts (created by a migration, editable on the frontend):

```
title_prompt:
Ты помогаешь отбирать вакансии для разработчика. Ключевые слова профиля: {keywords}.
Подходит только тот, кто сам пишет код продукта: разработчик, программист, developer, engineer.
Отклоняй любые другие специальности, даже если в названии есть слово fullstack:
тестировщика и QA, аналитика (системного, бизнес, любого), менеджера, дизайнера,
devops, преподавателя, руководителя без разработки.
Разработчик подходит и тогда, когда его основной язык другой, но в названии есть
React, Node.js, TypeScript или JavaScript.
Разработчик подходит, если название не уточняет стек вовсе.
Названия:
{titles}
Ответь JSON-массивом по одному объекту на каждое название, в том же порядке.
```

```
description_prompt:
Ты помогаешь отбирать вакансии. Ключевые слова профиля: {keywords}.
Вакансия: {title} в компании {company}.
Описание:
{description}
Реши, действительно ли эта вакансия соответствует профилю: нужны ли в ней перечисленные
технологии как основные, а не упомянуты вскользь. Ответь JSON-объектом.
```

The old text stays in migration `CreateVacancySearchSettingsTable` as a snapshot;
`SharpenVacancyTitlePrompt` rewrites it in the DB, but only where the user has not edited it by hand.

#### 4.12.3 Response format and reliability

The response is requested **structured**: in Ollama the `format` field with a JSON Schema in
`POST /api/chat`; for OpenAI-compatible providers `response_format`. Stage 1 schema — an array of
`{ index: number, matches: boolean, reason: string }` of exactly the batch size; stage 4 — an object
`{ matches: boolean, reason: string }`. `reason` is truncated to the column width (500) before writing.
Other parameters: `temperature: 0`, `VACANCY_AI_TIMEOUT_MS` (default 120 000), no retries on timeout.

**Any AI failure is not a run failure.** Timeout, unavailable container, invalid JSON, array length not
matching the batch → that batch is decided by keywords (§4.11.4), `match_source = 'KEYWORDS'`, counter
`aiFallbacks`, `warn` in the log. Fallback-selected vacancies do not go through stage 4. The model that
issued the verdict is written to `ai_model`.

#### 4.12.4 Container and resources

Service `ollama` in `docker-compose.yml` (§9.1) under compose profile `ai`, so infrastructure is unchanged
when AI is unused:

```
ollama: image ollama/ollama
        volume: ollama-models:/root/.ollama      # именованный, модели переживают down
        порт 11434 публикуется только на 127.0.0.1 (как db) — для дев-режима и curl
        environment: OLLAMA_KEEP_ALIVE=5m        # выгрузка модели из RAM между прогонами
        profiles: [ai]
        deploy.resources.reservations.devices: nvidia/all/[gpu]
```

- The model is pulled once, manually: `docker compose exec ollama ollama pull qwen3:4b-instruct`. No
  auto-pull at `api` startup — gigabytes on an implicit command, and a network failure would be an endless
  restart loop.
- With `ai_enabled = true` the backend checks availability once at startup (`GET /api/tags`) and logs
  `warn` if the model is absent, but must not fail startup: AI is optional.
- Memory: 4B Q4_K_M ≈ 2.5 GB file, ~3.5–4 GB RAM in use; `OLLAMA_KEEP_ALIVE=5m` frees it 5 min after a run.
  A GPU is **not required** but is passed through if present; on a machine without an NVIDIA driver in
  Docker the `deploy` section must be removed — the container will not start with it, and CPU works with no
  other changes.
- Port `11434` is published on `127.0.0.1` only (as `db`, §9.1): `api` reaches `ollama` by name inside the
  compose network, but `npm run dev:api` runs on the host and needs
  `VACANCY_AI_BASE_URL=http://127.0.0.1:11434`. Host port is `OLLAMA_PORT_HOST` (default `11434`), read
  only by compose, never by the application.

#### 4.12.5 Rejected alternatives

AI instead of keywords at the exclude stage; batching descriptions; a verdict cache in the DB; local
embeddings (`multilingual-e5-small`, cosine similarity) instead of an LLM; two different models for the two
stages. All rejected as costlier or weaker than the chosen design.

#### 4.12.6 Conclusion: is a local 4B model enough

**A 4B model suffices**; the bottleneck is CPU speed, not comprehension. Structured output by JSON Schema
(§4.12.3) removes the format-drift risk of small models; CPU speed is covered by the asynchronous run
(§4.11.9), the `VACANCY_SCAN_MAX_DETAILS` budget and deduplication before description fetching. Recommended
order: bring up `qwen3:4b-instruct`, run one search, inspect `ai_title_reason`. If verdicts look wrong, fix
the prompts first (a frontend setting, not code), and only then switch to `gemma3:4b` / `RuadaptQwen3-4B` /
a 7–8B if memory allows — one variable `VACANCY_AI_MODEL` plus an `ollama pull`.

---

## 5. REST API

**Base:** `/api`. JSON, UTF-8. Dates in bodies are **ISO 8601 with a timezone**
(`2026-08-06T14:30:00.000Z`); storage is UTC (`timestamptz`). Record responses are DTOs with
**camelCase** fields (`vacancyUrl`, `hrInterviewAt`, `lastSyncOutcome`, …).

### 5.1 Resource `applications`

#### `GET /api/applications`

Query parameters, all optional:

| Parameter | Type                                                             | Default     | Description                                                    |
| --------- | ---------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| `status`  | `OPEN` \| `CLOSED`                                               | —           | Filter by status; absent — all                                 |
| `result`  | `ApplicationResult`                                              | —           | Filter by result                                               |
| `search`  | string                                                           | —           | Case-insensitive substring over `company`, `position`, `notes` |
| `sort`    | `createdAt` \| `company` \| `hrInterviewAt` \| `techInterviewAt` | `createdAt` | Sort field                                                     |
| `order`   | `asc` \| `desc`                                                  | `desc`      | Direction                                                      |

Response `200`: `ApplicationDto[]` — flat array, no pagination.

#### `POST /api/applications`

Body — `CreateApplicationDto`: `company` (required, 1..255, trim, non-empty); `position` (≤255);
`vacancyUrl`, `resumeUrl`, `interviewUrl` (valid URL, ≤2048); `status` (default `OPEN`); `result`
(default `IN_PROGRESS`); `employerContact` (≤2000); `hrInterviewAt`, `techInterviewAt`
(ISO 8601 | `null`); `notes` (≤10000). Every field except `company` is optional. Computes
`vacancySource` and `vacancyExternalId` from `vacancyUrl` (§4.2, §4.8 — providers tried in turn via
`VacancyProviderRegistry`). Response `201`: `ApplicationDto`. `interviewUrl` is accepted by `POST`
and `PATCH`, but the create form (§7.4) does not show it. The response may already carry
`hasCompanyLogo: true` — the backend downloads the company logo (§4.10) before answering, which makes
the endpoint slow (one source request plus one logo request, worst case ≈ 32 s); the client raises its
timeout for this call accordingly (`CREATE_REQUEST_TIMEOUT_MS`).

#### `GET /api/applications/:id`

`200`: `ApplicationDto`. `404` if absent.

#### `PATCH /api/applications/:id`

Body — `UpdateApplicationDto` = every `CreateApplicationDto` field, all optional. Sent fields are
updated, absent fields untouched, explicit `null` clears a nullable field. If `vacancyUrl` arrives,
`vacancySource` and `vacancyExternalId` are recomputed — including when it is cleared to `null`
(§4.2). Response `200`: `ApplicationDto`. `404` if absent.

#### `DELETE /api/applications/:id`

`204` with no body. `404` if absent.

#### `GET /api/applications/:id/logo`

Company logo bytes (§4.10). `200` with body and a whitelisted `Content-Type`
(`png`/`jpeg`/`webp`/`gif`), `Cache-Control: private, max-age=3600`,
`X-Content-Type-Options: nosniff`. `404` — no record, no logo, or the file vanished from disk.
`400` — invalid UUID. The route **must** be declared above the `:id` methods (§5.2, same ordering
rule as sync).

### 5.2 Sync

#### `POST /api/applications/:id/sync`

Syncs one record per §4.3. No request body. Response `200`:
`{ "outcome": "OK", "message": null, "application": {/* ApplicationDto after update */} }`.
`404` if the record is absent. An unsuccessful `outcome` (including `ERROR`) is returned with
status **`200`** — an operation result, not an HTTP error. With `outcome: "OK"` the `application`
may carry a changed `position` (§4.3 item 5).

#### `POST /api/applications/sync-open`

Syncs **all** records with `status = 'OPEN'`. No request body. Response `200`:

```json
{
  "total": 12,
  "counts": { "OK": 9, "NOT_FOUND": 1, "SKIPPED_UNSUPPORTED": 2, "RATE_LIMITED": 0, "ERROR": 0 },
  "closed": 1,
  "items": [
    {
      "id": "uuid",
      "company": "Acme",
      "outcome": "NOT_FOUND",
      "message": "Вакансия не найдена на hh.ru"
    }
  ],
  "applications": [/* ApplicationDto[] — all affected records after update */]
}
```

`closed` — how many records moved to `CLOSED` during the run. **NestJS routing:** `sync-open`
**must** be declared **before** `:id`, otherwise it matches as `:id`. Synchronous, no queues or
workers; the scheduler (§4.7) calls the same `VacancySyncService.syncOpen()`.

### 5.3 Vacancy preview

One endpoint in `VacanciesController` serves both sources (§4.4, §4.8).

#### `POST /api/vacancies/preview`

Request `{ "url": "https://hh.ru/vacancy/12345678" }`. Response `200`: `{ "source": "HH",
"vacancyExternalId": "12345678", "company": "Acme", "position": "Node.js Developer",
"archived": false }`. The `vacancyType` field is removed from the contract entirely (§4.4, §4.8).

- URL recognised by no source (§4.2) → `200` with all five fields `null`, no network call.
- Vacancy gone (hh.ru `404`, getmatch.ru `initialVacancy: null`, §4.9) → `404` with error body (§5.5).
- Network error / timeout / 5xx / `403` / `429` after retries / unrecognised page → `502` with error body.

### 5.4 Service endpoints

#### `GET /api/health`

`200`: `{ "status": "ok", "db": "up" }`. Checks DB availability with a trivial query; used as the
docker-compose healthcheck. **Requires no authorization.**

### 5.5 Error format

Single format via the global exception filter:
`{ "statusCode": 400, "message": ["company should not be empty"], "error": "Bad Request" }`.
`message` is a string or an array of strings (validation errors). Stack traces never reach the
response, only the log.

### 5.6 Validation

Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
Unknown body fields → `400`. Invalid UUID in `:id` → `400` (use `ParseUUIDPipe`).

### 5.7 Found vacancies (`vacancy-leads`)

Controllers `VacancyLeadsController` and `VacancySearchSettingsController` in module
`vacancy-search/`, covered by the global Basic Auth like all of `/api/*` (§6).

#### `GET /api/vacancy-leads`

| Parameter | Type                           | Default       | Description                                              |
| --------- | ------------------------------ | ------------- | -------------------------------------------------------- |
| `search`  | string                         | —             | Case-insensitive substring over `position` and `company` |
| `hidden`  | `exclude` \| `only` \| `all`   | `exclude`     | Hidden records: without them, only them, or all (§3.5)   |
| `sort`    | `publishedAt` \| `firstSeenAt` | `publishedAt` | Sort field                                               |
| `order`   | `asc` \| `desc`                | `desc`        | Direction                                                |

Response `200`: `VacancyLeadDto[]` — flat array, no pagination (§12), but with a server-side cap
`VACANCY_LEADS_LIST_LIMIT` (default 500): a safety valve, no cursor and no next page. Fields: `id`,
`source`, `externalId`, `position`, `company`, `hasCompanyLogo`, `vacancyUrl`, `publishedAt`
(`"2026-08-12T10:16:19.420+03:00"`), `publishedOn` (`"2026-08-12"`), `areaName`, `salaryFrom`,
`salaryTo`, `salaryCurrency`, `salaryGross`, `experience`, `employmentForm`, `workFormats`,
`matchedKeywords`, `matchSource`, `aiModel`, `aiTitleReason`, `aiDescriptionReason`, `hidden`,
`firstSeenAt`, `lastSeenAt`.

- `matchedKeywords`, `workFormats` — arrays outward, comma-separated in storage (§3.5), parsed in
  the DTO. `hidden` — boolean, not `hiddenAt`. No description in the DTO by definition (§3.5, §4.11.7).
- `hasCompanyLogo` (step №26 §14) — like `ApplicationResponse.hasCompanyLogo` (§4.10), a presence
  flag, not a file name; always `false` for keyword-only leads.

#### `GET /api/vacancy-leads/:id/logo`

Lead company logo bytes (§4.10, step №26 §14) — identical to `GET /api/applications/:id/logo`
(§5.1): `200` with bytes and correct `Content-Type`, `Cache-Control: private, max-age=3600`,
`X-Content-Type-Options: nosniff`; `404` — no record, no logo, or file gone from disk; `400` —
invalid UUID; `401` — without Basic Auth. Declared above the `PATCH :id` route.

#### `PATCH /api/vacancy-leads/:id`

Body — `UpdateVacancyLeadDto`, exactly one field: `{ "hidden": true }`. Response `200`:
`VacancyLeadDto`. `404` — no record, `400` — invalid UUID. Sets or clears `hidden_at` (§3.5); a
repeat call with the same value is idempotent and does not rewrite `hidden_at`. The lead's only
mutating endpoint: creation happens only through a run, and `DELETE` **must not** be exposed
(§3.5, §12) — deleting the deduplication key would bring the vacancy back on the next run.

#### `POST /api/vacancy-leads/scan`

Starts a search run (§4.11). Body — `StartScanDto`, optional: `{ "mode"?: "FRESH" | "RESUME" }`,
absent treated as `FRESH` (so the pre-existing button keeps working unchanged). **Asynchronous**
(§4.11.9): responds without waiting for the run to finish. `202 Accepted`:
`{ "status": "RUNNING", "startedAt": "2026-08-14T05:00:00.000Z" }`. `409 Conflict` — either a run
is already in progress, or (`mode: "RESUME"` only) there is no valid saved position to continue
from (§4.11.12), each with its own message (§5.5). Routes `scan`, `scan/stop`, `scan/status` and
`:id/logo` **must** be declared **above** the `:id` routes (§5.2, §4.10).

#### `POST /api/vacancy-leads/scan/stop`

Requests cooperative cancellation of the running run (§4.11.12). No request body. `202 Accepted`:
`{ "status": "RUNNING", "stopRequested": true }` — the run has not necessarily stopped yet, only
the flag is set; poll `GET /scan/status` for the actual end. `409 Conflict` — no run is currently
`RUNNING`.

#### `GET /api/vacancy-leads/scan/status`

Progress and result of the last run. `200`: `{ status, startedAt, finishedAt, progress,
pageProgress, stopRequested, resume, stoppedReason, message }`, where `progress` holds counters
`pagesFetched`, `itemsSeen`, `skippedInvalid`, `skippedOld`, `skippedExcluded`, `rejectedTitle`,
`duplicates`, `descriptionsFailed`, `rejectedDescription`, `created`, `failed`, `aiFallbacks`.

- `status`: `IDLE` (no run since process start) | `RUNNING` | `DONE` | `ERROR`.
- `progress` fills in as the run goes (the UI indicator); after completion the same place holds the
  final summary (§4.11.11), `stoppedReason` and `message`. State lives in process memory:
  restarting `api` returns `IDLE` (§4.11.9), except for `resume` (below).
- `pageProgress`: `{ currentPage: number | null, totalPages: number }` — the "page N of M"
  indicator (§4.11.12). `currentPage` is `null` before the first page of a run has started;
  `totalPages` starts at `VACANCY_SCAN_MAX_PAGES` and narrows to `min(paging.lastPage, MAX_PAGES - 1) + 1`
  once hh.ru reports `lastPage`. Both are 0-based page indexes on the wire; the frontend adds 1 for
  display.
- `stopRequested`: `true` once `POST /scan/stop` has been accepted for the current run, `false`
  otherwise; reset by the next `tryStart()`.
- `resume`: `{ available: boolean, nextPage: number | null }` — whether `mode: "RESUME"` would
  currently succeed, computed from the persisted position (§3.7) and the current search settings
  (§4.11.12); `nextPage` is `null` unless `available`.
- An unsuccessful `stoppedReason` (including `ERROR` and `STOPPED`) is returned with status
  **`200`** — an operation result, not an HTTP error; same rule as sync (§5.2).

#### `GET /api/vacancy-search-settings`

`200` — the single settings row (§3.6): `searchText`, `keywords[]`, `excludeKeywords[]`,
`titlePrompt`, `descriptionPrompt`, `aiEnabled`, `searchUrlTemplate`
(`"https://ekaterinburg.hh.ru/search/vacancy?text={text}&…&page={page}"`), `updatedAt`.
`searchUrlTemplate` is **read-only** — an env value, not a setting; it is served so the frontend can
preview the resulting URL as the search string is typed (§7.9.4). It **must not** appear in a `PUT`
body — `forbidNonWhitelisted` gives `400`.

#### `PUT /api/vacancy-search-settings`

Body — every field except `updatedAt`. `PUT`, not `PATCH`: single-row resource, always sent whole.
Validation (`400` on violation):

- `searchText` — 1…512, non-empty after `trim`;
- `keywords` — non-empty array of non-empty strings;
- `excludeKeywords` — array of strings, may be empty;
- `titlePrompt` — **must** contain `{keywords}` and `{titles}` (§4.12.2);
- `descriptionPrompt` — **must** contain `{keywords}` and `{description}`;
- both prompts — no longer than 8000 characters.

Response `200`: the saved settings. Changes apply from the **next** run; a running one works off the
settings snapshot taken at start.

---

## 6. Authorization

**HTTP Basic Auth** on all `/api/*` endpoints except `GET /api/health`.

- Login and password from env: `AUTH_USER`, `AUTH_PASSWORD`. A NestJS Guard applied globally;
  password comparison via `crypto.timingSafeEqual`.
- Wrong credentials → `401` with header `WWW-Authenticate: Basic realm="job-hunter"`, so the
  browser shows its own login dialog. The frontend has **no** login form: no tokens, sessions,
  cookies or JWT.
- If `AUTH_USER` or `AUTH_PASSWORD` is unset, the application **fails at startup** with a clear
  error (fail fast, so no open instance is ever launched).
- The frontend static bundle (`web`) is not protected by authorization — it holds no secrets.

---

## 7. Frontend: UI requirements

### 7.1 Overall structure (single screen)

`AppBar` («Job Hunter», «🔄 Обновить все открытые», counter «Открытых: 12 / 34»), filter bar («Все | Открытые | Закрытые», «🔍 Поиск…»,
sort ⇕, expand-all ⇱, «+ Добавить»), then the accordion list (§7.2). `Container maxWidth={false}`, horizontal padding **16px**; accordions
take **100% of available width** — no pixel `maxWidth`.

### 7.2 Record list — accordions

**One vacancy = one `MUI Accordion`**, nearly full width. `Table`/`DataGrid` must not be used.

- `Accordion` with `disableGutters`, `elevation={1}`, `slotProps={{ transition: { mountOnEnter: true, unmountOnExit: false } }}` — both
  options mandatory (`TransitionProps` is gone in MUI v9): collapse keeps focus and unsaved input (§7.3, §13.10.7), fields mount lazily.
- Expanded state reaches the list as **data** (`ReadonlySet<string>`) plus a stable-identity mutator object; each accordion gets a
  `boolean` slice by id, else `memo` breaks list-wide.
- Gap between accordions **8px** (`Stack spacing={1}`), no size jump on expand; no horizontal scroll — fields wrap (`flexWrap: 'wrap'`).
- All accordions **collapsed** by default, expansion independent (not "one at a time"), a newly created record opens expanded. The
  expanded set is local state (`Set<string>` of ids) and is **not persisted**.

#### 7.2.1 `AccordionSummary` — collapsed state

One line (~48px), **read-only** content plus action buttons, no inputs — a click toggles expansion. One row, `gap: 8px`,
`alignItems: 'center'`; buttons 7–8 always visible, not hover-only.

| #   | Element        | Width                                                | Content                                                                                                                                                                                                                 |
| --- | -------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Company        | `flex: 0 0 220px`, `noWrap` + `Tooltip` when clipped | `Avatar` 24px (company logo or letter fallback, §4.10) + 8px gap + bold `Typography`                                                                                                                                    |
| 2   | Position       | `flex: 1 1 auto`, `noWrap`                           | `Typography` color `text.secondary`                                                                                                                                                                                     |
| 3   | Status         | `flex: 0 0 auto`                                     | `Chip` size=small, ru label §3.2                                                                                                                                                                                        |
| 4   | Result         | `flex: 0 0 auto`                                     | `Chip` size=small, ru label §3.3                                                                                                                                                                                        |
| 5   | Next interview | `flex: 0 0 auto`                                     | `Event` icon + `DD.MM HH:mm` of the nearest future of `hrInterviewAt`/`techInterviewAt`; hidden if both empty or past                                                                                                   |
| 6   | Sync           | `flex: 0 0 auto`                                     | Status icon (✓ / ⚠ / ✕) + `Tooltip` with «Обновлено 06.08.2026 14:32» or the `SyncOutcome` label and `lastSyncError`, third line — source («Источник: hh.ru» / «Источник: getmatch.ru» / «Источник не определён», §4.8) |
| 7   | 🔄 Sync        | `flex: 0 0 auto`                                     | `IconButton` size=small, **`event.stopPropagation()` mandatory** — must not toggle the accordion                                                                                                                        |
| 8   | 🗑 Delete       | `flex: 0 0 auto`                                     | `IconButton` size=small, also with `stopPropagation()`                                                                                                                                                                  |

#### 7.2.2 `AccordionDetails` — expanded state

`Box display="flex" flexWrap="wrap" gap={1}` (8px both axes), inner padding 16px horizontal, 8px top / 16px bottom; controls
`size="small"`, `fullWidth` in their cell. **Row 1** — identification, links, statuses, dates:

| Field              | Control                                                   | flex-basis  | max-width |
| ------------------ | --------------------------------------------------------- | ----------- | --------- |
| Компания *         | `TextField`                                               | `1 1 240px` | `19%`     |
| Должность          | `TextField`                                               | `1 1 240px` | `19%`     |
| Ссылка на вакансию | `TextField` + `IconButton`(OpenInNew) in `InputAdornment` | `1 1 280px` | `15%`     |
| Ссылка на резюме   | `TextField` + `IconButton`(OpenInNew) in `InputAdornment` | `1 1 280px` | `15%`     |
| Статус             | `Select`                                                  | `0 0 150px` | —         |
| Результат          | `Select`                                                  | `0 0 190px` | —         |
| HR-собес           | `DateTimePicker` (`clearable`)                            | `0 0 210px` | —         |
| Тех-собес          | `DateTimePicker` (`clearable`)                            | `0 0 210px` | —         |

**Row 2** — contacts and free text:

| Field                | Control                                                   | flex-basis  | max-width |
| -------------------- | --------------------------------------------------------- | ----------- | --------- |
| Контакт работодателя | `TextField` multiline `minRows=1 maxRows=3`               | `1 1 320px` | —         |
| Где собес            | `TextField` + `IconButton`(OpenInNew) in `InputAdornment` | `1 1 280px` | `19%`     |
| Заметки              | `TextField` multiline `minRows=1 maxRows=4`               | `2 1 480px` | —         |

`max-width` comes from `FIELD_MAX_WIDTH` and applies **only** to fluid (`flex: 1 1 …`) fields; percentages are relative to the row width,
not the viewport. Rows are separate flex containers in one vertical `Stack spacing={1}`; at ≥1600px each row fits one line
(`minWidth: 0`), narrower screens wrap. `OpenInNew` is enabled only for a non-empty valid URL, opens it with
`target="_blank" rel="noopener noreferrer"`, and must not submit or collapse anything.

#### 7.2.3 Visual accents

- `status = CLOSED`: muted summary background (`action.hover`), company/position `text.secondary`; fields stay editable.
- Result `Chip`: `success` for `OFFER`, `error` for `REJECTED_BY_COMPANY`, `default` otherwise.
- Nearest future interview within **48 hours** — date in `warning` and bold; non-empty `lastSyncError` — sync icon in `error`.

#### 7.2.4 Sorting and group expand

Default sort `createdAt desc`; the «Сортировка» `Select`/`ToggleButtonGroup` (⇕) offers creation date, company, HR interview, tech
interview, plus a direction toggle. «Развернуть все / Свернуть все» (⇱) is one toggling `IconButton`.

#### 7.2.5 Layout constants

All §7.2 sizes (`FIELD_GAP`, `ACCORDION_GAP`, `SUMMARY_COMPANY_WIDTH_PX`, every field flex-basis, `FIELD_MAX_WIDTH`,
`UPCOMING_INTERVIEW_HIGHLIGHT_HOURS = 48`) live in `frontend/src/constants/layout.constants.ts`; magic numbers in JSX are forbidden
(§10.3). Gaps use MUI spacing: `spacing(1) === 8px`.

### 7.3 Autosave (inline edit)

- Text and `multiline` fields save on `onBlur` **only if the value changed**, plus debounced autosave 800 ms after typing stops;
  `Select` and `DateTimePicker` save on `onChange`.
- `PATCH /api/applications/:id` **with changed fields only**; optimistic cache update, on error rollback to the previous value plus an
  error `Snackbar`.
- Save indication is non-blocking: short highlight / «✓» on the field for ~1 s; no spinner over the list or accordion, and **no**
  «Сохранить» button.
- Collapsing with unsaved input must not lose the edit: send the pending change (equivalent to `blur`) first, then collapse.
- Edits to «Компания», «Должность», «Статус», «Результат» and interview dates appear in the collapsed summary row immediately.

### 7.4 Adding a record

«+ Добавить» opens a `Dialog`: Ссылка на вакансию (first field), Компания*, Должность, Ссылка на резюме, Контакт, HR-собес, Тех-собес,
Результат, Заметки. Status is not in the form (always `OPEN`); «Где собес» (`interviewUrl`) is not either — it is filled later in the
expanded record (§7.2.2). On `onBlur` of the vacancy-link field — `POST /api/vacancies/preview` and autofill (§4.4). Buttons «Отмена» and
«Добавить» (disabled while `Компания` is empty); on success the dialog closes, the list is invalidated, `Snackbar` «Вакансия добавлена».
«Добавить» may take a few seconds when a recognized vacancy link is present — the backend downloads the company logo before answering
(§4.4, §4.10).

### 7.5 Deletion

🗑 `IconButton` → confirmation `Dialog` naming the company and position → `DELETE`. No undo.

### 7.6 Sync — single record

🔄 in the summary row: `CircularProgress` size=16 replaces the icon and the button is disabled; on response the record updates and a
`Snackbar` shows the `SyncOutcome` label (e.g. «Вакансия не найдена (снята)») — success for `OK`, info for `NOT_FOUND`/
`SKIPPED_UNSUPPORTED`, error for `RATE_LIMITED`/`ERROR`. The click must not change expansion. Only sync columns go into the cache;
`position` is among them (§4.3) but only on outcome `OK` and only when non-empty.

### 7.7 Sync all open records

- While «🔄 Обновить все открытые» runs: indeterminate `LinearProgress` under the `AppBar`, button disabled with the text «Обновляем…»;
  the list stays viewable and editable. The button is disabled when no records are open.
- On completion the list reloads and a summary appears in `Snackbar`/`Alert`, e.g. **«Проверено 12 · закрыто 1 · ошибок 0 · без
  источника 2»**. If `items` contain `ERROR`/`RATE_LIMITED` — `Alert severity="warning"` with an expandable list of the problem records
  (company + message).

### 7.8 Other UI requirements

- All labels, buttons and messages **in Russian**; date/time `DD.MM.YYYY HH:mm` (short `DD.MM HH:mm` in the summary row), browser local
  timezone. `AppBar` counter «Открытых: N / M» (N — status `OPEN`, M — total).
- Empty state: centered «Пока нет ни одной записи» + «+ Добавить». Loading: 3–5 `Skeleton`s the height of a collapsed accordion. Load
  error: `Alert severity="error"` with «Повторить».
- Density: `size="small"` on all fields and `Chip`s; base gap **8px** (`spacing(1)`), raised to 16px only for `AccordionDetails` inner
  padding. Packing fields to 0–4px is forbidden. Dark theme, settings, export/import — not required.

---

### 7.9 Tabs and the «Вакансии» screen

Two screens switched by MUI `Tabs` («Отклики», «Вакансии») under `AppHeader`, above the active tab's content.

- **There is no router and none is to be added**; the active tab is plain `useState` in the shell and is not persisted (§12).
- **`App.tsx` is a shell, not a screen**: filters, the application list, dialogs, notifications and the §7.2–§7.8 logic live in
  `components/ApplicationsScreen/ApplicationsScreen.tsx`; `App.tsx` keeps `AppHeader`, `Tabs` and screen selection.
- The inactive tab **unmounts**; unsaved edits are sent on `blur` (§7.3) first. The «Открытых: N / M» counter stays in `AppHeader` on both
  tabs and refers to applications.

#### 7.9.1 The «Вакансии» screen

Filter bar: «Начать поиск», «Продолжить», «Остановить», «⚙ Настройки поиска», a search field, a «Скрытые»
toggle; below it the `Alert` with run progress / last summary; below that the list.

- **One vacancy = one `Accordion`**, same rules as §7.2: `disableGutters`, `elevation={1}`, the same `transition` slot props,
  `AccordionSummary` as `component="div"`, `memo`, expansion via `useExpandedIds` and a `boolean` slice by id.
- **Collapsed summary row:** publication date (`DD.MM`), position, company with the logo left of the name (`Avatar`, letter fallback,
  §4.10, §7.2.1), short salary, `OpenInNew` (opens `vacancyUrl` in a new tab) and «Скрыть». Both buttons start with `stopPropagation()`,
  otherwise the click reaches the summary row (§13.10.3).
- **A summary-row click opens `vacancyUrl` in a new tab** (`window.open`, `noopener,noreferrer`) — unlike §7.2, it does **not** expand the
  record; with no usable URL the click does nothing. Expansion lives **only** on the `ExpandMore` arrow on the right, which is an
  `IconButton` with `stopPropagation()`. `Accordion` therefore gets no `onChange`: MUI's own toggle would fire on any summary click.
- **Expanded state — fields from the search results** (§4.11.3), in two rows: full salary (`от … до … ₽, до вычета`), region, required
  experience, employment type, work format, full publication date, when the run first saw the vacancy, the model's reasons
  (`aiTitleReason`, `aiDescriptionReason`) and matched keywords. Empty fields are omitted, not shown as dashes.
- **The description is not shown** (§3.5): it is read on hh.ru via `↗`, so no external HTML reaches the frontend.
- Salary formatting and the experience/employment/work-format labels (`REMOTE` → «Удалённо», `between3And6` → «3–6 лет», …) are
  dictionaries in the frontend `constants/`, duplicated by hand from the backend like the status and result enums (§3.4).

#### 7.9.2 The run and its progress

- **Three buttons** (§4.11.12): «Начать поиск» (`mode: 'FRESH'`, from page 0), «Продолжить» (`mode: 'RESUME'`,
  from the saved position — label grows a page number, «Продолжить со страницы N», when known), «Остановить»
  (`POST /scan/stop`). Each sends its request and **does not wait** (§4.11.9): `202` returns at once. While
  a run is `RUNNING`, «Начать» and «Продолжить» are disabled; «Продолжить» is additionally disabled whenever
  `resume.available` is `false` (no saved position, or one that no longer matches the current `searchText`,
  §4.11.12); «Остановить» is enabled only while `RUNNING` and not yet `stopRequested`, and shows a pending
  label once clicked. `GET …/scan/status` is polled every 2 s (`refetchInterval`, dropped once status is not
  `RUNNING`); polling replaces WebSocket/SSE, which the project does not have (§12).
- The same `Alert` shows progress and the final summary: during the run a page line «страница 18 из 40»
  (from `pageProgress`, omitted while `currentPage` is still `null`) above «страниц: 3, найдено: 2, отклонено
  моделью: 12», with `LinearProgress` switching to `variant="determinate"` once the page total is known and
  staying indeterminate otherwise; afterwards the final counters (§4.11.11) and `stoppedReason` as human
  text, including a dedicated «Прогон остановлен вручную» line for `STOPPED`.
- Channels are separated as in §7.7: request failure → error-`Snackbar`; `stoppedReason = 'ERROR'` → `Alert severity="error"`; a
  successful run → `success`, and `created === 0` → `info`.
- On `RUNNING` → `DONE`/`ERROR` — **invalidate the leads list key entirely**, never merge records into the cache (§7.7).
- `409` on «Начать»/«Продолжить» is not an error: info-`Snackbar` with the server's message (§5.7 — either
  "already running" or "no valid resume position"), polling starts as usual. `409` on «Остановить» (nothing
  is running) is likewise an info-`Snackbar`, not an error. Status is also polled on screen mount, so a run
  started in another tab, before a reload, or surviving a container restart as a resumable position
  (§4.11.9) is visible immediately.

#### 7.9.3 Hiding a vacancy

🚫 sends `PATCH /api/vacancy-leads/:id` with `{ hidden: true }` and **optimistically** removes the record from the list cache; on error the
record returns and an error-`Snackbar` appears. The «Скрытые» toggle switches the list to `hidden=only`, where records show «Вернуть»
(`PATCH … { "hidden": false }`) instead of 🚫. There is no undo in the `Snackbar`.

#### 7.9.4 Search settings

«⚙ Настройки поиска» opens a `Dialog`:

- **Строка поиска** (`searchText`) — substituted into `{text}` of the link (§4.11.1); below it a preview of the resulting first-page URL.
  **Ключевые слова** and **стоп-слова** — comma-separated inputs (no `Chip` editor).
- **Промпт для названия** and **промпт для описания** — multiline fields with a hint about the available placeholders (§4.12.2) and a
  «Вернуть промпт по умолчанию» button. **«Использовать ИИ-отбор»** (`aiEnabled`): off means keyword screening and no description fetch.
- Saving — `PUT /api/vacancy-search-settings` in full; validation errors (`400`, in particular a missing placeholder) are shown under the
  corresponding field, not as a general notification. After saving — invalidate the settings key **and** the scan-status key
  (§4.11.12): `resume.available` depends on `searchText`, so a saved change must immediately disable a now-stale «Продолжить». A
  running run is unaffected — it works off the settings snapshot taken at its own start (§5.7).

## 8. Configuration (env)

`.env` in the repo root (not committed), plus `.env.example` with the same keys and safe placeholders.

| Variable                           | Req. | Example / default                          | Description                                                                                                  |
| ---------------------------------- | ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `POSTGRES_USER`                    | yes  | `jobhunter`                                |                                                                                                              |
| `POSTGRES_PASSWORD`                | yes  | `change-me`                                |                                                                                                              |
| `POSTGRES_DB`                      | yes  | `jobhunter`                                |                                                                                                              |
| `DATABASE_HOST`                    | yes  | `db`                                       | Compose service name                                                                                         |
| `DATABASE_PORT`                    | no   | `5432`                                     |                                                                                                              |
| `AUTH_USER`                        | yes  | `admin`                                    | Basic Auth login                                                                                             |
| `AUTH_PASSWORD`                    | yes  | `admin`                                    | Basic Auth password; startup fails without it                                                                |
| `HH_SITE_BASE_URL`                 | no   | `https://hh.ru`                            | Base of the hh.ru site serving the vacancy page                                                              |
| `HH_USER_AGENT`                    | yes  | `job-hunter/1.0 (igor.ushakov@fastdev.se)` | hh.ru requires a meaningful User-Agent, else `400`                                                           |
| `HH_REQUEST_TIMEOUT_MS`            | no   | `10000`                                    |                                                                                                              |
| `HH_MAX_RETRIES`                   | no   | `2`                                        |                                                                                                              |
| `GETMATCH_SITE_BASE_URL`           | no   | `https://getmatch.ru`                      | Base of the getmatch.ru site (§4.9)                                                                          |
| `GETMATCH_USER_AGENT`              | no   | `job-hunter/1.0`                           | Optional unlike `HH_USER_AGENT`: getmatch.ru does not `403` a plain User-Agent (§4.9)                        |
| `GETMATCH_REQUEST_TIMEOUT_MS`      | no   | `10000`                                    |                                                                                                              |
| `GETMATCH_MAX_RETRIES`             | no   | `2`                                        |                                                                                                              |
| `SYNC_CONCURRENCY`                 | no   | `3`                                        | Shared by all vacancy sources (§4.6); renamed from `HH_SYNC_CONCURRENCY`                                     |
| `SYNC_MIN_DELAY_MS`                | no   | `200`                                      | Shared by all vacancy sources (§4.6); renamed from `HH_SYNC_MIN_DELAY_MS`                                    |
| `SCHEDULED_SYNC_ENABLED`           | no   | `true`                                     | Scheduled sync of open records (§4.7). Only `true`/`false` allowed                                           |
| `SCHEDULED_SYNC_INTERVAL_MS`       | no   | `1800000`                                  | Scheduled run interval, ms (30 min). Range 60000…86400000 (§4.7)                                             |
| `COMPANY_LOGO_DIR`                 | no   | `os.tmpdir()/job-hunter-logos`             | Company-logo directory on disk (§4.10). In Docker — `/var/lib/job-hunter/logos` on named volume `logos`      |
| `COMPANY_LOGO_REQUEST_TIMEOUT_MS`  | no   | `5000`                                     | Logo download timeout from the source CDN (§4.10), no retries                                                |
| `HH_MAX_REQUESTS_PER_SECOND`       | no   | `2`                                        | Rate ceiling for **all** hh.ru requests: shared throttle (§4.11.2). Range 0.1…50                             |
| `HH_SEARCH_URL_TEMPLATE`           | no   | `see §4.11.1`                              | hh.ru search-results URL template; placeholders {text} and {page} are mandatory, a missing one fails startup |
| `VACANCY_SCAN_MAX_PAGES`           | no   | `40`                                       | Max search-results pages per run (§4.11.8). Range 1…40 — hh.ru itself cuts off at page 40                    |
| `VACANCY_SCAN_MAX_DETAILS`         | no   | `600`                                      | Max opened vacancy pages (and model description scorings) per run — sized for a full 40-page sweep           |
| `VACANCY_SCAN_MAX_AGE_DAYS`        | no   | `30`                                       | Vacancies older than N days are skipped (§4.11.6)                                                            |
| `VACANCY_SCAN_MAX_DURATION_MS`     | no   | `14400000`                                 | Hard run deadline — 4 hours (§4.11.8)                                                                        |
| `VACANCY_PREFILTER_MODE`           | no   | `exclude_only`                             | `exclude_only` / `full` / `off` — what is checked deterministically before AI (§4.11.4)                      |
| `VACANCY_MATCH_MODE`               | no   | `any`                                      | `any` / `all` — keyword screening mode when AI is off or unavailable                                         |
| `VACANCY_LEADS_LIST_LIMIT`         | no   | `500`                                      | Max records in the GET /api/vacancy-leads response (§5.7)                                                    |
| `VACANCY_AI_PROVIDER`              | no   | `ollama`                                   | `ollama` / `openai` — model request protocol (§4.12.1)                                                       |
| `VACANCY_AI_BASE_URL`              | no   | `http://ollama:11434`                      | Model address. For the openai provider — base URL of the compatible API                                      |
| `VACANCY_AI_MODEL`                 | no   | `qwen3:4b-instruct`                        | Model name (§4.12.6). Changing model = this variable + ollama pull                                           |
| `VACANCY_AI_API_KEY`               | no   | `—`                                        | Provider key; needed only with VACANCY_AI_PROVIDER=openai. Never logged                                      |
| `VACANCY_AI_BATCH_SIZE`            | no   | `10`                                       | Titles per stage-1 request (§4.12). Descriptions go one at a time                                            |
| `VACANCY_AI_TIMEOUT_MS`            | no   | `120000`                                   | Model request timeout; on failure keywords decide (§4.12.3)                                                  |
| `VACANCY_AI_DESCRIPTION_MAX_CHARS` | no   | `6000`                                     | Description is truncated to this before being sent to the model (§4.11.7)                                    |
| `API_PORT`                         | no   | `3000`                                     | Internal Nest port                                                                                           |
| `WEB_PORT`                         | no   | `8080`                                     | Port published to the host                                                                                   |
| `LOG_LEVEL`                        | no   | `log`                                      |                                                                                                              |
| `DATABASE_PORT_HOST`               | no   | `5432`                                     | Port on which `db` is published on `127.0.0.1` (for e2e and the TypeORM CLI from the host)                   |
| `TEST_DATABASE_HOST`               | no   | `127.0.0.1`                                | DB host for e2e tests run from the host                                                                      |
| `TEST_DATABASE_NAME`               | no   | `jobhunter_test`                           | Separate e2e DB, recreated each run. Must differ from `POSTGRES_DB` and end with `_test`                     |

Env is validated at startup via `@nestjs/config` + a schema (`class-validator` or `joi`). A missing
required variable **must** crash the process with a clear message.

Keywords, exclude keywords, the search query and both AI prompts are **not** in env: they live in the
settings table (§3.6) and are edited in the frontend (§7.9.4). Env holds only infrastructure and limits.

`VACANCY_AI_API_KEY` is validated conditionally — required only when `VACANCY_AI_PROVIDER=openai`.

---

## 9. Docker

### 9.1 `docker-compose.yml` services

```
db:   postgres:16-alpine
      volume: pgdata:/var/lib/postgresql/data
      healthcheck: pg_isready
      ports: "127.0.0.1:${DATABASE_PORT_HOST:-5432}:5432"
             loopback only — needed by e2e tests and the TypeORM CLI run from the host
             (inside the compose network the DB is db:5432)

api:  build: { context: ., dockerfile: backend/Dockerfile }
      multi-stage deps → build → runtime on node:22-alpine
      depends_on: db (condition: service_healthy)
      CMD: npm run migration:run:dist && node dist/main.js
      healthcheck: wget /api/health + grep '"db":"up"'
      port NOT published to the host

web:  build: { context: ., dockerfile: frontend/Dockerfile }
      multi-stage: node:22-alpine (Vite build) → nginx:alpine
      ports: "127.0.0.1:${WEB_PORT:-8080}:80"
      depends_on: api (condition: service_healthy)
      nginx: / → try_files ... /index.html;  /api/ → proxy_pass http://api:3000/api/

ollama: image: ollama/ollama              # compose profile `ai` (§4.12.4)
        volume: ollama-models:/root/.ollama
        environment: OLLAMA_KEEP_ALIVE=5m
        ports: "127.0.0.1:${OLLAMA_PORT_HOST:-11434}:11434"
               loopback only — needed by dev mode (dev:api runs on the host and cannot
               resolve the compose name ollama) and for curl diagnostics
        deploy: reservations.devices nvidia/all/[gpu]  # remove on a non-NVIDIA machine
        profiles: [ai]                    # without --profile ai the service is not started
```

**Build context is the monorepo root**, not the workspace folder: the Dockerfiles need the root
`package-lock.json` and both workspace `package.json` files, otherwise `npm ci` fails lock validation.
The ignore list is shared — `.dockerignore` in the root.

### 9.2 Requirements

- `restart: unless-stopped` on every service.
- Published ports **must** bind 127.0.0.1 (`127.0.0.1:${WEB_PORT}:80`) — never expose the app to the LAN.
- Migrations run automatically on `api` start (`npm run migration:run:dist && node dist/main.js`).
  Idempotent: with no pending migrations TypeORM logs `No migrations are pending`.
- The `api` runtime stage installs dependencies **without** `--include-workspace-root`, otherwise root
  devDependencies (typescript, eslint) land in the image even with `--omit=dev`.
- Data survives `docker compose down` (named volume) and is lost only on `down -v`.
- The built frontend calls the API via the relative path `/api` — no hardcoded hosts, no localhost `VITE_API_URL`.
- Dev mode (optional, a separate `docker-compose.dev.yml` or just a local non-Docker run):
  `npm run start:dev` for Nest + `vite dev` proxying `/api` → `http://localhost:3000`.

---

## 10. Code conventions (mandatory)

Project rules applying to **all** files of both applications:

1. **Blank lines for readability.** After a block of variable declarations (before the first
   non-declaration) and after every closing brace of a block (`if`/`for`/`while`/`switch`/`try`/…).
   Consecutive variable declarations need no blank lines between them.
2. **ESLint** in both applications with the rule (already configured, see `eslint.shared.mjs`):
   ```js
   '@stylistic/padding-line-between-statements': ['error',
     { blankLine: 'always', prev: 'block-like', next: '*' },
     { blankLine: 'always', prev: ['const','let','var'], next: '*' },
     { blankLine: 'any',    prev: ['const','let','var'], next: ['const','let','var'] },
   ]
   ```
   The `@stylistic/` prefix is mandatory — the core rule is deprecated (§2.4, item 2). Plus
   `tseslint.configs.recommendedTypeChecked` + `eslint-config-prettier` last in the chain.
   Prettier never inserts blank lines, so only ESLint enforces this.
3. **Module-level / global constants** — only in the module's dedicated `*.constants.ts`. Inline
   declaration in an implementation file is forbidden.
4. **Types** — in `*.type.ts`, **interfaces** — in `*.interfaces.ts` of the same module; the consumer
   imports them. Applies to controllers, services, modules, configs, components, hooks — everything.
   Sole exception: a spec file may declare inline the type of a test mock used only inside that spec.
5. No `any`. Use `unknown` plus explicit narrowing where the type of external data is unknown (the
   hh.ru response — describe it in `*.interfaces.ts` and validate the fields you need).
6. Git commits **without** the `Co-Authored-By: Claude…` trailer and without mentions of process,
   limits or breaks — the substance of the change only.

Comments, log messages and error strings in this codebase are written in **Russian**, like the rest of
the code; a comment explains _why_, not _what_.

---

## 11. Repository structure

Monorepo on **npm workspaces** (`backend`, `frontend`) — no turbo/nx/lerna, one root
`package-lock.json`. ✅ = built and verified, ⬜ = still to do.

```
job-hunter/
├─ SPECIFICATION.md  CHANGELOG.md  README.md  package.json  package-lock.json   ✅
├─ .env.example  .gitignore  .dockerignore  .prettierrc.json      ✅ one Prettier config for the monorepo
├─ eslint.shared.mjs             ✅ PADDING_LINE_RULES for both workspaces
├─ docker-compose.yml            ✅ db + api + web
├─ backend/
│  ├─ Dockerfile                 ✅ deps → build → runtime
│  ├─ package.json               ✅ + migration:* scripts
│  ├─ tsconfig.json  tsconfig.build.json  eslint.config.mjs  jest.config.js  ✅
│  ├─ test/                      ✅ jest-e2e.json, test.constants.ts, e2e.interfaces.ts,
│  │                             ✅ test-environment.ts, e2e-setup.ts, e2e-global-setup.ts,
│  │                             ✅ e2e-app.factory.ts, applications.fixtures.ts,
│  │                             ✅ applications.e2e-spec.ts, vacancy-preview.e2e-spec.ts,
│  │                             ✅ vacancy-stub.server.ts (shared stub, one port per source),
│  │                             ✅ hh.fixtures.ts, getmatch.fixtures.ts
│  └─ src/
│     ├─ main.ts                 ✅ port + shutdown hooks; setup lives in app.setup.ts
│     ├─ app.module.ts  app.constants.ts  app.setup.ts  ✅ (configureApp)
│     ├─ config/                 ✅ config.constants.ts, environment.validation.ts
│     ├─ auth/                   ✅ basic-auth.guard.ts, auth.constants.ts,
│     │                          ✅ auth.decorators.ts (@Public), auth.interfaces.ts
│     ├─ common/                 ✅ common.constants.ts, common.interfaces.ts,
│     │                          ✅ validation.decorators.ts, string.transforms.ts,
│     │                          ✅ http-exception.filter.ts, async.helpers.ts
│     ├─ database/               ✅ database.module.ts, data-source.ts,
│     │                          ✅ typeorm-options.factory.ts, database.constants.ts
│     │  └─ migrations/          ✅ <ts>-CreateApplicationsTable.ts,
│     │                          ✅ <ts>-AddApplicationInterviewUrl.ts,
│     │                          ✅ <ts>-GeneralizeVacancySource.ts (§4.8, step 15)
│     ├─ health/                 ✅ controller, service, constants, type, interfaces
│     ├─ scheduler/              ✅ scheduler.module.ts (the only ScheduleModule.forRoot),
│     │                          ✅ scheduled-sync.service.ts (§4.7), scheduler.constants.ts
│     ├─ applications/           ✅
│     │  ├─ applications.module.ts       # imports VacanciesModule, not HhModule
│     │  ├─ applications.controller.ts
│     │  ├─ applications.service.ts      # injects VacancyProviderRegistry
│     │  ├─ application.entity.ts
│     │  ├─ applications.constants.ts    # + enum SyncOutcome (§4.5), VacancySource (§4.8)
│     │  ├─ applications.type.ts  applications.interfaces.ts
│     │  └─ dto/                 ✅ create-application.dto.ts, update-application.dto.ts,
│     │                          ✅ find-applications.query.dto.ts, application.dto.ts,
│     │                          ✅ sync-result.dto.ts, sync-summary.dto.ts
│     ├─ vacancies/              ✅ provider contract, registry, §4.3 rules, bulk run and
│     │  │                       ✅ preview — shared by all sources (§4.8)
│     │  ├─ vacancies.module.ts          # imports HhModule and GetmatchModule
│     │  ├─ vacancies.controller.ts      # POST /api/vacancies/preview
│     │  ├─ vacancy-provider.registry.ts # single dispatch point by source
│     │  ├─ vacancy-sync.service.ts      # §4.3 rules, bulk run (§4.6)
│     │  ├─ vacancy-logo.service.ts      # §4.10 rules, shared by sync and create (§4.4)
│     │  ├─ vacancy-error.helpers.ts     # describeErrorReason
│     │  ├─ vacancy-url.helpers.ts       # normalizeVacancyUrl
│     │  ├─ vacancy-retry.helpers.ts     # fetchWithRetries, describeTransportError
│     │  ├─ vacancy-http-options.factory.ts
│     │  ├─ vacancies.constants.ts  vacancies.type.ts  vacancies.interfaces.ts
│     │  └─ dto/                 ✅ preview-vacancy.dto.ts, vacancy-preview.dto.ts
│     ├─ hh/                     ✅ VacancySourceProvider for hh.ru — HTTP client, page
│     │  │                       ✅ parsing and per-source env/texts only
│     │  ├─ hh.module.ts                 # no controller, no TypeOrmModule.forFeature
│     │  ├─ hh-api.service.ts            ✅ implements VacancySourceProvider (+ .spec.ts)
│     │  ├─ hh-page.parser.ts            ✅ HTML page: JSON-LD + archived tokens
│     │  ├─ hh-http-options.factory.ts   ✅ thin wrapper over buildVacancyHttpOptions
│     │  ├─ hh-url.parser.ts             ✅ vacancy_id extraction (+ .spec.ts)
│     │  └─ hh.constants.ts              ✅ per-source literals (§4.1, §4.2)
│     └─ getmatch/               ✅ VacancySourceProvider for getmatch.ru (§4.9)
│        ├─ getmatch.module.ts  getmatch-api.service.ts
│        ├─ getmatch-page.parser.ts      ✅ flight-payload: initialVacancy
│        ├─ getmatch-url.parser.ts       ✅ vacancy id extraction
│        ├─ getmatch-http-options.factory.ts
│        └─ getmatch.constants.ts  getmatch.type.ts  getmatch.interfaces.ts
└─ frontend/
   ├─ Dockerfile  nginx.conf  index.html  package.json  tsconfig.json  eslint.config.mjs  ✅
   ├─ vite.config.ts              ✅ + vite.constants.ts (constants extracted per §10 item 3)
   └─ src/
      ├─ main.tsx                 ✅ ThemeProvider + LocalizationProvider(ru) + QueryClientProvider
      ├─ App.tsx                  ✅ list screen: filters, debounced search, expansion
      ├─ theme.ts                 ✅ size="small" by default
      ├─ vite-env.d.ts  test/setup.ts  ✅
      ├─ api/                     ✅ client.ts, applications.api.ts, hh.api.ts
      ├─ types/                   ✅ application.type.ts, application.interfaces.ts,
      │                           ✅ sync.type.ts, sync.interfaces.ts, api.interfaces.ts,
      │                           ✅ hh.interfaces.ts, notification.type.ts, notification.interfaces.ts
      ├─ constants/               ✅ api.constants.ts, query.constants.ts, theme.constants.ts,
      │                           ✅ layout.constants.ts (gaps, flex-basis, 48h),
      │                           ✅ application.constants.ts (enums + ru labels),
      │                           ✅ sync.constants.ts (§7.6/§7.7 labels + severity map),
      │                           ✅ notification.constants.ts, pickers.constants.ts, url.constants.ts
      ├─ utils/                   ✅ date.utils.ts, application.utils.ts, sync.utils.ts,
      │                           ✅ applications-cache.utils.ts, url.utils.ts, error.utils.ts
      ├─ hooks/                   ✅ useApplications.ts, useExpandedIds.ts
      │                           ✅ (+ use-expanded-ids.interfaces.ts), useDebouncedValue.ts,
      │                           ✅ useUpdateApplication.ts, useCreateApplication.ts,
      │                           ✅ useDeleteApplication.ts, useSyncApplication.ts,
      │                           ✅ useSyncAllOpen.ts, useHhPreview.ts,
      │                           ✅ useInlineEdits.ts, useNotification.ts
      └─ components/              ✅ AppHeader.tsx, FilterBar.tsx, ApplicationsList.tsx,
                                  ✅ ApplicationAccordion.tsx, ApplicationSummaryRow.tsx,
                                  ✅ SyncStatusIcon.tsx, EmptyState.tsx (+ paired *.interfaces.ts),
                                  ✅ ApplicationFields.tsx, CreateApplicationDialog.tsx,
                                  ✅ ConfirmDeleteDialog.tsx, UrlField.tsx, FieldCell.tsx,
                                  ✅ SyncSummaryAlert.tsx, NotificationSnackbar.tsx
```

`useAutosaveField.ts` never appeared: `useInlineEdits.ts` covers its role entirely — drafts for the
whole list must live in one place (§14 step 8).

`src/utils/` was not in the original tree — added at step 7: pure date-formatting and
nearest-interview helpers are neither component, hook nor api function, and steps 8 and 10 reuse them.

The step-1 scaffolding (`BackendStatus.tsx`, `api/health.api.ts`, `types/health.*`) was deleted with
the arrival of the real list: §7.1 describes the `AppBar` exhaustively and has no health indicator.
The backend `GET /api/health` endpoint stays — the docker healthcheck needs it (§5.4).

Enums `SyncOutcome` (§4.5) and `VacancySource` (§4.8) are declared in
`applications/applications.constants.ts`, not in `vacancies/`/`hh/`/`getmatch/`: columns
`last_sync_outcome` and `vacancy_source` belong to the `applications` table, and the import direction
is `vacancies`/`hh`/`getmatch` → `applications`. Declaring them lower would create a dependency cycle.

`layout.constants.ts` already holds the §7.2 values: `FIELD_GAP`, `ACCORDION_GAP`,
`SUMMARY_COMPANY_WIDTH_PX`, the `FIELD_FLEX` map with all flex-basis values, the partial
`FIELD_MAX_WIDTH` map (width ceiling for fluid fields) and `UPCOMING_INTERVIEW_HIGHLIGHT_HOURS`.
Take values from there, never hardcode them in JSX.

---

## 12. Out of scope (do not build)

- hh.ru OAuth, `/negotiations`, reading my own application statuses, auto-filling `result`.
- Job boards other than hh.ru and getmatch.ru (LinkedIn, Habr Career, …).
- Uploading/storing résumé files (URL string only). Exception: the on-disk company-logo cache (§4.10)
  — a by-product of sync, not a user attachment.
- Queues, workers, system cron, a scheduler container, WebSocket/SSE. Scheduled sync exists (§4.7) but
  runs inside `api` on `@nestjs/schedule`; no schedule-status endpoint, no UI for it, no push results.
- Notifications: email, telegram, push, interview reminders. Multi-user, registration, roles,
  JWT/sessions/OAuth login into the app.
- Pagination, list virtualization, bulk editing, drag-n-drop, kanban, a `DataGrid` view instead of
  accordions. Analytics, charts, dashboards, rejection funnels.
- CSV/Excel export/import, Google Sheets/Notion sync. Change history, audit log, soft delete, trash, undo.
- Mobile layout, PWA, dark theme, user-configurable field set/order, persisting expanded state
  between sessions. Cloud deploy, CI/CD, Kubernetes, HTTPS/certificates, an outward reverse proxy.
- User-editable status/result dictionaries; attachments, tags, priorities, salary ranges.
- Browser emulation, headless browser, anti-bot/ddos-guard bypass, hh.ru cookie sessions; extracting
  salary/skills/requirements/address from a vacancy page; storing HTML dumps.

**Vacancy-search clarifications (§4.11, §4.12):**

- **Allowed** (amends the above): parsing the hh.ru search results page and reading `description` from
  the vacancy page's JSON-LD `JobPosting`, but only as input to AI screening (§4.11.7) — never stored
  in the DB, never returned to the frontend. Application sync (§4.3) still does not read it.
- **Out of scope:** logging into hh.ru to make `resume=` work — cookie session, OAuth, headless
  browser, captcha solving, proxy/User-Agent rotation, any rate-limit circumvention (§4.11.1).
- **Out of scope:** queues, brokers, workers, a separate container for the run. Run asynchrony
  (§4.11.9) is an in-process flag plus status polling; still no WebSocket/SSE.
- **Out of scope:** starting a search automatically (schedule, process start, event). Frontend button
  only (§4.11.10) — no code, env vars, or "disabled by default" interval.
- **Out of scope:** deleting a lead, read marks, favorites, tags, priorities; creating an application
  from the list in one click; auto-apply. Hiding (§7.9.3) is the only user action on a lead.
- **Out of scope:** search on getmatch.ru (§4.9 stays the per-vacancy data source), several saved
  queries at once, pagination/virtualization of the vacancy list, new-vacancy notifications, run
  history in the DB.
- **Out of scope for AI:** summarizing the description, percent-match scoring, cover-letter
  generation, fine-tuning, embedding indexes. The model answers only "yes/no + short justification"
  at the two stages (§4.12).

---

## 13. Acceptance criteria

Done when every item is reproducible on a clean machine.

**Startup and infrastructure** 1. `cp .env.example .env`, `docker compose up -d` → within ≤2 min
`http://127.0.0.1:8080` shows the empty state; default creds `admin` / `admin` from `.env.example`. 2. Browser asks for Basic Auth; a wrong password grants no data access; `GET /api/health` needs none. 3. `api` with empty `AUTH_PASSWORD` crashes with a clear log message; defaults live only in
`.env.example`. 4. `docker compose down && up -d` → all records survive.

**CRUD** 5. «+ Добавить» with only the company creates `status = OPEN`, `result = IN_PROGRESS`, on top
of the list **expanded**. 6. Any field edit saves without a «Сохранить» press and survives `F5`. 7. A network error on autosave rolls the value back and shows a `Snackbar`. 8. Clearing a
`DateTimePicker` writes `null`. 9. Deletion requires confirmation. 10. Filters «Все / Открытые /
Закрытые», search by company/position/notes, and sorting by four fields work.

**List layout (§7.2)**
10.1. Each vacancy is its own full-width `Accordion`; no `Table`/`DataGrid` in the code.
10.2. All collapsed on load; a summary-row click toggles only its own; several may be expanded.
10.3. Clicking 🔄 or 🗑 in the summary row **must not** change expanded state.
10.4. At 1920×1080 at least **12** collapsed vacancies fit at once.
10.5. At ≥1600px expanded rows 1 (company, position, vacancy URL, résumé URL, status, result, HR
interview, tech interview) and 2 (§7.2.2) each take one line; narrowing wraps fields, no horizontal
page scroll.
10.6. Gap between fields and accordions is 8px; no numeric size literals in JSX (only `spacing` /
`layout.constants.ts`).
10.7. Editing a field then collapsing the accordion saves the edit.
10.8. Company/position/status/result changes show immediately in the collapsed summary row.
10.9. «Где собес» autosaves (§7.3), `OpenInNew` opens the link in a new tab, value survives `F5`,
clearing writes `null`.

**hh.ru** 11. Pasting `https://hh.ru/vacancy/{id}` of a live vacancy in the create form auto-fills
company and position without overwriting hand-typed values. 12. 🔄 on a live vacancy: `outcome = OK`,
`status` stays `OPEN`, tooltip shows the time. 13. 🔄 on withdrawn (`archived = true`) or deleted
(404): `status` → `CLOSED`, summary row dims, `result` **unchanged**. 14. 🔄 with no recognized source
(§4.2) or no URL: `outcome = SKIPPED_UNSUPPORTED`, record unchanged, info notification. 15. «Обновить
все открытые» processes only `OPEN` records, shows progress and a correct summary; one failure does
not abort the rest. 16. No hh.ru request without `User-Agent`; on 429 a backoff retry, then
`outcome = RATE_LIMITED`.

**Code quality** 17. `npm run lint` in `backend/` and `frontend/` — 0 errors, with
`padding-line-between-statements` on. 18. `npm run build` (tsc) — no errors, no `any`. 19. No inline
type/interface or module-constant declarations in implementation files (exception: spec mocks). 20. `hh-url.parser` unit tests cover every §4.2 case (getmatch.ru URL → `null`); e2e cover CRUD and
`POST /api/vacancies/preview` for both sources against local stubs. _`vacancy-sync.service` tests, e2e
for `POST /:id/sync` / `POST /sync-open`, and all frontend tests are **deferred by user decision** (no
new spec files) — not §13 criteria; frontend `npm run test` passes via `--passWithNoTests`._ 21. TypeORM `synchronize` off; schema from migrations only; re-running migrations is idempotent.

**getmatch.ru** 22. Pasting a live `https://getmatch.ru/vacancies/{id}[-slug]` auto-fills company and
position (§4.4, §4.9) as for hh.ru. 🔄 with `is_active: true`: `outcome = OK`, `status` stays `OPEN`.
🔄 with `is_active: false`: `outcome = OK`, `archived = true`, `status` → `CLOSED`. 🔄 on a
non-existent vacancy (`"initialVacancy":null`, HTTP `200`): `outcome = NOT_FOUND`, `status` → `CLOSED`
— same as an hh.ru 404 (§4.3, §4.9) though signalled differently.

**Vacancy search (§4.11, §4.12, §5.7, §7.9)** 23. The «Вакансии» tab sits next to «Отклики»; tab
switching breaks no §13.10.x item, and an unsaved field edit is saved on leaving. 24. «Настройки
поиска» edits the query string, keywords, exclude keywords and both prompts; the URL preview shows the
substituted `{text}`; a prompt missing its required placeholder is rejected `400` with a message under
that field. 25. «🔎 Найти вакансии» answers instantly (`202`), the button disables, progress refreshes
every 2 s, the list grows on completion without a reload. 26. A second start during a run answers
`409` plus an info notification. 27. A repeat run right after the first creates `0`: `created = 0`,
`duplicates > 0` — dedup by "position + company + publication date". 28. Regional clones (several
`vacancyId`, same title/company/publication time) yield **one** row. 29. Logs show hh.ru requests
staying within `HH_MAX_REQUESTS_PER_SECOND` (default 2/s), counting concurrent application sync. 30. With `aiEnabled = true` and `ollama` up, leads have `aiTitleReason`, `aiDescriptionReason`,
`aiModel` and `matchSource = 'AI'`; a description-rejected vacancy never reaches the DB and shows in
`rejectedDescription`. 31. A stopped `ollama` does not break the run: `matchSource = 'KEYWORDS'`,
`aiFallbacks` grows, no descriptions fetched, `warn` in the log. 32. Unreachable hh.ru (or a page
without the state block) ends with `stoppedReason = 'ERROR'`, an error `Alert`, and no junk records. 33. «Скрыть» removes the vacancy at once; the «Скрытые» toggle shows and restores it; the next run
**must not** re-create it. 34. An expanded accordion shows salary, region, experience, employment
type, work format and the model's justifications; missing fields are omitted, not dashed.

---

## 14. Development history → CHANGELOG.md

The numbered log of completed development steps used to live here. It now lives in
[CHANGELOG.md](./CHANGELOG.md), newest first, **with the step numbering unchanged** — a comment
citing "шаг №26 §14" still means entry 26 there.

This section is kept as an anchor so those existing citations resolve. Every edit that changes
application behaviour adds an entry to CHANGELOG.md; nothing is appended here.
