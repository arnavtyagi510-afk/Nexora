# NEXORA — Progress

## Phase 4, Step 4.2 — Project Defense & Skill Proof System — STATUS: COMPLETE (browser-local demo scope)

### Features implemented
- Added a student Project Defense route and project-card actions, with project eligibility based on saved description, technologies, and role.
- Implemented six deterministic questions shown one at a time on architecture, implementation choices, technical challenges, debugging, trade-offs, and contribution. Prompts use only the saved project details and state that linked repositories are not inspected.
- Persisted in-progress answers and completed sessions in the existing student profile storage. Added saved-session navigation, response review, restart confirmation, and refresh-safe drafts/results.
- Added a transparent indicative summary based on response count and an explicitly stated simple response-length heuristic, with unanswered categories and review topics.
- Added private-by-default completed sessions with explicit per-session recruiter share consent and revocation. Recruiters see only shared completed sessions; deleted projects retain a clearly identified saved snapshot.
- Kept skill evidence Self-declared / Project-linked; assessment completion does not independently verify a skill. No AI provider, new storage key, or dependency was added.
- Updated README and project context with same-browser storage, no-auth/no-AI, and no-independent-verification limitations.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Integrated-browser checks — PASS: six project-personalized questions; single-question progress; answer and progress persistence through reload; response review, completion summary and unanswered topics; private-by-default candidate gate; explicit share and revocation; recruiter-visible shared Q&A and indicative summary; deleted-project history handling; unchanged project-linked skill evidence; 390px no-horizontal-overflow check.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parse / duplicate-ID check — PASS; 315 IDs, none duplicated.
- `python tests\regression_test.py` — NOT RUN: could not start because Python Playwright is unavailable (`ModuleNotFoundError`).

### Known limitations and remaining checks
- This is browser-local demo state in the single `nexora:demo-profile`; it is not authenticated, server-backed, safely shareable across different users/devices, or tamper-proof.
- Question generation is deterministic and only uses saved project fields. Repositories are not accessed, and no AI provider or independent assessment is configured.
- The response summary uses counts and a simple disclosed answer-length heuristic; it is indicative practice feedback, not skill verification or hiring evidence.
- No physical-device, cross-browser, keyboard-only, or screen-reader test was performed. Full optional Playwright regression suite remains unavailable until its dependency is installed.

## Phase 4, Step 4.1 — Company Verification & Trust Center — STATUS: COMPLETE (browser-local demo scope)

### Features implemented
- Added recruiter Company Profile & Trust Center with editable company name, official website, business email domain, description, industry, location, public links, optional supporting information, and status explanations.
- Added validation and a local verification-request workflow. Requests remain **Pending Review**; this app has no reviewer and cannot grant **Verified**. A local `Verified` value is downgraded. Resubmitting updates the request timestamp; a Rejected record can be edited and resubmitted.
- Added separate company trust indicators to opportunity cards, recruiter listings, and job details. Company trust is associated by exact case-insensitive company name and does not alter job publication or Step 3.4 activity status.
- Added report-job/recruiter form with required reason, optional explanation, local persistence, confirmation, and duplicate job/reason prevention. Reports are not marked reviewed/resolved.
- Added safe malformed-storage states for company profiles and reports and kept optional reviewer supporting details out of student-facing job details.
- Documented local-only storage, lack of authorized reviewer/backend, lack of cross-device sync, and need for backend services for actual verification/report review.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Integrated browser — PASS: create/edit profile and persistence; incomplete profile save versus required verification submission; HTTP/HTTPS/domain/public-link validation; Pending Review (never Verified); rejected-status explanation and resubmission; unsafe local Verified value downgraded; job cards/details show matching trust status; report validation, save/confirmation, duplicate handling and refresh persistence; base/recruiter job reporting; malformed data does not overwrite; 390px Trust Center layout/navigation.
- Regression browser checks — PASS: recruiter draft/edit/publish into Job Explorer, publication state and initial Step 3.4 event persist, company trust stays separate from publication, Saved Jobs bookmark persistence, external Apply Now does not create an application, application status/notes persist, student activity does not reset recruiter timer, and expired listings still transition to Needs Review.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parse / duplicate-ID check — PASS.
- `python tests\regression_test.py` — NOT RUN: unavailable because Python Playwright is not installed (`ModuleNotFoundError`).

