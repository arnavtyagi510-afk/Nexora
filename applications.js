/* NEXORA application-record foundation (Step 1.3). FRONTEND STRUCTURE ONLY: there is no backend yet.

   Nothing here is saved anywhere. Records live in memory for the current page visit and are lost on reload.
   They exist so the shape of an application record is settled before a real database is connected.

   Record shape:
     applicationId    "app_..." unique id (a real backend will issue its own)
     jobId            id of the listing
     candidateId      null until accounts exist (no login in this step)
     createdAt        ISO timestamp of the event
     method           how the application was made (see METHODS)
     status           where it stands (see STATUSES)
     destinationHost  for external redirects: the domain the visitor was sent to, otherwise null

   Rules:
     - Opening an external application page is NOT an application. It is recorded as method "external_redirect",
       status "EXTERNAL_REDIRECT_OPENED": "the visitor was sent to the employer's site". NEXORA cannot know whether
       they applied there.
     - "SUBMITTED" is reserved for applications really submitted through NEXORA. NEXORA cannot submit any yet, so
       createRecord refuses method "nexora" until a backend exists.
     - No resumes, phone numbers, emails or other personal data are part of a record.
     - Demo listings never produce a record. */
(function (root) {
  "use strict";

  var METHODS = { EXTERNAL_REDIRECT: "external_redirect", NEXORA: "nexora" };
  var STATUSES = { EXTERNAL_REDIRECT_OPENED: "EXTERNAL_REDIRECT_OPENED", SUBMITTED: "SUBMITTED" };

  var counter = 0;
  function newId() {
    counter += 1;
    var rand = Math.random().toString(36).slice(2, 8);
    return "app_" + Date.now().toString(36) + "_" + counter + rand;
  }

  /* Returns { ok: true, record } or { ok: false, reason }. Never throws. */
  function createRecord(input) {
    input = input || {};
    if (typeof input.jobId !== "number" || !isFinite(input.jobId)) return { ok: false, reason: "A valid job id is required." };
    if (input.isDemo) return { ok: false, reason: "Demo listings cannot have application records." };
    if (input.method === METHODS.NEXORA) return { ok: false, reason: "Applying through NEXORA needs a backend that does not exist yet." };
    if (input.method !== METHODS.EXTERNAL_REDIRECT) return { ok: false, reason: "Unknown application method." };
    if (typeof input.destinationHost !== "string" || !input.destinationHost) return { ok: false, reason: "An external redirect needs a destination domain." };
    return {
      ok: true,
      record: {
        applicationId: newId(),
        jobId: input.jobId,
        candidateId: null,
        createdAt: new Date().toISOString(),
        method: METHODS.EXTERNAL_REDIRECT,
        status: STATUSES.EXTERNAL_REDIRECT_OPENED,
        destinationHost: input.destinationHost
      }
    };
  }

  /* True only for an application really submitted through NEXORA. A redirect never counts. */
  function isSubmittedViaNexora(record) {
    return !!record && record.method === METHODS.NEXORA && record.status === STATUSES.SUBMITTED;
  }

  /* Storage seam: a future version replaces this adapter with one that talks to a real API.
     The default keeps records in memory only. */
  var memory = [];
  var store = {
    save: function (record) { memory.push(record); return record; },
    list: function () { return memory.slice(); },
    persistent: false
  };

  var api = {
    METHODS: METHODS, STATUSES: STATUSES, createRecord: createRecord, isSubmittedViaNexora: isSubmittedViaNexora,
    store: store, setStore: function (adapter) { if (adapter && typeof adapter.save === "function" && typeof adapter.list === "function") store = adapter; },
    getStore: function () { return store; }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.NexoraApplications = api;
})(typeof window !== "undefined" ? window : this);
