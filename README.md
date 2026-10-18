# NEXORA — Phase 4, Step 4.3 (Skill Gap Analyzer)

NEXORA is a career-tech platform for students, freshers, and job seekers. This project keeps the existing homepage and job-discovery flows intact while adding frontend-only student and recruiter portals.

## Phase 4.3 highlights

- Added a student dashboard analyzer for generic career roles (Frontend Developer, Backend Developer, Full-Stack Developer, Data Analyst, AI/ML Engineer, Cybersecurity Analyst, or custom) and active NEXORA job listings.
- Generic comparisons use editable, clearly labelled demo skill templates. Job-specific comparisons use the selected listing's recorded skill list and show its recorded qualifications separately; unrecorded requirements are not inferred.
- Skill matching is exact after case/whitespace normalization. Matching includes both Self-declared and Project-linked profile skills; project evidence is shown separately, and completed Project Defense is only identified as an assessment completed, never as independent verification.
- Name-match coverage uses `unique matching target skill names / unique recorded target skill names × 100`. It is an explanatory comparison ratio, not an ability or employability score. No percentage is displayed when the target provides no skill list.
- The ordered roadmap creates practical exercises for missing skills and evidence gaps; existing projects are suggested when their saved fields mention the skill. Students can check progress, edit/remove steps, add custom steps, or reset the roadmap after confirmation.
- The analysis and roadmap are stored in `nexora:demo-profile` alongside existing skills, projects, applications, and Project Defense sessions. No extra storage key, AI service, live market data, course links, or dependency was introduced.
- This is a rule-based browser-local demo; there is no backend or AI analysis, job-market feed, independent skill verification, or cross-device progress sync.

## Phase 4.2 highlights

- Students can start a Project Defense from a sufficiently complete saved project or select one in the student portal. Six one-at-a-time prompts cover architecture, implementation choices, technical challenges, debugging, trade-offs, and individual contribution.
- Prompts are deterministic/rule-based and interpolate only saved project details. Repository URLs are noted as student-provided; NEXORA does not inspect repositories or use a live AI provider.
- Draft answers, progress, completed sessions, and a response summary are saved in the existing `nexora:demo-profile` record as `defenseSessions`; no new storage key or dependency was added. Empty answers are supported and appear as unanswered.
- The summary reports response count, a plainly disclosed 20-word detail heuristic, unanswered topics, and review suggestions. It is indicative practice feedback, not an objective skill assessment or verification.
- Completed results are private by default. A student can explicitly share or revoke sharing per session; only completed sessions with current sharing consent appear in the local recruiter candidate details. Recruiter display includes the selected project, prompts, answers, and transparent summary.
- Skill evidence stays **Self-declared** or **Project-linked**. A defense completion is labeled as a completed assessment only; it never marks a skill Independently verified. If the project is later deleted, the saved session remains with a clear historical-project label.
- Data is browser-local. It cannot safely share with other users, browsers, or devices, and there is no real AI, backend, identity check, independent repository inspection, or authenticated permission enforcement.

## Phase 4.1 highlights

- Recruiters can maintain a local Company Profile with company name, official website, business email domain, description, industry, location, public links, and optional reviewer supporting information. Profile and requests persist in `nexora:demo-company-profile`.
- Request submission validates the website, email domain, and public links. A saved request remains **Pending Review**; this app has no authorized reviewer and can never grant **Verified**. Website/domain/document details alone are not treated as proof. The interface explains Not Submitted, Pending Review, Verified, and Rejected.
- Company trust is separate from job publication and the 15-day recruiter activity status. Job Explorer cards, recruiter listings, and details show the separate company trust status; matching uses company name. Job details disclose provided public company information and allow reporting.
- Students can report a job or recruiter for suspected scam, payment requested, misleading description, impersonation, suspicious external link, or another concern, with optional details. Reports persist in `nexora:demo-job-reports`; duplicate job/reason reports are blocked. A confirmation says the report is local and unreviewed.
- Malformed company/report storage is reported without overwriting it. Neither these local records nor reviewer history are tamper-proof.
- A real verification/report-review workflow, reviewer feedback, cross-device syncing, and fraud prevention require authorized backend services. No documents are uploaded or email notifications sent.

