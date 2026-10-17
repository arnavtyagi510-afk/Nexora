/* NEXORA job logic (Step 1.2): normalising, searching, filtering, sorting, card facts, formatting.
   Pure functions only: no DOM access, so it can be tested in Node as well as the browser.
   Exposes window.NexoraJobs (or module.exports under Node). */
(function (root) {
  "use strict";

  var STATUSES = ["DEMO", "UNVERIFIED", "VERIFIED"];

  /* Filter definitions: the options a visitor can pick. Options with no matching
     listing in the dataset are shown disabled by the UI instead of pretending to work. */
  var FACETS = {
    type: { label: "Type", options: [
      { value: "all", label: "All types" },
      { value: "Internship", label: "Internship" },
      { value: "Job", label: "Jobs (all kinds)" },
      { value: "Full-time", label: "Full-time" },
      { value: "Part-time", label: "Part-time" },
      { value: "Contract", label: "Contract" },
      { value: "Freelance", label: "Freelance" }
    ] },
    mode: { label: "Work mode", options: [
      { value: "all", label: "All work modes" },
      { value: "Remote", label: "Remote" },
      { value: "Hybrid", label: "Hybrid" },
      { value: "On-site", label: "On-site" }
    ] },
    category: { label: "Category", options: [
      { value: "all", label: "All categories" },
      { value: "Technology", label: "Technology" },
      { value: "Design", label: "Design" },
      { value: "Marketing", label: "Marketing" },
      { value: "Business", label: "Business" }
    ] },
    experience: { label: "Experience", options: [
      { value: "all", label: "All levels" },
      { value: "Entry-level", label: "Entry-level / Fresher" },
      { value: "Internship", label: "Internship" },
      { value: "Experienced", label: "Experienced" },
      { value: "Unknown", label: "Unknown" }
    ] }
  };

  var SORTS = [
    { value: "relevance", label: "Relevance" },
    { value: "title", label: "Title A–Z" },
    { value: "newest", label: "Newest first" },
    { value: "pay", label: "Compensation, high to low" }
  ];

  /* ---------- helpers ---------- */
  function norm(value) {
    return String(value == null ? "" : value).toLowerCase().replace(/\s+/g, " ").trim();
  }
  function isAlnum(ch) { return /[a-z0-9]/.test(ch); }

  /* True when `tok` starts a word inside `text` ("dev" matches "Developer", "end" does not match "Frontend"). */
  function hasWordStart(text, tok) {
    var from = 0, i;
    while ((i = text.indexOf(tok, from)) !== -1) {
      if (i === 0 || !isAlnum(text.charAt(i - 1))) return true;
      from = i + 1;
    }
    return false;
  }

  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    var t = Date.parse(value + "T00:00:00Z");
    if (isNaN(t)) return null;
    return new Date(t).toISOString().slice(0, 10) === value ? t : null;   /* rejects 2026-02-31 */
  }

  /* Only plain http(s) links are ever used as hrefs. Anything else (javascript:, data:, //host) becomes null. */
  function safeUrl(value) {
    if (typeof value !== "string") return null;
    var v = value.trim();
    if (!/^https?:\/\//i.test(v)) return null;
    try { var u = new URL(v); return (u.protocol === "http:" || u.protocol === "https:") ? v : null; } catch (err) { return null; }
  }

  function validSalary(s) {
    if (!s || typeof s !== "object") return null;
    var min = typeof s.min === "number" && isFinite(s.min) && s.min > 0 ? s.min : null;
    var max = typeof s.max === "number" && isFinite(s.max) && s.max > 0 ? s.max : null;
    if (min === null && max === null) return null;
    if (!s.currency || !s.period) return null;
    return { min: min, max: max, currency: String(s.currency), period: String(s.period) };
  }

  /* Optional list fields (responsibilities, qualifications, benefits): keep only non-empty strings. Missing or malformed => []. */
  function cleanList(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (v) { return typeof v === "string" && v.trim() !== ""; }).map(function (v) { return v.trim(); });
  }

  /* Make a record safe to use: arrays are arrays, unknown stays null, and a VERIFIED
     status without evidence is downgraded (a verification claim needs proof). */
  function normalize(job) {
    var j = {};
    for (var k in job) if (Object.prototype.hasOwnProperty.call(job, k)) j[k] = job[k];
    j.skills = Array.isArray(job.skills) ? job.skills.slice() : [];
    j.tags = Array.isArray(job.tags) ? job.tags.slice() : [];
    j.salary = validSalary(job.salary);
    j.postedDate = validDate(job.postedDate) !== null ? job.postedDate : null;
    j.deadline = validDate(job.deadline) !== null ? job.deadline : null;
    j.experience = job.experience || null;
    j.employmentType = job.employmentType || null;
    j.description = typeof job.description === "string" && job.description.trim() ? job.description : null;
    j.responsibilities = cleanList(job.responsibilities);
    j.qualifications = cleanList(job.qualifications);
    j.benefits = cleanList(job.benefits);
    j.applyUrl = safeUrl(job.applyUrl);
    j.evidenceUrl = safeUrl(job.evidenceUrl);
    j.status = STATUSES.indexOf(job.status) !== -1 ? job.status : "UNVERIFIED";
    if (j.status === "VERIFIED" && !j.evidenceUrl) j.status = "UNVERIFIED";
    return j;
  }
  function normalizeAll(list) { return (list || []).map(normalize); }

  function defaultState() {
    return { q: "", location: "", type: "all", mode: "all", category: "all", experience: "all", saved: false, sort: "relevance" };
  }

  /* ---------- search ---------- */
  /* Every word of the query must match somewhere in the listing. Returns a relevance
     score (higher is better), or -1 when the listing does not match. */
  function scoreQuery(job, tokens) {
    if (!tokens.length) return 0;
    var title = norm(job.title), company = norm(job.company), loc = norm(job.location);
    var skills = norm(job.skills.join(" ")), tags = norm(job.tags.join(" ") + " " + (job.category || ""));
    var desc = norm(job.description);
    var total = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i], s = 0;
      if (hasWordStart(title, t)) s += 5;
      if (hasWordStart(company, t)) s += 4;
      if (hasWordStart(skills, t)) s += 3;
      if (hasWordStart(tags, t)) s += 2;
      if (hasWordStart(loc, t) || (t === "remote" && job.mode === "Remote")) s += 2;
      if (hasWordStart(desc, t)) s += 1;
      if (s === 0) return -1;
      total += s;
    }
    return total;
  }

  function matchesLocation(job, term) {
    var t = norm(term);
    if (!t) return true;
    if (t === "remote" || t === "work from home" || t === "wfh") return job.mode === "Remote" || norm(job.location) === "remote";
    var loc = norm(job.location);
    var words = t.split(" ");
    for (var i = 0; i < words.length; i++) if (!hasWordStart(loc, words[i])) return false;
    return true;
  }

  /* ---------- facets ---------- */
  function matchesFacet(job, key, value) {
    if (value === "all") return true;
    switch (key) {
      case "type":
        if (value === "Internship" || value === "Job") return job.type === value;
        return job.employmentType === value;
      case "mode": return job.mode === value;
      case "category": return job.category === value;
      case "experience": return value === "Unknown" ? job.experience === null : job.experience === value;
    }
    return true;
  }

  function countFacet(jobs, key, value) {
    var n = 0;
    for (var i = 0; i < jobs.length; i++) if (matchesFacet(jobs[i], key, value)) n++;
    return n;
  }

  /* Category options = the fixed list plus any extra category present in the data. */
  function facetOptions(jobs, key) {
    var opts = FACETS[key].options.slice();
    if (key === "category") {
      jobs.forEach(function (j) {
        if (j.category && !opts.some(function (o) { return o.value === j.category; })) opts.push({ value: j.category, label: j.category });
      });
    }
    return opts;
  }

  /* ---------- sorting ---------- */
  function payKey(job) {
    var s = job.salary;
    return s ? (s.max !== null ? s.max : s.min) : null;
  }

  /* Which sorts the data can honestly support. Pay needs 2+ listings that share one currency and period. */
  function sortSupport(jobs) {
    var dates = 0, units = {}, priced = 0, unitCount = 0;
    jobs.forEach(function (j) {
      if (j.postedDate) dates++;
      if (j.salary) {
        priced++;
        var u = j.salary.currency + "/" + j.salary.period;
        if (!units[u]) { units[u] = true; unitCount++; }
      }
    });
    return { relevance: true, title: true, newest: dates >= 2, pay: priced >= 2 && unitCount === 1 };
  }

  function sortResults(rows, sortKey, support) {
    var out = rows.slice();
    var byOrder = function (a, b) { return a.index - b.index; };
    if (sortKey === "title") {
      out.sort(function (a, b) { return a.job.title.localeCompare(b.job.title, undefined, { sensitivity: "base" }) || byOrder(a, b); });
    } else if (sortKey === "newest" && support.newest) {
      out.sort(function (a, b) {
        var da = validDate(a.job.postedDate), db = validDate(b.job.postedDate);
        if (da === null && db === null) return byOrder(a, b);
        if (da === null) return 1;           /* unknown dates go last, never first */
        if (db === null) return -1;
        return db - da || byOrder(a, b);
      });
    } else if (sortKey === "pay" && support.pay) {
      out.sort(function (a, b) {
        var pa = payKey(a.job), pb = payKey(b.job);
        if (pa === null && pb === null) return byOrder(a, b);
        if (pa === null) return 1;           /* unknown pay goes last, never treated as zero */
        if (pb === null) return -1;
        return pb - pa || byOrder(a, b);
      });
    } else {                                 /* relevance: best query score first, otherwise original order */
      out.sort(function (a, b) { return b.score - a.score || byOrder(a, b); });
    }
    return out;
  }

  /* ---------- main entry ---------- */
  function run(jobs, state, savedIds) {
    var saved = Array.isArray(savedIds) ? savedIds : [];
    var tokens = norm(state.q) ? norm(state.q).split(" ") : [];
    var rows = [];
    jobs.forEach(function (job, index) {
      var score = scoreQuery(job, tokens);
      if (score < 0) return;
      if (!matchesLocation(job, state.location)) return;
      if (state.saved && saved.indexOf(job.id) === -1) return;
      for (var key in FACETS) if (!matchesFacet(job, key, state[key])) return;
      rows.push({ job: job, index: index, score: score });
    });
    return sortResults(rows, state.sort, sortSupport(jobs)).map(function (r) { return r.job; });
  }

  /* Active filters for display (sorting is not a filter). */
  function activeFilters(state) {
    var list = [];
    if (norm(state.q)) list.push({ key: "q", label: "Search: “" + state.q.trim() + "”" });
    if (norm(state.location)) list.push({ key: "location", label: "Location: " + state.location.trim() });
    ["type", "mode", "category", "experience"].forEach(function (key) {
      if (state[key] !== "all") {
        var opt = FACETS[key].options.filter(function (o) { return o.value === state[key]; })[0];
        list.push({ key: key, label: FACETS[key].label + ": " + (opt ? opt.label : state[key]) });
      }
    });
    if (state.saved) list.push({ key: "saved", label: "Saved only" });
    return list;
  }

  /* Distinct locations present in the data (for the location suggestions list). */
  function locations(jobs) {
    var seen = {}, out = [];
    jobs.forEach(function (j) { if (j.location && !seen[j.location]) { seen[j.location] = true; out.push(j.location); } });
    return out.sort();
  }

  /* ---------- formatting and card facts (Step 1.2 Part 2) ---------- */
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* "1 Oct 2026", or null when the value is not a real YYYY-MM-DD date. */
  function formatDate(value) {
    var t = validDate(value);
    if (t === null) return null;
    var d = new Date(t);
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  /* True when the date is before today (UTC). A deadline is still open on its own day. */
  function isPast(value, now) {
    var t = validDate(value);
    if (t === null) return false;
    return t + 86400000 <= (now instanceof Date ? now : new Date()).getTime();
  }

  function money(n, currency) {
    try {
      return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency: currency, maximumFractionDigits: 0 }).format(n);
    } catch (err) {
      return currency + " " + String(n);
    }
  }

  /* "₹4,00,000 – ₹6,00,000 / year". Returns null unless real numeric pay with a currency and period exists. */
  function formatSalary(salary) {
    var s = validSalary(salary);
    if (!s) return null;
    var text;
    if (s.min !== null && s.max !== null) text = s.min === s.max ? money(s.min, s.currency) : money(s.min, s.currency) + " – " + money(s.max, s.currency);
    else if (s.min !== null) text = "From " + money(s.min, s.currency);
    else text = "Up to " + money(s.max, s.currency);
    return text + " / " + s.period;
  }

  /* The facts a card (and the details dialog) may show. A fact is included only when the data really has it. */
  function cardFacts(job, now) {
    var facts = [];
    /* "Remote" as a location just repeats the work mode, so show it once (as the work mode). */
    if (job.location && norm(job.location) !== norm(job.mode)) facts.push({ kind: "location", icon: "pin", label: "Location", text: job.location });
    if (job.mode) facts.push({ kind: "mode", icon: "building", label: "Work mode", text: job.mode });
    if (job.employmentType) facts.push({ kind: "employment", icon: "briefcase", label: "Employment", text: job.employmentType });
    if (job.experience && job.experience !== job.type) facts.push({ kind: "experience", icon: "layers", label: "Experience level", text: job.experience });
    var pay = formatSalary(job.salary);
    if (pay) facts.push({ kind: "pay", icon: "finance", label: "Compensation", text: pay });
    var posted = formatDate(job.postedDate);
    if (posted) facts.push({ kind: "posted", icon: "calendar", label: "", text: "Posted " + posted });
    var due = formatDate(job.deadline);
    if (due) facts.push({ kind: "deadline", icon: "calendar", label: "", text: isPast(job.deadline, now) ? "Deadline passed (" + due + ")" : "Apply by " + due });
    return facts;
  }

  /* Stored bookmark ids come from the visitor's browser, so treat them as untrusted:
     keep only whole numbers that match a real listing, without duplicates. */
  function cleanSavedIds(raw, jobs) {
    if (!Array.isArray(raw)) return [];
    var valid = {}, out = [];
    (jobs || []).forEach(function (j) { valid[j.id] = true; });
    raw.forEach(function (id) {
      if (typeof id === "number" && isFinite(id) && Math.floor(id) === id && valid[id] && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }


  /* ---------- details and application destination (Step 1.3) ---------- */

  /* Stricter than safeUrl, used before sending anyone off-site: http(s) only, a real host, and no embedded
     credentials ("https://user:pass@host" is a common way to disguise a destination). Returns { url, host, secure } or null. */
  function parseApplyUrl(value) {
    var ok = safeUrl(value);
    if (!ok) return null;
    try {
      var u = new URL(ok);
      if (!u.hostname || u.username || u.password) return null;
      return { url: u.href, host: u.hostname.replace(/^www\./i, ""), secure: u.protocol === "https:" };
    } catch (err) { return null; }
  }

  /* What "Apply" may do for a listing. Decided only from real data and status:
       demo            DEMO listing: never leaves NEXORA, whatever applyUrl says
       none            no usable official application URL
       external        UNVERIFIED listing with a safe URL: caution + review step before leaving
       external-verified   VERIFIED listing with a safe URL: review step before leaving */
  function applyDestination(job) {
    if (!job || job.status === "DEMO") return { kind: "demo", url: null, host: null, secure: false };
    var p = parseApplyUrl(job.applyUrl);
    if (!p) return { kind: "none", url: null, host: null, secure: false };
    return { kind: job.status === "VERIFIED" ? "external-verified" : "external", url: p.url, host: p.host, secure: p.secure };
  }

  /* Details a visitor might expect that this listing does not provide, so the dialog can say so instead of guessing. */
  function missingFields(job) {
    var out = [];
    if (!job.description) out.push("Description");
    if (!job.salary) out.push("Compensation");
    if (!job.postedDate) out.push("Posting date");
    if (!job.deadline) out.push("Application deadline");
    if (!job.experience) out.push("Experience level");
    if (!job.skills.length) out.push("Required skills");
    return out;
  }

  /* Long descriptions: split on blank lines so they render as readable paragraphs (text only, never HTML). */
  function paragraphs(text) {
    if (typeof text !== "string") return [];
    return text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  var api = {
    FACETS: FACETS, SORTS: SORTS, normalize: normalize, normalizeAll: normalizeAll, defaultState: defaultState,
    run: run, activeFilters: activeFilters, facetOptions: facetOptions, countFacet: countFacet,
    sortSupport: sortSupport, locations: locations,
    formatSalary: formatSalary, formatDate: formatDate, isPast: isPast, safeUrl: safeUrl, cardFacts: cardFacts, cleanSavedIds: cleanSavedIds,
    parseApplyUrl: parseApplyUrl, applyDestination: applyDestination, missingFields: missingFields, paragraphs: paragraphs
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NexoraJobs = api;
})(typeof window !== "undefined" ? window : this);
