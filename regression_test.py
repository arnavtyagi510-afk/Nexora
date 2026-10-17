#!/usr/bin/env python3
"""NEXORA regression tests (Step 1.2). OPTIONAL developer tool: the website itself needs no tooling.

Requires: python3 + `pip install playwright` + `playwright install chromium`.
Run from the project root:   python3 tests/regression_test.py
Writes tests/results.json and prints one PASS/FAIL line per check.

The suite opens the real index.html in headless Chromium (file:// URL) and, for data-injection
tests, through a tiny local HTTP server so data.js can be swapped for test data.
"""
import json, os, re, sys, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FILE_URL = "file://" + os.path.join(ROOT, "index.html")
RESULTS = []

def record(name, ok, detail=""):
    RESULTS.append({"name": name, "status": "PASS" if ok else "FAIL", "detail": detail})
    print(("PASS  " if ok else "FAIL  ") + name + (("  -> " + detail) if (detail and not ok) else ""))

def check(name, fn):
    try:
        res = fn()
        if res is True or res is None:
            record(name, True)
        else:
            record(name, False, str(res))
    except Exception as e:  # noqa
        record(name, False, "exception: " + str(e).splitlines()[0][:300])

# ---------------------------------------------------------------- helpers
class Site:
    def __init__(self, browser, url=FILE_URL, viewport=(1280, 900), init_script=None, route=None):
        self.ctx = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]})
        if init_script:
            self.ctx.add_init_script(init_script)
        self.page = self.ctx.new_page()
        self.errors = []
        self.failed_requests = []
        self.page.on("pageerror", lambda e: self.errors.append("pageerror: " + str(e)))
        self.page.on("console", lambda m: self.errors.append("console.error: " + m.text) if (m.type == "error" and "Failed to load resource" not in m.text) else None)
        self.page.on("requestfailed", lambda r: self.failed_requests.append(r.url))
        if route:
            self.page.route(route[0], route[1])
        self.page.goto(url)
        self.page.wait_for_selector("#opps-grid")

    def close(self): self.ctx.close()
    def titles(self): return self.page.eval_on_selector_all("#opps-grid .opp__title", "els => els.map(e => e.textContent.trim())")
    def n_cards(self): return len(self.titles())
    def count_text(self): return self.page.inner_text("#results-count").strip()
    def empty(self): return self.page.locator("#opps-grid .empty").count() == 1
    def search(self, q="", loc=""):
        self.page.fill("#search-keyword", q); self.page.fill("#search-location", loc)
        self.page.click("#search-form button[type=submit]")
    def select(self, sel, value): self.page.select_option(sel, value)
    def clear_all(self):
        if self.page.locator("#clear-filters").is_visible(): self.page.click("#clear-filters")
    def count_ok(self):
        n = self.n_cards()
        want = "%d %s found" % (n, "opportunity" if n == 1 else "opportunities")
        return self.count_text() == want or "%s != %s" % (self.count_text(), want)
    def saved_pressed(self):
        return self.page.eval_on_selector_all("[data-save]", "els => els.filter(e => e.getAttribute('aria-pressed')==='true').map(e => Number(e.dataset.save))")

def start_server():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a, **k: None
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, "http://127.0.0.1:%d/index.html" % srv.server_address[1]

