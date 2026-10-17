# NEXORA — Project Context

## Purpose
NEXORA is a career-tech platform for students, freshers and job seekers, inspired by the core capabilities of LinkedIn and Naukri.com, with added trust and accountability features (honest listing status, no fake data). Tagline: "From Potential to Proof. From Proof to Opportunity."

## Technology stack (actual)
Plain HTML + CSS + JavaScript. No npm, no `package.json`, no build step, no framework, no backend. Runs by opening `index.html` or via `python3 -m http.server`. Only external dependency: the Plus Jakarta Sans Google Font (falls back to system fonts offline). Do not introduce React/Next.js/build tooling. `tests/regression_test.py` is an optional Python + Playwright dev tool and is not part of the site.

## Design system
Forest green + warm ivory. All tokens in `assets/css/tokens.css` (`--color-bg #F7F5EF`, `--color-primary #244B3B`, sage `#D8E2D5`, mint `#E3F1E9`, text `#242824`, muted `#666D66`). Components in `components.css` (`.btn`, `.chip`, `.badge` and its status variants `--demo/--unverified/--verified`, `.card`, `.segmented`, `.input/.select`, `.dialog`, `.toast`, `.filter`, `.chip--active`, `.chip--toggle`, `.search__clear`, `.empty`). Layout in `home.css`. No blue/neon/gradients/glassmorphism. Reuse tokens; do not add new colours. Focus: global `:focus-visible` 2px primary outline; text fields and filters show the same ring on their wrapper via `:focus-within`.

## Architecture
```
index.html                 Markup + SVG icon sprite
assets/css/                tokens → base → components → home
assets/js/data.js          DATA ONLY: window.NEXORA_DEMO.opportunities (schema documented at top)
assets/js/jobs.js          PURE LOGIC, no DOM: window.NexoraJobs. Also loads under Node via module.exports.
assets/js/main.js          UI: menu, dialog, toast, rendering (all dynamic text through escapeHtml / textContent), event wiring, bookmarks
tests/regression_test.py   Optional Playwright suite; writes tests/results.json
```
Script order: data.js → jobs.js → main.js. All wrapped in IIFEs; the only globals are `NEXORA_DEMO` and `NexoraJobs`.

`NexoraJobs` API: `normalizeAll, defaultState, run(jobs, state, savedIds), activeFilters, facetOptions, countFacet, sortSupport, locations, FACETS, SORTS, cardFacts(job, now), formatSalary, formatDate, isPast, safeUrl, cleanSavedIds`.

`main.js` looks up every optional element defensively (`opt()` returns a detached stand-in, `on()` ignores null), so removing an optional element from the HTML cannot throw. Only `#opps-grid` and `NexoraJobs` are required to render cards.

## Implemented in Step 1.2 (Parts 1 and 2)
- Central data schema (id, title, company, logo, category, type, employmentType, mode, location, salary, experience, skills, description, postedDate, deadline, applyUrl, status, evidenceUrl, tags). Unknown = `null`.
- Search: tokenised, case-insensitive, word-start matching ("end" does not match "Frontend"), all words must match; fields: title, company, skills, tags+category, location, description. Relevance score: title 5, company 4, skills 3, tags 2, location 2, description 1.
- Filters: type, work mode, location (text; "remote" matches mode Remote), category, experience (incl. Unknown), saved-only. All combine; chips + Clear all. Options with no matching data are disabled with "(none listed yet)".
- Sorting: relevance, Title A–Z; newest/pay enable automatically only when the data supports them (2+ valid dates; 2+ salaries sharing one currency/period). Unknowns sort last, never as 0.
- Result count, empty states (filtered, nothing saved), clear-search button, status line under the hero search.
- Type control exists in three places (hero select, segmented control, filter bar); all share one state.
- Cards (Part 2): one consistent layout for every listing. Facts come from `cardFacts()`: location (hidden when identical to work mode, e.g. Remote), work mode, then employment type, experience (hidden if it only repeats the type), compensation, posted date, deadline — each only when known. A deadline in the past reads "Deadline passed (date)". Skills row only when skills exist.
- Status badges (Part 2): text + style, never colour alone. DEMO = dashed outline "Demo listing"; UNVERIFIED = sage "Unverified listing"; VERIFIED = solid green with a check, and only when `evidenceUrl` is a valid http(s) link.
- Bookmarks (Part 2): see below.
- View details (Part 2): the existing dialog, now filled from card data plus an honest status note. Evidence/apply links shown only for non-DEMO listings with safe URLs; `target=_blank rel="noopener noreferrer"`.
- Accessibility (Part 2): constant accessible names on bookmark buttons (`Bookmark: <title>` + `aria-pressed`), `View details: <title>`, live regions on status line / count / toast, labelled Primary and Mobile navs, `aria-describedby` on the dialog, hidden empty active-filter list, visible focus rings on fields and filters.

## Bookmarks
- Storage: `localStorage` key `nexora:demo-saved`, JSON array of listing ids. Browser-local only: no account, no cross-device sync.
- On load and on every toggle the stored value is read defensively and cleaned by `cleanSavedIds` (whole numbers that match a real listing, de-duplicated). Corrupt or non-array values are ignored.
- Before each write the latest stored value is re-read so a change made in another tab is not overwritten. A `storage` event listener keeps other open tabs in step.
- If storage is blocked or full, state lives in memory for the visit and the toast says it will not be kept.
- One source of truth: the in-memory `saved` array in `main.js`. Card buttons, the Saved (N) count and the Saved-only filter all read it.

## Important decisions and constraints
- All six listings are DEMO. Never invent companies, salaries, dates, URLs or verification. `VERIFIED` is downgraded to `UNVERIFIED` unless `evidenceUrl` is a valid http(s) URL; `applyUrl`/`evidenceUrl` that are not http(s) become `null`.
- `category`/`tags` were assigned by classifying the original six roles; `experience` only where the title states it (Digital Marketing Associate = Unknown). Everything else not in the original data is `null`.
- No salary filter because no comparable pay data exists. Add it only when real numeric data does.
- Full-time/Part-time/Contract/Freelance are listed but disabled: original data only said "Job".
- Remote listings do not match a city search; searching "remote" matches them.
- Search applies on submit/Enter; selects apply immediately. Clear all keeps the chosen sort.
- A global `[hidden]{display:none!important}` is in base.css (needed because `.btn` sets display).
- NEXORA never claims an application was submitted. There is no application flow yet.
- `showDetails(o)` in `main.js` is the single place the details dialog is built; Step 1.3 replaces it with a real page/flow.
