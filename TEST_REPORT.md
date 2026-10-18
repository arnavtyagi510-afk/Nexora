# NEXORA — Test Report

## Phase 3, Step 3.1 — recruiter portal browser validation

Actual checks performed in the integrated browser against a temporary local HTTP server:

- Recruiter dashboard started with zero listings and an honest empty state.
- Saving an empty draft showed required-field errors and `aria-invalid` state.
- A `javascript:` application URL was rejected; a valid HTTPS URL was accepted.
- A completed listing saved as Draft, rendered entered HTML-like title text literally (no injected `<b>` element), and persisted after page reload.
- Editing the record changed its title and status. Dashboard counts updated to total 1, active 1, drafts 0 for the Published status.
- The Published row clearly stated that it was not publicly published or verified.
- Delete opened a confirmation prompt; accepting it removed the record and returned the listing count to zero with the empty state.
- Student Dashboard and Profile routes remained reachable; returning to the job explorer showed the six existing demo cards and keyword search for “frontend” returned one expected card.
- Existing bookmark interaction saved and removed a job successfully. A demo job’s Apply Now view still explained that it could not accept an application and kept the visitor on NEXORA.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parser — PASS; no duplicate element IDs found in `index.html`.

What was not performed for Step 3.1:

- The existing optional Python Playwright regression suite was not run because Python Playwright is not installed in this environment. Its previous Step 1.3 result is historical and is not a full regression result for this change.
- No dedicated cross-browser, screen-reader, keyboard-only, storage-quota, or real-device test was performed.
- No backend or public listing endpoint exists, so no real publishing, account, company verification, or external application flow was testable.

## Phase 2, Step 2.2 — static validation only

Actual checks performed in this session:

- `node --check assets/js/main.js` — PASS
- Local static HTTP response check for the project directory — PASS

What was not performed:
- No browser automation / Playwright UI checks were run for the student dashboard/profile flow in this environment.
- No interactive browser assertions were executed for dashboard navigation, saved-job synchronization, or profile editing.

This means Step 2.2 is verified as a static front-end change, but not as a fully browser-tested feature set until a proper headless browser environment is available.

## Phase 1, Step 1.3 — browser-tested report

# NEXORA — Test Report (Phase 1, Step 1.3)

Every PASS below comes from a check that was actually executed by `tests/regression_test.py` in headless Chromium (Playwright). The last run executed **77 checks: 77 PASS, 0 FAIL** (48 carried from Step 1.2, two of them with updated expectations, plus 29 new Step 1.3 checks). Anything not executed is listed under NOT TESTED; it is not claimed.

## Environment

- Headless Chromium via Playwright 1.56 (Python), sandboxed Linux, no internet access.
- Site opened via `file://` for shipped-data checks; a local `python3` HTTP server was used for tests that substitute `data.js` with test data.
- External employer sites were **mocked** (`jobs.example.org`, `careers.example.net`, `example.com` requests are answered by the test with a stub page). No real external website was visited.
- Viewports: 320, 375, 390 (touch emulation), 414, 768, 1024, 1280 px.

## 1. Step 1.3 checks (29)

"Shipped data" = the real six DEMO listings. "Test data" = a temporary dataset injected in place of `data.js` for that test only (10 listings: verified with URL, unverified with `http` URL and past deadline, unverified without URL, DEMO carrying a URL, VERIFIED-without-evidence with URL, a malformed record, a `user@host` credential URL, a `data:` URL, a minimal record, and an HTML-injection record). It proves the rules; it does not mean the shipped data contains such values.

