# NEXORA — Test Report

## Phase 5.3 — Job/recruiter reports, review queue, and warnings

### Integrated-browser checks performed

Checks used temporary browser-local test records. The original values for the six affected localStorage keys were captured and restored afterward; the temporary sessionStorage backup was removed.

- Opened the review route before submitting a report and confirmed the empty-queue state.
- Submitted with no reason selected and confirmed validation prevented saving. Submitted a job report and confirmed the report appeared in the existing local report store as Pending with its job context and explanation. A second submission for the same target/reason was rejected as a duplicate.
- Submitted a Recruiter report for the listing's associated company, confirmed its target type/company context and Pending status, and confirmed duplicate rejection for the same recruiter/reason.
- Changed the job report to Under Review and confirmed the report appeared under that filter, the listing showed a warning, and job details displayed the non-accusatory explanation and safety guidance. Pending did not produce a warning.
- Resolved the job report and dismissed the recruiter report using the confirmation prompts. Confirmed Resolved and Dismissed filters each showed one report, Pending and Under Review showed none, and the listing/detail warning was gone after resolution.
- Reloaded the page and confirmed Resolved and Dismissed statuses persisted.
- At a 390px viewport, the review queue had no horizontal document overflow (390px viewport; 375px document scroll width), and a job details dialog remained within the viewport (about 358px wide; 390px document width).

### Static checks

- `node --check assets\js\main.js` — PASS.
- Python standard-library HTML parse / duplicate-ID check — PASS; 363 IDs, none duplicated.
- Build/lint/type checks — not configured in this project. The optional Python Playwright suite was not run in this validation.

### Limits and manual checks

- Browser checks exercised the browser-local demo only. They do not establish authenticated admin access, secure storage, reviewer identity, real investigation, cross-device synchronization, or production fraud prevention.
- Physical-device, cross-browser, keyboard-only, and screen-reader testing remains manual.

# Phase 4, Step 4.4 — Transparent Job Matching & Recommendations

### Integrated-browser checks performed

Ran against the local `file://` page with temporary profile, bookmark, and recruiter-listing fixtures. The original localStorage values were captured for restoration.

- A profile with React and JavaScript, a saved Dashboard project using those technologies, and a Frontend Developer preference displayed matching skills, missing CSS, relevant project evidence, a numeric score, and Unknown eligibility because the listing's available experience/eligibility data could not be established from the profile.
- Edited desired role, interests, type, work mode, and location through the existing student profile UI, then added SQL, Excel, and Python through its skill editor. The highest recommendation changed to **Data Analyst Intern** (57% in this fixture), and its skill list reflected the updated profile without a separate recommendation store.
- A profile with no skills but a saved Data Analyst role returned only low scores (maximum 4% in this fixture), while a name-only profile showed the complete-profile prompt rather than generated matches.
- Checked explicit listing criteria: a Bachelor's-degree-only criterion against a saved Undergraduate level displayed **Unmet**; unparseable eligibility text and absent criteria displayed **Unknown**; currently enrolled Undergraduate with a saved college displayed **Satisfied**. No status was presented as an employer decision.
- A listing with no recorded skills showed “No skill requirements recorded,” received no skill points, and remained below 50% in the test fixture.
- Filtered by type and category; every result in the Internship type-filter run was labelled Internship, and the Design category returned only UI/UX Design Intern. The external-application-link filter returned the temporary recruiter DEMO fixture with an external link, labelled as both a local DEMO listing and an external destination.
- Saved a recommendation and confirmed its ID appeared in the existing `nexora:demo-saved` data and the Job Explorer bookmark control had `aria-pressed=true`. The existing application tracker record remained present.
- Opened recommended job details and used Apply Now on a shipped DEMO listing; the existing dialog explained that it was fictional and no application was sent or saved. The application count remained unchanged.
- Used “Compare skill gaps” to set the Step 4.3 analyzer to job mode and the selected existing listing ID; it did not auto-run or overwrite the existing roadmap.
- Reloaded the page and confirmed saved bookmarks, the student application, and recruiter listing fixtures remained in browser storage. At a 390px viewport, document client and scroll widths both measured 390px.