## Phase 3.4 highlights

- Published recruiter listings receive a publication timestamp and initial activity event. The 15-day review deadline uses the latest recorded recruiter action, falling back to the publication timestamp.
- Candidate-detail review, recruiter applicant-status changes, explicit vacancy reconfirmation, closing, unpublishing, and expiry/review are recorded as dated listing events. Applicant-linked events store only the application ID; the event history is bounded to the latest 100 entries.
- Published listings that reach 15 days without a valid recruiter activity timestamp become **Needs Review** (stored as `Expired`) and are removed from active Job Explorer results. Draft, Closed, and Unpublished remain distinct states.
- Recruiters can explicitly reconfirm Published or expired listings after confirmation. An expired listing cannot be republished through the editor's Preview/Publish path; closed listings require the clearly labelled **Reopen & publish** action.
- The dashboard shows last recruiter activity, the review deadline/countdown, and listings needing review. Opening the portal or refreshing does not reset the review window; student actions do not update recruiter activity.
- This is a browser-local demo check, not secure enforcement: it runs on page load and periodically while open, cannot run while the browser is closed, and cannot synchronize devices or users. A backend and scheduled server-side job would be required for reliable enforcement.

## Phase 3.3 highlights

- Recruiter **Applicants** shows only student-tracker records associated with a saved recruiter listing by stable recruiter listing/job IDs. Manually entered, unlinked records and applications to other jobs are excluded.
- Candidate details show only profile fields the student supplied: name/headline, education, skills, projects and valid portfolio/repository links. No email, password, private account data, or application notes are exposed.
- Recruiters can save a separate local demo status (Applied, Viewed, In Review, Shortlisted, Rejected, Closed) with a timestamp. It does not overwrite the student-entered status and sends no notification.
- Data uses the existing `nexora:demo-profile` and `nexora:demo-recruiter-listings` records; no applicant store or backend was added.
- This is a single-browser demo with one local student profile. It cannot receive or share applications between different users, browsers, or devices. External Apply Now does not record a submitted application.

## Phase 3.2 highlights

- Recruiters can create, preview, save drafts, publish, edit, unpublish, close/reopen, search/filter, and delete their own job listings. Dashboard counts and dates come from saved listing records.
- Recruiter jobs use the separate `nexora:demo-recruiter-listings` localStorage key. Only Published records appear in the existing student Job Explorer; Draft, Unpublished, and Closed records are excluded.
- Job details use recruiter-entered data, including eligibility, required skills, deadline, salary range, and a supplied official application URL. Missing application links are stated plainly; no URL is fabricated.
- Saved-job bookmarks remain associated with Published recruiter jobs while listings are unpublished or closed, and applications retain their saved job snapshot if a listing later closes or is deleted.
- Listings and publishing are browser-local demo data, not shared or hosted. No recruiter account, verification, backend, employer response sync, or real application submission is claimed.

## Phase 3.1 foundation

- A separate recruiter dashboard and **My Job Listings** page with total, active (marked Published locally), and draft counts based only on saved recruiter records.
- Create and edit local listing drafts with title, company, description, location, job type, work mode, required skills, optional official application URL, and Draft / Published / Closed status.
- Delete requires browser confirmation. Required fields are validated, and application URLs must be HTTP(S) without embedded credentials.
- At the Step 3.1 foundation stage, listings were local-only. Step 3.2 extends them into this browser's Job Explorer; there is still no backend or shared/public server publishing.
- Recruiter navigation stays separate from the student portal and links back to the main job explorer. User-entered listing text is escaped before it is rendered.
- The established forest-green and ivory design, guest browsing, student experience, and existing demo opportunities remain intact.