## Phase 3, Step 3.4 — Recruiter Accountability & 15-Day Job Activity — STATUS: COMPLETE (browser-local demo scope)

### Features implemented
- Added initial publication timestamps and per-listing activity events for publication, reconfirmation, candidate review, applicant status changes, close/unpublish, and review expiry. The event list is capped at the latest 100 records and applicant events include only the application ID.
- Published listings expire into **Needs Review** after 15 days without valid recruiter activity (publication time is the fallback); expired listings are excluded from active student opportunities. Invalid/missing activity dates require review safely.
- Added recruiter-facing last activity, review deadlines/countdowns, review-needed counts and activity history, plus confirmation-gated **Reconfirm Vacancy**.
- Prevented expired editor Preview/Publish from bypassing reconfirmation. Closed jobs remain closed and expose only the explicit **Reopen & publish** action.
- Passive page views, reloads, and student actions do not reset recruiter activity. Recruiter review/status actions do; same-status saves do not create audit activity.
- Kept the policy browser-local and disclosed that it cannot enforce deadlines while closed, securely enforce server-side deadlines, or sync across users/devices.

### Files changed
`assets/js/main.js`, `index.html`, `assets/css/components.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Integrated browser — PASS: publication timestamps/event, 14-day vs. 15+ day fixtures, expiry exclusion from active results, passive reload does not reset the timer, confirmed reconfirmation and audit persistence, invalid timestamp safely expires and records one review event, candidate review/status audit and persistence, same-status no-op, student status remains separate and does not reset recruiter activity, expired editor Preview/Publish guard, closed-state controls, and 390px recruiter mobile navigation/layout without horizontal overflow.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parse / duplicate-ID check — PASS.
- `python tests\regression_test.py` — NOT RUN: could not start because Python Playwright is not installed (`ModuleNotFoundError`).

## Phase 3, Step 3.3 — Recruiter Applicant Management — STATUS: COMPLETE (single-browser demo scope)

### Features implemented
- Added Applicants navigation, actual associated-application counts, listing/status filters, candidate/job search, a safe applicant empty state, and candidate detail expansion.
- Student tracker records explicitly selected for a recruiter listing preserve stable job and recruiter listing IDs. A local profile ID and candidate ID are recorded for newly linked tracker applications where absent.
- Recruiter status updates use separate `recruiterStatus` and `recruiterUpdatedAt` fields. Student-entered status stays intact; no status changes just from viewing the Applicants page, and no notification is claimed.
- Candidate details expose only provided name, headline, education, skills, projects and validated HTTP(S) profile/project links. Private account data and tracker notes are not displayed.
- Applicant records remain within the existing demo profile and recruiter listing storage; no new store or backend was added. External Apply Now does not create tracker records.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Integrated-browser checks — PASS: empty state; tracker application linked to a recruiter listing using stable IDs; only associated jobs shown; candidate profile details and safe links; status update/timestamp persistence; student/recruiter status distinction; job/status/search filters; external Apply Now creates no record; deleted listing and malformed profile handling; and no horizontal overflow at 390px.
- Student application editing preserved recruiter status, timestamp, candidate ID and listing ID. Profile, skills, projects and saved listings were kept intact during test operations; temporary browser fixtures were restored.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parsing / duplicate-ID check — PASS.
- `python tests\regression_test.py` could not start because Python Playwright is unavailable (`ModuleNotFoundError`).

### Known limitations
- Applicants are visible only in this browser's one local demo profile and saved recruiter listing store. Different users/browsers/devices cannot share applications without a backend.
- Recruiter status is a browser-local demo update, not an employer response; no notification is sent. Skills, identity, and project links are not verified.
- No cross-browser, physical-device, keyboard-only or screen-reader testing was performed.

## Phase 3, Step 3.2 — Recruiter Job Publishing & Management — STATUS: COMPLETE (browser-local demo scope)

### Features implemented
- Extended the existing recruiter form to manage title, company, description, skills, location, work mode, job type, eligibility, experience, deadline, optional salary range, and optional official HTTP(S) application URL.
- Added Save as Draft, Preview, Publish, edit, unpublish, close, reopen & publish, and confirmed delete workflows. Dashboard counts and listing status/date display use saved listing data.
- Added title/company search and status filtering. Only Published recruiter listings enter the existing student Job Explorer; Draft, Unpublished, and Closed records are excluded.
- Recruiter-entered details flow into job cards and details. Missing external application links are explained and Apply Now is disabled; no link or application status is invented.
- Preserved recruiter bookmarks across inactive status changes and reattached them on republish. Application records keep their own title/company snapshot when the referenced listing closes or is deleted.
- Corrected edit/preview handling for the publish button and fixed saved-ID cleanup in both published-job refresh and bookmark-toggle flows so inactive recruiter bookmarks survive and reattach.

### Files changed
`assets/js/main.js`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parse and duplicate-ID check — PASS.
- Integrated browser checks — PASS: create/save draft/preview/publish; explorer visibility; details and external apply review; edit without duplicate; unpublish/close/reopen; search/status filter/sort; persistence; bookmark retention and reattachment (including toggling a different bookmark while recruiter job is inactive); application snapshot preservation; deletion confirmation; invalid required fields, unsafe URL and past deadline; missing-URL disclosure; malformed recruiter-storage handling; and mobile recruiter navigation with no horizontal overflow at 390px.
- Student profile, skills, projects and application data were preserved through recruiter close/delete operations.
- `python tests\regression_test.py` could not start because Python Playwright is not installed (`ModuleNotFoundError`).

### Known limitations
- Recruiter records and publication are local to this browser and are not shared or hosted; there is no recruiter authentication, verification, employer response sync or backend.
- Job Explorer integration is local demo publishing only. External application submission is not performed; application records remain student-maintained.
- No physical-device, cross-browser, keyboard-only or screen-reader test was performed.

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

### Bug-fix repair
- Get Started now opens student onboarding directly; only Finish writes profile data, and successful setup routes to the dashboard.
- Onboarding and dashboard support legacy string skills as well as skill objects. Preview displays skill names without object coercion.
- Profile completion reflects five actual saved core fields: name, headline, education, career interests and at least one skill. Optional projects and links are excluded.
- Profile editing permits partial saved data, with Cancel restoring saved values and failed local writes reported honestly.
- The browser-local My Applications tracker stores explicitly student-entered application records in the existing profile. External redirects remain excluded unless the student manually confirms an application and saves a record.
- Malformed profile data is handled without disturbing independent bookmarks or recruiter listings.

### Files changed in this repair
`index.html`, `assets/js/main.js`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- `node --check assets/js/main.js` — PASS.
- Standard-library HTML parse and duplicate-ID check — PASS.
- Integrated-browser flows — PASS: Get Started → onboarding → summary preview → Finish → dashboard; optional preferences; completion at 100% and 80% from actual fields; optional projects excluded; legacy string skills; profile consistency, Save and Cancel; refresh persistence; bookmark interaction; malformed storage; external redirects excluded from My Applications; and job search, filtering, details, and demo Apply Now regression.
- The optional Python Playwright regression script was attempted but could not start because `playwright` is not installed.

### Known limitations
- No backend, no real accounts, no application submission, and no employer-synced status tracking are in place.
- My Applications is not a source of verified outcomes; it stores the student's own status notes only.
- Dashboard data is browser-local only and resets with local demo data resets.

## Demo Profile & Application Tracker — STATUS: IMPLEMENTED (browser-local demo)

### Features implemented
- Added a My Applications route and dashboard preview backed by an `applications` array within the existing `nexora:demo-profile` record. No new profile store or storage key was added.
- Students can select an available listing or enter a job manually, then record title, company, date, method/source, status, and optional notes.
- Status choices are Applied, Viewed, In Review, Shortlisted, Rejected, and Closed. Every value is student-maintained; no status is automatically inferred or synced from an employer.
- Add/edit, status and notes updates, title/company search, status filtering, duplicate detection with an Edit existing action, and confirmed removal are implemented.
- The external job review step offers “I've applied · record it”; it only opens a prefilled, unsaved form. Opening an employer site never creates an Applied record.
- Dashboard and tracker render the same profile records. Application-only profiles can still reopen the student dashboard; incomplete profiles get an honest completion prompt.
- Malformed application arrays are safely treated as empty without changing saved skills/projects or independent bookmarks/recruiter listing storage.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `assets/css/home.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Integrated-browser checks passed for onboarding to dashboard, profile completion prompt, create from a listed job and by manual entry, duplicate resolution, edit status/notes, dashboard consistency, reload persistence, status filters, confirmed deletion, malformed data handling, and no-overflow layout at 390px.
- External Apply Now review was exercised with a temporary browser-local recruiter fixture. Continuing was intercepted to prevent leaving the test page; it did not create an application record. The explicit “I've applied” action opened a prefilled but unsaved form, and only the later Save created a student-entered record.
- Empty required fields and a future date were rejected; invalid controls were announced and focus moved to the first invalid field.
- Regression smoke checks passed for profile edit preserving applications, bookmark add/remove, recruiter navigation, and temporary recruiter draft creation/persistence/counting. Test fixtures were restored.
- `node --check assets/js/main.js` and Python standard-library HTML parse/duplicate-ID checks passed. `python tests\regression_test.py` could not start because Python Playwright is not installed.

