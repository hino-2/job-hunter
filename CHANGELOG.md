# Changelog

Development history of job-hunter, formerly kept as SPECIFICATION.md §14. Step numbering is
unchanged — comments across the repo cite these numbers (e.g. "шаг №26 §14"). The normative
specification lives in [spec/](./spec/) (index: [spec/README.md](./spec/README.md)); this file is
history only. Newest first.

---

**54. Lead list ceiling raised to 3000.** _(backend)_
`VACANCY_LEADS_LIST_LIMIT` default went from 500 to 3000: the §5.7 response is a safety valve, not
pagination, and 500 was cutting off found leads on a large scan. Changed in one place —
`DEFAULT_VACANCY_LEADS_LIST_LIMIT` — plus `.env.example`, the `docker-compose.yml` passthrough
default and the §5.7 / §8 documentation. An explicit `VACANCY_LEADS_LIST_LIMIT` in an existing `.env`
still wins.

**53. README revised and translated to English.** _(documentation)_
README.md had drifted behind the code: it never mentioned the third vacancy source it-vacancies.ru
(step 42) — not in the feature list, not in the architecture diagram, not among the `*_USER_AGENT`
env groups and not in troubleshooting; the «Вакансии» screen was described as hh.ru-only, with no
resume/stop controls (step 31), no «Отклик» button (step 35) and one results-page link instead of
one per source; the status/result selects in the collapsed header (steps 40, 41) were missing; the
logo section still claimed hh.ru logos never load (fixed once the page **state** started being
parsed, §4.10) and that a logo appears only after the first sync (step 30 downloads it on create).
Added: `IT_VACANCIES_*` with its own `IT_VACANCIES_MAX_REQUESTS_PER_SECOND`, the `ollama` GPU
`deploy:` section that must be deleted on a machine with no NVIDIA driver in Docker,
`OLLAMA_PORT_HOST` and the dev-mode `VACANCY_AI_BASE_URL=http://127.0.0.1:11434`, the
`VACANCY_AI_TIMEOUT_MS` / `aiFallbacks` symptom, and a link to this file.

The whole file is now English, like the rest of the documentation — quoted Russian UI labels
(«Обновить все открытые») and quoted error strings stay verbatim, since they name what is on screen
and in the log. The CLAUDE.md rule "README.md stays Russian" is replaced by "all documentation is
English". No code, schema, API or behaviour change.

---

**52. AI calls run concurrently instead of one at a time.** _(backend)_
Step 50 gave `ollama` three parallel slots (`OLLAMA_NUM_PARALLEL=3`) but nothing in the pipeline ever used
more than one: title batches and description stage-3–4 calls were both plain sequential loops, so two of
the three slots sat idle on every run. Both stages now go through the existing `mapWithConcurrency`
(`common/async.helpers.ts`) instead of a second pool — a single `ConcurrencyOptions` built once in the
constructor from the new `VACANCY_AI_CONCURRENCY` (default `3`, range 1…10, must equal `OLLAMA_NUM_PARALLEL`,
§4.12.4) serves both, since the two stages never run at the same time within one page. `minStartDelayMs` is
`0` — the per-source `VacancyRequestThrottle` already spaces the hh.ru requests and Ollama has no rate
limit of its own, so a second spacing mechanism here would be a hidden, undocumented throttle. Results
pages themselves are unaffected — still fetched strictly sequentially, concurrency 1 (§4.11.2).

Title batching (`decideTitleMatches`) now builds all chunks up front and runs them through the pool; the
per-chunk body moved unchanged into a new `decideTitleChunk`, wrapped in `try/catch` so a rejected worker
cannot leave `mapWithConcurrency`'s orphaned survivors mutating `handle` after the caller has already moved
on — the same isolation principle as `syncOneSafely` (§4.6). `mapWithConcurrency` preserves result order by
item index, so the flattened decision list stays byte-identical to the old sequential output; the flatten
is an explicit nested `for…of`, not `.flat()`, so the ordering guarantee is visible at the call site.