## Phase 2.2 highlights

- Get Started opens student onboarding directly; the summary is only a preview and profile data is saved only when setup is finished.
- Student dashboard with a welcome message and an accessible completion meter based on five saved core fields: name, headline, education, career interests, and at least one skill. Projects and links remain optional.
- Student profile page with editable fields: name, headline, education, college, graduation year, career interests, desired roles, work modes, preferred locations, skills, GitHub and portfolio links.
- Save, cancel, onboarding, dashboard and profile views use the existing `nexora:demo-profile` browser-local structure; legacy string skills and saved skill objects are both supported.
- Saved Jobs reuses the job explorer's bookmark list. My Applications now provides a browser-local tracker inside the existing demo profile. Students can add a listed or manual job record, maintain its status and notes, filter/search, edit, and remove it. Records are not employer-confirmed or synced.
- Students can add skills with a button or Enter, edit and remove them, and select an optional proficiency (Beginner, Intermediate, Advanced). Empty and case-insensitive duplicate names are rejected.
- Skills and projects remain in the existing `nexora:demo-profile` data; the dashboard overview and completion meter update from saved skills. Skill evidence is labeled Self-declared unless the student explicitly links a project.

This is a demo-only frontend experience. No real backend authentication, password storage, recruiter verification, shared/server job publishing, application submission, or employer-synced status tracking is claimed.

## Tech stack

Plain **HTML + CSS + JavaScript**. There is no `package.json`, no build step, no framework, no backend, and nothing to install.

## Validation status