# ---------------------------------------------------------------- core regression: the 18 required checks
def core(b):
    s = Site(b)
    check("01 Homepage loads without JavaScript errors", lambda: (s.errors == [] and s.n_cards() == 6 and s.count_ok() is True) or "errors=%s cards=%s" % (s.errors, s.n_cards()))
    check("01b No failed network requests for local assets", lambda: not [u for u in s.failed_requests if not u.startswith("https://fonts.")] or str(s.failed_requests))

    def t_title():
        s.search("frontend"); return s.titles() == ["Junior Frontend Developer"] or s.titles()
    check("02 Search by title", t_title); s.clear_all(); s.page.reload(); s.page.wait_for_selector("#opps-grid .opp")

    def t_company():
        s.search("quarry"); return s.titles() == ["Data Analyst Intern"] or s.titles()
    check("03 Search by company", t_company)
    def t_skill():
        s.search("pytorch"); return s.titles() == ["Machine Learning Associate (Entry)"] or s.titles()
    check("04 Search by skill", t_skill)
    def t_loc():
        s.search("", "Mumbai"); a = s.titles()
        s.search("mumbai", ""); b2 = s.titles()
        return (a == ["UI/UX Design Intern"] and b2 == ["UI/UX Design Intern"]) or (a, b2)
    check("05 Search by location (location box and keyword box)", t_loc)

    def t_enter():
        s.page.fill("#search-location", ""); s.page.fill("#search-keyword", "figma"); s.page.press("#search-keyword", "Enter")
        return s.titles() == ["UI/UX Design Intern"] or s.titles()
    check("06 Enter submits a search", t_enter)

    def t_clear():
        s.page.fill("#search-keyword", "figma"); s.page.press("#search-keyword", "Enter")
        s.page.click("#search-clear")
        return (s.n_cards() == 6 and s.page.input_value("#search-keyword") == "") or s.n_cards()
    check("07 Clear search restores results", t_clear)

    s.clear_all()
    expect = {
        "#filter-type": {"Job": 3, "Internship": 3},
        "#filter-mode": {"Remote": 2, "Hybrid": 2, "On-site": 2},
        "#filter-category": {"Technology": 3, "Design": 1, "Marketing": 1, "Business": 1},
        "#filter-experience": {"Entry-level": 2, "Internship": 3, "Unknown": 1},
    }
    def t_filters():
        bad = []
        for sel, vals in expect.items():
            for v, n in vals.items():
                s.select(sel, v)
                if s.n_cards() != n or s.count_ok() is not True: bad.append((sel, v, s.n_cards()))
                s.select(sel, "all")
        return not bad or bad
    check("08 Each supported filter works (counts per value)", t_filters)

    def t_combo():
        s.select("#filter-type", "Job"); s.select("#filter-mode", "Hybrid")
        a = s.n_cards()
        s.select("#filter-mode", "Remote"); b2 = s.n_cards(); e = s.empty()
        s.select("#filter-mode", "all"); s.select("#filter-type", "Internship"); s.select("#filter-mode", "Remote"); s.select("#filter-category", "Business")
        c = s.titles()
        s.clear_all()
        return (a == 2 and b2 == 0 and e and c == ["Business Analyst Intern"]) or (a, b2, e, c)
    check("09 Multiple filters combine correctly (incl. search + filters)", t_combo)

    def t_clear_all():
        s.search("analyst", "Remote"); s.select("#filter-type", "Internship"); s.select("#filter-mode", "Remote"); s.select("#filter-category", "Business"); s.select("#filter-experience", "Internship")
        s.page.click("#clear-filters")
        vals = [s.page.input_value(x) for x in ("#search-keyword", "#search-location", "#filter-type", "#filter-mode", "#filter-category", "#filter-experience", "#search-type")]
        ok = vals == ["", "", "all", "all", "all", "all", "all"] and s.n_cards() == 6 and s.page.locator("#active-filters li").count() == 0 and not s.page.locator("#clear-filters").is_visible()
        return ok or (vals, s.n_cards())
    check("10 Clear all filters resets all filter state", t_clear_all)

    def t_sort():
        s.select("#sort-by", "title"); t = s.titles()
        dis = s.page.eval_on_selector_all("#sort-by option", "o => o.filter(x => x.disabled).map(x => x.value)")
        s.select("#sort-by", "relevance")
        return (t == sorted(t, key=str.lower) and set(dis) == {"newest", "pay"}) or (t, dis)
    check("11 Sorting works where supported (Title A-Z; newest/pay disabled, no data)", t_sort)

    def t_counts():
        bad = []
        for q in ["", "analyst", "intern", "zzz", "python", "react"]:
            s.search(q, "")
            if s.count_ok() is not True: bad.append(q)
        s.clear_all(); s.page.fill("#search-keyword", ""); s.page.click("#search-form button[type=submit]")
        return not bad or bad
    check("12 Result counts remain accurate (singular/plural, zero)", t_counts)

    def t_empty():
        s.search("zzzzqq")
        ok = s.empty() and s.n_cards() == 0 and s.count_text() == "0 opportunities found" and s.page.locator("[data-empty=edit]").count() == 1 and s.page.locator("[data-empty=clear]").count() == 1
        s.page.click("[data-empty=clear]")
        return (ok and s.n_cards() == 6) or "empty=%s" % ok
    check("13 Empty state appears for zero matches, Clear all recovers", t_empty)
    s.close()

    # bookmarks
    s = Site(b)
    def t_toggle():
        s.page.click("[data-save='2']"); a = s.saved_pressed()
        s.page.click("[data-save='4']"); c = s.saved_pressed()
        s.page.click("[data-save='2']"); d = s.saved_pressed()
        return (a == [2] and sorted(c) == [2, 4] and d == [4]) or (a, c, d)
    check("14 Bookmarks toggle on and off", t_toggle)
    def t_persist():
        s.page.reload(); s.page.wait_for_selector("#opps-grid .opp")
        a = s.saved_pressed()
        s.page.click("[data-save='1']"); s.page.reload(); s.page.wait_for_selector("#opps-grid .opp")
        c = sorted(s.saved_pressed())
        s.page.click("[data-save='1']"); s.page.click("[data-save='4']"); s.page.reload(); s.page.wait_for_selector("#opps-grid .opp")
        d = s.saved_pressed()
        return (a == [4] and c == [1, 4] and d == []) or (a, c, d)
    check("15 Bookmarks persist after refresh (add and remove)", t_persist)

    def t_nav():
        s.page.click(".nav__links a[data-filter-link=Internship]")
        a = (s.page.input_value("#filter-type"), s.n_cards())
        s.page.click(".nav__links a[href='#opportunities']:not([data-filter-link])")
        c = s.n_cards()
        s.page.click(".nav__link[data-soon=Companies]"); dlg = s.page.evaluate("document.getElementById('dialog').open")
        s.page.click("#dialog-close"); closed = not s.page.evaluate("document.getElementById('dialog').open")
        s.page.click("[data-category='Marketing']"); m = s.titles()
        s.page.click(".wordmark"); s.clear_all(); s.page.fill("#search-keyword", "")
        return (a == ("Internship", 3) and c == 6 and dlg and closed and m == ["Digital Marketing Associate"]) or (a, c, dlg, closed, m)
    check("16 Existing navigation intact (nav links, Soon dialogs, category cards)", t_nav)

    s.page.set_viewport_size({"width": 375, "height": 800})
    def t_menu():
        s.page.click("#menu-toggle"); o = s.page.locator("#mobile-menu").is_visible(); e1 = s.page.get_attribute("#menu-toggle", "aria-expanded")
        s.page.keyboard.press("Escape"); c = not s.page.locator("#mobile-menu").is_visible()
        return (o and e1 == "true" and c) or (o, e1, c)
    check("16b Mobile menu opens and closes (button, Escape)", t_menu)
    s.close()

    # 17 overflow
    def t_overflow():
        bad = []
        for w in (320, 375, 414, 768, 1024, 1280):
            s2 = Site(b, viewport=(w, 800))
            sw, cw = s2.page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
            if sw > cw: bad.append((w, sw, cw))
            s2.search("zzzz")
            sw, cw = s2.page.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
            if sw > cw: bad.append((w, "empty", sw, cw))
            s2.close()
        return not bad or bad
    check("17 No horizontal overflow at 320/375/414/768/1024/1280 px", t_overflow)

    # 18 design + assets
    s = Site(b)
    def t_design():
        cs = s.page.evaluate("""() => {
          const g = (sel, p) => getComputedStyle(document.querySelector(sel))[p];
          return { bg: g('body','backgroundColor'), btn: g('.btn--primary','backgroundColor'), word: g('.wordmark','color'),
                   font: g('body','fontFamily'), header: !!document.querySelector('.site-header'), footer: !!document.querySelector('.site-footer'),
                   sections: ['top','opportunities','categories','why','how'].every(id => document.getElementById(id)),
                   favicon: !!document.querySelector('link[rel=icon]') }
        }""")
        ok = cs["bg"] == "rgb(247, 245, 239)" and cs["btn"] == "rgb(36, 75, 59)" and cs["word"] == "rgb(36, 75, 59)" and "Plus Jakarta Sans" in cs["font"] and cs["header"] and cs["footer"] and cs["sections"] and cs["favicon"]
        return ok or cs
    check("18 Design preserved: ivory bg, forest-green primary, font stack, header/footer/sections", t_design)
    def t_assets():
        missing = []
        for p in ["assets/favicon.svg", "assets/css/tokens.css", "assets/css/base.css", "assets/css/components.css", "assets/css/home.css", "assets/js/data.js", "assets/js/jobs.js", "assets/js/main.js"]:
            if not os.path.isfile(os.path.join(ROOT, p)): missing.append(p)
        return not missing or missing
    check("18b All required asset files present", t_assets)
    s.close()