`processPage`'s per-candidate loop is split into a synchronous planning pass (`planPageWork`, new
`VacancyScanPagePlan` in `vacancy-search.interfaces.ts`) and a concurrent detail pool. `planPageWork` walks
matched candidates with **no `await` anywhere in it**, in exactly the old order (stop check first, then
keyword leads bypass AI, then deadline, then the `MAX_DETAILS` budget) — reserving a detail budget slot
synchronously before any AI/HTTP call is the same "reserve before the first `await`" trick
`VacancyRequestThrottle`/`mapWithConcurrency` already use for time slots, taken one step further for a
counter: it is what makes a `MAX_DETAILS` overshoot impossible by construction, not just unlikely. Keyword
leads (no AI, no HTTP) still insert sequentially (`insertKeywordLeads`) — a pool buys nothing there. Detail
candidates run through the pool via a new `processDetailSafely`, checking stop and deadline at the start of
each worker's own candidate (so stop latency stays roughly one in-flight fetch plus one AI call, not the
whole pool) and never letting an exception escape — the catch increments `descriptionsFailed`, not `failed`
(`insertLead` already owns that one), since anything escaping `processDetail` means the vacancy never made
it through stages 3–4 at all (fail-closed, §4.11.7/§4.11.8). When a page ends with more than one termination
condition true across its workers, the reported `stoppedReason` follows a fixed precedence table,
`STOPPED > DEADLINE > MAX_DETAILS` (`SCAN_PAGE_STOP_PRECEDENCE`, new `resolvePageStop` in
`vacancy-scan-stop.helpers.ts`) — the same order the old single-candidate loop tested them in, so a run that
would have hit two conditions still reports the reason it always did; all three still save the resume
position exactly as before (§4.11.12), only the reported reason can change. One new `log` line per page
(candidate count, elapsed ms) is the only added observability — the cheap way to confirm afterwards that the
pool did not silently degrade back to serial.

New env `VACANCY_AI_CONCURRENCY` (`config.constants.ts`, `environment.validation.ts`, `.env.example`,
`docker-compose.yml`, §4.11.2/§4.11.4/§4.11.8/§4.11.12/§4.12.4/§8) — its own bound
(`VACANCY_AI_CONCURRENCY_MAX = 10`), deliberately not a reuse of `SYNC_CONCURRENCY_MAX`: the two limits
bound unrelated resources (hh.ru request slots vs. Ollama model slots), and sharing a constant would couple
them by accident. No API/DTO/data-model change.

---

**51. Bounded, faster AI calls.** _(backend)_
An incident traced to a prompt/schema mismatch made the model generate until context exhaustion —
120 s on every call, with nothing in the code bounding output length (§4.12.3). Every
`AiChatRequest` now carries a required `maxOutputTokens`, translated by each adapter into the field
its protocol accepts: `num_predict` for Ollama, `max_tokens` for OpenAI-compatible providers. Stage 4
(description) uses a flat `VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS` (280); stage 1 (titles) scales
with batch size via `resolveTitleMaxOutputTokens` (`vacancy-ai.helpers.ts`, 16 overhead + 72 per item).
The two JSON Schemas also gained `maxLength` on `reason` — 100 for stage 1
(`VACANCY_AI_TITLE_REASON_MAX_LENGTH`, one field shared by up to 30 verdicts under one generation cap,
so bounded tighter) and 200 for stage 4 (`VACANCY_AI_REASON_MAX_LENGTH`) — and, for stage 4, `maxLength`
on `evidence` (300) — a grammar-enforced bound shortens generation itself, which clamping an
already-received string cannot do; `vacancy-lead.builder.ts` still clamps to the column width (500) as
the last line of defence, and a `maxLength`-truncated `evidence` stays a prefix of the intended quote,
so `isEvidenceGrounded` keeps working unchanged. Every `maxOutputTokens` ceiling is set comfortably
above the point where its own schema saturates — it costs nothing to be generous, since unspent tokens
are never generated, and its only job is to stop a runaway generation, not to save tokens on the normal
case. OpenAI's `strict: true` structured outputs reject `maxLength` in the schema with a `400`, so the
new `openai-schema.helpers.ts` (`stripUnsupportedSchemaKeywords`) strips such keywords in the OpenAI
adapter only — the shared schema stays single-sourced. A generation truncated by the new cap yields
unparsable JSON, which is deliberately routed through the existing invalid-JSON fallback path
(`{ ok: false }`, keyword fallback, `aiFallbacks`, `warn`) rather than a new one — a rise in
`aiFallbacks` after this change is the signal that a cap is still too low relative to its schema.