### Limitations
- All application data is local to one browser profile, not associated with verified identity, and does not sync to a server or employer.
- A saved status is a student self-report; NEXORA does not confirm submission, employer views, review, rejection, or other outcomes.
- Shipped sample opportunities are fictional demo listings. Selecting one for tracker testing does not make it a real vacancy or an application destination.

## Phase 2, Step 2.3 Part 1 — Student Skills Management — STATUS: COMPLETE (frontend demo scope)

### Features implemented
- Profile skill input is labeled and supports both the Add skill button and Enter.
- Empty names and case-insensitive duplicate names are rejected with inline feedback; editing a skill does not create a duplicate record.
- Students can edit and remove skills. Optional Beginner, Intermediate, or Advanced proficiency is saved only if selected by the student.
- Existing non-listed saved proficiency values remain available as their current saved value when editing; they are not assigned automatically.
- Skills display as wrapping responsive tags. Skill list controls have minimum usable hit targets. Evidence labels remain honest: Self-declared unless a project was explicitly linked.
- Skills persist in the existing `nexora:demo-profile` storage and refresh dashboard overview/completion from the saved profile.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Browser-verified add by button and Enter, no auto-assigned level, empty validation, case-insensitive duplicate rejection, edit without duplication, remove, completion changing from 100% to 80% when the last skill is removed, chosen proficiency persistence, refresh persistence, dashboard consistency, and 390px layout.
- A click hit-target issue discovered during verification was fixed and the Edit button re-tested successfully.
- `node --check` and HTML parse/duplicate-ID checks passed. The optional Python Playwright suite was attempted but could not start without its Python dependency; see `TEST_REPORT.md`.