# ---------------------------------------------------------------- Step 1.2 Part 2 checks
TEST_DATA = r"""
window.NEXORA_DEMO = { opportunities: [
 { id: 1, company: "Acme Test Co", title: "Verified Role", logo: null, category: "Technology", type: "Job", employmentType: "Full-time", mode: "Hybrid", location: "Pune",
   salary: { min: 400000, max: 600000, currency: "INR", period: "year" }, experience: "Entry-level", skills: ["Go"], description: "A real description.",
   postedDate: "2026-10-01", deadline: "2099-12-31", applyUrl: "https://example.com/apply", status: "VERIFIED", evidenceUrl: "https://example.com/proof", tags: [] },
 { id: 2, company: "Fake Verified Inc", title: "Claims Verified No Proof", logo: null, category: "Technology", type: "Job", employmentType: null, mode: "Remote", location: "Remote",
   salary: null, experience: null, skills: [], description: null, postedDate: null, deadline: null, applyUrl: null, status: "VERIFIED", evidenceUrl: null, tags: [] },
 { id: 3, company: "Unver Ltd", title: "Unverified Role", logo: null, category: "Design", type: "Internship", employmentType: null, mode: "On-site", location: "Delhi",
   salary: null, experience: "Internship", skills: ["Figma"], description: null, postedDate: "2026-09-01", deadline: "2020-01-01", applyUrl: "https://example.com/u", status: "UNVERIFIED", evidenceUrl: null, tags: [] },
 { id: 4, company: "Demo Corp", title: "Demo With Apply Url", logo: null, category: "Business", type: "Job", employmentType: null, mode: "Remote", location: "Remote",
   salary: null, experience: null, skills: [], description: null, postedDate: null, deadline: null, applyUrl: "https://example.com/should-not-show", status: "DEMO", evidenceUrl: null, tags: [] },
 { id: 5, company: "<img src=x onerror=window.__xss=1>", title: "<b>Injected</b> Title", logo: null, category: "Marketing", type: "Job", employmentType: null, mode: "Remote", location: "Remote",
   salary: null, experience: null, skills: ["<i>x</i>"], description: null, postedDate: null, deadline: null, applyUrl: "javascript:window.__xss=2", status: "UNVERIFIED", evidenceUrl: "javascript:window.__xss=3", tags: [] }
] };
"""

