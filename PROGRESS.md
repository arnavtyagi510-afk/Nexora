# NEXORA — Progress

## Phase 1, Step 1.2 (Parts 1 and 2) — STATUS: COMPLETE

### Features implemented across Step 1.2
**Part 1**
- Central job data structure with full schema (`data.js`) separated from logic (`jobs.js`) and UI (`main.js`).
- Search (button + Enter, clear button, no fallback results), filters (type, work mode, location, category, experience) that combine, active chips, Clear all.
- Sorting: relevance, Title A–Z; newest/pay disabled with an explanation (no data).
- Accurate result count and empty state with Edit search / Clear all filters.
- Popular chips and category cards run real searches; nav links reset/set filters.

**Part 2**
- Job cards: consistent layout; type, work mode, location always; employment type, experience, compensation, posted date and deadline only when known; skills only when present; "Remote" shown once.
- Listing status: DEMO / UNVERIFIED / VERIFIED badges that follow real evidence (VERIFIED needs a valid `evidenceUrl`, otherwise shown Unverified). `http(s)`-only URLs.
- "View details" (existing dialog, enriched): facts, status note, evidence/employer links only for non-DEMO listings with links. No claim that anything was applied for or submitted.
- Bookmarks: toggle, persistence in `localStorage`, validation of stored data, graceful handling of blocked/full storage (kept for the visit + user told), cross-tab sync, **Saved (N)** count and **Saved only** filter wired to the same single source of truth, empty state when nothing is saved.
- Accessibility: stable accessible names + `aria-pressed` on bookmark buttons, named View-details buttons, live regions, labelled navs, dialog description, visible focus rings on fields and filters, hidden empty active-filter list. Contrast of all token pairs checked (>= 4.5:1).
- Robustness: `main.js` no longer throws when optional elements are missing.
- `tests/regression_test.py` (48 checks), `TEST_REPORT.md`, updated README / PROJECT_CONTEXT / PROGRESS.

### Files changed in Part 2
`index.html` (icons, Saved toggle, dialog structure, ARIA), `assets/css/components.css` (appended: status badges, focus ring, dialog extras), `assets/js/jobs.js` (added formatting/card-fact/safety helpers; search scoring, facet matching and sorting functions untouched; `validDate` now rejects impossible dates, `normalize` sanitises URLs, `defaultState`/`run`/`activeFilters` gained the saved-only filter), `assets/js/main.js` (reworked in place, same structure and behaviour plus the additions above), docs, new `tests/`. `data.js`, `tokens.css`, `base.css`, `home.css`, `favicon.svg` are unchanged.

### Test results
48 of 48 automated checks PASS in headless Chromium, including all 18 required regression tests. See `TEST_REPORT.md` for the full table, the bugs found and fixed in Part 1 code, and the NOT TESTED list.

### Known bugs and limitations
- Demo data only (6 fictional listings): no salary, dates, descriptions, application URLs or employment sub-types, so there is no salary filter, and newest/pay sorts and Full-time/Part-time/Contract/Freelance/Experienced options are disabled.
- Pay/date/verified/link rendering has been verified only with temporary test data, not shipped data.
- Bookmarks are browser-local: not account-based, not synced across devices, lost if site data is cleared or in private browsing.
- Remote jobs don't match a city location search (by design; "remote" does match).
- Search matches word starts only ("script" will not find "JavaScript").
- Filter state (including Saved only) is not in the URL and resets on reload.
- "View details" is a dialog, not a page.
- NOT TESTED: real screen readers, Firefox/Safari/Edge, real touch devices, the Google Font itself (sandbox offline), axe/Lighthouse audits, forced-colors mode, 200% zoom, printing.
- Google Font needs internet.

### Remaining work (later steps)
Job details page, application flow and application tracking, auth/accounts and synced bookmarks, real opportunity data and verification process, recruiter portal, backend, the pages marked "Soon", legal and contact content.

### Exact next step
**Phase 1, Step 1.3 — Job Details and Application Flow.**

Handoff notes for Step 1.3:
- Keep the plain HTML/CSS/JS architecture and the design tokens; do not add colours.
- `showDetails(o)` in `main.js` is where the dialog is built today. Replace or extend it; `Jobs.cardFacts(o)` supplies the displayable facts and `Jobs.safeUrl` guards links.
- Preserve status honesty: DEMO listings have nothing to apply to; never display "applied/submitted" unless an application was really recorded; VERIFIED requires `evidenceUrl`.
- Listing ids are numbers; bookmarks are stored by id under `nexora:demo-saved`. Use the `nexora:` prefix for any new storage key.
- `tests/regression_test.py` checks P2-03 and P2-07 assume the `#dialog` details; update them if the dialog is replaced. Run the whole suite before and after.
