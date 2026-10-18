# NEXORA — Project Context

## Purpose
NEXORA is a career-tech platform for students, freshers and job seekers, inspired by the core capabilities of LinkedIn and Naukri.com, with added trust and accountability features (honest listing status, no fake data, no pretend applications). Tagline: "From Potential to Proof. From Proof to Opportunity."

## Technology stack (actual)
Plain HTML + CSS + JavaScript. No npm, no `package.json`, no build step, no framework, no backend. Runs by opening `index.html`, with Live Server, or via `python3 -m http.server`. Only external dependency: the Plus Jakarta Sans Google Font (falls back to system fonts offline). Do not introduce React/Next.js/build tooling. `tests/regression_test.py` is an optional Python + Playwright dev tool and is not part of the site.

## Design system
Forest green + warm ivory. All tokens in `assets/css/tokens.css` (`--color-bg #F7F5EF`, `--color-primary #244B3B`, sage `#D8E2D5`, mint `#E3F1E9`, text `#242824`, muted `#666D66`). Components in `components.css` (`.btn`, `.chip`, `.badge` and status variants `--demo/--unverified/--verified`, `.card`, `.segmented`, `.input/.select`, `.dialog`, `.toast`, `.filter`, `.chip--active`, `.chip--toggle`, `.search__clear`, `.empty`; Step 1.3 appended `.dialog__x`, `.dialog--job`, `.jv__*`). Layout in `home.css`. No blue/neon/gradients/glassmorphism. Reuse tokens; do not add new colours. Focus: global `:focus-visible` 2px primary outline; text fields and filters show the same ring on their wrapper via `:focus-within`.

## Phase 3, Step 3.3 — Recruiter Applicant Management

### Storage relationship and limitations
- No new storage key is introduced. Explicitly saved student tracker applications remain in `nexora:demo-profile`; recruiter listings remain in `nexora:demo-recruiter-listings`.
- Applications selected from a recruiter-created job carry the stable `jobId` and `recruiterListingId`. A browser-local `profileId`/application `candidateId` is assigned on explicit application save where missing. Older records can be matched by the existing stable job ID. Unlinked manual entries and other jobs are not shown to recruiters.
- The app has only one browser-local student profile. This supports a same-browser demonstration, not communication between actual students and recruiters, separate browsers, or devices. No backend or shared applicant database exists.

### Applicant UI and status behaviour
- Recruiter navigation includes Applicants, with actual associated-record counts and filters by saved listing and effective status plus search by candidate name/job title.
- Candidate details expose only user-provided name, headline, education, skills, projects, and valid HTTP(S) GitHub/portfolio/project links. Email, application notes, passwords, and unrelated localStorage keys are excluded. No candidate or project verification is claimed.
- Student status remains in `application.status`. A recruiter update uses separate `recruiterStatus` and `recruiterUpdatedAt` fields in that same record. The tracker presents both sources distinctly; opening Applicants does not change status and no notifications are sent.
- Missing/malformed profile or listing records render explicit unavailable/empty states. Applications remain saved in the profile when their recruiter listing is deleted but are no longer attributed to an active saved recruiter listing.

### Validation
- Integrated-browser checks covered explicit application-to-listing association, applicant filtering/search, candidate details, recruiter status persistence/source separation, external Apply Now not recording an application, deleted/malformed data handling, existing-profile editing, and mobile layout. Temporary browser fixtures were restored.
- Static JavaScript syntax and HTML duplicate-ID checks passed. The optional Python Playwright suite could not start because the package is missing.

## Phase 3, Step 3.2 — Recruiter Job Publishing & Management

### Scope, storage, and truthfulness
- Extends the Step 3.1 recruiter portal in the existing single-page app. Recruiter listings remain separate from the student profile and use `nexora:demo-recruiter-listings`.
- Listing records include title, company, description, required skills, location, work mode, job type, eligibility, experience, deadline, optional salary range and optional official application URL, plus status and timestamps.
- Statuses are Draft, Published, Unpublished and Closed. Dashboard counts use normalized stored records. Search matches title/company and the status selector filters the same list.
- Only Published recruiter records are mapped into the existing Job Explorer, with stable negative IDs and the recruiter-entered job details. Inactive records are removed when listings refresh; stale application records retain their own saved title/company snapshot.
- Recruiter job bookmarks are retained while a listing is Unpublished or Closed and reattach to the same job when republished. Deleting a listing removes it from explorer results; student profile/application records remain independent.
- Form validation covers required fields, future/current deadlines, salary range, and optional HTTP(S) application URLs without embedded credentials. Save as Draft, Preview and Publish retain form data when validation fails.
- Details never fabricate an external application URL. A recruiter listing without a usable URL explains this and disables Apply Now. Student application tracking remains manually maintained; external Apply Now does not submit or record an application automatically.