Actual validation performed:
- Step 4.1 integrated-browser checks covered company profile create/edit and refresh persistence; validation of optional profile fields versus required request fields; Pending Review without a false Verified state; rejected-record explanation and resubmission; downgrade of a locally supplied Verified value; matching pending company status on job cards/details; report reasons, required-reason validation, report persistence, duplicate prevention and truthful confirmation; malformed storage handling; 390px Trust Center navigation/layout; and preserved recruiter publishing, bookmarks, application tracking and 15-day expiry.
- Step 4.1 test fixtures were restored after each integrated-browser check.
- Static JavaScript syntax and HTML duplicate-ID checks passed. `python tests\regression_test.py` could not start because Python Playwright is unavailable (`ModuleNotFoundError`).
- Step 3.4 integrated-browser checks verified initial publication timestamps/events, an aged listing expiring while a 14-day listing remained active, no timer reset from opening/reloading, removal from active results, confirmed reconfirmation and restored visibility, invalid timestamp handling with a persisted single review event, and no duplicate event after refresh.
- Step 3.4 browser checks verified candidate review and recruiter status-change events/timestamps, no event for a same-status save, status persistence without overwriting the student-entered status, and that a student status update does not alter recruiter activity. Closed listings remained closed and had no reconfirm action; the explicit reopen action was shown. An expired listing's editor Preview/Publish route was blocked in favor of Reconfirm Vacancy.
- At 390px, the mobile menu opened the recruiter portal and the listing with review details had no horizontal overflow.
- Step 3.4 fixtures were removed after browser checks. `node --check assets/js/main.js` passed; Python standard-library parsing of `index.html` passed with no duplicate IDs.
- `python tests\regression_test.py` was attempted but could not start because Python Playwright is unavailable (`ModuleNotFoundError`). The interactive browser checks are not a run of that automated suite.
- Step 3.3 integrated-browser checks covered the empty Applicants state, saving a tracker application linked to a recruiter listing by stable IDs, excluding an unlinked manual record, candidate details and safe provided links, recruiter status/timestamp persistence, recruiter-vs-student status distinction after student editing, listing/status/search filters, external Apply Now not creating a record, deleted-job and malformed-profile handling, and 390px layout.
- Step 3.3 browser fixtures were temporary and restored after the checks.
- Step 3.2 integrated-browser checks against the local `file://` page covered draft creation and preview, publishing into Job Explorer, recruiter-entered detail fields, edit without duplication, unpublish/close/reopen, search and status filters, sorting, persistence after reload, bookmark retention and reattachment, safe application snapshots after close/delete, delete confirmation, and recruiter mobile navigation/layout.
- Step 3.2 validation checks rejected empty required fields, a `javascript:` application URL, and a past deadline while retaining the form values. A published listing without a URL displayed the missing-link explanation and disabled Apply Now.
- Step 3.2 malformed recruiter storage rendered an explicit unavailable state and unknown counts rather than crashing or reporting empty success.
- Step 3.2 existing-data regression check kept student profile, skills, projects, bookmarks, and application records intact during recruiter listing close/delete flows.
- Static JavaScript validation: `node --check assets/js/main.js` passed.
- Python standard-library HTML parsing found no duplicate element IDs in `index.html`.
- Integrated browser automation against a local HTTP server exercised recruiter required-field validation, unsafe URL rejection, draft creation, safe rendering, reload persistence, edit/status counts, published-state disclosure, and confirmed deletion.
- Integrated browser regression checks confirmed student dashboard/profile navigation, all six existing job cards, keyword search, the Internship filter, job details, and the honest demo Apply Now flow.
- Integrated browser checks against the local `file://` page exercised Get Started → onboarding → save → dashboard, optional onboarding preferences, preview without premature persistence, completion calculation, profile display/edit/save/cancel, refresh persistence, bookmark behavior, malformed profile storage, and the truthful applications empty state after an external redirect record.
- Current application-tracker browser checks exercised onboarding to dashboard, profile completion guidance, existing-listing application entry, notes/status editing, duplicate prevention and edit-existing resolution, dashboard/My Applications consistency, reload persistence, status filtering, deletion confirmation, safe handling of malformed tracker data, and the external redirect-to-manual-record flow.
- Current regression browser checks exercised profile editing with application preservation, bookmark add/remove, recruiter portal navigation without changing recruiter listing data, and a 390px application layout without horizontal overflow.
- Integrated browser skill-management checks exercised add by button/Enter, empty and case-insensitive duplicate rejection, selected and unselected proficiency, edit/remove, refresh persistence, dashboard consistency, completion changes, and a 390px no-overflow layout.
- Integrated browser project checks exercised empty and required-field states, unsafe URL rejection, add/edit, student-added preview labels, safe new-tab link attributes, delete confirm/cancel, persistence and dashboard consistency, malformed/unsafe stored data handling, and mobile overflow.

The optional Python Playwright regression suite was attempted but could not start because the Python `playwright` package is unavailable. The browser checks above were performed in the integrated browser and are not a Playwright test-suite run. Earlier Step 1.3 results documented below are historical, not a fresh full-suite run for this change.

## How to run

**Quickest:** unzip, then double-click `index.html` (or open it in any modern browser). That is all.

**With Live Server (VS Code):** open the folder, right-click `index.html`, choose "Open with Live Server".

**Optional local server** (from this folder, any one of these):

```bash
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .                      # only if you already use Node; nothing is installed into the project
```

An internet connection is only needed for the Google Font (Plus Jakarta Sans). Offline, the page falls back to the system font and still works.

## How to try the new features by hand (3 minutes)

### Demo access and student onboarding (Steps 2.1–2.2)

- Use **Get Started** in the header or mobile menu to open the four-step student onboarding directly. Enter your name, education, and at least one skill; preferences, career interests, projects, and links can remain incomplete. Optional links accept only `http` or `https`.
- Review the summary, then choose **Finish setup** to save the profile to this browser and open the dashboard. The summary does not save changes before Finish. Edit Profile supports Save and Cancel; Cancel discards unsaved form edits.
- This is browser-local demo access, not real authentication. No password is saved and no backend account is created. **Sign In** remains a demo-only interface and does not send reset emails.

### My Applications (local demo tracker)