### Static and automated checks

- `node --check assets\js\main.js` — PASS.
- Python standard-library HTML parser — PASS; 357 IDs, none duplicated.
- `python tests\regression_test.py` — NOT RUN: could not start because Python Playwright is unavailable (`ModuleNotFoundError: No module named 'playwright'`).

### Test iteration notes and remaining checks

- One browser automation locator initially matched multiple “Profile” navigation and CTA controls; the rerun explicitly targeted the sidebar navigation. An initial type-filter expectation included a Job listing by mistake; corrected verification checked the displayed type for every filtered card. Corrected checks passed.
- The first immediate bookmark-sync check found the Job Explorer button's `aria-pressed` state stayed stale when a job was saved from Recommendations. The handler now refreshes the existing explorer controls (or rerenders its Saved-only results) and restores focus to the recommendation button; rerun confirmed the saved ID and `aria-pressed=true` immediately.
- Browser checks used temporary local DEMO fixtures (including a `example.com` external-link sample); no actual external application site was opened. Original local storage is restored after this report's final browser cleanup.
- No physical-device, cross-browser, keyboard-only, or screen-reader test was performed. The recommendation formula cannot determine professional eligibility beyond a narrow saved education comparison, and all local data remains unsynchronized.

# Phase 4, Step 4.3 — Skill Gap Analyzer & Personalized Learning Roadmap

### Integrated-browser checks performed

Ran on the local `file://` page using temporary browser storage fixtures; previous values for student profile, recruiter listings, and demo session were restored afterward.

- Selected a custom generic role and edited the role template. Verified case-insensitive name matching, missing skills, separate project-linked and self-declared matches, generated practice steps, and the visible formula. A fixture with three unique matches among four target skills displayed 75%.
- Selected a published recruiter-created listing from the target-job selector. Confirmed the analysis used the listing's actual saved skill list and displayed its recorded eligibility separately; a two-of-two fixture showed 100% coverage.
- Checked roadmap completion and refresh persistence; edited a step, added a custom step, saved, and confirmed edits remained after reload.
- Selected a listing with no skill requirements; the analyzer showed no percentage and an incomplete-data explanation. An empty profile showed 0% for a populated generic template and stated that saved skills/profile data were absent.
- Verified an existing project-linked skill and completed Project Defense session remained intact and the UI did not call a completed assessment independent verification.
- Compatibility browser checks confirmed the analyzer preserved saved application, project, and defense records; left the existing bookmark store unchanged; and the student application tracker plus recruiter applicant association still rendered.
- Confirmed roadmap-reset cancellation preserved data and confirming reset cleared the analysis while retaining the profile record.
- At 390px viewport, confirmed document width matched viewport width; no horizontal overflow.

### Static and automated checks

- `node --check assets\\js\\main.js` — PASS.
- Python standard-library HTML parser — PASS; 350 IDs, no duplicates.
- `python tests\\regression_test.py` — NOT RUN: could not start because Python Playwright is unavailable (`ModuleNotFoundError: No module named 'playwright'`).

### Test iteration notes and remaining checks

- Initial browser test assertions were corrected to reflect the exact target template and the requested name-match formula. A missing-skill empty-state rendering error was found and fixed; the roadmap editor also initially lost unsaved edits when adding a custom step, which was corrected and re-tested.
- No physical-device, cross-browser, keyboard-only, or screen-reader testing was performed. Browser-local demo data does not sync between browsers/devices and is not a measure of proficiency or employability.

## Phase 4, Step 4.2 — Project Defense & Skill Proof System

### Integrated-browser checks performed

Ran on the local `file://` page with temporary profile and recruiter-listing fixtures; the prior localStorage values were restored at the end of each run.

