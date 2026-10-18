# NEXORA — Progress

## Phase 3, Step 3.1 — Recruiter Portal Foundation — STATUS: COMPLETE (frontend demo scope)

### Features implemented
- Added a separate recruiter dashboard and My Job Listings view without changing the student portal or public job explorer.
- Added actual-data counts for total records, Published (active demo-status) records, and drafts; closed records are included only in the total.
- Added create/edit form for job description fields, required skills, optional safe HTTP(S) application URL, and Draft / Published / Closed status.
- Added browser-confirmed deletion, validation, safe escaped listing display, date formatting, local storage error states, empty states, and same-origin storage-event refresh.
- Persisted independent recruiter records using `nexora:demo-recruiter-listings`; did not seed listings or connect them to the public opportunities.
- Clearly disclosed that the portal is local-only and Published does not publish or verify a job.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `assets/css/home.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parse / duplicate-ID check — PASS.
- Integrated browser validation against a local HTTP server — recruiter create/required validation/unsafe URL rejection/draft save/reload persistence/edit/status counts/published disclosure/confirmed delete PASS.
- Integrated browser regression — student dashboard/profile navigation and existing six-card job explorer plus keyword search PASS.
- The existing optional Python Playwright suite was not run because the Python Playwright package is unavailable.

### Known limitations
- Recruiter data is browser-local and is not tied to an account or synced to a backend.
- Published is a local display status only; listings do not appear in the public explorer, cannot be externally applied to through this portal, and are not verified.
- No real recruiter identity, company verification, employer roles, shared database, or public publishing workflow is implemented.

## Phase 2, Step 2.2 — Student Profile & Dashboard Foundation — STATUS: COMPLETE (frontend demo scope)

### Features implemented
- Student portal shell with dashboard/profile navigation and responsive layout.
- Welcome banner and profile completion meter calculated from the existing local demo profile data.
- Editable student profile form with save-to-localStorage behavior using the existing `nexora:demo-profile` structure.
- Saved Jobs section synchronized with the existing bookmark system (`nexora:demo-saved`).
- Honest empty states for My Applications and any profile content not yet available.
- Dashboard and profile views remain in the same plain HTML/CSS/JS architecture without changing the established forest-green and ivory theme.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `assets/css/home.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Static validation performed: `node --check assets/js/main.js` passed.
- Browser automation was not executed for this Step 2.2 work in this environment, so browser-level UI assertions remain a known limitation.

### Known limitations
- No backend, no real accounts, and no real application tracking are in place.
- My Applications intentionally stays empty and does not fabricate status data.
- Dashboard data is browser-local only and resets with local demo data resets.

## Phase 1, Step 1.3 — Job details and application flow — STATUS: COMPLETE (frontend scope)

### Features implemented
- **Job-details view** built into the existing dialog, populated by the selected job's unique id from the central data: company mark, status badge (DEMO / UNVERIFIED / VERIFIED by real evidence), type, work mode, location, employment type, experience, compensation, posting date, deadline, skills, multi-paragraph description, responsibilities / qualifications / benefits (only when data exists), a "Not provided for this listing" line, evidence link for VERIFIED listings. Everything inserted as text; unknown values are omitted or stated as not provided.
- **Dialog behaviour**: X, Close, Escape and backdrop close it; focus contained inside and background inert; page scroll locked while open; focus restored to the opening card (or Saved button if the card is gone); labelled by job title; live status region.
- **Apply Now**: DEMO shows an honest "sample data, cannot accept an application" view and stays on NEXORA; no usable URL gives an unavailable button with a visible reason; a safe official URL gives a **review step** (job, company, domain, leaving-NEXORA notice, caution for unverified, `http` warning, passed-deadline note) then **Continue to application** opens the URL in a new tab with `noopener noreferrer`.
- **URL safety**: only `http(s)` with a real host and no embedded credentials; `javascript:`, `data:`, `ftp:`, `//host`, malformed values rejected; DEMO never redirects even if it carries a URL; second click within 1.5 s ignored.
- **Application-record foundation** (`applications.js`): record shape, `external_redirect` vs reserved `nexora` method, statuses `EXTERNAL_REDIRECT_OPENED` / `SUBMITTED`, in-memory store with a swappable adapter. A redirect is recorded only as `EXTERNAL_REDIRECT_OPENED`, never Submitted; nothing is persisted or displayed.
- **Save job** inside the dialog shares the bookmark list with the cards (card, dialog, Saved (N) and Saved-only view stay in step).
- Step 1.2 behaviour preserved; no redesign; no new colours.