| ID | Check | Data | Result |
|---|---|---|---|
| S13-01 | DEMO details show that listing's own data, DEMO badge, fictional notice, no links | shipped | PASS |
| S13-02 | DEMO Apply Now explains sample data, stays on NEXORA (same URL, no new tab), no record, no "submitted" wording; Back works and focus returns to Apply | shipped | PASS |
| S13-03 | Each of the six shipped jobs opens its own, different details | shipped | PASS |
| S13-04 | Selected job is correct for every card after Title A–Z sorting and after a work-mode filter | shipped | PASS |
| S13-05 | Closing by X, Close button and backdrop keeps keyword, filter, count and card list; focus returns to the opening card | shipped | PASS |
| S13-06 | Save/unsave from details and cards share one state, persist across reload, update Saved (N); localStorage holds `[3]` then `[5]` | shipped | PASS |
| S13-07 | Un-saving from details in Saved-only view: dialog stays on the right job, list behind updates, focus lands on Saved toggle, no errors | shipped | PASS |
| S13-08 | After 5 open/close cycles, one click on Save toggles exactly once (no stacked listeners) | shipped | PASS |
| S13-09 | Keyboard: focus never reaches page controls while open (see note), Enter and Space work, Escape closes, scroll lock released, focus restored; `:modal` is the dialog | shipped | PASS |
| S13-10 | Semantics: labelled by job title, described, X has a name, status is a live region, no unnamed controls, unique ids | shipped | PASS |
| S13-11 | Visible focus ring (>= 2px) on X, Apply Now, Save and Close | shipped | PASS |
| S13-12 | No JavaScript errors across the shipped-data flows | shipped | PASS |
| S13-13 | Full record shows every known field, multi-paragraph description, responsibilities/qualifications/benefits, evidence link (`noopener`); nothing flagged missing | test | PASS |
| S13-14 | Missing or malformed optional fields: no errors, no "undefined/null/NaN", no invented sections, unknown fields stated as not provided | test | PASS |
| S13-15 | No application URL: Apply Now is `aria-disabled`, visible reason, activation shows no review, no navigation | test | PASS |
| S13-16 | DEMO listing that carries an `applyUrl` never exposes or opens it | test | PASS |
| S13-17 | Valid URL: review shows title, company, domain, leaving-NEXORA notice, Continue (`<a>` with exact href, `_blank`, `noopener`) and Cancel; no form fields; Cancel returns; no tab opened by merely reviewing | test | PASS |
| S13-18 | UNVERIFIED listings show a caution before redirect and are never described as verified; `http` and passed-deadline warnings appear where they apply (and not for https/VERIFIED-downgraded case) | test | PASS |
| S13-19 | Unsafe URLs rejected: `javascript:`, `data:`, `ftp:`, `//host`, `user@host`, `user:pw@host`, leading-space `JAVASCRIPT:`, `https://`; `www.` stripped from the displayed domain; `window.__xss` stays unset | test | PASS |
| S13-20 | Continue opens the exact URL in a new tab with `window.opener === null`; exactly one record, status `EXTERNAL_REDIRECT_OPENED`, method `external_redirect`, `candidateId` null, host `jobs.example.org`, only the 7 expected keys; no `SUBMITTED`; status text says it is not counted as an application; no "submitted/applied" wording anywhere on the page; nothing persisted beyond the bookmark key | test | PASS |
| S13-21 | Double click on Continue opens one tab and records one redirect | test | PASS |
| S13-22 | DEMO, no-URL and cancelled flows create no application record | test | PASS |
| S13-23 | HTML in title, company, skills and description is shown as plain text, never executed | test | PASS |
| S13-24 | No JavaScript errors across the injected-data flows | test | PASS |
| S13-25 | Dialog (details, review and demo views) at 320/375/414/768/1024/1280 px: no dialog or page horizontal overflow, inside the viewport, buttons >= 40px | test | PASS |
| S13-26 | Emulated touch phone (390px): tap View details, Save, Apply Now, Cancel, X; card bookmark matches | test | PASS |
| S13-27 | `applications.js`: refuses `nexora`, demo, invalid id, missing host and unknown method; unique ids; redirect records are never "submitted via NEXORA"; store is in-memory | browser | PASS |
| S13-28 | `paragraphs()` splits on blank lines and tolerates null/number/blank input | browser | PASS |
| S13-29 | `assets/js/applications.js` ships with the project | files | PASS |

Notes:

- **S13-09 Tab behaviour:** after the last control in the modal, Chromium adds one native Tab stop for its own browser UI (`document.activeElement` becomes `<body>`). The test accepts that stop and fails if focus ever lands on a page control. The observed cycle was: Apply Now → Save → Close → (browser UI) → X → Apply Now.
- **S13-20 / S13-21** run against a mocked external site; they prove NEXORA opens the right URL safely and records it correctly, not that any real employer site works.

## 2. Carried-forward checks (48) and the two that changed

All 48 Step 1.2 checks were re-run: 18 core regression tests (homepage, search, filters, sorting, counts, empty state, bookmarks, persistence, navigation, no overflow at six widths, design and assets preserved) and the Part 2 checks (cards, status badges, saved view, storage failures, cross-tab sync, accessibility, optional-element removal, touch). See the Step 1.2 list in `tests/results.json`.

Two Step 1.2 checks assumed the old dialog and were updated because the intended behaviour changed, not to hide a failure:

| Check | Why it had to change |
|---|---|
| P2-07 | It expected the apply URL as a direct link in the details view. Step 1.3 deliberately hides it until the review step, so the check now asserts the opposite for the apply URL (hidden) and keeps the evidence-link and `noopener` assertions. |
| P2-27 | It tapped the old "Got it" button, which does not exist in the job layout; it now taps the X button. |

P2-03 (honest DEMO text, no apply link, focus returns to the button) and P2-20 (Enter opens details, Escape closes) passed unchanged against the new dialog.

## 3. Issues found during Step 1.3 testing

| Issue | Kind | Resolution |
|---|---|---|
| S13-25 reported horizontal overflow of the page at 320px | **Real (minor) page defect, not in the dialog.** A very long unbroken word in a company or title (the HTML-injection test record) widened the card grid. Reproduced with no dialog open. With the six shipped listings the page did not overflow. | Added `min-width: 0; overflow-wrap: anywhere` to `.opp`. No visual change for normal text. Re-run: passes at all six widths. |
| S13-09 first failed on "scroll lock released" | **Test timing bug, not an app bug.** The check read the page style before the dialog's asynchronous `close` event had fired. A separate probe showed the lock released correctly right after Escape. | The check now waits (up to 1.5 s) for the dialog to close and the lock to clear. |
| S13-09 first failed on "focus stays inside" | **Test assumption.** Chromium's extra native Tab stop (see note above) made `activeElement` the `<body>` once per cycle; focus never reached a page control. | The check accepts `<body>` and still fails on any page control. |