- Selected a complete saved project and started a six-question rule-based defense. Verified that the first prompt incorporated saved project description and the prompt sequence was shown one at a time.
- Submitted an answer and confirmed both the answer and the current question index were saved in the existing student profile. Reloaded the page and resumed at Question 2 of 6.
- Submitted responses and skipped the final question; the review showed all six prompts, completion saved the session, and the summary identified the unanswered Individual contribution prompt.
- Confirmed completed results were private by default and absent from recruiter candidate detail markup. Opted in to sharing, verified the recruiter view contained the selected project, questions, answers, and transparent indicative summary, then revoked sharing and confirmed the result was no longer exposed.
- Tested a completed shared session after its project had been removed: the student could still review the saved session, and the recruiter view clearly labeled the project as no longer in the profile.
- Confirmed a Project-linked skill remained Project-linked; assessment completion did not set independent verification.
- At 390px viewport width, checked `documentElement.scrollWidth` against `clientWidth`; both were 375px and no horizontal overflow was present.

### Static and automated checks

- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parser — PASS; 315 IDs and no duplicates.
- `python tests\regression_test.py` — NOT RUN: could not start because Python Playwright is unavailable (`ModuleNotFoundError: No module named 'playwright'`).

### Test iteration notes and remaining checks

- The first browser attempt targeted a hidden desktop navigation item at the integrated browser's mobile-sized viewport; reran using the visible mobile menu.
- An initial test assertion incorrectly expected the project title in a question that correctly personalized from the saved description; corrected the assertion.
- The review-flow test exposed a boundary clamp that prevented the review screen after Question 6. Fixed the progress normalization and reran the full session/share/revocation workflow successfully.
- No physical-device, cross-browser, keyboard-only, or screen-reader testing was performed. The browser-local consent mechanism is a demo UI gate, not authenticated or tamper-proof access control.

## Phase 4, Step 4.1 — company verification, trust indicators, and job reports

### Integrated-browser checks performed

Checks ran on the local `file://` page with test-only browser storage fixtures. Each test captured and restored the previous values for the student profile, saved jobs, recruiter listings, company profile, and reports.

- Created and edited a company profile (company name, website, business email domain, description, industry, location, public links); verified Save success and persistence after reload.
- Verified an incomplete company profile can be saved, but submitting a verification request requires company name, valid HTTP(S) website, and a business email domain. Unsafe website URL, `@` email value, and unsafe public link were rejected while the prior record remained unchanged.
- Confirmed a submitted request persisted as **Pending Review** with a timestamp; no Verified status or reviewer notification was claimed. A locally stored `Verified` value displayed as **Not Submitted**. A Rejected record displayed the local-data caveat and could be resubmitted as Pending Review.
- Confirmed matching recruiter listing cards and details showed Pending Review and provided company public details; a base listing showed Company not verified and still exposed the report action.
- Report form required a reason; a report with optional explanation was stored with job/recruiter listing/company IDs, timestamp, and Submitted status. Confirmation stated no review had occurred. Reopening the job and repeating the same reason was blocked. Report remained after reload.
- Malformed company profile and report storage displayed unavailable/read errors and were not overwritten.
- At 390px, opened the Trust Center through the mobile menu and verified no horizontal overflow.
- Regression checks: created a draft through recruiter UI, edited the existing draft without duplication, published it, confirmed it appeared in Job Explorer with initial activity timestamps, and verified publication survived refresh; bookmarked the recruiter listing and confirmed bookmark persistence; external Apply Now did not create a student application; student status/notes persisted and did not alter recruiter activity; a 16-day listing expired while a 14-day listing remained Published.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parser checked `index.html`; no duplicate IDs — PASS.

### Failures and remaining checks