### Files changed
`index.html` (dialog markup: X button and job container, external-link icon, applications.js script tag), `assets/js/jobs.js` (appended helpers; `normalize` also cleans `description` and the three optional lists; search/filter/sort code untouched), `assets/js/applications.js` (new), `assets/js/main.js` (dialog core refactor, `showDetails` replaced, `toggleSaved(id, quiet)`), `assets/css/components.css` (appended Step 1.3 styles), `assets/css/home.css` (one defensive rule on `.opp`), `assets/js/data.js` (schema comment only; data unchanged), `tests/regression_test.py` (two Step 1.2 checks updated, 29 new checks), docs.

### Test results
77 of 77 automated checks PASS in headless Chromium: the 48 carried from Step 1.2 (two with updated expectations because the dialog changed, see `TEST_REPORT.md`) plus 29 new Step 1.3 checks. See `TEST_REPORT.md` for the table, how the checks work, bugs found, and the NOT TESTED list.

### Known issues and limitations
- All listings are DEMO. Real-URL, verified, pay, date and description rendering was exercised only with temporary test data (and a mocked external site), not with shipped data.
- No backend: no application submission, tracking, history, recruiter responses, accounts, resume upload or synced bookmarks. Application records exist only in memory for the page visit and are not displayed.
- "View details" is a dialog with no shareable URL.
- Search word-start only; remote jobs do not match a city search; filter state resets on reload; bookmarks are browser-local.
- Chromium prefers one extra native Tab stop (its own UI) after the last control in a modal; focus never reaches page controls.
- NOT TESTED: real screen readers, Firefox/Safari/Edge, real touch devices and real popup-blocker behaviour, the Google Font, axe/Lighthouse, forced-colors, 200% zoom, printing, Live Server, a real employer website (external pages were mocked in tests).

### Remaining work (later steps, mostly backend-dependent)
Accounts and synced bookmarks; real application submission, application history and recruiter status updates; real opportunity data and verification process; recruiter portal; the pages marked "Soon"; legal and contact content.

### Exact next step
**Phase 1, Step 1.4 — Finalise and validate the complete opportunity-discovery experience before proceeding to the next major phase.**

Handoff notes for Step 1.4:
- Keep the plain HTML/CSS/JS architecture and design tokens; do not add colours.
- Run `python3 tests/regression_test.py` first (77 checks should pass), then validate the whole discovery journey end to end (home → search/filter/sort → details → save → apply flow) and decide what, if anything, still blocks moving to the next phase.
- Preserve status honesty: DEMO listings never open a URL or create a record; a redirect is never "Submitted"; VERIFIED requires `evidenceUrl`.
- Candidates to review in 1.4: shareable details URLs, filter state in the URL, search matching, real-device and cross-browser checks (listed as NOT TESTED), and an axe/Lighthouse pass if tooling is available.

---

## Earlier steps (summary)

### Phase 1, Step 1.2 (Parts 1 and 2) — COMPLETE
Central job data; search; combining filters; sorting where supported; result counts and empty states; informative cards; DEMO / UNVERIFIED / VERIFIED status badges; persistent bookmarks with Saved (N) and Saved-only view; accessibility pass; 48 automated checks. Step 1: design system and homepage.