`VACANCY_AI_TIMEOUT_MS` default drops from 120 000 to 30 000: with output now bounded, a call can no
longer run away by generating, so the timeout only needs to catch a hung or queued connection. The
default is measured on a GPU (RTX 5070); §4.12.4 also supports CPU-only Ollama, where a cold model load
plus a full stage-1 batch can exceed 30 s, so a CPU-only operator should raise it — a growing
`aiFallbacks` counter with no other errors is the symptom, documented next to the variable in
`.env.example` and in spec §4.12.3/§8.
`VACANCY_AI_BATCH_SIZE` default rises from 10 to 20 (measured comfortably inside `n_ctx = 4096`,
§4.12.4), with a new `VACANCY_AI_BATCH_SIZE_MAX = 30` ceiling — above it llama.cpp silently
truncates/shifts an over-long context instead of erroring, which would otherwise show up only as a
verdict-count mismatch. The `ollama` service itself is untouched: `num_ctx` stays at the default 4096.

A second review round measured the real numbers on a live Ollama (`qwen3:4b-instruct`) instead of
estimating them: the real `title_prompt` (from `vacancy_search_settings`) plus a realistic titles block
costs ≈ 415 fixed tokens + ≈ 20 tokens per title — far below an earlier unmeasured guess of ~67 tokens
per title — while a saturated stage-1 verdict (`reason` at the 100-char cap) costs ≈ 45–52 tokens
against a `PER_ITEM` ceiling of 72 (≈ 38% margin) and a saturated stage-4 verdict (`reason` 200 chars +
`evidence` 300 chars) costs ≈ 163–182 tokens against the now-lower `VACANCY_AI_DESCRIPTION_MAX_OUTPUT_TOKENS
= 280` (≈ 54% margin, down from 384) — both margins now of the same order, where before stage 1's
computed margin had shrunk to almost nothing. `VACANCY_AI_TITLE_OUTPUT_TOKENS_OVERHEAD` drops from 48 to
16 (measured wrapper cost ≈ 6 tokens). At the new `VACANCY_AI_BATCH_SIZE_MAX = 30`, prompt + output
ceiling together use ≈ 78% of `n_ctx = 4096` (≥ 15% headroom, confirmed by an end-to-end run: 1024 prompt
tokens + 1493 output tokens, well under the ceiling); the previous `= 50` would have put the output
ceiling alone at 88% of `n_ctx` before counting the prompt at all.

---

**50. Three Ollama slots instead of one.** _(infrastructure)_
`OLLAMA_NUM_PARALLEL=3` on the `ollama` service (§4.12.4, §9.1). The default of `1` makes the
container serve one request at a time, which caps the §4.11.4 selection pipeline no matter what the
backend does. No code change: `vacancy-scan.service.ts` still awaits every `chat()` in turn, so the
running application behaves exactly as before — what changes today is the container's own reservation,
a KV cache for three slots (measured 448 MiB each) rather than one. Per-slot `n_ctx` is unchanged at
`4096`: the slots do not divide a single context between them (`n_slots = 3, n_ctx_slot = 4096` in the
server log). Preparation for running title batches and description verdicts through
`mapWithConcurrency`. Lower it to `1` on a CPU-only or low-VRAM machine, like the `deploy` section.

---

