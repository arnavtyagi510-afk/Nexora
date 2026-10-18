# NEXORA — Phase 3, Step 3.1 (recruiter portal foundation)

NEXORA is a career-tech platform for students, freshers, and job seekers. This project keeps the existing homepage and job-discovery flows intact while adding frontend-only student and recruiter portals.

## Phase 3.1 highlights

- A separate recruiter dashboard and **My Job Listings** page with total, active (marked Published locally), and draft counts based only on saved recruiter records.
- Create and edit local listing drafts with title, company, description, location, job type, work mode, required skills, optional official application URL, and Draft / Published / Closed status.
- Delete requires browser confirmation. Required fields are validated, and application URLs must be HTTP(S) without embedded credentials.
- Listings use a separate `nexora:demo-recruiter-listings` localStorage key; no recruiter account, backend, public publishing, employer verification, or public job-explorer integration is claimed.
- Recruiter navigation stays separate from the student portal and links back to the main job explorer. User-entered listing text is escaped before it is rendered.
- The established forest-green and ivory design, guest browsing, student experience, and existing demo opportunities remain intact.

## Phase 2.2 highlights

- Student dashboard with a welcome message and profile completion meter based on locally stored demo profile data.
- Student profile page with editable fields: name, headline, education, college, graduation year, career interests, desired roles, work modes, preferred locations, skills, GitHub and portfolio links.
- Save-and-sync flow uses the existing `nexora:demo-profile` browser-local structure and reuses the same bookmark list as the job explorer.
- Dashboard cards for Saved Jobs, My Applications and Profile Overview use truthful empty states where features are not backed by a real backend.
- Skills and projects from Step 2.3 remain locally saved, user-managed profile data with no verification claims.

This is a demo-only frontend experience. No real backend auth, password storage, recruiter verification, job publishing, or application tracking is claimed.

## Tech stack

Plain **HTML + CSS + JavaScript**. There is no `package.json`, no build step, no framework, no backend, and nothing to install.

## Validation status

Actual validation performed:
- Static JavaScript validation: `node --check assets/js/main.js` passed.
- Python standard-library HTML parsing found no duplicate element IDs in `index.html`.
- Integrated browser automation against a local HTTP server exercised recruiter required-field validation, unsafe URL rejection, draft creation, safe rendering, reload persistence, edit/status counts, published-state disclosure, and confirmed deletion.
- Integrated browser regression checks confirmed student dashboard/profile navigation and that the six existing job cards and keyword search still work.

The existing optional Python Playwright regression suite was not run in this environment because the Python Playwright package is unavailable. Earlier Step 1.3 test results documented below are historical results, not a fresh full-suite run for this change.

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

### Demo authentication and onboarding (Step 2.1)

- Open the page and use **Sign In** or **Get Started** in the header or mobile menu. This is a browser-only demo flow: it validates form fields, shows password visibility toggles, and stores non-sensitive profile data in the visitor's local browser storage. It does not create a secure real account or send reset emails.
- On **Get Started** you create a demo profile, then a four-step student onboarding experience appears. Required fields are validated before you can continue, and optional links are only accepted if they use `http` or `https`.
- A **Reset demo profile data** button clears the locally saved onboarding data. The job explorer remains available as the guest experience, and users can return to browsing at any time without losing the search/filter state in the list.

### Recruiter portal (Step 3.1)

- Choose **Recruiter** in the site menu to open the separate recruiter workspace; it does not require or create an account.
- Create a listing, enter the required fields, and choose **Save draft**. Reopen the portal or reload the page to see that it persists in this browser.
- Edit a listing to set Draft, Published, or Closed. Published is only a local demo status and does not make a job available to job seekers.
- Delete asks for confirmation. Recruiter records are independent of the central demo job data and existing bookmarks.

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
    applications.js        Application-record structure + in-memory store seam. No persistence, no backend. window.NexoraApplications
    main.js                UI wiring: menu, rendering, search/filter controls, bookmarks, details dialog and apply flow
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

## Application records: what exists and what does not

`assets/js/applications.js` defines the record shape (`applicationId, jobId, candidateId, createdAt, method, status, destinationHost`) and an in-memory store with a `save/list` interface a future backend can replace.

- Opening an external site is recorded only as `method: "external_redirect"`, `status: "EXTERNAL_REDIRECT_OPENED"`, meaning the visitor was sent to the employer. NEXORA cannot know whether they applied. It is **never** "Submitted".
- `SUBMITTED` is reserved for applications really submitted through NEXORA. `createRecord` refuses that method until a backend exists.
- Records live in memory for the page visit only. Nothing is written to `localStorage`, nothing is sent anywhere, and nothing about them is shown in the UI yet.
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
- **NEXORA cannot submit applications, track outcomes or show recruiter responses.** There is no backend, login, resume upload or application history.
- "View details" is a dialog, not a separate page, and has no shareable URL.
- Search matches word starts only ("script" will not find "JavaScript"). Remote listings do not match a city search; searching "remote" matches them.
- Filter state (including Saved only) is not stored in the URL and resets on reload.
- **Not built yet** (marked "Soon" or shown with a dialog): Sign In, Get Started, Companies, Resources, View All, About, Contact, Privacy, Terms.
- On a phone the **Apply Now** button sits below the description, so a long listing needs a scroll inside the dialog.
- Tested in headless Chromium only (see `TEST_REPORT.md` for what was and was not tested).

See `PROJECT_CONTEXT.md` and `PROGRESS.md` for the development handoff.