### Demo limitations and validation
- "Published" means visible only in the current browser's Job Explorer. Listings are not shared, hosted, recruiter-verified, or connected to a server. There are no real recruiter accounts or employer responses.
- Integrated-browser checks covered draft/preview/publish, public explorer integration, detail fields, edit without duplication, status transitions, listing search/filter, explorer search/filter/sort, bookmark retention/reattachment (including toggling another job while a recruiter listing is inactive), refresh persistence, delete confirmation, student-data preservation, invalid required fields/date/URL, no-URL messaging, malformed storage handling, and 390px navigation/layout.
- `node --check assets/js/main.js` and the Python standard-library HTML parser / duplicate-ID check passed. The optional `tests/regression_test.py` could not start because Python `playwright` is not installed.

## Phase 3, Step 3.1 — Recruiter Portal Foundation (initial scope)

### Scope and storage
- The recruiter tools live in a separate portal shell in the existing single-page HTML/CSS/JS application. They do not replace or share student profile data.
- Recruiter listings are saved in the current browser under `nexora:demo-recruiter-listings`; no records are seeded. Create, edit, delete, and reload operate only on this local demo list.
- No recruiter identity, account, password, company verification, backend, or public listing endpoint exists. At the Step 3.1 stage, Published was a local status only; Step 3.2 now adds same-browser Job Explorer integration, not server publishing.
- Dashboard counts come from actual stored records: Total includes all valid records, Active counts status `Published` (displayed as a local demo status only), and Draft counts `Draft`. Closed records count toward Total, not Active or Draft.

### Recruiter portal behaviour
- Separate Dashboard, My Job Listings, and create/edit views; navigation returns to the main job explorer.
- Listing fields: title, company, description, location, job type, work mode, required skills, optional application URL, status, and `updatedAt`.
- Required fields are checked before saving. Optional application URLs allow only HTTP(S), a hostname, and no embedded credentials. User-entered text is HTML-escaped in listing cards.
- Delete requires native browser confirmation. Storage read/write errors are announced rather than presented as successful operations. A `storage` event refreshes the listing counts and views across same-origin tabs.
- Empty states do not imply listings exist. Published-status disclosures still state that records are not shared or verified.

### Validation notes
The Step 3.1 flows were exercised in the integrated browser against a local HTTP server, including create/draft persistence, editing/status counts, URL and required-field validation, safe rendering, deletion confirmation, student navigation, and existing job search/card regression. The optional Python Playwright suite was not rerun because its Python package was unavailable in this environment; details are in `TEST_REPORT.md`.

## Phase 2, Step 2.2 — student dashboard and profile foundation

### Scope and constraints
The Step 2.2 work keeps the existing homepage, guest browsing, and job-explorer flows intact. The student dashboard and profile page are front-end only and rely on the browser's existing local demo profile and bookmark storage. No real password storage, backend account system, or application submission pipeline is introduced.

### Student portal behaviour
- `#student-shell` is a dedicated dashboard/profile area that sits inside the same single-page app and reuses the same `nexora:demo-profile` and `nexora:demo-saved` localStorage keys already used elsewhere in the project.
- Get Started opens onboarding directly. Step previews do not write profile data; Finish saves it and routes to the dashboard. Only name, education and a skill are mandatory to finish; career preferences, links and projects can remain empty.
- Dashboard rendering is based on saved profile data only. Completion is calculated from five core fields (name, headline, education, career interests, and at least one skill); projects and links are optional and do not inflate the percentage. The meter exposes progress-bar semantics and a completed-fields count.
- Profile edit fields load from the same saved profile as the dashboard. Save writes valid partial profiles; Cancel reloads saved values and discards edits. Legacy skill strings and current skill objects both render without losing existing skills or their selected levels.
- Step 2.3 Part 1 skills are managed as responsive wrapping tags in the Profile editor and saved to the same profile key. Add works by button or Enter; names are required and duplicates are blocked case-insensitively. Users can edit/remove skills and manually select Beginner, Intermediate, or Advanced. Existing saved proficiency values outside these choices are retained when editing until the user changes the selection.
- Skill records retain user-selected levels and evidence metadata. Skills are Self-declared unless the student explicitly links a project; the UI makes no verification or endorsement claims. Adding/removing skills refreshes dashboard overview and completion based on whether a skill exists.
- Saved Jobs is a mirror of the bookmark list, so changes in the job explorer update the student dashboard immediately.
- My Applications is a local student-maintained tracker stored in the existing `nexora:demo-profile` record. It supports listed-job selection or manual entry, application date, method/source, six student-entered statuses, notes, search/filter, edit, duplicate prevention, and confirmed removal. Dashboard preview and the My Applications route use the same profile data.
- External employer-site redirects never create an Applied record. The student must explicitly save a record after submitting externally; the status label says it is student-entered and is not synced or confirmed by an employer. The explicit “I've applied · record it” action opens a prefilled but unsaved form.
- An incomplete-profile prompt links to Profile based only on actual saved completion fields. Empty or malformed applications data produces a safe empty state; application records do not change profile completion or overwrite skills/projects.
- Navigation between Dashboard, Profile, My Applications and Explore Jobs is handled in the same front-end shell, without adding a framework or new backend.
- Malformed profile JSON falls back safely without clearing the independent bookmark or recruiter-listing keys. Profile write failures are reported rather than shown as successful saves.