- Initial browser attempts used a card locator that did not target the detail button and a hidden desktop navigation control at mobile width; reruns used the card-scoped button and mobile menu and passed.
- One publish regression attempt expected a Draft's Save Changes action to publish; it correctly remained a Draft. The follow-up used the explicit Publish action and passed.
- `python tests\regression_test.py` was not run because Python Playwright is unavailable (`ModuleNotFoundError`). Browser checks above are interactive integrated-browser checks, not an execution of that test suite.
- No physical-device, cross-browser, keyboard-only, or screen-reader testing was performed. There is no real authorized reviewer/backend; request/report records are local and can’t be shared or securely reviewed.

# Phase 3, Step 3.4 — recruiter accountability and 15-day activity policy

### Integrated-browser checks performed

Checks ran on the local `file://` page with temporary `nexora:demo-profile`, `nexora:demo-saved`, and `nexora:demo-recruiter-listings` fixtures. Test fixtures were removed/restored after each run.

- Created and published a recruiter listing through the form. Confirmed a valid `publishedAt`, `lastRecruiterActivityAt`, initial `published` audit event, and displayed review deadline.
- With dated fixtures, confirmed a listing older than 15 days changed to **Needs Review** / `Expired`, while a 14-day listing remained active. Opening/reloading did not reset activity; the expired record disappeared from active opportunities.
- Confirmed **Reconfirm Vacancy** and verified the listing became active again with a new timestamp/event. Review/expiry event persisted across reload without duplication.
- Expanded candidate details and verified `application_reviewed` event/timestamp. Saving the same status produced no new event. Changing recruiter status added a timestamped application-linked event, kept the student's `Applied` status unchanged, and persisted recruiter status after refresh.
- Changed the student's own application status in the student tracker and confirmed that the recruiter activity timestamp and event history did not change.
- Confirmed an invalid activity timestamp is handled safely: the listing moved to Needs Review, one `review_required` event persisted after reload, and it did not appear in Job Explorer.
- Confirmed Closed remained Closed, exposed no Reconfirm Vacancy control, and showed the explicit **Reopen & publish** action. Confirmed an expired listing could not be republished through the editor's Preview/Publish path.
- At 390px, used the mobile menu to open the recruiter portal and verified the listing/review details had no horizontal overflow.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parsing of `index.html` — PASS; no duplicate IDs.

### Failures and remaining checks

- An initial integrated-browser test stopped on an ambiguous locator after the expiry and reconfirm checks had already passed. A follow-up with a scoped selector completed candidate review, status-change, same-status, and persistence checks successfully.
- One mobile browser attempt targeted the hidden desktop navigation control; the check was rerun through the mobile menu and passed.
- `python tests\regression_test.py` was attempted but could not start because Python Playwright is unavailable (`ModuleNotFoundError`). Browser checks above are interactive integrated-browser checks, not a run of that suite.
- No physical-device, cross-browser, keyboard-only, or screen-reader testing was performed. Browser-local enforcement cannot run while closed, is not server-secure, and does not synchronize across users/devices.

## Phase 3, Step 3.3 — recruiter applicant management

### Integrated-browser checks performed

Ran checks in the integrated browser against the local `file://` page. The temporary `nexora:demo-profile`, `nexora:demo-saved`, and `nexora:demo-recruiter-listings` values were restored afterward.

- Started with a saved Published recruiter listing and a student profile containing test-only provided fields; Applicants showed an honest empty state and a zero count.
- Added a student-tracker application by selecting that listing. The record contained its stable job ID, recruiter listing ID, and profile/candidate ID. The recruiter Applicants view showed the linked record.
- Added an unlinked manual tracker record and confirmed it did not appear in recruiter results.
- Expanded candidate details and verified provided headline, education, skill and project/repository link appeared. The view did not display tracker notes.
- Set recruiter demo status to Shortlisted and confirmed the record kept student status Applied while saving separate recruiter status and update timestamp. After reload, recruiter status persisted.
- Changed student status to Viewed in the student tracker and confirmed recruiter status, update timestamp, candidate ID, and listing ID were preserved. Student view showed recruiter status separately.
- Filtered by a status with no matching records, then by listing and searched candidate name; results updated as expected.
- Opened the external Apply Now review for the linked recruiter job and confirmed it did not add an application record.
- Removed recruiter listing data and confirmed Applicants showed the no-listings state without crashing; the student application snapshot remained in the profile. Malformed profile JSON showed an explicit Applicant data unavailable state.
- At 390px, recruiter applicant navigation and layout showed no horizontal overflow.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parser checked `index.html` and found no duplicate IDs — PASS.

