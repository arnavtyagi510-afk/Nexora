# NEXORA — Project Context

## Purpose
NEXORA is a career-tech platform for students, freshers and job seekers, inspired by the core capabilities of LinkedIn and Naukri.com, with added trust and accountability features (honest listing status, no fake data, no pretend applications). Tagline: "From Potential to Proof. From Proof to Opportunity."

## Technology stack (actual)
Plain HTML + CSS + JavaScript. No npm, no `package.json`, no build step, no framework, no backend. Runs by opening `index.html`, with Live Server, or via `python3 -m http.server`. Only external dependency: the Plus Jakarta Sans Google Font (falls back to system fonts offline). Do not introduce React/Next.js/build tooling. `tests/regression_test.py` is an optional Python + Playwright dev tool and is not part of the site.

## Design system
Forest green + warm ivory. All tokens in `assets/css/tokens.css` (`--color-bg #F7F5EF`, `--color-primary #244B3B`, sage `#D8E2D5`, mint `#E3F1E9`, text `#242824`, muted `#666D66`). Components in `components.css` (`.btn`, `.chip`, `.badge` and status variants `--demo/--unverified/--verified`, `.card`, `.segmented`, `.input/.select`, `.dialog`, `.toast`, `.filter`, `.chip--active`, `.chip--toggle`, `.search__clear`, `.empty`; Step 1.3 appended `.dialog__x`, `.dialog--job`, `.jv__*`). Layout in `home.css`. No blue/neon/gradients/glassmorphism. Reuse tokens; do not add new colours. Focus: global `:focus-visible` 2px primary outline; text fields and filters show the same ring on their wrapper via `:focus-within`.

## Architecture
```
index.html                 Markup + SVG icon sprite + the single shared <dialog id="dialog">
assets/css/                tokens → base → components → home
assets/js/data.js          DATA ONLY: window.NEXORA_DEMO.opportunities (schema documented at top)
assets/js/jobs.js          PURE LOGIC, no DOM: window.NexoraJobs. Also loads under Node via module.exports.
assets/js/applications.js  Application-record shape + in-memory store seam: window.NexoraApplications. Also loads under Node.
assets/js/main.js          UI: menu, dialog, toast, rendering, event wiring, bookmarks, details + apply flow
tests/regression_test.py   Optional Playwright suite (core / part2 / part3); writes tests/results.json
```
Script order: data.js → jobs.js → applications.js → main.js. All wrapped in IIFEs; the only globals are `NEXORA_DEMO`, `NexoraJobs`, `NexoraApplications`.

`NexoraJobs` API: `normalizeAll, defaultState, run(jobs, state, savedIds), activeFilters, facetOptions, countFacet, sortSupport, locations, FACETS, SORTS, cardFacts(job, now), formatSalary, formatDate, isPast, safeUrl, cleanSavedIds` plus (Step 1.3) `parseApplyUrl, applyDestination, missingFields, paragraphs`.

`main.js` looks up every optional element defensively (`opt()` returns a detached stand-in, `on()` ignores null), so removing an optional element from the HTML cannot throw. Only `#opps-grid` and `NexoraJobs` are required to render cards.

## Features carried forward from Step 1.2 (unchanged behaviour)
- Central data schema; tokenised word-start search with relevance scoring; combining filters (type, work mode, location, category, experience, saved-only) with chips and Clear all; sorting (relevance, Title A–Z; newest/pay enable only when the data supports them); result count and empty states.
- Cards: one consistent layout; facts only when known; status badges (DEMO dashed outline / UNVERIFIED sage / VERIFIED solid green with check, only with a valid `evidenceUrl`).
- Bookmarks: `localStorage` key `nexora:demo-saved` (JSON array of ids), validated by `cleanSavedIds`, re-read before each write, cross-tab `storage` sync, in-memory fallback when storage is blocked. The in-memory `saved` array in `main.js` is the single source of truth.
- Accessibility pass: stable bookmark button names + `aria-pressed`, live regions, labelled navs, visible focus rings, contrast-checked tokens.

## Step 1.3: job details and application flow

