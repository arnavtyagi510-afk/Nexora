# NEXORA — Test Report (Phase 1, Step 1.2)

Every PASS below comes from a check that was actually executed by `tests/regression_test.py` in headless Chromium (Playwright). The last run executed **48 checks: 48 PASS, 0 FAIL**. Anything not executed is listed under NOT TESTED; it is not claimed.

## Environment

- Headless Chromium 141 via Playwright 1.56 (Python), sandboxed Linux, no internet access.
- Site opened via `file://` for most checks; a local `python3` HTTP server was used only for tests that substitute `data.js` with test data.
- Viewports: 320, 375, 390 (touch emulation), 414, 768, 1024, 1280 px.
- Re-run: `python3 tests/regression_test.py` from the project root.

## 1. Required regression tests (18)

| # | Test | Result | What was checked |
|---|---|---|---|
| 1 | Homepage loads without JavaScript errors | PASS | Page errors and console errors (external Google Font request excluded, see limitations); six cards and a correct count render; no local asset request fails. |
| 2 | Search by title | PASS | `frontend` → Junior Frontend Developer. |
| 3 | Search by company | PASS | `quarry` → Data Analyst Intern. |
| 4 | Search by skill | PASS | `pytorch` → Machine Learning Associate (Entry). |
| 5 | Search by location | PASS | Location box `Mumbai` and keyword `mumbai` → UI/UX Design Intern. |
| 6 | Enter submits a search | PASS | Typing `figma` then Enter filters results. |
| 7 | Clear search restores results | PASS | × button empties the box and restores all 6. |
| 8 | Each supported filter works | PASS | Every value of Type, Work mode, Category and Experience checked against the expected count. |
| 9 | Multiple filters combine correctly | PASS | Job+Hybrid=2, Job+Remote=0 (empty state), Internship+Remote+Business=1. |
| 10 | Clear all filters resets all filter state | PASS | Search, location, all four selects and the hero type select return to defaults; chips disappear. |
| 11 | Sorting works where supported | PASS | Title A–Z verified; Newest and Compensation correctly disabled (no data). |
| 12 | Result counts remain accurate | PASS | Count text equals the number of cards for 6 queries, singular/plural and zero. |
| 13 | Empty state for zero matches | PASS | Appears with Edit search / Clear all filters; Clear all recovers. |
| 14 | Bookmarks toggle correctly | PASS | On, off, multiple at once. |
| 15 | Bookmarks persist after refresh | PASS | Add and remove both survive reload. |
| 16 | Existing navigation remains intact | PASS | Nav links, Internships link, Soon dialogs, category cards, mobile menu (button + Escape). |
| 17 | Mobile layout does not overflow | PASS | No horizontal overflow at 320/375/414/768/1024/1280 px, also with the empty state; plus emulated touch phone. |
| 18 | Existing design and required assets intact | PASS | Computed ivory background, forest-green primary button and wordmark, font stack, header/footer/all five sections, favicon link; all 8 asset files present. |

## 2. Additional Part 2 checks

| ID | Check | Result |
|---|---|---|
| P2-01 | Shipped demo cards: DEMO badge, type, mode; no invented pay/dates/status | PASS |
| P2-02 | Experience shown only when known (Entry-level shown; unknown not shown) | PASS |
| P2-03 | View details dialog: honest DEMO text, no apply link, focus returns to button | PASS |
| P2-04 | Status badges follow evidence: VERIFIED needs evidenceUrl, else shown Unverified; DEMO stays Demo | PASS |
| P2-05 | Compensation, experience, employment type and dates appear only when known; past deadline flagged | PASS |
| P2-06 | Injected HTML/javascript: URLs in data are escaped/ignored | PASS |
| P2-07 | Dialog links: apply/evidence only for non-DEMO listings that have them; external links use rel=noopener; no 'submitted' claims | PASS |
| P2-08 | Saved-only view: count label, filters combine, unbookmarking updates list, Clear all resets | PASS |
| P2-09 | Saved-only with nothing saved shows an honest empty state | PASS |
| P2-10 | Bookmark button: stable accessible name + aria-pressed, focus kept after toggle | PASS |
| P2-11 | localStorage holds a plain id array under nexora:demo-saved | PASS |
| P2-12 | Corrupted / odd stored bookmark data is ignored safely (no errors, valid ids only) | PASS |
| P2-13 | Storage blocked: no errors, bookmarks work for the visit, user is told they won't persist | PASS |
| P2-14 | Storage write fails (quota): no errors, state kept in memory, user told | PASS |
| P2-15 | Bookmark changes in another tab are reflected (storage event) | PASS |
| P2-16 | Every button, link, input and select has an accessible name | PASS |
| P2-17 | Search and filter controls have programmatic labels | PASS |
| P2-18 | Visible focus indicator (>=2px outline on element or its field wrapper) on key controls | PASS |
| P2-19 | Keyboard: search, filters, bookmark and details buttons reachable with Tab | PASS |
| P2-20 | Keyboard: Enter/Space toggle bookmark, Enter opens details, Escape closes | PASS |
| P2-21 | Semantics: one h1/main, lang, unique ids, labelled navs, skip link, live regions | PASS |
| P2-22 | Colour contrast of design-token pairs >= 4.5:1 (WCAG AA) | PASS |
| P2-23 | Card and search action buttons are at least 40px in both dimensions | PASS |
| P2-24 | Page still runs with no JS errors when optional elements are missing (15 variants) | PASS |
| P2-25 | Pure helpers: formatSalary/formatDate/isPast/safeUrl/saved filter/cleanSavedIds | PASS |
| P2-26 | Remote listing shows 'Remote' once (location duplicate suppressed) | PASS |
| P2-27 | Emulated touch phone (390px): tap bookmark, details, menu, saved view; no overflow/errors | PASS |

