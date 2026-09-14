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
  var PATH = location.pathname.replace(/^\/+/, "");
  if (PATH === "book.html" || PATH === "livre.html") return;

  var LANG = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
  var IS_FR = LANG.indexOf("fr") === 0;

  var NAV_HTML =
    '<div class="navdrop"><a href="/intelligence.html">Intelligence</a><div class="navdrop-menu">' +
    '<a href="/brief/">Briefs</a><a href="/dispatch.html">Dispatches</a>' +
    '<a href="/corridor-files.html">Files</a><a href="/brief/index-dashboard.html">Index</a>' +
    '<a href="/issues-focus.html">Issues</a></div></div>' +
    '<a href="/podcast.html">Podcast</a>' +
    '<a href="/writing.html">Writing</a>' +
    '<a href="/stewardship.html">Stewardship</a>' +
    '<a href="/media.html">Media</a>' +
    '<a href="/book.html">Book</a>' +
    '<a class="cta" href="/subscribe.html">Subscribe</a>';

  var NAV_HTML_FR =
    '<div class="navdrop"><a href="/intelligence.html">Intelligence</a><div class="navdrop-menu">' +
    '<a href="/brief/">Breffages</a><a href="/dispatch.html">D&eacute;p&ecirc;ches</a>' +
    '<a href="/corridor-files.html">Dossiers</a><a href="/brief/index-dashboard.html">Index</a>' +
    '<a href="/issues-focus-fr.html">Enjeux</a></div></div>' +
    '<a href="/podcast.html">Balado</a>' +
    '<a href="/writing.html">&Eacute;crits</a>' +
    '<a href="/stewardship-fr.html">Engagement</a>' +
    '<a href="/conferences.html">Conf&eacute;rences</a>' +
    '<a href="/media-fr.html">M&eacute;dias</a>' +
    '<a href="/livre.html">Livre</a>' +
    '<a class="cta" href="/abonnement.html">S&rsquo;abonner</a>';

  var FOOTER_HTML =
    '<div class="wrap">' +
    '<div class="disc"><div class="brand" style="font-size:15px;margin-bottom:10px">Joseph <span style="color:var(--gold)">Soares</span> &amp; Co.</div>' +
    '<span style="display:block;margin-top:10px;font-style:normal;font-size:14px;letter-spacing:.02em;opacity:.8">&copy; 2026 Joseph Soares &amp; Co.</span></div>' +
    '<div class="soc ci-soc">' +
    '<div class="ci-socrow">' +
    '<a href="https://www.youtube.com/@corridorintelligence?sub_confirmation=1" title="Corridor Intelligence &mdash; English channel">YouTube (EN)</a>' +
    '<a href="https://www.youtube.com/@LeCorridorIntelligence?sub_confirmation=1" title="Le Corridor Intelligence &mdash; cha&icirc;ne fran&ccedil;aise">YouTube (FR)</a>' +
    '<a href="https://www.linkedin.com/in/soaresjoseph/">LinkedIn</a>' +
    '<a href="https://x.com/JosephSoares">X</a>' +
    '<a href="https://www.instagram.com/soaresjoseph/">Instagram</a>' +
    '</div>' +
    '<div class="ci-socrow">' +
    '<a href="/privacy.html">Privacy</a>' +
    '<a href="/terms.html">Terms</a>' +
    '</div>' +
    '</div></div>';

  var FOOTER_HTML_FR =
    '<div class="wrap">' +
    '<div class="disc"><div class="brand" style="font-size:15px;margin-bottom:10px">Joseph <span style="color:var(--gold)">Soares</span> &amp; Co.</div>' +
    '<span style="display:block;margin-top:10px;font-style:normal;font-size:14px;letter-spacing:.02em;opacity:.8">&copy; 2026 Joseph Soares &amp; Co.</span></div>' +
    '<div class="soc ci-soc">' +
    '<div class="ci-socrow">' +
    '<a href="https://www.youtube.com/@LeCorridorIntelligence?sub_confirmation=1" title="Le Corridor Intelligence &mdash; cha&icirc;ne fran&ccedil;aise">YouTube (fran&ccedil;ais)</a>' +
    '<a href="https://www.youtube.com/@corridorintelligence?sub_confirmation=1" title="Corridor Intelligence &mdash; English channel">YouTube (anglais)</a>' +
    '<a href="https://www.linkedin.com/in/soaresjoseph/">LinkedIn</a>' +
    '<a href="https://x.com/JosephSoares">X</a>' +
    '<a href="https://www.instagram.com/soaresjoseph/">Instagram</a>' +
    '</div>' +
    '<div class="ci-socrow">' +
    '<a href="/privacy.html">Confidentialit&eacute;</a>' +
    '<a href="/terms.html">Conditions</a>' +
    '</div>' +
    '</div></div>';

  /* Language toggle. Derived from the hreflang alternates already in <head>,
     so any page that declares a twin gets the toggle with no per-page edit.
     Renders nothing when the page has no counterpart. */
  function altPath(hl) {
    var l = document.querySelector('link[rel="alternate"][hreflang="' + hl + '"]');
    if (!l) return null;
    var href = l.getAttribute("href") || "";
    if (!href) return null;
    var p;
    try { p = new URL(href, location.origin).pathname; } catch (e) { return null; }
    return p.replace(/^\/+/, "") === PATH ? null : p;
  }

  function toggleHTML() {
    var target = IS_FR ? altPath("en") : (altPath("fr-CA") || altPath("fr"));
    if (!target) return "";
    var label = IS_FR ? "EN" : "FR";
    var title = IS_FR ? "Read this page in English" : "Lire cette page en fran&ccedil;ais";
    return '<a class="lang" href="' + target + '" hreflang="' + (IS_FR ? "en" : "fr-CA") +
           '" title="' + title + '" aria-label="' + title + '">' + label + '</a>';
  }


  /* CSS for the chrome this script injects — the dropdown nav and the two-line
     footer link block. Injected here so every page picks it up without a
     per-page CSS edit. Idempotent: guarded on its own element id. */
  function navCSS() {
    if (document.getElementById("ci-footcss")) return;
    var st = document.createElement("style");
    st.id = "ci-footcss";
    st.textContent =
      /* Dropdown nav styling. The nav markup above is injected at runtime, so any page
         that never carried .navdrop rules in its own inline <style> rendered the
         Intelligence submenu inline and unstyled. Shipping the rules alongside the nav
         that needs them keeps the two from drifting apart again. Added 2026-09-13. */
      ".navdrop{position:relative}" +
      ".navdrop-menu{display:none;position:absolute;top:100%;left:0;background:var(--panel2,#072244);" +
      "border:1px solid var(--line,rgba(242,239,233,.12));border-radius:3px;padding:10px 0;min-width:150px;z-index:30}" +
      ".navdrop:hover .navdrop-menu,.navdrop:focus-within .navdrop-menu{display:block}" +
      ".navdrop-menu a{display:block;padding:8px 18px;white-space:nowrap}" +
      "@media(max-width:880px){.navdrop{width:100%}" +
      ".navdrop-menu{display:block;position:static;border:0;box-shadow:none;padding:0;background:transparent}" +
      ".navdrop-menu a{text-align:center}}" +
      "footer .ci-soc{display:flex;flex-direction:column;align-items:flex-end;gap:12px}" +
      "footer .ci-socrow{display:flex;flex-wrap:wrap;gap:22px;justify-content:flex-end}" +
      "footer .ci-soc a{margin-left:0}" +
      "@media(max-width:880px){footer .ci-soc{align-items:center;width:100%}" +
      "footer .ci-socrow{justify-content:center;gap:18px}}" +
      /* Mobile nav collapse — added 2026-09-14. The nav markup is injected at runtime, but the CSS
         that collapses it behind the hamburger below 880px lived only in each page's own inline
         <style>. Pages that never carried it rendered the full nav as a ~1300px flex row and blew
         the page out sideways on every phone — sprint-30-jours.html overflowed by 978px,
         media-fr.html by 732px. Shipping the rules with the nav that needs them is the same fix
         as the dropdown CSS above, and it covers pages that do not exist yet. */
      "@media(max-width:880px){" +
      "nav .wrap{position:relative}" +
      ".menutoggle{display:flex;flex-direction:column;gap:5px;background:none;border:0;cursor:pointer;padding:10px 6px}" +
      ".menutoggle span{display:block;width:24px;height:2px;background:var(--bone,#F2EFE9)}" +
      ".navlinks{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:stretch;" +
      "gap:0;background:var(--panel2,#0a2c58);border-bottom:1px solid var(--line,rgba(242,239,233,.12));padding:8px 0}" +
      ".navlinks.open{display:flex}" +
      ".navlinks a{text-align:center;padding:14px 20px}}" +
      /* A table wider than the screen is the other common cause of sideways scroll. */
      ".ci-tscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}" +
      /* Mobile language pill — added 2026-09-14. The language toggle is rendered
         into .navlinks, which collapses behind the hamburger below 880px, so on a
         phone the FR/EN control was invisible until the reader opened the menu and
         scrolled past nine items to the last one. These rules surface a copy in the
         nav bar itself, beside the hamburger, and hide the in-menu copy so exactly
         one is shown at any width. */
      ".ci-langmob{display:none}" +
      "@media(max-width:880px){" +
      ".ci-langmob{display:inline-flex;align-items:center;justify-content:center;margin-left:auto;margin-right:14px;" +
      "padding:5px 11px;border:1px solid var(--gold,#D4AF37);border-radius:3px;color:var(--gold,#D4AF37);" +
      "font-family:'Oswald','Source Sans 3',system-ui,sans-serif;font-size:12px;font-weight:500;letter-spacing:.12em;" +
      "line-height:1;text-decoration:none}" +
      "body.ci-langmob-on .navlinks .lang{display:none}}";
    document.head.appendChild(st);
  }

  /* Mounts a second copy of the language toggle as a direct child of nav .wrap,
     ahead of the hamburger button, so it is visible on a phone without opening
     the menu. The CSS above shows exactly one of the two at any width, and the
     whole thing renders nothing on a page with no declared twin. */
  function mountMobileToggle() {
    var wrap = document.querySelector("nav .wrap");
    if (!wrap) return;
    var old = wrap.querySelector(".ci-langmob");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var html = toggleHTML();
    if (!html) return;
    navCSS();
    var holder = document.createElement("div");
    holder.innerHTML = html;
    var a = holder.firstChild;
    if (!a) return;
    a.className = "lang ci-langmob";
    var burger = wrap.querySelector(".menutoggle");
    if (burger) wrap.insertBefore(a, burger); else wrap.appendChild(a);
    if (document.body) document.body.className += " ci-langmob-on";
  }

  function run() {
    var navlinks = document.querySelector(".navlinks");
    if (navlinks) { navCSS(); navlinks.innerHTML = (IS_FR ? NAV_HTML_FR : NAV_HTML) + toggleHTML(); }

    mountMobileToggle();

    var footers = document.querySelectorAll("footer");
    var footer = footers.length ? footers[footers.length - 1] : null;
    if (footer) { navCSS(); footer.innerHTML = IS_FR ? FOOTER_HTML_FR : FOOTER_HTML; }
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

/* ---------------------------------------------------------------------------
   EN/FR switch for the Corridor Brief pages — added 2026-09-14.

   WHY THIS EXISTS: the Brief publisher already writes every string twice, as
   data-en / data-fr attributes, and already ships a working setLang(). What it
   never emits is the .lang-buttons control that calls setLang — so the French
   was sitting on the page with no way for a reader to reach it. The archive
   index and every dated edition are machine-written each morning on the Ghost
   droplet, so putting the control here rather than in that template covers
   every past edition and every future one, with no change to the publisher.

   Skips any page that ships its own .lang-buttons (the Corridor Index does),
   and any page with nothing bilingual to switch. The choice is remembered in
   the same localStorage key the Corridor Index uses, so a French reader stays
   in French from one edition to the next.

   REMOVE THIS BLOCK if the publisher template starts emitting the control
   itself. It is a bridge, not the fix.
   --------------------------------------------------------------------------- */
(function () {
  "use strict";
  var KEY = "js-lang";

  function build() {
    if (typeof window.setLang !== "function") return;
    if (document.querySelector(".lang-buttons")) return;
    if (!document.querySelector("[data-fr]")) return;

    var css = document.createElement("style");
    css.textContent =
      ".ci-langbar{display:flex;justify-content:flex-end;gap:6px;margin:0 0 20px}" +
      ".ci-langbar button{background:transparent;border:1px solid rgba(242,239,233,.12);color:#A9A39A;" +
      "padding:5px 12px;font-size:12px;border-radius:3px;cursor:pointer;" +
      "font-family:'Oswald',sans-serif;letter-spacing:.1em}" +
      ".ci-langbar button:hover{border-color:#D4AF37;color:#D4AF37}" +
      ".ci-langbar button.active{border-color:#D4AF37;color:#D4AF37}";
    document.head.appendChild(css);

    var bar = document.createElement("div");
    bar.className = "ci-langbar lang-buttons";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Language / Langue");
    bar.innerHTML =
      '<button type="button" lang="en" title="Read this edition in English">EN</button>' +
      '<button type="button" lang="fr" title="Lire cette édition en français">FR</button>';

    var crumb = document.querySelector(".crumb");
    if (crumb && crumb.parentNode) {
      crumb.parentNode.insertBefore(bar, crumb.nextSibling);
    } else {
      var host = document.querySelector("main") || document.body;
      host.insertBefore(bar, host.firstChild);
    }

    function pick(l) {
      try { localStorage.setItem(KEY, l); } catch (e) {}
      window.setLang(l);
    }
    bar.children[0].addEventListener("click", function () { pick("en"); });
    bar.children[1].addEventListener("click", function () { pick("fr"); });

    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved === "fr") { window.setLang("fr"); }
    else { bar.children[0].classList.add("active"); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