## Phase 2, Step 2.3 Part 2 — Student Projects & Proof-of-Work Portfolio — STATUS: COMPLETE (frontend demo scope)

### Features implemented
- Added project title, description, technologies, role/contribution, optional GitHub repository URL and optional live-demo URL to the existing Profile editor.
- Required fields and optional URLs are validated; URLs must be HTTP(S), have a hostname, and contain no embedded credentials.
- Projects can be added, edited, and deleted with an explicit confirmation. Profile editor and dashboard overview render the same saved project records.
- Project text is safely escaped. Valid links open in a new tab with `noopener noreferrer`; unsafe legacy stored links are omitted.
- Empty state and truthful “Project added by student” / “Repository link provided” labels make no verification claims.
- Projects use `nexora:demo-profile` and do not count toward profile completion. Skills and explicit project links remain intact; deleting a linked project removes the explicit link.

### Files changed
`index.html`, `assets/js/main.js`, `assets/css/components.css`, `README.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `TEST_REPORT.md`.

### Validation status
- Integrated-browser create, required validation, invalid URL rejection, edit, delete confirm/cancel, persistence, dashboard preview, safe links, malformed project data, and existing skills all checked.
- Job Explorer search/filter, bookmark add/remove, onboarding access and guest return, and recruiter portal navigation smoke checks passed.
- `node --check` and HTML parse/duplicate-ID checks passed. The optional Python Playwright suite could not start because the package is unavailable; see `TEST_REPORT.md`.

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
- No backend: no application submission, employer-synced history/status, recruiter responses, accounts, resume upload or synced bookmarks. Step 1.3 external redirect events remain in memory; the later student-entered local tracker is documented above.
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
