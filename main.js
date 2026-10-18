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
      return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname && !u.username && !u.password;
    } catch (err) {
      return false;
    }
  }
  function readDemoProfile() {
    var profile = readStorageJson(AUTH_PROFILE_KEY, {});
    return profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
  }
  function writeDemoProfile(profile) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
    return writeStorageJson(AUTH_PROFILE_KEY, profile);
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
    if (authOnboardingPanel) {
      authOnboardingPanel.hidden = target !== "onboarding";
      authOnboardingPanel.classList.toggle("is-visible", target === "onboarding");
    }
    if (target === "signin") {
      var emailField = document.getElementById("signin-email");
      if (emailField) emailField.focus();
    }
    if (target === "signup") {
      var signupName = document.getElementById("signup-name");
      if (signupName) signupName.focus();
    }
    if (target === "onboarding") {
      onboardingStep = 1;
      seedOnboardingData(readDemoProfile());
      if (authOnboardingPanel) authOnboardingPanel.classList.remove("is-complete");
      onboardingNext.hidden = false;
      onboardingBack.hidden = false;
      if (onboardingExit) onboardingExit.textContent = "Exit setup";
      if (onboardingNext) onboardingNext.textContent = "Continue";
      renderOnboardingStep();
    }
  }
  function closeAuth() {
    if (authShell) authShell.hidden = true;
    if (authOnboardingPanel) {
      authOnboardingPanel.hidden = true;
      authOnboardingPanel.classList.remove("is-visible");
    }
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
    profile.fullName = name;
    profile.email = email;
    profile.role = role;
    profile.createdAt = new Date().toISOString();
    profile.passwordStored = false;
    if (!writeDemoProfile(profile)) {
      setAuthStatus(signupStatus, "Could not save demo profile data in this browser. Check local storage settings and try again.");
      return;
    }
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
        addSkill(skill && typeof skill === "object" ? skill.name || skill.skill : skill);
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
  function collectProfileSnapshot() {
    var profile = readDemoProfile();
    profile.fullName = document.getElementById("onboarding-name").value.trim() || profile.fullName || "";
    profile.headline = document.getElementById("onboarding-headline").value.trim();
    profile.educationLevel = document.getElementById("onboarding-education").value;
    profile.collegeName = document.getElementById("onboarding-college").value.trim();
    profile.graduationYear = document.getElementById("onboarding-graduation").value.trim();
    profile.desiredRoles = document.getElementById("onboarding-role-target").value.trim();
    profile.opportunityType = document.getElementById("onboarding-opportunity-type").value;
    profile.workMode = document.getElementById("onboarding-work-mode").value;
    profile.preferredLocations = document.getElementById("onboarding-location").value.trim();
    var existingSkills = normalizeStudentProfile(profile).skills;
    profile.skills = readSkillList().map(function (name) {
      var existing = existingSkills.find(function (skill) { return skill.name.toLowerCase() === name.toLowerCase(); });
      return existing || {
        id: "skill_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name: name,
        level: "",
        evidence: "self-declared",
        projectId: "",
        linkedProject: ""
      };
    });
    profile.careerInterests = document.getElementById("onboarding-interests").value.trim();
    profile.githubUrl = document.getElementById("onboarding-github").value.trim();
    profile.portfolioUrl = document.getElementById("onboarding-portfolio").value.trim();
    profile.updatedAt = new Date().toISOString();
    return profile;
  }
  function renderOnboardingSummary() {
    if (!onboardingSummary) return;
    var profile = collectProfileSnapshot();
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
      ["Skills", profile.skills && profile.skills.length ? profile.skills.map(function (skill) {
        return skill && typeof skill === "object" ? skill.name || skill.skill || "" : skill;
      }).filter(Boolean).join(", ") : "Not provided"],
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
    var saved = collectProfileSnapshot();
    if (!saved.fullName || !saved.educationLevel || !(saved.skills && saved.skills.length)) {
      setAuthStatus(onboardingStatus, "Please complete the required fields before finishing setup.");
      return;
    }
    if (!writeDemoProfile(saved)) {
      setAuthStatus(onboardingStatus, "Could not save your profile in this browser. Check local storage settings and try again.");
      return;
    }
    if (studentShell) {
      showStudentRoute("dashboard");
      loadStudentProfileIntoForm();
      renderStudentDashboard();
      if (studentDashboardStatus) studentDashboardStatus.textContent = "Demo profile saved in this browser only.";
      studentShell.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
    closeAuth();
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
  /* ---------- Student dashboard and profile foundation ---------- */
  var studentShell = document.getElementById("student-shell");
  var recruiterShell = document.getElementById("recruiter-shell");
  var hiddenSections = [document.querySelector("main"), document.querySelector(".site-header"), document.querySelector(".site-footer")];
  hiddenSections.forEach(function (node) {
    if (node) node.hidden = false;
  });
  var studentViews = $$(".student-view");
  var studentRouteButtons = $$("[data-student-route]");
  var studentProfileForm = document.getElementById("student-profile-form");
  var studentProfileStatus = document.getElementById("student-profile-status");
  var studentWelcomeName = document.getElementById("student-welcome-name");
  var studentCompletionBar = document.getElementById("student-completion-bar");
  var studentCompletionValue = document.getElementById("student-completion-value");
  var studentCompletionDetail = document.getElementById("student-completion-detail");
  var studentDashboardStatus = document.getElementById("student-dashboard-status");
  var studentSavedJobs = document.getElementById("student-saved-jobs");
  var studentApplications = document.getElementById("student-applications");
  var studentApplicationsView = document.getElementById("student-applications-view");
  var studentApplicationForm = document.getElementById("student-application-form");
  var studentApplicationList = document.getElementById("student-application-list");
  var studentApplicationMessage = document.getElementById("student-application-message");
  var studentApplicationListMessage = document.getElementById("student-application-list-message");
  var studentApplicationDuplicateEdit = document.getElementById("student-application-duplicate-edit");
  var studentApplicationDraftId = null;
  var studentApplicationStatuses = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Rejected", "Hired"];
  var studentApplicationLegacyStatuses = ["Viewed", "In Review", "Closed"];
  var studentApplicationStatusTransitions = {
    "Applied": ["Under Review", "Shortlisted", "Interview Scheduled", "Rejected"],
    "Under Review": ["Shortlisted", "Interview Scheduled", "Rejected", "Hired"],
    "Shortlisted": ["Interview Scheduled", "Rejected", "Hired"],
    "Interview Scheduled": ["Rejected", "Hired", "Under Review"],
    "Rejected": [],
    "Hired": [],
    "Viewed": ["Under Review", "Shortlisted", "Interview Scheduled", "Rejected", "Hired"],
    "In Review": ["Shortlisted", "Interview Scheduled", "Rejected", "Hired"],
    "Closed": []
  };
  var studentOverview = document.getElementById("student-profile-overview");
  var studentSkillDraftId = null;
  var studentProjectDraftId = null;
  var activeDefenseSessionId = "";

  function normalizeDefenseSessions(sessions) {
    if (!Array.isArray(sessions)) return [];
    return sessions.map(function (session, index) {
      var item = session && typeof session === "object" && !Array.isArray(session) ? session : {};
      var savedProject = item.project && typeof item.project === "object" ? item.project : {};
      var questions = Array.isArray(item.questions) ? item.questions.slice(0, 6).map(function (question, questionIndex) {
        var prompt = question && typeof question === "object" ? question : {};
        return {
          category: String(prompt.category || "Project explanation").slice(0, 60),
          text: String(prompt.text || "").slice(0, 700),
          answer: String(prompt.answer || "").slice(0, 3000)
        };
      }).filter(function (question) { return !!question.text; }) : [];
      var status = item.status === "completed" && questions.length === 6 ? "completed" : "in-progress";
      var result = item.result && typeof item.result === "object" ? item.result : {};
      var normalizedSession = {
        id: String(item.id || "defense_legacy_" + index),
        projectId: String(item.projectId || savedProject.id || ""),
        project: {
          id: String(savedProject.id || item.projectId || ""),
          title: String(savedProject.title || "").slice(0, 160),
          description: String(savedProject.description || "").slice(0, 2000),
          technologies: String(savedProject.technologies || "").slice(0, 500),
          role: String(savedProject.role || "").slice(0, 500),
          githubUrl: String(savedProject.githubUrl || "").slice(0, 500),
          liveDemoUrl: String(savedProject.liveDemoUrl || "").slice(0, 500)
        },
        questions: questions,
        currentIndex: Math.max(0, Math.min(Number(item.currentIndex) || 0, questions.length)),
        status: status,
        startedAt: String(item.startedAt || "").slice(0, 40),
        completedAt: status === "completed" ? String(item.completedAt || "").slice(0, 40) : "",
        shareWithRecruiters: status === "completed" && item.shareWithRecruiters === true,
        result: {
          strengths: Array.isArray(result.strengths) ? result.strengths.map(String).slice(0, 6) : [],
          unanswered: Array.isArray(result.unanswered) ? result.unanswered.map(String).slice(0, 6) : [],
          reviewTopics: Array.isArray(result.reviewTopics) ? result.reviewTopics.map(String).slice(0, 6) : [],
          answeredCount: Math.max(0, Math.min(Number(result.answeredCount) || 0, 6))
        }
      };
      if (status === "completed") normalizedSession.result = summarizeDefenseSession(normalizedSession);
      return normalizedSession;
    }).filter(function (session) { return session.questions.length > 0; }).slice(-30);
  }

  function normalizeSkillGapAnalysis(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    var steps = Array.isArray(value.steps) ? value.steps.map(function (step, index) {
      var item = step && typeof step === "object" && !Array.isArray(step) ? step : {};
      return {
        id: String(item.id || "roadmap_" + index).slice(0, 100),
        skill: String(item.skill || "").trim().slice(0, 100),
        why: String(item.why || "").trim().slice(0, 240),
        exercise: String(item.exercise || "").trim().slice(0, 400),
        projectId: String(item.projectId || "").trim().slice(0, 100),
        completed: item.completed === true
      };
    }).filter(function (step) { return !!(step.skill && step.why && step.exercise); }).slice(0, 30) : [];
    var requirements = Array.isArray(value.requiredSkills) ? value.requiredSkills.map(function (skill) {
      return String(skill || "").trim().slice(0, 100);
    }).filter(Boolean).slice(0, 40) : [];
    var additionalRequirements = Array.isArray(value.additionalRequirements) ? value.additionalRequirements.map(function (item) {
      return String(item || "").trim().slice(0, 300);
    }).filter(Boolean).slice(0, 20) : [];
    if (["role", "job"].indexOf(value.mode) < 0) return null;
    return {
      mode: value.mode,
      role: String(value.role || "").trim().slice(0, 100),
      jobId: String(value.jobId || "").slice(0, 100),
      jobTitle: String(value.jobTitle || "").trim().slice(0, 160),
      requiredSkills: requirements,
      additionalRequirements: additionalRequirements,
      analyzedAt: String(value.analyzedAt || "").slice(0, 40),
      steps: steps
    };
  }

  function normalizeApplicationStatus(value) {
    var status = String(value || "").trim();
    if (!status) return "";
    var normalized = {
      Viewed: "Under Review",
      "In Review": "Under Review",
      "Interview scheduled": "Interview Scheduled",
      "Interview Scheduled": "Interview Scheduled",
      "Under Review": "Under Review",
      Applied: "Applied",
      Shortlisted: "Shortlisted",
      Rejected: "Rejected",
      Hired: "Hired",
      Closed: "Closed"
    }[status] || status;
    return normalized;
  }

  function getApplicationStatusLabel(value) {
    var status = normalizeApplicationStatus(value);
    return status || "Unknown";
  }

  function getApplicationStatusClass(value) {
    var status = normalizeApplicationStatus(value);
    return {
      Applied: "student-application-status--applied",
      "Under Review": "student-application-status--under-review",
      Shortlisted: "student-application-status--shortlisted",
      "Interview Scheduled": "student-application-status--interview",
      Rejected: "student-application-status--rejected",
      Hired: "student-application-status--hired",
      Closed: "student-application-status--closed",
      "Viewed": "student-application-status--under-review",
      "In Review": "student-application-status--under-review"
    }[status] || "student-application-status--applied";
  }

  function normalizeApplicationStatusHistory(value, fallbackApplicationId, fallbackStatus) {
    var raw = Array.isArray(value) ? value : [];
    var normalized = raw.map(function (entry, index) {
      var item = entry && typeof entry === "object" ? entry : {};
      return {
        id: String(item.id || "status_" + (fallbackApplicationId || "legacy_") + "_" + index),
        applicationId: String(item.applicationId || fallbackApplicationId || "").trim(),
        previousStatus: normalizeApplicationStatus(item.previousStatus || ""),
        newStatus: normalizeApplicationStatus(item.newStatus || fallbackStatus || ""),
        timestamp: String(item.timestamp || "").trim(),
        actor: String(item.actor || "").trim(),
        actorRole: String(item.actorRole || "").trim(),
        note: String(item.note || "").trim()
      };
    }).filter(function (entry) { return !!entry.newStatus; });
    if (!normalized.length && fallbackStatus) {
      normalized.push({
        id: "status_init_" + (fallbackApplicationId || "legacy_") + "_" + Date.now(),
        applicationId: String(fallbackApplicationId || "").trim(),
        previousStatus: "",
        newStatus: normalizeApplicationStatus(fallbackStatus),
        timestamp: new Date().toISOString(),
        actor: "Applicant",
        actorRole: "Applicant",
        note: "Application recorded in the browser-local tracker."
      });
    }
    return normalized.slice(-25);
  }

  function appendApplicationStatusHistory(application, previousStatus, newStatus, actor, actorRole, note, timestamp) {
    if (!application || !newStatus) return Array.isArray(application && application.statusHistory) ? application.statusHistory : [];
    var history = Array.isArray(application.statusHistory) ? application.statusHistory.slice() : [];
    var entry = {
      id: "status_" + (application.id || "application") + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      applicationId: String(application.id || "").trim(),
      previousStatus: normalizeApplicationStatus(previousStatus || ""),
      newStatus: normalizeApplicationStatus(newStatus),
      timestamp: timestamp || new Date().toISOString(),
      actor: String(actor || "").trim() || "Demo user",
      actorRole: String(actorRole || "").trim() || "Recruiter",
      note: String(note || "").trim()
    };
    if (!entry.previousStatus && application.status) entry.previousStatus = normalizeApplicationStatus(application.status);
    if (!entry.newStatus) entry.newStatus = normalizeApplicationStatus(application.status) || "Applied";
    var lastEntry = history.length ? history[history.length - 1] : null;
    if (lastEntry && lastEntry.newStatus === entry.newStatus && lastEntry.previousStatus === entry.previousStatus && lastEntry.timestamp === entry.timestamp && lastEntry.actor === entry.actor) {
      return history;
    }
    history.push(entry);
    application.statusHistory = history.slice(-25);
    return application.statusHistory;
  }

  function canTransitionApplicationStatus(currentStatus, nextStatus) {
    var current = normalizeApplicationStatus(currentStatus);
    var next = normalizeApplicationStatus(nextStatus);
    if (!current || !next || current === next) return false;
    var options = studentApplicationStatusTransitions[current] || [];
    return options.indexOf(next) !== -1;
  }

  function normalizeSkillVerificationStatus(value, hasEvidence) {
    var allowed = [
      "Self-Reported",
      "Evidence Submitted",
      "Under Review",
      "Verified",
      "Rejected / More Evidence Needed"
    ];
    var status = String(value || "").trim();
    if (allowed.indexOf(status) !== -1) return status;
    return hasEvidence ? "Evidence Submitted" : "Self-Reported";
  }

  function normalizeSkillEvidenceItems(value) {
    if (!Array.isArray(value)) return [];
    return value.map(function (entry, index) {
      var item = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      var url = String(item.url || item.link || "").trim();
      var normalizedUrl = isHttpUrl(url) ? url : "";
      var description = String(item.description || item.notes || "").trim();
      var type = ["project", "github", "portfolio", "other"].indexOf(item.type) >= 0 ? item.type : (normalizedUrl ? "other" : "project");
      if (!normalizedUrl && !description) return null;
      return {
        id: String(item.id || "skill_evidence_" + index),
        type: type,
        label: String(item.label || item.type || "Evidence").trim() || "Evidence",
        url: normalizedUrl,
        description: description,
        submittedAt: String(item.submittedAt || "").trim(),
        reviewedAt: String(item.reviewedAt || "").trim(),
        reviewStatus: normalizeSkillVerificationStatus(item.reviewStatus || item.status, !!(normalizedUrl || description)),
        reviewFeedback: String(item.reviewFeedback || "").trim()
      };
    }).filter(Boolean).slice(0, 12);
  }

  function normalizeGitHubRepositoryUrl(value) {
    var raw = String(value || "").trim();
    if (!raw) return null;
    var candidate = raw.replace(/\s+/g, "");
    try {
      var parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      if (parsed.hostname.toLowerCase() !== "github.com") return null;
      var segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length !== 2) return null;
      var owner = segments[0];
      var repo = segments[1];
      if (!owner || !repo || owner === "." || repo === ".") return null;
      return {
        owner: owner,
        repo: repo,
        fullName: owner + "/" + repo,
        url: "https://github.com/" + owner + "/" + repo
      };
    } catch (error) {
      return null;
    }
  }

  function isGitHubProfileUrl(value) {
    var raw = String(value || "").trim();
    if (!raw) return false;
    try {
      var parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      if (parsed.hostname.toLowerCase() !== "github.com") return false;
      var segments = parsed.pathname.split("/").filter(Boolean);
      return segments.length >= 1 && segments.length <= 2 && !!segments[0];
    } catch (error) {
      return false;
    }
  }

  function isGitHubRepositoryUrl(value) {
    return !!normalizeGitHubRepositoryUrl(value);
  }

  function normalizeGitHubRepositoryEntries(value) {
    if (!Array.isArray(value)) return [];
    var seen = Object.create(null);
    return value.map(function (entry, index) {
      var item = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      var repoUrl = String(item.url || item.repositoryUrl || item.html_url || "").trim();
      var parsed = normalizeGitHubRepositoryUrl(repoUrl);
      var explicitName = String(item.name || item.fullName || item.repo || "").trim();
      var fullName = parsed ? parsed.fullName : String(item.fullName || explicitName || "").trim();
      var repoName = String(item.repo || item.name || (fullName ? fullName.split("/")[1] : "")).trim();
      var normalizedUrl = parsed ? parsed.url : (isHttpUrl(repoUrl) ? repoUrl : "");
      if (!normalizedUrl) return null;
      var key = normalizedUrl.toLowerCase();
      if (seen[key]) return null;
      seen[key] = true;
      var topics = Array.isArray(item.topics) ? item.topics.map(function (topic) { return String(topic || "").trim(); }).filter(Boolean) : [];
      var skillIds = Array.isArray(item.skillIds) ? item.skillIds : (item.skillId ? [item.skillId] : []);
      return {
        id: String(item.id || "github_repo_" + index),
        name: repoName || (fullName ? fullName.split("/")[1] : "Repository"),
        fullName: fullName || normalizedUrl.replace(/^https?:\/\//i, "").replace(/^github\.com\//i, ""),
        description: String(item.description || "").trim(),
        url: normalizedUrl,
        language: String(item.language || "").trim(),
        topics: topics.slice(0, 8),
        projectId: String(item.projectId || "").trim(),
        skillIds: skillIds.map(String).filter(Boolean).slice(0, 5),
        source: item.source === "api" ? "api" : "manual",
        fetchedAt: String(item.fetchedAt || "").trim()
      };
    }).filter(Boolean).slice(0, 20);
  }

  function normalizeStudentProfile(profile) {
    var source = profile && typeof profile === "object" && !Array.isArray(profile) ? profile : {};
    var skills = Array.isArray(source.skills) ? source.skills.map(function (skill, index) {
      var item = skill && typeof skill === "object" && !Array.isArray(skill) ? skill : {};
      var name = String(typeof skill === "string" ? skill : item.name || item.skill || "").trim();
      var evidenceItems = normalizeSkillEvidenceItems(Array.isArray(item.evidenceItems) ? item.evidenceItems : []);
      var hasEvidence = evidenceItems.length > 0 || !!item.evidenceUrl || !!item.link || !!String(item.description || "").trim();
      var status = normalizeSkillVerificationStatus(item.verificationStatus, hasEvidence);
      return {
        id: String(item.id || "skill_legacy_" + index),
        name: name,
        level: String(item.level || "").trim(),
        evidence: item.evidence === "project-linked" ? "project-linked" : "self-declared",
        projectId: String(item.projectId || "").trim(),
        linkedProject: String(item.linkedProject || "").trim(),
        evidenceItems: evidenceItems,
        verificationStatus: status,
        reviewFeedback: String(item.reviewFeedback || "").trim(),
        reviewedAt: String(item.reviewedAt || "").trim(),
        submittedAt: String(item.submittedAt || (evidenceItems[0] && evidenceItems[0].submittedAt) || "").trim()
      };
    }).filter(function (skill) { return !!skill.name; }) : [];

    var projects = Array.isArray(source.projects) ? source.projects.map(function (project, index) {
      var item = project && typeof project === "object" && !Array.isArray(project) ? project : {};
      return {
        id: String(item.id || "project_legacy_" + index),
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
        technologies: String(item.technologies || "").trim(),
        role: String(item.role || "").trim(),
        githubUrl: String(item.githubUrl || "").trim(),
        liveDemoUrl: String(item.liveDemoUrl || "").trim()
      };
    }).filter(function (project) { return !!project.title; }) : [];

    var applications = Array.isArray(source.applications) ? source.applications.map(function (application, index) {
      var item = application && typeof application === "object" && !Array.isArray(application) ? application : {};
      var status = normalizeApplicationStatus(String(item.status || "").trim());
      var recruiterStatus = normalizeApplicationStatus(String(item.recruiterStatus || "").trim());
      var history = normalizeApplicationStatusHistory(Array.isArray(item.statusHistory) ? item.statusHistory : [], String(item.id || "application_legacy_" + index), status || recruiterStatus || "Applied");
      if (!history.length && (status || recruiterStatus)) {
        history = [{
          id: "status_init_" + (item.id || "application_legacy_" + index),
          applicationId: String(item.id || "application_legacy_" + index).trim(),
          previousStatus: "",
          newStatus: status || recruiterStatus,
          timestamp: String(item.recruiterUpdatedAt || item.updatedAt || item.applicationDate || new Date().toISOString()).trim(),
          actor: recruiterStatus ? "Recruiter" : "Applicant",
          actorRole: recruiterStatus ? "Recruiter" : "Applicant",
          note: recruiterStatus ? "Recruiter status updated in the local demo." : "Application recorded in the browser-local tracker."
        }];
      }
      return {
        id: String(item.id || "application_legacy_" + index),
        jobId: item.jobId === null || item.jobId === undefined ? "" : String(item.jobId).trim(),
        recruiterListingId: String(item.recruiterListingId || "").trim(),
        candidateId: String(item.candidateId || source.profileId || "").trim(),
        jobTitle: String(item.jobTitle || "").trim(),
        companyName: String(item.companyName || "").trim(),
        applicationDate: String(item.applicationDate || "").trim(),
        methodSource: String(item.methodSource || "").trim(),
        status: status || recruiterStatus || "Applied",
        recruiterStatus: recruiterStatus || (status && status !== "Applied" ? status : ""),
        recruiterUpdatedAt: String(item.recruiterUpdatedAt || "").trim(),
        notes: String(item.notes || "").trim(),
        createdAt: String(item.createdAt || "").trim(),
        updatedAt: String(item.updatedAt || "").trim(),
        statusHistory: history,
        statusSource: "student"
      };
    }).filter(function (application) {
      return !!(application.jobTitle && application.companyName && (studentApplicationStatuses.indexOf(application.status) !== -1 || studentApplicationLegacyStatuses.indexOf(application.status) !== -1));
    }) : [];

    return {
      profileId: String(source.profileId || "").trim(),
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
      applications: applications,
      defenseSessions: normalizeDefenseSessions(source.defenseSessions),
      skillGapAnalysis: normalizeSkillGapAnalysis(source.skillGapAnalysis),
      careerInterests: String(source.careerInterests || "").trim(),
      githubUrl: String(source.githubUrl || "").trim(),
      portfolioUrl: String(source.portfolioUrl || "").trim(),
      githubRepositories: normalizeGitHubRepositoryEntries(source.githubRepositories),
      email: String(source.email || "").trim(),
      role: String(source.role || "").trim(),
      updatedAt: source.updatedAt || ""
    };
  }

  function studentProfileHasData(profile) {
    var p = normalizeStudentProfile(profile);
    return !!(p.fullName || p.headline || p.educationLevel || p.collegeName || p.graduationYear || p.desiredRoles || p.opportunityType || p.workMode || p.preferredLocations || p.skills.length || p.projects.length || p.applications.length || p.skillGapAnalysis || p.careerInterests || p.githubUrl || p.portfolioUrl || p.githubRepositories.length || p.email || p.role);
  }

  function setStudentStatus(message) {
    if (studentProfileStatus) studentProfileStatus.textContent = message || "";
  }

  function showStudentRoute(route) {
    if (!studentShell) return;
    if (recruiterShell) recruiterShell.hidden = true;
    var viewMap = {
      dashboard: document.getElementById("student-dashboard-view"),
      profile: document.getElementById("student-profile-view"),
      applications: studentApplicationsView,
      defense: document.getElementById("student-defense-view")
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
    studentShell.hidden = !(route === "dashboard" || route === "profile" || route === "applications" || route === "defense");
  }

  function studentFieldErrorMap(profileData) {
    var errors = {};
    if (!profileData.fullName) errors["student-profile-name"] = "Please enter your full name.";
    if (profileData.githubUrl && !isGitHubProfileUrl(profileData.githubUrl)) errors["student-profile-github"] = "Use a valid public GitHub profile URL such as https://github.com/yourname.";
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

  function populateGitHubRepositoryAssociationFields(profile) {
    var projectSelect = document.getElementById("student-github-repository-project");
    var skillSelect = document.getElementById("student-github-repository-skill");
    if (projectSelect) {
      var currentProject = projectSelect.value;
      projectSelect.innerHTML = '<option value="">Associate with a project (optional)</option>' + profile.projects.map(function (project) {
        return '<option value="' + escapeHtml(project.id) + '">' + escapeHtml(project.title) + '</option>';
      }).join("");
      if (currentProject && profile.projects.some(function (project) { return project.id === currentProject; })) {
        projectSelect.value = currentProject;
      }
    }
    if (skillSelect) {
      var currentSkill = skillSelect.value;
      skillSelect.innerHTML = '<option value="">Associate with a skill (optional)</option>' + profile.skills.map(function (skill) {
        return '<option value="' + escapeHtml(skill.id) + '">' + escapeHtml(skill.name) + '</option>';
      }).join("");
      if (currentSkill && profile.skills.some(function (skill) { return skill.id === currentSkill; })) {
        skillSelect.value = currentSkill;
      }
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
    populateGitHubRepositoryAssociationFields(p);
    renderProjectOptions();
    renderStudentSkillEditor();
    renderStudentProjectEditor();
    renderGitHubRepositoryList();
  }

  function clearStudentSkillForm() {
    var skillName = document.getElementById("student-skill-name");
    var skillLevel = document.getElementById("student-skill-level");
    var skillProject = document.getElementById("student-skill-project");
    if (skillName) skillName.value = "";
    if (skillLevel) {
      skillLevel.value = "";
      var savedLevelOption = skillLevel.querySelector("[data-saved-level]");
      if (savedLevelOption) savedLevelOption.remove();
    }
    if (skillProject) skillProject.value = "";
    studentSkillDraftId = null;
    var addButton = document.getElementById("student-skill-add");
    if (addButton) addButton.textContent = "Add skill";
    setStudentSkillMessage("");
    if (skillName) skillName.setAttribute("aria-invalid", "false");
  }

  function setStudentSkillMessage(message, isError) {
    var messageEl = document.getElementById("student-skill-error");
    var skillName = document.getElementById("student-skill-name");
    if (messageEl) messageEl.textContent = message || "";
    if (skillName) skillName.setAttribute("aria-invalid", isError ? "true" : "false");
  }

  var studentGitHubRepositoryDraftId = "";

  function clearStudentProjectForm() {
    ["student-project-title", "student-project-role", "student-project-description", "student-project-technologies", "student-project-github", "student-project-demo"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = "";
      setFieldError(id, "");
    });
    studentProjectDraftId = null;
    var saveButton = document.getElementById("student-project-save");
    if (saveButton) saveButton.textContent = "Add project";
    var clearButton = document.getElementById("student-project-clear");
    if (clearButton) clearButton.textContent = "Clear";
    setStudentProjectMessage("");
  }

  function setGitHubRepositoryStatus(message, isError) {
    var status = document.getElementById("student-github-status");
    if (status) status.textContent = message || "";
    if (status) status.setAttribute("data-error", isError ? "true" : "false");
  }

  function clearGitHubRepositoryForm() {
    ["student-github-repository-url", "student-github-repository-name", "student-github-repository-description", "student-github-repository-project", "student-github-repository-skill"].forEach(function (id) {
      var element = document.getElementById(id);
      if (element) element.value = "";
    });
    studentGitHubRepositoryDraftId = "";
    setGitHubRepositoryStatus("");
    populateGitHubRepositoryAssociationFields(normalizeStudentProfile(readDemoProfile()));
  }

  function fetchGitHubRepositoryMetadata(repoUrl) {
    var parsed = normalizeGitHubRepositoryUrl(repoUrl);
    if (!parsed) {
      return Promise.resolve({ ok: false, message: "Use a valid public GitHub repository URL such as https://github.com/owner/repo." });
    }
    var apiUrl = "https://api.github.com/repos/" + encodeURIComponent(parsed.owner) + "/" + encodeURIComponent(parsed.repo);
    return fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }).then(function (response) {
      if (response.status === 403) {
        throw new Error("GitHub rate limit reached while loading public repository metadata. You can still save the repository URL manually.");
      }
      if (response.status === 404) {
        throw new Error("This public repository could not be found or may have been deleted.");
      }
      if (!response.ok) {
        throw new Error("GitHub is currently unavailable. You can still save the public repository URL manually.");
      }
      return response.json();
    }).then(function (data) {
      return {
        ok: true,
        entry: {
          name: String(data.name || parsed.repo).trim(),
          fullName: String(data.full_name || parsed.fullName).trim(),
          description: String(data.description || "").trim(),
          language: String(data.language || "").trim(),
          topics: Array.isArray(data.topics) ? data.topics.map(function (topic) { return String(topic || "").trim(); }).filter(Boolean).slice(0, 8) : [],
          url: String(data.html_url || parsed.url).trim(),
          source: "api",
          fetchedAt: new Date().toISOString()
        }
      };
    }).catch(function (error) {
      return { ok: false, message: error && error.message ? error.message : "This public repository could not be loaded from GitHub right now." };
    });
  }

  function renderGitHubRepositoryList() {
    var list = document.getElementById("student-github-repository-list");
    if (!list) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    if (!profile.githubRepositories.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No public repositories linked yet</h3><p>Add a valid public GitHub repository to showcase your work and connect it to a project or skill.</p></li>';
      return;
    }
    list.innerHTML = profile.githubRepositories.map(function (repo) {
      var association = [];
      if (repo.projectId) {
        var linkedProject = profile.projects.find(function (project) { return project.id === repo.projectId; });
        if (linkedProject) association.push('Project: ' + escapeHtml(linkedProject.title));
      }
      if (repo.skillIds && repo.skillIds.length) {
        var skillNames = repo.skillIds.map(function (skillId) {
          var matched = profile.skills.find(function (skill) { return skill.id === skillId; });
          return matched ? matched.name : "";
        }).filter(Boolean);
        if (skillNames.length) association.push('Skill: ' + escapeHtml(skillNames.join(", ")));
      }
      var topics = repo.topics.length ? '<span class="student-evidence">Topics: ' + escapeHtml(repo.topics.join(", ")) + '</span>' : '<span class="student-evidence">Topics: not supplied</span>';
      var language = repo.language ? '<span class="student-evidence">Language: ' + escapeHtml(repo.language) + '</span>' : '<span class="student-evidence">Language: not supplied</span>';
      var metadataFlag = repo.source === "api" ? '<span class="student-evidence">API-fetched public metadata</span>' : '<span class="student-evidence">Student-provided public metadata</span>';
      return '<li class="student-project-item"><div class="student-project-item__meta"><strong><a class="link" href="' + escapeHtml(repo.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(repo.name || repo.fullName) + '</a></strong>' +
        (repo.description ? '<span class="student-evidence">' + escapeHtml(repo.description) + '</span>' : '<span class="student-evidence">No description supplied.</span>') +
        language + topics + metadataFlag + (association.length ? '<span class="student-evidence">' + escapeHtml(association.join(" · ")) + '</span>' : '') +
        '</div><div class="student-project-item__actions"><button class="btn btn--text" type="button" data-student-github-repository-edit="' + escapeHtml(repo.id) + '">Edit</button><button class="btn btn--text" type="button" data-student-github-repository-delete="' + escapeHtml(repo.id) + '">Remove</button></div></li>';
    }).join("");
  }

  function saveGitHubRepositoryToProfile() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var repoUrl = document.getElementById("student-github-repository-url").value.trim();
    var repoName = document.getElementById("student-github-repository-name").value.trim();
    var repoDescription = document.getElementById("student-github-repository-description").value.trim();
    var repoProjectId = document.getElementById("student-github-repository-project").value;
    var repoSkillId = document.getElementById("student-github-repository-skill").value;
    var parsed = normalizeGitHubRepositoryUrl(repoUrl);
    if (!parsed) {
      setGitHubRepositoryStatus("Use a valid public GitHub repository URL such as https://github.com/owner/repo.", true);
      return;
    }
    var duplicate = profile.githubRepositories.find(function (item) {
      return item.id !== studentGitHubRepositoryDraftId && item.url.toLowerCase() === parsed.url.toLowerCase();
    });
    if (duplicate) {
      setGitHubRepositoryStatus("That repository is already linked to this profile.", true);
      return;
    }
    var baseEntry = {
      id: studentGitHubRepositoryDraftId || ("github_repo_" + Date.now() + Math.random().toString(16).slice(2)),
      name: repoName || parsed.repo,
      fullName: parsed.fullName,
      description: repoDescription,
      url: parsed.url,
      language: "",
      topics: [],
      projectId: repoProjectId || "",
      skillIds: repoSkillId ? [repoSkillId] : [],
      source: "manual",
      fetchedAt: ""
    };
    var existingIndex = profile.githubRepositories.findIndex(function (item) { return item.id === studentGitHubRepositoryDraftId; });
    if (existingIndex >= 0) {
      profile.githubRepositories[existingIndex] = Object.assign({}, profile.githubRepositories[existingIndex], baseEntry, { id: studentGitHubRepositoryDraftId });
    } else {
      profile.githubRepositories.push(baseEntry);
    }
    var currentProfile = readDemoProfile();
    currentProfile.githubRepositories = profile.githubRepositories;
    currentProfile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(currentProfile)) {
      setGitHubRepositoryStatus("Could not save the GitHub repository in this browser. Check local storage settings and try again.", true);
      return;
    }
    clearGitHubRepositoryForm();
    renderGitHubRepositoryList();
    renderStudentDashboard();
    setGitHubRepositoryStatus("Repository saved to your public portfolio. It remains self-reported until a reviewer marks it otherwise.", false);
  }

  function editGitHubRepositoryEntry(repositoryId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var repository = profile.githubRepositories.find(function (item) { return item.id === repositoryId; });
    if (!repository) return;
    document.getElementById("student-github-repository-url").value = repository.url || "";
    document.getElementById("student-github-repository-name").value = repository.name || "";
    document.getElementById("student-github-repository-description").value = repository.description || "";
    document.getElementById("student-github-repository-project").value = repository.projectId || "";
    document.getElementById("student-github-repository-skill").value = repository.skillIds && repository.skillIds.length ? repository.skillIds[0] : "";
    studentGitHubRepositoryDraftId = repositoryId;
    setGitHubRepositoryStatus("Editing repository. Save your changes or clear the form to cancel.", false);
  }

  function deleteGitHubRepositoryEntry(repositoryId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var repository = profile.githubRepositories.find(function (item) { return item.id === repositoryId; });
    if (!repository || !window.confirm("Remove the public repository \"" + repository.name + "\" from your portfolio?")) return;
    profile.githubRepositories = profile.githubRepositories.filter(function (item) { return item.id !== repositoryId; });
    var currentProfile = readDemoProfile();
    currentProfile.githubRepositories = profile.githubRepositories;
    currentProfile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(currentProfile)) {
      setGitHubRepositoryStatus("Could not remove this repository in this browser. Check local storage settings and try again.", true);
      return;
    }
    clearGitHubRepositoryForm();
    renderGitHubRepositoryList();
    renderStudentDashboard();
    setGitHubRepositoryStatus("Repository removed from your public portfolio.", false);
  }

  function setStudentProjectMessage(message, isError) {
    var messageEl = document.getElementById("student-project-error");
    if (messageEl) {
      messageEl.textContent = message || "";
      messageEl.classList.toggle("field-error", !!(message && isError));
      messageEl.classList.toggle("auth-status", !(message && isError));
    }
  }

  function skillVerificationExplanation(status) {
    return {
      "Self-Reported": "This skill is included in the profile without a submitted link, project evidence, or reviewer review. It is not treated as independently verified.",
      "Evidence Submitted": "A link, project detail, or portfolio reference was added. This remains a student-submitted claim until a reviewer marks it under review or verified.",
      "Under Review": "A local reviewer has opened this evidence for inspection. This state means the item has been reviewed in the demo process, not that it is automatically proven.",
      "Verified": "A reviewer explicitly marked this skill as verified in the local demo workflow. It is still separate from other self-reported skills and can be reviewed again with new evidence.",
      "Rejected / More Evidence Needed": "A reviewer asked for more supporting material or rejected the current evidence. The skill remains in the profile but requires additional context or a clearer example."
    }[status] || "This skill is stored in the browser-local profile and is not automatically trusted or verified.";
  }

  function getSkillVerificationClass(status) {
    return status === "Verified" ? "verified" : status === "Under Review" ? "under-review" : status === "Rejected / More Evidence Needed" ? "rejected" : "self-reported";
  }

  function renderSkillVerificationTag(status) {
    var safeStatus = status || "Self-Reported";
    return '<span class="student-skill-status student-skill-status--' + escapeHtml(getSkillVerificationClass(safeStatus)) + '">' + escapeHtml(safeStatus) + '</span>';
  }

  function populateSkillEvidenceSelect() {
    var select = document.getElementById("student-skill-evidence-skill");
    if (!select) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    var currentValue = select.value;
    if (!profile.skills.length) {
      select.innerHTML = '<option value="">No skills saved yet</option>';
      return;
    }
    select.innerHTML = '<option value="">Choose a skill</option>' + profile.skills.map(function (skill) {
      return '<option value="' + escapeHtml(skill.id) + '">' + escapeHtml(skill.name) + '</option>';
    }).join("");
    if (currentValue && profile.skills.some(function (skill) { return skill.id === currentValue; })) {
      select.value = currentValue;
    }
  }

  function setSkillEvidenceMessage(message, isError) {
    var el = document.getElementById("student-skill-evidence-status");
    if (el) el.textContent = message || "";
    if (el) el.classList.toggle("field-error", !!(message && isError));
    if (el) el.classList.toggle("auth-status", !(message && isError));
  }

  function clearSkillEvidenceForm() {
    var skillSelect = document.getElementById("student-skill-evidence-skill");
    var typeSelect = document.getElementById("student-skill-evidence-type");
    var urlInput = document.getElementById("student-skill-evidence-url");
    var descriptionInput = document.getElementById("student-skill-evidence-description");
    if (skillSelect) skillSelect.value = "";
    if (typeSelect) typeSelect.value = "project";
    if (urlInput) urlInput.value = "";
    if (descriptionInput) descriptionInput.value = "";
    setSkillEvidenceMessage("");
    renderStudentSkillEvidenceList();
  }

  function renderStudentSkillEvidenceList() {
    var list = document.getElementById("student-skill-evidence-list");
    if (!list) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    var skillId = document.getElementById("student-skill-evidence-skill") ? document.getElementById("student-skill-evidence-skill").value : "";
    if (!skillId) {
      list.innerHTML = '<li class="empty--compact"><h3>No skill selected</h3><p>Select a saved skill to add or review evidence.</p></li>';
      return;
    }
    var skill = profile.skills.find(function (item) { return item.id === skillId; });
    if (!skill) {
      list.innerHTML = '<li class="empty--compact"><h3>Skill not found</h3><p>Please choose a different saved skill.</p></li>';
      return;
    }
    var evidenceItems = Array.isArray(skill.evidenceItems) ? skill.evidenceItems : [];
    if (!evidenceItems.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No evidence submitted yet</h3><p>Add a repository, portfolio, project link, or a short description for this skill.</p></li>';
      return;
    }
    list.innerHTML = evidenceItems.map(function (entry) {
      var evidenceText = entry.description ? escapeHtml(entry.description) : 'No description supplied.';
      var urlHtml = entry.url ? '<a class="link" href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener noreferrer">Open evidence link</a>' : "";
      return '<li class="student-item student-skill-evidence-entry"><div><strong>' + escapeHtml(entry.label || "Evidence") + '</strong><span class="student-item__meta">Status: ' + escapeHtml(skill.verificationStatus || "Self-Reported") + '</span>' +
        '<span class="student-item__meta">' + evidenceText + '</span>' +
        (entry.url ? '<span class="student-item__meta">' + urlHtml + '</span>' : '') +
        (entry.reviewFeedback ? '<span class="student-item__meta">Reviewer feedback: ' + escapeHtml(entry.reviewFeedback) + '</span>' : '') +
        '</div><div class="student-skill-item__actions"><button class="btn btn--text" type="button" data-student-skill-evidence-edit="' + escapeHtml(skill.id) + '" data-student-skill-evidence-item="' + escapeHtml(entry.id) + '">Edit</button>' +
        '<button class="btn btn--text" type="button" data-student-skill-evidence-delete="' + escapeHtml(skill.id) + '" data-student-skill-evidence-item="' + escapeHtml(entry.id) + '">Remove</button></div></li>';
    }).join("");
  }

  function renderStudentSkillEditor() {
    var list = document.getElementById("student-skill-list");
    if (!list) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    if (!profile.skills.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No skills added yet</h3><p>List the skills you want employers to see.</p></li>';
      populateSkillEvidenceSelect();
      renderStudentSkillEvidenceList();
      return;
    }

    list.innerHTML = profile.skills.map(function (skill) {
      var levelText = skill.level ? '<span class="student-evidence">Level: ' + escapeHtml(skill.level) + '</span>' : '<span class="student-evidence">Level: Not set</span>';
      var evidence = skill.evidence === "project-linked" ? "Project-linked" : "Self-declared";
      var linkedProject = skill.projectId ? ' • linked to ' + escapeHtml(studentProjectNameById(skill.projectId)) : "";
      var evidenceCount = Array.isArray(skill.evidenceItems) ? skill.evidenceItems.length : 0;
      var verificationText = skill.verificationStatus || "Self-Reported";
      return '<li class="student-skill-item">' +
        '<div class="student-skill-item__meta">' +
          '<strong>' + escapeHtml(skill.name) + '</strong>' +
          (skill.level ? levelText : "") +
          '<span class="student-evidence">Verification status: ' + escapeHtml(verificationText) + '</span>' +
          '<span class="student-evidence">Evidence: ' + escapeHtml(evidence) + ' · ' + evidenceCount + ' item(s)' + linkedProject + '</span>' +
          (Array.isArray(skill.evidenceItems) && skill.evidenceItems.length ? '<span class="student-evidence">' + escapeHtml(skillVerificationExplanation(verificationText)) + '</span>' : '') +
        '</div>' +
        '<div class="student-skill-item__actions">' +
          '<button class="btn btn--text" type="button" data-student-skill-edit="' + escapeHtml(skill.id) + '" aria-label="Edit skill ' + escapeHtml(skill.name) + '">Edit</button>' +
          '<button class="btn btn--text" type="button" data-student-skill-evidence-edit="' + escapeHtml(skill.id) + '" aria-label="Manage evidence for ' + escapeHtml(skill.name) + '">Evidence</button>' +
          '<button class="btn btn--text" type="button" data-student-skill-delete="' + escapeHtml(skill.id) + '" aria-label="Remove skill ' + escapeHtml(skill.name) + '">Remove</button>' +
        '</div>' +
      '</li>';
    }).join("");
    populateSkillEvidenceSelect();
    renderStudentSkillEvidenceList();
  }

  function validateSkillEvidenceForm(skillId, type, url, description) {
    if (!skillId) return "Select a saved skill before adding evidence.";
    if (!url && !description.trim()) return "Add a link, a project reference, or a short description before saving evidence.";
    if (url && !isHttpUrl(url)) return "Use a valid http(s) URL for the evidence link.";
    if (type === "github" && url && !/github\.com\//i.test(url)) {
      return "GitHub evidence should point to a GitHub repository or profile URL.";
    }
    if (type === "portfolio" && url && !/portfolio|behance|dribbble|medium|dev\.to|notion|linkedin|github/i.test(url)) {
      return "Portfolio evidence should be a web URL for a portfolio, project, or public work sample.";
    }
    if (description && description.length > 1400) return "Evidence descriptions should be shorter than 1400 characters.";
    return "";
  }

  function saveSkillEvidenceToProfile() {
    var skillSelect = document.getElementById("student-skill-evidence-skill");
    var typeSelect = document.getElementById("student-skill-evidence-type");
    var urlInput = document.getElementById("student-skill-evidence-url");
    var descriptionInput = document.getElementById("student-skill-evidence-description");
    if (!skillSelect || !typeSelect || !urlInput || !descriptionInput) return;
    var skillId = skillSelect.value;
    var evidenceType = typeSelect.value || "project";
    var url = urlInput.value.trim();
    var description = descriptionInput.value.trim();
    var error = validateSkillEvidenceForm(skillId, evidenceType, url, description);
    if (error) {
      setSkillEvidenceMessage(error, true);
      return;
    }
    var profile = normalizeStudentProfile(readDemoProfile());
    var skill = profile.skills.find(function (item) { return item.id === skillId; });
    if (!skill) {
      setSkillEvidenceMessage("That skill is no longer available in this profile.", true);
      return;
    }
    var evidenceEntry = {
      id: "skill_evidence_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type: evidenceType,
      label: evidenceType === "github" ? "GitHub repository" : evidenceType === "portfolio" ? "Portfolio" : evidenceType === "project" ? "Project link" : "External evidence",
      url: url,
      description: description,
      submittedAt: new Date().toISOString(),
      reviewedAt: "",
      reviewStatus: "Evidence Submitted",
      reviewFeedback: ""
    };
    var evidenceEntryId = document.getElementById("student-skill-evidence-item") ? document.getElementById("student-skill-evidence-item").value : "";
    if (evidenceEntryId) {
      var existingEntry = skill.evidenceItems.find(function (item) { return item.id === evidenceEntryId; });
      if (existingEntry) {
        evidenceEntry = {
          id: existingEntry.id,
          type: evidenceType,
          label: evidenceEntry.label,
          url: url,
          description: description,
          submittedAt: existingEntry.submittedAt || new Date().toISOString(),
          reviewedAt: existingEntry.reviewedAt || "",
          reviewStatus: existingEntry.reviewStatus || "Evidence Submitted",
          reviewFeedback: existingEntry.reviewFeedback || ""
        };
      }
    }
    skill.evidenceItems = Array.isArray(skill.evidenceItems) ? skill.evidenceItems.filter(function (item) { return item.id !== evidenceEntry.id; }) : [];
    skill.evidenceItems.push(evidenceEntry);
    skill.submittedAt = skill.submittedAt || new Date().toISOString();
    skill.verificationStatus = "Evidence Submitted";
    skill.reviewFeedback = "";
    skill.reviewedAt = "";
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      setSkillEvidenceMessage("Could not save this evidence in this browser. Check local storage settings and try again.", true);
      return;
    }
    setStudentStatus("Skill evidence saved in this browser-local profile. Review status remains pending until a reviewer updates it.");
    setSkillEvidenceMessage("Evidence saved. It will appear as Evidence Submitted until a reviewer updates its status.", false);
    clearSkillEvidenceForm();
    renderStudentSkillEditor();
  }

  function removeSkillEvidenceEntry(skillId, evidenceId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var skill = profile.skills.find(function (item) { return item.id === skillId; });
    if (!skill) return;
    skill.evidenceItems = Array.isArray(skill.evidenceItems) ? skill.evidenceItems.filter(function (entry) { return entry.id !== evidenceId; }) : [];
    skill.verificationStatus = skill.evidenceItems.length ? "Evidence Submitted" : "Self-Reported";
    if (!skill.evidenceItems.length) {
      skill.reviewFeedback = "";
      skill.reviewedAt = "";
    }
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      setSkillEvidenceMessage("Could not remove this evidence in this browser. Check local storage settings and try again.", true);
      return;
    }
    setStudentStatus("Evidence removed from this skill in the browser-local profile.");
    clearSkillEvidenceForm();
    renderStudentSkillEditor();
  }

  function editSkillEvidenceEntry(skillId, evidenceId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var skill = profile.skills.find(function (item) { return item.id === skillId; });
    if (!skill) return;
    var entry = Array.isArray(skill.evidenceItems) ? skill.evidenceItems.find(function (item) { return item.id === evidenceId; }) : null;
    if (!entry) return;
    var skillSelect = document.getElementById("student-skill-evidence-skill");
    var typeSelect = document.getElementById("student-skill-evidence-type");
    var urlInput = document.getElementById("student-skill-evidence-url");
    var descriptionInput = document.getElementById("student-skill-evidence-description");
    var itemInput = document.getElementById("student-skill-evidence-item");
    if (skillSelect) skillSelect.value = skillId;
    if (typeSelect) typeSelect.value = entry.type || "project";
    if (urlInput) urlInput.value = entry.url || "";
    if (descriptionInput) descriptionInput.value = entry.description || "";
    if (itemInput) itemInput.value = entry.id;
    setSkillEvidenceMessage("Editing evidence for " + skill.name + ". Save or clear to cancel.", false);
    renderStudentSkillEvidenceList();
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
      var hasDefense = profile.defenseSessions.some(function (session) { return session.projectId === project.id && session.status === "completed"; });
      var readyForDefense = !!(project.description && project.technologies && project.role);
      var links = [];
      if (project.githubUrl && isHttpUrl(project.githubUrl)) links.push('<a class="link" href="' + escapeHtml(project.githubUrl) + '" target="_blank" rel="noopener noreferrer">Repository link provided</a>');
      if (project.liveDemoUrl && isHttpUrl(project.liveDemoUrl)) links.push('<a class="link" href="' + escapeHtml(project.liveDemoUrl) + '" target="_blank" rel="noopener noreferrer">Live demo</a>');
      return '<li class="student-project-item">' +
        '<div class="student-project-item__meta">' +
          '<strong>' + escapeHtml(project.title) + '</strong>' +
          '<span class="student-evidence">' + escapeHtml(project.description || "No description provided") + '</span>' +
          technologies +
          roleText +
          '<span class="student-evidence">Project added by student</span>' +
          (hasDefense ? '<span class="student-evidence">Assessment completed · not independent skill verification</span>' : '') +
          (links.length ? '<div class="student-project-item__links">' + links.join("") + '</div>' : '') +
        '</div>' +
        '<div class="student-project-item__actions">' +
          '<button class="btn btn--secondary" type="button" data-student-project-defense="' + escapeHtml(project.id) + '"' + (readyForDefense ? '' : ' disabled title="Add a description, technologies and role before preparing a defense"') + '>Prepare defense</button>' +
          '<button class="btn btn--text" type="button" data-student-project-edit="' + escapeHtml(project.id) + '" aria-label="Edit project ' + escapeHtml(project.title) + '">Edit</button>' +
          '<button class="btn btn--text" type="button" data-student-project-delete="' + escapeHtml(project.id) + '" aria-label="Delete project ' + escapeHtml(project.title) + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join("");
  }

  function buildDefenseQuestions(project) {
    var description = project.description.trim().replace(/\s+/g, " ").slice(0, 140);
    var technologies = project.technologies.split(/[,;|]/).map(function (technology) { return technology.trim(); }).filter(Boolean).slice(0, 4).join(", ") || project.technologies;
    var role = project.role.trim().replace(/\s+/g, " ").slice(0, 120);
    var repoContext = project.githubUrl && isHttpUrl(project.githubUrl)
      ? "A repository link is listed (" + new URL(project.githubUrl).hostname + "); NEXORA has not inspected it."
      : "No repository link is listed.";
    return [
      { category: "Project purpose and problem solved", text: "What problem did this project aim to solve, who was it for, and what outcome would make it successful? Use your saved summary (\"" + description + (description.length >= 140 ? "…" : "") + "\") to frame the answer." },
      { category: "Architecture", text: "Based on your project summary (\"" + description + (description.length >= 140 ? "…" : "") + "\"), how did you structure its main components and how do they work together?" },
      { category: "Implementation choices", text: "You listed " + technologies + ". Why were these technologies appropriate for this project, and what did you implement with them?" },
      { category: "Technical challenge", text: "What was a significant technical challenge in this project, and how did you approach solving it?" },
      { category: "Debugging", text: "Describe a bug or unexpected behavior you encountered, how you investigated it, and what evidence showed your fix worked. " + repoContext },
      { category: "Individual contribution", text: "Your saved role is \"" + role + "\". Which specific parts did you personally complete, and how would you explain your contribution to a reviewer?" }
    ];
  }

  function summarizeDefenseSession(session) {
    var answered = session.questions.filter(function (question) { return question.answer.trim(); });
    var detailed = answered.filter(function (question) { return question.answer.trim().split(/\s+/).length >= 20; });
    return {
      answeredCount: answered.length,
      strengths: [
        "You submitted responses for " + answered.length + " of " + session.questions.length + " prompts.",
        detailed.length
          ? detailed.length + " response(s) included at least 20 words of explanation."
          : "No response reached the simple 20-word detail indicator; consider adding more explanation where useful."
      ],
      unanswered: session.questions.filter(function (question) { return !question.answer.trim(); }).map(function (question) { return question.category; }),
      reviewTopics: session.questions.filter(function (question) { return !question.answer.trim(); }).map(function (question) { return question.category; }).length
        ? session.questions.filter(function (question) { return !question.answer.trim(); }).map(function (question) { return "Prepare an explanation for " + question.category.toLowerCase() + "."; })
        : ["Consider practicing with concrete examples, decisions, and evidence from your own work."]
    };
  }

  function saveDefenseProfile(profile, statusMessage) {
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      var status = document.getElementById("student-defense-status");
      if (status) status.textContent = "Could not save the assessment in this browser. Check browser storage and try again.";
      return false;
    }
    renderStudentProjectEditor();
    renderStudentDefense();
    if (typeof renderRecruiterApplicants === "function") renderRecruiterApplicants(getCurrentRecruiterListings());
    var message = document.getElementById("student-defense-status");
    if (message && statusMessage) message.textContent = statusMessage;
    return true;
  }

  function defenseSessionById(profile, id) {
    return profile.defenseSessions.find(function (session) { return session.id === id; }) || null;
  }

  function renderStudentDefense() {
    var picker = document.getElementById("student-defense-project");
    var historyList = document.getElementById("student-defense-history-list");
    var activePanel = document.getElementById("student-defense-active");
    var reviewPanel = document.getElementById("student-defense-review");
    var resultPanel = document.getElementById("student-defense-result");
    if (!picker || !historyList || !activePanel || !reviewPanel || !resultPanel) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    var previousValue = picker.value;
    picker.innerHTML = '<option value="">Select a project</option>' + profile.projects.map(function (project) {
      var ready = !!(project.description && project.technologies && project.role);
      return '<option value="' + escapeHtml(project.id) + '"' + (ready ? '' : ' disabled') + '>' + escapeHtml(project.title) + (ready ? '' : ' (add description, technologies and role)') + '</option>';
    }).join("");
    if (profile.projects.some(function (project) { return project.id === previousValue; })) picker.value = previousValue;
    historyList.innerHTML = profile.defenseSessions.length ? profile.defenseSessions.slice().reverse().map(function (session) {
      var completedTime = Date.parse(session.completedAt);
      var completedDate = session.completedAt && isFinite(completedTime) ? new Date(completedTime).toLocaleDateString() : "";
      return '<li class="defense-history-item"><div><strong>' + escapeHtml(session.project.title || "Untitled project") + '</strong>' +
        '<span class="student-item__meta">' + (session.status === "completed" ? "Assessment completed" : "In progress") +
        (completedDate ? " · " + escapeHtml(completedDate) : "") +
        (session.shareWithRecruiters ? " · Shared with recruiters in this browser" : " · Private") + '</span></div>' +
        '<button class="btn btn--text" type="button" data-defense-open="' + escapeHtml(session.id) + '">' + (session.status === "completed" ? "Review" : "Continue") + '</button></li>';
    }).join("") : '<li class="empty--compact"><p>No saved defense sessions yet. Choose a complete project above to begin.</p></li>';

    var session = defenseSessionById(profile, activeDefenseSessionId);
    if (!session && profile.defenseSessions.length) {
      session = profile.defenseSessions[profile.defenseSessions.length - 1];
      activeDefenseSessionId = session.id;
    }
    activePanel.hidden = true;
    reviewPanel.hidden = true;
    resultPanel.hidden = true;
    if (!session) return;
    if (session.status === "completed") {
      renderDefenseResult(session);
      resultPanel.hidden = false;
      return;
    }
    if (session.currentIndex >= session.questions.length) {
      renderDefenseReview(session);
      reviewPanel.hidden = false;
      return;
    }
    var question = session.questions[session.currentIndex];
    document.getElementById("student-defense-progress").textContent = "Question " + (session.currentIndex + 1) + " of " + session.questions.length + " · " + question.category;
    document.getElementById("student-defense-question-title").textContent = question.text;
    document.getElementById("student-defense-answer").value = question.answer;
    document.getElementById("student-defense-project-context").textContent = "Selected project: " + (session.project.title || "Project details saved at session start") + ". Project information and links are student-provided; repository contents were not inspected.";
    activePanel.hidden = false;
  }

  function renderDefenseReview(session) {
    var list = document.getElementById("student-defense-review-list");
    list.innerHTML = session.questions.map(function (question) {
      return '<li><strong>' + escapeHtml(question.category) + '</strong><p>' + escapeHtml(question.text) + '</p><p>' + escapeHtml(question.answer.trim() || "No response submitted.") + '</p></li>';
    }).join("");
  }

  function renderDefenseResult(session) {
    var result = summarizeDefenseSession(session);
    document.getElementById("student-defense-strengths").innerHTML = result.strengths.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
    document.getElementById("student-defense-unanswered").innerHTML = result.unanswered.length
      ? result.unanswered.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("")
      : "<li>All prompts received a response.</li>";
    document.getElementById("student-defense-review-topics").innerHTML = result.reviewTopics.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
    var share = document.getElementById("student-defense-share");
    share.checked = session.shareWithRecruiters;
    share.setAttribute("aria-describedby", "student-defense-result-disclaimer");
  }

  function startStudentDefense(projectId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var project = profile.projects.find(function (item) { return item.id === projectId; });
    var status = document.getElementById("student-defense-status");
    if (!project || !project.description || !project.technologies || !project.role) {
      if (status) status.textContent = "Choose a saved project with a description, technologies, and your role before starting.";
      return;
    }
    var existing = profile.defenseSessions.slice().reverse().find(function (item) {
      return item.projectId === project.id && item.status === "in-progress";
    });
    if (existing) {
      activeDefenseSessionId = existing.id;
      renderStudentDefense();
      return;
    }
    var sessionId = "defense_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    var session = {
      id: sessionId,
      projectId: project.id,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        technologies: project.technologies,
        role: project.role,
        githubUrl: project.githubUrl,
        liveDemoUrl: project.liveDemoUrl
      },
      questions: buildDefenseQuestions(project).map(function (question) {
        return { category: question.category, text: question.text, answer: "" };
      }),
      currentIndex: 0,
      status: "in-progress",
      startedAt: new Date().toISOString(),
      completedAt: "",
      shareWithRecruiters: false,
      result: { strengths: [], unanswered: [], reviewTopics: [], answeredCount: 0 }
    };
    profile.defenseSessions.push(session);
    activeDefenseSessionId = session.id;
    saveDefenseProfile(profile, "Project Defense started. Your draft is saved in this browser.");
  }

  function saveDefenseAnswer(skip) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var session = defenseSessionById(profile, activeDefenseSessionId);
    if (!session || session.status !== "in-progress") return;
    if (!skip) session.questions[session.currentIndex].answer = document.getElementById("student-defense-answer").value.slice(0, 3000);
    session.currentIndex = Math.min(session.currentIndex + 1, session.questions.length);
    saveDefenseProfile(profile, session.currentIndex === session.questions.length
      ? "All questions are ready for review. Review answers before finishing."
      : "Response saved in this browser.");
  }

  function finishStudentDefense() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var session = defenseSessionById(profile, activeDefenseSessionId);
    if (!session || session.status !== "in-progress" || session.currentIndex < session.questions.length) return;
    session.status = "completed";
    session.completedAt = new Date().toISOString();
    session.shareWithRecruiters = false;
    session.result = summarizeDefenseSession(session);
    saveDefenseProfile(profile, "Assessment completed and saved privately in this browser. You can opt in to sharing below.");
  }

  function setDefenseSharing(share) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var session = defenseSessionById(profile, activeDefenseSessionId);
    if (!session || session.status !== "completed") return;
    session.shareWithRecruiters = share === true;
    saveDefenseProfile(profile, session.shareWithRecruiters
      ? "This completed session is now available in the local recruiter demo for your linked profile."
      : "Sharing is turned off. Recruiters will no longer see this session in the local demo.");
  }

  function restartStudentDefense() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var session = defenseSessionById(profile, activeDefenseSessionId);
    if (!session) return;
    if (!window.confirm("Restart this session? Its current answers will be cleared.")) return;
    session.questions.forEach(function (question) { question.answer = ""; });
    session.currentIndex = 0;
    session.status = "in-progress";
    session.startedAt = new Date().toISOString();
    session.completedAt = "";
    session.shareWithRecruiters = false;
    session.result = { strengths: [], unanswered: [], reviewTopics: [], answeredCount: 0 };
    saveDefenseProfile(profile, "Session restarted. Answers cleared and session saved.");
  }

  var skillGapTemplates = {
    "Frontend Developer": ["HTML", "CSS", "JavaScript", "Responsive design", "Accessibility", "Git"],
    "Backend Developer": ["Programming fundamentals", "API design", "Databases", "Authentication concepts", "Testing", "Git"],
    "Full-Stack Developer": ["HTML", "CSS", "JavaScript", "API design", "Databases", "Testing", "Git"],
    "Data Analyst": ["SQL", "Spreadsheets", "Data cleaning", "Data visualization", "Statistics", "Python"],
    "AI/ML Engineer": ["Python", "Linear algebra", "Statistics", "Data preparation", "Machine learning fundamentals", "Model evaluation"],
    "Cybersecurity Analyst": ["Networking fundamentals", "Linux", "Security fundamentals", "Log analysis", "Risk assessment", "Scripting"]
  };
  var skillGapRoadmapEditing = false;

  function uniqueSkillNames(values) {
    var seen = Object.create(null);
    return values.map(function (value) { return String(value || "").trim(); }).filter(function (value) {
      var key = value.toLowerCase().replace(/\s+/g, " ");
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function skillGapJobs() {
    return Array.isArray(allJobs) ? allJobs.filter(function (job) {
      return job && job.title && job.company;
    }) : [];
  }

  function updateSkillGapModeFields() {
    var mode = document.getElementById("skill-gap-mode");
    if (!mode) return;
    var isJob = mode.value === "job";
    document.getElementById("skill-gap-role-field").hidden = isJob;
    document.getElementById("skill-gap-custom-field").hidden = isJob || document.getElementById("skill-gap-role").value !== "custom";
    document.getElementById("skill-gap-job-field").hidden = !isJob;
    document.getElementById("skill-gap-template-field").hidden = isJob;
  }

  function fillSkillGapJobOptions(selectedId) {
    var select = document.getElementById("skill-gap-job");
    if (!select) return;
    var jobs = skillGapJobs();
    select.innerHTML = '<option value="">Choose an active listing</option>' + jobs.map(function (job) {
      return '<option value="' + escapeHtml(String(job.id)) + '">' + escapeHtml(job.title + " · " + job.company) + '</option>';
    }).join("");
    if (selectedId && jobs.some(function (job) { return String(job.id) === String(selectedId); })) select.value = String(selectedId);
  }

  function skillGapEvidenceForSkill(skill, profile) {
    var project = skill.projectId ? profile.projects.find(function (item) { return item.id === skill.projectId; }) : null;
    var hasProjectEvidence = skill.evidence === "project-linked";
    var completedDefense = hasProjectEvidence && skill.projectId && profile.defenseSessions.some(function (session) {
      return session.projectId === skill.projectId && session.status === "completed";
    });
    return {
      kind: hasProjectEvidence ? "project-linked" : "self-declared",
      project: project,
      completedDefense: !!completedDefense
    };
  }

  function skillGapPartialMatch(requiredSkill, skills) {
    if (!requiredSkill || !Array.isArray(skills) || !skills.length) return null;
    var requirement = String(requiredSkill || "").trim();
    if (!requirement) return null;
    var requirementKey = requirement.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    var requirementTokens = requirementKey ? requirementKey.split(" ").filter(function (token) { return token.length >= 3; }) : [];
    return skills.find(function (skill) {
      var name = String(skill && skill.name ? skill.name : "").trim();
      if (!name) return false;
      var nameKey = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
      if (!nameKey || requirementKey === nameKey) return false;
      var nameTokens = nameKey.split(" ").filter(function (token) { return token.length >= 3; });
      if (!nameTokens.length || !requirementTokens.length) return false;
      return requirementTokens.some(function (token) { return nameTokens.indexOf(token) !== -1; }) ||
        requirementKey.indexOf(nameKey) !== -1 ||
        nameKey.indexOf(requirementKey) !== -1;
    }) || null;
  }

  function roadmapExerciseForSkill(skillName, profile) {
    var skillLower = skillName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var skillPattern = new RegExp("(^|[^a-z0-9])" + skillLower + "($|[^a-z0-9])", "i");
    var project = profile.projects.find(function (item) {
      var technologyMatches = item.technologies.split(/[,;|]/).some(function (technology) {
        return technology.trim().toLowerCase() === skillName.toLowerCase();
      });
      return technologyMatches || skillPattern.test(item.title + " " + item.description);
    });
    if (project) {
      return {
        projectId: project.id,
        text: "Extend \"" + project.title + "\" with a small feature that uses " + skillName + "; describe and test your contribution."
      };
    }
    return {
      projectId: "",
      text: "Build a small, focused project that uses " + skillName + ", then document your design choice and how you checked the result."
    };
  }

  function createSkillGapRoadmap(gaps, evidenceGaps, profile, targetName) {
    var steps = [];
    gaps.concat(evidenceGaps).forEach(function (skillName, index) {
      if (steps.some(function (step) { return step.skill.toLowerCase() === skillName.toLowerCase(); })) return;
      var exercise = roadmapExerciseForSkill(skillName, profile);
      steps.push({
        id: "roadmap_" + Date.now() + "_" + index + "_" + Math.random().toString(36).slice(2, 5),
        skill: skillName,
        why: gaps.some(function (gap) { return gap.toLowerCase() === skillName.toLowerCase(); })
          ? skillName + " appears in the selected " + targetName + " skill requirements but is not in your saved skills."
          : skillName + " matches the target but is currently self-declared without a project link.",
        exercise: exercise.text,
        projectId: exercise.projectId,
        completed: false
      });
    });
    return steps;
  }

  function analyzeSkillGaps() {
    var mode = document.getElementById("skill-gap-mode").value;
    var profile = normalizeStudentProfile(readDemoProfile());
    var targetName = "";
    var targetJob = null;
    var requiredSkills = [];
    var additionalRequirements = [];
    if (mode === "job") {
      var selectedJobId = document.getElementById("skill-gap-job").value;
      targetJob = skillGapJobs().find(function (job) { return String(job.id) === selectedJobId; }) || null;
      if (!targetJob) {
        document.getElementById("skill-gap-status").textContent = "Choose an available listing before analyzing its recorded requirements.";
        return;
      }
      targetName = targetJob.title + " · " + targetJob.company;
      requiredSkills = uniqueSkillNames(Array.isArray(targetJob.skills) ? targetJob.skills : []);
      var qualifications = Array.isArray(targetJob.qualifications) ? targetJob.qualifications : [];
      additionalRequirements = uniqueSkillNames(qualifications.concat(targetJob.eligibility || []));
    } else {
      var roleChoice = document.getElementById("skill-gap-role").value;
      targetName = roleChoice === "custom" ? document.getElementById("skill-gap-custom-role").value.trim() : roleChoice;
      if (!targetName) {
        document.getElementById("skill-gap-status").textContent = "Enter a target role before analyzing its demo template.";
        return;
      }
      requiredSkills = uniqueSkillNames(document.getElementById("skill-gap-template").value.split(","));
    }
    if (requiredSkills.length > 40) requiredSkills = requiredSkills.slice(0, 40);
    var normalizedSkills = Object.create(null);
    profile.skills.forEach(function (skill) {
      var key = skill.name.toLowerCase().replace(/\s+/g, " ");
      if (!normalizedSkills[key]) normalizedSkills[key] = skill;
    });
    var matching = [];
    var missing = [];
    var projectEvidence = [];
    var moreEvidence = [];
    requiredSkills.forEach(function (required) {
      var skill = normalizedSkills[required.toLowerCase().replace(/\s+/g, " ")];
      if (!skill) {
        missing.push(required);
        return;
      }
      matching.push({ requirement: required, skill: skill, evidence: skillGapEvidenceForSkill(skill, profile) });
      if (skill.evidence === "project-linked") projectEvidence.push({ requirement: required, skill: skill, evidence: skillGapEvidenceForSkill(skill, profile) });
      else moreEvidence.push({ requirement: required, skill: skill, evidence: skillGapEvidenceForSkill(skill, profile) });
    });
    var incomplete = [];
    if (!profile.fullName || !profile.headline) incomplete.push("name or headline is missing");
    if (!profile.skills.length) incomplete.push("no saved skills are available for comparison");
    if (!profile.projects.length) incomplete.push("no projects are available for project-evidence suggestions");
    if (mode === "job" && !requiredSkills.length) incomplete.push("the selected listing has no recorded skill requirements to compare");
    if (mode === "role" && !requiredSkills.length) incomplete.push("the editable demo template has no skills");
    var roadmap = createSkillGapRoadmap(missing, moreEvidence.map(function (item) { return item.requirement; }), profile, targetName);
    var analysis = {
      mode: mode,
      role: mode === "role" ? targetName : "",
      jobId: targetJob ? String(targetJob.id) : "",
      jobTitle: targetJob ? targetJob.title : "",
      requiredSkills: requiredSkills,
      additionalRequirements: additionalRequirements,
      analyzedAt: new Date().toISOString(),
      steps: roadmap
    };
    var rawProfile = readDemoProfile();
    rawProfile.skillGapAnalysis = analysis;
    if (!writeDemoProfile(rawProfile)) {
      document.getElementById("skill-gap-status").textContent = "Could not save this analysis in the browser. Check browser storage and try again.";
      return;
    }
    skillGapRoadmapEditing = false;
    renderSkillGapAnalysis(analysis, profile);
    document.getElementById("skill-gap-status").textContent = "Analysis and a starting roadmap were saved in this browser. Matching uses skill names only.";
  }

  function renderSkillGapAnalysis(analysis, profile) {
    var resultPanel = document.getElementById("skill-gap-results");
    if (!resultPanel) return;
    if (!analysis) {
      resultPanel.hidden = true;
      return;
    }
    var sourceProfile = profile || normalizeStudentProfile(readDemoProfile());
    var jobs = skillGapJobs();
    var targetJob = analysis.mode === "job" ? jobs.find(function (job) { return String(job.id) === analysis.jobId; }) : null;
    var targetName = analysis.mode === "job"
      ? (targetJob ? targetJob.title + " · " + targetJob.company : analysis.jobTitle || "Selected job")
      : analysis.role;
    var requiredSkills = analysis.requiredSkills;
    var skillByName = Object.create(null);
    sourceProfile.skills.forEach(function (skill) {
      var key = skill.name.toLowerCase().replace(/\s+/g, " ");
      if (!skillByName[key]) skillByName[key] = skill;
    });
    var matching = [];
    var missing = [];
    var partial = [];
    var projectEvidence = [];
    var moreEvidence = [];
    requiredSkills.forEach(function (required) {
      var skill = skillByName[required.toLowerCase().replace(/\s+/g, " ")];
      if (skill) {
        var evidence = skillGapEvidenceForSkill(skill, sourceProfile);
        var row = { requirement: required, skill: skill, evidence: evidence };
        matching.push(row);
        if (evidence.kind === "project-linked") projectEvidence.push(row);
        else moreEvidence.push(row);
        return;
      }
      var partialSkill = skillGapPartialMatch(required, sourceProfile.skills);
      if (partialSkill) {
        partial.push({ requirement: required, skill: partialSkill, evidence: skillGapEvidenceForSkill(partialSkill, sourceProfile) });
        return;
      }
      missing.push(required);
    });
    var denominator = requiredSkills.length;
    var readiness = denominator ? Math.round((matching.length / denominator) * 100) : null;
    var incomplete = [];
    if (!sourceProfile.fullName || !sourceProfile.headline) incomplete.push("some profile identity/headline fields are missing");
    if (!sourceProfile.skills.length) incomplete.push("no saved skills were available");
    if (!sourceProfile.projects.length) incomplete.push("no saved projects were available");
    if (!denominator) incomplete.push("the target contains no recorded skills, so readiness cannot be calculated");
    document.getElementById("skill-gap-results").hidden = false;
    document.getElementById("skill-gap-summary-title").textContent = (analysis.mode === "job" ? "Job-specific analysis: " : "Generic role analysis: ") + (targetName || "Target role");
    document.getElementById("skill-gap-readiness").textContent = readiness === null
      ? "Indicative skills-match score: not available"
      : "Indicative skills-match score: " + readiness + "%";
    document.getElementById("skill-gap-readiness-method").textContent = denominator
      ? "Formula: exact case-insensitive skill-name matches ÷ " + denominator + " unique target skills × 100 = " + matching.length + " ÷ " + denominator + " × 100. Partial matches are shown separately and are not added to the score. This is an indicative skills-match score, not a guarantee of employability."
      : "No percentage is shown because the target listing has no recorded skill list.";
    document.getElementById("skill-gap-incomplete").textContent = incomplete.length
      ? "Incomplete comparison: " + incomplete.join("; ") + "."
      : "Comparison uses the profile data currently saved; missing profile fields are not inferred.";
    function renderSkillRows(rows, emptyText, includeEvidence) {
      if (!rows.length) return '<li class="empty--compact">' + escapeHtml(emptyText) + '</li>';
      return rows.map(function (row) {
        return '<li class="student-item"><strong>' + escapeHtml(row.requirement) + '</strong>' +
          (includeEvidence ? (function () {
            var evidence = row.evidence;
            var detail = evidence.kind === "project-linked"
              ? "Project-linked" + (evidence.project ? " · " + evidence.project.title : " · linked project not present")
              : "Self-declared";
            if (evidence.completedDefense) detail += " · Project Defense assessment completed (not independently verified)";
            return '<span class="student-item__meta">Saved as ' + escapeHtml(row.skill.name) + ' · ' + escapeHtml(detail) + '</span>';
          })() : '') +
          '</li>';
      }).join("");
    }
    document.getElementById("skill-gap-matching").innerHTML = renderSkillRows(matching, "No target skills match saved skill names.", true);
    document.getElementById("skill-gap-partial").innerHTML = renderSkillRows(partial, "No partially matched skills were detected with the available profile data.", true);
    document.getElementById("skill-gap-missing").innerHTML = renderSkillRows(missing.map(function (skill) { return { requirement: skill }; }), "No missing target skills by name.", false);
    document.getElementById("skill-gap-evidence").innerHTML = renderSkillRows(projectEvidence, "No matched target skills are currently project-linked.", true);
    document.getElementById("skill-gap-more-evidence").innerHTML = renderSkillRows(moreEvidence, "No matched skills are currently classified as self-declared.", true);
    var additional = analysis.additionalRequirements.length
      ? "Other recorded job requirements (shown separately; not scored as skills): " + analysis.additionalRequirements.join(" · ")
      : analysis.mode === "job" ? "This listing has no additional eligibility/qualification text recorded." : "Generic role template; no separate job requirements apply.";
    document.getElementById("skill-gap-additional-requirements").textContent = additional;
    fillSkillGapJobOptions(analysis.mode === "job" ? analysis.jobId : "");
    document.getElementById("skill-gap-mode").value = analysis.mode;
    document.getElementById("skill-gap-role").value = Object.prototype.hasOwnProperty.call(skillGapTemplates, analysis.role) ? analysis.role : "custom";
    document.getElementById("skill-gap-custom-role").value = document.getElementById("skill-gap-role").value === "custom" ? analysis.role : "";
    document.getElementById("skill-gap-template").value = analysis.mode === "role" ? analysis.requiredSkills.join(", ") : "";
    updateSkillGapModeFields();
    renderSkillGapRoadmap(analysis);
  }

  function renderSkillGapRoadmap(analysis) {
    var list = document.getElementById("skill-gap-roadmap-list");
    if (!list) return;
    var steps = analysis.steps || [];
    document.getElementById("skill-gap-roadmap-empty").hidden = steps.length > 0;
    list.innerHTML = steps.map(function (step, index) {
      if (skillGapRoadmapEditing) {
        return '<li class="roadmap-step roadmap-step--editing" data-roadmap-id="' + escapeHtml(step.id) + '">' +
          '<label class="roadmap-step__complete"><input type="checkbox" data-roadmap-complete="' + escapeHtml(step.id) + '"' + (step.completed ? ' checked' : '') + '> Completed</label>' +
          '<div class="field-group"><label for="roadmap-skill-' + index + '">Skill/topic</label><input class="input" id="roadmap-skill-' + index + '" data-roadmap-skill value="' + escapeHtml(step.skill) + '" maxlength="100"></div>' +
          '<div class="field-group"><label for="roadmap-why-' + index + '">Why it matters</label><input class="input" id="roadmap-why-' + index + '" data-roadmap-why value="' + escapeHtml(step.why) + '" maxlength="240"></div>' +
          '<div class="field-group"><label for="roadmap-exercise-' + index + '">Practical exercise</label><input class="input" id="roadmap-exercise-' + index + '" data-roadmap-exercise value="' + escapeHtml(step.exercise) + '" maxlength="400"></div>' +
          '<button class="btn btn--text" type="button" data-roadmap-delete="' + escapeHtml(step.id) + '">Remove step</button></li>';
      }
      var project = step.projectId ? normalizeStudentProfile(readDemoProfile()).projects.find(function (item) { return item.id === step.projectId; }) : null;
      return '<li class="roadmap-step' + (step.completed ? ' is-complete' : '') + '">' +
        '<label class="roadmap-step__complete"><input type="checkbox" data-roadmap-complete="' + escapeHtml(step.id) + '"' + (step.completed ? ' checked' : '') + '> Mark complete</label>' +
        '<h5>' + escapeHtml(step.skill) + '</h5><p><strong>Why:</strong> ' + escapeHtml(step.why) + '</p>' +
        '<p><strong>Exercise:</strong> ' + escapeHtml(step.exercise) + '</p>' +
        (project ? '<p class="student-item__meta">Suggested existing project: ' + escapeHtml(project.title) + '</p>' : '') +
        '</li>';
    }).join("");
    document.getElementById("skill-gap-edit-roadmap").disabled = skillGapRoadmapEditing;
  }

  function renderSkillGapAnalyzer() {
    var roleSelect = document.getElementById("skill-gap-role");
    var template = document.getElementById("skill-gap-template");
    if (!roleSelect || !template) return;
    fillSkillGapJobOptions();
    var profile = normalizeStudentProfile(readDemoProfile());
    if (profile.skillGapAnalysis) {
      renderSkillGapAnalysis(profile.skillGapAnalysis, profile);
      return;
    }
    template.value = (skillGapTemplates[roleSelect.value] || skillGapTemplates["Frontend Developer"]).join(", ");
    document.getElementById("skill-gap-results").hidden = true;
    updateSkillGapModeFields();
  }

  function saveSkillGapRoadmap(analysis) {
    var profile = readDemoProfile();
    var normalized = normalizeSkillGapAnalysis(analysis);
    if (!normalized) return false;
    profile.skillGapAnalysis = normalized;
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      document.getElementById("skill-gap-status").textContent = "Roadmap could not be saved in this browser. Check browser storage and try again.";
      return false;
    }
    renderSkillGapAnalysis(normalized);
    return true;
  }

  function readEditedRoadmapSteps(analysis) {
    var rows = Array.prototype.slice.call(document.querySelectorAll("#skill-gap-roadmap-list .roadmap-step"));
    var updated = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var skill = row.querySelector("[data-roadmap-skill]").value.trim();
      var why = row.querySelector("[data-roadmap-why]").value.trim();
      var exercise = row.querySelector("[data-roadmap-exercise]").value.trim();
      if (!skill || !why || !exercise) {
        document.getElementById("skill-gap-status").textContent = "Each roadmap step needs a topic, reason, and practical exercise.";
        row.querySelector("[data-roadmap-skill]").focus();
        return null;
      }
      var existing = analysis.steps.find(function (step) { return step.id === row.dataset.roadmapId; });
      if (!existing) continue;
      updated.push({
        id: existing.id,
        skill: skill,
        why: why,
        exercise: exercise,
        projectId: existing.projectId,
        completed: row.querySelector("[data-roadmap-complete]").checked
      });
    }
    return updated;
  }

  function setRoadmapCompletion(stepId, complete) {
    var profile = readDemoProfile();
    var analysis = normalizeSkillGapAnalysis(profile.skillGapAnalysis);
    if (!analysis) return;
    var step = analysis.steps.find(function (item) { return item.id === stepId; });
    if (!step) return;
    step.completed = complete;
    if (saveSkillGapRoadmap(analysis)) {
      document.getElementById("skill-gap-status").textContent = "Roadmap progress saved in this browser.";
    }
  }

  var skillGapModeSelect = document.getElementById("skill-gap-mode");
  if (skillGapModeSelect) skillGapModeSelect.addEventListener("change", updateSkillGapModeFields);
  ["recommendation-type-filter", "recommendation-category-filter", "recommendation-source-filter", "recommendation-sort"].forEach(function (id) {
    var filter = document.getElementById(id);
    if (filter) filter.addEventListener("change", function () {
      renderStudentRecommendations(normalizeStudentProfile(readDemoProfile()));
    });
  });
  var skillGapRoleSelect = document.getElementById("skill-gap-role");
  if (skillGapRoleSelect) skillGapRoleSelect.addEventListener("change", function () {
    var template = document.getElementById("skill-gap-template");
    if (skillGapTemplates[skillGapRoleSelect.value] && template) template.value = skillGapTemplates[skillGapRoleSelect.value].join(", ");
    updateSkillGapModeFields();
  });
  var skillGapAnalyzeButton = document.getElementById("skill-gap-analyze");
  if (skillGapAnalyzeButton) skillGapAnalyzeButton.addEventListener("click", analyzeSkillGaps);
  var skillGapEditButton = document.getElementById("skill-gap-edit-roadmap");
  if (skillGapEditButton) skillGapEditButton.addEventListener("click", function () {
    skillGapRoadmapEditing = true;
    var editor = document.getElementById("skill-gap-roadmap-editor");
    editor.hidden = false;
    renderSkillGapRoadmap(normalizeStudentProfile(readDemoProfile()).skillGapAnalysis);
  });
  var skillGapCancelEditButton = document.getElementById("skill-gap-cancel-roadmap");
  if (skillGapCancelEditButton) skillGapCancelEditButton.addEventListener("click", function () {
    skillGapRoadmapEditing = false;
    document.getElementById("skill-gap-roadmap-editor").hidden = true;
    renderSkillGapAnalyzer();
  });
  var skillGapAddStepButton = document.getElementById("skill-gap-add-step");
  if (skillGapAddStepButton) skillGapAddStepButton.addEventListener("click", function () {
    var skill = document.getElementById("skill-gap-new-topic").value.trim();
    var why = document.getElementById("skill-gap-new-why").value.trim();
    var exercise = document.getElementById("skill-gap-new-exercise").value.trim();
    if (!skill || !why || !exercise) {
      document.getElementById("skill-gap-status").textContent = "Enter a topic, why it matters, and a practical exercise before adding a step.";
      return;
    }
    var profile = readDemoProfile();
    var analysis = normalizeSkillGapAnalysis(profile.skillGapAnalysis);
    if (!analysis || analysis.steps.length >= 30) {
      document.getElementById("skill-gap-status").textContent = analysis ? "A roadmap can contain at most 30 steps." : "Analyze a target before adding roadmap steps.";
      return;
    }
    if (skillGapRoadmapEditing) {
      var editedSteps = readEditedRoadmapSteps(analysis);
      if (!editedSteps) return;
      analysis.steps = editedSteps;
    }
    analysis.steps.push({
      id: "roadmap_custom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      skill: skill,
      why: why,
      exercise: exercise,
      projectId: "",
      completed: false
    });
    document.getElementById("skill-gap-new-topic").value = "";
    document.getElementById("skill-gap-new-why").value = "";
    document.getElementById("skill-gap-new-exercise").value = "";
    profile.skillGapAnalysis = analysis;
    if (!writeDemoProfile(profile)) {
      document.getElementById("skill-gap-status").textContent = "Could not add the roadmap step. Check browser storage and try again.";
      return;
    }
    renderSkillGapAnalyzer();
    skillGapRoadmapEditing = true;
    document.getElementById("skill-gap-roadmap-editor").hidden = false;
    renderSkillGapRoadmap(normalizeStudentProfile(readDemoProfile()).skillGapAnalysis);
    document.getElementById("skill-gap-status").textContent = "Custom roadmap step added. Save roadmap edits when finished.";
  });
  var skillGapSaveRoadmapButton = document.getElementById("skill-gap-save-roadmap");
  if (skillGapSaveRoadmapButton) skillGapSaveRoadmapButton.addEventListener("click", function () {
    var profile = readDemoProfile();
    var analysis = normalizeSkillGapAnalysis(profile.skillGapAnalysis);
    if (!analysis) return;
    var updatedSteps = readEditedRoadmapSteps(analysis);
    if (!updatedSteps) return;
    analysis.steps = updatedSteps;
    skillGapRoadmapEditing = false;
    document.getElementById("skill-gap-roadmap-editor").hidden = true;
    if (saveSkillGapRoadmap(analysis)) document.getElementById("skill-gap-status").textContent = "Roadmap edits saved in this browser.";
  });
  var skillGapResetRoadmapButton = document.getElementById("skill-gap-reset-roadmap");
  if (skillGapResetRoadmapButton) skillGapResetRoadmapButton.addEventListener("click", function () {
    if (!window.confirm("Reset this roadmap? This removes its steps and completion progress from this browser. You can analyze the target again to create a new roadmap.")) return;
    var profile = readDemoProfile();
    profile.skillGapAnalysis = null;
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      document.getElementById("skill-gap-status").textContent = "Roadmap could not be reset. Check browser storage and try again.";
      return;
    }
    skillGapRoadmapEditing = false;
    document.getElementById("skill-gap-roadmap-editor").hidden = true;
    document.getElementById("skill-gap-status").textContent = "Roadmap reset. Choose a target and analyze again when ready.";
    renderSkillGapAnalyzer();
  });
  document.addEventListener("change", function (event) {
    var checkbox = event.target.closest("[data-roadmap-complete]");
    if (!checkbox || skillGapRoadmapEditing) return;
    setRoadmapCompletion(checkbox.dataset.roadmapComplete, checkbox.checked);
  });
  document.addEventListener("click", function (event) {
    var removeStep = event.target.closest("[data-roadmap-delete]");
    if (!removeStep) return;
    var profile = readDemoProfile();
    var analysis = normalizeSkillGapAnalysis(profile.skillGapAnalysis);
    if (!analysis) return;
    if (skillGapRoadmapEditing) {
      var editedSteps = readEditedRoadmapSteps(analysis);
      if (!editedSteps) return;
      analysis.steps = editedSteps;
    }
    analysis.steps = analysis.steps.filter(function (step) { return step.id !== removeStep.dataset.roadmapDelete; });
    profile.skillGapAnalysis = analysis;
    if (!writeDemoProfile(profile)) {
      document.getElementById("skill-gap-status").textContent = "Could not remove this roadmap step. Check browser storage and try again.";
      return;
    }
    renderSkillGapAnalyzer();
    skillGapRoadmapEditing = true;
    document.getElementById("skill-gap-roadmap-editor").hidden = false;
    renderSkillGapRoadmap(normalizeStudentProfile(readDemoProfile()).skillGapAnalysis);
  });

  var defenseStartButton = document.getElementById("student-defense-start");
  if (defenseStartButton) defenseStartButton.addEventListener("click", function () {
    startStudentDefense(document.getElementById("student-defense-project").value);
  });
  var defenseSaveAnswerButton = document.getElementById("student-defense-save-answer");
  if (defenseSaveAnswerButton) defenseSaveAnswerButton.addEventListener("click", function () { saveDefenseAnswer(false); });
  var defenseSkipButton = document.getElementById("student-defense-skip");
  if (defenseSkipButton) defenseSkipButton.addEventListener("click", function () { saveDefenseAnswer(true); });
  var defenseBackButton = document.getElementById("student-defense-back");
  if (defenseBackButton) defenseBackButton.addEventListener("click", function () {
    var profile = normalizeStudentProfile(readDemoProfile());
    var session = defenseSessionById(profile, activeDefenseSessionId);
    if (!session || !session.questions.length) return;
    session.currentIndex = session.questions.length - 1;
    saveDefenseProfile(profile, "You can review or update the last response.");
  });
  var defenseFinishButton = document.getElementById("student-defense-finish");
  if (defenseFinishButton) defenseFinishButton.addEventListener("click", finishStudentDefense);
  var defenseShareCheckbox = document.getElementById("student-defense-share");
  if (defenseShareCheckbox) defenseShareCheckbox.addEventListener("change", function () { setDefenseSharing(defenseShareCheckbox.checked); });
  var defenseRestartButton = document.getElementById("student-defense-restart");
  if (defenseRestartButton) defenseRestartButton.addEventListener("click", restartStudentDefense);

  function calculateProfileCompletion(profile) {
    var p = normalizeStudentProfile(profile);
    var values = [
      p.fullName, p.headline, p.educationLevel, p.careerInterests,
      p.skills.length ? "skills" : ""
    ];
    var filled = values.filter(function (value) { return !!String(value || "").trim(); }).length;
    var total = values.length;
    return { percent: Math.round((filled / total) * 100), filled: filled, total: total };
  }

  function formatStudentApplicationDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date not provided";
    var parts = value.split("-").map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return "Date not provided";
    return date.toLocaleDateString();
  }

  function renderApplicationStatusTimeline(application) {
    var history = Array.isArray(application.statusHistory) && application.statusHistory.length
      ? application.statusHistory.slice().reverse()
      : [{
          previousStatus: "",
          newStatus: getApplicationStatusLabel(application.status),
          timestamp: application.updatedAt || application.applicationDate || new Date().toISOString(),
          actor: application.statusSource === "recruiter" ? "Recruiter" : "Applicant",
          actorRole: application.statusSource === "recruiter" ? "Recruiter" : "Applicant",
          note: application.statusSource === "recruiter" ? "Status updated in the browser-local recruiter demo." : "Application recorded in this browser."
        }];
    return '<details class="application-status-timeline"><summary>Status timeline</summary><ul class="application-status-timeline__list">' +
      history.map(function (entry) {
        var previous = entry.previousStatus ? escapeHtml(getApplicationStatusLabel(entry.previousStatus)) : "—";
        var next = escapeHtml(getApplicationStatusLabel(entry.newStatus || application.status));
        var actor = entry.actor ? escapeHtml(entry.actor) : "Unknown";
        var role = entry.actorRole ? " · " + escapeHtml(entry.actorRole) : "";
        var timestamp = entry.timestamp ? escapeHtml(formatStudentApplicationDate(entry.timestamp.slice(0, 10))) : "Time unavailable";
        var note = entry.note ? '<p>' + escapeHtml(entry.note) + '</p>' : "";
        return '<li><strong>' + previous + ' → ' + next + '</strong><span>' + timestamp + ' · ' + actor + role + '</span>' + note + '</li>';
      }).join("") + '</ul></details>';
  }

  function studentApplicationItemHtml(application, compact) {
    var statusValue = application.recruiterStatus || application.status || "Applied";
    var statusLabel = getApplicationStatusLabel(statusValue);
    var statusClass = getApplicationStatusClass(statusValue);
    var statusMeta = application.recruiterStatus && application.recruiterStatus !== application.status
      ? 'Current status: ' + escapeHtml(statusLabel) + ' · recruiter update: ' + escapeHtml(getApplicationStatusLabel(application.recruiterStatus)) + ' · local only'
      : 'Current status: ' + escapeHtml(statusLabel) + ' · local demo tracker';
    return '<li class="student-application-item">' +
      '<div class="student-application-item__content">' +
        '<div class="student-application-item__heading"><strong>' + escapeHtml(application.jobTitle) + '</strong><span class="student-application-status ' + statusClass + '">' + escapeHtml(statusLabel) + '</span></div>' +
        '<span class="student-item__meta">' + escapeHtml(application.companyName) + ' · ' + escapeHtml(formatStudentApplicationDate(application.applicationDate)) + '</span>' +
        '<span class="student-item__meta">Method/source: ' + escapeHtml(application.methodSource || "Not provided") + '</span>' +
        '<span class="student-item__meta">' + statusMeta + '</span>' +
        (application.recruiterStatus ? '<span class="student-item__meta">Recruiter demo status: ' + escapeHtml(getApplicationStatusLabel(application.recruiterStatus)) + (application.recruiterUpdatedAt ? ' · updated ' + escapeHtml(formatStudentApplicationDate(application.recruiterUpdatedAt.slice(0, 10))) : '') + ' · local only</span>' : '') +
        (application.notes ? '<p class="student-application-item__notes">' + escapeHtml(application.notes) + '</p>' : '') +
        renderApplicationStatusTimeline(application) +
      '</div>' +
      '<div class="student-application-item__actions">' +
        '<button class="btn btn--text" type="button" data-student-application-edit="' + escapeHtml(application.id) + '">Edit</button>' +
        (compact ? "" : '<button class="btn btn--text" type="button" data-student-application-delete="' + escapeHtml(application.id) + '">Remove</button>') +
      '</div>' +
    '</li>';
  }

  function renderStudentApplicationLists(profile) {
    var applications = normalizeStudentProfile(profile || readDemoProfile()).applications.slice().sort(function (a, b) {
      return (b.applicationDate || "").localeCompare(a.applicationDate || "") || (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    if (studentApplications) {
      studentApplications.innerHTML = applications.length
        ? applications.slice(0, 3).map(function (application) { return studentApplicationItemHtml(application, true); }).join("")
        : '<li class="empty--compact"><h3>No applications recorded</h3><p>Add an application after you have submitted it. Employer-site visits are not automatically recorded.</p><button class="btn btn--secondary" type="button" data-student-application-add>Add application</button></li>';
    }
    if (!studentApplicationList) return;
    if (!applications.length) {
      studentApplicationList.innerHTML = '<li class="empty--compact"><h3>No applications recorded</h3><p>Add an application after you have submitted it. Employer-site visits are not automatically recorded.</p></li>';
      if (studentApplicationListMessage) studentApplicationListMessage.textContent = "";
      return;
    }
    var statusFilter = document.getElementById("student-application-filter-status");
    var searchFilter = document.getElementById("student-application-filter-search");
    var selectedStatus = statusFilter ? statusFilter.value : "";
    var query = searchFilter ? searchFilter.value.trim().toLowerCase() : "";
    var filtered = applications.filter(function (application) {
      var matchesStatus = !selectedStatus || application.status === selectedStatus;
      var matchesQuery = !query || (application.jobTitle + " " + application.companyName).toLowerCase().indexOf(query) !== -1;
      return matchesStatus && matchesQuery;
    });
    if (!filtered.length) {
      studentApplicationList.innerHTML = '<li class="empty--compact"><h3>No matching applications</h3><p>Try another status or search term.</p></li>';
      return;
    }
    studentApplicationList.innerHTML = filtered.map(function (application) {
      return studentApplicationItemHtml(application, false);
    }).join("");
  }

  function recommendationWords(value) {
    var ignored = {
      a: true, an: true, and: true, for: true, in: true, of: true, the: true, to: true, with: true,
      developer: true, engineer: true, analyst: true, associate: true, intern: true, internship: true,
      junior: true, senior: true, entry: true, level: true, job: true
    };
    var seen = Object.create(null);
    return String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter(function (word) {
      if (!word || (word.length < 3 && ["ai", "ml", "ui", "ux"].indexOf(word) === -1) || ignored[word] || seen[word]) return false;
      seen[word] = true;
      return true;
    });
  }

  function recommendationContainsPhrase(text, phrase) {
    var escaped = String(phrase || "").toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return !!escaped && new RegExp("(^|[^a-z0-9])" + escaped + "($|[^a-z0-9])", "i").test(String(text || ""));
  }

  function recommendationEligibility(job, profile) {
    var recorded = [];
    if (Array.isArray(job.qualifications)) recorded = recorded.concat(job.qualifications);
    if (Array.isArray(job.eligibility)) recorded = recorded.concat(job.eligibility);
    else if (typeof job.eligibility === "string") recorded.push(job.eligibility);
    if (job.experience) recorded.push("Experience level: " + job.experience);
    if (job.educationRequirement) recorded.push(String(job.educationRequirement));
    var requirement = recorded.map(function (item) { return String(item || "").trim(); }).filter(Boolean).join(". ");
    if (!requirement) {
      return { status: "Unknown", explanation: "No eligibility or education requirement is recorded for this listing." };
    }

    var education = profile.educationLevel.toLowerCase();
    var currentStudentRequirement = /\b(currently enrolled|currently studying|current student|students? (?:must|should|currently)|enrolled|pursuing)\b/i.test(requirement);
    var needsPostgraduate = /\b(postgraduate|postgraduate degree|master(?:'s)? degree|ph\.?d\.?)\b/i.test(requirement);
    var needsCompletedDegree = /\b(bachelor(?:'s)?(?: degree)?|b\.?tech|b\.?sc|b\.?e\.?|degree required|degree completed)\b/i.test(requirement);
    var needsGraduate = /\bgraduate(?:s)? only\b/i.test(requirement);
    var needsUndergraduate = /\bundergraduate(?:s)?\b/i.test(requirement);
    var needsHighSchool = /\bhigh school\b/i.test(requirement);
    var recognized = currentStudentRequirement || needsPostgraduate || needsCompletedDegree || needsGraduate || needsUndergraduate || needsHighSchool;
    if (!recognized) {
      return { status: "Unknown", explanation: "The listing records eligibility text, but the available profile fields cannot reliably assess it." };
    }
    if (/\b(experience|years?|age|citizenship|authorized|visa|language|relocat|work permit)\b/i.test(requirement)) {
      return { status: "Unknown", explanation: "The listing includes eligibility criteria that the saved profile does not establish, so eligibility remains unknown." };
    }

    var hasEducation = !!education;
    if (!hasEducation) {
      return { status: "Unknown", explanation: "Eligibility mentions education, but no education level is saved in the profile." };
    }
    if (education === "working professional") {
      return { status: "Unknown", explanation: "The saved Working professional level does not establish a specific degree or current enrollment status." };
    }
    var educationMatches = true;
    if (needsPostgraduate) educationMatches = education === "postgraduate";
    else if (needsCompletedDegree && !currentStudentRequirement || needsGraduate) educationMatches = education === "graduate" || education === "postgraduate";
    else if (needsUndergraduate) educationMatches = education === "undergraduate";
    else if (needsHighSchool) educationMatches = education === "high school";
    if (currentStudentRequirement) {
      var studentLevel = education === "high school" || education === "undergraduate";
      if (education === "undergraduate" && !profile.collegeName) {
        return { status: "Unknown", explanation: "The profile says Undergraduate but does not record a college, so current enrollment cannot be confirmed." };
      }
      educationMatches = educationMatches && studentLevel;
    }
    return educationMatches
      ? { status: "Satisfied", explanation: "The saved education level is consistent with the recorded education criterion; this is not an employer eligibility decision." }
      : { status: "Unmet", explanation: "The saved education level does not match the recorded education criterion. Confirm the listing details with the employer." };
  }

  function scoreRecommendedJob(job, profile) {
    var requiredSkills = uniqueSkillNames(Array.isArray(job.skills) ? job.skills : []);
    var savedSkills = Object.create(null);
    profile.skills.forEach(function (skill) {
      savedSkills[skill.name.toLowerCase().replace(/\s+/g, " ")] = skill;
    });
    var matchingSkills = requiredSkills.filter(function (skill) {
      return !!savedSkills[skill.toLowerCase().replace(/\s+/g, " ")];
    });
    var missingSkills = requiredSkills.filter(function (skill) {
      return !savedSkills[skill.toLowerCase().replace(/\s+/g, " ")];
    });

    var titleTerms = recommendationWords(job.title + " " + (job.category || ""));
    var projectEvidence = profile.projects.filter(function (project) {
      var projectText = [project.title, project.description, project.technologies, project.role].join(" ").toLowerCase();
      return requiredSkills.length
        ? requiredSkills.some(function (skill) { return recommendationContainsPhrase(projectText, skill); })
        : titleTerms.some(function (term) { return recommendationContainsPhrase(projectText, term); });
    });
    var skillPoints = requiredSkills.length ? 50 * matchingSkills.length / requiredSkills.length : 0;
    var projectPoints = Math.min(projectEvidence.length, 2) * 10;

    var eligibility = recommendationEligibility(job, profile);
    var eligibilityPoints = eligibility.status === "Satisfied" ? 20 : 0;

    var preferredText = [profile.desiredRoles, profile.careerInterests, profile.headline].join(" ");
    var preferredWords = recommendationWords(preferredText);
    var jobWords = recommendationWords([job.title, job.category, (job.tags || []).join(" ")].join(" "));
    var roleMatches = preferredWords.filter(function (word) { return jobWords.indexOf(word) !== -1; });
    var rolePoints = preferredWords.length ? 4 * roleMatches.length / preferredWords.length : 0;
    var opportunityTypes = [job.type, job.employmentType].filter(Boolean).map(function (type) { return type.toLowerCase(); });
    var preferredTypes = String(profile.opportunityType || "").split(/[,;\n]/).map(function (type) { return type.trim().toLowerCase(); }).filter(Boolean);
    var typeMatch = preferredTypes.some(function (type) { return opportunityTypes.indexOf(type) !== -1; });
    var typePoints = preferredTypes.length && typeMatch ? 2 : 0;
    var modeMatch = !!profile.workMode && String(profile.workMode).toLowerCase() === String(job.mode || "").toLowerCase();
    var modePoints = profile.workMode && modeMatch ? 2 : 0;
    var preferredLocations = String(profile.preferredLocations || "").split(/[,;\n]/).map(function (location) { return location.trim(); }).filter(Boolean);
    var locationMatch = preferredLocations.some(function (location) {
      return recommendationContainsPhrase(String(job.location || "").toLowerCase(), location.toLowerCase()) ||
        (String(job.mode || "").toLowerCase() === "remote" && location.toLowerCase() === "remote");
    });
    var locationPoints = preferredLocations.length && locationMatch ? 2 : 0;
    var preferencePoints = rolePoints + typePoints + modePoints + locationPoints;
    var score = Math.max(0, Math.min(100, Math.round(skillPoints + projectPoints + eligibilityPoints + preferencePoints)));
    var destination = Jobs.applyDestination(job);
    var isDemo = job.status === "DEMO" || job.source === "recruiter-local-demo";
    var hasExternalLink = destination.kind === "external" || destination.kind === "external-verified";
    return {
      job: job,
      score: score,
      matchingSkills: matchingSkills,
      missingSkills: missingSkills,
      projectEvidence: projectEvidence,
      eligibility: eligibility,
      eligibilityPoints: eligibilityPoints,
      roleMatches: roleMatches,
      rolePoints: rolePoints,
      typePoints: typePoints,
      modePoints: modePoints,
      locationPoints: locationPoints,
      preferencePoints: preferencePoints,
      skillPoints: skillPoints,
      projectPoints: projectPoints,
      isDemo: isDemo,
      hasExternalLink: hasExternalLink
    };
  }

  function fillRecommendationFilters(jobs) {
    var definitions = [
      { id: "recommendation-type-filter", values: jobs.reduce(function (values, job) {
        [job.type, job.employmentType].forEach(function (value) { if (value && values.indexOf(value) === -1) values.push(value); });
        return values;
      }, []), first: ["all", "All types"] },
      { id: "recommendation-category-filter", values: jobs.reduce(function (values, job) {
        if (job.category && values.indexOf(job.category) === -1) values.push(job.category);
        return values;
      }, []), first: ["all", "All categories"] }
    ];
    definitions.forEach(function (definition) {
      var select = document.getElementById(definition.id);
      if (!select) return;
      var previous = select.value || "all";
      select.textContent = "";
      var first = document.createElement("option");
      first.value = definition.first[0];
      first.textContent = definition.first[1];
      select.appendChild(first);
      definition.values.sort().forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
      select.value = definition.values.indexOf(previous) !== -1 ? previous : "all";
    });
  }

  function recommendationPoints(value) {
    return (Math.round(value * 10) / 10).toFixed(1);
  }

  function renderStudentRecommendations(profile) {
    var list = document.getElementById("recommended-opportunities-list");
    if (!list) return;
    var jobs = Array.isArray(allJobs) ? allJobs.filter(function (job) { return job && job.title && job.company; }) : [];
    fillRecommendationFilters(jobs);
    var meaningfulProfileData = profile.skills.length || profile.projects.length || profile.desiredRoles ||
      profile.careerInterests || profile.headline || profile.educationLevel || profile.collegeName;
    if (!meaningfulProfileData) {
      list.innerHTML = '<div class="recommendation-empty"><h4>Complete your profile to get useful recommendations</h4><p>Add skills, project details, education, desired roles, or career interests. We will not infer a match from a name alone.</p><button class="btn btn--secondary" type="button" data-student-route="profile">Complete profile</button></div>';
      return;
    }
    if (!jobs.length) {
      list.innerHTML = '<div class="recommendation-empty"><h4>No active listings to compare</h4><p>There are no current Job Explorer records available for recommendation.</p><button class="btn btn--secondary" type="button" data-student-route="explore">Explore jobs</button></div>';
      return;
    }
    var typeFilter = document.getElementById("recommendation-type-filter").value;
    var categoryFilter = document.getElementById("recommendation-category-filter").value;
    var sourceFilter = document.getElementById("recommendation-source-filter").value;
    var recommendations = jobs.map(function (job) { return scoreRecommendedJob(job, profile); }).filter(function (item) {
      if (typeFilter !== "all" && item.job.type !== typeFilter && item.job.employmentType !== typeFilter) return false;
      if (categoryFilter !== "all" && item.job.category !== categoryFilter) return false;
      if (sourceFilter === "demo" && !item.isDemo) return false;
      if (sourceFilter === "external" && !item.hasExternalLink) return false;
      return true;
    }).sort(function (a, b) {
      return b.score - a.score || String(a.job.title).localeCompare(String(b.job.title));
    });
    if (!recommendations.length) {
      list.innerHTML = '<div class="recommendation-empty"><h4>No opportunities match these filters</h4><p>Change the type, category, or listing filter to see other saved listings.</p></div>';
      return;
    }
    list.innerHTML = recommendations.map(function (item) {
      var job = item.job;
      var savedId = Number(job.id);
      var isSaved = saved.indexOf(savedId) !== -1;
      var matchingText = item.matchingSkills.length ? item.matchingSkills.join(", ") : "None recorded";
      var missingText = item.missingSkills.length ? item.missingSkills.join(", ") : (job.skills && job.skills.length ? "No listed skills missing by name" : "No skill requirements recorded");
      var projectsText = item.projectEvidence.length
        ? item.projectEvidence.map(function (project) { return project.title; }).join(", ")
        : "No saved project clearly mentions a listed skill or role keyword.";
      var eligibilityText = item.eligibility.status + " · " + item.eligibility.explanation;
      var sourceBadge = (item.isDemo
        ? '<span class="badge badge--demo">' + (job.source === "recruiter-local-demo" ? "Local recruiter DEMO listing" : "DEMO · fictional sample") + '</span>'
        : "") + (item.hasExternalLink
        ? '<span class="badge badge--outline">External application link recorded</span>'
        : item.isDemo ? "" : '<span class="badge badge--outline">Listing · no usable external link</span>');
      var roleExplanation = "Role/interests " + recommendationPoints(item.rolePoints) + "/4, opportunity type " + recommendationPoints(item.typePoints) + "/2, work mode " + recommendationPoints(item.modePoints) + "/2, preferred location " + recommendationPoints(item.locationPoints) + "/2 points. Missing preference details earn no points.";
      var eligibilityScore = item.eligibilityPoints + "/20 points";
      return '<article class="recommendation-item">' +
        '<div class="recommendation-item__head"><div><h4>' + escapeHtml(job.title) + '</h4><p class="recommendation-item__company">' + escapeHtml(job.company) + ' · ' + escapeHtml(job.type || "Opportunity") + (job.category ? " · " + escapeHtml(job.category) : "") + '</p></div><span class="recommendation-item__score" aria-label="Rule-based match score ' + item.score + ' percent">' + item.score + '% match</span></div>' +
        '<div class="recommendation-item__badges">' + sourceBadge + statusBadge(job) + '</div>' +
        '<div class="recommendation-item__facts">' +
          '<section><h5>Skills you match</h5><p>' + escapeHtml(matchingText) + '</p></section>' +
          '<section><h5>Skills to build</h5><p>' + escapeHtml(missingText) + '</p></section>' +
          '<section><h5>Relevant saved projects</h5><p>' + escapeHtml(projectsText) + '</p></section>' +
          '<section><h5>Eligibility: ' + escapeHtml(item.eligibility.status) + '</h5><p>' + escapeHtml(eligibilityText) + '</p></section>' +
        '</div>' +
        '<p class="recommendation-item__explanation">Score details: skills ' + recommendationPoints(item.skillPoints) + '/50; project evidence ' + recommendationPoints(item.projectPoints) + '/20; eligibility ' + eligibilityScore + '; saved preference fit ' + recommendationPoints(item.preferencePoints) + '/10. Components are rounded to one decimal; the final percentage rounds the full score to the nearest integer. ' + escapeHtml(roleExplanation) + '</p>' +
        '<div class="recommendation-item__actions">' +
          '<button class="btn btn--secondary" type="button" data-rec-view="' + escapeHtml(String(job.id)) + '">View details</button>' +
          '<button class="btn btn--secondary" type="button" data-rec-save="' + escapeHtml(String(job.id)) + '" aria-pressed="' + String(isSaved) + '">' + (isSaved ? "Remove saved job" : "Save job") + '<span class="sr-only">: ' + escapeHtml(job.title) + '</span></button>' +
          '<button class="btn btn--text" type="button" data-rec-gap="' + escapeHtml(String(job.id)) + '">Compare skill gaps</button>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function renderStudentDashboard() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var name = profile.fullName || "Student";
    if (studentWelcomeName) {
      studentWelcomeName.textContent = name === "Student" ? "Student" : "Welcome back, " + name;
    }
    var completion = calculateProfileCompletion(profile);
    if (studentCompletionBar) {
      var completionFill = studentCompletionBar.querySelector("span");
      if (completionFill) completionFill.style.width = completion.percent + "%";
      studentCompletionBar.setAttribute("aria-valuenow", String(completion.percent));
    }
    if (studentCompletionValue) studentCompletionValue.textContent = completion.percent + "%";
    if (studentCompletionDetail) studentCompletionDetail.textContent = completion.filled + " of " + completion.total + " core fields complete";
    var profileNudge = document.getElementById("student-profile-nudge");
    if (profileNudge) profileNudge.hidden = completion.percent === 100;

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

    renderStudentApplicationLists(profile);

    if (studentOverview) {
      var skillsHtml = profile.skills.length ? profile.skills.map(function (skill) {
        var evidence = skill.evidence === "project-linked" ? "Project-linked" : "Self-declared";
        var level = skill.level ? ' <span class="student-evidence">' + escapeHtml(skill.level) + '</span>' : "";
        return '<li class="student-item"><strong>' + escapeHtml(skill.name) + '</strong>' + level + '<span class="student-item__meta">Evidence: ' + escapeHtml(evidence) + '</span></li>';
      }).join("") : '<li class="empty--compact"><h3>No skills added yet</h3><p>Add a few skills to help employers understand your strengths.</p></li>';

      var projectsHtml = profile.projects.length ? profile.projects.map(function (project) {
        var projectLinks = [];
        if (project.githubUrl && isHttpUrl(project.githubUrl)) projectLinks.push('<a class="link" href="' + escapeHtml(project.githubUrl) + '" target="_blank" rel="noopener noreferrer">Repository link provided</a>');
        if (project.liveDemoUrl && isHttpUrl(project.liveDemoUrl)) projectLinks.push('<a class="link" href="' + escapeHtml(project.liveDemoUrl) + '" target="_blank" rel="noopener noreferrer">Live demo</a>');
        return '<li class="student-item"><strong>' + escapeHtml(project.title) + '</strong><span class="student-item__meta">' + escapeHtml(project.description || "No description provided") + '</span><span class="student-item__meta">Technologies: ' + escapeHtml(project.technologies || "Not provided") + '</span><span class="student-item__meta">Role: ' + escapeHtml(project.role || "Not provided") + '</span><span class="student-item__meta">Project added by student</span>' + (projectLinks.length ? '<div class="student-project-item__links">' + projectLinks.join("") + '</div>' : '') + '</li>';
      }).join("") : '<li class="empty--compact"><h3>No proof-of-work projects yet</h3><p>Share important work samples and project outcomes.</p></li>';

      var repositoriesHtml = profile.githubRepositories.length ? profile.githubRepositories.map(function (repo) {
        var repoDescription = repo.description ? '<span class="student-item__meta">' + escapeHtml(repo.description) + '</span>' : '<span class="student-item__meta">No description supplied.</span>';
        var extra = [];
        if (repo.language) extra.push('Language: ' + repo.language);
        if (repo.topics && repo.topics.length) extra.push('Topics: ' + repo.topics.join(', '));
        return '<li class="student-item"><strong><a class="link" href="' + escapeHtml(repo.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(repo.name || repo.fullName) + '</a></strong>' + repoDescription + '<span class="student-item__meta">' + escapeHtml(extra.join(' • ') || 'Public GitHub repository') + '</span></li>';
      }).join("") : '<li class="empty--compact"><h3>No public repositories yet</h3><p>Add a public GitHub link to show what you have built.</p></li>';

      studentOverview.innerHTML = '<div class="student-overview__section"><h4>Skills</h4><ul class="student-list">' + skillsHtml + '</ul></div>' +
        '<div class="student-overview__section"><h4>Projects</h4><ul class="student-list">' + projectsHtml + '</ul></div>' +
        '<div class="student-overview__section"><h4>GitHub portfolio</h4><ul class="student-list">' + repositoriesHtml + '</ul></div>' +
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
          var value = entry[1];
          if (entry[0] === "GitHub" && isGitHubProfileUrl(value)) {
            value = '<a class="link" href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(value) + '</a>';
          }
          if (entry[0] === "Portfolio" && isHttpUrl(value)) {
            value = '<a class="link" href="' + escapeHtml(value) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(value) + '</a>';
          }
          return '<dt>' + escapeHtml(entry[0]) + '</dt><dd>' + value + '</dd>';
        }).join("") + '</dl>';
    }
    renderStudentRecommendations(profile);
    renderSkillGapAnalyzer();
    renderRecruiterApplicants(readRecruiterListings());
  }

  function loadStudentProfileIntoForm() {
    clearStudentSkillForm();
    setStudentInputs(readDemoProfile());
    if (studentProfileForm) {
      studentProfileForm.querySelectorAll("[aria-invalid]").forEach(function (el) {
        el.setAttribute("aria-invalid", "false");
      });
      studentProfileForm.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
    }
    setStudentStatus("");
    renderProjectOptions();
  }

  function setStudentApplicationMessage(message, isError) {
    if (!studentApplicationMessage) return;
    studentApplicationMessage.textContent = message || "";
    studentApplicationMessage.classList.toggle("field-error", !!(message && isError));
    studentApplicationMessage.classList.toggle("auth-status", !(message && isError));
  }

  function clearStudentApplicationErrors() {
    ["student-application-title", "student-application-company", "student-application-date", "student-application-source", "student-application-status"].forEach(function (id) {
      setFieldError(id, "");
    });
  }

  function renderStudentApplicationJobOptions(selectedId, existingApplication) {
    var select = document.getElementById("student-application-job");
    if (!select) return;
    select.textContent = "";
    var manual = document.createElement("option");
    manual.value = "";
    manual.textContent = "Manual entry (not linked to a listing)";
    select.appendChild(manual);
    (Array.isArray(allJobs) ? allJobs : []).forEach(function (job) {
      var option = document.createElement("option");
      option.value = String(job.id);
      option.textContent = job.title + " · " + job.company + (job.status === "DEMO" ? " · demo sample" : "");
      select.appendChild(option);
    });
    if (selectedId && !Array.prototype.some.call(select.options, function (option) { return option.value === String(selectedId); }) && existingApplication) {
      var unavailable = document.createElement("option");
      unavailable.value = String(selectedId);
      unavailable.textContent = "Previously linked listing unavailable · saved job details retained";
      select.appendChild(unavailable);
    }
    select.value = selectedId && Array.prototype.some.call(select.options, function (option) { return option.value === String(selectedId); })
      ? String(selectedId)
      : "";
  }

  function updateStudentApplicationJobFields() {
    var select = document.getElementById("student-application-job");
    var title = document.getElementById("student-application-title");
    var company = document.getElementById("student-application-company");
    if (!select || !title || !company) return;
    var job = select.value && Array.isArray(allJobs)
      ? allJobs.find(function (item) { return String(item.id) === select.value; })
      : null;
    title.readOnly = !!job;
    company.readOnly = !!job;
    if (job) {
      title.value = job.title;
      company.value = job.company;
    }
  }

  function resetStudentApplicationForm() {
    if (!studentApplicationForm) return;
    studentApplicationForm.reset();
    studentApplicationDraftId = null;
    renderStudentApplicationJobOptions("");
    updateStudentApplicationJobFields();
    document.getElementById("student-application-save").textContent = "Save application";
    studentApplicationForm.hidden = true;
    clearStudentApplicationErrors();
    setStudentApplicationMessage("");
    if (studentApplicationDuplicateEdit) {
      studentApplicationDuplicateEdit.hidden = true;
      studentApplicationDuplicateEdit.dataset.studentApplicationDuplicateEdit = "";
    }
  }

  function openStudentApplicationForm(applicationId, jobId, markApplied) {
    if (!studentApplicationForm) return;
    var profile = normalizeStudentProfile(readDemoProfile());
    var existing = applicationId ? profile.applications.find(function (item) { return item.id === applicationId; }) : null;
    studentApplicationDraftId = existing ? existing.id : null;
    studentApplicationForm.hidden = false;
    clearStudentApplicationErrors();
    setStudentApplicationMessage("");
    if (studentApplicationDuplicateEdit) studentApplicationDuplicateEdit.hidden = true;
    renderStudentApplicationJobOptions(existing ? existing.jobId : jobId, existing);
    document.getElementById("student-application-title").value = existing ? existing.jobTitle : "";
    document.getElementById("student-application-company").value = existing ? existing.companyName : "";
    document.getElementById("student-application-date").value = existing ? existing.applicationDate : "";
    document.getElementById("student-application-source").value = existing ? existing.methodSource : "";
    document.getElementById("student-application-status").value = existing ? existing.status : (markApplied ? "Applied" : "");
    document.getElementById("student-application-notes").value = existing ? existing.notes : "";
    updateStudentApplicationJobFields();
    if (existing && !document.getElementById("student-application-job").value) {
      document.getElementById("student-application-title").value = existing.jobTitle;
      document.getElementById("student-application-company").value = existing.companyName;
    }
    document.getElementById("student-application-save").textContent = existing ? "Save changes" : "Save application";
    showStudentRoute("applications");
    if (markApplied && !existing) {
      setStudentApplicationMessage("Record this only if you have submitted the application. The status is your entry and is not confirmed by the employer.");
    }
    var focusTarget = existing ? document.getElementById("student-application-status") : document.getElementById("student-application-title");
    if (jobId && markApplied) focusTarget = document.getElementById("student-application-date");
    if (focusTarget) focusTarget.focus();
  }

  function normalizedApplicationIdentity(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function findDuplicateStudentApplication(profile, candidate, excludedId) {
    return profile.applications.find(function (application) {
      if (application.id === excludedId) return false;
      if (candidate.jobId && application.jobId) return candidate.jobId === application.jobId;
      return normalizedApplicationIdentity(application.jobTitle) === normalizedApplicationIdentity(candidate.jobTitle) &&
        normalizedApplicationIdentity(application.companyName) === normalizedApplicationIdentity(candidate.companyName);
    }) || null;
  }

  function validateStudentApplicationForm() {
    var title = document.getElementById("student-application-title").value.trim();
    var company = document.getElementById("student-application-company").value.trim();
    var dateValue = document.getElementById("student-application-date").value;
    var source = document.getElementById("student-application-source").value.trim();
    var status = document.getElementById("student-application-status").value;
    var errors = {};
    if (!title) errors["student-application-title"] = "Enter the job title.";
    if (!company) errors["student-application-company"] = "Enter the company.";
    var validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && formatStudentApplicationDate(dateValue) !== "Date not provided";
    var today = new Date();
    var todayValue = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    if (!validDate) errors["student-application-date"] = "Choose a valid application date.";
    else if (dateValue > todayValue) errors["student-application-date"] = "Application date cannot be in the future.";
    if (!source) errors["student-application-source"] = "Enter how or where you applied.";
    if (studentApplicationStatuses.indexOf(status) === -1) errors["student-application-status"] = "Choose a status you maintain.";
    ["student-application-title", "student-application-company", "student-application-date", "student-application-source", "student-application-status"].forEach(function (id) {
      setFieldError(id, errors[id] || "");
    });
    var firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) document.getElementById(firstInvalid).focus();
    return Object.keys(errors).length === 0;
  }

  function saveStudentApplication(event) {
    if (event) event.preventDefault();
    if (!validateStudentApplicationForm()) {
      setStudentApplicationMessage("Please correct the highlighted fields before saving.", true);
      return;
    }
    var profile = readDemoProfile();
    var normalized = normalizeStudentProfile(profile);
    var jobSelect = document.getElementById("student-application-job");
    var record = {
      id: studentApplicationDraftId || "application_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      jobId: jobSelect ? jobSelect.value : "",
      jobTitle: document.getElementById("student-application-title").value.trim(),
      companyName: document.getElementById("student-application-company").value.trim(),
      applicationDate: document.getElementById("student-application-date").value,
      methodSource: document.getElementById("student-application-source").value.trim(),
      status: document.getElementById("student-application-status").value,
      notes: document.getElementById("student-application-notes").value.trim(),
      createdAt: "",
      updatedAt: new Date().toISOString(),
      statusSource: "student",
      candidateId: normalized.profileId || "",
      recruiterListingId: ""
    };
    var selectedJob = record.jobId ? allJobs.filter(function (job) { return String(job.id) === record.jobId; })[0] : null;
    if (selectedJob && selectedJob.recruiterListingId) record.recruiterListingId = selectedJob.recruiterListingId;
    var existingApplication = studentApplicationDraftId && normalized.applications.find(function (application) { return application.id === studentApplicationDraftId; });
    if (existingApplication) {
      record.recruiterListingId = existingApplication.recruiterListingId || record.recruiterListingId;
      record.candidateId = existingApplication.candidateId || record.candidateId;
      record.recruiterStatus = existingApplication.recruiterStatus;
      record.recruiterUpdatedAt = existingApplication.recruiterUpdatedAt;
    }
    if (!profile.profileId) {
      profile.profileId = "candidate_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      record.candidateId = profile.profileId;
    } else if (!record.candidateId) {
      record.candidateId = profile.profileId;
    }
    var duplicate = findDuplicateStudentApplication(normalized, record, studentApplicationDraftId);
    if (duplicate) {
      setStudentApplicationMessage("This job already has an application record. Edit that record instead of creating a duplicate.", true);
      if (studentApplicationDuplicateEdit) {
        studentApplicationDuplicateEdit.hidden = false;
        studentApplicationDuplicateEdit.dataset.studentApplicationDuplicateEdit = duplicate.id;
        studentApplicationDuplicateEdit.textContent = "Edit existing application for " + duplicate.jobTitle;
      }
      return;
    }
    if (studentApplicationDraftId) {
      var original = existingApplication;
      record.createdAt = original ? original.createdAt : "";
      normalized.applications = normalized.applications.map(function (application) {
        return application.id === studentApplicationDraftId ? record : application;
      });
    } else {
      record.createdAt = record.updatedAt;
      normalized.applications.push(record);
    }
    normalized.applications.forEach(function (application) {
      if (!application.candidateId) application.candidateId = profile.profileId;
    });
    profile.applications = normalized.applications;
    profile.updatedAt = record.updatedAt;
    if (!writeDemoProfile(profile)) {
      setStudentApplicationMessage("Could not save application data in this browser. Check local storage settings and try again.", true);
      return;
    }
    resetStudentApplicationForm();
    renderStudentApplicationLists(normalized);
    renderStudentDashboard();
    setStudentApplicationMessage("");
    if (studentApplicationListMessage) studentApplicationListMessage.textContent = "Application saved in this browser-local demo profile.";
  }

  function deleteStudentApplication(applicationId) {
    var profile = readDemoProfile();
    var normalized = normalizeStudentProfile(profile);
    var application = normalized.applications.find(function (item) { return item.id === applicationId; });
    if (!application || !window.confirm('Remove the application record for "' + application.jobTitle + '" at ' + application.companyName + '?')) return;
    normalized.applications = normalized.applications.filter(function (item) { return item.id !== applicationId; });
    profile.applications = normalized.applications;
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      if (studentApplicationListMessage) studentApplicationListMessage.textContent = "Could not remove the application from this browser. Check local storage settings and try again.";
      return;
    }
    if (studentApplicationDraftId === applicationId) resetStudentApplicationForm();
    renderStudentApplicationLists(normalized);
    renderStudentDashboard();
    if (studentApplicationListMessage) studentApplicationListMessage.textContent = "Application record removed from this browser.";
  }

  function saveStudentProfileFromForm() {
    var profile = readDemoProfile();
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
    var currentProfile = normalizeStudentProfile(profile);
    profile.skills = currentProfile.skills;
    profile.projects = currentProfile.projects;
    profile.updatedAt = new Date().toISOString();

    var errors = studentFieldErrorMap(profile);
    if (Object.keys(errors).length) {
      markFormErrors(studentProfileForm, errors);
      setStudentStatus("Please fix the highlighted fields and try again.");
      return false;
    }
    studentProfileForm.querySelectorAll("[aria-invalid]").forEach(function (el) {
      el.setAttribute("aria-invalid", "false");
    });
    studentProfileForm.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
    if (!writeDemoProfile(profile)) {
      setStudentStatus("Could not save profile changes in this browser. Check local storage settings and try again.");
      return false;
    }
    setStudentStatus("Profile saved successfully. Your dashboard reflects the latest local data.");
    if (studentDashboardStatus) studentDashboardStatus.textContent = "";
    renderStudentDashboard();
    return true;
  }

  function addSkillToProfile() {
    var profile = normalizeStudentProfile(readDemoProfile());
    var name = document.getElementById("student-skill-name").value.trim();
    var level = document.getElementById("student-skill-level").value;
    var projectId = document.getElementById("student-skill-project").value;
    if (!name) {
      setStudentSkillMessage("Enter a skill name before saving.", true);
      document.getElementById("student-skill-name").focus();
      return;
    }
    var duplicate = profile.skills.find(function (item) {
      return item.id !== studentSkillDraftId && item.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      setStudentSkillMessage("That skill is already in your profile. Skill names must be unique.", true);
      document.getElementById("student-skill-name").focus();
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
    if (!writeDemoProfile(profile)) {
      setStudentSkillMessage("Could not save this skill in the browser. Check local storage settings and try again.", true);
      return;
    }
    var message = studentSkillDraftId ? "Skill updated in your browser-local profile." : "Skill added to your browser-local profile.";
    setStudentStatus(message);
    clearStudentSkillForm();
    renderProjectOptions();
    renderStudentSkillEditor();
    renderStudentDashboard();
  }

  function deleteSkillFromProfile(skillId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    profile.skills = profile.skills.filter(function (item) { return item.id !== skillId; });
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      setStudentSkillMessage("Could not save the skill removal in the browser. Check local storage settings and try again.", true);
      return;
    }
    setStudentStatus("Skill removed from your browser-local profile.");
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
    if (skillLevel) {
      var previousSavedLevel = skillLevel.querySelector("[data-saved-level]");
      if (previousSavedLevel) previousSavedLevel.remove();
      var existingLevel = Array.prototype.some.call(skillLevel.options, function (option) { return option.value === skill.level; });
      if (skill.level && !existingLevel) {
        var savedLevelOption = document.createElement("option");
        savedLevelOption.value = skill.level;
        savedLevelOption.dataset.savedLevel = "true";
        savedLevelOption.textContent = "Saved level: " + skill.level;
        skillLevel.insertBefore(savedLevelOption, skillLevel.options[1] || null);
      }
      skillLevel.value = skill.level || "";
    }
    if (skillProject) skillProject.value = skill.projectId || "";
    studentSkillDraftId = skillId;
    var addButton = document.getElementById("student-skill-add");
    if (addButton) addButton.textContent = "Save skill";
    setStudentSkillMessage("Editing " + skill.name + ". Save your changes or enter a different skill.", false);
    if (skillName) skillName.focus();
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
    ["student-project-title", "student-project-description", "student-project-technologies", "student-project-role", "student-project-github", "student-project-demo"].forEach(function (id) {
      setFieldError(id, errors[id] || "");
    });
    var firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      var invalidInput = document.getElementById(firstInvalid);
      if (invalidInput) invalidInput.focus();
    }
    return Object.keys(errors).length === 0;
  }

  function addProjectToProfile() {
    if (!validateProjectForm()) {
      setStudentProjectMessage("Please fix the highlighted fields before saving.", true);
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
    if (!writeDemoProfile(profile)) {
      setStudentProjectMessage("Could not save this project in the browser. Check local storage settings and try again.", true);
      return;
    }
    setStudentStatus(studentProjectDraftId ? "Project updated in your browser-local profile." : "Project added to your browser-local profile.");
    clearStudentProjectForm();
    renderStudentProjectEditor();
    renderStudentSkillEditor();
    renderProjectOptions();
    renderStudentDashboard();
  }

  function deleteProjectFromProfile(projectId) {
    var profile = normalizeStudentProfile(readDemoProfile());
    var project = profile.projects.find(function (item) { return item.id === projectId; });
    if (!project || !window.confirm('Delete "' + project.title + '" from your profile? This cannot be undone.')) return;
    profile.projects = profile.projects.filter(function (item) { return item.id !== projectId; });
    profile.skills = profile.skills.map(function (skill) {
      if (skill.projectId === projectId) {
        return { id: skill.id, name: skill.name, level: skill.level, evidence: "self-declared", projectId: "", linkedProject: "" };
      }
      return skill;
    });
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      setStudentStatus("Could not save the project removal in the browser. Check local storage settings and try again.");
      return;
    }
    setStudentStatus("Project removed from your browser-local profile.");
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
    var clearButton = document.getElementById("student-project-clear");
    if (clearButton) clearButton.textContent = "Cancel editing";
    setStudentProjectMessage("Editing " + project.title + ". Save your changes or clear the form to cancel.");
    var titleInput = document.getElementById("student-project-title");
    if (titleInput) titleInput.focus();
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
  if (studentApplicationForm) studentApplicationForm.addEventListener("submit", saveStudentApplication);
  var studentApplicationAdd = document.getElementById("student-application-add");
  if (studentApplicationAdd) studentApplicationAdd.addEventListener("click", function () {
    openStudentApplicationForm("", "", false);
  });
  var studentApplicationCancel = document.getElementById("student-application-cancel");
  if (studentApplicationCancel) studentApplicationCancel.addEventListener("click", resetStudentApplicationForm);
  var studentApplicationJob = document.getElementById("student-application-job");
  if (studentApplicationJob) studentApplicationJob.addEventListener("change", updateStudentApplicationJobFields);
  var studentApplicationStatusFilter = document.getElementById("student-application-filter-status");
  var studentApplicationSearch = document.getElementById("student-application-filter-search");
  if (studentApplicationStatusFilter) studentApplicationStatusFilter.addEventListener("change", function () { renderStudentApplicationLists(); });
  if (studentApplicationSearch) studentApplicationSearch.addEventListener("input", function () { renderStudentApplicationLists(); });
  var studentProfileCancel = document.getElementById("student-profile-cancel");
  if (studentProfileCancel) {
    studentProfileCancel.addEventListener("click", function () {
      loadStudentProfileIntoForm();
      setStudentStatus("");
      if (studentDashboardStatus) studentDashboardStatus.textContent = "";
      showStudentRoute("dashboard");
      renderStudentDashboard();
    });
  }

  var studentGithubFetchDetailsButton = document.getElementById("student-github-fetch-details");
  if (studentGithubFetchDetailsButton) {
    studentGithubFetchDetailsButton.addEventListener("click", function () {
      var repoUrl = document.getElementById("student-github-repository-url").value.trim();
      if (!repoUrl) {
        setGitHubRepositoryStatus("Enter a public GitHub repository URL before fetching its details.", true);
        return;
      }
      setGitHubRepositoryStatus("Loading public repository details from GitHub...", false);
      fetchGitHubRepositoryMetadata(repoUrl).then(function (result) {
        if (!result.ok) {
          setGitHubRepositoryStatus(result.message || "GitHub metadata could not be loaded. You can still save the public repository URL manually.", true);
          return;
        }
        var repository = result.entry;
        document.getElementById("student-github-repository-name").value = repository.name || "";
        document.getElementById("student-github-repository-description").value = repository.description || "";
        setGitHubRepositoryStatus("Public repository metadata loaded from GitHub. Review it and save when ready.", false);
      });
    });
  }

  var studentGithubAddRepositoryButton = document.getElementById("student-github-add-repository");
  if (studentGithubAddRepositoryButton) {
    studentGithubAddRepositoryButton.addEventListener("click", saveGitHubRepositoryToProfile);
  }

  var studentGithubClearRepositoryButton = document.getElementById("student-github-clear-repository");
  if (studentGithubClearRepositoryButton) {
    studentGithubClearRepositoryButton.addEventListener("click", clearGitHubRepositoryForm);
  }

  document.addEventListener("click", function (event) {
    var editButton = event.target.closest("[data-student-github-repository-edit]");
    if (editButton) {
      editGitHubRepositoryEntry(editButton.getAttribute("data-student-github-repository-edit"));
      return;
    }
    var deleteButton = event.target.closest("[data-student-github-repository-delete]");
    if (deleteButton) {
      deleteGitHubRepositoryEntry(deleteButton.getAttribute("data-student-github-repository-delete"));
    }
  });

  var studentSkillEvidenceSkill = document.getElementById("student-skill-evidence-skill");
  if (studentSkillEvidenceSkill) {
    studentSkillEvidenceSkill.addEventListener("change", function () {
      renderStudentSkillEvidenceList();
      setSkillEvidenceMessage("");
    });
  }
  var studentSkillEvidenceSave = document.getElementById("student-skill-evidence-save");
  if (studentSkillEvidenceSave) studentSkillEvidenceSave.addEventListener("click", saveSkillEvidenceToProfile);
  var studentSkillEvidenceClear = document.getElementById("student-skill-evidence-clear");
  if (studentSkillEvidenceClear) {
    studentSkillEvidenceClear.addEventListener("click", function () {
      var itemField = document.getElementById("student-skill-evidence-item");
      if (itemField) itemField.value = "";
      clearSkillEvidenceForm();
    });
  }

  /* ---------- Recruiter portal (browser-local demo only) ---------- */
  var RECRUITER_LISTINGS_KEY = "nexora:demo-recruiter-listings";
  var RECRUITER_REMINDERS_KEY = "nexora:demo-recruiter-reminders";
  var COMPANY_PROFILE_KEY = "nexora:demo-company-profile";
  var JOB_REPORTS_KEY = "nexora:demo-job-reports";
  var RECRUITER_REVIEW_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;
  var RECRUITER_REMINDER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
  var recruiterForm = document.getElementById("recruiter-listing-form");
  var recruiterFormStatus = document.getElementById("recruiter-form-status");
  var recruiterListingDraftId = null;
  var recruiterSaving = false;
  var recruiterFieldIds = [
    "recruiter-job-title", "recruiter-company", "recruiter-description", "recruiter-location",
    "recruiter-job-type", "recruiter-work-mode", "recruiter-skills", "recruiter-eligibility",
    "recruiter-experience", "recruiter-deadline", "recruiter-salary-min", "recruiter-apply-url"
  ];

  function setRecruiterStatus(message) {
    if (recruiterFormStatus) recruiterFormStatus.textContent = message || "";
    var listingStatus = document.getElementById("recruiter-listing-status");
    if (listingStatus) listingStatus.textContent = message || "";
  }

  function normalizeCompanyProfile(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    var status = ["Pending Review", "Rejected"].indexOf(value.verificationStatus) >= 0 ? value.verificationStatus : "Not Submitted";
    var website = String(value.website || "").trim();
    if (website && !isHttpUrl(website)) website = "";
    var publicLinks = Array.isArray(value.publicLinks) ? value.publicLinks : [];
    return {
      id: String(value.id || ""),
      companyName: String(value.companyName || "").trim(),
      website: website,
      emailDomain: String(value.emailDomain || "").trim().toLowerCase(),
      description: String(value.description || "").trim(),
      industry: String(value.industry || "").trim(),
      location: String(value.location || "").trim(),
      publicLinks: publicLinks.filter(isHttpUrl).slice(0, 10),
      supportingInfo: String(value.supportingInfo || "").trim(),
      verificationStatus: status,
      submittedAt: String(value.submittedAt || ""),
      reviewerFeedback: String(value.reviewerFeedback || "").trim()
    };
  }

  function readCompanyProfile() {
    try {
      var raw = window.localStorage.getItem(COMPANY_PROFILE_KEY);
      if (raw === null) return { profile: null, error: "" };
      var parsed = JSON.parse(raw);
      var profile = normalizeCompanyProfile(parsed);
      if (!profile) return { profile: null, error: "Company profile data is malformed and was not changed." };
      return { profile: profile, error: "" };
    } catch (error) {
      return { profile: null, error: "Company profile could not be read from this browser. No data was changed." };
    }
  }

  function companyTrustForName(name) {
    var result = readCompanyProfile();
    var profile = result.profile;
    if (!profile || !name || profile.companyName.toLowerCase() !== String(name).trim().toLowerCase()) {
      return { status: "Not Submitted", profile: null };
    }
    return { status: profile.verificationStatus, profile: profile };
  }

  function readJobReports() {
    try {
      var raw = window.localStorage.getItem(JOB_REPORTS_KEY);
      if (raw === null) return { reports: [], error: "" };
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return { reports: [], error: "Saved reports are malformed and were not changed." };
      if (parsed.some(function (report) {
        return !report || typeof report !== "object" || !report.id || !report.jobId || !report.reason || !report.timestamp;
      })) return { reports: [], error: "Saved reports contain malformed records and were not changed." };
      return {
        reports: parsed.map(function (report) {
          var targetType = report.targetType === "recruiter" ? "recruiter" : "job";
          var status = ["Pending", "Under Review", "Resolved", "Dismissed"].indexOf(report.status) >= 0
            ? report.status
            : "Pending";
          return {
            id: String(report.id),
            jobId: String(report.jobId),
            targetType: targetType,
            targetId: String(report.targetId || (targetType === "recruiter"
              ? report.companyId || report.companyName || report.recruiterListingId || report.jobId
              : report.jobId)),
            recruiterListingId: String(report.recruiterListingId || ""),
            companyId: String(report.companyId || ""),
            companyName: String(report.companyName || ""),
            jobTitle: String(report.jobTitle || ""),
            reason: String(report.reason),
            explanation: String(report.explanation || ""),
            timestamp: String(report.timestamp),
            status: status,
            updatedAt: String(report.updatedAt || report.timestamp)
          };
        }),
        error: ""
      };
    } catch (error) {
      return { reports: [], error: "Reports could not be read from this browser. No data was changed." };
    }
  }

  var jobReportReasons = [
    "Fake or misleading job",
    "Payment or registration fee scam",
    "Suspicious recruiter",
    "Incorrect job details",
    "Duplicate listing",
    "Other"
  ];

  function reportTargetId(job, targetType) {
    if (targetType !== "recruiter") return String(job.id);
    return String(job.companyProfileId || String(job.company || "").trim().toLowerCase() || job.recruiterListingId || job.id);
  }

  function reportMatchesTarget(report, job, targetType, targetId) {
    if (report.targetType !== targetType) return false;
    if (report.targetId === targetId) return true;
    if (targetType === "job") return String(report.jobId) === String(job.id);
    return (job.recruiterListingId && report.recruiterListingId === String(job.recruiterListingId)) ||
      (job.company && report.companyName.toLowerCase() === String(job.company).trim().toLowerCase());
  }

  function reportsUnderReviewForJob(job, reports) {
    return reports.filter(function (report) {
      if (report.status !== "Under Review") return false;
      if (report.targetType === "job") {
        return String(report.jobId) === String(job.id) ||
          (!!job.recruiterListingId && report.recruiterListingId === String(job.recruiterListingId));
      }
      return (!!job.recruiterListingId && report.recruiterListingId === String(job.recruiterListingId)) ||
        (!!job.company && report.companyName.toLowerCase() === String(job.company).trim().toLowerCase());
    });
  }

  function jobReportWarning(job) {
    var stored = readJobReports();
    if (stored.error) return "";
    var flagged = reportsUnderReviewForJob(job, stored.reports);
    if (!flagged.length) return "";
    return '<div class="job-report-warning" role="note"><strong>Report under review</strong><span>One or more local reports are marked for review. This is not a finding of wrongdoing.</span></div>';
  }

  function jobReportWarningElement(job) {
    var stored = readJobReports();
    if (stored.error) return null;
    var flagged = reportsUnderReviewForJob(job, stored.reports);
    if (!flagged.length) return null;
    var warning = el("aside", "job-report-warning");
    warning.setAttribute("role", "note");
    warning.appendChild(el("strong", null, "Report under review"));
    warning.appendChild(el("p", null, "One or more reports are marked for review in this local demo. This is not a finding that the job or recruiter is fraudulent."));
    warning.appendChild(el("p", null, "For your safety, never pay job registration fees, verify recruiter identity independently, and do not share sensitive financial information."));
    return warning;
  }

  function buildReportView(job, targetType) {
    var view = el("section", "jv__view jv__report-view");
    view.id = "jv-report-view";
    var isRecruiterReport = targetType === "recruiter";
    var title = isRecruiterReport ? "Report Recruiter" : "Report Job";
    var heading = el("h3", "jv__title", title);
    heading.id = "jv-report-title";
    heading.tabIndex = -1;
    view.appendChild(heading);
    view.appendChild(el("p", "jv__note", (isRecruiterReport ? "Recruiter/company associated with " : "Listing: ") + job.title + " · " + job.company));
    view.appendChild(el("p", "jv__missing", "Reports are saved only in this browser. They are not automatically investigated, verified, or resolved."));

    var safety = el("aside", "report-safety");
    safety.setAttribute("aria-label", "Job search safety guidance");
    safety.appendChild(el("strong", null, "Stay safe while job searching"));
    safety.appendChild(el("p", null, "Never pay a registration fee for a job. Verify recruiter identity independently and avoid sharing sensitive financial information."));
    view.appendChild(safety);

    var form = el("div", "jv__report-form");
    form.id = "jv-report-form";
    var reasonLabel = el("label", null, "Reason for report");
    reasonLabel.htmlFor = "jv-report-reason";
    form.appendChild(reasonLabel);
    var reason = el("select", "select");
    reason.id = "jv-report-reason";
    reason.required = true;
    reason.setAttribute("aria-describedby", "jv-report-error");
    reason.appendChild(new Option("Choose a reason", ""));
    jobReportReasons.forEach(function (name) { reason.appendChild(new Option(name, name)); });
    form.appendChild(reason);
    var explanationLabel = el("label", null, "Description (optional)");
    explanationLabel.htmlFor = "jv-report-explanation";
    form.appendChild(explanationLabel);
    var explanation = el("textarea", "input");
    explanation.id = "jv-report-explanation";
    explanation.rows = 4;
    explanation.maxLength = 1000;
    explanation.setAttribute("aria-describedby", "jv-report-character-count jv-report-error");
    form.appendChild(explanation);
    var characterCount = el("span", "jv__missing", "0 / 1000 characters");
    characterCount.id = "jv-report-character-count";
    form.appendChild(characterCount);
    var error = el("p", "field-error");
    error.id = "jv-report-error";
    error.setAttribute("role", "status");
    error.setAttribute("aria-live", "polite");
    form.appendChild(error);
    var actions = el("div", "jv__actions");
    var submit = el("button", "btn btn--primary", "Submit report");
    submit.type = "button";
    submit.dataset.action = "report-submit";
    actions.appendChild(submit);
    var back = el("button", "btn btn--secondary", "Back to job details");
    back.type = "button";
    back.dataset.action = "back";
    actions.appendChild(back);
    form.appendChild(actions);
    view.appendChild(form);
    explanation.addEventListener("input", function () {
      characterCount.textContent = explanation.value.length + " / 1000 characters";
    });
    return view;
  }

  function openJobReportForm(job, button, targetType) {
    if (!detail || String(detail.job.id) !== String(job.id)) showDetails(job);
    if (!detail) return;
    detail.reportTarget = targetType === "recruiter" ? "recruiter" : "job";
    if (button) button.setAttribute("aria-expanded", "true");
    showView("report");
  }

  function saveJobReport(job) {
    var form = $("#jv-report-form", jobView);
    var reason = $("#jv-report-reason", form);
    var explanation = $("#jv-report-explanation", form);
    var error = $("#jv-report-error", form);
    var submit = $('[data-action="report-submit"]', form);
    if (!reason || jobReportReasons.indexOf(reason.value) === -1) {
      if (error) error.textContent = "Choose a reason before recording the report.";
      if (reason) reason.focus();
      return;
    }
    if (submit && submit.disabled) return;
    if (submit) submit.disabled = true;
    var stored = readJobReports();
    if (stored.error) {
      if (error) error.textContent = stored.error;
      if (submit) submit.disabled = false;
      return;
    }
    var targetType = detail && detail.reportTarget === "recruiter" ? "recruiter" : "job";
    var targetId = reportTargetId(job, targetType);
    if (stored.reports.some(function (report) {
      return reportMatchesTarget(report, job, targetType, targetId) && report.reason === reason.value;
    })) {
      if (error) error.textContent = "A report with this reason is already recorded for this " + targetType + " in this browser.";
      if (submit) submit.disabled = false;
      return;
    }
    var reports = stored.reports.concat([{
      id: "report_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      jobId: String(job.id),
      targetType: targetType,
      targetId: targetId,
      recruiterListingId: String(job.recruiterListingId || ""),
      companyId: String(job.companyProfileId || ""),
      companyName: String(job.company || ""),
      jobTitle: String(job.title || ""),
      reason: reason.value,
      explanation: explanation ? explanation.value.trim() : "",
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "Pending"
    }]);
    try {
      window.localStorage.setItem(JOB_REPORTS_KEY, JSON.stringify(reports));
    } catch (storageError) {
      if (error) error.textContent = "Report could not be saved in this browser. Check storage and try again.";
      if (submit) submit.disabled = false;
      return;
    }
    if (error) {
      error.className = "auth-status";
      error.textContent = "Report submitted to this browser-local demo queue with Pending status. No real reviewer has been notified.";
    }
    setStatus("Report saved locally as Pending. It has not been reviewed or resolved.");
    refreshJobReportViews();
  }

  function formatReportDate(value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
  }

  function skillEvidenceReviewEntries(profile) {
    var normalized = normalizeStudentProfile(profile || readDemoProfile());
    var entries = [];
    normalized.skills.forEach(function (skill) {
      if (!Array.isArray(skill.evidenceItems) || !skill.evidenceItems.length) return;
      skill.evidenceItems.forEach(function (entry) {
        entries.push({
          type: "skill-evidence",
          id: entry.id,
          status: skill.verificationStatus || "Evidence Submitted",
          skillId: skill.id,
          skillName: skill.name,
          evidenceLabel: entry.label || "Evidence",
          url: entry.url || "",
          description: entry.description || "No description supplied.",
          submittedAt: entry.submittedAt || skill.submittedAt || new Date().toISOString(),
          reviewedAt: entry.reviewedAt || skill.reviewedAt || "",
          reviewFeedback: entry.reviewFeedback || skill.reviewFeedback || "",
          note: skillVerificationExplanation(skill.verificationStatus || "Evidence Submitted")
        });
      });
    });
    return entries;
  }

  function renderSkillEvidenceReviewQueue(entries, selectedStatus) {
    var filtered = entries.filter(function (entry) {
      return selectedStatus === "all" || entry.status === selectedStatus;
    }).slice().sort(function (a, b) {
      return String(b.submittedAt).localeCompare(String(a.submittedAt));
    });
    if (!filtered.length) return "";
    return filtered.map(function (entry) {
      var actions = "";
      if (entry.status === "Evidence Submitted") {
        actions = '<button class="btn btn--secondary" type="button" data-skill-evidence-review-status="' + escapeHtml(entry.skillId) + '" data-skill-evidence-review-item="' + escapeHtml(entry.id) + '" data-next-skill-evidence-status="Under Review">Mark Under Review</button>' +
          '<button class="btn btn--text" type="button" data-skill-evidence-review-status="' + escapeHtml(entry.skillId) + '" data-skill-evidence-review-item="' + escapeHtml(entry.id) + '" data-next-skill-evidence-status="Verified">Verify</button>' +
          '<button class="btn btn--text" type="button" data-skill-evidence-review-status="' + escapeHtml(entry.skillId) + '" data-skill-evidence-review-item="' + escapeHtml(entry.id) + '" data-next-skill-evidence-status="Rejected / More Evidence Needed">Reject / More evidence</button>';
      } else if (entry.status === "Under Review") {
        actions = '<button class="btn btn--secondary" type="button" data-skill-evidence-review-status="' + escapeHtml(entry.skillId) + '" data-skill-evidence-review-item="' + escapeHtml(entry.id) + '" data-next-skill-evidence-status="Verified">Verify</button>' +
          '<button class="btn btn--text" type="button" data-skill-evidence-review-status="' + escapeHtml(entry.skillId) + '" data-skill-evidence-review-item="' + escapeHtml(entry.id) + '" data-next-skill-evidence-status="Rejected / More Evidence Needed">Reject / More evidence</button>';
      }
      var proofLink = entry.url ? '<a class="link" href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener noreferrer">Open submitted evidence</a>' : "";
      return '<li class="review-queue-item">' +
        '<div class="review-queue-item__head"><div><h3>' + escapeHtml(entry.skillName) + '</h3><p>Skill evidence review</p></div><span class="review-status review-status--' + escapeHtml((entry.status || "Evidence Submitted").toLowerCase().replace(/\s+/g, "-")) + '">' + escapeHtml(entry.status) + '</span></div>' +
        '<dl class="review-queue-item__details">' +
          '<dt>Evidence type</dt><dd>' + escapeHtml(entry.evidenceLabel) + '</dd>' +
          '<dt>Submitted</dt><dd>' + escapeHtml(formatReportDate(entry.submittedAt)) + '</dd>' +
          '<dt>Evidence summary</dt><dd>' + escapeHtml(entry.description) + '</dd>' +
          '<dt>Link</dt><dd>' + (proofLink || "No public link was supplied.") + '</dd>' +
          '<dt>Reviewer feedback</dt><dd>' + escapeHtml(entry.reviewFeedback || "No feedback recorded yet.") + '</dd>' +
          '<dt>Status note</dt><dd>' + escapeHtml(entry.note) + '</dd>' +
        '</dl>' +
        '<div class="review-queue-item__actions">' + actions + '</div>' +
      '</li>';
    }).join("");
  }

  function renderAdminReviewQueue() {
    var list = document.getElementById("admin-review-list");
    var feedback = document.getElementById("admin-review-feedback");
    if (!list) return;
    var stored = readJobReports();
    if (stored.error) {
      if (feedback) feedback.textContent = stored.error;
      list.innerHTML = "";
      return;
    }
    if (feedback) feedback.textContent = "";
    var filter = document.getElementById("admin-review-status-filter");
    var selectedStatus = filter ? filter.value : "all";
    var reports = stored.reports.filter(function (report) {
      return selectedStatus === "all" || report.status === selectedStatus;
    });
    var evidenceEntries = skillEvidenceReviewEntries(readDemoProfile());
    var evidence = renderSkillEvidenceReviewQueue(evidenceEntries, selectedStatus);
    var reportMarkup = reports.slice().sort(function (a, b) {
      return String(b.timestamp).localeCompare(String(a.timestamp));
    }).map(function (report) {
      var subject = report.targetType === "recruiter" ? report.companyName || "Recruiter not named" : report.jobTitle || "Job listing";
      var subheading = report.targetType === "recruiter"
        ? "Recruiter/company report · associated job: " + (report.jobTitle || "Not recorded")
        : "Job report · " + (report.companyName || "Company not recorded");
      var actions = "";
      if (report.status === "Pending") {
        actions = '<button class="btn btn--secondary" type="button" data-report-status="' + escapeHtml(report.id) + '" data-next-report-status="Under Review">Mark Under Review</button>' +
          '<button class="btn btn--text" type="button" data-report-status="' + escapeHtml(report.id) + '" data-next-report-status="Resolved">Resolve</button>' +
          '<button class="btn btn--text" type="button" data-report-status="' + escapeHtml(report.id) + '" data-next-report-status="Dismissed">Dismiss</button>';
      } else if (report.status === "Under Review") {
        actions = '<button class="btn btn--secondary" type="button" data-report-status="' + escapeHtml(report.id) + '" data-next-report-status="Resolved">Resolve</button>' +
          '<button class="btn btn--text" type="button" data-report-status="' + escapeHtml(report.id) + '" data-next-report-status="Dismissed">Dismiss</button>';
      }
      return '<li class="review-queue-item">' +
        '<div class="review-queue-item__head"><div><h3>' + escapeHtml(subject) + '</h3><p>' + escapeHtml(subheading) + '</p></div><span class="review-status review-status--' + escapeHtml(report.status.toLowerCase().replace(/\s+/g, "-")) + '">' + escapeHtml(report.status) + '</span></div>' +
        '<dl class="review-queue-item__details">' +
          '<dt>Reason</dt><dd>' + escapeHtml(report.reason) + '</dd>' +
          '<dt>Description</dt><dd>' + escapeHtml(report.explanation || "No description supplied.") + '</dd>' +
          '<dt>Report date</dt><dd>' + escapeHtml(formatReportDate(report.timestamp)) + '</dd>' +
          '<dt>Status updated</dt><dd>' + escapeHtml(formatReportDate(report.updatedAt)) + '</dd>' +
        '</dl>' +
        (report.status === "Under Review" ? '<p class="review-queue-item__notice">Under review is a demo workflow state, not a finding that this person or listing is fraudulent.</p>' : "") +
        '<div class="review-queue-item__actions">' + actions + '</div>' +
      '</li>';
    }).join("");
    var queueHtml = reportMarkup + evidence;
    if (!queueHtml) {
      var title = stored.reports.length ? "No reports or evidence match this status" : "No reports or evidence have been submitted";
      var text = stored.reports.length ? "Choose another review status to see saved entries." : "Reports and skill evidence submitted from this browser will appear here in this local demo.";
      list.innerHTML = '<li class="review-queue-empty"><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(text) + '</p></li>';
      return;
    }
    list.innerHTML = queueHtml;
  }

  function setSkillEvidenceReviewStatus(skillId, evidenceId, nextStatus) {
    var allowed = ["Under Review", "Verified", "Rejected / More Evidence Needed"];
    if (allowed.indexOf(nextStatus) === -1) return;
    var feedbackEl = document.getElementById("admin-review-feedback");
    var profile = normalizeStudentProfile(readDemoProfile());
    var skill = profile.skills.find(function (item) { return item.id === skillId; });
    if (!skill) {
      if (feedbackEl) feedbackEl.textContent = "That skill is no longer available in this local profile.";
      return;
    }
    var entry = Array.isArray(skill.evidenceItems) ? skill.evidenceItems.find(function (item) { return item.id === evidenceId; }) : null;
    if (!entry) {
      if (feedbackEl) feedbackEl.textContent = "That evidence item is no longer available in this local profile.";
      return;
    }
    var note = window.prompt("Add a short reviewer note for " + skill.name + " (optional):", entry.reviewFeedback || "");
    if (note === null) return;
    entry.reviewStatus = nextStatus;
    entry.reviewedAt = new Date().toISOString();
    entry.reviewFeedback = String(note || "").trim();
    skill.verificationStatus = nextStatus;
    skill.reviewedAt = entry.reviewedAt;
    skill.reviewFeedback = entry.reviewFeedback;
    profile.updatedAt = new Date().toISOString();
    if (!writeDemoProfile(profile)) {
      if (feedbackEl) feedbackEl.textContent = "The review status could not be saved in this browser. No local review change was made.";
      return;
    }
    renderAdminReviewQueue();
    renderStudentSkillEditor();
    if (feedbackEl) feedbackEl.textContent = "Skill evidence status updated to " + nextStatus + " in this browser-local demo.";
  }

  function setJobReportStatus(reportId, nextStatus) {
    if (["Under Review", "Resolved", "Dismissed"].indexOf(nextStatus) === -1) return;
    if ((nextStatus === "Resolved" || nextStatus === "Dismissed") &&
        !window.confirm("Set this local demo report to " + nextStatus + "? This does not contact anyone or complete a real investigation.")) return;
    var stored = readJobReports();
    var feedback = document.getElementById("admin-review-feedback");
    if (stored.error) {
      if (feedback) feedback.textContent = stored.error;
      return;
    }
    var report = stored.reports.find(function (item) { return item.id === reportId; });
    if (!report) {
      if (feedback) feedback.textContent = "That report is no longer available in the local queue.";
      renderAdminReviewQueue();
      return;
    }
    if (report.status === "Resolved" || report.status === "Dismissed") {
      if (feedback) feedback.textContent = "This report is already " + report.status + " and was not changed.";
      return;
    }
    report.status = nextStatus;
    report.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(JOB_REPORTS_KEY, JSON.stringify(stored.reports));
    } catch (storageError) {
      if (feedback) feedback.textContent = "The review status could not be saved in this browser. No status was changed.";
      return;
    }
    renderAdminReviewQueue();
    refreshJobReportViews();
    if (feedback) feedback.textContent = "Local demo status updated to " + nextStatus + ". No external notification was sent.";
  }

  function refreshJobReportViews() {
    if (typeof render === "function") render();
    if (typeof renderStudentDashboard === "function") renderStudentDashboard();
    if (document.getElementById("demo-review-queue") && !document.getElementById("demo-review-queue").hidden) renderAdminReviewQueue();
  }

  function companyProfileFormData() {
    var current = readCompanyProfile();
    var old = current.profile || {};
    var linksText = document.getElementById("company-profile-links").value.trim();
    return {
      id: old.id || "company_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      companyName: document.getElementById("company-profile-name").value.trim(),
      website: document.getElementById("company-profile-website").value.trim(),
      emailDomain: document.getElementById("company-profile-domain").value.trim().toLowerCase(),
      industry: document.getElementById("company-profile-industry").value.trim(),
      location: document.getElementById("company-profile-location").value.trim(),
      description: document.getElementById("company-profile-description").value.trim(),
      publicLinks: linksText ? linksText.split(",").map(function (link) { return link.trim(); }).filter(Boolean) : [],
      supportingInfo: document.getElementById("company-profile-support").value.trim(),
      verificationStatus: old.verificationStatus || "Not Submitted",
      submittedAt: old.submittedAt || "",
      reviewerFeedback: old.reviewerFeedback || ""
    };
  }

  function companyProfileErrors(profile, requireVerificationDetails) {
    var errors = {};
    if (!profile.companyName) errors["company-profile-name"] = "Enter the company name.";
    if ((requireVerificationDetails && !profile.website) || (profile.website && !isHttpUrl(profile.website))) {
      errors["company-profile-website"] = "Enter a valid official HTTP or HTTPS website URL.";
    }
    if ((requireVerificationDetails && !profile.emailDomain) ||
        (profile.emailDomain && !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(profile.emailDomain))) {
      errors["company-profile-domain"] = "Enter a business email domain such as example.com, without an @.";
    }
    if (profile.publicLinks.some(function (link) { return !isHttpUrl(link); })) errors["company-profile-links"] = "Each public link must be a valid HTTP or HTTPS URL.";
    return errors;
  }

  function renderCompanyTrustCenter() {
    var result = readCompanyProfile();
    var form = document.getElementById("company-profile-form");
    if (!form) return;
    if (result.error) {
      document.getElementById("company-profile-message").textContent = result.error;
      document.getElementById("company-verification-status").textContent = "Unavailable";
      document.getElementById("company-verification-explanation").textContent = "Saved company data could not be read safely.";
      return;
    }
    var profile = result.profile;
    if (profile) {
      [
        ["company-profile-name", profile.companyName], ["company-profile-website", profile.website],
        ["company-profile-domain", profile.emailDomain], ["company-profile-industry", profile.industry],
        ["company-profile-location", profile.location], ["company-profile-description", profile.description],
        ["company-profile-links", profile.publicLinks.join(", ")], ["company-profile-support", profile.supportingInfo]
      ].forEach(function (pair) { document.getElementById(pair[0]).value = pair[1] || ""; });
    }
    var status = profile ? profile.verificationStatus : "Not Submitted";
    var statusBadge = document.getElementById("company-verification-status");
    statusBadge.textContent = status;
    statusBadge.className = "recruiter-status recruiter-status--" +
      (status === "Pending Review" ? "pending" : status === "Rejected" ? "rejected" : "unpublished");
    var submitted = document.getElementById("company-submission-date");
    submitted.hidden = !profile || !validRecruiterTimestamp(profile.submittedAt);
    submitted.textContent = submitted.hidden ? "" : "Request submitted: " + formatRecruiterDate(profile.submittedAt);
    document.getElementById("company-verification-explanation").textContent = {
      "Not Submitted": "No verification request has been submitted. Company information is provided by the recruiter and is not independently checked.",
      "Pending Review": "A demo request was saved locally. No authorized reviewer or verification process is connected, so this is not an approval.",
      "Rejected": "The browser-local record is marked Rejected. This demo cannot verify that a reviewer made this decision. Update the information and resubmit if appropriate."
    }[status];
    document.getElementById("company-reviewer-feedback").textContent = profile && profile.reviewerFeedback
      ? profile.reviewerFeedback
      : "No reviewer feedback is available.";
    document.getElementById("company-profile-message").textContent = "";
  }

  function saveCompanyProfile(submitRequest) {
    var current = readCompanyProfile();
    if (current.error) {
      document.getElementById("company-profile-message").textContent = current.error;
      return;
    }
    var profile = companyProfileFormData();
    var errors = companyProfileErrors(profile, submitRequest);
    ["company-profile-name", "company-profile-website", "company-profile-domain", "company-profile-links"].forEach(function (id) {
      setFieldError(id, errors[id] || "");
    });
    if (Object.keys(errors).length) {
      document.getElementById("company-profile-message").textContent = submitRequest
        ? "Complete the company name, official website and business email domain, and fix any invalid public links before submitting."
        : "Enter a company name and fix any invalid website, email domain, or public links before saving.";
      var first = document.getElementById(Object.keys(errors)[0]);
      if (first) first.focus();
      return;
    }
    if (submitRequest) {
      if (!window.confirm("Submit this company information as a local demo verification request? It will remain Pending Review and is not reviewed or verified by NEXORA.")) return;
      profile.verificationStatus = "Pending Review";
      profile.submittedAt = new Date().toISOString();
      profile.reviewerFeedback = "";
    }
    try {
      window.localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      document.getElementById("company-profile-message").textContent = "Company profile could not be saved in this browser. Check storage and try again.";
      return;
    }
    renderCompanyTrustCenter();
    document.getElementById("company-profile-message").textContent = submitRequest
      ? "Demo verification request saved locally as Pending Review. No reviewer was notified."
      : "Company profile saved in this browser.";
    refreshPublishedJobs();
  }

  function normalizeRecruiterListings(value) {
    if (!Array.isArray(value)) return null;
    var normalized = value.map(function (listing) {
      var item = listing && typeof listing === "object" ? listing : {};
      var status = ["Draft", "Published", "Closed", "Unpublished", "Expired"].indexOf(item.status) >= 0 ? item.status : "Draft";
      var skills = Array.isArray(item.requiredSkills) ? item.requiredSkills : String(item.requiredSkills || "").split(",");
      var applyUrl = String(item.applyUrl || "").trim();
      if (applyUrl) {
        try {
          var parsedUrl = new URL(applyUrl);
          if ((parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") || !parsedUrl.hostname || parsedUrl.username || parsedUrl.password) applyUrl = "";
          else applyUrl = parsedUrl.href;
        } catch (error) { applyUrl = ""; }
      }
      var expiryDate = item.expiryDate && validRecruiterTimestamp(item.expiryDate)
        ? String(item.expiryDate)
        : (status === "Published" || status === "Expired") && (item.lastRecruiterActivityAt || item.publishedAt || item.updatedAt || item.createdAt)
          ? recruiterListingExpiryDate({ lastRecruiterActivityAt: item.lastRecruiterActivityAt || item.publishedAt || item.updatedAt || item.createdAt })
          : "";
      return {
        id: String(item.id || ""),
        title: String(item.title || "").trim(),
        company: String(item.company || "").trim(),
        description: String(item.description || "").trim(),
        location: String(item.location || "").trim(),
        jobType: String(item.jobType || "").trim(),
        workMode: String(item.workMode || "").trim(),
        requiredSkills: skills.map(function (skill) { return String(skill || "").trim(); }).filter(Boolean),
        eligibility: String(item.eligibility || "").trim(),
        experience: String(item.experience || "").trim(),
        deadline: String(item.deadline || "").trim(),
        salaryMin: item.salaryMin == null ? "" : String(item.salaryMin),
        salaryMax: item.salaryMax == null ? "" : String(item.salaryMax),
        salaryCurrency: String(item.salaryCurrency || "INR"),
        salaryPeriod: String(item.salaryPeriod || "year"),
        applyUrl: applyUrl,
        status: status,
        createdAt: String(item.createdAt || item.updatedAt || ""),
        updatedAt: String(item.updatedAt || item.createdAt || ""),
        publishedAt: String(item.publishedAt || (status === "Published" ? item.updatedAt || item.createdAt || "" : "")),
        lastRecruiterActivityAt: String(item.lastRecruiterActivityAt || (status === "Published" ? item.publishedAt || item.updatedAt || item.createdAt || "" : "")),
        expiryDate: expiryDate,
        activityEvents: Array.isArray(item.activityEvents) ? item.activityEvents.map(function (event) {
          var entry = event && typeof event === "object" ? event : {};
          var type = ["published", "reconfirmed", "application_reviewed", "applicant_status_changed", "closed", "unpublished", "review_required"].indexOf(entry.type) >= 0 ? entry.type : "";
          return { type: type, timestamp: String(entry.timestamp || ""), applicationId: String(entry.applicationId || "") };
        }).filter(function (event) { return !!(event.type && event.timestamp); }).slice(-100) : []
      };
    }).filter(function (listing) { return !!(listing.id && listing.title); });
    var seenIds = {};
    return normalized.filter(function (listing) {
      if (seenIds[listing.id]) return false;
      seenIds[listing.id] = true;
      return true;
    });
  }

  function recruiterJobId(listingId, usedIds) {
    var hash = 2166136261;
    for (var i = 0; i < listingId.length; i++) {
      hash ^= listingId.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    var id = -(Math.abs(hash >>> 0) + 1);
    while (usedIds[id]) id--;
    usedIds[id] = true;
    return id;
  }

  function recruiterListingToJob(listing, id) {
    var salaryMin = Number(listing.salaryMin);
    var salaryMax = Number(listing.salaryMax);
    var companyTrust = companyTrustForName(listing.company);
    var companyProfile = companyTrust.profile;
    var salary = listing.salaryMin && listing.salaryMax ? {
      min: salaryMin,
      max: salaryMax,
      currency: listing.salaryCurrency,
      period: listing.salaryPeriod
    } : null;
    return {
      id: id,
      recruiterListingId: listing.id,
      source: "recruiter-local-demo",
      companyProfileId: companyProfile ? companyProfile.id : "",
      companyTrustStatus: companyTrust.status,
      companyWebsite: companyProfile ? companyProfile.website : "",
      companyEmailDomain: companyProfile ? companyProfile.emailDomain : "",
      companyDescription: companyProfile ? companyProfile.description : "",
      companyIndustry: companyProfile ? companyProfile.industry : "",
      companyLocation: companyProfile ? companyProfile.location : "",
      companyPublicLinks: companyProfile ? companyProfile.publicLinks.slice() : [],
      title: listing.title,
      company: listing.company,
      logo: null,
      category: "Recruiter listing",
      type: listing.jobType === "Internship" ? "Internship" : "Job",
      employmentType: ["Part-time", "Contract", "Freelance"].indexOf(listing.jobType) >= 0 ? listing.jobType : null,
      mode: listing.workMode,
      location: listing.location,
      salary: salary,
      experience: listing.experience || null,
      skills: listing.requiredSkills.slice(),
      description: listing.description || null,
      postedDate: listing.createdAt ? listing.createdAt.slice(0, 10) : null,
      deadline: listing.deadline || null,
      applyUrl: listing.applyUrl || null,
      status: "UNVERIFIED",
      evidenceUrl: null,
      tags: ["Recruiter-submitted demo listing"],
      qualifications: listing.eligibility ? [listing.eligibility] : [],
      responsibilities: [],
      benefits: []
    };
  }

  function recruiterJobIds(listings, baseJobs) {
    var usedIds = {};
    var ids = {};
    (baseJobs || []).forEach(function (job) { usedIds[job.id] = true; });
    listings.slice().sort(function (a, b) { return a.id.localeCompare(b.id); }).forEach(function (listing) {
      ids[listing.id] = recruiterJobId(listing.id, usedIds);
    });
    return ids;
  }

  function getPublishedRecruiterJobs(baseJobs) {
    var listings = getCurrentRecruiterListings();
    if (!listings) return [];
    var ids = recruiterJobIds(listings, baseJobs);
    return listings.filter(function (listing) { return listing.status === "Published"; })
      .map(function (listing) { return recruiterListingToJob(listing, ids[listing.id]); });
  }

  function cleanSavedJobIds(raw, jobs) {
    var cleaned = Jobs.cleanSavedIds(raw, jobs);
    var listings = getCurrentRecruiterListings();
    if (!Array.isArray(raw) || !listings) return cleaned;
    var recruiterIds = recruiterJobIds(listings, baseJobs);
    var knownIds = {};
    Object.keys(recruiterIds).forEach(function (listingId) { knownIds[recruiterIds[listingId]] = true; });
    raw.forEach(function (id) {
      if (typeof id === "number" && isFinite(id) && Math.floor(id) === id && knownIds[id] && cleaned.indexOf(id) === -1) cleaned.push(id);
    });
    return cleaned;
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

  function validRecruiterTimestamp(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    var time = Date.parse(value);
    return isFinite(time) && time > 0 && time <= Date.now();
  }

  function recruiterListingExpiryDate(listing) {
    if (!listing) return null;
    if (listing.expiryDate && validRecruiterTimestamp(listing.expiryDate)) return listing.expiryDate;
    var reviewDeadline = recruiterReviewDeadline(listing);
    return reviewDeadline ? new Date(reviewDeadline).toISOString() : null;
  }

  function readRecruiterReminderState() {
    try {
      var raw = window.localStorage.getItem(RECRUITER_REMINDERS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeRecruiterReminderState(state) {
    try {
      window.localStorage.setItem(RECRUITER_REMINDERS_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearRecruiterReminderState(listingId) {
    if (!listingId) return;
    var state = readRecruiterReminderState();
    if (!state[listingId]) return;
    delete state[listingId];
    writeRecruiterReminderState(state);
  }

  function dismissRecruiterReminder(listingId) {
    if (!listingId) return;
    var state = readRecruiterReminderState();
    state[listingId] = { dismissedAt: new Date().toISOString(), type: "expiry" };
    writeRecruiterReminderState(state);
    renderRecruiterPortal();
  }

  function addRecruiterActivity(listing, type, timestamp, applicationId) {
    listing.activityEvents = Array.isArray(listing.activityEvents) ? listing.activityEvents : [];
    var event = { type: type, timestamp: timestamp };
    if (applicationId) event.applicationId = applicationId;
    listing.activityEvents.push(event);
    listing.activityEvents = listing.activityEvents.slice(-100);
    listing.lastRecruiterActivityAt = timestamp;
  }

  function applyRecruiterReviewPolicy(listings, now) {
    var changed = false;
    var checkedAt = now || new Date();
    listings.forEach(function (listing) {
      if (listing.status !== "Published") return;
      var activityAt = listing.lastRecruiterActivityAt || listing.publishedAt;
      var expiryDate = recruiterListingExpiryDate(listing) || new Date(Date.parse(activityAt || checkedAt.toISOString()) + RECRUITER_REVIEW_WINDOW_MS).toISOString();
      listing.expiryDate = expiryDate;
      var expired = !validRecruiterTimestamp(activityAt) || checkedAt.getTime() >= Date.parse(expiryDate);
      if (!expired) return;
      listing.status = "Expired";
      listing.updatedAt = checkedAt.toISOString();
      listing.activityEvents = Array.isArray(listing.activityEvents) ? listing.activityEvents : [];
      listing.activityEvents.push({ type: "review_required", timestamp: checkedAt.toISOString() });
      listing.activityEvents = listing.activityEvents.slice(-100);
      changed = true;
    });
    return changed;
  }

  function getCurrentRecruiterListings() {
    var listings = readRecruiterListings();
    if (!listings) return null;
    if (applyRecruiterReviewPolicy(listings) && !writeRecruiterListings(listings)) return null;
    return listings;
  }

  function recruiterReviewDeadline(listing) {
    var activityAt = listing.lastRecruiterActivityAt || listing.publishedAt;
    if (!validRecruiterTimestamp(activityAt)) return null;
    return Date.parse(activityAt) + RECRUITER_REVIEW_WINDOW_MS;
  }

  function recruiterReviewSummary(listing, now) {
    var deadline = recruiterReviewDeadline(listing);
    if (listing.status === "Expired") return { text: "Needs review · expired from active opportunities", urgent: true };
    if (listing.status !== "Published") return { text: "Review window is not active for this status.", urgent: false };
    if (deadline === null) return { text: "Needs review · activity date unavailable", urgent: true };
    var remaining = deadline - (now || Date.now());
    if (remaining <= 0) return { text: "Needs review now · 15-day activity window reached", urgent: true };
    var days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return { text: "Review due " + formatRecruiterDate(new Date(deadline).toISOString()) + " · " + days + (days === 1 ? " day remaining" : " days remaining"), urgent: days <= 3 };
  }

  function recruiterActivityLabel(type) {
    return {
      published: "Published",
      reconfirmed: "Vacancy reconfirmed",
      application_reviewed: "Application reviewed",
      applicant_status_changed: "Applicant status changed",
      closed: "Job closed",
      unpublished: "Job unpublished",
      review_required: "15-day review required"
    }[type] || "Recruiter activity";
  }

  function companyTrustLabel(status) {
    if (status === "Verified") return "Company verified";
    if (status === "Pending Review") return "Company pending review";
    if (status === "Rejected") return "Company request rejected";
    return "Company not verified";
  }

  function companyTrustExplanation(status) {
    if (status === "Verified") return "Approved through a real, documented review process.";
    if (status === "Pending Review") return "A local demo request was saved; no reviewer is connected and this is not approval.";
    if (status === "Rejected") return "A request is marked rejected; this local demo does not provide reviewer decisions.";
    return "No completed company verification. Details are recruiter-provided and not independently checked.";
  }

  function companyTrustClass(status) {
    return status === "Verified" ? "verified" : status === "Pending Review" ? "pending" :
      status === "Rejected" ? "rejected" : "not-submitted";
  }

  function recordRecruiterListingActivity(listings, listingId, type, applicationId, timestamp) {
    var at = timestamp || new Date().toISOString();
    var found = false;
    listings.forEach(function (listing) {
      if (listing.id !== listingId) return;
      found = true;
      addRecruiterActivity(listing, type, at, applicationId);
      if (listing.status === "Published") listing.updatedAt = at;
    });
    return found;
  }

  function formatRecruiterDate(value) {
    if (!value || isNaN(Date.parse(value))) return "Not provided";
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
  }

  function recruiterListingMarkup(listing) {
    var statusClass = listing.status.toLowerCase();
    var displayStatus = listing.status === "Expired" ? "Needs Review" : listing.status;
    var review = recruiterReviewSummary(listing);
    var actions = '<button class="btn btn--secondary" type="button" data-recruiter-edit="' + escapeHtml(listing.id) + '">Edit</button>' +
      '<button class="btn btn--text" type="button" data-recruiter-preview="' + escapeHtml(listing.id) + '">Preview</button>';
    if (listing.status === "Expired" || listing.status === "Published") actions += '<button class="btn btn--primary" type="button" data-recruiter-reconfirm="' + escapeHtml(listing.id) + '">Reconfirm Vacancy</button>';
    else if (listing.status !== "Published") actions += '<button class="btn btn--secondary" type="button" data-recruiter-status="' + escapeHtml(listing.id) + '" data-next-status="Published">' + (listing.status === "Closed" ? "Reopen &amp; publish" : "Publish") + '</button>';
    if (listing.status === "Published") actions += '<button class="btn btn--text" type="button" data-recruiter-status="' + escapeHtml(listing.id) + '" data-next-status="Unpublished">Unpublish</button>';
    if (listing.status !== "Closed") actions += '<button class="btn btn--text" type="button" data-recruiter-status="' + escapeHtml(listing.id) + '" data-next-status="Closed">Close</button>';
    actions += '<button class="btn btn--text recruiter-delete" type="button" data-recruiter-delete="' + escapeHtml(listing.id) + '">Delete</button>';
    return '<li class="recruiter-listing">' +
      '<div class="recruiter-listing__content">' +
        '<div class="recruiter-listing__heading"><h3>' + escapeHtml(listing.title) + '</h3><span class="recruiter-status recruiter-status--' + statusClass + '">' + escapeHtml(displayStatus) + '</span></div>' +
        '<p class="recruiter-listing__company">' + escapeHtml(listing.company) + '</p>' +
        '<p class="recruiter-listing__meta"><strong>Company trust:</strong> ' + escapeHtml(companyTrustLabel(companyTrustForName(listing.company).status)) + '</p>' +
        '<p class="recruiter-listing__meta">' + escapeHtml(listing.location) + ' · ' + escapeHtml(listing.workMode) + ' · ' + escapeHtml(listing.jobType) + '</p>' +
        '<p class="recruiter-listing__meta"><strong>Required skills:</strong> ' + escapeHtml(listing.requiredSkills.join(", ")) + '</p>' +
        '<p class="recruiter-listing__meta"><strong>Created:</strong> ' + escapeHtml(formatRecruiterDate(listing.createdAt)) + ' · <strong>Updated:</strong> ' + escapeHtml(formatRecruiterDate(listing.updatedAt)) + '</p>' +
        '<p class="recruiter-review ' + (review.urgent ? 'recruiter-review--urgent' : '') + '"><strong>Last recruiter activity:</strong> ' + escapeHtml(formatRecruiterDate(listing.lastRecruiterActivityAt)) + '<br><strong>Expiry date:</strong> ' + escapeHtml(formatRecruiterDate(listing.expiryDate || recruiterListingExpiryDate(listing))) + '<br><strong>15-day review:</strong> ' + escapeHtml(review.text) + '</p>' +
        (listing.activityEvents.length ? '<details class="recruiter-activity"><summary>Activity history (' + listing.activityEvents.length + ')</summary><ul>' +
          listing.activityEvents.slice().reverse().map(function (event) {
            return '<li>' + escapeHtml(recruiterActivityLabel(event.type)) + ' · ' + escapeHtml(formatRecruiterDate(event.timestamp)) +
              (event.applicationId ? ' · application ' + escapeHtml(event.applicationId) : '') + '</li>';
          }).join("") + '</ul></details>' : '<p class="recruiter-listing__note">No audit events recorded yet.</p>') +
        (listing.status === "Published" ? '<p class="recruiter-listing__note">Local demo listing, visible only in this browser’s job explorer; not verified or shared.</p>' : '') +
      '</div>' +
      '<div class="recruiter-listing__actions">' + actions + '</div>' +
    '</li>';
  }

  function renderRecruiterPortal() {
    var listings = getCurrentRecruiterListings();
    renderRecruiterApplicants(listings);
    renderRecruiterReminders(listings);
    var dashboardList = document.getElementById("recruiter-dashboard-list");
    var listingsList = document.getElementById("recruiter-listings");
    var totalCount = document.getElementById("recruiter-total-count");
    var activeCount = document.getElementById("recruiter-active-count");
    var draftCount = document.getElementById("recruiter-draft-count");
    var closedCount = document.getElementById("recruiter-closed-count");
    var unpublishedCount = document.getElementById("recruiter-unpublished-count");
    var reviewCount = document.getElementById("recruiter-review-count");
    if (!listings) {
      [totalCount, activeCount, draftCount, closedCount, unpublishedCount, reviewCount].forEach(function (el) { if (el) el.textContent = "—"; });
      [dashboardList, listingsList].forEach(function (el) {
        if (el) el.innerHTML = '<li class="empty--compact"><h3>Listings unavailable</h3><p>Browser-local data could not be read.</p></li>';
      });
      return;
    }
    var active = listings.filter(function (listing) { return listing.status === "Published"; }).length;
    var drafts = listings.filter(function (listing) { return listing.status === "Draft"; }).length;
    var closed = listings.filter(function (listing) { return listing.status === "Closed"; }).length;
    var unpublished = listings.filter(function (listing) { return listing.status === "Unpublished"; }).length;
    var needsReview = listings.filter(function (listing) { return listing.status === "Expired"; }).length;
    if (totalCount) totalCount.textContent = String(listings.length);
    if (activeCount) activeCount.textContent = String(active);
    if (draftCount) draftCount.textContent = String(drafts);
    if (closedCount) closedCount.textContent = String(closed);
    if (unpublishedCount) unpublishedCount.textContent = String(unpublished);
    if (reviewCount) reviewCount.textContent = String(needsReview);
    var ordered = listings.slice().sort(function (a, b) { return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0); });
    var searchValue = (document.getElementById("recruiter-listing-search") || {}).value || "";
    var filterValue = (document.getElementById("recruiter-listing-filter") || {}).value || "all";
    var filtered = ordered.filter(function (listing) {
      return (!searchValue || (listing.title + " " + listing.company).toLowerCase().indexOf(searchValue.trim().toLowerCase()) !== -1) &&
        (filterValue === "all" || listing.status === filterValue);
    });
    if (dashboardList) dashboardList.innerHTML = ordered.length ? ordered.slice(0, 5).map(recruiterListingMarkup).join("") : '<li class="empty--compact"><h3>No job listings yet</h3><p>Create a job draft to manage a listing in this browser.</p></li>';
    if (listingsList && filtered.length) {
      var statusOrder = ["Published", "Expired", "Draft", "Unpublished", "Closed"];
      listingsList.innerHTML = filterValue === "all" ? statusOrder.map(function (status) {
        var group = filtered.filter(function (listing) { return listing.status === status; });
        var heading = status === "Expired" ? "Needs Review" : status;
        return group.length ? '<li class="recruiter-list-section-heading"><h3>' + heading + ' <span>(' + group.length + ')</span></h3></li>' +
          group.map(recruiterListingMarkup).join("") : "";
      }).join("") : filtered.map(recruiterListingMarkup).join("");
    } else if (listingsList) {
      listingsList.innerHTML = '<li class="empty--compact"><h3>' + (ordered.length ? "No listings match these filters" : "No job listings yet") + '</h3><p>' +
        (ordered.length ? "Try another title or status filter." : "Create a job draft to manage a listing in this browser.") + '</p></li>';
    }
  }

  function renderRecruiterReminders(listings) {
    var list = document.getElementById("recruiter-reminder-list");
    var total = document.getElementById("recruiter-reminder-total");
    if (!list) return;
    var reminderState = readRecruiterReminderState();
    var now = Date.now();
    var active = [];
    if (Array.isArray(listings)) {
      listings.forEach(function (listing) {
        if (listing.status !== "Published" && listing.status !== "Expired") return;
        if (reminderState[listing.id] && reminderState[listing.id].dismissedAt) return;
        var expiryDate = recruiterListingExpiryDate(listing);
        if (!expiryDate) return;
        if (listing.status === "Expired") {
          active.push({ id: listing.id, title: listing.title, type: "expired", expiryDate: expiryDate, daysRemaining: 0, remainingDays: 0, action: "Reconfirm Vacancy" });
          return;
        }
        var remainingMs = Date.parse(expiryDate) - now;
        var remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        if (remainingDays <= 3 && remainingDays >= 0) {
          active.push({ id: listing.id, title: listing.title, type: "warning", expiryDate: expiryDate, daysRemaining: remainingDays, remainingDays: remainingDays, action: "Reconfirm Vacancy" });
        }
      });
    }
    if (total) total.textContent = active.length + (active.length === 1 ? " active" : " active");
    if (!active.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No active expiry reminders</h3><p>Published listings are not in their final 3 days yet, and no expired vacancies need review.</p></li>';
      return;
    }
    list.innerHTML = active.map(function (reminder) {
      var title = reminder.type === "expired" ? "Expired vacancy needs review" : "Final 3 days before expiry";
      var detail = reminder.type === "expired"
        ? "This listing passed its local expiry date and has been removed from the active job explorer."
        : "This published vacancy is in its final 3 days before expiry. Reconfirm it to keep it active.";
      var daysText = reminder.type === "expired" ? "Expired" : "" + reminder.remainingDays + (reminder.remainingDays === 1 ? " day remaining" : " days remaining");
      return '<li class="student-item recruiter-reminder" id="recruiter-expiry-reminder-' + escapeHtml(reminder.id) + '">' +
        '<div><strong>' + escapeHtml(reminder.title) + '</strong>' +
        '<span class="student-item__meta">' + escapeHtml(title) + ' · ' + escapeHtml(daysText) + '</span>' +
        '<span class="student-item__meta">Expiry: ' + escapeHtml(formatRecruiterDate(reminder.expiryDate)) + '</span>' +
        '<span class="student-item__meta">Recommended action: ' + escapeHtml(reminder.action) + '</span></div>' +
        '<div class="recruiter-listing__actions"><button class="btn btn--primary" type="button" data-recruiter-reconfirm="' + escapeHtml(reminder.id) + '">Reconfirm Vacancy</button>' +
        '<button class="btn btn--text" type="button" data-recruiter-dismiss-reminder="' + escapeHtml(reminder.id) + '">Dismiss</button></div>' +
        '<p class="recruiter-listing__note">' + escapeHtml(detail) + '</p></li>';
    }).join("");
  }

  function readRecruiterApplicantProfile() {
    try {
      var raw = window.localStorage.getItem(AUTH_PROFILE_KEY);
      if (raw === null) return { profile: null, error: "" };
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
          (parsed.applications !== undefined && !Array.isArray(parsed.applications))) {
        return { profile: null, error: "Applicant records are unavailable because the saved demo profile data is malformed." };
      }
      return { profile: parsed, error: "" };
    } catch (error) {
      return { profile: null, error: "Applicant records could not be read from this browser. No data was changed." };
    }
  }

  function recruiterApplicantRows(listings, profile) {
    if (!profile) return [];
    var ids = recruiterJobIds(listings, baseJobs);
    var listingById = {};
    var listingByJobId = {};
    listings.forEach(function (listing) {
      listingById[listing.id] = listing;
      listingByJobId[String(ids[listing.id])] = listing;
    });
    return normalizeStudentProfile(profile).applications.map(function (application) {
      var listing = application.recruiterListingId ? listingById[application.recruiterListingId] : null;
      if (!listing && !application.recruiterListingId && application.jobId) listing = listingByJobId[String(application.jobId)];
      if (!listing) return null;
      return { application: application, listing: listing };
    }).filter(Boolean).sort(function (a, b) {
      return (b.application.applicationDate || "").localeCompare(a.application.applicationDate || "");
    });
  }

  function recruiterCandidateDetails(profile) {
    var candidate = normalizeStudentProfile(profile);
    var details = [];
    if (candidate.headline) details.push('<p><strong>Headline:</strong> ' + escapeHtml(candidate.headline) + '</p>');
    var education = [candidate.educationLevel, candidate.collegeName, candidate.graduationYear].filter(Boolean).join(" · ");
    if (education) details.push('<p><strong>Education:</strong> ' + escapeHtml(education) + '</p>');
    if (candidate.skills.length) {
      details.push('<div><strong>Skills (self-declared):</strong><ul class="recruiter-candidate__skills">' +
        candidate.skills.map(function (skill) {
          return '<li>' + escapeHtml(skill.name) + (skill.level ? ' · ' + escapeHtml(skill.level) : '') + '</li>';
        }).join("") + '</ul></div>');
    }
    if (candidate.projects.length) {
      details.push('<div><strong>Projects added by student:</strong><ul class="recruiter-candidate__projects">' +
        candidate.projects.map(function (project) {
          var links = [];
          if (isHttpUrl(project.githubUrl)) links.push('<a href="' + escapeHtml(project.githubUrl) + '" target="_blank" rel="noopener noreferrer">Repository link provided</a>');
          if (isHttpUrl(project.liveDemoUrl)) links.push('<a href="' + escapeHtml(project.liveDemoUrl) + '" target="_blank" rel="noopener noreferrer">Live demo link provided</a>');
          return '<li><strong>' + escapeHtml(project.title) + '</strong>' +
            (project.description ? '<p>' + escapeHtml(project.description) + '</p>' : '') +
            (project.role ? '<p>Role: ' + escapeHtml(project.role) + '</p>' : '') +
            (project.technologies ? '<p>Technologies: ' + escapeHtml(project.technologies) + '</p>' : '') +
            (links.length ? '<p class="recruiter-candidate__links">' + links.join(" · ") + '</p>' : '') + '</li>';
        }).join("") + '</ul></div>');
    }
    var profileLinks = [];
    if (isGitHubProfileUrl(candidate.githubUrl)) profileLinks.push('<a href="' + escapeHtml(candidate.githubUrl) + '" target="_blank" rel="noopener noreferrer">GitHub profile link provided</a>');
    if (isHttpUrl(candidate.portfolioUrl)) profileLinks.push('<a href="' + escapeHtml(candidate.portfolioUrl) + '" target="_blank" rel="noopener noreferrer">Portfolio link provided</a>');
    if (profileLinks.length) details.push('<p>' + profileLinks.join(" · ") + '</p>');
    if (candidate.githubRepositories.length) {
      details.push('<div><strong>Public GitHub repositories:</strong><ul class="recruiter-candidate__projects">' +
        candidate.githubRepositories.map(function (repo) {
          var projectName = repo.projectId && candidate.projects.find(function (project) { return project.id === repo.projectId; });
          var skillNames = repo.skillIds && repo.skillIds.length ? repo.skillIds.map(function (skillId) {
            var matched = candidate.skills.find(function (skill) { return skill.id === skillId; });
            return matched ? matched.name : "";
          }).filter(Boolean) : [];
          return '<li><strong><a href="' + escapeHtml(repo.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(repo.name || repo.fullName) + '</a></strong>' +
            (repo.description ? '<p>' + escapeHtml(repo.description) + '</p>' : '') +
            (repo.language ? '<p>Language: ' + escapeHtml(repo.language) + '</p>' : '') +
            (repo.topics && repo.topics.length ? '<p>Topics: ' + escapeHtml(repo.topics.join(", ")) + '</p>' : '') +
            (projectName ? '<p>Associated project: ' + escapeHtml(projectName.title) + '</p>' : '') +
            (skillNames.length ? '<p>Associated skill: ' + escapeHtml(skillNames.join(", ")) + '</p>' : '') +
            '</li>';
        }).join("") + '</ul></div>');
    }
    var sharedSessions = candidate.defenseSessions.filter(function (session) {
      return session.status === "completed" && session.shareWithRecruiters;
    });
    if (sharedSessions.length) {
      details.push('<div class="recruiter-shared-assessments"><strong>Project Defense sessions shared by the student</strong><p>Rule-based demo exercise; no AI or repository inspection. These indicative summaries do not independently verify skills, identity, or authorship.</p>' +
        sharedSessions.map(function (session) {
          var projectStillExists = candidate.projects.some(function (project) { return project.id === session.projectId; });
          var summary = session.result && session.result.strengths.length ? session.result : summarizeDefenseSession(session);
          return '<details class="recruiter-shared-assessment"><summary>' + escapeHtml(session.project.title || "Project Defense") + (projectStillExists ? "" : " · project no longer in profile") + '</summary>' +
            (session.project.description ? '<p>' + escapeHtml(session.project.description) + '</p>' : '') +
            '<p><strong>Role:</strong> ' + escapeHtml(session.project.role || "Not provided") + '</p>' +
            '<p><strong>Technologies:</strong> ' + escapeHtml(session.project.technologies || "Not provided") + '</p>' +
            '<ol>' + session.questions.map(function (question) {
              return '<li><strong>' + escapeHtml(question.category) + ': ' + escapeHtml(question.text) + '</strong><p>' + escapeHtml(question.answer.trim() || "No response submitted.") + '</p></li>';
            }).join("") + '</ol>' +
            '<p><strong>Indicative summary:</strong> ' + escapeHtml(summary.strengths.join(" ")) + '</p>' +
            '<p><strong>Unanswered:</strong> ' + escapeHtml(summary.unanswered.length ? summary.unanswered.join(", ") : "None") + '</p>' +
            (summary.reviewTopics.length ? '<p><strong>Review topics:</strong> ' + escapeHtml(summary.reviewTopics.join(" ")) + '</p>' : '') +
          '</details>';
        }).join("") + '</div>');
    }
    return details.length ? details.join("") : '<p>Candidate has not provided additional profile details.</p>';
  }

  function recruiterApplicantMarkup(row, profile) {
    var application = row.application;
    var listing = row.listing;
    var effectiveStatus = application.recruiterStatus || application.status;
    var statusSource = application.recruiterStatus
      ? 'Recruiter-updated locally' + (application.recruiterUpdatedAt ? ' · ' + escapeHtml(formatStudentApplicationDate(application.recruiterUpdatedAt.slice(0, 10))) : '')
      : 'Student-entered; not employer-confirmed';
    return '<li class="recruiter-applicant">' +
      '<div class="recruiter-applicant__header">' +
        '<div><h3>' + escapeHtml(application.jobTitle) + '</h3><p class="recruiter-listing__company">' + escapeHtml(listing.company) + '</p></div>' +
        '<span class="student-application-status">' + escapeHtml(getApplicationStatusLabel(effectiveStatus)) + '</span>' +
      '</div>' +
      '<p class="recruiter-listing__meta"><strong>Applied:</strong> ' + escapeHtml(formatStudentApplicationDate(application.applicationDate)) +
        ' · <strong>Candidate:</strong> ' + escapeHtml(normalizeStudentProfile(profile).fullName || 'Name not provided') + '</p>' +
      '<p class="recruiter-listing__note">' + statusSource + '</p>' +
      '<div class="recruiter-applicant__controls">' +
        '<div class="field-group"><label for="recruiter-app-status-' + escapeHtml(application.id) + '">Recruiter demo status</label>' +
          '<select class="select" id="recruiter-app-status-' + escapeHtml(application.id) + '" data-recruiter-app-status="' + escapeHtml(application.id) + '">' +
            studentApplicationStatuses.map(function (status) {
              return '<option value="' + escapeHtml(status) + '"' + (status === getApplicationStatusLabel(effectiveStatus) ? ' selected' : '') + '>' + escapeHtml(status) + '</option>';
            }).join("") +
          '</select></div>' +
        '<div class="field-group"><label for="recruiter-app-note-' + escapeHtml(application.id) + '">Recruiter note</label>' +
          '<textarea class="input recruiter-app-note" id="recruiter-app-note-' + escapeHtml(application.id) + '" data-recruiter-app-note="' + escapeHtml(application.id) + '" rows="2" placeholder="Add a brief audit note"></textarea></div>' +
        '<button class="btn btn--secondary" type="button" data-recruiter-app-save="' + escapeHtml(application.id) + '">Save status</button>' +
        '<button class="btn btn--text" type="button" data-recruiter-candidate-details aria-expanded="false">Candidate details</button>' +
      '</div>' +
      '<div class="recruiter-candidate" hidden>' + recruiterCandidateDetails(profile) + '</div>' +
    '</li>';
  }

  function renderRecruiterApplicants(listings) {
    var list = document.getElementById("recruiter-applicant-list");
    var count = document.getElementById("recruiter-applicant-count");
    var total = document.getElementById("recruiter-applicant-total");
    var message = document.getElementById("recruiter-applicant-message");
    var jobFilter = document.getElementById("recruiter-applicant-job-filter");
    if (!list) return;
    if (!Array.isArray(listings)) {
      if (count) count.textContent = "—";
      if (total) total.textContent = "Unavailable";
      if (message) message.textContent = "Applicant associations are unavailable because recruiter listing data could not be read.";
      list.innerHTML = '<li class="empty--compact"><h3>Applicant data unavailable</h3><p>Recruiter job records could not be safely read.</p></li>';
      return;
    }
    var source = readRecruiterApplicantProfile();
    if (source.error) {
      if (count) count.textContent = "—";
      if (total) total.textContent = "Unavailable";
      if (message) message.textContent = source.error;
      list.innerHTML = '<li class="empty--compact"><h3>Applicant data unavailable</h3><p>Saved profile data could not be safely read.</p></li>';
      return;
    }
    if (message) message.textContent = "";
    var profile = source.profile;
    var rows = recruiterApplicantRows(listings, profile);
    if (count) count.textContent = String(rows.length);
    if (total) total.textContent = rows.length + (rows.length === 1 ? " recorded" : " recorded");
    if (jobFilter) {
      var selectedJob = jobFilter.value;
      var options = '<option value="">All your listings</option>' + listings.map(function (listing) {
        return '<option value="' + escapeHtml(listing.id) + '">' + escapeHtml(listing.title + " · " + listing.company) + '</option>';
      }).join("");
      if (jobFilter.innerHTML !== options) jobFilter.innerHTML = options;
      if (selectedJob && listings.some(function (listing) { return listing.id === selectedJob; })) jobFilter.value = selectedJob;
    }
    if (!listings.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No recruiter listings available</h3><p>Create a listing before applications can be associated with it.</p></li>';
      return;
    }
    if (!profile || !rows.length) {
      list.innerHTML = '<li class="empty--compact"><h3>No applications recorded for your listings</h3><p>Only a student record explicitly saved in this browser and linked to one of your recruiter job IDs appears here. External Apply Now visits are not applications.</p></li>';
      return;
    }
    var selectedJobId = jobFilter ? jobFilter.value : "";
    var statusFilter = document.getElementById("recruiter-applicant-status-filter");
    var search = document.getElementById("recruiter-applicant-search");
    var selectedStatus = statusFilter ? statusFilter.value : "";
    var query = search ? search.value.trim().toLowerCase() : "";
    var filtered = rows.filter(function (row) {
      var status = row.application.recruiterStatus || row.application.status;
      var matchesJob = !selectedJobId || row.listing.id === selectedJobId;
      var matchesStatus = !selectedStatus || status === selectedStatus;
      var matchesQuery = !query || (normalizeStudentProfile(profile).fullName + " " + row.application.jobTitle).toLowerCase().indexOf(query) !== -1;
      return matchesJob && matchesStatus && matchesQuery;
    });
    list.innerHTML = filtered.length
      ? filtered.map(function (row) { return recruiterApplicantMarkup(row, profile); }).join("")
      : '<li class="empty--compact"><h3>No matching applicants</h3><p>Try another listing, status, or search term.</p></li>';
  }

  function saveRecruiterApplicantStatus(applicationId) {
    var selector = Array.prototype.filter.call(document.querySelectorAll("[data-recruiter-app-status]"), function (item) {
      return item.dataset.recruiterAppStatus === applicationId;
    })[0];
    var noteSelector = Array.prototype.filter.call(document.querySelectorAll("[data-recruiter-app-note]"), function (item) {
      return item.dataset.recruiterAppNote === applicationId;
    })[0];
    var nextStatus = selector ? selector.value : "";
    var recruiterNote = noteSelector ? noteSelector.value.trim() : "";
    if (studentApplicationStatuses.indexOf(nextStatus) === -1) return;
    var listings = getCurrentRecruiterListings();
    var source = readRecruiterApplicantProfile();
    if (!listings || source.error || !source.profile) {
      var message = document.getElementById("recruiter-applicant-message");
      if (message) message.textContent = source.error || "Applicant profile is not available in this browser.";
      return;
    }
    var row = recruiterApplicantRows(listings, source.profile).find(function (item) { return item.application.id === applicationId; });
    if (!row) {
      var statusMessage = document.getElementById("recruiter-applicant-message");
      if (statusMessage) statusMessage.textContent = "This application is no longer associated with an available recruiter listing.";
      renderRecruiterApplicants(listings);
      return;
    }
    var currentStatus = row.application.recruiterStatus || row.application.status;
    if (normalizeApplicationStatus(currentStatus) === normalizeApplicationStatus(nextStatus)) {
      var unchangedMessage = document.getElementById("recruiter-applicant-message");
      if (unchangedMessage) unchangedMessage.textContent = "Status is unchanged; no new activity was recorded.";
      return;
    }
    var updatedAt = new Date().toISOString();
    var previousListings = JSON.parse(JSON.stringify(listings));
    recordRecruiterListingActivity(listings, row.listing.id, "applicant_status_changed", applicationId, updatedAt);
    if (!writeRecruiterListings(listings)) return;
    if (!source.profile.profileId) source.profile.profileId = "candidate_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    var normalized = normalizeStudentProfile(source.profile);
    normalized.applications = normalized.applications.map(function (application) {
      if (application.id !== applicationId) return application;
      var previousStatus = application.recruiterStatus || application.status;
      application.recruiterStatus = nextStatus;
      application.recruiterUpdatedAt = updatedAt;
      application.statusHistory = appendApplicationStatusHistory(application, previousStatus, nextStatus, "Recruiter", "Recruiter", recruiterNote || "Recruiter status updated in the browser-local demo.", updatedAt);
      return application;
    });
    normalized.applications.forEach(function (application) {
      if (!application.candidateId) application.candidateId = source.profile.profileId;
    });
    source.profile.applications = normalized.applications;
    if (!writeDemoProfile(source.profile)) {
      writeRecruiterListings(previousListings);
      var errorMessage = document.getElementById("recruiter-applicant-message");
      if (errorMessage) errorMessage.textContent = "Recruiter status could not be saved in this browser.";
      return;
    }
    var successMessage = document.getElementById("recruiter-applicant-message");
    if (successMessage) successMessage.textContent = "Recruiter demo status saved locally. No notification was sent.";
    renderRecruiterApplicants(listings);
    renderRecruiterPortal();
    refreshPublishedJobs();
    renderStudentApplicationLists(source.profile);
    renderStudentDashboard();
  }

  function recordRecruiterApplicationReview(applicationId) {
    var listings = getCurrentRecruiterListings();
    var source = readRecruiterApplicantProfile();
    if (!listings || source.error || !source.profile) return false;
    var row = recruiterApplicantRows(listings, source.profile).find(function (item) { return item.application.id === applicationId; });
    if (!row) return false;
    var at = new Date().toISOString();
    recordRecruiterListingActivity(listings, row.listing.id, "application_reviewed", applicationId, at);
    if (!writeRecruiterListings(listings)) return false;
    refreshPublishedJobs();
    return true;
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
      applications: document.getElementById("recruiter-applications-view"),
      trust: document.getElementById("recruiter-trust-view"),
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
    if (route === "trust") renderCompanyTrustCenter();
  }

  function resetRecruiterForm() {
    if (!recruiterForm) return;
    recruiterForm.reset();
    recruiterListingDraftId = null;
    var title = document.getElementById("recruiter-editor-title");
    if (title) title.textContent = "Create Job";
    var publishButton = document.getElementById("recruiter-save-listing");
    if (publishButton) {
      publishButton.textContent = "Publish Job";
      publishButton.dataset.saveMode = "publish";
    }
    recruiterFieldIds.forEach(function (id) { clearFieldError(id); });
    var preview = document.getElementById("recruiter-preview");
    if (preview) preview.hidden = true;
    recruiterForm.hidden = false;
    setRecruiterStatus("");
  }

  function openRecruiterListingEditor(listingId) {
    resetRecruiterForm();
    var publishButton = document.getElementById("recruiter-save-listing");
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
        ["recruiter-skills", listing.requiredSkills.join(", ")], ["recruiter-eligibility", listing.eligibility],
        ["recruiter-experience", listing.experience], ["recruiter-deadline", listing.deadline],
        ["recruiter-salary-min", listing.salaryMin], ["recruiter-salary-max", listing.salaryMax],
        ["recruiter-salary-currency", listing.salaryCurrency], ["recruiter-salary-period", listing.salaryPeriod],
        ["recruiter-apply-url", listing.applyUrl]
      ].forEach(function (pair) {
        var field = document.getElementById(pair[0]);
        if (field) field.value = pair[1] || "";
      });
      var heading = document.getElementById("recruiter-editor-title");
      if (heading) heading.textContent = "Edit job listing";
      if (publishButton) {
        publishButton.textContent = "Save Changes";
        publishButton.dataset.saveMode = "update";
      }
    }
    showRecruiterRoute("editor");
    var firstField = document.getElementById("recruiter-job-title");
    if (firstField) firstField.focus();
  }

  function recruiterListingErrors(requireComplete) {
    var errors = {};
    var titleInput = document.getElementById("recruiter-job-title");
    if (!titleInput || !titleInput.value.trim()) errors["recruiter-job-title"] = "Enter a job title to save this listing.";
    var requiredFields = [
      ["recruiter-job-title", "Enter a job title."],
      ["recruiter-company", "Enter a company name."],
      ["recruiter-description", "Enter a job description."],
      ["recruiter-location", "Enter a location."],
      ["recruiter-job-type", "Select a job type."],
      ["recruiter-work-mode", "Select a work mode."],
      ["recruiter-skills", "Enter at least one required skill."],
      ["recruiter-eligibility", "Enter eligibility details."],
      ["recruiter-experience", "Select an experience level."],
      ["recruiter-deadline", "Select an application deadline."]
    ];
    (requireComplete ? requiredFields : []).forEach(function (pair) {
      var field = document.getElementById(pair[0]);
      if (!field || !field.value.trim()) errors[pair[0]] = pair[1];
    });
    var skillsInput = document.getElementById("recruiter-skills");
    if (requireComplete && skillsInput && !skillsInput.value.split(",").some(function (skill) { return !!skill.trim(); })) {
      errors["recruiter-skills"] = "Enter at least one required skill.";
    }
    var deadline = document.getElementById("recruiter-deadline");
    if (deadline && deadline.value) {
      var validDeadline = /^\d{4}-\d{2}-\d{2}$/.test(deadline.value) &&
        !isNaN(Date.parse(deadline.value + "T00:00:00Z")) &&
        new Date(Date.parse(deadline.value + "T00:00:00Z")).toISOString().slice(0, 10) === deadline.value;
      var today = new Date();
      var todayValue = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
      if (!validDeadline || deadline.value < todayValue) errors["recruiter-deadline"] = "Enter a valid deadline that is today or later.";
    }
    var minSalary = document.getElementById("recruiter-salary-min");
    var maxSalary = document.getElementById("recruiter-salary-max");
    var minValue = minSalary ? minSalary.value.trim() : "";
    var maxValue = maxSalary ? maxSalary.value.trim() : "";
    if (!!minValue !== !!maxValue) errors["recruiter-salary-min"] = "Enter both salary bounds or leave the range blank.";
    if (minValue && maxValue && (!isFinite(Number(minValue)) || !isFinite(Number(maxValue)) || Number(minValue) <= 0 || Number(maxValue) < Number(minValue))) {
      errors["recruiter-salary-min"] = "Enter a valid salary range with the maximum at least the minimum.";
    }
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

  function collectRecruiterFormData(status, existing) {
    var now = new Date().toISOString();
    var minSalary = document.getElementById("recruiter-salary-min").value.trim();
    var maxSalary = document.getElementById("recruiter-salary-max").value.trim();
    var record = {
      id: recruiterListingDraftId || "listing_" + Date.now() + "_" + Math.random().toString(16).slice(2),
      title: document.getElementById("recruiter-job-title").value.trim(),
      company: document.getElementById("recruiter-company").value.trim(),
      description: document.getElementById("recruiter-description").value.trim(),
      location: document.getElementById("recruiter-location").value.trim(),
      jobType: document.getElementById("recruiter-job-type").value,
      workMode: document.getElementById("recruiter-work-mode").value,
      requiredSkills: document.getElementById("recruiter-skills").value.split(",").map(function (skill) { return skill.trim(); }).filter(Boolean),
      eligibility: document.getElementById("recruiter-eligibility").value.trim(),
      experience: document.getElementById("recruiter-experience").value,
      deadline: document.getElementById("recruiter-deadline").value,
      salaryMin: minSalary,
      salaryMax: maxSalary,
      salaryCurrency: document.getElementById("recruiter-salary-currency").value,
      salaryPeriod: document.getElementById("recruiter-salary-period").value,
      applyUrl: document.getElementById("recruiter-apply-url").value.trim(),
      status: status,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      publishedAt: existing ? existing.publishedAt : "",
      lastRecruiterActivityAt: existing ? existing.lastRecruiterActivityAt : "",
      expiryDate: existing ? existing.expiryDate : "",
      activityEvents: existing ? existing.activityEvents.slice() : []
    };
    if (status === "Published" && (!existing || existing.status !== "Published")) {
      record.publishedAt = now;
      record.lastRecruiterActivityAt = now;
      record.expiryDate = recruiterListingExpiryDate({ lastRecruiterActivityAt: now, publishedAt: now, expiryDate: "" });
      addRecruiterActivity(record, "published", now);
    } else if (existing && status === "Draft" && existing.status === "Published") {
      addRecruiterActivity(record, "unpublished", now);
      clearRecruiterReminderState(record.id);
    }
    if (status === "Published" && record.lastRecruiterActivityAt) {
      record.expiryDate = recruiterListingExpiryDate(record) || new Date(Date.parse(record.lastRecruiterActivityAt) + RECRUITER_REVIEW_WINDOW_MS).toISOString();
    }
    return record;
  }

  function saveRecruiterListing(status) {
    if (!recruiterForm || recruiterSaving) return;
    recruiterFieldIds.forEach(function (id) { clearFieldError(id); });
    var errors = recruiterListingErrors(status === "Published");
    markFormErrors(recruiterForm, errors);
    if (Object.keys(errors).length) {
      setRecruiterStatus(status === "Published" ? "Complete every required field and fix the highlighted values before publishing." : "Fix the highlighted dates, salary range, or application URL before saving the draft.");
      return;
    }
    var existing = getCurrentRecruiterListings();
    if (!existing) return;
    var oldRecord = existing.find(function (listing) { return listing.id === recruiterListingDraftId; }) || null;
    if (status === "Published" && oldRecord && oldRecord.status === "Expired") {
      setRecruiterStatus('Use "Reconfirm Vacancy" to explicitly review and republish an expired listing.');
      return;
    }
    var record = collectRecruiterFormData(status, oldRecord);
    var found = false;
    var updated = existing.map(function (listing) {
      if (listing.id !== record.id) return listing;
      found = true;
      return record;
    });
    if (!found) updated.push(record);
    recruiterSaving = true;
    var saveButton = document.getElementById("recruiter-save-listing");
    var draftButton = document.getElementById("recruiter-save-draft");
    if (saveButton) saveButton.disabled = true;
    if (draftButton) draftButton.disabled = true;
    var stored = writeRecruiterListings(updated);
    recruiterSaving = false;
    if (saveButton) saveButton.disabled = false;
    if (draftButton) draftButton.disabled = false;
    if (!stored) return;
    recruiterListingDraftId = record.id;
    clearRecruiterReminderState(record.id);
    setRecruiterStatus(status === "Draft" ? "Draft saved in this browser only." :
      status === "Published" ? "Published to this browser’s job explorer only. This listing is not verified or shared with other visitors." :
        "Listing saved in this browser only.");
    refreshPublishedJobs();
    var preview = document.getElementById("recruiter-preview");
    if (preview) preview.hidden = true;
    if (recruiterForm) recruiterForm.hidden = false;
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
    refreshPublishedJobs();
  }

  function readRecruiterFormRecord() {
    var existing = readRecruiterListings();
    var prior = existing && existing.find(function (listing) { return listing.id === recruiterListingDraftId; });
    return collectRecruiterFormData(prior ? prior.status : "Draft", prior || null);
  }

  function renderRecruiterPreview(record) {
    var preview = document.getElementById("recruiter-preview");
    var content = document.getElementById("recruiter-preview-content");
    if (!preview || !content) return;
    content.textContent = "";
    var title = document.createElement("h3");
    title.textContent = record.title || "Untitled job";
    content.appendChild(title);
    var company = document.createElement("p");
    company.className = "recruiter-preview__company";
    company.textContent = record.company || "Company not provided";
    content.appendChild(company);
    [
      ["Location", record.location],
      ["Work mode", record.workMode],
      ["Job type", record.jobType],
      ["Experience level", record.experience],
      ["Eligibility", record.eligibility],
      ["Deadline", record.deadline ? formatRecruiterDate(record.deadline + "T00:00:00") : ""],
      ["Required skills", record.requiredSkills.join(", ")],
      ["Salary", record.salaryMin && record.salaryMax ?
        (record.salaryCurrency + " " + record.salaryMin + "–" + record.salaryMax + " per " + record.salaryPeriod) : ""]
    ].forEach(function (pair) {
      if (!pair[1]) return;
      var p = document.createElement("p");
      var label = document.createElement("strong");
      label.textContent = pair[0] + ": ";
      p.appendChild(label);
      p.appendChild(document.createTextNode(pair[1]));
      content.appendChild(p);
    });
    var description = document.createElement("div");
    description.className = "recruiter-preview__description";
    Jobs.paragraphs(record.description).forEach(function (paragraph) {
      var p = document.createElement("p");
      p.textContent = paragraph;
      description.appendChild(p);
    });
    if (!record.description) description.textContent = "No description provided yet.";
    content.appendChild(description);
    var disclosure = document.createElement("p");
    disclosure.className = "recruiter-listing__note";
    disclosure.textContent = "Local demo preview. This is not verified or publicly hosted.";
    content.appendChild(disclosure);
    recruiterForm.hidden = true;
    preview.hidden = false;
    preview.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  function transitionRecruiterListing(listingId, nextStatus) {
    var listings = getCurrentRecruiterListings();
    if (!listings) return;
    var listing = listings.find(function (item) { return item.id === listingId; });
    if (!listing) return;
    if (nextStatus === "Published") {
      if (listing.status === "Expired") {
        setRecruiterStatus("Use Reconfirm Vacancy to explicitly review an expired listing.");
        return;
      }
      openRecruiterListingEditor(listingId);
      saveRecruiterListing("Published");
      return;
    }
    if (nextStatus !== "Closed" && nextStatus !== "Unpublished") return;
    var confirmation = nextStatus === "Closed"
      ? 'Close "' + listing.title + '"? It will be removed from active explorer results.'
      : 'Unpublish "' + listing.title + '"? It will be removed from the job explorer.';
    if (!window.confirm(confirmation)) return;
    var updated = listings.map(function (item) {
      if (item.id !== listingId) return item;
      item.status = nextStatus;
      var at = new Date().toISOString();
      item.updatedAt = at;
      clearRecruiterReminderState(item.id);
      addRecruiterActivity(item, nextStatus === "Closed" ? "closed" : "unpublished", at);
      return item;
    });
    if (!writeRecruiterListings(updated)) return;
    setRecruiterStatus('Listing marked ' + nextStatus + ' in this browser.');
    refreshPublishedJobs();
  }

  function reconfirmRecruiterListing(listingId) {
    var listings = getCurrentRecruiterListings();
    if (!listings) return;
    var listing = listings.find(function (item) { return item.id === listingId; });
    if (!listing || (listing.status !== "Published" && listing.status !== "Expired")) return;
    var expired = listing.status === "Expired";
    var prompt = expired
      ? 'Reconfirm that "' + listing.title + '" is still an active vacancy? This will restore it to this browser’s job explorer for another 15-day review window.'
      : 'Reconfirm that "' + listing.title + '" is still an active vacancy? This records recruiter activity and restarts its 15-day review window.';
    if (!window.confirm(prompt)) return;
    var at = new Date().toISOString();
    listing.status = "Published";
    listing.publishedAt = listing.publishedAt || at;
    listing.lastRecruiterActivityAt = at;
    listing.expiryDate = new Date(Date.parse(at) + RECRUITER_REVIEW_WINDOW_MS).toISOString();
    listing.updatedAt = at;
    clearRecruiterReminderState(listing.id);
    addRecruiterActivity(listing, "reconfirmed", at);
    if (!writeRecruiterListings(listings)) return;
    setRecruiterStatus("Vacancy reconfirmed in this browser. It is not verified or shared.");
    refreshPublishedJobs();
  }

  var previewButton = document.getElementById("recruiter-preview-job");
  if (previewButton) previewButton.addEventListener("click", function () {
    var errors = recruiterListingErrors(false);
    recruiterFieldIds.forEach(function (id) { clearFieldError(id); });
    markFormErrors(recruiterForm, errors);
    if (Object.keys(errors).length) {
      setRecruiterStatus("Fix invalid dates, salary range, or application URL before previewing.");
      return;
    }
    renderRecruiterPreview(readRecruiterFormRecord());
  });
  var previewBack = document.getElementById("recruiter-preview-back");
  if (previewBack) previewBack.addEventListener("click", function () {
    var preview = document.getElementById("recruiter-preview");
    if (preview) preview.hidden = true;
    recruiterForm.hidden = false;
    document.getElementById("recruiter-job-title").focus();
  });
  var previewPublish = document.getElementById("recruiter-preview-publish");
  if (previewPublish) previewPublish.addEventListener("click", function () { saveRecruiterListing("Published"); });

  if (recruiterForm) {
    recruiterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var publishButton = document.getElementById("recruiter-save-listing");
      var status = "Published";
      if (publishButton && publishButton.dataset.saveMode === "update") {
        var listings = readRecruiterListings();
        var current = listings && listings.find(function (listing) { return listing.id === recruiterListingDraftId; });
        if (current) status = current.status;
      }
      saveRecruiterListing(status);
    });
    recruiterFieldIds.forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.addEventListener("input", function () { clearFieldError(id); });
      if (field && field.tagName === "SELECT") field.addEventListener("change", function () { clearFieldError(id); });
    });
  }
  var recruiterSaveDraft = document.getElementById("recruiter-save-draft");
  if (recruiterSaveDraft) recruiterSaveDraft.addEventListener("click", function () { saveRecruiterListing("Draft"); });
  var listingSearch = document.getElementById("recruiter-listing-search");
  var listingFilter = document.getElementById("recruiter-listing-filter");
  if (listingSearch) listingSearch.addEventListener("input", renderRecruiterPortal);
  if (listingFilter) listingFilter.addEventListener("change", renderRecruiterPortal);
  ["recruiter-applicant-search", "recruiter-applicant-job-filter", "recruiter-applicant-status-filter"].forEach(function (id) {
    var control = document.getElementById(id);
    if (control) control.addEventListener(control.tagName === "SELECT" ? "change" : "input", function () {
      renderRecruiterApplicants(readRecruiterListings());
    });
  });
  renderRecruiterPortal();
  window.addEventListener("storage", function (event) {
    if (event.key === RECRUITER_LISTINGS_KEY) {
      renderRecruiterPortal();
      refreshPublishedJobs();
    }
    if (event.key === COMPANY_PROFILE_KEY) {
      renderCompanyTrustCenter();
      refreshPublishedJobs();
    }
    if (event.key === AUTH_PROFILE_KEY) renderRecruiterApplicants(readRecruiterListings());
  });

  var companyProfileSave = document.getElementById("company-profile-save");
  if (companyProfileSave) companyProfileSave.addEventListener("click", function () { saveCompanyProfile(false); });
  var companyVerificationSubmit = document.getElementById("company-verification-submit");
  if (companyVerificationSubmit) companyVerificationSubmit.addEventListener("click", function () { saveCompanyProfile(true); });
  ["company-profile-name", "company-profile-website", "company-profile-domain", "company-profile-links"].forEach(function (id) {
    var field = document.getElementById(id);
    if (field) field.addEventListener("input", function () { clearFieldError(id); });
  });

  document.addEventListener("click", function (event) {
    var skillEvidenceReviewButton = event.target.closest("[data-skill-evidence-review-status]");
    if (skillEvidenceReviewButton) {
      setSkillEvidenceReviewStatus(skillEvidenceReviewButton.dataset.skillEvidenceReviewStatus, skillEvidenceReviewButton.dataset.skillEvidenceReviewItem, skillEvidenceReviewButton.dataset.nextSkillEvidenceStatus);
      return;
    }
    var reportStatusButton = event.target.closest("[data-report-status]");
    if (reportStatusButton) {
      setJobReportStatus(reportStatusButton.dataset.reportStatus, reportStatusButton.dataset.nextReportStatus);
      return;
    }
    var adminExitButton = event.target.closest("#admin-review-exit");
    if (adminExitButton) {
      window.location.hash = "";
      return;
    }
    var recruiterRouteButton = event.target.closest("[data-recruiter-route]");
    if (recruiterRouteButton) {
      if (["dashboard", "listings"].indexOf(recruiterRouteButton.dataset.recruiterRoute) >= 0) resetRecruiterForm();
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
    var recruiterPreviewButton = event.target.closest("[data-recruiter-preview]");
    if (recruiterPreviewButton) {
      openRecruiterListingEditor(recruiterPreviewButton.dataset.recruiterPreview);
      renderRecruiterPreview(readRecruiterFormRecord());
      return;
    }
    var recruiterStatusButton = event.target.closest("[data-recruiter-status]");
    if (recruiterStatusButton) {
      transitionRecruiterListing(recruiterStatusButton.dataset.recruiterStatus, recruiterStatusButton.dataset.nextStatus);
      return;
    }
    var recruiterReconfirmButton = event.target.closest("[data-recruiter-reconfirm]");
    if (recruiterReconfirmButton) {
      reconfirmRecruiterListing(recruiterReconfirmButton.dataset.recruiterReconfirm);
      return;
    }
    var recruiterDismissReminderButton = event.target.closest("[data-recruiter-dismiss-reminder]");
    if (recruiterDismissReminderButton) {
      dismissRecruiterReminder(recruiterDismissReminderButton.dataset.recruiterDismissReminder);
      return;
    }
    var recruiterApplicationSave = event.target.closest("[data-recruiter-app-save]");
    if (recruiterApplicationSave) {
      saveRecruiterApplicantStatus(recruiterApplicationSave.dataset.recruiterAppSave);
      return;
    }
    var recruiterCandidateDetailsButton = event.target.closest("[data-recruiter-candidate-details]");
    if (recruiterCandidateDetailsButton) {
      var details = recruiterCandidateDetailsButton.closest(".recruiter-applicant").querySelector(".recruiter-candidate");
      var expanded = recruiterCandidateDetailsButton.getAttribute("aria-expanded") === "true";
      var applicantId = recruiterCandidateDetailsButton.closest(".recruiter-applicant").querySelector("[data-recruiter-app-save]").dataset.recruiterAppSave;
      if (!expanded) recordRecruiterApplicationReview(applicantId);
      recruiterCandidateDetailsButton.setAttribute("aria-expanded", String(!expanded));
      recruiterCandidateDetailsButton.textContent = expanded ? "Candidate details" : "Hide candidate details";
      if (details) details.hidden = expanded;
      if (!expanded) {
        renderRecruiterPortal();
        var currentCard = Array.prototype.filter.call(document.querySelectorAll(".recruiter-applicant"), function (card) {
          var save = card.querySelector("[data-recruiter-app-save]");
          return save && save.dataset.recruiterAppSave === applicantId;
        })[0];
        if (currentCard) {
          var currentButton = currentCard.querySelector("[data-recruiter-candidate-details]");
          var currentDetails = currentCard.querySelector(".recruiter-candidate");
          currentButton.setAttribute("aria-expanded", "true");
          currentButton.textContent = "Hide candidate details";
          currentDetails.hidden = false;
        }
      }
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
      if (route === "applications") renderStudentApplicationLists();
      if (route === "defense") renderStudentDefense();
      return;
    }

    var projectDefenseButton = event.target.closest("[data-student-project-defense]");
    if (projectDefenseButton) {
      showStudentRoute("defense");
      renderStudentDefense();
      var defensePicker = document.getElementById("student-defense-project");
      defensePicker.value = projectDefenseButton.dataset.studentProjectDefense;
      startStudentDefense(defensePicker.value);
      return;
    }

    var savedDefenseButton = event.target.closest("[data-defense-open]");
    if (savedDefenseButton) {
      activeDefenseSessionId = savedDefenseButton.dataset.defenseOpen;
      renderStudentDefense();
      return;
    }

    var applicationAdd = event.target.closest("[data-student-application-add]");
    if (applicationAdd) {
      openStudentApplicationForm("", "", false);
      return;
    }

    var applicationEdit = event.target.closest("[data-student-application-edit]");
    if (applicationEdit) {
      openStudentApplicationForm(applicationEdit.dataset.studentApplicationEdit, "", false);
      return;
    }

    var duplicateApplicationEdit = event.target.closest("#student-application-duplicate-edit");
    if (duplicateApplicationEdit && duplicateApplicationEdit.dataset.studentApplicationDuplicateEdit) {
      openStudentApplicationForm(duplicateApplicationEdit.dataset.studentApplicationDuplicateEdit, "", false);
      return;
    }

    var applicationDelete = event.target.closest("[data-student-application-delete]");
    if (applicationDelete) {
      deleteStudentApplication(applicationDelete.dataset.studentApplicationDelete);
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

    var skillEvidenceEdit = event.target.closest("[data-student-skill-evidence-edit]");
    if (skillEvidenceEdit) {
      var skillId = skillEvidenceEdit.dataset.studentSkillEvidenceEdit;
      var evidenceId = skillEvidenceEdit.dataset.studentSkillEvidenceItem || "";
      if (evidenceId) {
        editSkillEvidenceEntry(skillId, evidenceId);
      } else {
        var skillSelect = document.getElementById("student-skill-evidence-skill");
        if (skillSelect) skillSelect.value = skillId;
        renderStudentSkillEvidenceList();
      }
      return;
    }

    var skillEvidenceDelete = event.target.closest("[data-student-skill-evidence-delete]");
    if (skillEvidenceDelete) {
      removeSkillEvidenceEntry(skillEvidenceDelete.dataset.studentSkillEvidenceDelete, skillEvidenceDelete.dataset.studentSkillEvidenceItem);
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

  var adminReviewStatusFilter = document.getElementById("admin-review-status-filter");
  if (adminReviewStatusFilter) adminReviewStatusFilter.addEventListener("change", renderAdminReviewQueue);

  var adminReviewPreviousVisibility = null;
  function syncDemoAdminReviewRoute() {
    var panel = document.getElementById("demo-review-queue");
    var mainContent = document.querySelector("main");
    var footer = document.querySelector(".site-footer");
    var header = document.querySelector(".site-header");
    if (!panel) return;
    var active = window.location.hash === "#demo-review-queue";
    if (active && !adminReviewPreviousVisibility) {
      adminReviewPreviousVisibility = {
        main: mainContent ? mainContent.hidden : false,
        footer: footer ? footer.hidden : false,
        header: header ? header.hidden : false,
        student: studentShell ? studentShell.hidden : true,
        recruiter: recruiterShell ? recruiterShell.hidden : true
      };
    }
    panel.hidden = !active;
    if (active) {
      if (mainContent) mainContent.hidden = true;
      if (footer) footer.hidden = true;
      if (header) header.hidden = true;
      if (studentShell) studentShell.hidden = true;
      if (recruiterShell) recruiterShell.hidden = true;
    } else if (adminReviewPreviousVisibility) {
      if (mainContent) mainContent.hidden = adminReviewPreviousVisibility.main;
      if (footer) footer.hidden = adminReviewPreviousVisibility.footer;
      if (header) header.hidden = adminReviewPreviousVisibility.header;
      if (studentShell) studentShell.hidden = adminReviewPreviousVisibility.student;
      if (recruiterShell) recruiterShell.hidden = adminReviewPreviousVisibility.recruiter;
      adminReviewPreviousVisibility = null;
    }
    if (active) {
      renderAdminReviewQueue();
      panel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  }
  window.addEventListener("hashchange", syncDemoAdminReviewRoute);
  syncDemoAdminReviewRoute();

  var studentSkillAdd = document.getElementById("student-skill-add");
  if (studentSkillAdd) {
    studentSkillAdd.addEventListener("click", addSkillToProfile);
  }
  var studentSkillName = document.getElementById("student-skill-name");
  if (studentSkillName) {
    studentSkillName.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        addSkillToProfile();
      }
    });
    studentSkillName.addEventListener("input", function () {
      setStudentSkillMessage("", false);
    });
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
  if (grid) {
    grid.hidden = false;
    grid.removeAttribute("hidden");
  }
  if (!grid) return;
  if (!Jobs) {
    grid.innerHTML = '<li class="empty"><h3>Opportunities could not load</h3><p>Please reload the page.</p></li>';
    return;
  }

  var baseJobs = Jobs.normalizeAll((window.NEXORA_DEMO && window.NEXORA_DEMO.opportunities) || []);
  var allJobs = baseJobs.concat(getPublishedRecruiterJobs(baseJobs));
  var state = Jobs.defaultState();
  var support = Jobs.sortSupport(allJobs);

  function refreshPublishedJobs() {
    allJobs = baseJobs.concat(getPublishedRecruiterJobs(baseJobs));
    support = Jobs.sortSupport(allJobs);
    saved = cleanSavedJobIds(saved, allJobs);
    buildControls();
    render();
    renderStudentDashboard();
    renderRecruiterPortal();
  }

  window.setInterval(function () {
    var previous = readRecruiterListings();
    var current = getCurrentRecruiterListings();
    if (!current) return;
    var newlyExpired = previous && current.some(function (listing) {
      return listing.status === "Expired" && previous.some(function (old) { return old.id === listing.id && old.status === "Published"; });
    });
    if (newlyExpired) refreshPublishedJobs();
    else renderRecruiterPortal();
  }, 60000);

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
    if (raw !== null) saved = cleanSavedJobIds(raw, allJobs);   /* on a read failure keep what we have in memory */
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
      var reportWarning = jobReportWarning(o);
      return '<li class="card opp">' +
        '<div class="opp__top">' +
          '<span class="opp__mark" aria-hidden="true">' + escapeHtml(firstChar(o.company)) + "</span>" +
          '<div><div class="opp__company">' + escapeHtml(o.company) + "</div>" + statusBadge(o) +
            (o.source === "recruiter-local-demo" ? '<span class="badge badge--outline recruiter-local-badge">Local demo</span>' : "") +
            '<span class="badge badge--outline trust-badge trust-badge--' + companyTrustClass(o.companyTrustStatus || "Not Submitted") + '">' +
              escapeHtml(companyTrustLabel(o.companyTrustStatus || "Not Submitted")) + '</span></div>' +
          '<button class="opp__save" type="button" data-save="' + o.id + '" aria-pressed="' + isSaved + '" aria-label="Bookmark: ' + escapeHtml(o.title) + '">' + icon("bookmark") + "</button>" +
        "</div>" +
        '<h3 class="opp__title">' + escapeHtml(o.title) + "</h3>" +
        reportWarning +
        '<ul class="opp__meta">' + factsHtml(o) + "</ul>" +
        (o.skills.length ? '<ul class="tags" aria-label="Skills">' + o.skills.map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("") + "</ul>" : "") +
        '<div class="opp__foot"><span class="badge ' + (o.type === "Internship" ? "badge--sage" : "") + '">' + escapeHtml(o.type) + "</span>" +
        '<div class="opp__actions"><button class="btn btn--text opp__report" type="button" data-report-job="' + escapeHtml(String(o.id)) + '" aria-label="Report Job: ' + escapeHtml(o.title) + '">Report Job</button>' +
        '<button class="btn btn--secondary" type="button" data-view="' + o.id + '" aria-label="View details: ' + escapeHtml(o.title) + '">View details</button></div></div>' +
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
    if (state.q) parts.push('"' + state.q + '"');
    if (state.location) parts.push('in "' + state.location + '"');
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
    if (latest !== null) saved = cleanSavedJobIds(latest, allJobs);
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
    var reportJobBtn = e.target.closest("[data-report-job]");
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
    } else if (reportJobBtn) {
      var reportedJob = allJobs.find(function (x) { return String(x.id) === reportJobBtn.dataset.reportJob; });
      if (reportedJob) {
        showDetails(reportedJob);
        openJobReportForm(reportedJob, reportJobBtn, "job");
      }
    }
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-rec-view], [data-rec-save], [data-rec-gap]");
    if (!target) return;
    var job = allJobs.find(function (item) { return String(item.id) === target.dataset.recView || String(item.id) === target.dataset.recSave || String(item.id) === target.dataset.recGap; });
    if (!job) return;
    if (target.hasAttribute("data-rec-view")) {
      showDetails(job);
    } else if (target.hasAttribute("data-rec-save")) {
      var message = toggleSaved(Number(job.id), true);
      if (state.saved) render();
      else refreshSaveButtons();
      var status = document.getElementById("recommendation-status");
      if (status) status.textContent = message;
      var updatedSaveButton = document.querySelector('[data-rec-save="' + String(job.id) + '"]');
      if (updatedSaveButton) updatedSaveButton.focus({ preventScroll: true });
    } else {
      var mode = document.getElementById("skill-gap-mode");
      var select = document.getElementById("skill-gap-job");
      if (!mode || !select) return;
      mode.value = "job";
      updateSkillGapModeFields();
      fillSkillGapJobOptions(String(job.id));
      document.getElementById("skill-gap-status").textContent = "Selected " + job.title + " for job-specific skill-gap analysis. Choose Analyze to refresh the existing roadmap.";
      var analyzer = document.getElementById("skill-gap-title");
      if (analyzer) {
        analyzer.scrollIntoView({ behavior: "smooth", block: "start" });
        mode.focus({ preventScroll: true });
      }
    }
  });

  /* Same-browser changes made in another tab keep this tab's bookmarks in step. */
  window.addEventListener("storage", function (e) {
    if (e.key === JOB_REPORTS_KEY) {
      render();
      renderAdminReviewQueue();
      return;
    }
    if (e.key === AUTH_PROFILE_KEY) {
      renderStudentDashboard();
      renderStudentApplicationLists();
      renderStudentSkillEditor();
      renderStudentProjectEditor();
      renderStudentDefense();
      renderRecruiterApplicants(getCurrentRecruiterListings());
      return;
    }
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
    if (o.source === "recruiter-local-demo") return "This listing was entered in a browser-local demo workspace. NEXORA has not verified the employer or vacancy, and this record is not shared with other visitors. If an official URL was provided, review its destination carefully before continuing.";
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
    if (o.source === "recruiter-local-demo") who.appendChild(el("span", "badge badge--outline recruiter-local-badge", "Local demo listing"));
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
    var reportWarning = jobReportWarningElement(o);
    if (reportWarning) view.appendChild(reportWarning);
    var companyTrustPanel = buildCompanyTrustPanel(o);
    if (companyTrustPanel) view.appendChild(companyTrustPanel);
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
    else if (dest.kind === "none" && o.source === "recruiter-local-demo") msg = "The recruiter has not supplied a usable external application link for this local demo listing.";
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

  function buildCompanyTrustPanel(job) {
    var isRecruiterListing = job.source === "recruiter-local-demo";
    var trustStatus = isRecruiterListing ? job.companyTrustStatus : "Not Submitted";
    var section = el("section", "jv__trust");
    var heading = el("h3", null, "Company Trust Center");
    section.appendChild(heading);
    var badge = el("span", "badge badge--outline trust-badge trust-badge--" + companyTrustClass(trustStatus), companyTrustLabel(trustStatus));
    section.appendChild(badge);
    section.appendChild(el("p", "jv__missing", companyTrustExplanation(trustStatus)));
    var details = el("dl", "jv__summary");
    summaryRow(details, "Company", job.company);
    if (isRecruiterListing && job.companyWebsite) {
      var website = el("a", "link", job.companyWebsite);
      website.href = job.companyWebsite;
      website.target = "_blank";
      website.rel = "noopener noreferrer";
      summaryRow(details, "Official website provided", website);
    }
    if (isRecruiterListing && job.companyEmailDomain) summaryRow(details, "Business email domain provided", job.companyEmailDomain);
    if (isRecruiterListing && job.companyIndustry) summaryRow(details, "Industry", job.companyIndustry);
    if (isRecruiterListing && job.companyLocation) summaryRow(details, "Company location", job.companyLocation);
    if (isRecruiterListing && job.companyDescription) summaryRow(details, "About the company", job.companyDescription);
    if (isRecruiterListing && job.companyPublicLinks && job.companyPublicLinks.length) {
      var links = el("div", "trust-links");
      job.companyPublicLinks.forEach(function (url) {
        if (!isHttpUrl(url)) return;
        var link = el("a", "link", new URL(url).hostname);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.appendChild(link);
      });
      if (links.childNodes.length) summaryRow(details, "Public links provided", links);
    }
    section.appendChild(details);
    section.appendChild(el("p", "jv__note jv__note--caution", "A company website or email domain is not conclusive proof. Trust status is separate from job publication and recruiter activity."));
    var reportActions = el("div", "jv__actions");
    var reportJob = el("button", "btn btn--text", "Report Job");
    reportJob.type = "button";
    reportJob.dataset.action = "report-open";
    reportJob.dataset.reportTarget = "job";
    reportActions.appendChild(reportJob);
    var reportRecruiter = el("button", "btn btn--text", "Report Recruiter");
    reportRecruiter.type = "button";
    reportRecruiter.dataset.action = "report-open";
    reportRecruiter.dataset.reportTarget = "recruiter";
    reportActions.appendChild(reportRecruiter);
    section.appendChild(reportActions);
    return section;
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
    var record = el("button", "btn btn--secondary btn--lg", "I've applied · record it");
    record.type = "button";
    record.dataset.action = "track-application";
    record.setAttribute("aria-label", "I've applied; open the local tracker to record this application");
    actions.appendChild(record);
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

  /* One job-dialog view is visible at a time; transient review/report views are rebuilt to avoid stale data. */
  function showView(name) {
    if (!detail) return;
    ["#jv-review", "#jv-demo", "#jv-report-view"].forEach(function (sel) { var old = $(sel, jobView); if (old) old.remove(); });
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
    var v;
    if (name === "report") {
      v = buildReportView(detail.job, detail.reportTarget || "job");
    } else {
      v = name === "review" ? buildReviewView(detail) : buildDemoView(detail);
    }
    jobView.insertBefore(v, $("#jv-status", jobView));
    var hid = name === "report" ? "jv-report-title" : name === "review" ? "jv-review-title" : "jv-demo-title";
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
      case "track-application":
        var applicationJobId = detail.job.id;
        closeDialog();
        openStudentApplicationForm("", applicationJobId, true);
        break;
      case "report-open":
        openJobReportForm(detail.job, btn, btn.dataset.reportTarget);
        break;
      case "report-submit":
        saveJobReport(detail.job);
        break;
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