**49. Green «Отклик» button.** _(frontend)_
`color="success"` on the §7.9.1 apply button did nothing on its own: the step 46
`MuiButton.styleOverrides.contained` rule hardcodes `ACCENT_COLOR` for every contained button
regardless of its `color` prop, so the button stayed turquoise. The obvious fix — a sibling
`containedSuccess` slot — does not exist in this MUI version: Button's `overridesResolver` resolves
only `root`, `styles[variant]`, `size*`, `colorInherit`, `disableElevation`, `fullWidth` and
`loading`, and the unknown key failed both typecheck and lint. Instead the `contained` slot gained a
nested `&.${buttonClasses.colorSuccess}` selector painting `palette.success.main` / `.contrastText`
with a `.dark` hover; two classes outrank the bare `contained` declarations. It is declared
**before** the existing `&.Mui-disabled` block on purpose — both compile to two-class selectors of
equal specificity, so source order alone keeps a disabled «Отклик» muted instead of green.
`palette.success.main` is `#078d0b`. `color="success"` is used at exactly one call site, so no other
button is affected. Purely visual.

---

**48. Gray off-state for the «Скрытые» toggle.** _(frontend)_
The standalone `ToggleButton` of §7.9.1 sat outside any `ToggleButtonGroup`, so it was the one
control still taking MUI's stock unselected colors (`action.active` text, `divider` border) instead
of the `palette.primary` gray its outlined neighbours use. A `MuiToggleButton.styleOverrides.root`
rule scoped to `&:not(.Mui-selected)` paints text with `primary.main` and the border with
`alpha(primary.main, OUTLINED_BORDER_OPACITY)`, repeating the outlined Button's own formula —
full opacity would read denser than its neighbour's. Its nested `&:hover` tints with `primary.main`
too, because MUI's stock toggle hover uses `text.primary`, which is orange in this theme. The
selected state is untouched. Color and border inside the `ToggleButtonGroup` still come from the
group's own, more specific rule, but the hover does reach the status-filter buttons — the group
declares none — which is the better end state anyway: their text and border are gray too, so the
stock orange tint was the odd one out. Purely visual.

---

**47. Row action buttons back to the default small size.** _(frontend)_
«Отклик», «Скрыть»/«Восстановить» (§7.9.1) and «Отклонено компанией» (§7.2) lost their explicit
`size="medium"`: with the accent turquoise of step 46 on every `contained` button, three oversized
ones dominated the row. They now inherit `size: 'small'` from `MuiButton.defaultProps`, matching
«Добавить». Purely visual — flex layout, disabled logic and click handlers are untouched.

---

**46. Accent color for every contained button.** _(frontend)_
All `variant="contained"` buttons — «Добавить», «Начать поиск», «Отклик», the dialog submits, the
lead hide/restore toggle — now render in the turquoise of the active tab (`ACCENT_COLOR`), via
`MuiButton.styleOverrides.contained` in `theme.ts` rather than a per-button `sx`: one place, and no
call site can drift. `palette.primary` is deliberately left alone — it holds field borders, icons
and outlined buttons, so repainting it would turn the whole interface turquoise. Two new constants
carry the hover shade and the dark text color (`palette.text.primary` is orange and unreadable on
the accent); the `&.Mui-disabled` branch pins the disabled state to `palette.action`, mirroring
MUI's own default so a bright button can never survive being disabled. Purely visual — no
behaviour, no contracts touched.

---

**45. Uniform button color in the leads filter bar.** _(frontend)_
"Остановить" lost its `color="warning"`, so all of "Продолжить", "Остановить" and "Настройки
поиска" now render as `variant="outlined"` in the default primary color. Purely visual — the
buttons' enable/disable logic and the §4.11.12 stop/resume semantics are untouched.

---