### Failures and remaining checks

- The first browser attempt used a local HTTP page whose server was no longer running (`ERR_CONNECTION_REFUSED`). It did not exercise the app. Checks were rerun successfully against the available local `file://` page.
- `python tests\regression_test.py` could not start because Python Playwright is not installed (`ModuleNotFoundError`). The interactive checks are not a run of that automated suite.
- No cross-browser, physical-device, keyboard-only, or screen-reader test was performed.
- This demo stores one profile and listings in one browser. Cross-user application visibility, employer responses, notifications, identity verification, and a shared backend were not tested and are not implemented.

## Phase 3, Step 3.2 — recruiter job publishing & management

### Checks performed

Integrated-browser checks were run against the local `file://` app. Temporary profile, bookmark and recruiter-listing fixtures were restored after the checks.

- Created a complete recruiter listing, previewed it, saved it as Draft, previewed the saved record, and published it. Confirmed Published listings appeared in the existing Job Explorer and that recruiter-entered description, eligibility and skills appeared in job details.
- Edited a published listing and confirmed the existing record changed without a duplicate. Unpublished and closed listings disappeared from active explorer results; a closed listing could be reopened and published again.
- Confirmed listing edits/status persisted after reload. Tested Job Explorer search, type filter and sort, plus recruiter title/company search and status filter.
- Bookmarked a recruiter job, unpublished it, and confirmed the bookmark remained saved and reattached after republishing. A follow-up also toggled a different base-job bookmark while the recruiter job was inactive; the recruiter bookmark remained saved and reattached after reload. Saved-ID cleanup in both `refreshPublishedJobs()` and the bookmark-toggle path now retains IDs for existing recruiter records.
- Closed and deleted a recruiter listing referenced by a student application; the application retained its saved title/company snapshot. Student profile, skill, project and application data remained intact after recruiter deletion.
- Accepted the browser confirmation prompts for unpublish, close and delete. Delete removed the saved recruiter record.
- Required-field validation marked empty fields invalid. A `javascript:` URL and a past deadline were rejected while entered form values remained. A published listing without an application URL showed the missing-link explanation and disabled Apply Now.
- At 390px, the mobile menu opened the recruiter portal, navigation worked, and the page had no horizontal overflow.
- Malformed recruiter-listing JSON displayed an explicit unavailable state with unknown counts (`—`) rather than a success-shaped empty list; the independent profile and bookmark fixtures were restored.
- Opened Apply Now on a recruiter listing with a supplied external URL and confirmed the review step appeared; no external submission was made.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parsing of `index.html` — PASS; no duplicate IDs.

### Failures and remaining checks

- The initial bookmark regression check failed: unpublishing removed the recruiter job from `allJobs`, and saved-ID cleanup discarded bookmarks for inactive recruiter listings. Cleanup in both refresh and bookmark-toggle paths now retains those IDs; unpublish/republish and toggling another bookmark while inactive passed in follow-up checks.
- `python tests\regression_test.py` could not start because the `playwright` package is unavailable (`ModuleNotFoundError`). The interactive checks above are integrated-browser checks, not a run of that automated suite.
- No physical-device, cross-browser, keyboard-only or screen-reader testing was performed.
- No backend sharing, real recruiter identity/verification, employer responses, or real application submission can be validated; those features do not exist.

## Demo profile and My Applications tracker — current change

### Integrated-browser checks performed