def with_test_data(b, url, **kw):
    def handler(route):
        route.fulfill(status=200, content_type="application/javascript", body=TEST_DATA)
    return Site(b, url=url, route=("**/assets/js/data.js", handler), **kw)

def part2(b, http_url):
    # --- card content depends on real data
    s = Site(b)
    def t_cards_demo():
        cards = s.page.eval_on_selector_all("#opps-grid .opp", "els => els.map(e => ({t: e.querySelector('.opp__title').textContent, txt: e.innerText}))")
        bad = []
        for c in cards:
            if "Demo listing" not in c["txt"]: bad.append(("no demo badge", c["t"]))
            if re.search(r"Verified(?! )|Unverified", c["txt"]): bad.append(("wrong status", c["t"]))
            if re.search(r"₹|\$|salary|Posted|Apply by|Deadline", c["txt"], re.I): bad.append(("invented pay/date", c["t"]))
            if not re.search(r"\b(Job|Internship)\b", c["txt"]): bad.append(("no type", c["t"]))
            if not re.search(r"\b(Remote|Hybrid|On-site)\b", c["txt"]): bad.append(("no mode", c["t"]))
        return not bad or bad
    check("P2-01 Shipped demo cards: DEMO badge, type, mode; no invented pay/dates/status", t_cards_demo)
    def t_exp_shown():
        t = s.page.inner_text("#opps-grid .opp:nth-child(1)")
        t5 = s.page.inner_text("#opps-grid .opp:nth-child(5)")
        return ("Entry-level" in t and "Unknown" not in t5 and "Experience" not in t5) or (t, t5)
    check("P2-02 Experience shown only when known (Entry-level shown; unknown not shown)", t_exp_shown)
    def t_view():
        s.page.click("[data-view='1']")
        o = s.page.evaluate("document.getElementById('dialog').open")
        txt = s.page.inner_text("#dialog")
        links = s.page.locator("#dialog a").count()
        s.page.keyboard.press("Escape")
        back = s.page.evaluate("document.activeElement && document.activeElement.dataset && document.activeElement.dataset.view")
        return (o and "demo" in txt.lower() and "applied" not in txt.lower() and "submitted" not in txt.lower() and links == 0 and back == "1") or (o, txt, links, back)
    check("P2-03 View details dialog: honest DEMO text, no apply link, focus returns to button", t_view)
    s.close()

    s = with_test_data(b, http_url)
    def t_status():
        cards = {t: s.page.inner_text("#opps-grid .opp:nth-child(%d)" % (i + 1)) for i, t in enumerate(s.titles())}
        v = cards["Verified Role"]; f = cards["Claims Verified No Proof"]; u = cards["Unverified Role"]; d = cards["Demo With Apply Url"]
        ok = ("Verified" in v and "Unverified" not in v and "Demo listing" not in v)
        ok = ok and ("Unverified listing" in f and "Verified\n" not in f.replace("Unverified listing", ""))
        ok = ok and ("Unverified listing" in u) and ("Demo listing" in d)
        return ok or cards
    check("P2-04 Status badges follow evidence: VERIFIED needs evidenceUrl, else shown Unverified; DEMO stays Demo", t_status)
    def t_known_fields():
        v = s.page.inner_text("#opps-grid .opp:nth-child(1)")
        has = all(x in v for x in ["Pune", "Hybrid", "Entry-level", "Full-time", "Job"]) and "4,00,000" in v and "6,00,000" in v and "year" in v and "Posted" in v and "1 Oct 2026" in v and "Apply by" in v
        u = s.page.inner_text("#opps-grid .opp:nth-child(3)")
        past = "passed" in u.lower() or "closed" in u.lower()
        n = s.page.inner_text("#opps-grid .opp:nth-child(2)")
        none = not re.search(r"₹|\$|Posted|Apply by|Deadline|Entry-level|Full-time", n)
        return (has and past and none) or (v, u, n)
    check("P2-05 Compensation, experience, employment type and dates appear only when known; past deadline flagged", t_known_fields)
    def t_xss():
        x = s.page.evaluate("window.__xss")
        s.page.click("[data-view='5']"); links = s.page.eval_on_selector_all("#dialog a", "a => a.map(x => x.href)")
        s.page.keyboard.press("Escape")
        return (x is None and not [l for l in links if l.startswith("javascript")] and s.page.locator("#opps-grid img").count() == 0) or (x, links)
    check("P2-06 Injected HTML/javascript: URLs in data are escaped/ignored", t_xss)
    def t_links():
        s.page.click("[data-view='1']")
        a = s.page.eval_on_selector_all("#dialog a", "a => a.map(x => ({h: x.href, r: x.rel, t: x.target, txt: x.textContent}))")
        txt = s.page.inner_text("#dialog"); s.page.keyboard.press("Escape")
        s.page.click("[data-view='4']"); d = s.page.locator("#dialog a").count(); dt = s.page.inner_text("#dialog"); s.page.keyboard.press("Escape")
        okl = len(a) >= 1 and all("noopener" in x["r"] and x["t"] == "_blank" for x in a) and any("example.com/apply" in x["h"] for x in a) and any("example.com/proof" in x["h"] for x in a)
        return (okl and d == 0 and "submitted" not in (txt + dt).lower()) or (a, d)
    check("P2-07 Dialog links: apply/evidence only for non-DEMO listings that have them; external links use rel=noopener; no 'submitted' claims", t_links)
    s.close()

    # --- bookmarks, part 2
    s = Site(b)
    def t_saved_filter():
        s.page.click("[data-save='2']"); s.page.click("[data-save='5']")
        lab = s.page.inner_text("#saved-toggle")
        s.page.click("#saved-toggle")
        a = sorted(s.titles()); pressed = s.page.get_attribute("#saved-toggle", "aria-pressed"); cnt = s.count_text()
        s.page.select_option("#filter-type", "Job"); b2 = s.titles()
        s.page.click("[data-save='5']"); c = s.n_cards()
        s.page.click("#clear-filters")
        d = s.n_cards()
        return ("2" in lab and a == ["Data Analyst Intern", "Digital Marketing Associate"] and pressed == "true" and cnt == "2 opportunities found" and b2 == ["Digital Marketing Associate"] and c == 0 and d == 6) or (lab, a, pressed, cnt, b2, c, d)
    check("P2-08 Saved-only view: count label, filters combine, unbookmarking updates list, Clear all resets", t_saved_filter)
    def t_saved_empty():
        s.page.evaluate("localStorage.clear()"); s.page.reload(); s.page.wait_for_selector("#opps-grid .opp")
        s.page.click("#saved-toggle"); txt = s.page.inner_text("#opps-grid .empty")
        s.page.click("#saved-toggle")
        return ("saved" in txt.lower() and s.n_cards() == 6) or txt
    check("P2-09 Saved-only with nothing saved shows an honest empty state", t_saved_empty)
    def t_label():
        s.page.click("[data-save='3']")
        lab = s.page.get_attribute("[data-save='3']", "aria-label"); pr = s.page.get_attribute("[data-save='3']", "aria-pressed")
        focus = s.page.evaluate("document.activeElement.dataset.save")
        s.page.click("[data-save='3']"); lab2 = s.page.get_attribute("[data-save='3']", "aria-label")
        return (lab == lab2 and lab.startswith("Bookmark") and pr == "true" and focus == "3") or (lab, lab2, pr, focus)
    check("P2-10 Bookmark button: stable accessible name + aria-pressed, focus kept after toggle", t_label)
    def t_storage_value():
        s.page.click("[data-save='6']"); v = s.page.evaluate("localStorage.getItem('nexora:demo-saved')")
        s.page.click("[data-save='6']")
        return v == "[6]" or v
    check("P2-11 localStorage holds a plain id array under nexora:demo-saved", t_storage_value)
    def t_corrupt():
        errs = []
        for bad in ['not json{', '{"a":1}', '["x", 99, 2, 2, null]', '"str"']:
            s2 = Site(b, init_script="try{localStorage.setItem('nexora:demo-saved', %s)}catch(e){}" % json.dumps(bad))
            ids = s2.saved_pressed()
            if s2.errors or s2.n_cards() != 6 or ids not in ([], [2]): errs.append((bad, s2.errors, ids))
            s2.close()
        return not errs or errs
    check("P2-12 Corrupted / odd stored bookmark data is ignored safely (no errors, valid ids only)", t_corrupt)
    def t_storage_blocked():
        init = "Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });"
        s2 = Site(b, init_script=init)
        s2.page.click("[data-save='2']"); a = s2.saved_pressed()
        toast = s2.page.inner_text("#toast")
        s2.page.click("[data-save='4']"); c = sorted(s2.saved_pressed())
        s2.page.click("#saved-toggle"); n = s2.n_cards()
        ok = a == [2] and c == [2, 4] and n == 2 and s2.errors == [] and ("not be kept" in toast.lower() or "this visit" in toast.lower() or "unavailable" in toast.lower())
        r = ok or (a, c, n, s2.errors, toast)
        s2.close(); return r
    check("P2-13 Storage blocked: no errors, bookmarks work for the visit, user is told they won't persist", t_storage_blocked)
    def t_storage_full():
        init = "Storage.prototype.setItem = function(){ throw new DOMException('quota', 'QuotaExceededError'); };"
        s2 = Site(b, init_script=init)
        s2.page.click("[data-save='2']"); a = s2.saved_pressed(); toast = s2.page.inner_text("#toast")
        r = (a == [2] and s2.errors == [] and toast != "") or (a, s2.errors, toast)
        s2.close(); return r
    check("P2-14 Storage write fails (quota): no errors, state kept in memory, user told", t_storage_full)
    def t_cross_tab():
        ctx = b.new_context(); p1 = ctx.new_page(); p2 = ctx.new_page()
        p1.goto(FILE_URL); p2.goto(FILE_URL); p1.wait_for_selector("#opps-grid .opp"); p2.wait_for_selector("#opps-grid .opp")
        p1.click("[data-save='3']"); p2.wait_for_timeout(300)
        pr = p2.get_attribute("[data-save='3']", "aria-pressed"); lab = p2.inner_text("#saved-toggle")
        ctx.close()
        return (pr == "true" and "1" in lab) or (pr, lab)
    check("P2-15 Bookmark changes in another tab are reflected (storage event)", t_cross_tab)

    # --- accessibility
    def t_names():
        bad = s.page.evaluate("""() => {
          const out = [];
          const name = el => (el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent || el.getAttribute('title') || '').trim();
          document.querySelectorAll('button, a[href], input, select').forEach(el => { if (!name(el)) out.push(el.outerHTML.slice(0, 90)); });
          return out; }""")
        return not bad or bad
    check("P2-16 Every button, link, input and select has an accessible name", t_names)
    def t_labels():
        bad = s.page.evaluate("""() => [...document.querySelectorAll('input, select')].filter(el => !(el.labels && el.labels.length) && !el.getAttribute('aria-label')).map(e => e.id)""")
        return not bad or bad
    check("P2-17 Search and filter controls have programmatic labels", t_labels)
    def t_focus():
        res = []
        for sel in ["#search-keyword", "#search-location", "#search-type", "#filter-type", "#sort-by", "#saved-toggle", "[data-save='1']", "[data-view='1']", ".nav__link[data-soon=Companies]", "#search-form button[type=submit]"]:
            s.page.focus(sel); s.page.keyboard.press("Shift+Tab"); s.page.keyboard.press("Tab")
            info = s.page.evaluate("""(sel) => { const el = document.querySelector(sel);
               const own = getComputedStyle(el); let node = el, ring = false;
               for (let i = 0; i < 3 && node; i++, node = node.parentElement) { const cs = getComputedStyle(node);
                 if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) ring = true; }
               return { focused: document.activeElement === el, ring } }""", sel)
            if not (info["focused"] and info["ring"]): res.append((sel, info))
        return not res or res
    check("P2-18 Visible focus indicator (>=2px outline on element or its field wrapper) on key controls", t_focus)
    def t_tab_order():
        s.page.goto(FILE_URL); s.page.wait_for_selector("#opps-grid .opp")
        seen = []
        for _ in range(40):
            s.page.keyboard.press("Tab")
            seen.append(s.page.evaluate("(() => { const a = document.activeElement; return a ? (a.id || a.dataset.save && 'save'+a.dataset.save || a.dataset.view && 'view'+a.dataset.view || a.className.split(' ')[0] || a.tagName) : '' })()"))
        need = ["search-keyword", "search-location", "search-type", "filter-type", "sort-by", "save1", "view1"]
        miss = [n for n in need if n not in seen]
        return not miss or ("not reachable by Tab:", miss, seen)
    check("P2-19 Keyboard: search, filters, bookmark and details buttons reachable with Tab", t_tab_order)
    def t_kbd_ops():
        s.page.goto(FILE_URL); s.page.wait_for_selector("#opps-grid .opp")
        s.page.focus("[data-save='2']"); s.page.keyboard.press("Enter"); a = s.saved_pressed()
        s.page.keyboard.press("Space"); c = s.saved_pressed()
        s.page.focus("[data-view='2']"); s.page.keyboard.press("Enter"); o = s.page.evaluate("document.getElementById('dialog').open")
        s.page.keyboard.press("Escape"); cl = not s.page.evaluate("document.getElementById('dialog').open")
        return (a == [2] and c == [] and o and cl) or (a, c, o, cl)
    check("P2-20 Keyboard: Enter/Space toggle bookmark, Enter opens details, Escape closes", t_kbd_ops)
    def t_landmarks():
        r = s.page.evaluate("""() => ({ h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length, lang: document.documentElement.lang,
           ids: (() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return ids.filter((x, i) => ids.indexOf(x) !== i) })(),
           navs: [...document.querySelectorAll('nav')].map(n => n.getAttribute('aria-label')), skip: !!document.querySelector('.skip-link[href="#main"]'),
           live: ['results-count', 'search-status', 'toast'].map(i => { const e = document.getElementById(i); return e && (e.getAttribute('role') === 'status' || e.getAttribute('aria-live')) }) })""")
        ok = r["h1"] == 1 and r["main"] == 1 and r["lang"] == "en" and not r["ids"] and all(r["navs"]) and r["skip"] and all(r["live"])
        return ok or r
    check("P2-21 Semantics: one h1/main, lang, unique ids, labelled navs, skip link, live regions", t_landmarks)
    def t_contrast():
        def lum(h):
            h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
            c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        def ratio(a, b2):
            la, lb = lum(a), lum(b2); hi, lo = max(la, lb), min(la, lb); return (hi + 0.05) / (lo + 0.05)
        pairs = {"body text on ivory": ("#242824", "#F7F5EF"), "muted on ivory": ("#666D66", "#F7F5EF"), "muted on white": ("#666D66", "#FFFFFF"),
                 "muted on mint": ("#666D66", "#E3F1E9"), "primary on mint": ("#244B3B", "#E3F1E9"), "white on primary": ("#FFFFFF", "#244B3B"),
                 "text on sage": ("#242824", "#D8E2D5"), "primary on sage": ("#244B3B", "#D8E2D5")}
        bad = {k: round(ratio(*v), 2) for k, v in pairs.items() if ratio(*v) < 4.5}
        return not bad or bad
    check("P2-22 Colour contrast of design-token pairs >= 4.5:1 (WCAG AA)", t_contrast)
    def t_target():
        small = s.page.evaluate("""() => [...document.querySelectorAll('.opp__save, .opp .btn, .search .btn, .nav__toggle')].filter(e => e.offsetParent && (e.getBoundingClientRect().height < 40 || e.getBoundingClientRect().width < 40)).map(e => e.className)""")
        return not small or small
    check("P2-23 Card and search action buttons are at least 40px in both dimensions", t_target)
    s.close()

    # --- emulated touch phone (Chromium mobile emulation: touch events, 390x844, DPR 3). Not a real device.
    def t_touch():
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(FILE_URL); pg.wait_for_selector("#opps-grid .opp")
        pg.tap("[data-save='2']"); a = pg.get_attribute("[data-save='2']", "aria-pressed")
        pg.tap("[data-view='2']"); o = pg.evaluate("document.getElementById('dialog').open")
        pg.tap("#dialog-close"); c = not pg.evaluate("document.getElementById('dialog').open")
        pg.tap("#menu-toggle"); m = pg.locator("#mobile-menu").is_visible(); pg.tap("#menu-toggle")
        pg.tap("#saved-toggle"); n = pg.locator("#opps-grid .opp").count()
        sw, cw = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
        ctx.close()
        return (a == "true" and o and c and m and n == 1 and sw <= cw and not errs) or (a, o, c, m, n, sw, cw, errs)
    check("P2-27 Emulated touch phone (390px): tap bookmark, details, menu, saved view; no overflow/errors", t_touch)

    # --- missing optional elements
    # More deterministic: serve index.html with the element stripped out.
    def t_missing_det():
        import http.server as hs
        res = []
        base = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
        targets = {
            "toast": r'<div class="toast"[^>]*></div>', "dialog": r'<dialog.*?</dialog>', "search-clear": r'<button class="search__clear".*?</button>',
            "filters-note": r'<p class="filters__note"[^>]*></p>', "hero-type": r'<div class="search__field">\s*<svg class="icon" aria-hidden="true"><use href="#i-briefcase"/></svg>.*?</select>\s*</div>',
            "search-status": r'<p class="search-status"[^>]*></p>', "menu-toggle": r'<button class="nav__toggle".*?</button>', "mobile-menu": r'<div class="mobile-menu".*?\n    </div>\n  </header>',
            "saved-toggle": r'<button[^>]*id="saved-toggle".*?</button>', "datalist": r'<datalist[^>]*></datalist>', "segmented": r'<div class="segmented".*?</div>',
            "active-filters": r'<ul class="filters__active"[^>]*></ul>', "clear-filters": r'<button[^>]*id="clear-filters".*?</button>', "sort": r'<label class="filter" for="sort-by">.*?</label>',
            "popular-chips": r'<div class="hero__popular".*?</div>', "results-count": r'<p class="results__count"[^>]*></p>',
        }
        for name, rx in targets.items():
            html, n = re.subn(rx, "", base, count=1, flags=re.S)
            if n == 0: res.append((name, "pattern not found")); continue
            tmp = os.path.join(ROOT, "_tmp_missing.html")
            open(tmp, "w", encoding="utf-8").write(html)
            try:
                s2 = Site(b, url="file://" + tmp)
                if s2.errors: res.append((name, s2.errors[:2]))
                elif s2.n_cards() != 6: res.append((name, "cards=%d" % s2.n_cards()))
                else:
                    try:
                        s2.search("react")
                        if s2.n_cards() != 1: res.append((name, "search broke"))
                    except Exception: pass
                    if s2.errors: res.append((name, s2.errors[:2]))
                s2.close()
            finally:
                os.remove(tmp)
        return not res or res
    check("P2-24 Page still runs with no JS errors when optional elements are missing (15 variants)", t_missing_det)