**44. Description-stage stop-words and evidence grounding for AI screening.** _(backend + frontend)_
A Java/Spring vacancy titled "Middle backend Developer" survived §4.11 screening with a hallucinated
`ai_description_reason` ("Node.js (в названии вакансии), TypeScript…") — neither word appears anywhere in
the title or description. Three fixes: (1) a new pipeline stage 3.5 (§4.11.4) runs the same
`exclude_keywords` check as stage 0, now over the fetched description, right before the description AI
call — cheap and it makes the keyword-fallback branch of stage 4 safe against a stop-word that only
appears in the description. It reuses the `skippedExcluded` counter rather than adding a new one — §4.11.11
already defines that counter as "cut off by exclude keywords", exactly what this is, and `rejectedDescription`
means the model rejected it while `aiFallbacks` means the model was unusable, neither of which fits. (2)
The description AI response gained a required `evidence` field (§4.12.3): `VacancyAiService.judgeDescription`
verifies, only when `matches === true`, that `evidence` is a normalized substring of the exact (clamped)
description text sent to the model (`isEvidenceGrounded`, `vacancy-ai.helpers.ts`) — case-insensitive,
whitespace-collapsed, quote/dash/ellipsis/`ё` folded, minimum 3 normalized characters. An ungrounded quote
is the same failure class as invalid JSON (`aiFallbacks`, `warn`), never a silent `rejectedDescription`.
`evidence` is never persisted. (3) The default `description_prompt` is now block-delimited
(`<keywords>`/`<title>`/`<company>`/`<description>`) with an explicit instruction that the `<keywords>`
block is the candidate's profile, not vacancy text — migration `BlockDelimitVacancyDescriptionPrompt`
rewrites it in the DB, guarded by the previous-text `WHERE` the same way `SharpenVacancyTitlePrompt` is, so
a hand-edited prompt is left alone; `down()` is guarded the same way for the `RepairGetmatchVacancySource`
reason (an unguarded revert could glue an unrelated edit to the wrong text). The prompt text now exists as
two verbatim copies by necessity (migration + `frontend/src/constants/vacancy-search.constants.ts`
`DEFAULT_DESCRIPTION_PROMPT`, no shared package, §3.4). No schema/DTO/API change.

**43. Specification split into `spec/`, one file per section.** _(documentation)_
`SPECIFICATION.md` (158 KB, 2015 lines) was a single file, so every lookup either grepped it or
pulled far more text than the question needed — and §4 alone was 36% of it. It is now `spec/`, 71
files named by section number (`spec/4.3-rules-for-applying-a-sync-result.md`), plus
`spec/README.md` — an index mapping every `§` to its file with a one-line summary. §4.11 and §4.12
are split down to `####` level, so the largest section file is 11 KB instead of 56 KB. The split
is textually lossless: the body of every section is byte-identical to the original, the only edit
being `./CHANGELOG.md` → `../CHANGELOG.md` in §14. Five section headings whose bodies were empty
(§1, §3, §7, §9, §4.12 — pure containers for their subsections) have no file; their subsections are
listed directly in the index. **All `§` numbering is unchanged** — 1206 comments across `backend/` and
`frontend/` cite it. `SPECIFICATION.md` stays at the root as a pointer to `spec/README.md` so
existing links keep resolving. `CLAUDE.md` now instructs reading only the one file a `§` names.

**42. Vacancy source it-vacancies.ru: lead search and sync.** _(backend + frontend)_
A third `VacancySource` (`'IT_VACANCIES'`, §4.8) and a **second** lead-search source (§4.11). The
source-specific code lives in `backend/src/it-vacancies/` with its own `HttpModule` (its `baseURL`
differs) and its own throttle instance, provided once and shared by the sync service and the search
service: two instances inside one source would double its real request rate, one instance across
sources would let a scan on one site starve sync on the other. Data comes from
`application/ld+json` `JobPosting` — `window.__NUXT__` is minified JavaScript and is never evaluated
(§2.4). Two contracts, not one: `ItVacanciesApiService implements VacancySourceProvider` (sync, results
as `SyncOutcome`) and `ItVacanciesSearchService implements VacancyLeadSearchProvider` (search, results
discriminated by `ok`); getmatch.ru stays sync-only — it has no crawlable results page — so
`'GETMATCH'` as a scan source is a `400` from the DTO, not a `500` from the new
`VacancyLeadSearchRegistry`.

