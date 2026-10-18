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

  /* ---------- Authentication and student onboarding (demo-only) ---------- */
  var AUTH_PROFILE_KEY = "nexora:demo-profile";
  var AUTH_SESSION_KEY = "nexora:demo-session";
  var authShell = document.getElementById("auth-shell");
  var authTabs = $$("[data-auth-tab]");
  var authSigninForm = document.getElementById("auth-signin-panel");
  var authSignupForm = document.getElementById("auth-signup-panel");
  var authOnboardingPanel = document.getElementById("auth-onboarding-panel");
  var authStatus = document.getElementById("demo-auth-status");
  var signupStatus = document.getElementById("signup-status");
  var onboardingStatus = document.getElementById("onboarding-status");
  var onboardingStepLabel = document.getElementById("onboarding-step-label");
  var onboardingStepEls = $$(".onboarding-step");
  var onboardingNext = document.getElementById("onboarding-next");
  var onboardingBack = document.getElementById("onboarding-back");
  var onboardingExit = document.getElementById("onboarding-exit");
  var onboardingSummary = document.getElementById("onboarding-summary");
  var onboardingReset = document.getElementById("auth-reset-profile");

  function readStorageJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeStorageJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }
  function removeStorageJson(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      return false;
    }
  }
  function setFieldError(id, message) {
    var input = document.getElementById(id);
    var errorEl = document.getElementById(id + "-error");
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (errorEl) errorEl.textContent = message || "";
  }
  function clearFieldError(id) { setFieldError(id, ""); }
  function markFormErrors(form, map) {
    Object.keys(map).forEach(function (id) { setFieldError(id, map[id]); });
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { if (!el.getAttribute("aria-invalid")) el.setAttribute("aria-invalid", "false"); });
  }
  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }
  function isHttpUrl(value) {
    if (!value || typeof value !== "string") return false;
    try {
      var u = new URL(value);
      return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname;
    } catch (err) {
      return false;
    }
  }
  function readDemoProfile() {
    return readStorageJson(AUTH_PROFILE_KEY, {});
  }
  function writeDemoProfile(profile) {
    return writeStorageJson(AUTH_PROFILE_KEY, profile || {});
  }
  function clearDemoProfile() {
    removeStorageJson(AUTH_PROFILE_KEY);
    removeStorageJson(AUTH_SESSION_KEY);
    var current = readDemoProfile();
    if (current && Object.keys(current).length) writeDemoProfile(current);
  }
  function setAuthStatus(el, msg) {
    if (el) el.textContent = msg || "";
  }
  function openAuth(target) {
    if (!authShell) return;
    authShell.hidden = false;
    authTabs.forEach(function (btn) {
      var active = btn.dataset.authTab === target;
      btn.setAttribute("aria-selected", String(active));
      btn.classList.toggle("is-active", active);
    });
    authSigninForm && authSigninForm.classList.toggle("is-visible", target === "signin");
    authSignupForm && authSignupForm.classList.toggle("is-visible", target === "signup");
    authOnboardingPanel && (authOnboardingPanel.hidden = target !== "onboarding");
    if (target === "signin") {
      var emailField = document.getElementById("signin-email");
      if (emailField) emailField.focus();
    }
    if (target === "signup") {
      var signupName = document.getElementById("signup-name");
      if (signupName) signupName.focus();
    }
    if (target === "onboarding") {
      if (onboardingNext) onboardingNext.textContent = "Continue";
      renderOnboardingStep();
    }
  }
  function closeAuth() {
    if (authShell) authShell.hidden = true;
    if (authOnboardingPanel) authOnboardingPanel.hidden = true;
    setAuthStatus(authStatus, "");
    setAuthStatus(signupStatus, "");
    setAuthStatus(onboardingStatus, "");
    authTabs.forEach(function (btn) { btn.setAttribute("aria-selected", String(btn.dataset.authTab === "signin")); btn.classList.toggle("is-active", btn.dataset.authTab === "signin"); });
    if (authSigninForm) authSigninForm.classList.add("is-visible");
    if (authSignupForm) authSignupForm.classList.remove("is-visible");
  }

  function setPasswordVisibility(button) {
    var fieldId = button && button.dataset && button.dataset.passwordToggle;
    var field = fieldId ? document.getElementById(fieldId) : null;
    if (!field) return;
    var show = field.type === "password";
    field.type = show ? "text" : "password";
    button.textContent = show ? "Hide" : "Show";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }

  function readSkillList() {
    var list = [];
    $$("#onboarding-skill-list li").forEach(function (li) {
      var val = (li.getAttribute("data-skill") || "").trim();
      if (val) list.push(val);
    });
    return list;
  }
  function addSkill(value) {
    var skill = String(value || "").trim();
    if (!skill) return false;
    var list = document.getElementById("onboarding-skill-list");
    var exists = $$("#onboarding-skill-list li").some(function (li) { return (li.getAttribute("data-skill") || "").toLowerCase() === skill.toLowerCase(); });
    if (exists) return false;
    if (!list) return false;
    var item = document.createElement("li");
    item.dataset.skill = skill;
    item.textContent = skill;
    var remove = document.createElement("button");
    remove.type = "button"; remove.setAttribute("aria-label", "Remove skill " + skill); remove.textContent = "×";
    remove.addEventListener("click", function () {
      item.remove();
      setFieldError("onboarding-skill", "");
    });
    item.appendChild(remove);
    list.appendChild(item);
    return true;
  }
  function validateSignup() {
    var errors = {};
    var name = document.getElementById("signup-name").value.trim();
    var email = document.getElementById("signup-email").value.trim();
    var password = document.getElementById("signup-password").value;
    var confirm = document.getElementById("signup-confirm").value;
    var role = document.getElementById("signup-role").value;
    var checked = document.getElementById("signup-terms").checked;
    if (!name) errors["signup-name"] = "Please enter your full name.";
    if (!email || !validEmail(email)) errors["signup-email"] = "Enter a valid email address.";
    if (!password || password.length < 8) errors["signup-password"] = "Use at least 8 characters.";
    if (!confirm || password !== confirm) errors["signup-confirm"] = "Passwords do not match.";
    if (!role) errors["signup-role"] = "Select your role.";
    if (!checked) errors["signup-terms"] = "Please accept the demo terms.";
    markFormErrors(authSignupForm, errors);
    return Object.keys(errors).length === 0;
  }
  function validateSignin() {
    var errors = {};
    var email = document.getElementById("signin-email").value.trim();
    var password = document.getElementById("signin-password").value;
    if (!email || !validEmail(email)) errors["signin-email"] = "Enter a valid email address.";
    if (!password || password.length < 8) errors["signin-password"] = "Enter your password.";
    markFormErrors(authSigninForm, errors);
    return Object.keys(errors).length === 0;
  }
  function persistDemoSession(email, name) {
    var session = { email: email || "", name: name || "", signedIn: true, demo: true };
    writeStorageJson(AUTH_SESSION_KEY, session);
    return session;
  }
  function getStoredAccountByEmail(email) {
    var profile = readDemoProfile();
    if (!profile || !profile.email) return null;
    return profile.email.toLowerCase() === String(email || "").toLowerCase() ? profile : null;
  }
  function submitDemoSignup() {
    if (!validateSignup()) return;
    var name = document.getElementById("signup-name").value.trim();
    var email = document.getElementById("signup-email").value.trim();
    var role = document.getElementById("signup-role").value;
    var profile = readDemoProfile();
    profile = profile && typeof profile === "object" ? profile : {};
    profile.fullName = name;
    profile.email = email;
    profile.role = role;
    profile.createdAt = new Date().toISOString();
    profile.passwordStored = false;
    writeDemoProfile(profile);
    persistDemoSession(email, name);
    setAuthStatus(signupStatus, "Demo account created in this browser only. No real authentication service was used.");
    openAuth("onboarding");
    seedOnboardingData(profile);
  }
  function submitDemoSignin() {
    if (!validateSignin()) return;
    var email = document.getElementById("signin-email").value.trim();
    var stored = getStoredAccountByEmail(email);
    var profile = stored || readDemoProfile();
    if (profile && profile.email) {
      persistDemoSession(profile.email, profile.fullName || "");
      setAuthStatus(authStatus, "Demo sign in succeeded. This browser-only session does not use a real authentication provider.");
      if (profile.fullName || profile.role || profile.desiredRoles) {
        openAuth("onboarding");
        seedOnboardingData(profile);
      }
      if (studentShell) {
        showStudentRoute("dashboard");
        loadStudentProfileIntoForm();
        renderStudentDashboard();
      }
      return;
    }
    persistDemoSession(email, "");
    setAuthStatus(authStatus, "Demo sign in succeeded. No real backend is connected; this is a browser-only demo session.");
  }
  function seedOnboardingData(profile) {
    var data = profile || readDemoProfile();
    var mapping = {
      "onboarding-name": data.fullName || "",
      "onboarding-headline": data.headline || "",
      "onboarding-education": data.educationLevel || "",
      "onboarding-college": data.collegeName || "",
      "onboarding-graduation": data.graduationYear || "",
      "onboarding-role-target": data.desiredRoles || "",
      "onboarding-opportunity-type": data.opportunityType || "",
      "onboarding-work-mode": data.workMode || "",
      "onboarding-location": data.preferredLocations || "",
      "onboarding-interests": data.careerInterests || "",
      "onboarding-github": data.githubUrl || "",
      "onboarding-portfolio": data.portfolioUrl || ""
    };
    Object.keys(mapping).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = mapping[id] || "";
    });
    var skillList = document.getElementById("onboarding-skill-list");
    if (skillList) {
      skillList.innerHTML = "";
      (Array.isArray(data.skills) ? data.skills : []).forEach(function (skill) {
        addSkill(skill);
      });
    }
    if (onboardingSummary) renderOnboardingSummary();
  }
  function validateOnboardingStep(step) {
    var errors = {};
    var allClear = true;
    if (step === 1) {
      var fullName = document.getElementById("onboarding-name").value.trim();
      var education = document.getElementById("onboarding-education").value;
      if (!fullName) { errors["onboarding-name"] = "Please enter your full name."; allClear = false; }
      if (!education) { errors["onboarding-education"] = "Please select your education level."; allClear = false; }
    }
    if (step === 2) {
      var roles = document.getElementById("onboarding-role-target").value.trim();
      var type = document.getElementById("onboarding-opportunity-type").value;
      var mode = document.getElementById("onboarding-work-mode").value;
      if (!roles) { errors["onboarding-role-target"] = "Please enter a role or job title."; allClear = false; }
      if (!type) { errors["onboarding-opportunity-type"] = "Please select a preferred opportunity type."; allClear = false; }
      if (!mode) { errors["onboarding-work-mode"] = "Please select a preferred work mode."; allClear = false; }
    }
    if (step === 3) {
      if (!readSkillList().length) { errors["onboarding-skill"] = "Add at least one skill to continue."; allClear = false; }
      var github = document.getElementById("onboarding-github").value.trim();
      var portfolio = document.getElementById("onboarding-portfolio").value.trim();
      if (github && !isHttpUrl(github)) { errors["onboarding-github"] = "Use a valid http(s) URL."; allClear = false; }
      if (portfolio && !isHttpUrl(portfolio)) { errors["onboarding-portfolio"] = "Use a valid http(s) URL."; allClear = false; }
    }
    Object.keys(errors).forEach(function (key) { setFieldError(key, errors[key]); });
    if (Object.keys(errors).length === 0) {
      ["onboarding-name", "onboarding-education", "onboarding-role-target", "onboarding-opportunity-type", "onboarding-work-mode", "onboarding-skill", "onboarding-github", "onboarding-portfolio"].forEach(function (id) {
        if (document.getElementById(id)) setFieldError(id, "");
      });
    }
    setAuthStatus(onboardingStatus, allClear ? "" : "Please correct the highlighted fields before continuing.");
    return allClear;
  }
  function saveProfileSnapshot() {
    var profile = readDemoProfile();
    profile = profile && typeof profile === "object" ? profile : {};
    profile.fullName = document.getElementById("onboarding-name").value.trim() || profile.fullName || "";
    profile.headline = document.getElementById("onboarding-headline").value.trim();
    profile.educationLevel = document.getElementById("onboarding-education").value;
    profile.collegeName = document.getElementById("onboarding-college").value.trim();
    profile.graduationYear = document.getElementById("onboarding-graduation").value.trim();
    profile.desiredRoles = document.getElementById("onboarding-role-target").value.trim();
    profile.opportunityType = document.getElementById("onboarding-opportunity-type").value;
    profile.workMode = document.getElementById("onboarding-work-mode").value;
    profile.preferredLocations = document.getElementById("onboarding-location").value.trim();
    profile.skills = readSkillList();
    profile.careerInterests = document.getElementById("onboarding-interests").value.trim();
    profile.githubUrl = document.getElementById("onboarding-github").value.trim();
    profile.portfolioUrl = document.getElementById("onboarding-portfolio").value.trim();
    profile.updatedAt = new Date().toISOString();
    writeDemoProfile(profile);
    return profile;
  }
  function renderOnboardingSummary() {
    if (!onboardingSummary) return;
    var profile = saveProfileSnapshot();
    var dl = document.createElement("dl");
    var pairs = [
      ["Full name", profile.fullName || "Not provided"],
      ["Headline", profile.headline || "Not provided"],
      ["Education", profile.educationLevel || "Not provided"],
      ["College", profile.collegeName || "Not provided"],
      ["Graduation", profile.graduationYear || "Not provided"],
      ["Desired roles", profile.desiredRoles || "Not provided"],
      ["Opportunity type", profile.opportunityType || "Not provided"],
      ["Work mode", profile.workMode || "Not provided"],
      ["Locations", profile.preferredLocations || "Not provided"],
      ["Skills", profile.skills && profile.skills.length ? profile.skills.join(", ") : "Not provided"],
      ["Career interests", profile.careerInterests || "Not provided"],
      ["GitHub", profile.githubUrl || "Not provided"],
      ["Portfolio", profile.portfolioUrl || "Not provided"]
    ];
    pairs.forEach(function (pair) {
      var dt = document.createElement("dt"); dt.textContent = pair[0];
      var dd = document.createElement("dd"); dd.textContent = pair[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    onboardingSummary.textContent = "";
    onboardingSummary.appendChild(dl);
  }
  function setOnboardingStep(step) {
    if (!onboardingStepEls.length) return;
    onboardingStepEls.forEach(function (el) {
      el.classList.toggle("is-visible", Number(el.dataset.step) === step);
    });
    onboardingStepLabel.textContent = "Step " + step + " of 4";
    if (step === 4) {
      onboardingNext.textContent = "Finish setup";
      renderOnboardingSummary();
    } else {
      onboardingNext.textContent = "Continue";
    }
    if (step === 1) onboardingBack.hidden = false; else onboardingBack.hidden = false;
    if (step === 4 && onboardingNext) onboardingNext.focus();
  }
  var onboardingStep = 1;
  function renderOnboardingStep() {
    setOnboardingStep(onboardingStep);
  }
  function moveOnboarding(nextStep) {
    if (nextStep >= 1 && nextStep <= 4) {
      onboardingStep = nextStep;
      renderOnboardingStep();
    }
  }
  function finishOnboarding() {
    var saved = saveProfileSnapshot();
    if (!saved.fullName || !saved.educationLevel || !saved.desiredRoles || !saved.opportunityType || !saved.workMode || !(saved.skills && saved.skills.length)) {
      setAuthStatus(onboardingStatus, "Please complete the required fields before finishing setup.");
      return;
    }
    setAuthStatus(onboardingStatus, "Demo profile saved locally in this browser only. No real account or backend was created.");
    if (studentShell) {
      showStudentRoute("dashboard");
      loadStudentProfileIntoForm();
      renderStudentDashboard();
    }
    if (authOnboardingPanel) {
      authOnboardingPanel.classList.add("is-complete");
      var finishCard = document.createElement("div");
      finishCard.className = "summary-card";
      finishCard.innerHTML = "<p><strong>You're set.</strong> Your demo student profile has been saved in this browser only.</p>";
      onboardingSummary.textContent = "";
      onboardingSummary.appendChild(finishCard);
      var buttonWrap = document.createElement("div");
      buttonWrap.className = "auth-form__actions";
      var continueExplore = document.createElement("button");
      continueExplore.type = "button"; continueExplore.className = "btn btn--primary btn--block"; continueExplore.textContent = "Explore opportunities";
      continueExplore.addEventListener("click", function () { closeAuth(); document.getElementById("opportunities").scrollIntoView({ behavior: "smooth", block: "start" }); });
      buttonWrap.appendChild(continueExplore);
      onboardingSummary.appendChild(buttonWrap);
      onboardingStepEls.forEach(function (el) { el.classList.remove("is-visible"); });
      onboardingNext.hidden = true;
      onboardingBack.hidden = true;
      if (onboardingExit) onboardingExit.textContent = "Return to opportunities";
      if (onboardingStepLabel) onboardingStepLabel.textContent = "Setup complete";
    }
  }

  document.addEventListener("click", function (e) {
    var authTarget = e.target.closest("[data-auth-target]");
    if (authTarget) {
      openAuth(authTarget.dataset.authTarget);
      return;
    }
    var forgot = e.target.closest("[data-auth-forgot]");
    if (forgot) {
      setAuthStatus(authStatus, "Demo password reset is not available. This is a frontend-only experience, and no reset emails are sent.");
      return;
    }
    var passToggle = e.target.closest("[data-password-toggle]");
    if (passToggle) {
      setPasswordVisibility(passToggle);
      return;
    }
    var resetProfile = e.target.closest("#auth-reset-profile");
    if (resetProfile) {
      removeStorageJson(AUTH_PROFILE_KEY);
      removeStorageJson(AUTH_SESSION_KEY);
      if (studentShell) studentShell.hidden = true;
      setAuthStatus(authStatus, "Demo profile data cleared. You can continue browsing as a guest.");
      setAuthStatus(signupStatus, "");
      setAuthStatus(onboardingStatus, "");
      if (authOnboardingPanel) authOnboardingPanel.hidden = true;
      openAuth("signin");
      return;
    }
    var el = e.target.closest("[data-soon]");
    if (!el) return;
    openDialog(el.dataset.soon + " is coming soon", "NEXORA is at the homepage stage. This part of the product hasn’t been built yet, and nothing here saves or submits any information.");
  });

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form) return;
    if (form.id === "auth-signin-panel") {
      e.preventDefault();
      submitDemoSignin();
    }
    if (form.id === "auth-signup-panel") {
      e.preventDefault();
      submitDemoSignup();
    }
  });
  document.getElementById("auth-close").addEventListener("click", closeAuth);
  authTabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      openAuth(btn.dataset.authTab);
    });
  });
  document.getElementById("signin-password").addEventListener("input", function () { clearFieldError("signin-password"); });
  document.getElementById("signin-email").addEventListener("input", function () { clearFieldError("signin-email"); });
  document.getElementById("signup-name").addEventListener("input", function () { clearFieldError("signup-name"); });
  document.getElementById("signup-email").addEventListener("input", function () { clearFieldError("signup-email"); });
  document.getElementById("signup-password").addEventListener("input", function () { clearFieldError("signup-password"); });
  document.getElementById("signup-confirm").addEventListener("input", function () { clearFieldError("signup-confirm"); });
  document.getElementById("signup-role").addEventListener("change", function () { clearFieldError("signup-role"); });
  document.getElementById("signup-terms").addEventListener("change", function () { clearFieldError("signup-terms"); });
  document.getElementById("onboarding-skill-add").addEventListener("click", function () {
    var input = document.getElementById("onboarding-skill-input");
    if (!addSkill(input.value)) {
      setFieldError("onboarding-skill", "Add a skill before continuing.");
    }
    input.value = ""; input.focus();
  });
  document.getElementById("onboarding-skill-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("onboarding-skill-add").click();
    }
  });
  document.getElementById("onboarding-name").addEventListener("input", function () { clearFieldError("onboarding-name"); });
  document.getElementById("onboarding-education").addEventListener("change", function () { clearFieldError("onboarding-education"); });
  document.getElementById("onboarding-role-target").addEventListener("input", function () { clearFieldError("onboarding-role-target"); });
  document.getElementById("onboarding-opportunity-type").addEventListener("change", function () { clearFieldError("onboarding-opportunity-type"); });
  document.getElementById("onboarding-work-mode").addEventListener("change", function () { clearFieldError("onboarding-work-mode"); });
  document.getElementById("onboarding-github").addEventListener("input", function () { clearFieldError("onboarding-github"); });
  document.getElementById("onboarding-portfolio").addEventListener("input", function () { clearFieldError("onboarding-portfolio"); });
  document.getElementById("onboarding-back").addEventListener("click", function () {
    if (onboardingStep > 1) {
      moveOnboarding(onboardingStep - 1);
      setAuthStatus(onboardingStatus, "");
    }
  });
  document.getElementById("onboarding-next").addEventListener("click", function () {
    var profile = saveProfileSnapshot();
    if (onboardingStep === 4) {
      finishOnboarding();
      return;
    }
    if (!validateOnboardingStep(onboardingStep)) return;
    if (onboardingStep < 4) {
      moveOnboarding(onboardingStep + 1);
      setAuthStatus(onboardingStatus, "");
      if (onboardingStep === 4) renderOnboardingSummary();
    }
  });
  onboardingExit.addEventListener("click", function () { closeAuth(); });

  if (authOnboardingPanel) {
    authOnboardingPanel.hidden = true;
  }
  authTabs.forEach(function (btn) {
    var active = btn.dataset.authTab === "signin";
    btn.setAttribute("aria-selected", String(active));
    btn.classList.toggle("is-active", active);
  });
  if (authSigninForm) authSigninForm.classList.add("is-visible");
  if (authSignupForm) authSignupForm.classList.remove("is-visible");
  if (authShell) authShell.hidden = true;
  if (window.NEXORA_DEMO && window.NEXORA_DEMO.profile) {
    seedOnboardingData(window.NEXORA_DEMO.profile);
  }

  /* ---------- Student dashboard and profile foundation ---------- */
  var studentShell = document.getElementById("student-shell");
  var recruiterShell = document.getElementById("recruiter-shell");
  var studentViews = $$(".student-view");
  var studentRouteButtons = $$("[data-student-route]");
  var studentProfileForm = document.getElementById("student-profile-form");
  var studentProfileStatus = document.getElementById("student-profile-status");
  var studentWelcomeName = document.getElementById("student-welcome-name");
  var studentCompletionBar = document.getElementById("student-completion-bar");
  var studentCompletionValue = document.getElementById("student-completion-value");
  var studentSavedJobs = document.getElementById("student-saved-jobs");
  var studentApplications = document.getElementById("student-applications");
  var studentOverview = document.getElementById("student-profile-overview");
  var studentSkillDraftId = null;
  var studentProjectDraftId = null;

  function normalizeStudentProfile(profile) {
    var source = profile && typeof profile === "object" ? profile : {};
    var skills = Array.isArray(source.skills) ? source.skills.map(function (skill) {
      var item = skill && typeof skill === "object" ? skill : {};
      var name = String(item.name || item.skill || "").trim();
      return {
        id: String(item.id || "skill_" + Math.random().toString(16).slice(2)),
        name: name,
        level: String(item.level || "").trim(),
        evidence: item.evidence === "project-linked" ? "project-linked" : "self-declared",
        projectId: String(item.projectId || "").trim(),
        linkedProject: String(item.linkedProject || "").trim()
      };
    }).filter(function (skill) { return !!skill.name; }) : [];

    var projects = Array.isArray(source.projects) ? source.projects.map(function (project) {
      var item = project && typeof project === "object" ? project : {};
      return {
        id: String(item.id || "project_" + Math.random().toString(16).slice(2)),
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
        technologies: String(item.technologies || "").trim(),
        role: String(item.role || "").trim(),
        githubUrl: String(item.githubUrl || "").trim(),
        liveDemoUrl: String(item.liveDemoUrl || "").trim()
      };
    }).filter(function (project) { return !!project.title; }) : [];

    return {
      fullName: String(source.fullName || "").trim(),
      headline: String(source.headline || "").trim(),
      educationLevel: String(source.educationLevel || "").trim(),
      collegeName: String(source.collegeName || "").trim(),
      graduationYear: String(source.graduationYear || "").trim(),
      desiredRoles: String(source.desiredRoles || "").trim(),
      opportunityType: String(source.opportunityType || "").trim(),
      workMode: String(source.workMode || "").trim(),
      preferredLocations: String(source.preferredLocations || "").trim(),
      skills: skills,
      projects: projects,
      careerInterests: String(source.careerInterests || "").trim(),
      githubUrl: String(source.githubUrl || "").trim(),
      portfolioUrl: String(source.portfolioUrl || "").trim(),
      email: String(source.email || "").trim(),
      role: String(source.role || "").trim(),
      updatedAt: source.updatedAt || ""
    };
  }

  function studentProfileHasData(profile) {
    var p = normalizeStudentProfile(profile);
    return !!(p.fullName || p.headline || p.educationLevel || p.collegeName || p.graduationYear || p.desiredRoles || p.opportunityType || p.workMode || p.preferredLocations || p.skills.length || p.projects.length || p.careerInterests || p.githubUrl || p.portfolioUrl || p.email || p.role);
  }

  function setStudentStatus(message) {
    if (studentProfileStatus) studentProfileStatus.textContent = message || "";
  }

  function showStudentRoute(route) {
    if (!studentShell) return;
    if (recruiterShell) recruiterShell.hidden = true;
    var viewMap = {
      dashboard: document.getElementById("student-dashboard-view"),
      profile: document.getElementById("student-profile-view")
    };
    studentViews.forEach(function (view) {
      if (!view) return;
      var isVisible = view === viewMap[route];
      view.classList.toggle("is-visible", isVisible);
      view.hidden = !isVisible;
    });
    studentRouteButtons.forEach(function (button) {
      if (!button) return;
      var active = button.dataset.studentRoute === route;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    studentShell.hidden = !(route === "dashboard" || route === "profile");
  }

  function studentFieldErrorMap(profileData) {
    var errors = {};
    if (!profileData.fullName) errors["student-profile-name"] = "Please enter your full name.";
    if (!profileData.educationLevel) errors["student-profile-education"] = "Please select your education level.";
    if (!profileData.desiredRoles) errors["student-profile-role"] = "Please enter a role or job title.";
    if (!profileData.opportunityType) errors["student-profile-opportunity"] = "Please select a preferred opportunity type.";
    if (!profileData.workMode) errors["student-profile-workmode"] = "Please select a preferred work mode.";
    if (profileData.githubUrl && !isHttpUrl(profileData.githubUrl)) errors["student-profile-github"] = "Use a valid http(s) URL.";
    if (profileData.portfolioUrl && !isHttpUrl(profileData.portfolioUrl)) errors["student-profile-portfolio"] = "Use a valid http(s) URL.";
    return errors;
  }

  function studentProjectNameById(id) {
    var project = normalizeStudentProfile(readDemoProfile()).projects.find(function (item) { return item.id === id; });
    return project ? project.title : "";
  }

  function renderProjectOptions() {
    var select = document.getElementById("student-skill-project");
    if (!select) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    var currentValue = select.value;
    select.innerHTML = '<option value="">Link to project (optional)</option>' + profile.projects.map(function (project) {
      return '<option value="' + escapeHtml(project.id) + '">' + escapeHtml(project.title) + '</option>';
    }).join("");
    if (currentValue && profile.projects.some(function (project) { return project.id === currentValue; })) {
      select.value = currentValue;
    }
  }

  function setStudentInputs(profile) {
    var p = normalizeStudentProfile(profile);
    var values = {
      "student-profile-name": p.fullName,
      "student-profile-headline": p.headline,
      "student-profile-education": p.educationLevel,
      "student-profile-college": p.collegeName,
      "student-profile-graduation": p.graduationYear,
      "student-profile-role": p.desiredRoles,
      "student-profile-opportunity": p.opportunityType,
      "student-profile-workmode": p.workMode,
      "student-profile-locations": p.preferredLocations,
      "student-profile-interests": p.careerInterests,
      "student-profile-github": p.githubUrl,
      "student-profile-portfolio": p.portfolioUrl
    };
    Object.keys(values).forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.value = values[id] || "";
    });
    renderProjectOptions();
    renderStudentSkillEditor();
    renderStudentProjectEditor();
  }

  function clearStudentSkillForm() {
    var skillName = document.getElementById("student-skill-name");
    var skillLevel = document.getElementById("student-skill-level");
    var skillProject = document.getElementById("student-skill-project");
    if (skillName) skillName.value = "";
    if (skillLevel) skillLevel.value = "";
    if (skillProject) skillProject.value = "";
    studentSkillDraftId = null;
    var addButton = document.getElementById("student-skill-add");
    if (addButton) addButton.textContent = "Add skill";
    setFieldError("student-skill-name", "");
    setFieldError("student-skill-error", "");
  }

  function clearStudentProjectForm() {
    ["student-project-title", "student-project-role", "student-project-description", "student-project-technologies", "student-project-github", "student-project-demo"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
      setFieldError(id, "");
    });
    studentProjectDraftId = null;
    var saveButton = document.getElementById("student-project-save");
    if (saveButton) saveButton.textContent = "Add project";
    setFieldError("student-project-error", "");
  }

  function renderStudentSkillEditor() {
    var list = document.getElementById("student-skill-list");
    if (!list) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    if (!profile.skills.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No skills added yet</h3><p>List the skills you want employers to see.</p></li>';
      return;
    }

    list.innerHTML = profile.skills.map(function (skill) {
      var levelText = skill.level ? '<span class="student-evidence">Level: ' + escapeHtml(skill.level) + '</span>' : '<span class="student-evidence">Level: Not set</span>';
      var evidence = skill.evidence === "project-linked" ? "Project-linked" : "Self-declared";
      var linkedProject = skill.projectId ? ' • linked to ' + escapeHtml(studentProjectNameById(skill.projectId)) : "";
      return '<li class="student-skill-item">' +
        '<div class="student-skill-item__meta">' +
          '<strong>' + escapeHtml(skill.name) + '</strong>' +
          levelText +
          '<span class="student-evidence">Evidence: ' + escapeHtml(evidence) + linkedProject + '</span>' +
        '</div>' +
        '<div class="student-skill-item__actions">' +
          '<button class="btn btn--text" type="button" data-student-skill-edit="' + skill.id + '">Edit</button>' +
          '<button class="btn btn--text" type="button" data-student-skill-delete="' + skill.id + '">Remove</button>' +
        '</div>' +
      '</li>';
    }).join("");
  }

  function renderStudentProjectEditor() {
    var list = document.getElementById("student-project-list");
    if (!list) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    if (!profile.projects.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No proof-of-work projects yet</h3><p>Add a project to show your work, tools and role.</p></li>';
      return;
    }

    list.innerHTML = profile.projects.map(function (project) {
      var technologies = project.technologies ? '<span class="student-evidence">Technologies: ' + escapeHtml(project.technologies) + '</span>' : '<span class="student-evidence">Technologies: Not provided</span>';
      var roleText = project.role ? '<span class="student-evidence">Role: ' + escapeHtml(project.role) + '</span>' : '<span class="student-evidence">Role: Not provided</span>';
      var links = [];
      if (project.githubUrl) links.push('<a class="link" href="' + escapeHtml(project.githubUrl) + '" target="_blank" rel="noopener noreferrer">GitHub</a>');
      if (project.liveDemoUrl) links.push('<a class="link" href="' + escapeHtml(project.liveDemoUrl) + '" target="_blank" rel="noopener noreferrer">Live demo</a>');
      return '<li class="student-project-item">' +
        '<div class="student-project-item__meta">' +
          '<strong>' + escapeHtml(project.title) + '</strong>' +
          '<span class="student-evidence">' + escapeHtml(project.description || "No description provided") + '</span>' +
          technologies +
          roleText +
          (links.length ? '<div class="student-project-item__links">' + links.join("") + '</div>' : '') +
        '</div>' +
        '<div class="student-project-item__actions">' +
          '<button class="btn btn--text" type="button" data-student-project-edit="' + project.id + '">Edit</button>' +
          '<button class="btn btn--text" type="button" data-student-project-delete="' + project.id + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join("");
  }

  function calculateProfileCompletion(profile) {
    var p = normalizeStudentProfile(profile);
    var values = [
      p.fullName, p.headline, p.educationLevel, p.collegeName, p.graduationYear,
      p.desiredRoles, p.opportunityType, p.workMode, p.preferredLocations,
      p.skills.length ? "skills" : "", p.projects.length ? "projects" : "",
      p.careerInterests, p.githubUrl, p.portfolioUrl
    ];
    var filled = values.filter(function (value) { return !!String(value || "").trim(); }).length;
    var total = values.length;
    return Math.min(100, Math.max(0, Math.round((filled / total) * 100)));
  }

  function renderStudentDashboard() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var name = profile.fullName || "Student";
    if (studentWelcomeName) {
      studentWelcomeName.textContent = name === "Student" ? "Student" : "Welcome back, " + name;
    }
    var completionValue = calculateProfileCompletion(profile);
    if (studentCompletionBar) studentCompletionBar.style.width = completionValue + "%";
    if (studentCompletionValue) studentCompletionValue.textContent = completionValue + "%";

    var savedJobs = Array.isArray(saved) ? saved : [];
    var savedMatches = savedJobs.map(function (id) {
      return Array.isArray(allJobs) ? allJobs.find(function (job) { return job && Number(job.id) === Number(id); }) : null;
    }).filter(Boolean);
    if (studentSavedJobs) {
      if (!savedMatches.length) {
        studentSavedJobs.innerHTML = '<li class="empty--compact"><h3>No saved jobs yet</h3><p>Bookmark opportunities in the job explorer to keep them here.</p></li>';
      } else {
        studentSavedJobs.innerHTML = savedMatches.slice(0, 4).map(function (job) {
          return '<li class="student-item"><strong>' + escapeHtml(job.title) + '</strong><span class="student-item__meta">' + escapeHtml(job.company) + ' • ' + escapeHtml(job.type) + '</span><button class="btn btn--text" type="button" data-student-job-view="' + job.id + '">View job</button></li>';
        }).join("");
      }
    }

    if (studentApplications) {
      var appStore = window.NexoraApplications && window.NexoraApplications.getStore ? window.NexoraApplications.getStore() : null;
      var appList = appStore && typeof appStore.list === "function" ? appStore.list() : [];
      if (!appList.length) {
        studentApplications.innerHTML = '<li class="empty--compact"><h3>No applications yet</h3><p>NEXORA has not implemented application tracking yet, so this stays empty until a real backend exists.</p></li>';
      } else {
        studentApplications.innerHTML = appList.slice(0, 4).map(function (record) {
          var job = Array.isArray(allJobs) ? allJobs.find(function (item) { return item && Number(item.id) === Number(record.jobId); }) : null;
          var label = job ? job.title : "Application";
          return '<li class="student-item"><strong>' + escapeHtml(label) + '</strong><span class="student-item__meta">Status: ' + escapeHtml(record.status || "Recorded") + '</span></li>';
        }).join("");
      }
    }

    if (studentOverview) {
      var skillsHtml = profile.skills.length ? profile.skills.map(function (skill) {
        var evidence = skill.evidence === "project-linked" ? "Project-linked" : "Self-declared";
        var level = skill.level ? ' <span class="student-evidence">' + escapeHtml(skill.level) + '</span>' : "";
        return '<li class="student-item"><strong>' + escapeHtml(skill.name) + '</strong>' + level + '<span class="student-item__meta">Evidence: ' + escapeHtml(evidence) + '</span></li>';
      }).join("") : '<li class="empty--compact"><h3>No skills added yet</h3><p>Add a few skills to help employers understand your strengths.</p></li>';

      var projectsHtml = profile.projects.length ? profile.projects.map(function (project) {
        return '<li class="student-item"><strong>' + escapeHtml(project.title) + '</strong><span class="student-item__meta">Role: ' + escapeHtml(project.role || "Not provided") + '</span><span class="student-item__meta">' + escapeHtml(project.description || "No description provided") + '</span></li>';
      }).join("") : '<li class="empty--compact"><h3>No proof-of-work projects yet</h3><p>Share important work samples and project outcomes.</p></li>';

      studentOverview.innerHTML = '<div class="student-overview__section"><h4>Skills</h4><ul class="student-list">' + skillsHtml + '</ul></div>' +
        '<div class="student-overview__section"><h4>Projects</h4><ul class="student-list">' + projectsHtml + '</ul></div>' +
        '<dl>' + [
          ["Name", profile.fullName || "Not provided"],
          ["Headline", profile.headline || "Not provided"],
          ["Education", profile.educationLevel || "Not provided"],
          ["College", profile.collegeName || "Not provided"],
          ["Graduation year", profile.graduationYear || "Not provided"],
          ["Career interests", profile.careerInterests || "Not provided"],
          ["Desired roles", profile.desiredRoles || "Not provided"],
          ["Opportunity type", profile.opportunityType || "Not provided"],
          ["Work mode", profile.workMode || "Not provided"],
          ["Locations", profile.preferredLocations || "Not provided"],
          ["GitHub", profile.githubUrl || "Not provided"],
          ["Portfolio", profile.portfolioUrl || "Not provided"]
        ].map(function (entry) {
          return '<dt>' + escapeHtml(entry[0]) + '</dt><dd>' + escapeHtml(entry[1]) + '</dd>';
        }).join("") + '</dl>';
    }
  }

  function loadStudentProfileIntoForm() {
    setStudentInputs(readDemoProfile());
    renderProjectOptions();
  }

  function saveStudentProfileFromForm() {
    var profile = readDemoProfile();
    profile = profile && typeof profile === "object" ? profile : {};
    profile.fullName = document.getElementById("student-profile-name").value.trim();
    profile.headline = document.getElementById("student-profile-headline").value.trim();
    profile.educationLevel = document.getElementById("student-profile-education").value;
    profile.collegeName = document.getElementById("student-profile-college").value.trim();
    profile.graduationYear = document.getElementById("student-profile-graduation").value.trim();
    profile.desiredRoles = document.getElementById("student-profile-role").value.trim();
    profile.opportunityType = document.getElementById("student-profile-opportunity").value;
    profile.workMode = document.getElementById("student-profile-workmode").value;
    profile.preferredLocations = document.getElementById("student-profile-locations").value.trim();
    profile.careerInterests = document.getElementById("student-profile-interests").value.trim();
    profile.githubUrl = document.getElementById("student-profile-github").value.trim();
    profile.portfolioUrl = document.getElementById("student-profile-portfolio").value.trim();
    profile.skills = normalizeStudentProfile(readDemoProfile()).skills;
    profile.projects = normalizeStudentProfile(readDemoProfile()).projects;
    profile.updatedAt = new Date().toISOString();

    var errors = studentFieldErrorMap(profile);
    if (Object.keys(errors).length) {
      markFormErrors(studentProfileForm, errors);
      setStudentStatus("Please fix the highlighted fields and try again.");
      return false;
    }
    writeDemoProfile(profile);
    setStudentStatus("Profile saved successfully. Your dashboard reflects the latest local data.");
    renderStudentDashboard();
    return true;
  }

  function addSkillToProfile() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var name = document.getElementById("student-skill-name").value.trim();
    var level = document.getElementById("student-skill-level").value;
    var projectId = document.getElementById("student-skill-project").value;
    if (!name) {
      setFieldError("student-skill-name", "Add a skill name before saving.");
      return;
    }
    var skillRecord = {
      id: studentSkillDraftId || String(Date.now()) + Math.random().toString(16).slice(2),
      name: name,
      level: level || "",
      evidence: projectId ? "project-linked" : "self-declared",
      projectId: projectId || "",
      linkedProject: projectId ? studentProjectNameById(projectId) : ""
    };
    if (studentSkillDraftId) {
      profile.skills = profile.skills.map(function (item) { return item.id === studentSkillDraftId ? skillRecord : item; });
    } else {
      profile.skills.push(skillRecord);
    }
    profile.updatedAt = new Date().toISOString();
    writeDemoProfile(profile);
    clearStudentSkillForm();
    renderProjectOptions();
    renderStudentSkillEditor();
    renderStudentDashboard();
  }

  function deleteSkillFromProfile(skillId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    profile.skills = profile.skills.filter(function (item) { return item.id !== skillId; });
    profile.updatedAt = new Date().toISOString();
    writeDemoProfile(profile);
    renderStudentSkillEditor();
    renderStudentDashboard();
  }

  function editSkillFromProfile(skillId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var skill = profile.skills.find(function (item) { return item.id === skillId; });
    if (!skill) return;
    var skillName = document.getElementById("student-skill-name");
    var skillLevel = document.getElementById("student-skill-level");
    var skillProject = document.getElementById("student-skill-project");
    if (skillName) skillName.value = skill.name;
    if (skillLevel) skillLevel.value = skill.level || "";
    if (skillProject) skillProject.value = skill.projectId || "";
    studentSkillDraftId = skillId;
    var addButton = document.getElementById("student-skill-add");
    if (addButton) addButton.textContent = "Save skill";
  }

  function validateProjectForm() {
    var errors = {};
    var title = document.getElementById("student-project-title").value.trim();
    var description = document.getElementById("student-project-description").value.trim();
    var technologies = document.getElementById("student-project-technologies").value.trim();
    var role = document.getElementById("student-project-role").value.trim();
    var github = document.getElementById("student-project-github").value.trim();
    var demo = document.getElementById("student-project-demo").value.trim();
    if (!title) errors["student-project-title"] = "Please enter a project title.";
    if (!description) errors["student-project-description"] = "Please add a short project description.";
    if (!technologies) errors["student-project-technologies"] = "Please list the technologies used.";
    if (!role) errors["student-project-role"] = "Please enter the role you played.";
    if (github && !isHttpUrl(github)) errors["student-project-github"] = "Use a valid http(s) URL.";
    if (demo && !isHttpUrl(demo)) errors["student-project-demo"] = "Use a valid http(s) URL.";
    Object.keys(errors).forEach(function (key) { setFieldError(key, errors[key]); });
    return Object.keys(errors).length === 0;
  }

  function addProjectToProfile() {
    if (!validateProjectForm()) {
      setFieldError("student-project-error", "Please fix the highlighted fields.");
      return;
    }
    var profile = normalizeStudentProfile(readDemoProfile());
    var record = {
      id: studentProjectDraftId || String(Date.now()) + Math.random().toString(16).slice(2),
      title: document.getElementById("student-project-title").value.trim(),
      description: document.getElementById("student-project-description").value.trim(),
      technologies: document.getElementById("student-project-technologies").value.trim(),
      role: document.getElementById("student-project-role").value.trim(),
      githubUrl: document.getElementById("student-project-github").value.trim(),
      liveDemoUrl: document.getElementById("student-project-demo").value.trim()
    };
    if (studentProjectDraftId) {
      profile.projects = profile.projects.map(function (item) { return item.id === studentProjectDraftId ? record : item; });
    } else {
      profile.projects.push(record);
    }
    profile.skills = profile.skills.map(function (skill) {
      if (skill.projectId && !profile.projects.some(function (project) { return project.id === skill.projectId; })) {
        return { id: skill.id, name: skill.name, level: skill.level, evidence: "self-declared", projectId: "", linkedProject: "" };
      }
      return skill;
    });
    profile.updatedAt = new Date().toISOString();
    writeDemoProfile(profile);
    clearStudentProjectForm();
    renderStudentProjectEditor();
    renderStudentSkillEditor();
    renderProjectOptions();
    renderStudentDashboard();
  }

  function deleteProjectFromProfile(projectId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    profile.projects = profile.projects.filter(function (item) { return item.id !== projectId; });
    profile.skills = profile.skills.map(function (skill) {
      if (skill.projectId === projectId) {
        return { id: skill.id, name: skill.name, level: skill.level, evidence: "self-declared", projectId: "", linkedProject: "" };
      }
      return skill;
    });
    profile.updatedAt = new Date().toISOString();
    writeDemoProfile(profile);
    renderStudentProjectEditor();
    renderStudentSkillEditor();
    renderProjectOptions();
    renderStudentDashboard();
  }

  function editProjectFromProfile(projectId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var project = profile.projects.find(function (item) { return item.id === projectId; });
    if (!project) return;
    [
      ["student-project-title", project.title],
      ["student-project-role", project.role],
      ["student-project-description", project.description],
      ["student-project-technologies", project.technologies],
      ["student-project-github", project.githubUrl],
      ["student-project-demo", project.liveDemoUrl]
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el) el.value = pair[1] || "";
    });
    studentProjectDraftId = projectId;
    var saveButton = document.getElementById("student-project-save");
    if (saveButton) saveButton.textContent = "Save project";
  }

  function submitStudentProfileForm() {
    if (!studentProfileForm) return;
    var saved = saveStudentProfileFromForm();
    if (saved) showStudentRoute("dashboard");
  }

  if (studentProfileForm) {
    studentProfileForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submitStudentProfileForm();
    });
  }

  /* ---------- Recruiter portal (browser-local demo only) ---------- */
  var RECRUITER_LISTINGS_KEY = "nexora:demo-recruiter-listings";
  var recruiterForm = document.getElementById("recruiter-listing-form");
  var recruiterFormStatus = document.getElementById("recruiter-form-status");
  var recruiterListingDraftId = null;
  var recruiterFieldIds = [
    "recruiter-job-title", "recruiter-company", "recruiter-description", "recruiter-location",
    "recruiter-job-type", "recruiter-work-mode", "recruiter-skills", "recruiter-apply-url", "recruiter-status"
  ];

  function setRecruiterStatus(message) {
    if (recruiterFormStatus) recruiterFormStatus.textContent = message || "";
    var listingStatus = document.getElementById("recruiter-listing-status");
    if (listingStatus) listingStatus.textContent = message || "";
  }

  function normalizeRecruiterListings(value) {
    if (!Array.isArray(value)) return null;
    return value.map(function (listing) {
      var item = listing && typeof listing === "object" ? listing : {};
      var status = ["Draft", "Published", "Closed"].indexOf(item.status) >= 0 ? item.status : "Draft";
      var skills = Array.isArray(item.requiredSkills) ? item.requiredSkills : String(item.requiredSkills || "").split(",");
      return {
        id: String(item.id || ""),
        title: String(item.title || "").trim(),
        company: String(item.company || "").trim(),
        description: String(item.description || "").trim(),
        location: String(item.location || "").trim(),
        jobType: String(item.jobType || "").trim(),
        workMode: String(item.workMode || "").trim(),
        requiredSkills: skills.map(function (skill) { return String(skill || "").trim(); }).filter(Boolean),
        applyUrl: String(item.applyUrl || "").trim(),
        status: status,
        updatedAt: String(item.updatedAt || "")
      };
    }).filter(function (listing) { return !!(listing.id && listing.title); });
  }

  function readRecruiterListings() {
    try {
      var raw = window.localStorage.getItem(RECRUITER_LISTINGS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      var listings = normalizeRecruiterListings(parsed);
      if (!listings) throw new Error("Stored recruiter listing data is not a list.");
      return listings;
    } catch (error) {
      setRecruiterStatus("Recruiter listings could not be read from this browser. No data was changed.");
      return null;
    }
  }

  function writeRecruiterListings(listings) {
    try {
      window.localStorage.setItem(RECRUITER_LISTINGS_KEY, JSON.stringify(listings));
      return true;
    } catch (error) {
      setRecruiterStatus("Recruiter listings could not be saved in this browser. Check browser storage and try again.");
      return false;
    }
  }

  function formatRecruiterDate(value) {
    if (!value || isNaN(Date.parse(value))) return "Not provided";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  }

  function recruiterListingMarkup(listing) {
    var statusClass = listing.status.toLowerCase();
    return '<li class="recruiter-listing">' +
      '<div class="recruiter-listing__content">' +
        '<div class="recruiter-listing__heading"><h3>' + escapeHtml(listing.title) + '</h3><span class="recruiter-status recruiter-status--' + statusClass + '">' + escapeHtml(listing.status) + '</span></div>' +
        '<p class="recruiter-listing__company">' + escapeHtml(listing.company) + '</p>' +
        '<p class="recruiter-listing__meta">' + escapeHtml(listing.location) + ' · ' + escapeHtml(listing.workMode) + ' · ' + escapeHtml(listing.jobType) + '</p>' +
        '<p class="recruiter-listing__meta"><strong>Required skills:</strong> ' + escapeHtml(listing.requiredSkills.join(", ")) + '</p>' +
        '<p class="recruiter-listing__meta"><strong>Last updated:</strong> ' + escapeHtml(formatRecruiterDate(listing.updatedAt)) + '</p>' +
        (listing.status === "Published" ? '<p class="recruiter-listing__note">Demo status only; not publicly published or verified.</p>' : '') +
      '</div>' +
      '<div class="recruiter-listing__actions">' +
        '<button class="btn btn--secondary" type="button" data-recruiter-edit="' + escapeHtml(listing.id) + '">Edit</button>' +
        '<button class="btn btn--text recruiter-delete" type="button" data-recruiter-delete="' + escapeHtml(listing.id) + '">Delete</button>' +
      '</div>' +
    '</li>';
  }

  function renderRecruiterPortal() {
    var listings = readRecruiterListings();
    var dashboardList = document.getElementById("recruiter-dashboard-list");
    var listingsList = document.getElementById("recruiter-listings");
    var totalCount = document.getElementById("recruiter-total-count");
    var activeCount = document.getElementById("recruiter-active-count");
    var draftCount = document.getElementById("recruiter-draft-count");
    if (!listings) {
      [totalCount, activeCount, draftCount].forEach(function (el) { if (el) el.textContent = "—"; });
      [dashboardList, listingsList].forEach(function (el) {
        if (el) el.innerHTML = '<li class="empty--compact"><h3>Listings unavailable</h3><p>Browser-local data could not be read.</p></li>';
      });
      return;
    }
    var active = listings.filter(function (listing) { return listing.status === "Published"; }).length;
    var drafts = listings.filter(function (listing) { return listing.status === "Draft"; }).length;
    if (totalCount) totalCount.textContent = String(listings.length);
    if (activeCount) activeCount.textContent = String(active);
    if (draftCount) draftCount.textContent = String(drafts);
    var ordered = listings.slice().sort(function (a, b) { return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0); });
    var empty = '<li class="empty--compact"><h3>No job listings yet</h3><p>Create a job draft to keep a listing in this browser. Nothing will be publicly posted.</p></li>';
    [dashboardList, listingsList].forEach(function (el) {
      if (el) el.innerHTML = ordered.length ? ordered.map(recruiterListingMarkup).join("") : empty;
    });
  }

  function showRecruiterRoute(route) {
    if (!recruiterShell) return;
    if (route === "explore") {
      recruiterShell.hidden = true;
      if (studentShell) studentShell.hidden = true;
      var opportunities = document.getElementById("opportunities");
      if (opportunities) opportunities.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      return;
    }
    if (studentShell) studentShell.hidden = true;
    var viewMap = {
      dashboard: document.getElementById("recruiter-dashboard-view"),
      listings: document.getElementById("recruiter-listings-view"),
      editor: document.getElementById("recruiter-editor-view")
    };
    $$(".recruiter-view").forEach(function (view) {
      var isVisible = view === viewMap[route];
      view.classList.toggle("is-visible", isVisible);
      view.hidden = !isVisible;
    });
    $$("[data-recruiter-route]").forEach(function (button) {
      var active = button.dataset.recruiterRoute === route;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    recruiterShell.hidden = false;
    renderRecruiterPortal();
  }

  function resetRecruiterForm() {
    if (!recruiterForm) return;
    recruiterForm.reset();
    recruiterListingDraftId = null;
    var title = document.getElementById("recruiter-editor-title");
    if (title) title.textContent = "Create a job draft";
    recruiterFieldIds.forEach(function (id) { clearFieldError(id); });
    setRecruiterStatus("");
  }

  function openRecruiterListingEditor(listingId) {
    resetRecruiterForm();
    if (listingId) {
      var listings = readRecruiterListings();
      var listing = listings && listings.find(function (item) { return item.id === listingId; });
      if (!listing) {
        setRecruiterStatus("That listing is no longer available in browser storage.");
        showRecruiterRoute("listings");
        return;
      }
      recruiterListingDraftId = listing.id;
      [
        ["recruiter-job-title", listing.title], ["recruiter-company", listing.company],
        ["recruiter-description", listing.description], ["recruiter-location", listing.location],
        ["recruiter-job-type", listing.jobType], ["recruiter-work-mode", listing.workMode],
        ["recruiter-skills", listing.requiredSkills.join(", ")], ["recruiter-apply-url", listing.applyUrl],
        ["recruiter-status", listing.status]
      ].forEach(function (pair) {
        var field = document.getElementById(pair[0]);
        if (field) field.value = pair[1] || "";
      });
      var heading = document.getElementById("recruiter-editor-title");
      if (heading) heading.textContent = "Edit job listing";
    }
    showRecruiterRoute("editor");
    var firstField = document.getElementById("recruiter-job-title");
    if (firstField) firstField.focus();
  }

  function recruiterListingErrors() {
    var errors = {};
    var requiredFields = [
      ["recruiter-job-title", "Enter a job title."],
      ["recruiter-company", "Enter a company name."],
      ["recruiter-description", "Enter a job description."],
      ["recruiter-location", "Enter a location."],
      ["recruiter-job-type", "Select a job type."],
      ["recruiter-work-mode", "Select a work mode."],
      ["recruiter-skills", "Enter at least one required skill."]
    ];
    requiredFields.forEach(function (pair) {
      var field = document.getElementById(pair[0]);
      if (!field || !field.value.trim()) errors[pair[0]] = pair[1];
    });
    var url = document.getElementById("recruiter-apply-url");
    if (url && url.value.trim()) {
      try {
        var parsedUrl = new URL(url.value.trim());
        if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
          errors["recruiter-apply-url"] = "Use a safe http(s) URL without embedded credentials.";
        }
      } catch (error) {
        errors["recruiter-apply-url"] = "Use a safe http(s) URL.";
      }
    }
    return errors;
  }

  function saveRecruiterListing(forceDraft) {
    if (!recruiterForm) return;
    recruiterFieldIds.forEach(function (id) { clearFieldError(id); });
    var errors = recruiterListingErrors();
    markFormErrors(recruiterForm, errors);
    if (Object.keys(errors).length) {
      setRecruiterStatus("Please fix the highlighted fields and try again.");
      return;
    }
    var existing = readRecruiterListings();
    if (!existing) return;
    var record = {
      id: recruiterListingDraftId || "listing_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      title: document.getElementById("recruiter-job-title").value.trim(),
      company: document.getElementById("recruiter-company").value.trim(),
      description: document.getElementById("recruiter-description").value.trim(),
      location: document.getElementById("recruiter-location").value.trim(),
      jobType: document.getElementById("recruiter-job-type").value,
      workMode: document.getElementById("recruiter-work-mode").value,
      requiredSkills: document.getElementById("recruiter-skills").value.split(",").map(function (skill) { return skill.trim(); }).filter(Boolean),
      applyUrl: document.getElementById("recruiter-apply-url").value.trim(),
      status: forceDraft ? "Draft" : document.getElementById("recruiter-status").value,
      updatedAt: new Date().toISOString()
    };
    var found = false;
    var updated = existing.map(function (listing) {
      if (listing.id !== record.id) return listing;
      found = true;
      return record;
    });
    if (!found) updated.push(record);
    if (!writeRecruiterListings(updated)) return;
    recruiterListingDraftId = record.id;
    setRecruiterStatus(forceDraft ? "Draft saved in this browser only." : "Listing saved in this browser only. It has not been published publicly or verified.");
    renderRecruiterPortal();
    showRecruiterRoute("listings");
  }

  function deleteRecruiterListing(listingId) {
    var listings = readRecruiterListings();
    if (!listings) return;
    var item = listings.find(function (entry) { return entry.id === listingId; });
    if (!item || !window.confirm('Delete "' + item.title + '" from this browser? This cannot be undone.')) return;
    var remaining = listings.filter(function (entry) { return entry.id !== listingId; });
    if (!writeRecruiterListings(remaining)) return;
    setRecruiterStatus("Listing deleted from this browser.");
    renderRecruiterPortal();
  }

  if (recruiterForm) {
    recruiterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveRecruiterListing(false);
    });
    recruiterFieldIds.forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.addEventListener("input", function () { clearFieldError(id); });
      if (field && field.tagName === "SELECT") field.addEventListener("change", function () { clearFieldError(id); });
    });
  }
  var recruiterSaveDraft = document.getElementById("recruiter-save-draft");
  if (recruiterSaveDraft) recruiterSaveDraft.addEventListener("click", function () { saveRecruiterListing(true); });
  renderRecruiterPortal();
  window.addEventListener("storage", function (event) {
    if (event.key === RECRUITER_LISTINGS_KEY) renderRecruiterPortal();
  });

  document.addEventListener("click", function (event) {
    var recruiterRouteButton = event.target.closest("[data-recruiter-route]");
    if (recruiterRouteButton) {
      showRecruiterRoute(recruiterRouteButton.dataset.recruiterRoute);
      return;
    }
    var recruiterCreateButton = event.target.closest("[data-recruiter-create]");
    if (recruiterCreateButton) {
      openRecruiterListingEditor("");
      return;
    }
    var recruiterEditButton = event.target.closest("[data-recruiter-edit]");
    if (recruiterEditButton) {
      openRecruiterListingEditor(recruiterEditButton.dataset.recruiterEdit);
      return;
    }
    var recruiterDeleteButton = event.target.closest("[data-recruiter-delete]");
    if (recruiterDeleteButton) {
      deleteRecruiterListing(recruiterDeleteButton.dataset.recruiterDelete);
      return;
    }
    var routeButton = event.target.closest("[data-student-route]");
    if (routeButton) {
      var route = routeButton.dataset.studentRoute;
      if (route === "explore") {
        showStudentRoute("explore");
        var anchor = document.getElementById("opportunities");
        if (anchor) anchor.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
        return;
      }
      showStudentRoute(route);
      if (route === "dashboard") renderStudentDashboard();
      if (route === "profile") loadStudentProfileIntoForm();
      return;
    }

    var skillEdit = event.target.closest("[data-student-skill-edit]");
    if (skillEdit) {
      editSkillFromProfile(skillEdit.dataset.studentSkillEdit);
      return;
    }

    var skillDelete = event.target.closest("[data-student-skill-delete]");
    if (skillDelete) {
      deleteSkillFromProfile(skillDelete.dataset.studentSkillDelete);
      return;
    }

    var projectEdit = event.target.closest("[data-student-project-edit]");
    if (projectEdit) {
      editProjectFromProfile(projectEdit.dataset.studentProjectEdit);
      return;
    }

    var projectDelete = event.target.closest("[data-student-project-delete]");
    if (projectDelete) {
      deleteProjectFromProfile(projectDelete.dataset.studentProjectDelete);
      return;
    }

    var viewJobButton = event.target.closest("[data-student-job-view]");
    if (viewJobButton) {
      var targetJob = Array.isArray(allJobs) ? allJobs.find(function (job) { return job && Number(job.id) === Number(viewJobButton.dataset.studentJobView); }) : null;
      if (targetJob) showDetails(targetJob);
      return;
    }
  });

  var studentSkillAdd = document.getElementById("student-skill-add");
  if (studentSkillAdd) {
    studentSkillAdd.addEventListener("click", addSkillToProfile);
  }

  var studentProjectSave = document.getElementById("student-project-save");
  if (studentProjectSave) {
    studentProjectSave.addEventListener("click", addProjectToProfile);
  }

  var studentProjectClear = document.getElementById("student-project-clear");
  if (studentProjectClear) {
    studentProjectClear.addEventListener("click", clearStudentProjectForm);
  }

  ["student-profile-name", "student-profile-education", "student-profile-role", "student-profile-opportunity", "student-profile-workmode", "student-profile-github", "student-profile-portfolio"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { clearFieldError(id); });
    if (el && (id === "student-profile-education" || id === "student-profile-opportunity" || id === "student-profile-workmode")) {
      el.addEventListener("change", function () { clearFieldError(id); });
    }
  });

  if (studentProfileHasData(readDemoProfile())) {
    showStudentRoute("dashboard");
    loadStudentProfileIntoForm();
    renderStudentDashboard();
  }

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
  if (typeof renderStudentDashboard === "function") renderStudentDashboard();

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
    if (typeof renderStudentDashboard === "function") renderStudentDashboard();
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
    if (typeof renderStudentDashboard === "function") renderStudentDashboard();
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
