/* fb-lead.js: Meta Pixel for the Authority Read ad test (added 2026-10-07).
   Loads the pixel ONLY after the visitor accepts cookies (consent.js, key ci_consent_v1).
   Fires a Lead event when the form fires its existing generate_lead event, so the
   form code itself is untouched. No names, emails or phone numbers are sent. */
(function () {
  "use strict";
  var PIXEL_ID = "1505473806821416";
  var KEY = "ci_consent_v1";
  var loaded = false;

  function consented() {
    try { return localStorage.getItem(KEY) === "granted"; } catch (e) { return false; }
  }

  function load() {
    if (loaded || !consented()) return;
    loaded = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView");
  }

  function handle(a) {
    if (!a) return;
    if (a[0] === "consent" && a[1] === "update" && a[2] && a[2].ad_storage === "granted") { load(); return; }
    if (a[0] === "event" && a[1] === "generate_lead" && consented()) {
      load();
      var p = a[2] || {};
      window.fbq("track", "Lead", { content_name: p.lead_route || "", content_category: p.lead_path || "" });
    }
    if (a[0] === "event" && a[1] === "qualified_lead" && consented()) {
      load();
      window.fbq("trackCustom", "QualifiedLead", { lead_start: (a[2] && a[2].lead_start) || "" });
    }
  }

  var dl = window.dataLayer = window.dataLayer || [];
  for (var i = 0; i < dl.length; i++) { handle(dl[i]); }
  var orig = dl.push;
  dl.push = function () {
    for (var j = 0; j < arguments.length; j++) { handle(arguments[j]); }
    return orig.apply(dl, arguments);
  };
  load();
})();
