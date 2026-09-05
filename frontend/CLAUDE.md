# frontend/CLAUDE.md

Frontend-specific guidance (React + MUI + Vite). Root [`CLAUDE.md`](../CLAUDE.md) has the
project-wide pipeline, commands, architecture and conventions.

Providers live in `main.tsx` (ThemeProvider + LocalizationProvider ru with picker `localeText`

- QueryClientProvider). The only HTTP client is `api/client.ts`; the frontend stores no auth
  header — the browser supplies Basic Auth itself.

* **`App.tsx` is a shell with `Tabs`; `ApplicationsScreen` owns the applications screen's local
  state**: filters, accordion expansion, unsaved drafts and the notification. Server data lives
  only in React Query; there is no global store and no React context (§2.2). Context would be
  actively harmful here: it punches through `memo` on the accordion, so every keystroke would
  re-render the whole list. Callbacks are therefore collected into one stable object
  (`InlineEditHandlers`), and changing data reaches the accordion as **per-id slices**
  (`pendingById[id]`, `savedById[id]`).
* **Expansion state reaches the list as data, not as a callback** (`hooks/useExpandedIds.ts`):
  the hook returns `expandedIds: ReadonlySet<string>` plus a separate `actions` object whose
  identity never changes. A predicate closed over state changed the controller's identity on
  every toggle and with it `onToggle` on **every** accordion — one click re-rendered the whole
  list. Mutators must therefore keep empty deps; "is everything expanded" is computed by the
  pure `utils/expanded-ids.utils.ts`. The accordion receives the `boolean` slice
  `expandedIds.has(id)`.
* **`ApplicationFields` and `ApplicationSummaryRow` are under `memo`, details mount lazily**
  (`mountOnEnter: true` with `unmountOnExit` off, §7.2). The reason is not micro-optimization:
  `TextareaAutosize` declares a layout effect `syncHeight` with no dependency array and
  measures itself after every render, forcing a synchronous layout of the whole document, and a
  collapsed `Collapse` hides content with `visibility: hidden` rather than `display: none` — so
  collapsed records are measured too. A prop literal (an object or lambda inline in JSX) in
  these two components silently brings the lag back: `memo` works precisely because
  `mergeApplicationWithPending` returns **the same reference** when the draft is empty, and
  `savedFields`/`handlers` are stable.
* **`hooks/useInlineEdits.ts` — drafts and the saved highlight for the whole list** (§7.3).
  Rule: **a draft lives from the keystroke until the request is sent.** On send it is dropped
  and the field shows the optimistic cache value — same text, no flicker, and a late server
  response cannot overwrite what was typed. Exactly two exceptions: the draft is kept when a
  trimmed value goes into the patch (otherwise a pause after a space would eat that space and
  move the caret), and the draft of an incomplete URL is never dropped. The state lives here
  rather than in the field component because of §7.3: an accordion can be collapsed by clicking
  the header or by "Свернуть все", both paths go through the screen, so a pending edit can be
  flushed **before** collapsing. A draft inside the component would need a `useEffect` on the
  `expanded` prop, which `react-hooks/set-state-in-effect` forbids. The source of truth for
  drafts is a ref, state is only its mirror for rendering: `flush` is an event handler and must
  read current drafts, and calling `mutate` inside a functional `setState` updater is illegal
  (StrictMode runs it twice).
* **`ApplicationAccordion` merges the draft into the record once** and passes the result to
  both the summary row and the fields — that is how an edit is instantly visible in the
  collapsed header without a single extra line. The component is wrapped in `memo`.
* **`hooks/useUpdateApplication.ts` — autosave of a single field**: optimistic cache patch and
  **per-field** rollback on error. The mutation context is a snapshot of exactly the fields
  sent, not of the whole record: a whole-record rollback would revert a neighbouring field that
  was saved in parallel while this request was in flight. Invalidation happens only on a
  `status` change (it changes the filtered list and the §7.8 counter); after other fields a
  refetch is harmful, as the response would replace the whole array and flicker the field being
  edited right now. The hook draws neither the snackbar nor the highlight — it calls
  `onSaved`/`onFailed` once the cache is consistent. The callbacks live on the hook, not on the
  `mutate` call: a second `mutate` detaches the previous mutation from its `MutationObserver`,
  so the first call site's callbacks would never fire.
* **`hooks/useSyncApplication.ts` — sync of one record (§7.6)**, and the set of syncing ids
  lives **in the hook**: `isPending`/`variables` on `useMutation` describe only the last
  `mutate`, yet 🔄 can be clicked on two rows in a row — the second button would hang together
  with the first. The set is updated with functional `setState` in `onMutate`/`onSettled`, so
  pairing holds on all paths; the accordion receives a **`boolean` slice**, otherwise the whole
  set would punch through `memo` on every neighbour at every start and finish. Only sync
  columns are carried over from the response (`buildSyncEchoPatch`) — replacing the whole
  record would revert the optimistic value of a field being edited. `position` and
  `hasCompanyLogo` are among them but are carried only when `outcome === 'OK'` and only when
  non-empty/`true`. A `404` purges the record from the caches (deleted in another tab).
* **`hooks/useSyncAllOpen.ts` — bulk run (§7.7)**: the `applications[]` from the response is
  deliberately **not** merged into the cache — only prefix invalidation, because the client
  does not know whether a record belongs to other cached filter combinations or where it sorts
  there. Invalidation also runs in `onError`: the run is synchronous and may have completed in
  the DB while the response timed out. The `/sync` and `/sync-open` timeouts are raised
  per-request: the default 20 s is shorter than the normal worst case for one record (≈32 s).
* **The run summary is a separate `SyncSummaryAlert` in the page flow, not `useNotification`**:
  the latter wants one short auto-dismissing message, the summary needs an expandable list of
  problem records that lives until explicitly closed. The three outcome channels never mix: an
  unsuccessful `outcome` on HTTP 200 → snackbar with severity per §7.6; a failed request →
  error snackbar; `ERROR`/`RATE_LIMITED` inside a successful response → the summary `Alert`
  only.
* **A disabled 🔄 is wrapped in a `span` with `stopPropagation`**: MUI gives a disabled
  `IconButton` `pointer-events: none`, so a click on the spinner would fall through to the
  accordion header.
* **`utils/applications-cache.utils.ts` is the only place that knows the cache shape.** Both
  functions work by prefix filter over `APPLICATIONS_QUERY_KEY`, which covers every cached
  filter combination plus the header counter key at once. The patch returns **the same
  reference** to the array when the record is not in it, otherwise React Query marks every
  cache as changed.
* **The vacancies screen** (`VacanciesScreen`) polls run status, hides leads optimistically and
  restores a hidden lead by synchronously re-inserting the snapshot rather than invalidating: a
  PATCH usually fails on the network, so the restoring refetch would fail next and leave the
  record missing. The insert checks each cache's filter against the record's `hidden` value.
  There is exactly one `NotificationSnackbar` and it lives in the shell — MUI does not stack
  two independent snackbars.
* Knowingly invalid values (an empty required "Компания", a broken URL) are never sent to the
  server — the field shows `error` and `helperText` instead of a guaranteed 400. The client URL
  check is **laxer** than the server's `@IsUrl`, never stricter: otherwise a valid link would
  become unsavable.
* Status/result enums and length limits are duplicated by hand in the frontend `constants/`
  files (no shared package, §3.4). Gaps, flex-basis values, thresholds and timings come from
  `constants/layout.constants.ts` and `constants/query.constants.ts`; JSX contains no numeric
  size literals (§7).
