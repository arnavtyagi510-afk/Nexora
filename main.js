/* NEXORA homepage behaviour (Step 1). Plain JS, no dependencies.
   Search is a placeholder interaction only; real search comes in a later step. */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2200);
  }

  /* ---------- Dialog (honest "not built yet" messages) ---------- */
  var dialogEl = $("#dialog");
  function openDialog(title, body) {
    $("#dialog-title").textContent = title;
    $("#dialog-body").textContent = body;
    if (typeof dialogEl.showModal === "function") {
      dialogEl.showModal();
    } else {
      toast(title);
    }
  }
  $("#dialog-close").addEventListener("click", function () { dialogEl.close(); });
  dialogEl.addEventListener("click", function (e) { if (e.target === dialogEl) dialogEl.close(); });

  /* ---------- Mobile menu ---------- */
  var menuToggle = $("#menu-toggle");
  var mobileMenu = $("#mobile-menu");
  function setMenu(open) {
    mobileMenu.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuToggle.addEventListener("click", function () { setMenu(mobileMenu.hidden); });
  mobileMenu.addEventListener("click", function (e) {
    if (e.target.closest("a, button")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !mobileMenu.hidden) { setMenu(false); menuToggle.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (!mobileMenu.hidden && !e.target.closest(".site-header")) setMenu(false);
  });
  if (window.matchMedia) {
    window.matchMedia("(min-width: 60.0625rem)").addEventListener("change", function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Featured opportunities (demo data) ---------- */
  var opportunities = (window.NEXORA_DEMO && window.NEXORA_DEMO.opportunities) || [];
  var grid = $("#opps-grid");
  var typeFilter = "all";
  var SAVED_KEY = "nexora:demo-saved";
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch (err) { saved = []; }
  function persistSaved() { try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch (err) { /* storage unavailable */ } }

  function renderOpportunities() {
    var list = opportunities.filter(function (o) { return typeFilter === "all" || o.type === typeFilter; });
    grid.innerHTML = list.map(function (o) {
      var isSaved = saved.indexOf(o.id) !== -1;
      return '<li class="card opp">' +
        '<div class="opp__top">' +
          '<span class="opp__mark" aria-hidden="true">' + escapeHtml(o.company.charAt(0)) + '</span>' +
          '<div><div class="opp__company">' + escapeHtml(o.company) + '</div><span class="badge badge--outline">Demo listing</span></div>' +
          '<button class="opp__save" type="button" data-save="' + o.id + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "Remove bookmark: " : "Bookmark: ") + escapeHtml(o.title) + '">' + icon("bookmark") + '</button>' +
        '</div>' +
        '<h3 class="opp__title">' + escapeHtml(o.title) + '</h3>' +
        '<ul class="opp__meta"><li>' + icon("pin") + escapeHtml(o.location) + '</li><li>' + icon("building") + escapeHtml(o.mode) + '</li></ul>' +
        '<ul class="tags" aria-label="Skills">' + o.skills.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + '</ul>' +
        '<div class="opp__foot"><span class="badge ' + (o.type === "Internship" ? "badge--sage" : "") + '">' + escapeHtml(o.type) + '</span>' +
        '<button class="btn btn--secondary" type="button" data-view="' + o.id + '">View Role</button></div>' +
      '</li>';
    }).join("");
  }

  function setTypeFilter(value) {
    typeFilter = value;
    $$("#type-filter button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === value)); });
    renderOpportunities();
  }

  $("#type-filter").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-filter]");
    if (btn) setTypeFilter(btn.dataset.filter);
  });

  grid.addEventListener("click", function (e) {
    var saveBtn = e.target.closest("[data-save]");
    var viewBtn = e.target.closest("[data-view]");
    if (saveBtn) {
      var id = Number(saveBtn.dataset.save);
      var idx = saved.indexOf(id);
      if (idx === -1) { saved.push(id); toast("Bookmarked in this browser only"); }
      else { saved.splice(idx, 1); toast("Bookmark removed"); }
      persistSaved();
      renderOpportunities();
      var again = $('[data-save="' + id + '"]', grid);
      if (again) again.focus();
    } else if (viewBtn) {
      var o = opportunities.filter(function (x) { return x.id === Number(viewBtn.dataset.view); })[0];
      if (o) openDialog(o.title + " · " + o.company,
        "This is a demo listing from a fictional company. It is not a real vacancy and there is nothing to apply to. Role details and official application links will appear here once real opportunity data is connected.");
    }
  });

  /* Nav "Internships" link: apply the filter, then let the anchor scroll */
  $$("[data-filter-link]").forEach(function (a) {
    a.addEventListener("click", function () { setTypeFilter(a.dataset.filterLink); });
  });
  $$("a[href='#opportunities']:not([data-filter-link])").forEach(function (a) {
    a.addEventListener("click", function () { setTypeFilter("all"); });
  });

  /* ---------- Search (placeholder interaction) ---------- */
  var form = $("#search-form");
  var keywordInput = $("#search-keyword");
  var statusEl = $("#search-status");
  var chips = $$("#popular .chip");

  function syncChips() {
    var v = keywordInput.value.trim().toLowerCase();
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(v !== "" && c.textContent.trim().toLowerCase() === v)); });
  }
  keywordInput.addEventListener("input", syncChips);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var keyword = keywordInput.value.trim();
    var place = $("#search-location").value.trim();
    var typeSelect = $("#search-type");
    var typeLabel = typeSelect.options[typeSelect.selectedIndex].text.toLowerCase();
    if (!keyword && !place) {
      statusEl.textContent = "Enter a keyword or location to try the search. Full search is coming in a later step.";
      keywordInput.focus();
      return;
    }
    var parts = [];
    if (keyword) parts.push("“" + keyword + "”");
    if (place) parts.push("in “" + place + "”");
    statusEl.textContent = "Search isn’t connected yet. You searched for " + parts.join(" ") + " (" + typeLabel + "). Browse the demo opportunities below for now.";
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      keywordInput.value = chip.textContent.trim();
      syncChips();
      statusEl.textContent = "Added “" + keywordInput.value + "” to the search. Search isn’t connected yet, so results will arrive in a later step.";
    });
  });

  $$("[data-category]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      keywordInput.value = btn.dataset.category;
      syncChips();
      statusEl.textContent = "Added “" + keywordInput.value + "” to the search. Search isn’t connected yet, so results will arrive in a later step.";
      scrollToEl($("#top"));
      keywordInput.focus({ preventScroll: true });
    });
  });

  /* ---------- Placeholders for pages that are not built yet ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-soon]");
    if (!el) return;
    openDialog(el.dataset.soon + " is coming soon", "NEXORA is at the homepage stage. This part of the product hasn’t been built yet, and nothing here saves or submits any information.");
  });

  renderOpportunities();
})();