- Open **My Applications** from the student portal and choose **Add application**. Select an available listing to copy its title and company, or choose manual entry. Shipped sample opportunities are fictional; their presence in the tracker does not make them real vacancies.
- Enter the application date, method/source, a status, and optional notes. Status options are Applied, Viewed, In Review, Shortlisted, Rejected, and Closed. You maintain these values; no employer response is received or implied.
- If you followed an external application link, NEXORA does not record an application automatically. After submitting on the employer’s site, use **I've applied · record it** in the review view or add a record manually. Save is still required.
- Records are stored in `nexora:demo-profile` with the rest of this browser’s student profile. Duplicate jobs are blocked; use **Edit existing application** to update the existing record. Removing a record asks for confirmation.

### Student skills (Step 2.3, Part 1)

- Open **Profile** from the student dashboard or site navigation. Add a skill with **Add skill** or press Enter; optionally choose a proficiency level yourself.
- Edit or remove a saved skill with its controls. Names must be non-empty and unique regardless of capitalization.
- Skills are stored with the browser-local profile and shown in the dashboard overview. “Project-linked” appears only when a project is explicitly selected; no verification or endorsement is implied.

### Student projects and proof of work (Step 2.3, Part 2)

- In **Profile**, add a project with a title, description, technologies, and your role/contribution. These fields are required; GitHub repository and live-demo URLs are optional and must be valid HTTP(S) URLs.
- Edit an existing project or use Delete; deleting requires confirmation. Project records are stored in the same browser-local profile as skills and remain optional for profile completion.
- The dashboard profile overview shows project details and available links. Links open in a new tab with `noopener noreferrer`. “Project added by student” and “Repository link provided” are descriptive labels only; NEXORA does not verify projects, repository contents, contributions, or skills.
- A **Reset demo profile data** button clears the locally saved onboarding data. The job explorer remains available as the guest experience, and users can return to browsing at any time without losing the search/filter state in the list.

### Recruiter portal (Steps 3.1–3.4)

- Choose **Recruiter** in the site menu to open the separate recruiter workspace; it does not require or create an account.
- Choose **Create Job**, enter the required fields, and use **Save as Draft**, **Preview Job**, or **Publish Job**. Published listings appear in this browser's student Job Explorer; they are not shared with other visitors.
- Use **Edit**, **Unpublish**, **Close**, or **Reopen & publish** to manage a saved record. Search/filter the list by title, company, and status. Delete asks for confirmation.
- Only a recruiter-supplied HTTP(S) application URL is available to students. Without one, the job details explain that no usable external application link was provided.
- Recruiter listings are independent of student profile data. Bookmarking and applications remain local to this browser; no external submission or employer response is implied.
- **Applicants** shows only records saved through this browser's student tracker and linked by listing/job ID. Candidate details contain only student-provided profile information. Recruiter demo statuses are separate, local-only values; no student notification is sent.
- A local recruiter workspace cannot receive applications from another user, browser, or device. Do not use this demo to handle real applicant information.

### Company Trust Center & job reports (Step 4.1)

- In the recruiter portal open **Company Trust Center** to save or edit a company profile. Company name is needed to save; a verification request additionally needs a valid HTTP(S) website and business email domain.
- **Submit verification request** stores a local request as **Pending Review**. No reviewer is connected, so it cannot become **Verified**. Website/domain information is not proof by itself. Supporting information is only stored locally; no document is uploaded.
- Company trust status appears separately from the job's publication status and the recruiter's 15-day activity policy. Job details show matching provided public company information.
- Use **Report this job or recruiter** in job details to choose a reason and optionally add details. A duplicate report for the same job and reason is blocked. Reports are browser-local and are not reviewed or resolved by this demo.

