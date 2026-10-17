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

  /* extra = { meta: "text", links: [{ href, text }] }; everything is inserted as text or as a DOM attribute, never as HTML. */
  function openDialog(title, body, extra) {
    extra = extra || {};
    if (!dialogEl || typeof dialogEl.showModal !== "function" || !dialogTitle || !dialogBody) { toast(title); return; }
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
  on($("#dialog-close"), "click", function () { if (dialogEl) dialogEl.close(); });
  on(dialogEl, "click", function (e) { if (e.target === dialogEl) dialogEl.close(); });

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
  function toggleSaved(id) {
    var latest = readStorage();                       /* pick up changes made in another tab before writing */
    if (latest !== null) saved = Jobs.cleanSavedIds(latest, allJobs);
    var idx = saved.indexOf(id);
    var adding = idx === -1;
    if (adding) saved.push(id); else saved.splice(idx, 1);
    var kept = writeStorage();
    if (adding) toast(kept ? "Bookmarked in this browser only" : "Bookmarked for this visit only. Your browser is blocking storage, so it will not be kept.");
    else toast(kept ? "Bookmark removed" : "Bookmark removed for this visit only (browser storage is unavailable).");
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
  });

  /* "View details": a simple dialog built from the same data as the card. It never claims anything was applied for or submitted. */
  function showDetails(o) {
    var facts = Jobs.cardFacts(o).filter(function (f) { return f.kind !== "pay" && f.kind !== "posted" && f.kind !== "deadline"; }).map(function (f) { return f.text; });
    facts.unshift(o.type);
    var rest = Jobs.cardFacts(o).filter(function (f) { return f.kind === "pay" || f.kind === "posted" || f.kind === "deadline"; }).map(function (f) { return f.text; });
    var note;
    if (o.status === "DEMO") {
      note = "This is a demo listing from a fictional company. It is not a real vacancy and there is nothing to apply to. Role details and official application links will appear here once real opportunity data is connected.";
    } else if (o.status === "VERIFIED") {
      note = "NEXORA has evidence for this listing (see the link below). NEXORA does not take applications yet, so use the employer’s own page to respond to it.";
    } else {
      note = "NEXORA has not verified this listing. Check the employer’s own website before sharing personal details. NEXORA does not take applications yet.";
    }
    var links = [];
    if (o.status === "VERIFIED" && o.evidenceUrl) links.push({ href: o.evidenceUrl, text: "See verification evidence" });
    if (o.status !== "DEMO" && o.applyUrl) links.push({ href: o.applyUrl, text: "Go to the employer’s listing" });
    openDialog(o.title + " · " + o.company, (o.description ? o.description + " " : "") + note, { meta: facts.concat(rest).join(" · "), links: links });
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
