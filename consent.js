/* consent.js — self-hosted consent gate for GA4 (Google Consent Mode v2)
   Law 25 / PIPEDA compliant: analytics denied by default until the visitor accepts.
   No third-party SaaS. Bilingual EN/FR. Choice persisted in localStorage. */
(function () {
  "use strict";
  var KEY = "ci_consent_v1";
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  var prior = null;
  try { prior = localStorage.getItem(KEY); } catch (e) {}

  if (prior === "granted") {
    gtag("consent", "update", { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    return; // already decided, no banner
  }
  if (prior === "denied") { return; } // stays denied by default, no banner

  function apply(state) {
    try { localStorage.setItem(KEY, state); } catch (e) {}
    if (state === "granted") {
      gtag("consent", "update", { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
    }
    var b = document.getElementById("ci-consent"); if (b) b.parentNode.removeChild(b);
  }

  function build() {
    var css = document.createElement("style");
    css.textContent =
      "#ci-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#0A3161;color:#F2EFE9;" +
      "font-family:'Source Sans 3',system-ui,Arial,sans-serif;font-size:14px;line-height:1.45;" +
      "border-top:2px solid #D4AF37;box-shadow:0 -6px 24px rgba(0,0,0,.35)}" +
      "#ci-consent .ci-wrap{max-width:1080px;margin:0 auto;padding:16px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:space-between}" +
      "#ci-consent p{margin:0;flex:1 1 460px;min-width:260px}" +
      "#ci-consent a{color:#D4AF37;text-decoration:underline}" +
      "#ci-consent .ci-btns{display:flex;gap:10px;flex:0 0 auto}" +
      "#ci-consent button{font:inherit;font-weight:600;cursor:pointer;border-radius:3px;padding:9px 18px;border:1px solid #D4AF37}" +
      "#ci-consent .ci-accept{background:#D4AF37;color:#0A3161}" +
      "#ci-consent .ci-decline{background:transparent;color:#F2EFE9}" +
      "@media(max-width:640px){#ci-consent .ci-btns{width:100%}#ci-consent button{flex:1}}";
    document.head.appendChild(css);

    var bar = document.createElement("div");
    bar.id = "ci-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent / Consentement aux témoins");
    bar.innerHTML =
      '<div class="ci-wrap">' +
      '<p>We use analytics cookies to understand site usage. You can accept or decline. ' +
      '<span lang="fr">&mdash; Nous utilisons des t&eacute;moins d&rsquo;analyse pour comprendre l&rsquo;utilisation du site. Vous pouvez accepter ou refuser.</span> ' +
      '<a href="/cookies.html">Details / D&eacute;tails</a></p>' +
      '<div class="ci-btns">' +
      '<button type="button" class="ci-decline">Decline / Refuser</button>' +
      '<button type="button" class="ci-accept">Accept / Accepter</button>' +
      '</div></div>';
    document.body.appendChild(bar);
    bar.querySelector(".ci-accept").addEventListener("click", function () { apply("granted"); });
    bar.querySelector(".ci-decline").addEventListener("click", function () { apply("denied"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();

/* ---------------------------------------------------------------------------
   Nav + footer unification — added 2026-08-19 (audit item 10).

   One canonical nav, one canonical footer, applied at runtime to every page
   that loads this script. Rewrites .navlinks in place (structure already
   consistent site-wide) and the last <footer> on the page. Skips book.html,
   whose 2-link nav is deliberate (RoD-2026-08-18 do-not-touch), and any page
   with no .navlinks / <footer> (redirects, the imprint/welcome/French pages,
   which carry their own minimal chrome by design).
   --------------------------------------------------------------------------- */
(function () {
  "use strict";
  if (location.pathname.replace(/^\/+/, "") === "book.html") return;

  var NAV_HTML =
    '<div class="navdrop"><a href="/intelligence.html">Intelligence</a><div class="navdrop-menu">' +
    '<a href="/brief/">Briefs</a><a href="/dispatch.html">Dispatches</a>' +
    '<a href="/corridor-files.html">Files</a><a href="/brief/index-dashboard.html">Index</a>' +
    '<a href="/issues-focus.html">Issues Focus</a></div></div>' +
    '<a href="/podcast.html">Podcast</a>' +
    '<a href="/writing.html">Writing</a>' +
    '<a href="/stewardship.html">Stewardship</a>' +
    '<a href="/media.html">Media</a>' +
    '<a href="/book.html">Book</a>' +
    '<a class="cta" href="/subscribe.html">Subscribe</a>';

  var FOOTER_HTML =
    '<div class="wrap">' +
    '<div class="disc"><div class="brand" style="font-size:15px;margin-bottom:10px">Joseph <span style="color:var(--gold)">Soares</span> &amp; Co.</div>' +
    '<span style="display:block;margin-top:10px;font-style:normal;font-size:14px;letter-spacing:.02em;opacity:.8">&copy; 2026 Joseph Soares &amp; Co.</span></div>' +
    '<div class="soc">' +
    '<a href="/book.html">Book</a>' +
    '<a href="/subscribe.html">Subscribe</a>' +
    '<a href="/call.html">Book a Call</a>' +
    '<a href="/privacy.html" style="margin-left:22px">Privacy</a>' +
    '<a href="/terms.html">Terms</a>' +
    '<a href="https://www.linkedin.com/in/soaresjoseph/" style="margin-left:22px">LinkedIn</a>' +
    '<a href="https://x.com/JosephSoares">X</a>' +
    '<a href="https://www.youtube.com/@corridorintelligence?sub_confirmation=1">YouTube</a>' +
    '</div></div>';

  function run() {
    var navlinks = document.querySelector(".navlinks");
    if (navlinks) { navlinks.innerHTML = NAV_HTML; }

    var footers = document.querySelectorAll("footer");
    var footer = footers.length ? footers[footers.length - 1] : null;
    if (footer) { footer.innerHTML = FOOTER_HTML; }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

/* ---------------------------------------------------------------------------
   Ghost capture shim — added 2026-08-19.

   WHY THIS EXISTS: the daily Brief publisher on the Ghost droplet still emits a
   capture form posting to app.kit.com. Kit was retired site-wide; Ghost is the
   only list. Every published Brief page already loads /consent.js, so this shim
   repoints those forms to Ghost without editing any auto-published /brief/ output.

   REMOVE THIS BLOCK once the publisher template on the droplet emits Ghost
   markup directly. It is a bridge, not the fix.
   --------------------------------------------------------------------------- */
(function () {
  "use strict";
  var GHOST = "https://brief.josephsoares.com/members/api/send-magic-link/";

  function isStrayCapture(form) {
    if (!form || form.tagName !== "FORM") return false;
    var action = (form.getAttribute("action") || "").toLowerCase();
    return action.indexOf("kit.com") > -1 || action.indexOf("convertkit") > -1 || action.indexOf("substack") > -1;
  }

  function say(form, text) {
    var msg = form.parentNode && form.parentNode.querySelector(".ci-capture-msg");
    if (msg) msg.textContent = text;
  }

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!isStrayCapture(form)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    var field = form.querySelector('input[type="email"]');
    var email = field && field.value && field.value.trim();
    if (!email) { say(form, "Please enter your email address."); return; }

    var btn = form.querySelector("button");
    if (btn) { btn.disabled = true; }
    say(form, "Sending…");

    fetch(GHOST, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body: JSON.stringify({ email: email, emailType: "subscribe", labels: [] })
    }).then(function (res) {
      if (res.ok) {
        say(form, "Check your inbox to confirm your subscription.");
        form.reset();
        if (window.gtag) { window.gtag("event", "subscribe_submit", { page: location.pathname, source: "brief_capture" }); }
      } else {
        say(form, "That did not go through. Please try again, or subscribe at josephsoares.com/subscribe.html");
      }
    }).catch(function () {
      say(form, "That did not go through. Please try again, or subscribe at josephsoares.com/subscribe.html");
    }).then(function () {
      if (btn) { btn.disabled = false; }
    });
  }, true);
})();