1. Open `index.html` and click **View details** on any card. The dialog shows that job's own data, a **Demo listing** badge, and plain wording that it is fictional. Use the **X**, the **Close** button, **Escape**, or a click outside to close. Your search and filters are untouched, and focus returns to the card.
2. In the dialog click **Apply Now**. For these demo listings you get a friendly explanation that it is sample data and cannot accept an application. You stay on NEXORA and nothing is sent or saved.
3. Click **Save job** in the dialog, close it, and the card's bookmark is filled and **Saved (N)** has gone up. Both use the same saved list.
4. Search, filter or sort first, then open a card: it is always the right job.
5. To see the real-URL flow, the shipped data has none (by design), so use the automated tests (below) or temporarily give one test listing in `assets/js/data.js` `status: "UNVERIFIED"` and `applyUrl: "https://example.com/apply"`. Then **Apply Now** opens a review step (title, company, website, "you are leaving NEXORA", caution for unverified listings) and **Continue to application** opens the site in a new tab. Undo that edit afterwards: do not ship made-up listings or links.

## Automated tests (optional developer tool, not needed to run the site)

```bash
pip install playwright && playwright install chromium
python3 tests/regression_test.py          # everything (77 checks), writes tests/results.json
python3 tests/regression_test.py core     # the 18 core regression tests
python3 tests/regression_test.py part2    # Step 1.2 card/status/bookmark/accessibility checks
python3 tests/regression_test.py part3    # Step 1.3 details and apply-flow checks
```

The results of the last run are in `TEST_REPORT.md`.

## Project structure

```
index.html                 Homepage markup (semantic sections, SVG icon sprite, the one shared dialog)
assets/
  favicon.svg
  css/
    tokens.css             Design tokens: colour, type scale, spacing, radius, shadows, layout
    base.css               Reset, element defaults, focus style, utilities (.sr-only, .container)
    components.css         Buttons, inputs, chips, badges, cards, dialog (+ job details/apply styles), toast
    home.css               Homepage layout: header, hero, sections, footer, responsive rules
  js/
    data.js                Central job data: DEMO listings (all fictional) + schema docs. Data only.
    jobs.js                Pure logic, no DOM: normalise, search, filter, sort, card facts, formatting, apply-destination rules. window.NexoraJobs
    applications.js        External redirect event structure + in-memory store seam. No backend. window.NexoraApplications
    main.js                UI wiring: student profile and local application tracker, search/filter, bookmarks, details dialog and apply flow
tests/
  regression_test.py       Optional Playwright test suite (see above)
  results.json             Output of the last test run
README.md  PROJECT_CONTEXT.md  PROGRESS.md  TEST_REPORT.md
```

## Design system quick reference

- Colours live in `assets/css/tokens.css` (`--color-bg #F7F5EF`, `--color-primary #244B3B`, `--color-sage`, `--color-mint`, `--color-text`, `--color-text-muted`, `--color-border`). Change them there; do not add new colours.
- Buttons: `.btn .btn--primary | .btn--secondary | .btn--text` (+ `.btn--lg`, `.btn--block`, `.is-loading`, `disabled`).
- Badges: `.badge`, `.badge--sage`, and the listing-status badges `.badge--demo`, `.badge--unverified`, `.badge--verified`.
- Other components: `.chip`, `.card`, `.segmented`, `.input` / `.select`, `.dialog`, `.toast`, `.soon-tag`. Step 1.3 adds `.dialog--job` and `.jv__*` (details/apply layout) using only existing tokens.
- Icons: add a `<symbol id="i-name">` to the sprite in `index.html`, then use `<svg class="icon"><use href="#i-name"/></svg>`.

## What works today

