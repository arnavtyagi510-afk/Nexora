# NEXORA — Step 1.2 (homepage, working search, filters, job cards and bookmarks)

NEXORA is a career-tech platform for students, freshers, and job seekers. This ZIP is the complete Phase 1, Step 1.2 build: the design system and homepage (Step 1), plus working search, filters, sorting, informative job cards, persistent bookmarks and an accessibility pass.

## Tech stack

Plain **HTML + CSS + JavaScript**. There is no `package.json`, no build step, no framework, no backend, and nothing to install.

## How to run

**Quickest:** unzip, then double-click `index.html` (or open it in any modern browser). That is all.

**Optional local server** (from this folder, any one of these):

```bash
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .                      # only if you already use Node; nothing is installed into the project
```

An internet connection is only needed for the Google Font (Plus Jakarta Sans). Offline, the page falls back to the system font and still works.

## How to test it

**By hand (2 minutes):**
1. Open `index.html`. Six demo cards appear under "Featured Opportunities" with a "Demo listing" badge.
2. Search `react`, `quarry`, `figma`, or `mumbai` and press Enter. Clear with the × in the search box.
3. Combine filters (for example Type = Job and Work mode = Remote gives an empty state with a way back).
4. Click the bookmark icon on a card, refresh the page, and the bookmark is still there. Click **Saved (N)** to see only bookmarked opportunities.
5. Click **View details** on a card to open the details dialog.
6. Resize the window to phone width, or tab through the page with the keyboard.

**Automated (optional developer tool, not needed to run the site):**

```bash
pip install playwright && playwright install chromium
python3 tests/regression_test.py        # prints PASS/FAIL per check, writes tests/results.json
```

The results of the last run are in `TEST_REPORT.md`.

## Project structure

```
index.html                 Homepage markup (semantic sections + SVG icon sprite)
assets/
  favicon.svg
  css/
    tokens.css             Design tokens: colour, type scale, spacing, radius, shadows, layout
    base.css               Reset, element defaults, focus style, utilities (.sr-only, .container)
    components.css         Buttons, inputs, chips, badges (incl. status badges), cards, segmented control, dialog, toast
    home.css               Homepage layout: header, hero, sections, footer, responsive rules
  js/
    data.js                Central job data: DEMO listings (all fictional) + schema docs. Data only.
    jobs.js                Pure logic, no DOM: normalise, search, filter, sort, card facts, salary/date formatting. window.NexoraJobs
    main.js                UI wiring: menu, rendering, search/filter controls, bookmarks, dialogs
tests/
  regression_test.py       Optional Playwright test suite (see above)
  results.json             Output of the last test run
README.md  PROJECT_CONTEXT.md  PROGRESS.md  TEST_REPORT.md
```

## Design system quick reference

- Colours live in `assets/css/tokens.css` (`--color-bg #F7F5EF`, `--color-primary #244B3B`, `--color-sage`, `--color-mint`, `--color-text`, `--color-text-muted`, `--color-border`). Change them there; do not add new colours.
- Buttons: `.btn .btn--primary | .btn--secondary | .btn--text` (+ `.btn--lg`, `.btn--block`, `.is-loading`, `disabled`).
- Badges: `.badge`, `.badge--sage`, and the listing-status badges `.badge--demo`, `.badge--unverified`, `.badge--verified`.
- Other components: `.chip`, `.card`, `.segmented`, `.input` / `.select`, `.dialog`, `.toast`, `.soon-tag`.
- Icons: add a `<symbol id="i-name">` to the sprite in `index.html`, then use `<svg class="icon"><use href="#i-name"/></svg>`.

## What works today

- Responsive navigation with a working mobile menu (button, Escape, link click, or outside click).
- **Search** (button or Enter) across title, company, skills, tags, description and location. Case-insensitive, every word must match, no fallback results. Clear (×) button.
- **Filters** that combine: type, work mode, location, category, experience, and **Saved only**. Active-filter chips and "Clear all filters".
- **Sorting**: relevance and Title A–Z. "Newest first" and "Compensation" stay disabled until the data has dates and comparable pay.
- Live result count and an empty state (with different wording when nothing is saved yet).
- **Job cards** show company, a status badge (**Demo listing**, **Unverified listing** or **Verified**), title, location, work mode, type, skills, and — only when the data has them — employment type, experience level, compensation, posted date and deadline.
- **Bookmarks** you can toggle on every card, kept across refreshes, counted in the **Saved (N)** button, and kept in step between open tabs.
- **View details** opens a dialog built from the same data. For demo listings it says plainly that nothing can be applied to.

## Bookmarks: what they are and are not

Bookmarks are stored with `localStorage` in the visitor's own browser, under the key `nexora:demo-saved`, as a list of listing ids.

- They are **not account-based** (there is no login) and are **not synced across devices or browsers**.
- Clearing site data, using a private/incognito window, or switching browser removes or hides them.
- If the browser blocks or fills storage, bookmarks still work for the current visit and a message says they will not be kept.
- Corrupted or unexpected stored values are ignored safely.

## How listing status works

- **DEMO**: fictional sample data. Never live, never verified, never accepting applications. All six shipped listings are DEMO.
- **UNVERIFIED**: a real-looking listing that NEXORA has not checked.
- **VERIFIED**: allowed only when the record has a working `evidenceUrl`. A record that says VERIFIED without one is automatically shown as Unverified.
- Links shown in the details dialog (evidence, employer page) appear only for non-DEMO listings that have them, only if they are `http(s)` URLs, and open in a new tab. NEXORA never says an application was submitted, because it cannot submit one.

## Known limitations

- **All opportunities are demo data** from fictional companies. Nothing can be applied to.
- The demo data has no salaries, posting dates, descriptions, application URLs or Full-time/Part-time/Contract/Freelance details, so those filter options and the pay/date sorts are shown disabled. There is no salary filter. Cards show pay and dates only when data exists; that rendering was verified with temporary test data, not with shipped data.
- "View details" is a dialog, not a full job page. The job-details page and application flow are the next step.
- Search matches word starts only ("script" will not find "JavaScript"). Remote listings do not match a city search; searching "remote" matches them.
- Filter state (including Saved only) is not stored in the URL and resets on reload.
- **Not built yet** (marked "Soon" or shown with a dialog): Sign In, Get Started, Companies, Resources, View All, About, Contact, Privacy, Terms.
- No authentication, database, recruiter tools, or real job API. Contact details and legal text are deliberately not included.
- Tested in headless Chromium only (see `TEST_REPORT.md` for what was and was not tested).

See `PROJECT_CONTEXT.md` and `PROGRESS.md` for the development handoff.
