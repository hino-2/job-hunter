# backend/CLAUDE.md

Backend-specific guidance (NestJS + TypeORM). Root [`CLAUDE.md`](../CLAUDE.md) has the
project-wide pipeline, commands, architecture and conventions.

## NestJS + TypeORM

- **`app.setup.ts` (`configureApp`) is the single place the app is configured**: `/api` prefix,
  global `ValidationPipe`, `BasicAuthGuard`, `HttpExceptionFilter`. Both `main.ts` and the e2e
  factory (`test/e2e-app.factory.ts`) call it, so tests exercise production behaviour. The
  guard and filter are registered manually via `useGlobalGuards`/`useGlobalFilters`, **not**
  through `APP_GUARD`/`APP_FILTER` — that would create a second configuration site. Add global
  behaviour there.
- **Basic Auth is global** (`auth/basic-auth.guard.ts`): all of `/api/*` is closed except
  what is marked `@Public()` (`GET /api/health`). Comparison is `timingSafeEqual` over SHA-256
  digests; neither the Authorization header nor the login or password reaches the log.
- **One error format** (`common/http-exception.filter.ts`, §5.5) —
  `{ statusCode, message, error }`, stack traces only in the log.
  `@Catch()` without arguments catches everything,
  including `QueryFailedError`. The response goes out through `response.status().json()` so
  that `WWW-Authenticate` is not overwritten.
- **Env is validated at startup** (`config/environment.validation.ts`): a missing or invalid
  variable kills the process. A new env variable = a field in `EnvironmentVariables` + a
  default constant in `config/config.constants.ts` + a line in `.env.example` + a passthrough
  in `docker-compose.yml`.
- **Layers**: the controller maps an entity to a DTO (`ApplicationDto.fromEntity`) and
  translates domain outcomes into HTTP statuses; the service returns entities and speaks
  `SyncOutcome` (§4.5), because both sync and preview reuse it.
- **`hh-url.parser.ts` is a pure function, not a provider**: both `ApplicationsService` and
  `HhController` call it, it has no dependencies, and a provider would force every caller to
  import the module. The `SyncOutcome` enum lives in `applications/applications.constants.ts`
  because the dependency runs `hh → applications` (the `last_sync_outcome` column is in
  `applications`).
- **`hh-api.service.ts` throws nothing outward**: any failure (429, 5xx, timeout, broken JSON)
  becomes a `SyncOutcome`. Retries happen only on 429 and 5xx. Values that reach the DB are
  truncated to column width at parse time — otherwise an over-long value from the source would
  produce a 500 instead of a normal outcome.
- **`vacancy_external_id` is computed on the backend** on create and on **every** write of
  `vacancy_url` (including clearing it to `null`); the frontend never sends the field.
- **Route order**: `POST 'sync-open'` and `POST ':id/sync'` are declared **above** the methods
  with `:id`, otherwise Express matches `sync-open` as `:id`. Do not reorder. The same applies
  to `GET ':id/logo'`.
- **`vacancies/vacancy-sync.service.ts` is the single place holding the §4.3 rules**: it builds
  the `ApplicationSyncPatch` (which cannot contain `company` or `result`; `position` is written
  only on outcome `OK` and only as a non-empty normalized source title, truncated to column
  width by `vacancy-position.helpers.ts`) and saves the record itself through
  `Repository<Application>`. Module dependencies run
  `ApplicationsModule → VacanciesModule → { HhModule, GetmatchModule }`, never the reverse —
  otherwise a cycle and `forwardRef`. The §5.2 endpoints answer `200` on any outcome; `404`
  means only "no such record". The patch is applied to the entity before `save()`, so a failed
  `save()` rolls the entity back from a snapshot (`ApplicationSyncSnapshot`) — state that is
  not in the DB must never be returned. The §4.10 "download the logo or not" decision no longer
  lives here — it moved to `vacancies/vacancy-logo.service.ts` (`VacancyLogoService`), shared
  by this class and by `ApplicationsService.create()` (§4.4).
- **`vacancy_source`/`vacancy_external_id` are written only as a pair and only on the
  `vacancy_url` write path** (`ApplicationsService.resolveVacancyRef`); `VacancySyncService.decide()`
  trusts the column and never parses the URL. A data migration touching either column must
  change both, and its `down()` must undo its own backfill — `GeneralizeVacancySource` did not,
  and a revert→up cycle glued a getmatch id to source `'HH'` (repaired by
  `RepairGetmatchVacancySource`).
- **Bulk run** (`common/async.helpers.ts`, `mapWithConcurrency`): the time slot is reserved
  synchronously, before `await`, otherwise all workers start at once. The helper neither
  swallows errors nor cancels the run — `syncOneSafely` catches them so one record cannot
  break the rest (§4.6); details go to the log, the outward message stays generic per §5.5.
- The entity (`application.entity.ts`) is the reference for `migration:generate`; the
  snake_case ↔ camelCase mapping is an explicit `name` on every column, with no custom
  NamingStrategy.
- **`logos/` knows nothing about `Application`** and lets no exception escape — a logo download
  failure must not change the §4.5 outcome. Host allow-lists are re-checked on every redirect
  hop (`beforeRedirect`), otherwise `maxRedirects > 0` reopens the SSRF hole.
- **`scheduler/`** registers its interval dynamically in `onApplicationBootstrap`, not with the
  `@Interval` decorator (§2.4); overlap is prevented by an in-process boolean flag cleared in
  `finally`, and the tick is invoked through `void` with a full internal `try/catch` — an
  unhandled rejection inside `setInterval` would kill the process.

## e2e infrastructure

`test/test-environment.ts` (`applyTestEnvironment`) is called **before** `AppModule` is
imported and replaces `process.env`: a separate `jobhunter_test` database (recreated from
scratch each run, its name checked by regex against the working database), fixed Basic Auth
credentials, source base URLs pointing at local stubs (`test/vacancy-stub.server.ts`), the
hh.ru throttle removed and the scheduler disabled. **No e2e test reaches the internet** — new
sync tests must use the same stub. Isolation between tests is `TRUNCATE`, hence `maxWorkers: 1`.