# ---------------------------------------------------------------- unit checks for pure helpers (jobs.js in the browser)
def units(b):
    s = Site(b)
    def u():
        r = s.page.evaluate("""() => { const J = NexoraJobs; return {
          fs: J.formatSalary({min: 400000, max: 600000, currency: 'INR', period: 'year'}),
          fs2: J.formatSalary({min: 25, max: null, currency: 'USD', period: 'hour'}),
          fs3: J.formatSalary(null), fs4: J.formatSalary({min: 0, max: 0, currency: 'INR', period: 'year'}),
          fd: J.formatDate('2026-10-01'), fd2: J.formatDate('nope'), fd3: J.formatDate('2026-02-31'),
          p1: J.isPast('2020-01-01', new Date('2026-10-18T00:00:00Z')), p2: J.isPast('2099-01-01', new Date('2026-10-18T00:00:00Z')), p3: J.isPast(null, new Date()),
          su: [J.safeUrl('https://a.com/x'), J.safeUrl('http://a.com'), J.safeUrl('javascript:alert(1)'), J.safeUrl('//evil.com'), J.safeUrl(''), J.safeUrl(null), J.safeUrl('data:text/html,hi')],
          saved: J.run(J.normalizeAll(NEXORA_DEMO.opportunities), Object.assign(J.defaultState(), {saved: true}), [1, 2]).map(j => j.id),
          saved0: J.run(J.normalizeAll(NEXORA_DEMO.opportunities), Object.assign(J.defaultState(), {saved: true}), []).length,
          sv: J.cleanSavedIds(['x', 99, 2, 2, null, 3.5, 4], J.normalizeAll(NEXORA_DEMO.opportunities)),
          sv2: J.cleanSavedIds('nope', []) } }""")
        ok = (r["fs"].count("4,00,000") == 1 and "6,00,000" in r["fs"] and r["fs"].endswith("/ year") and r["fs2"].startswith("From") and "25" in r["fs2"] and "hour" in r["fs2"]
              and r["fs3"] is None and r["fs4"] is None and r["fd"] == "1 Oct 2026" and r["fd2"] is None and r["fd3"] is None
              and r["p1"] is True and r["p2"] is False and r["p3"] is False
              and r["su"] == ["https://a.com/x", "http://a.com", None, None, None, None, None]
              and r["saved"] == [1, 2] and r["saved0"] == 0 and r["sv"] == [2, 4] and r["sv2"] == [])
        return ok or r
    def u2():
        t = s.page.inner_text("#opps-grid .opp:nth-child(2)")   # Data Analyst Intern, location Remote + mode Remote
        return t.count("Remote") == 1 or t
    check("P2-26 Remote listing shows 'Remote' once (location duplicate suppressed)", u2)
    check("P2-25 Pure helpers: formatSalary/formatDate/isPast/safeUrl/saved filter/cleanSavedIds", u)
    s.close()

def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    srv, http_url = start_server()
    with sync_playwright() as p:
        b = p.chromium.launch()
        if which in ("all", "core"): core(b)
        if which in ("all", "part2"):
            units(b); part2(b, http_url)
        b.close()
    srv.shutdown()
    out = os.path.join(ROOT, "tests", "results.json")
    json.dump(RESULTS, open(out, "w"), indent=1)
    f = [r for r in RESULTS if r["status"] == "FAIL"]
    print("\n%d checks: %d PASS, %d FAIL" % (len(RESULTS), len(RESULTS) - len(f), len(f)))
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