| S13-07 failed once (focus after closing) when I re-ran the suite from the freshly extracted ZIP | **Test timing bug, not an app bug.** The dialog's `close` event, where the focus fallback runs, is asynchronous, and the check read `document.activeElement` immediately after Escape. A 15-run probe showed focus was wrong immediately after Escape in 7 runs and wrong in 0 runs once the event had run. The earlier pass was luck. | Every close-then-inspect check now waits for the dialog to finish closing (`wait_closed`). |

Repeatability after that fix: `part3` ran 3 times in a row (29/29 each), the full suite ran twice from the project folder (77/77 each), and once more from the extracted `NEXORA_Step1_3.zip` (77/77). Earlier runs during development are not counted.

I did not run the new checks against deliberately broken code, so I have not demonstrated that each one can fail. The two failures above are the only evidence the checks are sensitive.

## 4. Mapping to the requested tests

| # | Requested test | Where covered | Status |
|---|---|---|---|
| 1 | Homepage still loads | core 01, 01b | PASS |
| 2 | Search and filters still work | core 02–10 | PASS |
| 3 | Sorting and result counts still work | core 11, 12, 13 | PASS |
| 4 | Saved-job bookmarks work and persist | core 14, 15; P2-08..15 | PASS |
| 5 | View details opens the correct job | S13-03, S13-04 | PASS |
| 6 | Different jobs show their own data | S13-03, S13-13 | PASS |
| 7 | Missing optional fields do not break the dialog | S13-14 | PASS |
| 8 | Closing preserves search/filter context | S13-05 | PASS |
| 9 | Save state consistent between card and details | S13-06, S13-07 | PASS |
| 10 | DEMO cannot claim a real application | S13-02, S13-16, S13-22 | PASS |
| 11 | Missing application URLs handled | S13-15, S13-19 | PASS |
| 12 | Valid official URL follows the confirmation flow | S13-17, S13-20 | PASS (mocked external site) |
| 13 | Unsafe URL schemes rejected | S13-19 | PASS |
| 14 | Redirect does not mark an application Submitted | S13-20, S13-27 | PASS |
| 15 | Keyboard controls and modal closing | S13-09, S13-11; P2-20 | PASS |
| 16 | Existing navigation and styling intact | core 16, 16b, 18, 18b; screenshots reviewed by me for the new dialog | PASS (automated); the screenshot review was a visual look at three desktop views and one mobile view, not a formal design test |
| 17 | No JavaScript errors in tested flows | S13-12, S13-24, S13-25, S13-26 | PASS |

## 5. NOT TESTED

- **Real screen readers** (NVDA, JAWS, VoiceOver, TalkBack). Roles, names, descriptions and live regions were checked programmatically only.
- **Firefox, Safari/WebKit, Edge and older browsers.** Only Chromium was available. In particular the native `<dialog>` focus handling and `close` event timing were not observed elsewhere.
- **Real touch devices and real popup-blocker behaviour.** Only Chromium touch emulation was used. Continue is a normal link, which should avoid popup blockers, but that was not verified in other browsers.
- **A real employer website.** External pages were mocked.
- **Manual mobile testing by the project owner** (planned for later): NOT TESTED.
- **The Google Font** (offline sandbox; fallback font used), **axe-core / Lighthouse audits**, **forced-colors mode**, **200% zoom**, **printing**, **Live Server** and **`npx serve .`**.
- **Colour contrast of the new dialog components** was not separately measured. They reuse token pairs that Step 1.2 checked (text on white/mint/sage/ivory, white on primary), but the new combinations were not individually computed.
- **Pay, date, description and application-URL rendering with real data**: the shipped data has none; only test data was used.

## 6. Known limitations

- All listings are demo data; nothing can be applied to. No backend, so no submitted applications, tracking, history or recruiter responses.
- Application records exist only in memory for the page visit and are not displayed.
- Search is word-start only; remote jobs do not match a city search; filter state is not in the URL; bookmarks are browser-local.
- "View details" is a dialog with no shareable URL.
- On phones, Apply Now sits below the description, so long listings need a scroll inside the dialog.

## 7. How to repeat the tests

```bash
pip install playwright && playwright install chromium
python3 tests/regression_test.py          # all 77 checks
python3 tests/regression_test.py core     # 18 core regression tests
python3 tests/regression_test.py part2    # Step 1.2 Part 2 checks
python3 tests/regression_test.py part3    # Step 1.3 details and apply-flow checks
```

Exit code is 0 when every check passes. Results are written to `tests/results.json`.

Manual spot check (2 minutes): open `index.html`, click View details, click Apply Now (demo explanation, you stay on NEXORA), Save job, close with Escape, confirm the card is bookmarked and your search is unchanged. To see the review step, temporarily set one listing in `data.js` to `status: "UNVERIFIED"` with `applyUrl: "https://example.com/apply"`, then undo the edit.
