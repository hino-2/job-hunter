# Deferred plan: apply to a vacancy from inside the app

**Status: SHELVED on 2026-08-25 by the project owner. Not scheduled. No code was written.**

**Reason for shelving:** the feature's core — sending an authenticated apply request to hh.ru on
the user's behalf — has no legitimate technical path left (see §2.1), and the only remaining path
risks the owner's hh.ru account being blocked. That risk was rejected outright.

This document is the full architect blueprint plus the follow-up delta on interactive hh.ru login,
merged and kept for a possible future return. Nothing here has been applied to
`SPECIFICATION.md`, `CHANGELOG.md` or the code. `SPECIFICATION.md` §12 still forbids this feature
(see §1) and remains the source of truth.

---

## 0. What is still viable if this is revived

Read this section first on a revival — the plan below is larger than what survives the owner's
decision.

| Part | Verdict after the shelving decision |
|---|---|
| Cover-letter generation with the existing local LLM | **Viable, zero external risk.** No credentials, no outbound authenticated call. |
| Resume text + editable prompt in settings | **Viable, zero risk.** Local data only. |
| Assisted apply (generate letter → clipboard → open the vacancy page → the user presses hh.ru's own «Откликнуться» → the app records the application) | **Viable, zero risk.** No credentials, no ToS breach, no captcha. |
| Storing the letter and the delivery outcome on the application row | **Viable.** |
| hh.ru interactive login + direct apply via the private web API | **REJECTED — account-block risk.** This is what killed the feature's headline flow. |
| it-vacancies.ru login + direct apply | **Re-decide before building.** Smaller site, no captcha observed, but it is still an undocumented private API and still a ToS question. The same account-block objection applies in kind, if not in degree. |

A revival that keeps only the risk-free rows is Phases 1–4 of §9 with the hh.ru direct adapter
dropped. That is a real, useful feature on its own: the letter is written for you, reviewed by you,
and the application is tracked — only the final click happens on hh.ru.

---

## 1. Blocker: the specification forbids this feature

The feature as requested is **explicitly forbidden by `SPECIFICATION.md` §12 in four separate
places**. Nothing below can be built until §12/§4.1/§4.11.1 are amended by the owner.

| §12 line (verbatim) | Collides with |
|---|---|
| "hh.ru OAuth, `/negotiations`, reading my own application statuses, auto-filling `result`." | any authenticated apply to hh.ru |
| "Browser emulation, headless browser, anti-bot/ddos-guard bypass, hh.ru cookie sessions" | the only technically remaining hh.ru path |
| "Out of scope for AI: summarizing the description, percent-match scoring, **cover-letter generation**, fine-tuning, embedding indexes." | the whole letter-generation step |
| "Uploading/storing résumé files (URL string only)." | storing resume text for the prompt |

Also `§4.11.1` states as a *fixed decision*: "Working without an hh.ru login is fixed." And `§4.1`:
"Out of scope (§12): `/negotiations`, OAuth flow, refresh tokens, account linking, browser
emulation, anti-bot evasion."

Phase 1 of the build sequence was therefore a documentation commit rewriting those lines. It was
never made. Note that **even the risk-free subset in §0 needs the §12 amendment** — cover-letter
generation and resume-text storage are banned there independently of the authentication question.

---

## 2. Research answers

### 2.1 Authentication on the integrated sites

#### hh.ru — the official API is dead for this use case

- Registering an application at `dev.hh.ru` and OAuth are still the documented mechanism. The
  official README states you must "register your application at https://dev.hh.ru", after which it
  "can request user permission to access personal data «without obtaining and storing their login
  and password»", and endpoints are tagged by authorization type: *Anonymous / Application / Job
  seeker / Employer* ([hhru/api README](https://github.com/hhru/api)).
- The apply operation itself is no longer documented in the repo — `docs/negotiations.md` now only
  says "Данный метод доступен в
  [OpenAPI](https://api.hh.ru/openapi/redoc#tag/Vakansii/operation/apply-to-vacancy)"
  ([negotiations.md](https://github.com/hhru/api/blob/master/docs/negotiations.md)). Historically:
  `POST /negotiations`, `application/x-www-form-urlencoded`, fields `vacancy_id`, `resume_id`,
  `message`; job-seeker authorization; resume list at `GET /resumes/mine`.
- **But job-seeker methods were switched off on 15.12.2025.** hh.ru closed the resume/job-seeker
  API citing data protection ([Habr news](https://habr.com/ru/news/1069286/),
  [Сетка announcement](https://setka.ru/posts/019b1fa3-f9f1-7632-931b-15152090c400),
  [Habr analysis](https://habr.com/ru/articles/976476/)). API support, quoted 08.05.2026:
  **«Работа с резюме и откликами со стороны соискателя не поддерживается в нашем API с декабря
  прошлого года. С токеном соискателя доступен только запрос GET /me»**
  ([source](https://apify.com/mcpbay/hh-mcp)).
- So the legitimate option set for hh.ru is empty. What remains is the private web API used by the
  site's own SPA, mapped by third parties
  ([HH_API_MAP.md](https://github.com/Vlad9572324/hh.ru-clicker/blob/main/HH_API_MAP.md)):
  `GET /applicant/vacancy_response/popup?vacancyId=N` (returns preconditions:
  `resumeInconsistencies`, whether a test is required, whether a letter is mandatory), then
  `POST /applicant/vacancy_response/popup` with FormData (resume hash, vacancy id, cover letter,
  `lux`), plus `GET /shards/applicant/resumes` for the resume list. Auth is the browser session
  cookie (`hhtoken` + XSRF token). The same map notes "Требуют OAuth2 (hhtoken не работает как
  Bearer)" for the public API and that many applicant endpoints are "Защищённые капчей".

Options for hh.ru, final evaluation (after the interactive-login delta):

| Option | One-time user action | Lifetime / refresh | Fragility | Verdict |
|---|---|---|---|---|
| **A. Official OAuth2 + `POST /negotiations`** | register app on dev.hh.ru, OAuth consent | token ~2 weeks + refresh | none technically | **Impossible** — job-seeker scope answers only `GET /me` since 15.12.2025 |
| **B1. Cookie pasted from DevTools** | copy `hhtoken` from DevTools per expiry | manual re-paste | captcha/bot detection; ToS breach; user must know DevTools | Superseded by B2 |
| **B2. Interactive login performed by the service** (design in §2.1.1) | type login + password in the app once, solve a captcha when asked | unknown; liveness established by an authenticated probe; re-login is a two-click dialog | captcha is the *expected* path; TLS-fingerprint/DDoS-Guard can reject regardless of a correct body; every response shape unverified; **ToS breach → account-block risk** | **REJECTED by the owner** |
| **C. Headless browser** | login in a controlled browser | cookie jar | pulls Chromium into a `tsc`-only backend; banned technique (§2.4, §12) | Rejected |
| **D. Assisted apply** — the app generates the letter, copies it to the clipboard, opens the vacancy page; the user presses hh.ru's own «Откликнуться»; the app records the application | nothing | n/a | zero: no credentials, no ToS breach, no captcha | **The only surviving option** |

#### 2.1.1 The interactive-login design (kept for reference, not to be built)

The owner proposed, and the architect designed, an in-service login instead of a pasted cookie.
Recorded here because the analysis is the expensive part, and because it documents *why* the path is
unattractive even setting the ToS aside.

Captured request (real, from the owner's browser):

```
POST https://ekaterinburg.hh.ru/account/login
Content-Type: multipart/form-data
fields: username, password, accountType=APPLICANT,
        failUrl=/account/login?backurl=%2Fapplicant%2Fnegotiations%3Ffilter%3Dall%26state%3DREAD%26state%3DUNREAD,
        remember=true, loginTrustFlags=null, captchaText=<empty>
```

Findings:

1. **Captcha is the expected path, not the exception.** hh.ru's own knowledge base: «если при входе
   в личный кабинет на hh.ru появилось окошко с текстом на картинке (капча), значит, система
   заподозрила вероятность взлома вашего аккаунта», and the user must «введите буквы с картинки в
   правильной последовательности с пробелами»
   ([article 6541](https://feedback.hh.ru/knowledge-base/article/6541)). Triggers named there: the
   same device/ID used under several registrations, or several wrong passwords. A login from a
   datacentre IP with a Node TLS fingerprint is squarely in "suspicious" territory.
2. **The captcha challenge carries a key/id**, and the retry must send `captchaText` *together with
   that key* and *the same pre-login cookies*. The in-flight attempt must retain the cookie jar
   **and** the captcha key.
3. **The captcha image cannot be loaded by the user's browser directly** — it is bound to our
   server's cookie set, and letting the browser fetch `hh.ru` would mint a *different* session. It
   must be byte-proxied through our backend, exactly like `GET /api/applications/:id/logo`.
4. **Code-by-email is an alternative login method, not a mandatory second factor.** hh.ru's login
   page offers a one-time code by SMS/email, social logins, **and** «Войти с паролем» as co-equal
   options ([article 2223](https://feedback.hh.ru/knowledge-base/article/2223)). Whether a code is
   ever demanded as a step-up on a suspicious password login is **UNVERIFIED**. Design consequence:
   `CODE_REQUIRED` is a first-class challenge status beside `CAPTCHA_REQUIRED` (same store, same
   retry endpoint, different input field), but no separate code-login flow is built.
5. **`GET` the login page first**, in the same attempt, to collect pre-login cookies and `_xsrf`,
   then `POST` with `X-XSRFToken`. The captured request carries no `_xsrf` form field, consistent
   with the SPA passing it as a header. A cold POST with no prior GET and no XSRF header is the most
   likely cause of a hard rejection. **UNVERIFIED** whether the POST demands the header; the
   GET-first design costs one request and removes the question.
6. **`maxRedirects: 0` is mandatory.** The login answers 302 and `Set-Cookie` must be read off that
   302 itself.
7. **Cookie jar: hand-rolled, no `tough-cookie`, no `axios-cookiejar-support`.** Only two operations
   are needed — merge the `set-cookie` array into a `Map<string, string>`, and render that map into
   one `Cookie` header. No path matching, no domain matching (single origin), no expiry arithmetic
   (the probe is the authority on liveness), no jar serialization (the rendered header string is what
   gets persisted). Pure helper `hh-cookie.helpers.ts`: `parseSetCookieHeader(headers: unknown)`,
   `mergeCookies(base, incoming)`, `renderCookieHeader(map)`, `readXsrf(cookieHeader)` — all
   narrowing from `unknown`, no `any`.
8. **TLS fingerprint / DDoS-Guard can reject a perfectly correct body.** Headless browsers and
   anti-bot evasion stay banned, so the assisted path must remain reachable in one click as the
   degradation path, and `HH_APPLY_ENABLED=false` must be the shipped default.
9. **Regional subdomain is not significant.** hh.ru scopes its session cookies to `.hh.ru`, which is
   how the regional hosts share one login; the subdomain only preselects the region. Use the existing
   `HH_SITE_BASE_URL` (already defaults to `https://hh.ru`, `config.constants.ts:24`) as the login
   origin, so switching to a regional host is a `.env` change, not a code change. **UNVERIFIED**
   whether the anti-bot layer treats the apex and a regional host differently.
10. **Never persist the password.** It is accepted in one request body, held in the in-memory attempt
    for at most `SITE_LOGIN_ATTEMPT_TTL_MS` (default 600 000) *because the captcha retry must
    re-send it*, and never written to Postgres, disk or any log. Note the reasoning: an unattended
    re-login *would* be technically possible with a stored password on a challenge-free login, so
    "captcha makes it impossible anyway" is not a valid argument. The valid ones are that an
    unattended re-login is exactly the capability that turns this into the scheduled auto-apply that
    stays banned, and that a stored password is a far worse breach than a stored session.
11. **Nothing is stored on disk.** A file under `COMPANY_LOGO_DIR` would either need a new volume or
    die with the container, and `pg_dump` would not capture it. The encrypted `site_credentials` row
    is the store.

Unverified response shapes — the architect refused to guess them:

| Question | Answer |
|---|---|
| Is `remember=true` enough for a long-lived session? | **UNVERIFIED.** Probably a long-lived `hhtoken` rather than a session cookie, but no lifetime is documented. Design accordingly: never store or trust an expiry; liveness is decided only by the probe. Send `remember=true` because a short session is strictly worse. |
| What is the actual `Set-Cookie` set and its lifetime? | **UNVERIFIED.** Expected `hhtoken`, `hhuid`, `_xsrf`, plus regional/display cookies. The design removes the need to know: the whole merged cookie set is persisted as **one opaque header string**, and `_xsrf` is extracted from it at request time. A fourth cookie tomorrow changes nothing. |
| Success / wrong password / captcha / code response shapes? | **UNVERIFIED, all four.** Classification lives in one pure `classifyHhLoginResponse(status, headers, body)` in `hh-login.parsers.ts`, driven by a constants table of heuristics carrying the project's `НЕ ПРОВЕРЕНО` comment marker (precedent: `it-vacancies.constants.ts:94`). Expected: 302 + a `Location` away from `/account/login` + an `hhtoken` cookie ⇒ `AUTHENTICATED`; 302/200 back to `failUrl` ⇒ inspect the body for a captcha marker ⇒ `CAPTCHA_REQUIRED`, for a code marker ⇒ `CODE_REQUIRED`, else `INVALID_CREDENTIALS`; 403 without a captcha marker ⇒ `BLOCKED`. **Default branch is `ERROR`, fail-closed** — an unrecognized page must never be reported as a successful login. |

**Session-validity probe.** There is no web-session equivalent of `GET /me`: `api.hh.ru` accepts
only an OAuth Bearer token, and «hhtoken не работает как Bearer»
([HH_API_MAP.md](https://github.com/Vlad9572324/hh.ru-clicker/blob/main/HH_API_MAP.md)). Chosen
probe: `GET /shards/applicant/resumes` on `HH_SITE_BASE_URL` with the stored cookie header and
`maxRedirects: 0`. It is authenticated, small, JSON, needs no vacancy id, and it is the call the
resume `Select` needs anyway — one request serves both. Classification: `200` + parsable JSON ⇒
`ALIVE`; `302` toward `/account/login`, or `401`/`403` ⇒ `EXPIRED`; anything else (5xx, transport,
unparsable) ⇒ `UNKNOWN`. **Never downgrade to `EXPIRED` on a 5xx** — that would nag the user into a
needless re-login during an hh.ru outage. Rejected alternative:
`GET /applicant/vacancy_response/popup?vacancyId=N` — needs a real vacancy id and burns a
rate-limit slot on the most captcha-sensitive endpoint. **UNVERIFIED** whether the chosen path is
captcha-free; if not, `UNKNOWN` is the fail-closed answer. Throttled through `HhRequestThrottle`, at
most one live probe per `HH_SESSION_PROBE_MIN_INTERVAL_MS` (default 60 000); never on a timer, never
on app start — only when the session dialog opens, when the apply dialog opens in DIRECT mode, and
after an `AUTH_FAILED` delivery.

#### it-vacancies.ru — no public API at all

- No developer portal, no API docs, no OAuth. Fetching the site surfaces only user-facing entry
  points: `"Найти работу"` → `/auth/signup/`, `"Добавить резюме"`, `"Войти"`, and the pitch
  «отправляй резюме — возможно, твой отклик будет первым и результативным»
  ([it-vacancies.ru](https://it-vacancies.ru/)). Applying requires a registered job-seeker account
  **with a resume created on the site**.
- The site is a Nuxt SPA — our own code already relies on that
  (`backend/src/it-vacancies/it-vacancies.constants.ts:98`: the archived flag "существует только
  внутри минифицированного `window.__NUXT__`") and already knows the internal host
  `api.it-vacancies.ru` (`it-vacancies.constants.ts:36`).
- The realistic mechanism is a `POST` to a JSON endpoint on `api.it-vacancies.ru` with a bearer/JWT
  from a login endpoint, body carrying vacancy id, resume id and letter. **The exact paths and
  payload are unverified** — there is no documentation to cite, and guessing them in a blueprint
  would be malpractice.

| Option | One-time user action | Lifetime / refresh | Fragility | Verdict |
|---|---|---|---|---|
| **A. Login/password stored in the app → JWT per session** | enter site login + password once | JWT short-lived, re-login programmatically on 401 | undocumented endpoints; small site, so no captcha/2FA/bot-detection observed; breaks silently when the SPA changes | Was recommended; **re-decide on revival** given the account-block objection |
| **B. Paste a bearer token from DevTools** | copy the token per expiry | short; manual re-paste, likely daily | same brittleness plus terrible UX | Rejected |
| **C. Assisted apply (same as hh.ru D)** | nothing | n/a | zero | **Fallback, and the automatic behaviour whenever A returns `AUTH_FAILED`** |

#### Secret storage (no vault in this project)

1. **Env-only** (`IT_VACANCIES_LOGIN` / `IT_VACANCIES_PASSWORD` / `HH_SESSION_COOKIE`): zero new
   code, no crypto, no table — but site sessions rotate, and rotating an env var means editing
   `.env` and restarting the container. Unusable for the credential that expires most often.
2. **Postgres, encrypted at rest** (chosen). Table `site_credentials`, one row per source. Secret
   encrypted with **AES-256-GCM** (`node:crypto`, no new dependency); the 32-byte key is base64 in
   the new env variable `CREDENTIALS_ENCRYPTION_KEY`. An empty key disables the whole direct-send
   feature and every direct provider answers `NOT_CONFIGURED` (fail-closed, and dev/e2e keep booting
   without new required config). Ciphertext, IV and auth tag live in three `bytea` columns. Nothing
   decrypted is ever logged, returned by any endpoint, or put in an error message; the read DTO
   exposes only `source`, `kind`, `login`, `hasSecret`, `defaultResumeId`, `sessionStatus`,
   `sessionCheckedAt`, `updatedAt`.

Trade-off accepted: the encryption key sits next to the database in the same `.env`, so this is
obfuscation-at-rest against a stolen DB dump, not defence against host compromise. For a
single-user app bound to `127.0.0.1` that is the right amount of security; a real vault is out of
proportion.

### 2.2 hh.ru resume selection

Because the official `GET /resumes/mine` is closed to job-seeker tokens, resume listing exists
**only** on the private-web-API path, via `GET /shards/applicant/resumes` (returns each resume with
completion percentage, publication status, searchability flags). **This dies with the owner's
decision** — an assisted-only hh.ru integration has no resume list, because the user picks the
resume on hh.ru's own apply form.

Design, if revived:

- `VacancyApplyProvider.listResumes?()` is **optional** on the contract. Assisted-only providers do
  not implement it.
- `GET /api/site-credentials/:source/resumes` → `{ ok: true, resumes: [{ id, title, updatedAt }] }`
  or `{ ok: false, reason }`. **Live, never cached server-side**; React Query `staleTime: 0`,
  `gcTime` one minute, fetched only while the apply dialog is open
  (`enabled: deliveryMode === 'DIRECT'`).
- UI: a `Select` above the letter field inside `ApplyVacancyDialog`. Rendered only when the lead's
  source has a direct provider that supports listing; otherwise **not rendered at all** — a disabled
  control implies the feature exists.
- Zero resumes → the `Select` is replaced by a Russian hint ("На аккаунте нет опубликованного
  резюме") and «Отправить» switches to the assisted path.
- Many resumes → the user picks; the last pick is remembered in
  `site_credentials.default_resume_id` and preselected next time.
- Persisted per application: `applications.apply_resume_id varchar(64) NULL` — the source-side
  identifier actually used. Not a foreign key, not a resume snapshot: the source owns that data.

### 2.3 Is the existing LLM layer enough?

Read of `backend/src/vacancy-ai/`:

- `vacancy-ai.interfaces.ts` — `AiProvider.chat(request: AiChatRequest)` where
  `AiChatRequest = { model; prompt; jsonSchema; timeoutMs }`. **Task-agnostic.** A third task needs
  no provider change.
- `vacancy-ai.service.ts` — `judgeTitles` / `judgeDescription` both funnel into a private
  `chat(prompt, jsonSchema)`; model and timeout come from `VACANCY_AI_MODEL` /
  `VACANCY_AI_TIMEOUT_MS`; never throws, returns `{ ok: false, reason }`.
- `ollama-ai.provider.ts` — posts `format: jsonSchema.schema`, `think: false`,
  `options: { temperature: VACANCY_AI_TEMPERATURE }` where the constant is hard-wired `0`.
- `vacancy-ai.parsers.ts` — `parseJson` + explicit `readString`/`readBoolean` narrowing, no `any`.

**Verdict: reuse the provider layer; add a third task to `VacancyAiService`. Do not add a second
provider.** Three gaps, each fixed narrowly:

1. **`jsonSchema` is mandatory.** Do **not** make it optional — that would let a caller silently
   lose structured output. Give the letter its own schema `{ "letter": { "type": "string" } }`
   (`COVER_LETTER_JSON_SCHEMA` in `vacancy-apply/cover-letter.constants.ts`) and parse it with a new
   `parseCoverLetter(content)` following the `parseDescriptionVerdict` shape. Bonus: a
   schema-constrained answer cannot come back wrapped in reasoning prose.
2. **Temperature is a module constant `0`.** Prose at `temperature: 0` from a 4B model is repetitive
   and stilted. Add a **required** field `temperature: number` to `AiChatRequest`; both providers
   pass it through; the two existing call sites pass `VACANCY_AI_TEMPERATURE` (`0`), unchanged
   behaviour. Required, not optional, so the compiler finds every call site.
3. **One shared model and timeout.** §4.12.5 rejected "two different models for the two stages"
   *for screening*; letter writing is a different task and `qwen3:4b-instruct` is weak at it. Add
   `COVER_LETTER_AI_MODEL` (default `''` ⇒ fall back to `VACANCY_AI_MODEL`),
   `COVER_LETTER_AI_TIMEOUT_MS` (default `180_000` — letters are longer than verdicts),
   `COVER_LETTER_AI_TEMPERATURE` (default `0.7`). This is configuration, not a second provider:
   still one `AiProvider`, one `HttpModule`, one Ollama container.

Changes: `vacancy-ai.interfaces.ts` (+1 field on `AiChatRequest`, +`AiCoverLetterRequest`),
`vacancy-ai.type.ts` (+`AiCoverLetterResult`), `vacancy-ai.constants.ts` (+placeholders, +schema),
`vacancy-ai.service.ts` (+`writeCoverLetter`), `vacancy-ai.parsers.ts` (+`parseCoverLetter`), both
providers (+ pass `temperature`). **The provider factory and `vacancy-ai.module.ts` are untouched.**

**Where the resume text comes from:** not a file (§12's résumé-file ban stays intact even after the
amendment). A plain-text column `vacancy_search_settings.resume_text`, edited in the existing
settings dialog. Empty text is a valid DB state; generation then answers `{ ok: false, reason }`
with a Russian message telling the user to fill it in.

### 2.4 Editable cover-letter prompt

Reuse `vacancy_search_settings` (singleton, `id smallint PK CHECK (id = 1)`), adding
`cover_letter_prompt text NOT NULL`. Rejected alternative: a separate `apply_settings` table — it
costs an entity, service, controller, two DTOs, two hooks, an api module and a second dialog for a
single-user app, and the settings dialog already exists
(`frontend/src/components/SearchSettingsDialog/SearchSettingsDialog.tsx:82`). Trade-off accepted:
the table name is now slightly wider than "search settings"; documented in the entity comment.

- **Placeholders**: `{resume}` and `{description}` **mandatory** (validated exactly like
  `{keywords}`/`{titles}` today, `update-vacancy-search-settings.dto.ts`); `{company}` and
  `{position}` optional. Substitution reuses the existing `renderPrompt` helper.
- **Validation**: `@IsString() @IsNotEmpty() @MaxLength(VACANCY_SEARCH_SETTINGS_PROMPT_MAX_LENGTH)`
  (8000, unchanged constant) + two `@Matches` with `$property`-prefixed Russian messages so the
  frontend can place them under the right field. `resumeText`: `@IsString()
  @MaxLength(RESUME_TEXT_MAX_LENGTH = 20_000)`, **empty allowed** (otherwise the user could never
  clear it, `forbidNonWhitelisted` + whole-resource PUT).
- **Default**: `DEFAULT_COVER_LETTER_PROMPT` in `vacancy-search.constants.ts`, seeded by the
  migration and duplicated by hand in the frontend `constants/vacancy-search.constants.ts` (§3.4 —
  no shared package), which is how `DEFAULT_TITLE_PROMPT` already works.
- **Reset to default**: a `Button` under the field, same pattern as `handleResetTitlePrompt`
  (`SearchSettingsDialog.tsx:196`).
- **UI surface**: the same settings dialog, in a new section after the AI switch, separated by a
  `Divider`: «Резюме (текст)» + «Промпт сопроводительного письма» + reset.

---

## 3. Codebase context the plan relies on

- `backend/src/vacancy-search/vacancy-lead-application.service.ts` — already the single
  lead→application bridge: `applyToLead(leadId)` → `findOneByVacancyRef` → 409
  `LEAD_ALREADY_APPLIED_MESSAGE` → `ApplicationsService.create(buildCreateDto(lead))`.
- `backend/src/vacancy-search/vacancy-leads.controller.ts:59` — the load-bearing route-order comment:
  `scan`, `scan/stop`, `scan/status`, `:id/logo`, `:id/apply` are declared **above** `@Patch(':id')`.
  New routes go in that block.
- `backend/src/vacancy-search/vacancy-search.module.ts:32` — the fixed dependency direction:
  `VacancySearchModule → { HhModule, ItVacanciesModule, VacancyAiModule, LogosModule,
  ApplicationsModule }`, "обратной ссылки нет и не будет".
- `backend/src/vacancies/vacancies.interfaces.ts:206` —
  `VacancyLeadSearchProvider.fetchVacancyDescription(externalId)` returns **plain-text, untruncated
  description** (`vacancies.type.ts:49`). Exactly the input the letter needs, dispatched by
  `VacancyLeadSearchRegistry`. No new scraping code.
- `backend/src/vacancy-search/vacancy-lead.entity.ts:45` — "Колонки description намеренно нет (§3.5)":
  the description must be re-fetched at generation time, never read from the lead row.
- `backend/src/vacancies/vacancies.interfaces.ts:176` — the precedent for keeping source modules
  ignorant of `vacancy-search/`: "шаблон приезжает СЮДА как данные снимка настроек... источник не
  имеет права знать о vacancy-search". The apply contract follows it literally.
- `backend/src/logos/company-logo.helpers.ts:75` — `buildCompanyLogoRedirectGuard(allowedHostPattern)`
  re-checks the host on every redirect hop; `company-logo-http-options.factory.ts:22` explains why
  the guard is per-request.
- `backend/src/it-vacancies/it-vacancies-api.service.ts:97` — throttle acquired on **every** retry
  attempt, not just the first.
- `backend/src/config/environment.validation.ts` — `VACANCY_AI_API_KEY` uses
  `@ValidateIf((env) => env.VACANCY_AI_PROVIDER === 'openai')`: the template for conditionally
  required new secrets.
- `frontend/src/hooks/useApplyVacancyLead.ts` — in-hook `applyingIds` `Set` updated via functional
  `setState` in `onMutate`/`onSettled`; `onSuccess` patches `hasApplication: true` and invalidates
  only `APPLICATIONS_QUERY_KEY`; 409 → info, 404 → purge.
- `frontend/src/components/VacancyLeadSummaryRow/VacancyLeadSummaryRow.tsx` — `memo`'d, three-state
  label, disabled button wrapped in `Box component="span"` with `stopPropagation` (MUI gives disabled
  buttons `pointer-events: none`). **`handleApply` currently also calls
  `onToggleHidden(lead.id, !lead.hidden)`** — that side effect moves into the dialog's success path.
- `frontend/src/components/SearchSettingsDialog/SearchSettingsDialog.tsx:394` — the two-phase mount
  idiom (light `Dialog` while loading, form mounted only once data exists, "свежий монтаж сам даёт
  чистое состояние, useEffect на смену пропа не нужен"). The apply dialog copies it exactly.
- `frontend/src/constants/api.constants.ts:52` — per-request timeout overrides
  (`SYNC_REQUEST_TIMEOUT_MS`, `CREATE_REQUEST_TIMEOUT_MS`) because the default `API_TIMEOUT_MS` is
  20 s.
- Tests: `backend/test/` has **no** `vacancy-leads` e2e spec and the frontend has **no** test files.

---

## 4. Architecture decision

### 4.1 Chosen approach

A new backend module **`backend/src/vacancy-apply/`** owning two things and nothing else:

1. `CoverLetterService` — turns `{ resumeText, prompt, position, company, description }` into a
   letter via `VacancyAiService`. Knows nothing about leads or HTTP.
2. `VacancyApplyRegistry` + per-source adapter sub-modules (`vacancy-apply/hh/`,
   `vacancy-apply/it-vacancies/`) implementing one contract, `VacancyApplyProvider`. Each adapter has
   its **own** `HttpModule.registerAsync` (different base URLs), reuses the source's exported
   throttle, and never throws.

Orchestration stays in `vacancy-search/` in a new `VacancyLeadApplyService`, because that is where
the lead, the description registry and `VacancyLeadApplicationService` already live. Everything the
apply module needs arrives **as data**, so no reverse dependency exists.

Credentials live in a third, independent module **`backend/src/credentials/`** (TypeORM + Config
only), a pure storage leaf, so the adapters can depend on it without dragging in `vacancy-search/`.
The login orchestration must **not** live there — `credentials/ → vacancy-apply/hh/ → credentials/`
would be a cycle. It lives in `vacancy-apply/`, which already imports `CredentialsModule`.

Delivery is modelled on §4.5's `SyncOutcome` philosophy: **`POST :id/apply` answers 201 on every
delivery outcome**; 404 means only "no such lead", 409 only "already applied". The application row is
created first, delivery attempted second, outcome written back.

### 4.2 Why not the alternatives

- *Adapters inside `hh/` and `it-vacancies/`*: those modules each own exactly one `HttpModule` at a
  different base URL, and they would need `CredentialsModule` — pushing the credential concept into
  the scraping layer and inviting the cycle the module comments forbid.
- *A second apply endpoint* (`:id/apply-with-letter`): duplicates 90 % of `applyToLead` and gives the
  «Отклик» button two behaviours. Rejected in favour of extending the existing endpoint with an
  optional body and a wrapped response.
- *Storing the description on the lead* to avoid re-fetching: contradicts §3.5 and
  `vacancy-lead.entity.ts:45`.
- *Generating the letter on send* (one round trip): the requirement is explicit review before
  sending, so generation must be its own endpoint.

### 4.3 getmatch.ru — explicitly out of scope

getmatch is deliberately absent from `VACANCY_LEAD_SEARCH_SOURCES`
(`vacancies.interfaces.ts:206`: "getmatch.ru сознательно вне списка — у него есть только
синхронизация одной вакансии по ссылке"). No getmatch lead can exist, so the «Отклик» button can
never render for one. `VacancyApplyRegistry` gets no getmatch entry; a hypothetical getmatch lead
resolves to delivery outcome `NOT_CONFIGURED`. No getmatch code is written.

### 4.4 Trade-offs accepted

- hh.ru direct send is ToS-violating, brittle and untested; it would ship **off** and is not the
  recommended path. **This is what the owner ultimately rejected outright.**
- The it-vacancies adapter targets undocumented endpoints; gated on a manual capture, will break
  without notice. Failure mode is a snackbar plus an assisted fallback, never a lost application row.
- Secrets are encrypted with a key stored beside the database.
- Resume text as a settings textarea, not a file.
- `vacancy_search_settings` now also holds apply-related settings.
- `POST :id/apply` changes its response shape (a §5 contract change). No e2e covers it, so nothing
  breaks, but the frontend hook must land in the same phase.

---

## 5. Data model

### 5.1 `applications` — five new nullable columns

| Column | Type | Null | Purpose |
|---|---|---|---|
| `cover_letter` | `text` | yes | the letter as edited and delivered |
| `apply_delivery` | `varchar(16)` | yes | delivery outcome (§5.4 enum) |
| `apply_delivered_at` | `timestamptz` | yes | when delivery was attempted |
| `apply_resume_id` | `varchar(64)` | yes | source-side resume identifier used |
| `apply_error` | `text` | yes | human-readable failure text, mirror of `last_sync_error` |

Entity additions in `application.entity.ts` with explicit `name:` from new `APPLICATION_COLUMN` keys
(`COVER_LETTER`, `APPLY_DELIVERY`, `APPLY_DELIVERED_AT`, `APPLY_RESUME_ID`, `APPLY_ERROR`). All owned
by the apply path only — never written by `update()` from the inline editor, exactly as `lastSync*`
is not.

Migration `AddApplicationApplyColumns`: `up()` five `ADD COLUMN`, `down()` five `DROP COLUMN`. No
backfill, so nothing to undo beyond that.

### 5.2 `vacancy_search_settings` — two new columns

| Column | Type | Null | Seed |
|---|---|---|---|
| `resume_text` | `text` | **no** | `''` |
| `cover_letter_prompt` | `text` | **no** | `DEFAULT_COVER_LETTER_PROMPT` |

Migration `AddCoverLetterSettings`, following the step-42 three-move pattern:
`ADD COLUMN ... NULL` → parameterized `UPDATE` (never string-interpolated) →
`ALTER COLUMN ... SET NOT NULL`. `down()` drops both columns — the seed disappears with the column,
so the `GeneralizeVacancySource` failure mode (a `down()` that left its own backfill behind) cannot
recur. **Never `INSERT` the singleton row** — that is `CreateVacancySearchSettingsTable`'s job.

### 5.3 `site_credentials` — new table

| Column | Type | Null | Notes |
|---|---|---|---|
| `source` | `varchar(16)` | no | **primary key**, values from `VacancySource` |
| `kind` | `varchar(16)` | no | `SESSION` \| `TOKEN` (a `PASSWORD` kind was designed and then removed — the password is never stored) |
| `login` | `varchar(255)` | yes | the login typed at the last successful login; display only |
| `secret_ciphertext` | `bytea` | no | AES-256-GCM ciphertext; plaintext is the rendered `Cookie` header string (`SESSION`) or a JWT (`TOKEN`) |
| `secret_iv` | `bytea` | no | 12 bytes |
| `secret_tag` | `bytea` | no | 16 bytes |
| `default_resume_id` | `varchar(64)` | yes | last resume chosen |
| `session_status` | `varchar(16)` | yes | last probe verdict: `ALIVE` \| `EXPIRED` \| `UNKNOWN` |
| `session_checked_at` | `timestamptz` | yes | when the probe last ran |
| `updated_at` | `timestamptz` | no | `@UpdateDateColumn` |

Natural PK on `source`, not a generated uuid: at most one credential per source, and it removes an
upsert lookup. Migration `CreateSiteCredentialsTable`; `down()` drops the table.

**No table for in-flight logins.** Login attempts live in memory for `SITE_LOGIN_ATTEMPT_TTL_MS`
(default 600 000). Precedent: `VacancyScanStateService` keeps run state in process memory, and the
scheduler uses an in-process flag (§2.4). Persisting an attempt would mean writing a plaintext
password to Postgres for ten minutes. Trade-off accepted and documented: an `api` container restart
mid-captcha loses the attempt and the user starts the dialog again.

### 5.4 New enums (`as const` objects — not TS `enum`, per §10)

`vacancy-apply/vacancy-apply.constants.ts`:

```ts
export const APPLY_DELIVERY_MODE = { DIRECT: 'DIRECT', ASSISTED: 'ASSISTED', MANUAL: 'MANUAL' } as const;

export const APPLY_DELIVERY_OUTCOME = {
  SENT: 'SENT',
  ASSISTED: 'ASSISTED',
  SKIPPED: 'SKIPPED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  REJECTED: 'REJECTED',
  ERROR: 'ERROR',
} as const;
```

Types in `vacancy-apply.type.ts` (`ApplyDeliveryMode`, `ApplyDeliveryOutcome`). `varchar(16)` fits
every value. `vacancy-apply/site-login.constants.ts` adds `SITE_LOGIN_STATUS`,
`SITE_SESSION_STATUS`, `SITE_LOGIN_ATTEMPT_TTL_MS`, `SITE_LOGIN_MAX_ATTEMPTS` (cap the store at 8
concurrent attempts, oldest evicted — a bounded map, not an unbounded leak), Russian messages.

---

## 6. REST API (§5 style)

All new endpoints are covered by the global Basic Auth guard; **none** carries `@Public()`.

### 6.1 `POST /api/vacancy-leads/:id/cover-letter`

Declared in `vacancy-leads.controller.ts` inside the pre-`:id` block, immediately after `:id/apply`.
Route constant `VACANCY_LEAD_COVER_LETTER_ROUTE = ${VACANCY_LEAD_BY_ID_ROUTE}/cover-letter`.

- Request: no body.
- `200` `CoverLetterDto`, a discriminated union serialized flat:
  `{ ok: true, letter: string, model: string, deliveryMode: ApplyDeliveryMode, truncated: boolean }`
  or `{ ok: false, reason: string }`.
- `404` — no such lead.
- `@HttpCode(HttpStatus.OK)` explicit (POST defaults to 201 and nothing is created).
- Every failure (empty resume text, description fetch failed, model unavailable, timeout, unparsable
  answer) is `ok: false` with a Russian `reason` — one channel, mirroring §4.5 and
  `VacancyDescriptionResult`.
- Timeout: bounded by `COVER_LETTER_AI_TIMEOUT_MS` (180 s) + one description fetch (~32 s worst
  case). nginx `proxy_read_timeout` is 120 s → **raise it to 240 s for `/api`** or the browser sees a
  504 while the model is still writing.

### 6.2 `POST /api/vacancy-leads/:id/apply` (contract change)

- Request body, now optional: `ApplyLeadDto { coverLetter?: string; resumeId?: string; send?: boolean }`
  - `coverLetter`: `@IsOptional() @IsString() @MaxLength(COVER_LETTER_MAX_LENGTH = 8000)` + `@TrimText()`
  - `resumeId`: `@IsOptional() @IsString() @MaxLength(64)`
  - `send`: `@IsOptional() @IsBoolean()`, default `false`
  - `whitelist: true, forbidNonWhitelisted: true` already global (§5.6), so an empty body still
    validates.
- Response `201` `ApplyLeadResultDto`:
  `{ application: ApplicationDto, delivery: { mode: ApplyDeliveryMode, outcome: ApplyDeliveryOutcome, message: string | null, vacancyUrl: string } }`
- `404` no such lead; `409` `LEAD_ALREADY_APPLIED_MESSAGE`. **All delivery outcomes are 201.**
- `send: false` or missing `coverLetter` ⇒ `mode: MANUAL`, `outcome: SKIPPED` — the pre-existing
  bodiless behaviour, preserved.

### 6.3 `GET|PUT|DELETE /api/site-credentials`

New controller `credentials/site-credentials.controller.ts`, route `site-credentials`.
`:source/resumes` is declared **above** `:source` (the same Express hazard).

- `GET /api/site-credentials` → `200` `SiteCredentialDto[]` —
  `{ source, kind, login, hasSecret: true, defaultResumeId, sessionStatus, sessionCheckedAt, updatedAt }`.
  **Never the secret.**
- `GET /api/site-credentials/:source/resumes` → `200`
  `{ ok: true, resumes: [{ id, title, updatedAt }] } | { ok: false, reason }`; `404` unknown source.
  Per-request timeout `APPLY_REQUEST_TIMEOUT_MS`.
- `PUT /api/site-credentials/:source` → body `UpsertSiteCredentialDto { kind, login?, secret, defaultResumeId? }`;
  `200` `SiteCredentialDto`; `400` unknown `source` or `kind`; `409` `CREDENTIALS_KEY_MISSING_MESSAGE`
  when `CREDENTIALS_ENCRYPTION_KEY` is empty (refuse to store a secret in the clear). This endpoint
  is only the manual escape hatch; `PASSWORD` is not an accepted `kind`.
- `DELETE /api/site-credentials/:source` → `204`; `404` when absent.
- `:source` validated by a `ParseEnumPipe`-equivalent against `VACANCY_SOURCE`, not a free string.

### 6.4 `PUT /api/vacancy-search-settings` (extended)

Two new required body fields `resumeText` (may be `''`) and `coverLetterPrompt`; both echoed by
`GET`. Whole-resource PUT unchanged.

### 6.5 `/api/site-sessions` (the interactive-login API — designed, not to be built)

Controller `vacancy-apply/site-sessions.controller.ts`. Route order inside the controller, mandatory:
`:source/login`, `:source/challenge`, `:source/captcha/:attemptId`, `:source/probe`, then plain
`:source`.

| Endpoint | Request | Response |
|---|---|---|
| `POST /api/site-sessions/:source/login` | `StartSiteLoginDto { login: string; password: string }` — `@IsString() @IsNotEmpty() @MaxLength(255)` each; **no `@TrimText()` on the password** | `200` `SiteLoginStateDto` |
| `POST /api/site-sessions/:source/challenge` | `SubmitSiteLoginChallengeDto { attemptId: string (@IsUUID); captchaText?: string (@MaxLength(64)); code?: string (@MaxLength(32)) }` | `200` `SiteLoginStateDto`; `404` attempt expired/unknown |
| `GET /api/site-sessions/:source/captcha/:attemptId` | — | `200` image bytes, upstream `Content-Type`, `Cache-Control: no-store`; `404` attempt gone or no captcha pending |
| `GET /api/site-sessions/:source` | — | `200` `SiteSessionDto { source, status, checkedAt, login, hasSession }` — cached verdict, no network |
| `POST /api/site-sessions/:source/probe` | — | `200` `SiteSessionDto` — forces a live probe, subject to `HH_SESSION_PROBE_MIN_INTERVAL_MS`; `@HttpCode(200)` |
| `DELETE /api/site-sessions/:source` | — | `204`; deletes the stored row and drops any in-flight attempt. No logout call to hh.ru (it would need another XSRF round-trip for no benefit) |

`SiteLoginStateDto` is a discriminated response, one channel for every outcome (the §4.5 principle):

```
{ status: 'AUTHENTICATED', login }
{ status: 'CAPTCHA_REQUIRED', attemptId, captchaPath }
{ status: 'CODE_REQUIRED',    attemptId, hint }
{ status: 'INVALID_CREDENTIALS' | 'BLOCKED' | 'NOT_SUPPORTED' | 'NOT_CONFIGURED' | 'ERROR', message }
```

`200` for all of them. `400` only for a malformed body, `404` only for an unknown `:source` or a dead
`attemptId`. `NOT_CONFIGURED` covers an empty `CREDENTIALS_ENCRYPTION_KEY`; `NOT_SUPPORTED` covers a
source with no login provider. `captchaPath` is our own relative path, never an hh.ru URL.

---

## 7. Component map

### Backend — new files

| Path | Responsibility | Public interface |
|---|---|---|
| `vacancy-apply/vacancy-apply.module.ts` | wires registry + cover letter + login layer + the two adapter sub-modules; exports `CoverLetterService`, `VacancyApplyRegistry` | — |
| `vacancy-apply/vacancy-apply.constants.ts` | `APPLY_DELIVERY_MODE`, `APPLY_DELIVERY_OUTCOME`, env keys, Russian messages | — |
| `vacancy-apply/vacancy-apply.type.ts` | `ApplyDeliveryMode`, `ApplyDeliveryOutcome`, `VacancyApplyResult`, `SourceResumeListResult` | — |
| `vacancy-apply/vacancy-apply.interfaces.ts` | the source contract + request shapes | `VacancyApplyProvider`, `VacancyApplyRequest`, `SourceResume` |
| `vacancy-apply/vacancy-apply.registry.ts` | dispatch by `VacancySource`; mirrors `VacancyProviderRegistry` | `find(source)`, `resolveMode(source)` |
| `vacancy-apply/cover-letter.service.ts` | render prompt → `VacancyAiService.writeCoverLetter` → clamp to `COVER_LETTER_MAX_CHARS`; never throws | `generate(request): Promise<CoverLetterResult>` |
| `vacancy-apply/cover-letter.constants.ts` | placeholders `{resume}/{description}/{company}/{position}`, `COVER_LETTER_JSON_SCHEMA`, messages | — |
| `vacancy-apply/cover-letter.interfaces.ts` | `CoverLetterRequest` | — |
| `vacancy-apply/cover-letter.type.ts` | `CoverLetterResult = { ok: true; letter: string; model: string; truncated: boolean } \| { ok: false; reason: string }` | — |
| `vacancy-apply/site-sessions.controller.ts` | §6.5 | — |
| `vacancy-apply/site-login.service.ts` | dispatch by source, drive the attempt store, persist the cookie set on success, expose the probe | `start`, `submitChallenge`, `readCaptcha`, `status`, `probe`, `logout` |
| `vacancy-apply/site-login-attempt.store.ts` | bounded in-memory `Map<attemptId, SiteLoginAttempt>`; lazy TTL sweep on every access; oldest-evicted at `SITE_LOGIN_MAX_ATTEMPTS`; `delete` overwrites the password field before dropping the entry | `put`, `get`, `drop`, `sweep` |
| `vacancy-apply/site-login.registry.ts` | dispatch `SiteLoginProvider` by `VacancySource` | `find(source)` |
| `vacancy-apply/site-login.interfaces.ts` | `SiteLoginProvider`, `SiteLoginAttempt`, `SiteLoginChallenge`, `SiteSessionProbeRequest` | — |
| `vacancy-apply/site-login.type.ts` | `SiteLoginStatus`, `SiteSessionStatus`, `SiteLoginResult`, `SiteCaptchaResult`, `SiteSessionProbeResult` | — |
| `vacancy-apply/site-login.constants.ts` | statuses, TTL, attempt cap, Russian messages | — |
| `vacancy-apply/dto/start-site-login.dto.ts`, `submit-site-login-challenge.dto.ts`, `site-login-state.dto.ts`, `site-session.dto.ts` | §6.5 DTOs; `SiteLoginStateDto.fromResult` never carries a cookie, a password or an upstream URL | — |
| `vacancy-apply/hh/hh-apply.module.ts` | own `HttpModule.registerAsync` (hh.ru web root, `maxRedirects: 0`, `maxContentLength` for the captcha, no default `Accept`), imports `HhModule` (throttle) + `CredentialsModule`; provides `HhApplyService` and `HhLoginService` | — |
| `vacancy-apply/hh/hh-apply.service.ts` | `implements VacancyApplyProvider`; with `HH_APPLY_ENABLED` false returns `{ mode: ASSISTED, outcome: ASSISTED }` with no network call; otherwise cookie-session `POST /applicant/vacancy_response/popup` + `listResumes()` | `apply()`, `listResumes()` |
| `vacancy-apply/hh/hh-login.service.ts` | `implements SiteLoginProvider`: GET login page → collect cookies + `_xsrf` → multipart POST `/account/login` → classify → captcha fetch → retry with `captchaText` → return the merged cookie header. Never throws. | `start`, `submitChallenge`, `fetchCaptcha`, `probeSession` |
| `vacancy-apply/hh/hh-login.parsers.ts` | pure `classifyHhLoginResponse(status, headers, body)`, `extractCaptchaKey(body)`, `extractCaptchaImagePath(body)` — all from `unknown` | — |
| `vacancy-apply/hh/hh-cookie.helpers.ts` | pure `parseSetCookieHeader`, `mergeCookies`, `renderCookieHeader`, `readXsrf(cookieHeader)` | — |
| `vacancy-apply/hh/hh-login.constants.ts` | `/account/login` path, the six multipart field names, `accountType=APPLICANT`, `remember=true`, `loginTrustFlags=null`, `X-XSRFToken` header name, the `НЕ ПРОВЕРЕНО` classification marker table, `HH_RESUMES_PROBE_PATH = '/shards/applicant/resumes'` | — |
| `vacancy-apply/hh/hh-apply.constants.ts` | private paths, form field names, cookie/XSRF header names, Russian messages | — |
| `vacancy-apply/hh/hh-apply.parsers.ts` | narrow the popup/resume JSON from `unknown` (no `any`) | — |
| `vacancy-apply/hh/hh-apply-http-options.factory.ts` | axios options: `validateStatus: () => true`, `maxRedirects: 0`, timeout | `buildHhApplyHttpOptions` |
| `vacancy-apply/it-vacancies/it-vacancies-apply.module.ts` | own `HttpModule.registerAsync` (`IT_VACANCIES_API_BASE_URL`), imports `ItVacanciesModule` + `CredentialsModule` | — |
| `vacancy-apply/it-vacancies/it-vacancies-apply.service.ts` | login → JWT (in-memory, per-process, re-login on 401) → apply POST; never throws | `apply()` |
| `vacancy-apply/it-vacancies/it-vacancies-apply.constants.ts` / `.parsers.ts` / `-http-options.factory.ts` | as above | — |
| `credentials/credentials.module.ts` | `TypeOrmModule.forFeature([SiteCredential])`, controller, service; exports `SiteCredentialsService`. **Pure storage leaf — no login logic** | — |
| `credentials/site-credential.entity.ts` | table `site_credentials`, explicit `name:` per column | — |
| `credentials/site-credentials.service.ts` | encrypt/decrypt, upsert, read, delete, `setDefaultResumeId`, `markSessionStatus` | `findAll()`, `readSecret(source)`, `upsert(dto)`, `remove(source)` |
| `credentials/credentials.crypto.ts` | pure AES-256-GCM seal/open over `node:crypto`; throws only on a malformed key | `sealSecret`, `openSecret` |
| `credentials/credentials.constants.ts` / `.interfaces.ts` / `.type.ts` | table/column names, algorithm, IV length, env key, messages | — |
| `credentials/site-credentials.controller.ts` | §6.3 | — |
| `credentials/dto/site-credential.dto.ts` | `static fromEntity` — **secret fields never mapped** | — |
| `credentials/dto/upsert-site-credential.dto.ts` | validation | — |
| `credentials/dto/source-resumes.dto.ts` | discriminated response | — |
| `vacancy-search/vacancy-lead-apply.service.ts` | **the orchestrator**: lead → description → letter; and lead → create application → deliver → write back outcome | `generateCoverLetter(leadId)`, `applyToLead(leadId, dto)` |
| `vacancy-search/dto/apply-lead.dto.ts` | request body §6.2 | — |
| `vacancy-search/dto/apply-lead-result.dto.ts` | response §6.2, `static fromParts` | — |
| `vacancy-search/dto/cover-letter.dto.ts` | response §6.1, `static fromResult` | — |
| `database/migrations/*AddCoverLetterSettings.ts` | §5.2 | — |
| `database/migrations/*AddApplicationApplyColumns.ts` | §5.1 | — |
| `database/migrations/*CreateSiteCredentialsTable.ts` | §5.3 | — |

### Backend — changed files

| Path | Change |
|---|---|
| `vacancy-ai/vacancy-ai.interfaces.ts` | `AiChatRequest.temperature: number`; new `AiCoverLetterRequest` |
| `vacancy-ai/vacancy-ai.type.ts` | `AiCoverLetterResult` |
| `vacancy-ai/vacancy-ai.constants.ts` | letter placeholders + `COVER_LETTER_JSON_SCHEMA` + failure messages |
| `vacancy-ai/vacancy-ai.service.ts` | `writeCoverLetter()`; pass `temperature` at the two existing call sites |
| `vacancy-ai/vacancy-ai.parsers.ts` | `parseCoverLetter(content)` |
| `vacancy-ai/ollama-ai.provider.ts`, `openai-ai.provider.ts` | forward `request.temperature` instead of the module constant |
| `vacancy-search/vacancy-search.constants.ts` | `VACANCY_LEAD_COVER_LETTER_ROUTE`, `DEFAULT_COVER_LETTER_PROMPT`, `RESUME_TEXT_MAX_LENGTH`, new column keys, new messages |
| `vacancy-search/vacancy-search-settings.entity.ts` | `resumeText`, `coverLetterPrompt` |
| `vacancy-search/vacancy-search-settings.service.ts` | assign both in `update()`; add both to `getSnapshot()` |
| `vacancy-search/vacancy-search.interfaces.ts` | snapshot gains the two fields |
| `vacancy-search/dto/update-vacancy-search-settings.dto.ts` | two fields + placeholder `@Matches` |
| `vacancy-search/dto/vacancy-search-settings.dto.ts` | echo both |
| `vacancy-search/vacancy-leads.controller.ts` | new `:id/cover-letter`; `apply()` takes `@Body()` and returns `ApplyLeadResultDto`; keep the route-order comment updated |
| `vacancy-search/vacancy-search.module.ts` | import `VacancyApplyModule`; add `VacancyLeadApplyService`; extend the dependency-direction comment |
| `applications/application.entity.ts` | five columns |
| `applications/applications.constants.ts` | five `APPLICATION_COLUMN` keys, `COVER_LETTER_MAX_LENGTH`, `APPLY_RESUME_ID_LENGTH` |
| `applications/applications.interfaces.ts` | `ApplicationApplyFields` (owned by the apply path, like `ApplicationSyncFields`) |
| `applications/dto/application.dto.ts` | expose `coverLetter`, `applyDelivery`, `applyDeliveredAt`, `applyResumeId`, `applyError` |
| `app.module.ts` | import `CredentialsModule` |
| `config/config.constants.ts` | defaults for all new env vars |
| `config/environment.validation.ts` | new fields; `CREDENTIALS_ENCRYPTION_KEY` with a base64/32-byte custom check that allows `''`; `SITE_LOGIN_ATTEMPT_TTL_MS`, `HH_SESSION_PROBE_MIN_INTERVAL_MS`, `HH_CAPTCHA_MAX_BYTES` |
| `.env.example`, `docker-compose.yml`, `nginx.conf` | new vars, passthrough, `proxy_read_timeout` 240 s |
| `SPECIFICATION.md`, `CHANGELOG.md`, `README.md` | §12 amendment, §3/§4/§5/§7/§8 additions, history entry, Russian user doc |

### Frontend — new files

| Path | Responsibility |
|---|---|
| `components/ApplyVacancyDialog/ApplyVacancyDialog.tsx` | two-phase dialog: generate → editable letter → send/assist |
| `components/ApplyVacancyDialog/apply-vacancy-dialog.constants.ts` | labels, hints, min/max rows |
| `components/ApplyVacancyDialog/apply-vacancy-dialog.interfaces.ts` | `ApplyVacancyDialogProps`, `ApplyLetterFormProps` |
| `components/SiteSessionDialog/SiteSessionDialog.tsx` (+ `.constants.ts`, `.interfaces.ts`) | three-state local machine `form` → `challenge` → `connected`; captcha `<img>`; secret field `type="password"`, never prefilled |
| `hooks/useGenerateCoverLetter.ts` | `useMutation` → `POST :id/cover-letter`; per-request timeout 240 s |
| `hooks/useSiteSession.ts`, `useProbeSiteSession.ts`, `useStartSiteLogin.ts`, `useSubmitLoginChallenge.ts`, `useLogoutSite.ts` | session queries/mutations |
| `hooks/useSourceResumes.ts` | `useQuery`, `enabled: deliveryMode === 'DIRECT'`, `staleTime: 0` |
| `api/site-sessions.api.ts`, `api/site-credentials.api.ts` | the session calls and the escape-hatch credential calls |
| `constants/apply.constants.ts` | delivery-mode/outcome literals, severity map, `COVER_LETTER_MAX_LENGTH`, `RESUME_TEXT_MAX_LENGTH` (hand-duplicated, §3.4) |
| `types/apply.interfaces.ts`, `types/site-credentials.interfaces.ts` | response shapes |

### Frontend — changed files

| Path | Change |
|---|---|
| `components/VacanciesScreen/VacanciesScreen.tsx` | `applyLeadId` state; conditionally mount `ApplyVacancyDialog`; `onApply` now only opens the dialog; hide-on-apply moves to the dialog's success callback; `useCallback` for every new handler |
| `components/VacancyLeadSummaryRow/VacancyLeadSummaryRow.tsx` | `handleApply` calls only `onApply(lead.id)`; keeps the `memo`, the boolean `isApplying` slice and the `stopPropagation` span |
| `components/SearchSettingsDialog/SearchSettingsDialog.tsx` | resume + prompt fields, reset button, two more `touched` flags, extended `isSubmitDisabled` |
| `components/SearchSettingsDialog/search-settings-dialog.constants.ts` | add both names to `SEARCH_SETTINGS_SERVER_VALIDATED_FIELDS` |
| `hooks/useApplyVacancyLead.ts` | `mutate` takes `{ id, coverLetter, resumeId, send }`; `onSuccess` reads `delivery` and reports the outcome via `onDelivered` (callbacks stay on the hook, not on `mutate`); keeps the in-hook `applyingIds` set |
| `api/vacancy-search.api.ts` | `generateCoverLetter(id)`; `applyVacancyLead(id, body)` returning `ApplyLeadResult` |
| `constants/api.constants.ts` | `VACANCY_LEAD_COVER_LETTER_PATH_SEGMENT`, `SITE_CREDENTIALS_ENDPOINT`, `SITE_SESSIONS_ENDPOINT`, `COVER_LETTER_REQUEST_TIMEOUT_MS = 240_000`, `APPLY_REQUEST_TIMEOUT_MS = 60_000` |
| `constants/query.constants.ts` | `SITE_CREDENTIALS_QUERY_KEY`, `SITE_SESSION_QUERY_KEY`, `SOURCE_RESUMES_QUERY_KEY` |
| `constants/layout.constants.ts` | `MULTILINE_MIN/MAX_ROWS_COVER_LETTER`, `MULTILINE_MIN/MAX_ROWS_RESUME`, `APPLY_DIALOG_MAX_WIDTH` |
| `constants/vacancy-search.constants.ts` | `DEFAULT_COVER_LETTER_PROMPT`, labels, hints, placeholder patterns, `RESET_COVER_LETTER_PROMPT_LABEL` |
| `types/vacancy-search.interfaces.ts` | settings + update gain `resumeText`, `coverLetterPrompt` |
| `types/application.interfaces.ts` | five new fields |
| `utils/vacancy-search-settings.utils.ts` | form-value build/payload build cover both fields |
| `components/ApplicationFields/*` | read-only display of the sent letter + delivery outcome (no inline editing of `coverLetter`) |

---

## 8. Data flow

### 8.0 Interactive login (designed, not to be built)

```
Session dialog opens
  → GET /api/site-sessions/HH                     [cached verdict, no network]
  → if status !== 'ALIVE' show the login form

"Войти" → POST /api/site-sessions/HH/login { login, password }
  SiteLoginService.start
    1. registry.find('HH') → HhLoginService                    (null → NOT_SUPPORTED)
    2. CREDENTIALS_ENCRYPTION_KEY empty → NOT_CONFIGURED       [no network]
    3. throttle.acquire(); GET {HH_SITE_BASE_URL}/account/login
         → parseSetCookieHeader → cookies, _xsrf
    4. throttle.acquire(); POST /account/login  multipart:
         username, password, accountType=APPLICANT, failUrl,
         remember=true, loginTrustFlags=null, captchaText=''
         headers: Cookie, X-XSRFToken;  maxRedirects: 0
    5. classifyHhLoginResponse(status, headers, body)
         AUTHENTICATED       → mergeCookies → renderCookieHeader
                               → SiteCredentialsService.upsert(SESSION) [encrypted]
                               → drop the attempt (password overwritten)
         CAPTCHA_REQUIRED    → store attempt { cookies, captchaKey, captchaPath,
                                               login, password } → attemptId
         CODE_REQUIRED       → store attempt { cookies, login, password }
         INVALID_CREDENTIALS / BLOCKED / ERROR → no attempt stored
  → 200 SiteLoginStateDto

challenge branch
  → <img src="/api/site-sessions/HH/captcha/{attemptId}">
       GET streams the image through our backend using the attempt's cookies
  → POST /api/site-sessions/HH/challenge { attemptId, captchaText }
       replays step 4 with the SAME cookie jar + captchaKey + the retained password
       → same classification; a new captcha replaces the old one in the same attempt
  → on AUTHENTICATED: persist, drop the attempt, dialog shows "сессия активна"

"Проверить сессию" → POST /api/site-sessions/HH/probe
  → throttled GET /shards/applicant/resumes with the stored cookie header
  → ALIVE | EXPIRED | UNKNOWN → written to session_status / session_checked_at
```

### 8.1 Generate the letter

```
click «Отклик»
  → VacanciesScreen: setApplyLeadId(id)                     [local state]
  → <ApplyVacancyDialog leadId> mounts
  → useGenerateCoverLetter.mutate(id)                       [no cache write]
  → POST /api/vacancy-leads/:id/cover-letter
      VacancyLeadApplyService.generateCoverLetter(leadId)
        1. VacancyLeadsService.findOneOrFail(leadId)                        → 404
        2. VacancySearchSettingsService.getSnapshot()                       → resumeText, coverLetterPrompt
        3. resumeText === '' → { ok:false, reason: RESUME_TEXT_EMPTY }      [no network, no model]
        4. VacancyLeadSearchRegistry.find(lead.source).fetchVacancyDescription(lead.externalId)
             — network, throttled; { ok:false } → { ok:false, reason }
        5. CoverLetterService.generate({ resumeText, prompt, position, company, description })
             renderPrompt → VacancyAiService.writeCoverLetter → AiProvider.chat
             (model COVER_LETTER_AI_MODEL||VACANCY_AI_MODEL, temperature 0.7,
              timeout COVER_LETTER_AI_TIMEOUT_MS, jsonSchema { letter })
             parseCoverLetter → clamp to COVER_LETTER_MAX_CHARS (truncated flag)
        6. deliveryMode = VacancyApplyRegistry.resolveMode(lead.source)
      → 200 { ok, letter, model, deliveryMode, truncated }
  → dialog mounts <ApplyLetterForm> with the letter as initial useState
```

Side effects: one outbound description request (throttled), one model call. No DB write. No cache
write.

### 8.2 Review and send

```
user edits the letter                                        [local useState in the form]
"Регенерировать" → mutate again, form remounted via key={generation}
"Отправить отклик" (DIRECT) / "Скопировать и открыть вакансию" (ASSISTED)
  ── ASSISTED, inside the click handler, BEFORE any await:
       navigator.clipboard.writeText(letter)
       window.open(vacancyUrl, '_blank', 'noopener')
     (both need the user gesture; doing them after the POST resolves gets the
      popup blocked and the clipboard write rejected in Safari)
  → useApplyVacancyLead.mutate({ id, coverLetter, resumeId, send: mode === 'DIRECT' })
  → POST /api/vacancy-leads/:id/apply
      VacancyLeadApplyService.applyToLead(leadId, dto)
        1. lead = findOneOrFail                                            → 404
        2. VacancyLeadApplicationService.applyToLead(leadId)               → 409 if applied
             (unchanged: create + logo download + findOneOrFail)
        3. provider = VacancyApplyRegistry.find(lead.source)
           send === false || provider === null → { MANUAL|ASSISTED, SKIPPED|ASSISTED }
        4. provider.apply({ externalId, coverLetter, resumeId, vacancyUrl })
             throttle.acquire() → credentials read+decrypt → HTTP → outcome
             never throws; 401 → AUTH_FAILED, 429 → RATE_LIMITED, 4xx → REJECTED
             AUTH_FAILED → SiteCredentialsService.markSessionStatus(source, 'EXPIRED')
        5. write back on the created row: cover_letter, apply_delivery,
           apply_delivered_at, apply_resume_id, apply_error
           (snapshot-and-rollback like VacancySyncService: a failed save() must not
            return state that is not in the DB)
        6. on outcome SENT with resumeId → SiteCredentialsService.setDefaultResumeId
      → 201 { application, delivery }
  → onSuccess: patchVacancyLeadInCaches(client, id, { hasApplication: true })
               invalidate APPLICATIONS_QUERY_KEY (prefix)
               hide the lead (the current behaviour, moved here)
               close the dialog; report delivery via onDelivered
```

Three outcome channels stay separate, per the existing convention: an unsuccessful
`delivery.outcome` on HTTP 201 → snackbar with severity by outcome; a failed request → error
snackbar; nothing goes into `SyncSummaryAlert` (that belongs to bulk runs).

After an `AUTH_FAILED` the error snackbar's action button opens `SiteSessionDialog`; the apply dialog
stays open with the letter intact and its primary button has already switched to the assisted label
because the delivery response carried `mode`. The application row is already created, so re-opening
the apply dialog for the same lead would hit the 409 path — after an `AUTH_FAILED` the dialog offers
only «Скопировать письмо и открыть вакансию» plus «Войти заново», never a second send.

**No automatic re-login anywhere.** The scheduler is never wired to `SiteLoginService`; a dead
session degrades to assisted and waits for the human.

State inventory: three pieces of local React state (`applyLeadId` in the screen, `letter` +
`resumeId` in the form), zero context, zero global store, zero new React Query cache writes beyond
the existing lead patch and applications invalidation.

---

## 9. Build sequence (as it stood when the feature was shelved)

Each phase is **one commit**. Within a phase the two lanes touch disjoint files and the contract is
fixed above, so **run the two developer agents in parallel**; the two reviewers then also run in
parallel.

**Phase 1 — `[docs]` spec amendment. SEQUENTIAL, blocking, needs the owner's approval.**
Rewrite §12 (remove the four bans, replace with narrower ones: no headless browser, no captcha
solving, no unattended/scheduled auto-apply, no résumé *files*), §4.1, §4.11.1; add §4.13 (apply
flow), §3.8 (`site_credentials`), §5.8 (new endpoints), §7.10 (apply dialog), §8 rows. No code, no
reviewer.

**Phase 2 — `[both]` resume text + cover-letter prompt settings. PARALLEL.**
- `[backend]` migration `AddCoverLetterSettings`, entity, both DTOs, `update()`, `getSnapshot()`,
  constants, default prompt.
- `[frontend]` two fields + reset button in `SearchSettingsDialog`, form utils, types, constants,
  server-validated field list.
- Done when: `PUT` round-trips both fields; reset restores the default; empty resume text saves
  cleanly.

**Phase 3 — `[both]` letter generation. PARALLEL.**
- `[backend]` `AiChatRequest.temperature` + both providers + `writeCoverLetter` + `parseCoverLetter`;
  `vacancy-apply/` skeleton (`CoverLetterService`, constants, registry with **assisted-only** stubs
  for HH and IT_VACANCIES); `VacancyLeadApplyService.generateCoverLetter`; `POST :id/cover-letter`;
  env vars + defaults + `.env.example` + compose + nginx timeout.
- `[frontend]` `ApplyVacancyDialog` (generate → editable letter → «Регенерировать»),
  `useGenerateCoverLetter`, screen wiring, `VacancyLeadSummaryRow` no longer hides on click. The send
  button still calls the **old** bodiless `applyVacancyLead`.
- Done when: the dialog shows a generated letter, an empty resume shows the Russian hint, an
  unreachable model shows a failure snackbar and the dialog stays open.

**Phase 4 — `[both]` apply contract v2. PARALLEL, but both halves must be in the same commit** (the
response shape changes).
- `[backend]` five `applications` columns + migration, `ApplyLeadDto`, `ApplyLeadResultDto`,
  controller change, `VacancyLeadApplyService.applyToLead` with snapshot-rollback write-back,
  MANUAL/ASSISTED outcomes, `ApplicationDto` fields, `ApplicationFields` read-only data.
- `[frontend]` `useApplyVacancyLead` new signature + `onDelivered`, clipboard/`window.open` in the
  click handler, outcome→severity map, hide-on-success, `ApplicationFields` display.
- Done when: assisted apply copies the letter, opens the vacancy tab, creates the application with
  `apply_delivery = 'ASSISTED'` and the letter stored.

**⇢ Phases 1–4 are the risk-free subset. Everything below is what the owner rejected or deferred.**

**Phase 5 — `[both]` credential storage + interactive login. PARALLEL.**
- `[backend]` `credentials/` leaf (entity with the revised columns, crypto, service,
  `PUT`/`GET`/`DELETE`, migration `CreateSiteCredentialsTable`), plus the `vacancy-apply/` login
  layer: registry, attempt store, `SiteLoginService`, `site-sessions.controller.ts`, `HhLoginService`
  + parsers + cookie helpers, the probe, three new env vars.
- `[frontend]` `SiteSessionDialog` with the three-state machine, the captcha `<img>`, the five hooks,
  `site-sessions.api.ts`, an entry point next to the settings button.
- Done when: a correct login stores an encrypted session; a captcha challenge renders, accepts input
  and completes the login; a wrong password shows a Russian message; the probe reports `ALIVE`;
  logout clears the row; with an empty encryption key everything answers `NOT_CONFIGURED`; nothing in
  the logs contains a cookie, a password or a captcha answer.

**Phase 6 — `[both]` hh.ru direct apply + resume selection. SEQUENTIAL** (needs Phase 5's session and
Phase 4's contract). `HhApplyService` real implementation behind
`APPLY_DIRECT_ENABLED && HH_APPLY_ENABLED`, `listResumes()` on `/shards/applicant/resumes`,
`X-XSRFToken` on the apply POST, `AUTH_FAILED` → `markSessionStatus('EXPIRED')`, registry
`resolveMode('HH') = DIRECT` when both switches are on; frontend resume `Select` +
`useSourceResumes`. Ships with `HH_APPLY_ENABLED=false`.

**Phase 7 — `[backend]` it-vacancies direct adapter. SEQUENTIAL.** Gated on the request capture
(§12 Q4); `ItVacanciesLoginService` reuses the same `SiteLoginProvider` contract with no challenge
statuses.

**Phase 8 — `[both]` docs and gates.** CHANGELOG entry, README (Russian), root
`npm run lint:fix / typecheck / test / build`, `test:e2e` against a live Postgres.

hh.ru was placed ahead of it-vacancies because hh.ru is the dominant lead source and the only one
with a captured real request; it-vacancies still needs its spike.

---

## 10. Lane ownership

- `backend-developer`: everything under `backend/`, plus the shared root files `.env.example`,
  `docker-compose.yml`, `nginx.conf`, `SPECIFICATION.md`, `CHANGELOG.md`. **These shared files belong
  to the backend lane in every phase** — the frontend lane must not touch them.
- `frontend-developer`: everything under `frontend/`, plus `README.md`.
- Reviewers: `backend-code-reviewer` and `frontend-code-reviewer`, always in parallel, each seeing
  only its own layer.
- Each parallel agent runs **workspace-scoped** gates only
  (`npm run lint:fix --workspace=<ws>`, `typecheck --workspace=<ws>`). Root-level gates run once per
  phase after both lanes report.

---

## 11. Critical considerations

**Security.**
- Secrets are never logged, never returned, never in an error message or an exception `message`.
  `SiteCredentialsService.readSecret` is the only decryption site; the logger in every apply adapter
  logs only source, outcome and status code — the existing `it-vacancies-api.service.ts:164` pattern
  ("тело не логируем — только длину") is the model. The cover letter is user content, not a secret,
  but it is long: never log it either.
- **Password**: accepted in one request body, held only in `SiteLoginAttempt` for at most
  `SITE_LOGIN_ATTEMPT_TTL_MS`, overwritten and dropped when the attempt ends (success, failure, TTL,
  or eviction). Never persisted, never in a query string, never in a log line, never echoed by any
  DTO. `HttpExceptionFilter` must not be handed a message built from a request body — verify no new
  `BadRequestException` interpolates the DTO.
- **Cookies**: the merged cookie header is a secret of the same class as a password. Never logged
  (not even its length), never returned, never in an exception message. Login-flow log lines carry
  only `source`, the resulting `SiteLoginStatus`, and the upstream HTTP status.
- **Captcha answer** is not logged either — it is trivially correlated with an account.
- **Captcha proxy**: `maxRedirects: 0`, `maxContentLength: HH_CAPTCHA_MAX_BYTES` (default 262 144),
  `responseType: 'arraybuffer'`, upstream `Content-Type` echoed only if it matches an image
  allow-list (reuse the `logos/` content-type check), `Cache-Control: no-store`. The endpoint takes
  an `attemptId` and derives the upstream URL from the stored attempt — **it never accepts a URL from
  the client**, so there is no SSRF surface. The upstream captcha path is additionally re-checked
  against `HH_ALLOWED_HOST_PATTERN` before the fetch.
- **`attemptId`** is a v4 UUID validated by `@IsUUID`; the store is capped, so a client cannot grow
  it without bound; the sweep runs lazily on access, not on a timer (no new interval, per §2.4).
- **Outbound host allow-listing**: each new axios client is created by its own
  `*-http-options.factory.ts` with `maxRedirects: 0`. **Zero redirects, not a `beforeRedirect`
  guard** — an authenticated POST carrying a session cookie must never follow a 3xx anywhere, and a
  3xx from an apply endpoint means the session is dead (→ `AUTH_FAILED`). Stricter than `logos/`,
  deliberately. Base URLs come from env; target paths are built from `encodeURIComponent(externalId)`
  only, so no user-supplied URL is ever fetched.
- **Basic Auth** covers every new route, including the captcha image endpoint. No `@Public()`
  anywhere in this feature; `GET /api/health` remains the only public route.
- `:source` path params are validated against `VACANCY_SOURCE`, never used as free text.
- **Rate limiting**: both the login GET and POST go through `HhRequestThrottle`, on every attempt
  including captcha retries (the `it-vacancies-api.service.ts:97` rule). A brute-force loop through
  our own API is throttled by the same budget the scan uses.
- The clipboard write happens client-side only; nothing is persisted in browser storage.

**Performance and render behaviour.**
- The generate request can run ~2–3 minutes; `proxy_read_timeout` for `/api` must go to at least
  240 s or nginx will 504 mid-generation. The Vite dev proxy needs no change.
- `ApplyVacancyDialog` is mounted only while `applyLeadId !== null`, so its `TextareaAutosize` never
  participates in list layout. The letter lives in the dialog's own `useState`, never in the lead list
  — a draft in the screen would re-render every `memo`'d row on every keystroke, the exact failure
  documented for `ApplicationFields`.
- `VacancyLeadSummaryRow` keeps `memo`, its stable handler object and the `boolean` `isApplying`
  slice. Do not pass the letter, the dialog state or any inline object literal into it.
- No polling is added; `useSourceResumes` is `enabled` only inside an open dialog in DIRECT mode. The
  session probe never runs on a timer or at app start.

**Error handling.**
- No new provider throws outward: every adapter maps every failure to an `ApplyDeliveryOutcome`,
  mirroring `SyncOutcome`; `HhLoginService` maps every failure to a `SiteLoginStatus`;
  `CoverLetterService` returns `{ ok: false, reason }`. An unrecognized login page classifies as
  `ERROR`, never as `AUTHENTICATED`.
- The application row is created **before** delivery is attempted and is never rolled back because
  delivery failed. The write-back of the delivery columns uses the snapshot-and-restore pattern of
  `VacancySyncService` so a failed `save()` cannot return state that is not in the DB.
- 409 "already applied" keeps its current meaning and its optimistic `hasApplication: true` patch.

**Testing.**
- Project rule: **no new spec or e2e files.** No test file is created in any phase.
- Nothing existing breaks: `backend/test/` contains no `vacancy-leads` e2e spec, so the
  `POST :id/apply` response-shape change is uncovered; `frontend/src/` contains no test files at all.
- Every new env variable has a default in `config.constants.ts`, and `CREDENTIALS_ENCRYPTION_KEY`
  accepts `''`, so `applyTestEnvironment` needs **no change** and `AppModule` still boots in e2e.
- Optional, cheap hardening if the rule is ever relaxed: `backend/test/vacancy-stub.server.ts` would
  need an Ollama-compatible `POST /api/chat` returning
  `{"message":{"content":"{\"letter\":\"…\"}"}}`, a stub it-vacancies login + apply pair, and a stub
  resume list — plus `VACANCY_AI_BASE_URL` / `IT_VACANCIES_API_BASE_URL` pointing at it in
  `test-environment.ts`.
- **Behaviour that will have no automated test whatsoever:** letter generation and prompt rendering,
  delivery dispatch and every delivery outcome, credential encryption/decryption round-trip, resume
  listing, the assisted clipboard/new-tab path, both direct adapters, the login flow, the
  classification table, the cookie helpers, the captcha proxy and the probe. `classifyHhLoginResponse`
  and the cookie helpers are pure and would be the highest-value unit tests in the whole feature.
  This is the single largest risk in the plan and a direct consequence of the no-new-tests rule. A
  manual acceptance checklist per phase is the only safety net.

**Observability.**
- One `Logger` per new service, Russian messages. `log` level: generation start/finish with model
  name and letter length; delivery attempt with source and outcome. `warn`: `AUTH_FAILED`,
  `RATE_LIMITED`, `REJECTED`, `ERROR` with the status code. Never the letter, never the secret, never
  the resume text, never the cookie.
- User-visible surface: the existing single `NotificationSnackbar` in the shell, the new
  `apply_delivery` / `apply_error` fields on the application card, and «сессия активна» / «сессия
  истекла» / «состояние неизвестно» in the session dialog from the cached verdict.

**§12 re-check after the amendment.** With §12 rewritten as in Phase 1, nothing in this blueprint
would be out of scope. Items that stay banned regardless: headless browser, captcha solving, anti-bot
evasion, résumé **file** upload/storage, reading one's own application statuses back from a source,
auto-filling `result`, pagination, and **unattended/scheduled auto-apply** — the scheduler is never
wired to this flow, every application requires the dialog and a human click.

---

## 12. Open questions as they stood at shelving

| # | Question | Recommendation at the time | Status |
|---|---|---|---|
| 1 | Amend §12? | Yes, narrowed: keep the bans on headless browsers, captcha bypass, résumé files, unattended auto-apply | **Not decided — feature shelved** |
| 2 | hh.ru: assisted only, or also the cookie/interactive-login path? | Build Phases 5–6, ship with `HH_APPLY_ENABLED=false`, let the owner flip the switch | **Decided: NO. Account-block risk rejected.** |
| 3 | Credentials in Postgres encrypted, or env-only? | Postgres + `CREDENTIALS_ENCRYPTION_KEY` | Moot unless a direct path returns |
| 4 | it-vacancies.ru request capture (DevTools → login + apply → export both as cURL) | Do it before Phase 7 | Not done |
| 5 | Settings: extend `vacancy_search_settings` or a new `apply_settings` table? | Extend | Still the recommendation |
| 6 | Letter length cap | `COVER_LETTER_MAX_CHARS` 4000 for generation, `COVER_LETTER_MAX_LENGTH` 8000 for the accepted body | Still the recommendation |
| 7 | Model for letters | Try `qwen3:4b-instruct` first; if the Russian prose is poor set `COVER_LETTER_AI_MODEL=qwen3:8b` or point `VACANCY_AI_PROVIDER=openai` at a hosted model — the config supports it with no code change | Still the recommendation |
| 8 | Does «Отклик» keep hiding the lead? | Yes, but only on a successful send/assist, moved from the button into the dialog's success path | Still the recommendation |
| 9 | hh.ru login capture (GET login response headers; POST response headers on success, on a wrong password, and when a captcha appears + the HTML fragment with the captcha key and image URL) | Capture success first, then trigger the captcha by mistyping the password twice | **Moot — path rejected** |
| 10 | Written acceptance of the hh.ru ToS/account-block risk | Accept for a personal single-user tool and record it in the §12 amendment | **Decided: NOT accepted** |
| 11 | Probe endpoint | Keep `GET /shards/applicant/resumes` (doubles as the resume list); if captcha-guarded, fall back to `UNKNOWN` | Moot |
| 12 | Store the password for convenience? | No. Session-only, re-login through the dialog | Moot |

---

## 13. Sources

[hhru/api](https://github.com/hhru/api) ·
[negotiations.md](https://github.com/hhru/api/blob/master/docs/negotiations.md) ·
[api.hh.ru OpenAPI](https://api.hh.ru/openapi/redoc) ·
[Habr: HH.ru закрыл публичный API](https://habr.com/ru/news/1069286/) ·
[Habr: блокировка публичного API hh.ru](https://habr.com/ru/articles/976476/) ·
[Сетка: HeadHunter с 15 декабря закрывает API для соискателей](https://setka.ru/posts/019b1fa3-f9f1-7632-931b-15152090c400) ·
[hh.ru API support quote, 08.05.2026](https://apify.com/mcpbay/hh-mcp) ·
[HH_API_MAP.md (private web endpoints)](https://github.com/Vlad9572324/hh.ru-clicker/blob/main/HH_API_MAP.md) ·
[hh.ru knowledge base 6541 (captcha)](https://feedback.hh.ru/knowledge-base/article/6541) ·
[hh.ru knowledge base 2223 (login methods)](https://feedback.hh.ru/knowledge-base/article/2223) ·
[it-vacancies.ru](https://it-vacancies.ru/) ·
[it-vacancies.ru/about](https://it-vacancies.ru/about/)