Notes on how some checks work:

- **P2-04, P2-05, P2-06, P2-07** run against a temporary test dataset (injected in place of `data.js` for that test only) because the shipped demo data has no pay, dates, verified listings or links. They prove the rendering rules; they do not mean the shipped data contains such values.
- **P2-24** removes each of 15 optional elements from a copy of `index.html` (toast, dialog, clear button, hero type select, status line, menu button and menu, Saved toggle, datalist, segmented control, active-filter list, Clear all, sort select, popular chips, count) and verifies there are no JS errors and that search still works.
- **P2-18/P2-22** check computed outlines and a WCAG contrast calculation over the design-token colour pairs, not every rendered element.
- The new checks were also run against the untouched Part 1 code: the 20 original checks passed and 13 new checks failed, confirming the tests can fail.

## 3. Bugs found and fixed

| Bug | Found in | Steps to reproduce (on Part 1 code) | Fix |
|---|---|---|---|
| Valid-JSON-but-not-a-list bookmark data crashed the page and rendered zero cards (`saved.indexOf is not a function`) | Part 1 | In DevTools run `localStorage.setItem('nexora:demo-saved','{"a":1}')` (or `'5'`), reload. | Stored ids are validated by `cleanSavedIds` (arrays of whole numbers that match real listings only). |
| Bookmark button's accessible name changed between "Bookmark:" and "Remove bookmark:" while also using `aria-pressed` (screen readers announce the state twice) | Part 1 | Inspect `[data-save]` label after toggling. | Constant name `Bookmark: <title>`; state carried by `aria-pressed`. |
| Missing `#dialog` or `#menu-toggle` threw `Cannot read properties of null` at load and rendered zero cards (a missing `#toast` only failed later, on click) | Part 1 | Delete `#dialog` from `index.html`, open the page, check the console. | Defensive lookups in `main.js`. |
| Text fields and filters had no focus ring (computed outline `none` on the field and its wrappers; only a faint background tint marked focus) | Part 1 | Tab into the search box or a filter select and inspect the computed outline. | 2px ring on the field/filter wrapper via `:focus-within`. |
| Remote listings showed "Remote" twice (location and work mode) | Part 1 | View Data Analyst Intern card. | `cardFacts` hides a location identical to the work mode. |

No Part 1 search, filter, sorting, count or empty-state behaviour was found broken.

## 4. NOT TESTED

- **Real screen readers** (NVDA, JAWS, VoiceOver, TalkBack). Accessible names, roles, labels and live regions were checked programmatically only.
- **Firefox, Safari/WebKit, Edge and older browsers.** Only Chromium was installed. This includes how `file://` `localStorage` and `storage` events behave in those browsers.
- **Real touch devices.** Only Chromium's mobile/touch emulation was used.
- **The Google Font.** The sandbox is offline, so tests and screenshots used the fallback system font; layout with Plus Jakarta Sans was not observed.
- **Automated accessibility audit (axe-core, Lighthouse)** — not available offline, not run.
- **Windows High Contrast / forced-colors mode, browser zoom to 200%, text-only zoom, printing.**
- **`npx serve .`** — only `python3 -m http.server` and `file://` were used.
- **Cross-device bookmark sync** — not a feature (bookmarks are browser-local by design).
- **Pay and date rendering with real data** — verified only with temporary test data (see notes above).

## 5. Known limitations (carried and new)

- All listings are demo data; there is no pay, dates, application URLs or employment sub-types, so related filters/sorts are disabled.
- Search is word-start only ("script" does not match "JavaScript"); remote jobs do not match a city search.
- Filter state, including Saved only, is not kept in the URL and resets on reload.
- Bookmarks are browser-local, not account-based, not synced across devices; clearing site data or private browsing loses them. Stored ids that no longer match any listing are dropped.
- The toast is visible for about 3 seconds and can briefly overlap content on small screens.
- "View details" is a dialog, not a page.

## 6. Steps to reproduce / re-run

```bash
pip install playwright && playwright install chromium
python3 tests/regression_test.py          # all checks
python3 tests/regression_test.py core     # the 18 required tests only
python3 tests/regression_test.py part2    # Part 2 checks only
```

Exit code is 0 when every check passes. Results are written to `tests/results.json`.
