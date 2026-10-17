/* NEXORA homepage behaviour. Plain JS, no dependencies.
   UI wiring and rendering only; data is in data.js and search/filter/sort/format logic is in jobs.js.
   Every optional element is looked up defensively, so a missing element never throws. */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var prefersReducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* Optional element: the real one if present, otherwise a detached stand-in so code that reads or writes it cannot throw. */
  function opt(sel, tag) { return $(sel) || document.createElement(tag || "div"); }
  function on(el, type, fn) { if (el) el.addEventListener(type, fn); }
  function setActive(el, isOn) { if (el && el.parentNode) el.parentNode.classList.toggle("is-active", isOn); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(name, extraClass) {
    return '<svg class="icon' + (extraClass ? " " + extraClass : "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }
  function scrollToEl(el) {
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  /* ---------- Toast ---------- */
  var toastEl = $("#toast");
  var toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 3200);
  }

  /* ---------- Dialog (details and honest "not built yet" messages) ---------- */
  var dialogEl = $("#dialog");
  var dialogTitle = $("#dialog-title");
  var dialogBody = $("#dialog-body");
  var dialogMeta = $("#dialog-meta");
  var dialogLinks = $("#dialog-links");

  var dialogX = $("#dialog-x");
  var dialogClose = $("#dialog-close");
  var jobView = $("#dialog-job");
  var jobMode = false;          /* true while the dialog is showing a job instead of a plain message */

  /* Switch between the plain-message layout (Soon / notices) and the job layout. */
  function setJobMode(on) {
    jobMode = on;
    [dialogTitle, dialogBody, dialogLinks, dialogClose].forEach(function (el) { if (el) el.hidden = on; });
    if (dialogMeta && on) dialogMeta.hidden = true;
    if (dialogX) dialogX.hidden = !on;
    if (jobView) { jobView.hidden = !on; if (!on) jobView.textContent = ""; }
    if (dialogEl) {
      dialogEl.classList.toggle("dialog--job", on);
      if (!on) {
        dialogEl.setAttribute("aria-labelledby", "dialog-title");
        dialogEl.setAttribute("aria-describedby", "dialog-body");
      }
    }
  }

  /* extra = { meta: "text", links: [{ href, text }] }; everything is inserted as text or as a DOM attribute, never as HTML. */
  function openDialog(title, body, extra) {
    extra = extra || {};
    if (!dialogEl || typeof dialogEl.showModal !== "function" || !dialogTitle || !dialogBody) { toast(title); return; }
    setJobMode(false);
    dialogTitle.textContent = title;
    dialogBody.textContent = body;
    if (dialogMeta) { dialogMeta.textContent = extra.meta || ""; dialogMeta.hidden = !extra.meta; }
    if (dialogLinks) {
      dialogLinks.textContent = "";
      (extra.links || []).forEach(function (l) {
        var a = document.createElement("a");
        a.className = "link";
        a.href = l.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = l.text + " (opens in a new tab)";
        dialogLinks.appendChild(a);
      });
    }
    if (!dialogEl.open) dialogEl.showModal();
  }
  function closeDialog() { if (dialogEl && dialogEl.open) dialogEl.close(); }
  on(dialogClose, "click", closeDialog);
  on(dialogX, "click", closeDialog);
  /* Only a click on the backdrop closes it, not a click on the dialog's own padding. */
  on(dialogEl, "click", function (e) {
    if (e.target !== dialogEl) return;
    var r = dialogEl.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog();
  });
  /* Fires for every way of closing (buttons, Escape, backdrop): release the page scroll lock and tidy up job state. */
  on(dialogEl, "close", function () {
    document.body.classList.remove("is-modal");
    onDialogClosed();
  });

  /* ---------- Mobile menu ---------- */
  var menuToggle = $("#menu-toggle");
  var mobileMenu = $("#mobile-menu");
  function setMenu(open) {
    if (!mobileMenu || !menuToggle) return;
    mobileMenu.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (menuToggle && mobileMenu) {
    on(menuToggle, "click", function () { setMenu(mobileMenu.hidden); });
    on(mobileMenu, "click", function (e) { if (e.target.closest("a, button")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !mobileMenu.hidden) { setMenu(false); menuToggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!mobileMenu.hidden && !e.target.closest(".site-header")) setMenu(false);
    });
    if (window.matchMedia) {
      window.matchMedia("(min-width: 60.0625rem)").addEventListener("change", function (e) { if (e.matches) setMenu(false); });
    }
  }

  /* ---------- Placeholders for pages that are not built yet ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-soon]");
    if (!el) return;
    openDialog(el.dataset.soon + " is coming soon", "NEXORA is at the homepage stage. This part of the product hasn’t been built yet, and nothing here saves or submits any information.");
  });

  /* ---------- Opportunities: search, filters, sorting, bookmarks, rendering ---------- */
  var Jobs = window.NexoraJobs;
  var grid = $("#opps-grid");
  if (!grid) return;
  if (!Jobs) {
    grid.innerHTML = '<li class="empty"><h3>Opportunities could not load</h3><p>Please reload the page.</p></li>';
    return;
  }

  var allJobs = Jobs.normalizeAll((window.NEXORA_DEMO && window.NEXORA_DEMO.opportunities) || []);
  var state = Jobs.defaultState();
  var support = Jobs.sortSupport(allJobs);

  var form = $("#search-form");
  var keywordInput = opt("#search-keyword", "input");
  var locationInput = opt("#search-location", "input");
  var heroType = opt("#search-type", "select");
  var clearKeywordBtn = opt("#search-clear", "button");
  var statusEl = opt("#search-status");
  var countEl = opt("#results-count");
  var activeEl = opt("#active-filters", "ul");
  var clearAllBtn = opt("#clear-filters", "button");
  var noteEl = opt("#filters-note");
  var savedToggle = $("#saved-toggle");
  var savedLabel = $("#saved-label") || savedToggle;
  var sortSelect = $("#sort-by");
  var chips = $$("#popular .chip");
  var selects = {};
  [["type", "#filter-type"], ["mode", "#filter-mode"], ["category", "#filter-category"], ["experience", "#filter-experience"]].forEach(function (pair) {
    var el = $(pair[1]);
    if (el) selects[pair[0]] = el;
  });

  /* ----- Bookmarks -----
     Saved opportunity ids live in this browser's localStorage only. They are not tied to an account and
     are not synced between devices or browsers. If storage is blocked or full, bookmarks still work for
     the current visit (kept in memory) and the visitor is told they will not be kept. */
  var SAVED_KEY = "nexora:demo-saved";
  var saved = [];

  /* Returns an array of ids, [] when nothing is stored, or null when storage cannot be read. */
  function readStorage() {
    try {
      var raw = window.localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return null;
    }
  }
  function writeStorage() {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
      return true;
    } catch (err) {
      return false;
    }
  }
  function loadSaved() {
    var raw = readStorage();
    if (raw !== null) saved = Jobs.cleanSavedIds(raw, allJobs);   /* on a read failure keep what we have in memory */
  }
  loadSaved();

  function plural(n) { return n + (n === 1 ? " opportunity" : " opportunities") + " found"; }
  function statusLabel(o) { return o.status === "VERIFIED" ? "Verified" : o.status === "UNVERIFIED" ? "Unverified listing" : "Demo listing"; }
  function statusBadge(o) {
    var cls = o.status === "VERIFIED" ? "badge--verified" : o.status === "UNVERIFIED" ? "badge--unverified" : "badge--demo";
    return '<span class="badge ' + cls + '">' + (o.status === "VERIFIED" ? icon("check") : "") + escapeHtml(statusLabel(o)) + "</span>";
  }
  function firstChar(text) { return Array.from(String(text || "?"))[0]; }

  function fillSelect(sel, options, isDisabled) {
    sel.textContent = "";
    options.forEach(function (o) {
      var option = document.createElement("option");
      option.value = o.value;
      var off = isDisabled(o);
      option.disabled = off;
      option.textContent = o.label + (off ? o.reason : "");
      sel.appendChild(option);
    });
  }

  function buildControls() {
    Object.keys(selects).forEach(function (key) {
      fillSelect(selects[key], Jobs.facetOptions(allJobs, key).map(function (o) {
        var none = o.value !== "all" && Jobs.countFacet(allJobs, key, o.value) === 0;
        return { value: o.value, label: o.label, reason: none ? " (none listed yet)" : "", none: none };
      }), function (o) { return o.none; });
    });
    if (sortSelect) {
      fillSelect(sortSelect, Jobs.SORTS.map(function (s) {
        var off = !support[s.value];
        return { value: s.value, label: s.label, reason: off ? (s.value === "newest" ? " (no posting dates yet)" : " (no pay data yet)") : "", none: off };
      }), function (o) { return o.none; });
    }
    var list = $("#location-options");
    if (list) {
      Jobs.locations(allJobs).forEach(function (l) {
        var option = document.createElement("option");
        option.value = l;
        list.appendChild(option);
      });
    }
    var missing = [];
    if (!support.newest) missing.push("newest-first sorting");
    if (!support.pay) missing.push("compensation sorting and a salary filter");
    noteEl.textContent = missing.length
      ? "Unavailable for now: " + missing.join(" and ") + ". These demo listings include no posting dates or comparable pay."
      : "";
  }

  function factsHtml(o) {
    return Jobs.cardFacts(o).map(function (f) {
      return "<li>" + icon(f.icon) + (f.label ? '<span class="sr-only">' + escapeHtml(f.label) + ": </span>" : "") + escapeHtml(f.text) + "</li>";
    }).join("");
  }

  function renderCards(list) {
    if (!list.length) {
      var filtered = Jobs.activeFilters(state).length > 0;
      var noSaved = state.saved && saved.length === 0;
      var heading = noSaved ? "You haven’t saved any opportunities yet" : filtered ? "No opportunities match your search" : "No opportunities available yet";
      var text = noSaved ? "Use the bookmark button on any opportunity to save it. Saved opportunities are kept in this browser only."
        : filtered ? "Try different keywords, or remove some filters. We only show listings that match everything you have selected."
        : "There are no listings to show right now.";
      var actions = noSaved ? '<div class="empty__actions"><button class="btn btn--primary" type="button" data-empty="clear">Show all opportunities</button></div>'
        : filtered ? '<div class="empty__actions"><button class="btn btn--secondary" type="button" data-empty="edit">Edit search</button>' +
          '<button class="btn btn--primary" type="button" data-empty="clear">Clear all filters</button></div>' : "";
      grid.innerHTML = '<li class="empty"><h3>' + heading + "</h3><p>" + text + "</p>" + actions + "</li>";
      return;
    }
    grid.innerHTML = list.map(function (o) {
      var isSaved = saved.indexOf(o.id) !== -1;
      return '<li class="card opp">' +
        '<div class="opp__top">' +
          '<span class="opp__mark" aria-hidden="true">' + escapeHtml(firstChar(o.company)) + "</span>" +
          '<div><div class="opp__company">' + escapeHtml(o.company) + "</div>" + statusBadge(o) + "</div>" +
          '<button class="opp__save" type="button" data-save="' + o.id + '" aria-pressed="' + isSaved + '" aria-label="Bookmark: ' + escapeHtml(o.title) + '">' + icon("bookmark") + "</button>" +
        "</div>" +
        '<h3 class="opp__title">' + escapeHtml(o.title) + "</h3>" +
        '<ul class="opp__meta">' + factsHtml(o) + "</ul>" +
        (o.skills.length ? '<ul class="tags" aria-label="Skills">' + o.skills.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>" : "") +
        '<div class="opp__foot"><span class="badge ' + (o.type === "Internship" ? "badge--sage" : "") + '">' + escapeHtml(o.type) + "</span>" +
        '<button class="btn btn--secondary" type="button" data-view="' + o.id + '" aria-label="View details: ' + escapeHtml(o.title) + '">View details</button></div>' +
      "</li>";
    }).join("");
  }

  function renderSavedToggle() {
    if (!savedToggle) return;
    savedLabel.textContent = "Saved (" + saved.length + ")";
    savedToggle.setAttribute("aria-pressed", String(state.saved));
  }

  function renderChrome(count) {
    countEl.textContent = plural(count);
    var active = Jobs.activeFilters(state);
    activeEl.innerHTML = active.map(function (f) {
      return '<li><button class="chip chip--active" type="button" data-remove="' + f.key + '" aria-label="Remove filter: ' + escapeHtml(f.label) + '">' +
        escapeHtml(f.label) + icon("close", "icon--sm") + "</button></li>";
    }).join("");
    activeEl.hidden = active.length === 0;
    clearAllBtn.hidden = active.length === 0;
    clearKeywordBtn.hidden = keywordInput.value === "";
    Object.keys(selects).forEach(function (key) {
      selects[key].value = state[key];
      setActive(selects[key], state[key] !== "all");
    });
    if (sortSelect) { sortSelect.value = state.sort; setActive(sortSelect, state.sort !== "relevance"); }
    heroType.value = state.type;
    if (heroType.value !== state.type) heroType.value = "all";
    $$("#type-filter button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === state.type)); });
    renderSavedToggle();
    syncChips();
  }

  function render() {
    var list = Jobs.run(allJobs, state, saved);
    renderCards(list);
    renderChrome(list.length);
    return list.length;
  }

  /* Commit what is typed in the search boxes, then re-render. */
  function apply() {
    state.q = keywordInput.value.replace(/\s+/g, " ").trim();
    state.location = locationInput.value.replace(/\s+/g, " ").trim();
    return render();
  }

  function resetAll() {
    var sort = state.sort;
    state = Jobs.defaultState();
    state.sort = sort;
    keywordInput.value = "";
    locationInput.value = "";
    statusEl.textContent = "";
    render();
  }

  function syncChips() {
    var v = state.q.toLowerCase();
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(v !== "" && c.textContent.trim().toLowerCase() === v)); });
  }

  function announceSearch(n) {
    var parts = [];
    if (state.q) parts.push("“" + state.q + "”");
    if (state.location) parts.push("in “" + state.location + "”");
    statusEl.textContent = (parts.length ? plural(n) + " for " + parts.join(" ") : "Showing all " + n + " opportunities") + ". See results below.";
  }

  function searchAndShow() {
    var n = apply();
    announceSearch(n);
    scrollToEl($("#opportunities"));
  }

  /* Search form: button click and Enter both land here. */
  on(form, "submit", function (e) { e.preventDefault(); searchAndShow(); });
  on(keywordInput, "input", function () { clearKeywordBtn.hidden = keywordInput.value === ""; });
  on(clearKeywordBtn, "click", function () {
    keywordInput.value = "";
    apply();
    statusEl.textContent = "";
    keywordInput.focus();
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var topic = chip.textContent.trim();
      keywordInput.value = chip.getAttribute("aria-pressed") === "true" ? "" : topic;
      searchAndShow();
    });
  });
  $$("[data-category]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      keywordInput.value = btn.dataset.category;
      searchAndShow();
    });
  });

  /* Selects and the segmented control update results immediately. */
  function setFacet(key, value) { state[key] = value; statusEl.textContent = ""; apply(); }
  Object.keys(selects).forEach(function (key) {
    on(selects[key], "change", function () { setFacet(key, selects[key].value); });
  });
  on($("#search-type"), "change", function () { setFacet("type", heroType.value); });
  on(sortSelect, "change", function () { state.sort = sortSelect.value; render(); });
  on($("#type-filter"), "click", function (e) {
    var btn = e.target.closest("button[data-filter]");
    if (btn) setFacet("type", btn.dataset.filter);
  });

  /* Saved-only view. */
  on(savedToggle, "click", function () { state.saved = !state.saved; statusEl.textContent = ""; apply(); });

  /* Remove one active filter / clear everything. */
  on(activeEl, "click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (!btn) return;
    var key = btn.dataset.remove;
    if (key === "q") keywordInput.value = "";
    else if (key === "location") locationInput.value = "";
    else if (key === "saved") state.saved = false;
    else state[key] = "all";
    statusEl.textContent = "";
    apply();
    if (!clearAllBtn.hidden) clearAllBtn.focus(); else scrollToEl($("#opportunities"));
  });
  on(clearAllBtn, "click", function () { resetAll(); });

  /* Bookmark toggle. In the normal view only the button changes (so focus stays put);
     in the Saved-only view the list itself changes, so it is re-rendered. */
  function toggleSaved(id, quiet) {
    var latest = readStorage();                       /* pick up changes made in another tab before writing */
    if (latest !== null) saved = Jobs.cleanSavedIds(latest, allJobs);
    var idx = saved.indexOf(id);
    var adding = idx === -1;
    if (adding) saved.push(id); else saved.splice(idx, 1);
    var kept = writeStorage();
    var msg = adding
      ? (kept ? "Bookmarked in this browser only" : "Bookmarked for this visit only. Your browser is blocking storage, so it will not be kept.")
      : (kept ? "Bookmark removed" : "Bookmark removed for this visit only (browser storage is unavailable).");
    if (!quiet) toast(msg);     /* a toast sits behind an open dialog, so the dialog shows this message itself */
    return msg;
  }
  function refreshSaveButtons() {
    $$("[data-save]", grid).forEach(function (b) { b.setAttribute("aria-pressed", String(saved.indexOf(Number(b.dataset.save)) !== -1)); });
    renderSavedToggle();
  }

  on(grid, "click", function (e) {
    var saveBtn = e.target.closest("[data-save]");
    var viewBtn = e.target.closest("[data-view]");
    var emptyBtn = e.target.closest("[data-empty]");
    if (emptyBtn) {
      if (emptyBtn.dataset.empty === "clear") { resetAll(); }
      else { scrollToEl($("#top")); keywordInput.focus({ preventScroll: true }); }
    } else if (saveBtn) {
      var id = Number(saveBtn.dataset.save);
      toggleSaved(id);
      if (state.saved) {
        render();
        var again = $('[data-save="' + id + '"]', grid);
        if (again) again.focus(); else if (savedToggle) savedToggle.focus();
      } else {
        refreshSaveButtons();
      }
    } else if (viewBtn) {
      var o = allJobs.filter(function (x) { return x.id === Number(viewBtn.dataset.view); })[0];
      if (o) showDetails(o);
    }
  });

  /* Same-browser changes made in another tab keep this tab's bookmarks in step. */
  window.addEventListener("storage", function (e) {
    if (e.key !== null && e.key !== SAVED_KEY) return;
    loadSaved();
    render();
    syncDetailSave();
  });

  /* ---------- Job details and apply flow (Step 1.3) ----------
     One dialog (#dialog) shows the details of the selected job, built from the central data by the job's id.
     "Apply Now" never submits anything. Depending on the listing it explains (DEMO), explains why it cannot
     continue (no official link), or shows a review step and then opens the official site in a new tab.
     All job content is inserted with textContent / DOM attributes, never as HTML. Click handling uses one
     delegated listener on #dialog-job, so re-opening the dialog never stacks up listeners. */
  var Apps = window.NexoraApplications;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var detail = null;            /* { job, dest } while the details dialog is open */
  var lastRedirectAt = 0;       /* guards against a double click opening two tabs */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function iconEl(name, extraClass) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon" + (extraClass ? " " + extraClass : ""));
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }
  function statusBadgeEl(o) {
    var span = el("span", "badge " + (o.status === "VERIFIED" ? "badge--verified" : o.status === "UNVERIFIED" ? "badge--unverified" : "badge--demo"));
    if (o.status === "VERIFIED") span.appendChild(iconEl("check"));
    span.appendChild(document.createTextNode(statusLabel(o)));
    return span;
  }
  function section(heading) {
    var s = el("section", "jv__section");
    s.appendChild(el("h3", null, heading));
    return s;
  }
  function listSection(heading, items) {
    var s = section(heading);
    var ul = el("ul", "jv__list");
    items.forEach(function (t) { ul.appendChild(el("li", null, t)); });
    s.appendChild(ul);
    return s;
  }
  function setStatus(text) { var n = $("#jv-status", jobView); if (n) n.textContent = text || ""; }

  function statusNote(o) {
    if (o.status === "DEMO") return "This is a demo listing from a fictional company, shown to illustrate how NEXORA will look. It is not a real vacancy and it cannot accept an application.";
    if (o.status === "VERIFIED") return "NEXORA holds evidence for this listing (see the verification link below). NEXORA does not accept applications itself yet. Applications are made on the employer’s own website.";
    return "NEXORA has not verified this listing or the employer. Check the employer’s own website before you share personal details. NEXORA does not accept applications itself yet.";
  }

  function buildDetailsView(o, dest) {
    var view = el("div", "jv__view");
    view.id = "jv-details";

    var head = el("div", "jv__head");
    var mark = el("span", "jv__mark", firstChar(o.company));
    mark.setAttribute("aria-hidden", "true");
    var who = el("div");
    who.appendChild(el("div", "opp__company", o.company));
    who.appendChild(statusBadgeEl(o));
    head.appendChild(mark);
    head.appendChild(who);
    view.appendChild(head);

    var title = el("h2", "jv__title", o.title);
    title.id = "jv-title";
    title.tabIndex = -1;
    view.appendChild(title);

    var facts = el("ul", "jv__facts");
    var typeLi = el("li");
    typeLi.appendChild(iconEl("briefcase"));
    typeLi.appendChild(el("span", "sr-only", "Opportunity type: "));
    typeLi.appendChild(document.createTextNode(o.type));
    facts.appendChild(typeLi);
    Jobs.cardFacts(o).forEach(function (f) {
      var li = el("li");
      li.appendChild(iconEl(f.icon));
      if (f.label) li.appendChild(el("span", "sr-only", f.label + ": "));
      li.appendChild(document.createTextNode(f.text));
      facts.appendChild(li);
    });
    view.appendChild(facts);

    var note = el("p", "jv__note jv__note--" + (o.status === "DEMO" ? "demo" : o.status === "UNVERIFIED" ? "caution" : "verified"), statusNote(o));
    note.id = "jv-summary";
    view.appendChild(note);
    if (o.status === "VERIFIED" && o.evidenceUrl) {
      var ev = el("a", "link", "See verification evidence (opens in a new tab)");
      ev.href = o.evidenceUrl; ev.target = "_blank"; ev.rel = "noopener noreferrer";
      view.appendChild(ev);
    }

    if (o.skills.length) {
      var sk = section("Skills");
      var tags = el("ul", "tags");
      tags.setAttribute("aria-label", "Skills");
      o.skills.forEach(function (t) { tags.appendChild(el("li", null, t)); });
      sk.appendChild(tags);
      view.appendChild(sk);
    }

    var about = section("About this opportunity");
    var paras = Jobs.paragraphs(o.description);
    if (paras.length) paras.forEach(function (p) { about.appendChild(el("p", null, p)); });
    else about.appendChild(el("p", null, "No description has been provided for this listing."));
    view.appendChild(about);

    if (o.responsibilities.length) view.appendChild(listSection("Responsibilities", o.responsibilities));
    if (o.qualifications.length) view.appendChild(listSection("Qualifications", o.qualifications));
    if (o.benefits.length) view.appendChild(listSection("Benefits", o.benefits));

    var missing = Jobs.missingFields(o).filter(function (m) { return m !== "Description"; });
    if (missing.length) view.appendChild(el("p", "jv__missing", "Not provided for this listing: " + missing.join(", ") + "."));

    /* Apply area: the button is always labelled "Apply Now"; what it does depends on the listing's real data. */
    var apply = el("div", "jv__apply");
    var msg;
    if (dest.kind === "demo") msg = "This is a demonstration listing, so Apply Now does not start a real application.";
    else if (dest.kind === "none") msg = "An official application destination is not currently available for this listing.";
    else msg = "Applications for this role are made on the employer’s own website (" + dest.host + "). You will be asked to review before you leave NEXORA.";
    var msgEl = el("p", null, msg);
    msgEl.id = "jv-apply-msg";
    apply.appendChild(msgEl);

    var actions = el("div", "jv__actions");
    var applyBtn = el("button", "btn btn--primary btn--lg");
    applyBtn.type = "button"; applyBtn.id = "jv-apply"; applyBtn.dataset.action = "apply";
    applyBtn.appendChild(document.createTextNode("Apply Now"));
    if (dest.kind === "external" || dest.kind === "external-verified") applyBtn.appendChild(iconEl("external"));
    applyBtn.setAttribute("aria-describedby", "jv-apply-msg");
    if (dest.kind === "none") applyBtn.setAttribute("aria-disabled", "true");   /* stays focusable so the reason can be read */
    actions.appendChild(applyBtn);

    var saveBtn = el("button", "btn btn--secondary btn--lg jv__save");
    saveBtn.type = "button"; saveBtn.id = "jv-save"; saveBtn.dataset.action = "save";
    saveBtn.appendChild(iconEl("bookmark"));
    saveBtn.appendChild(document.createTextNode("Save job"));
    saveBtn.appendChild(el("span", "sr-only", ": " + o.title));
    actions.appendChild(saveBtn);

    var closeBtn = el("button", "btn btn--text btn--lg", "Close");
    closeBtn.type = "button"; closeBtn.dataset.action = "close";
    actions.appendChild(closeBtn);
    apply.appendChild(actions);
    view.appendChild(apply);
    return view;
  }

  function summaryRow(dl, label, value) {
    dl.appendChild(el("dt", null, label));
    var dd = el("dd");
    if (typeof value === "string") dd.textContent = value; else dd.appendChild(value);
    dl.appendChild(dd);
  }

  /* Review step: shown only when a safe official URL exists. It is a confirmation, not a form: it asks for nothing. */
  function buildReviewView(d) {
    var o = d.job, dest = d.dest;
    var view = el("div", "jv__view");
    view.id = "jv-review";
    var h = el("h3", "jv__title", "Review before you leave NEXORA");
    h.tabIndex = -1; h.id = "jv-review-title";
    view.appendChild(h);

    var dl = el("dl", "jv__summary");
    summaryRow(dl, "Job", o.title);
    summaryRow(dl, "Company", o.company);
    summaryRow(dl, "Website", dest.host);
    summaryRow(dl, "Listing status", statusBadgeEl(o));
    view.appendChild(dl);

    view.appendChild(el("p", null, "You are about to leave NEXORA. Continuing opens " + dest.host + " in a new tab. That website belongs to someone else and NEXORA does not control it. Opening it does not submit an application, and NEXORA will not be able to see what you do there."));
    if (o.status !== "VERIFIED") {
      view.appendChild(el("p", "jv__note jv__note--caution", "Caution: NEXORA has not verified this listing. Check that the website address looks right, and be careful with personal details. Be wary of any request for payment to apply."));
    }
    if (!dest.secure) view.appendChild(el("p", "jv__note jv__note--caution", "This address uses http rather than https, so your connection to that website is not encrypted."));
    if (o.deadline && Jobs.isPast(o.deadline)) view.appendChild(el("p", "jv__note", "The listed deadline for this opportunity has passed."));

    var actions = el("div", "jv__actions");
    var go = el("a", "btn btn--primary btn--lg");
    go.id = "jv-continue";
    go.href = dest.url; go.target = "_blank"; go.rel = "noopener noreferrer";
    var label = el("span", null, "Continue to application");
    label.id = "jv-continue-label";
    go.appendChild(label);
    go.appendChild(iconEl("external"));
    actions.appendChild(go);
    var cancel = el("button", "btn btn--secondary btn--lg", "Cancel");
    cancel.type = "button"; cancel.dataset.action = "back"; cancel.id = "jv-cancel";
    actions.appendChild(cancel);
    view.appendChild(actions);
    return view;
  }

  function buildDemoView(d) {
    var view = el("div", "jv__view");
    view.id = "jv-demo";
    var h = el("h3", "jv__title", "This is a demo listing");
    h.tabIndex = -1; h.id = "jv-demo-title";
    view.appendChild(h);
    view.appendChild(el("p", null, d.job.company + " is a fictional company and this opportunity is sample data used to show how NEXORA works. It cannot accept a real application, so nothing was sent or saved, and you are staying on NEXORA."));
    view.appendChild(el("p", null, "You can still bookmark it to try out Saved jobs, or browse the other opportunities."));
    var actions = el("div", "jv__actions");
    var back = el("button", "btn btn--primary btn--lg", "Back to details");
    back.type = "button"; back.dataset.action = "back"; back.id = "jv-back";
    actions.appendChild(back);
    var close = el("button", "btn btn--secondary btn--lg", "Close");
    close.type = "button"; close.dataset.action = "close";
    actions.appendChild(close);
    view.appendChild(actions);
    return view;
  }

  /* Show "details", "review" or "demo". Only one is visible; review/demo are rebuilt each time so no stale state stays. */
  function showView(name) {
    if (!detail) return;
    ["#jv-review", "#jv-demo"].forEach(function (sel) { var old = $(sel, jobView); if (old) old.remove(); });
    var main = $("#jv-details", jobView);
    setStatus("");
    if (name === "details") {
      main.hidden = false;
      var again = $("#jv-apply", jobView);
      if (again) again.focus();
      dialogEl.setAttribute("aria-labelledby", "jv-title");
      dialogEl.setAttribute("aria-describedby", "jv-summary");
      return;
    }
    main.hidden = true;
    var v = name === "review" ? buildReviewView(detail) : buildDemoView(detail);
    jobView.insertBefore(v, $("#jv-status", jobView));
    var hid = name === "review" ? "jv-review-title" : "jv-demo-title";
    dialogEl.setAttribute("aria-labelledby", hid);
    dialogEl.removeAttribute("aria-describedby");
    $("#" + hid, jobView).focus();
    dialogEl.scrollTop = 0;
  }

  /* Keep the Save button in the dialog in step with the same saved[] list the cards use. */
  function syncDetailSave() {
    if (!detail) return;
    var btn = $("#jv-save", jobView);
    if (btn) btn.setAttribute("aria-pressed", String(saved.indexOf(detail.job.id) !== -1));
  }

  function recordExternalRedirect(job, dest) {
    if (!Apps) return;
    var res = Apps.createRecord({ jobId: job.id, method: Apps.METHODS.EXTERNAL_REDIRECT, destinationHost: dest.host, isDemo: false });
    if (res.ok) Apps.getStore().save(res.record);   /* in memory only: no backend, nothing is persisted */
  }

  function onContinueClick(e) {
    var link = e.target.closest("#jv-continue");
    var d = detail;
    var dest = d ? Jobs.applyDestination(d.job) : null;
    var allowed = dest && (dest.kind === "external" || dest.kind === "external-verified") && link.href === dest.url;
    var now = Date.now();
    if (!allowed || now - lastRedirectAt < 1500) { e.preventDefault(); return; }   /* never navigate to anything unchecked, never twice at once */
    lastRedirectAt = now;
    recordExternalRedirect(d.job, dest);
    var label = $("#jv-continue-label", jobView);
    if (label) label.textContent = "Open application website again";
    setStatus("Opened " + dest.host + " in a new tab. NEXORA cannot see what happens on that website, so this is not counted as an application. Finish and confirm your application there.");
  }

  on(jobView, "click", function (e) {
    if (!detail) return;
    if (e.target.closest("#jv-continue")) { onContinueClick(e); return; }
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.dataset.action) {
      case "apply":
        if (btn.getAttribute("aria-disabled") === "true") { setStatus("An official application destination is not currently available for this listing, so there is nowhere to apply from here."); break; }
        showView(detail.dest.kind === "demo" ? "demo" : "review");
        break;
      case "save":
        var msg = toggleSaved(detail.job.id, true);
        if (state.saved) render(); else refreshSaveButtons();
        syncDetailSave();
        setStatus(msg);
        break;
      case "back": showView("details"); break;
      case "close": closeDialog(); break;
    }
  });

  function showDetails(o) {
    if (!jobView || !dialogEl || typeof dialogEl.showModal !== "function") {
      openDialog(o.title + " · " + o.company, statusNote(o));      /* very old browser or stripped markup: plain text fallback */
      return;
    }
    detail = { job: o, dest: Jobs.applyDestination(o) };
    setJobMode(true);
    jobView.textContent = "";
    jobView.appendChild(buildDetailsView(o, detail.dest));
    var status = el("p", "jv__status");
    status.id = "jv-status";
    status.setAttribute("role", "status");
    jobView.appendChild(status);
    dialogEl.setAttribute("aria-labelledby", "jv-title");
    dialogEl.setAttribute("aria-describedby", "jv-summary");
    syncDetailSave();
    dialogEl.scrollTop = 0;
    if (!dialogEl.open) { document.body.classList.add("is-modal"); dialogEl.showModal(); }
  }

  /* Called from the dialog's close event. The browser normally returns focus to the button that opened the
     dialog; if that button no longer exists (for example it was un-bookmarked in the Saved-only view), focus a sensible place. */
  function onDialogClosed() {
    var d = detail;
    detail = null;
    if (!jobMode) return;
    setJobMode(false);
    var a = document.activeElement;
    if (d && (!a || a === document.body)) {
      var target = $('[data-view="' + d.job.id + '"]', grid) || savedToggle || keywordInput;
      if (target && target.focus) target.focus();
    }
  }

  /* Nav links: "Opportunities" shows everything; "Internships" shows internships. Anchors still scroll. */
  $$("[data-filter-link]").forEach(function (a) {
    a.addEventListener("click", function () { resetAll(); setFacet("type", a.dataset.filterLink); });
  });
  $$("a[href='#opportunities']:not([data-filter-link])").forEach(function (a) {
    a.addEventListener("click", function () { resetAll(); });
  });

  buildControls();
  render();
})();