- Opened **Get Started**, completed onboarding with test-only entries, and reached the student dashboard. The dashboard displayed a completion prompt because optional core profile fields were still incomplete; no profile details were generated.
- Added an application for an available listing with a student-entered date, source, Applied status, and note. The saved profile contained one record and the dashboard preview showed the same title, company, date, status, source, and note.
- Added a separate manual-entry record without linking a listing and verified its title, company, date, source, In Review status, and notes were saved and rendered.
- Attempted to add that listing again. Duplicate detection prevented a second record and exposed **Edit existing application**. Used that action to change the status to Viewed and update notes without adding a record.
- Reloaded and confirmed status and notes persisted. The same record appeared on the dashboard and tracker page. Status filtering showed the matching record and a useful no-match state for another status.
- Edited the student profile after adding an application; the profile save preserved the application. Bookmark add/remove worked. Created a temporary recruiter draft through the existing form, verified it persisted and incremented the dashboard count, then restored the recruiter storage fixture.
- Removed an application through the confirmation prompt and verified that the profile array became empty and both dashboard and tracker showed the honest empty state. An application-only profile also reopened the dashboard correctly.
- Exercised an external Apply Now review using a temporary browser-local recruiter listing fixture. Intercepted the destination click to stay on the test page; the redirect disclosure appeared and no Applied record was created. **I've applied · record it** opened a form prefilled with the job and Applied status but did not save anything until the student completed and submitted the form.
- At 390px, the application form/list rendered without horizontal overflow. A malformed applications value displayed a safe empty state and left the skill data intact.
- Empty required fields set `aria-invalid` and focused the first invalid control. A future application date was rejected and no record was written.
- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parser and duplicate-ID check — PASS.

### Automated suite and remaining checks

- `python tests\regression_test.py` was attempted but could not start because `playwright` is not installed (`ModuleNotFoundError`). No result from that suite is claimed.
- No cross-browser, screen-reader, keyboard-only, or physical-device check was performed.
- Browser QA fixtures were restored after testing; this was not a test of real employer submission or employer status syncing.

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

## Phase 2, Step 2.2 — student dashboard/profile bug-fix validation

### Interactive checks performed

Checks were run in the integrated browser against the local `file://` page. Test profile, session and bookmark values were restored after each flow.

- **Get Started → onboarding:** opened the onboarding form directly from the mobile-menu Get Started control; name, headline, education, career interests and skill were entered. Optional preferences did not block progress.
- **Preview and Finish:** the summary showed the skill name (not `[object Object]`) and did not write a profile before Finish. Finish saved the entered profile and opened the student dashboard.
- **Completion:** the populated test profile displayed `100%` and `5 of 5 core fields complete`.
- **Partial completion:** a profile with four of five core fields displayed `80%` and `4 of 5`; an optional saved project did not raise the percentage. A legacy string skill still appeared in the profile overview.
- **Dashboard and profile consistency:** saved name and headline loaded into the Profile form and were displayed in the dashboard overview.
- **Cancel and Save:** a partial profile saved successfully; Cancel discarded an unsaved headline edit and cleared its validation error.
- **Refresh:** saved profile and bookmark data remained present after reload; the dashboard reopened with the saved name and profile overview.
- **Saved Jobs:** bookmarking a job updated the existing `nexora:demo-saved` key.
- **Job explorer regression:** keyword search for “frontend” returned the expected title, the Internship filter returned three cards, job details opened, and Apply Now on demo data stayed honest without opening an application destination.
- **My Applications:** the honest “No applications recorded” state appeared with no submissions. An in-memory external redirect record was also verified not to appear as an application.
- **Malformed storage:** malformed profile JSON resulted in a safe 0% profile display without JavaScript errors; the six job cards remained, and bookmark/recruiter storage values were unchanged.
- **Runtime errors:** no page errors were observed during the completed interactive flows.

### Static checks performed

- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parsing — PASS; no duplicate IDs in `index.html`.

### Not performed / blocked