### Details view
`showDetails(job)` in `main.js` builds the details inside the existing `#dialog` (container `#dialog-job`), by job id, entirely with `createElement` / `textContent` / `createElementNS` (no HTML strings from data). `setJobMode(on)` switches the dialog between the plain-message layout (Soon notices, uses `openDialog`) and the job layout (`dialog--job`, X button `#dialog-x`). Contents: company mark (initial), status badge, title (`#jv-title`, the dialog's accessible name), facts from `cardFacts` plus opportunity type, status note (`#jv-summary`, the dialog description), evidence link for VERIFIED listings, skills, description split into paragraphs, responsibilities / qualifications / benefits only when non-empty, a "Not provided for this listing" line from `missingFields`, then the apply area.

Optional schema fields added: `responsibilities`, `qualifications`, `benefits` (arrays of non-empty strings; normalised to `[]` when missing or malformed). `description` is normalised to `null` unless it is a non-blank string. No shipped record has any of these.

### Apply flow
`Jobs.applyDestination(job)` decides everything from real data:
- `demo` — status DEMO. Never opens anything, even if the record has an `applyUrl`. Apply Now shows the demo explanation view (`#jv-demo`).
- `none` — no usable URL. Apply Now is `aria-disabled="true"` (still focusable so the reason is readable), with a visible message and a live-region message on activation.
- `external` — UNVERIFIED with a safe URL: review step with caution.
- `external-verified` — VERIFIED (needs `evidenceUrl`) with a safe URL: review step without the caution.

`Jobs.parseApplyUrl` accepts only `http:`/`https:` URLs with a hostname and **no username/password**; it returns `{url, host, secure}` with the `www.` prefix stripped from the displayed host. Everything else (javascript:, data:, ftp:, `//host`, malformed, credentials) means `none`.

Review step (`#jv-review`): job, company, website domain, listing status, a "you are leaving NEXORA" explanation (opening the site is not an application; NEXORA cannot see what happens there), caution for non-VERIFIED, a warning for `http`, a note when the deadline has passed, then **Continue to application** and **Cancel**. It has no inputs and asks for no personal data. Continue is a real `<a href target="_blank" rel="noopener noreferrer">` (so popup blockers do not interfere). A delegated click handler re-validates the destination at click time, ignores a second click within 1.5 s, records the redirect, and shows a status message that this is not counted as an application.

### Application-record foundation (`applications.js`)
Record: `{ applicationId, jobId, candidateId (null), createdAt, method, status, destinationHost }`. `METHODS`: `external_redirect`, `nexora`. `STATUSES`: `EXTERNAL_REDIRECT_OPENED`, `SUBMITTED`. `createRecord` refuses demo listings, invalid ids, unknown methods, a missing host, and method `nexora` (needs a backend). `isSubmittedViaNexora` is true only for method `nexora` + status `SUBMITTED`. `getStore()/setStore(adapter)` is the seam for a future backend (adapter needs `save` and `list`); the default adapter is in-memory (`persistent: false`). Records are not displayed anywhere and nothing is written to `localStorage`.

### Dialog behaviour
Native `<dialog>.showModal()` gives focus containment and an inert background. `body.is-modal` locks page scroll and is removed by the dialog's `close` event (which fires for X, Close, Escape and backdrop). Backdrop closing checks pointer coordinates so a click on the dialog's own padding does not close it. A single delegated click listener on `#dialog-job` handles apply / save / back / close, so reopening never stacks listeners. After closing, if the opening button no longer exists (e.g. un-bookmarked in Saved-only view), focus goes to `#saved-toggle`. A toast sits behind a modal dialog, so dialog actions (save) report through the dialog's own `#jv-status` live region (`toggleSaved(id, quiet)` returns the message).

### CSS note
`.opp` got `min-width: 0; overflow-wrap: anywhere` so a long unbroken word in a company or title cannot widen the page (found by the Step 1.3 overflow test). No visual change for normal text.

## Important data and security rules
- All six shipped listings are DEMO. Never invent companies, salaries, dates, URLs, benefits, qualifications or verification. `VERIFIED` is downgraded to `UNVERIFIED` unless `evidenceUrl` is a valid http(s) URL; `applyUrl`/`evidenceUrl` that are not http(s) become `null`.
- Never use `innerHTML` with data. The only remaining `innerHTML` uses in `main.js` are Step 1.2's card/filter rendering, which pass every dynamic value through `escapeHtml`. Step 1.3 code uses none.
- NEXORA never claims an application was submitted, applied for, sent or successful. An external redirect is "the visitor was sent to the employer", nothing more. Never add a Submitted status for a redirect.
- Demo listings never produce an application record and never open an external URL.
- No personal data (resume, phone, email) is collected anywhere.
- `category`/`tags` were assigned by classifying the original six roles; `experience` only where the title states it. Everything else not in the original data is `null`.
- No salary filter because no comparable pay data exists. Full-time/Part-time/Contract/Freelance are listed but disabled (original data only said "Job").
- Use the `nexora:` prefix for any new storage key. Bookmarks use `nexora:demo-saved`.
- A global `[hidden]{display:none!important}` is in base.css (needed because `.btn` sets display).
- Search applies on submit/Enter; selects apply immediately. Clear all keeps the chosen sort.