The results page carries **neither the vacancy id nor a link** inside its `JobPosting`s, so external
ids come from the card hrefs and are zipped with the postings **by index**; a count mismatch is
fail-loud (`ERROR`, run stops) and logs the page number plus both counts — response bodies are never
logged, only their length. `lastPage` is always `null` (no pagination metadata), source pages are
1-based against the run's 0-based loop, and the results `datePosted` is naive, normalized with a
`+03:00` offset. Descriptions come from the SSR `div.content` block delimited by a depth-aware
`<div>` pass, with the source-truncated JSON-LD `description` as fallback.

Migrations: `AddItVacanciesSearchUrlTemplate` (NOT NULL `it_vacancies_search_url_template`, seeded
add-nullable → parameterized backfill → `SET NOT NULL`) and `AddVacancyScanPositionSource`, which
turns `vacancy_scan_position` from an `id = 1` singleton into one row per lead-search source with
`source` as the primary key — a run on one site must not destroy the other's «Продолжить». Its
`down()` deletes its own seed before restoring the singleton PK (the `GeneralizeVacancySource`
lesson), so a `revert → up` cycle is idempotent: verified by hand, exactly the `HH` and
`IT_VACANCIES` rows survive.

REST contract (§5.7): `POST /api/vacancy-leads/scan` accepts `source`, defaulting to `HH`;
`GET /scan/status` replaces `resume` with `resumeBySource` and adds `source` (the running or last
run's site, `null` before the first run of the process); the settings resource gains a required
`itVacanciesSearchUrlTemplate` with its own validator (its own host allow-list and its own `400`
message). New env variables — `IT_VACANCIES_SITE_BASE_URL`, `IT_VACANCIES_USER_AGENT`,
`IT_VACANCIES_REQUEST_TIMEOUT_MS`, `IT_VACANCIES_MAX_RETRIES`,
`IT_VACANCIES_MAX_REQUESTS_PER_SECOND` — all optional with defaults (§8). The frontend adds a source
picker as the first control of the leads filter bar and a second results-link field in the settings
dialog. No new spec files (project rule); parser verification against the captured live pages is
manual.

**41. The «Статус» Select moved into the collapsed header as well.** _(frontend)_
The mirror of step 40 for the second `Select`: the status `Chip` in `ApplicationSummaryRow` became a
`FieldCell` + `Select`, and `ApplicationFields` lost its status cell. Both header `Select`s share one
`handleSelectClick` stopping click propagation. `STATUS_LABEL_ID_SUFFIX` moved to
`application-summary-row.constants.ts` and the flex basis to `SUMMARY_FLEX.status`;
`ApplicationFields/application-fields.constants.ts` is deleted — it held nothing else. The expanded rows
are now text fields, links and dates only, so `ApplicationFields` no longer imports `FormControl`,
`InputLabel`, `MenuItem` or `Select`. Both the header row and the create dialog's field `Stack` got 8px
of vertical breathing room (`CONTROL_BLOCK_MARGIN_Y`) so a field outline and the §7.3 saved ring are not
clipped by the container edge.

**40. The «Результат» Select moved from the expanded fields into the collapsed header.** _(frontend)_
`ApplicationSummaryRow` now renders the result `Select` inside a `FieldCell` where the read-only result
`Chip` used to be, and `ApplicationFields` no longer holds that cell — the result is editable without
expanding a record. The row therefore takes `isResultSaved` and `handlers` on top of `application` — a
plain boolean derived by `ApplicationAccordion` from its per-id `savedFields`, not the `Set` itself, so
`memo` on the header does not re-render on every autosave of a field it does not show.
`RESULT_LABEL_ID_SUFFIX` moved to `application-summary-row.constants.ts` and the flex basis from
`FIELD_FLEX.result` to `SUMMARY_FLEX.result`. The `FormControl` root stops click propagation: a click on
the Select — or on an item of its menu, which portals to `body` but still bubbles through the React
tree — must not toggle the accordion. `APPLICATION_RESULT_CHIP_COLORS` is now unused by the header.

**39. Turquoise accent on the header title and the active tab.** _(frontend)_
`ACCENT_COLOR = '#86E4E1'` (`constants/theme.constants.ts`) colours the «Job Hunter» title and the
selected `Tab` together with its indicator, via `MuiTabs.indicator` / `MuiTab.root['&.Mui-selected']`
overrides plus an `sx` on the title `Typography`. Deliberately a constant of its own rather than
`palette.primary.main`: that token also drives field outlines, icon buttons and the toggle group, so
repainting it would turn the whole interface turquoise. The dead `// main: '#86E4E1'` line in
`palette.primary` is gone now that the value has a name.

**38. A terminal result closes the application.** _(backend + frontend)_
`REJECTED_BY_COMPANY`, `DECLINED_BY_ME` and `VACANCY_WITHDRAWN` are terminal results (§3.3):
writing one — by `POST`, by `PATCH`, from the «Результат» `Select` or from the step-37 button — sets
`status = CLOSED` in the same write, so an application with a rejection can no longer sit in the
«Открытые» filter, in the «Открытых: N / M» counter or in the §4.6 bulk run. `NO_RESPONSE` stays
non-terminal. The rule has one owner, `isTerminalApplicationResult`
(`applications/application-result.helpers.ts`), applied in `buildCreatePayload` and — deliberately
**below** the `status` block — in `buildUpdatePatch`: a body carrying both `result: DECLINED_BY_ME` and
`status: OPEN` must end up closed, not open. Re-opening later with `status: OPEN` alone is still
allowed; the invariant is enforced on the write of `result`, not as a stored constraint, so no
migration and no backfill — rows written earlier keep their `status` until their `result` is written
again. The frontend duplicates the rule in `withTerminalResultStatus`, used by
`InlineEditHandlers.commit` (the only path a `result` reaches the API through) **before** the no-op
check: the optimistic cache would otherwise show «Открыта» until the next refetch, the
invalidation-on-`status` in `useUpdateApplication` would not fire, and a legacy row with a terminal
result but `status: OPEN` would never get repaired by a repeat save.

**37. «Отказ компании» button replaces 🗑 in the applications summary row.** _(frontend)_
The eighth cell of `AccordionSummary` (§7.2.1) is now a `Button variant="contained" size="medium"`
without an icon — the same shape as «Скрыть» on the leads screen — and one click writes
`result = REJECTED_BY_COMPANY` through `InlineEditHandlers.commit`, i.e. the very path the
«Результат» `Select` uses: optimistic cache patch, saved-highlight, per-field rollback plus error
snackbar on failure (§7.3). `status` is deliberately left alone — the accordion already mutes a
record whose result is `REJECTED_BY_COMPANY`. No wrapper `span` with `stopPropagation` is needed
here because the button is never disabled; a repeated click sends nothing at all, `commit` drops it
via `isNoopPatch`. Deletion disappears from the UI entirely: the 🗑 `IconButton`,
`ConfirmDeleteDialog`, `useDeleteApplication`, `deleteApplication` and the two `DELETE_*` messages
are gone, and `ApplicationsScreen` no longer keeps a `deleteTargetId`. `DELETE /api/applications/:id`
stays in the API (§5.1) with no client caller — the backend is untouched by this step.

**36. The search query lives in the results link.** _(backend + frontend)_
`search_text` is dropped from `vacancy_search_settings` and re-based to `search_url_template`
on `vacancy_scan_position` (migration `RemoveVacancySearchText`, which folds the old search text
into the stored URL — the first `{text}` occurrence is replaced by the URL-encoded value — so an
upgraded install queries hh.ru exactly as before and keeps a still-valid resume point). `{text}`
is no longer a placeholder anywhere: `buildHhSearchUrl` substitutes `{page}` only, and a leftover
`{text}`-looking substring passes through to hh.ru verbatim rather than being touched.
`PUT /api/vacancy-search-settings` no longer accepts `searchText` (`400` via the global
`forbidNonWhitelisted`) and validates `{page}` only. Resume (§4.11.12) is now invalidated by a
change of the results link (`isResumablePosition` compares `search_url_template`) rather than of
a separate search string. The «Настройки поиска» dialog loses the «Текст поиска» field and the
first-page URL preview; focus moves to «Ссылка на выдачу hh.ru», whose hint now mentions only
`{page}`. The application also opens on the «Вакансии» tab now (`DEFAULT_APP_TAB`) — that screen
is where a session starts in practice.

**35. Applying to a lead creates an application.** _(backend + frontend)_
`POST /api/vacancy-leads/:id/apply` (§5.7) reuses `ApplicationsService.create()` verbatim — same
§4.2 `vacancy_source`/`vacancy_external_id` resolution, same §4.4/§4.10 post-insert logo download —
so a lead-born record is indistinguishable from a manually created one. No migration: whether a lead
already has an application is derived from the pair (`vacancy_source`, `vacancy_external_id`)
against `applications`, never stored on `vacancy_leads` (§3.5). `ApplicationsService` gained
`findOneByVacancyRef` (409 check in `VacancyLeadApplicationService.applyToLead`) and
`findAppliedVacancyRefs` — a single unparameterized `SELECT` over `applications`, cheaper than a
tuple-`IN` keyed by up to `VACANCY_LEADS_LIST_LIMIT` (500) leads, since the table itself only holds
hundreds of rows (§1.2). `VacancyLeadDto.hasApplication` is filled from a `Set` of serialized refs
computed once per `GET /api/vacancy-leads` request. Route declared above `PATCH :id`, same order
rule as `scan`/`scan/stop`/`scan/status`/`:id/logo`. `ApplicationsModule` now exports
`ApplicationsService`; the dependency stays one-way, `VacancySearchModule → ApplicationsModule`.
On the screen (§7.9.1) every lead's collapsed summary row ends with an "Отклик" button, right of
"Скрыть", cycling through `Отклик` → `Создаём…` → `Отклик создан` and disabled once
`hasApplication` is true. `useApplyVacancyLead` keeps the set of in-flight ids itself and hands the
list a boolean slice, so applying to two leads in a row does not re-render their neighbours; success
patches `hasApplication` in place and invalidates only the applications caches — refetching 500
leads to change one flag would repaint the screen. The three outcome channels stay separate: `409`
is a normal outcome (info snackbar plus the same patch), a failed request is an error snackbar, and
a `404` purges the lead from the caches. The request raises its timeout to the same 45 s
`POST /api/applications` uses, since the logo is downloaded synchronously.

**34. Search-results link template is a setting, not env.** _(backend + frontend)_
New column `search_url_template varchar(2048)` in `vacancy_search_settings` (§3.6, migration
`AddVacancySearchUrlTemplate`, seeded with the §4.11.1 default). `PUT /api/vacancy-search-settings`
validates it (both `{text}`/`{page}` placeholders, length, and an `https://` + hh.ru host allow-list
check to keep the endpoint from becoming an arbitrary-URL fetcher); `GET` no longer serves an env
value. `HH_SEARCH_URL_TEMPLATE` is removed from env, `.env.example`, `docker-compose.yml` and startup
validation — anyone who had customized it must paste that value into the settings dialog once after
upgrading. `HhSearchService.fetchSearchPage` now takes the template as data inside the run's settings
snapshot (`HhSearchPageRequest`), so `hh/` still does not import `vacancy-search/`; a hand-corrupted
row is caught fail-loud at the start of a run with a `500`, not a 40-page loop over page 0. The
«Настройки поиска» dialog turns the read-only preview into an editable multiline field with a
«Вернуть ссылку по умолчанию» button, previewing the resulting page `0` URL live.

**33. Hide/restore on a vacancy lead is a labelled button.** _(frontend)_
`VacancyLeadSummaryRow` swaps the eye `IconButton` for a MUI `Button` — `variant="contained"`,
`size="medium"`, no explicit `color` (theme `primary.main`, grey), like every other action button in the
app — showing "Скрыть"/"Вернуть". The `Tooltip` goes away with it — the label is now visible
without hovering. The
`stopPropagation` handler is unchanged: a click must not bubble to `AccordionSummary`, which opens the
vacancy (§7.9.1).

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