- `python tests/regression_test.py` was attempted but could not start: `ModuleNotFoundError: No module named 'playwright'`. No result from the existing Playwright suite is claimed.
- No dedicated cross-browser, screen-reader, keyboard-only audit, storage-quota test, or multi-viewport responsive audit was performed.
- No backend application submission or persisted application history exists to test. External redirects are not submissions.

## Phase 2, Step 2.3 Part 1 — Student Skills Management

### Interactive checks performed

Checks were run in the integrated browser against the local `file://` page with test profile/session/bookmark/recruiter values restored afterward.

- Add by button saved a skill in the existing profile key; with no level selected, the saved level remained empty.
- Add by Enter saved a skill with the explicitly selected Advanced level and Self-declared evidence.
- Pressing Enter with an empty skill displayed inline validation. A case-only duplicate (`jAvAsCrIpT` vs. `JavaScript`) was rejected without changing the saved skill count.
- Edit loaded the selected skill. After correcting a narrow/overlapping hit target, clicking Edit updated the existing record ID, preserved its selected Intermediate level, and did not create a duplicate.
- Remove deleted only the selected skill. The updated list remained in sync with the dashboard profile overview.
- New and edited skills and the chosen level survived reload. Adding a skill that completed the fifth core field updated profile completion to 100%.
- Removing the final skill reduced completion from 100% to 80% and showed the no-skills empty state.
- At 390px width, the skill tags and controls remained visible and the page had no horizontal overflow.
- No page errors occurred during the completed skill flows.

### Static checks performed

- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parse and duplicate-ID check — PASS.
- `python tests/regression_test.py` was attempted but could not start: `ModuleNotFoundError: No module named 'playwright'`. No result from that suite is claimed.

## Phase 2, Step 2.3 Part 2 — Student Projects & Proof-of-Work Portfolio

### Interactive checks performed

Checks were performed in the integrated browser against the local `file://` page. Test values for profile, session, bookmarks, and recruiter listings were restored afterwards.

- **Empty state and required validation:** no-project state appeared; saving an empty form showed required-field errors for title, description, technologies, and role/contribution.
- **URL validation:** a `javascript:` repository URL was rejected. A credential-bearing URL was also rejected. The project was not saved while either invalid URL was present.
- **Create and safe rendering:** a project with an HTML-like title and description saved as plain text, with no injected elements. “Project added by student” appeared; the existing saved skill record remained unchanged.
- **Links:** valid repository and demo links appeared with `_blank` and `rel="noopener noreferrer"`; repository display said “Repository link provided”.
- **Edit:** edit loaded the saved project fields. Save updated the existing project rather than creating a duplicate. The dashboard profile overview displayed the edited title and technologies.
- **Delete:** dismissing the confirmation preserved the project; accepting the confirmation removed it and restored the empty state.
- **Persistence and completion:** project and skill data survived reload. Completion stayed at 100% after deleting the project because projects are optional and the profile still had all five core fields.
- **Malformed/unsafe saved data:** a non-array projects value produced the empty state; a legacy project with HTML in its title displayed safely and its unsafe `javascript:` and credential-bearing links were not rendered.
- **Responsive and regression smoke checks:** at 390px the project controls remained visible without horizontal overflow. Existing skills were retained; job search/filter, bookmark add/remove, job details, and the honest demo Apply Now flow worked. Onboarding could be opened and guest browsing returned; recruiter portal navigation remained reachable.
- **Runtime errors:** no JavaScript page errors were observed during the completed project and regression flows.

### Static checks performed

- `node --check assets/js/main.js` — PASS.
- Python standard-library HTML parsing and duplicate-ID detection — PASS.
- `python tests/regression_test.py` was attempted but could not start: `ModuleNotFoundError: No module named 'playwright'`. No result from that suite is claimed.

### Remaining manual checks

- No cross-browser, screen-reader, keyboard-only audit, or physical-device testing was performed.
- No real repository validation, contribution verification, or backend persistence exists; project labels describe student-entered data only.

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