### Validation notes
This repair was checked with `node --check`, standard-library HTML parsing and duplicate-ID detection, and integrated-browser UI flows against the local file page. Verified flows included onboarding through Finish, summary preview without early persistence, dashboard/profile consistency, save/cancel, refresh persistence, bookmarks, malformed profile storage, and excluding external redirects from My Applications. The optional Python Playwright suite could not start because the Python package is unavailable; see `TEST_REPORT.md`.

The Step 2.3 Part 1 skill editor was also checked in the integrated browser for empty-name validation, case-insensitive duplicates, Enter-to-add with a user-selected level, edit/remove behavior, persistence after reload, and dashboard overview/completion synchronization. A CSS hit-target issue that caused clicks on Edit to activate Remove was corrected by preserving a readable minimum width for each control.

### Step 2.3 Part 2 — Student projects and proof of work
- Students manage projects in the existing Profile editor. Title, description, technologies, and role/contribution are required; GitHub and live-demo URLs are optional and must be absolute HTTP(S) URLs with a hostname and no embedded credentials.
- Projects are stored in the existing `nexora:demo-profile` key, are rendered in the Profile editor and dashboard overview, and do not contribute to profile completion. Project deletion requires confirmation. Deleting a project also removes any explicit skill link to it and returns those skills to Self-declared evidence.
- Project display escapes user text and only exposes safe HTTP(S) links in a new tab with `noopener noreferrer`. “Project added by student” and “Repository link provided” do not indicate verification.
- Integrated-browser tests covered required validation, unsafe URL rejection, add/edit/delete (confirmation and cancellation), persistence, dashboard preview consistency, malformed legacy data, and safe link rendering. Existing guest onboarding, skills, bookmarks, search/filter/details/Apply Now, and recruiter navigation received regression smoke checks. Test outcomes are recorded in `TEST_REPORT.md`.

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
Record: `{ applicationId, jobId, candidateId (null), createdAt, method, status, destinationHost }`. `METHODS`: `external_redirect`, `nexora`. `STATUSES`: `EXTERNAL_REDIRECT_OPENED`, `SUBMITTED`. `createRecord` refuses demo listings, invalid ids, unknown methods, a missing host, and method `nexora` (needs a backend). `isSubmittedViaNexora` is true only for method `nexora` + status `SUBMITTED`. `getStore()/setStore(adapter)` is the seam for a future backend (adapter needs `save` and `list`); the default adapter is in-memory (`persistent: false`). This module concerns external redirect events; the separate student-entered My Applications records are stored in the demo profile as described above.

### Dialog behaviour
Native `<dialog>.showModal()` gives focus containment and an inert background. `body.is-modal` locks page scroll and is removed by the dialog's `close` event (which fires for X, Close, Escape and backdrop). Backdrop closing checks pointer coordinates so a click on the dialog's own padding does not close it. A single delegated click listener on `#dialog-job` handles apply / save / back / close, so reopening never stacks listeners. After closing, if the opening button no longer exists (e.g. un-bookmarked in Saved-only view), focus goes to `#saved-toggle`. A toast sits behind a modal dialog, so dialog actions (save) report through the dialog's own `#jv-status` live region (`toggleSaved(id, quiet)` returns the message).

### CSS note
`.opp` got `min-width: 0; overflow-wrap: anywhere` so a long unbroken word in a company or title cannot widen the page (found by the Step 1.3 overflow test). No visual change for normal text.

## Important data and security rules
- All six shipped listings are DEMO. Never invent companies, salaries, dates, URLs, benefits, qualifications or verification. `VERIFIED` is downgraded to `UNVERIFIED` unless `evidenceUrl` is a valid http(s) URL; `applyUrl`/`evidenceUrl` that are not http(s) become `null`.
- Never use `innerHTML` with data. The only remaining `innerHTML` uses in `main.js` are Step 1.2's card/filter rendering, which pass every dynamic value through `escapeHtml`. Step 1.3 code uses none.
- An external redirect is only "the visitor was sent to the employer", never an application record. A user may self-report an application in the local tracker, but that status is explicitly not verified, submitted through NEXORA, or received from an employer.
- Demo listings never produce an application record and never open an external URL.
- No personal data (resume, phone, email) is collected anywhere.
- `category`/`tags` were assigned by classifying the original six roles; `experience` only where the title states it. Everything else not in the original data is `null`.
- No salary filter because no comparable pay data exists. Full-time/Part-time/Contract/Freelance are listed but disabled (original data only said "Job").
- Use the `nexora:` prefix for any new storage key. Bookmarks use `nexora:demo-saved`.
- A global `[hidden]{display:none!important}` is in base.css (needed because `.btn` sets display).
- Search applies on submit/Enter; selects apply immediately. Clear all keeps the chosen sort.