- Everything from Step 1.2: responsive navigation and mobile menu; search; combining filters; sorting where the data supports it; result counts and empty states; status badges; bookmarks with **Saved (N)** and **Saved only**.
- **Job details** (the existing dialog, now structured): company and placeholder logo, status badge, opportunity type, work mode, location, employment type, experience, compensation, posting date and deadline (each only when the data has it), skills, a readable multi-paragraph description, and responsibilities / qualifications / benefits only if the record has them. A "Not provided for this listing" line names what is unknown. Content is inserted as text only.
- **Apply Now**, which always follows the listing's real data:
  - **DEMO**: explains it is sample data and cannot accept an application; stays on NEXORA; never opens any URL.
  - **No usable application URL**: the button is marked unavailable and a visible message says why.
  - **Official URL (UNVERIFIED or VERIFIED)**: a review step shows the job, company and website domain, says you are leaving NEXORA, adds a caution for unverified listings (and for plain `http`), then **Continue to application** opens the site in a new tab with `noopener noreferrer`. Opening it is not treated as an application.
  - Only `http(s)` URLs with a real host and no embedded `user:password@` are accepted. `javascript:`, `data:`, `ftp:`, `//host` and malformed values are rejected.
- **Save job** inside the dialog uses the same bookmark list as the cards.
- **Accessibility**: native modal dialog (focus kept inside, background inert), labelled by the job title, X / Close / Escape / backdrop to close, page scroll locked while open and released after, focus restored to the opening card (or the Saved button if that card is gone), status messages announced in a live region.

## Application records: separate local tracker and redirect events

The **My Applications** UI stores records inside the existing `nexora:demo-profile` browser-local profile. It captures the job title, company, application date, student-entered method/source, one of six student-maintained statuses, and optional notes. Student-entered status is labeled as such and is not employer-confirmed. Records survive reload in this browser and are not synced to other devices or users.

- Separately, `assets/js/applications.js` defines an in-memory external-redirect event shape (`applicationId, jobId, candidateId, createdAt, method, status, destinationHost`) with `method: "external_redirect"` and `status: "EXTERNAL_REDIRECT_OPENED"`. An external redirect does not create a My Applications entry or assert that the visitor applied.
- NEXORA does not submit applications. A student must explicitly save their own record after submission; that is a local self-report, not proof of submission.
- No resumes, phone numbers, emails or other personal data are collected.

## Bookmarks: what they are and are not

Bookmarks are stored with `localStorage` in the visitor's own browser, under the key `nexora:demo-saved`, as a list of listing ids.

- They are **not account-based** (there is no login) and are **not synced across devices or browsers**.
- Clearing site data, using a private/incognito window, or switching browser removes or hides them.
- If the browser blocks or fills storage, bookmarks still work for the current visit and a message says they will not be kept (in the dialog the message appears inside the dialog, because a toast would sit behind it).
- Corrupted or unexpected stored values are ignored safely.

## How listing status works

- **DEMO**: fictional sample data. Never live, never verified, never accepting applications. All six shipped listings are DEMO.
- **UNVERIFIED**: a real-looking listing that NEXORA has not checked.
- **VERIFIED**: allowed only when the record has a working `evidenceUrl`. A record that says VERIFIED without one is automatically shown as Unverified.

## Known limitations

- **All opportunities are demo data** from fictional companies. Nothing can be applied to, and no shipped listing has a salary, dates, description or application URL. The real-URL flow was tested with temporary test data (and a mocked external site), not with shipped data.
- **NEXORA cannot submit applications or sync employer outcomes/responses.** The local tracker stores only student-entered notes and statuses in this browser. There is no backend, real login, or recruiter-to-student status connection.
- "View details" is a dialog, not a separate page, and has no shareable URL.
- Search matches word starts only ("script" will not find "JavaScript"). Remote listings do not match a city search; searching "remote" matches them.
- Filter state (including Saved only) is not stored in the URL and resets on reload.
- **Not built yet** (marked "Soon" or shown with a dialog): real authentication, Companies, Resources, View All, About, Contact, Privacy, Terms.
- On a phone the **Apply Now** button sits below the description, so a long listing needs a scroll inside the dialog.
- Tested in headless Chromium only (see `TEST_REPORT.md` for what was and was not tested).

See `PROJECT_CONTEXT.md` and `PROGRESS.md` for the development handoff.
