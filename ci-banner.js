/* ci-banner.js — Corridor Intelligence promotion, added 2026-09-16.

   Two placements, one file:
     1. A sticky bar directly under the nav, on every eligible page.
        Dismissible; a close is remembered for 30 days in that browser.
     2. An inline block at the foot of an article, on pages that have an
        <article> element. Not dismissible, because a reader who has just
        finished the piece has already asked for more of exactly this.

   Loaded by consent.js so it reaches every page without editing each one —
   same pattern ccc-ux.js uses on campuscorridor.ca. The CSS ships with the
   markup: the recurring failure on these sites has been markup that travels
   to a page whose stylesheet never followed it.

   Bilingual off <html lang>. Every link is tagged so the clicks report
   separately instead of landing in Direct — ref=ban-topbar / ban-article.

   To end the campaign: set ACTIVE to false. To swap it for the book launch,
   change the two COPY blocks; nothing else needs touching. */
(function () {
  "use strict";

  var ACTIVE = true;
  var SNOOZE_DAYS = 30;
  var KEY = "ci-banner-closed";

  if (!ACTIVE || window.__ciBanner) return;
  window.__ciBanner = true;

  var PATH = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  /* Pages that must not carry it.
     - book / livre keep their own chrome (RoD-2026-08-18, do-not-touch)
     - subscribe / abonnement ARE the destination
     - spark pages are a 15-question assessment; nothing interrupts that
     - legal pages and the error page carry no promotion
     - welcome / advisory / services are disallowed in robots.txt */
  var SKIP = /^(book|livre|subscribe|abonnement|spark|spark-fr|thank-you|merci|404|privacy|privacy-fr|terms|terms-fr|cookies|cookies-fr|welcome|welcome-fr|advisory|advisory-fr|services)\.html$/;
  if (SKIP.test(PATH)) return;

  var FR = (document.documentElement.getAttribute("lang") || "en").toLowerCase().indexOf("fr") === 0;

  /* A Corridor Brief edition (/brief/YYYY-MM-DD.html) already has its own
     dated headline in the page body, so the sticky bar swaps its generic
     evergreen line for a "Top stories for <date>" lead instead — still
     bilingual off <html lang>, built from the date in the URL so nothing
     here needs editing per edition. Brief editions also skip the inline
     end-of-article block below: they hold 22+ <article class="cb-item">
     nodes, so the generic endblock's document.querySelector("article")
     would otherwise land inside story #1, and the page already carries two
     subscribe CTAs of its own at the foot. */
  var BRIEF_DATE = /^\/brief\/(\d{4})-(\d{2})-(\d{2})\.html$/.exec(location.pathname);
  var IS_BRIEF = !!BRIEF_DATE;

  var COPY = FR ? {
    eyebrow: "Corridor Intelligence",
    barLead: "La plupart des gens suivent l'actualité. ",
    barEm:   "Rares sont ceux qui comprennent ce qui l’anime.",
    barShort: "Le breffage, chaque matin de semaine.",
    cta:     "Abonnement gratuit",
    kicker:  "Poursuivre la lecture",
    title:   "Le breffage arrive chaque matin de semaine.",
    body:    "Géopolitique, capitaux, ressources stratégiques — et les décisions qui les déplacent. Rédigé par quelqu'un qui a siégé dans les salles où ces décisions se prennent.",
    fine:    "English &amp; français · Aucun pourriel · Désabonnement en tout temps",
    close:   "Fermer"
  } : {
    eyebrow: "Corridor Intelligence",
    barLead: "Most people follow the news. ",
    barEm:   "Few understand what is actually driving it.",
    barShort: "The Corridor Brief, every weekday morning.",
    cta:     "Subscribe free",
    kicker:  "Keep reading",
    title:   "The Corridor Brief lands every weekday morning.",
    body:    "Geopolitics, capital, strategic resources — and the decisions that move them. Written by someone who has sat in the rooms where those decisions get made.",
    fine:    "English &amp; français · No spam · Unsubscribe anytime",
    close:   "Dismiss"
  };

  if (IS_BRIEF) {
    var editionDate = new Date(+BRIEF_DATE[1], +BRIEF_DATE[2] - 1, +BRIEF_DATE[3]);
    var longDate = editionDate.toLocaleDateString(FR ? "fr-FR" : "en-US",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (FR) {
      COPY.barLead = "Les titres du jour — ";
      COPY.barEm = longDate + ".";
      COPY.barShort = "Les titres du " + longDate + ".";
    } else {
      COPY.barLead = "Top stories for ";
      COPY.barEm = longDate + ".";
      COPY.barShort = "Top stories for " + longDate + ".";
    }
  }

  var DEST = FR ? "/abonnement.html" : "/subscribe.html";
  function link(ref) {
    return DEST + "?utm_source=site&utm_medium=banner&utm_campaign=corridor-intelligence&ref=" + ref;
  }

  function css() {
    if (document.getElementById("ci-banner-css")) return;
    var s = document.createElement("style");
    s.id = "ci-banner-css";
    s.textContent =
      /* --- sticky bar --- */
      "#ci-promo{background:#0E3A70;color:#F2EFE9;border-top:2px solid #D4AF37;" +
        "display:flex;align-items:center;gap:16px;padding:11px 22px;margin-bottom:22px;" +
        "font-family:'EB Garamond',Georgia,serif}" +
      "#ci-promo .ci-eyebrow{font-family:'Oswald',Arial,sans-serif;font-size:10px;letter-spacing:.17em;" +
        "text-transform:uppercase;color:#D4AF37;white-space:nowrap;font-weight:400}" +
      "#ci-promo p{margin:0;font-size:16px;line-height:1.35;flex:1}" +
      "#ci-promo p em{font-style:italic;color:#E4DCC9}" +
      /* Red, not gold: gold is already the page's rank numbers, section
         rules and headings, so a gold CTA here reads as decoration rather
         than an action. Red is used nowhere else on the page. */
      "#ci-promo .ci-go{font-family:'Oswald',Arial,sans-serif;font-size:11px;letter-spacing:.12em;" +
        "text-transform:uppercase;background:#C0392B;color:#F2EFE9;padding:9px 17px;border-radius:2px;" +
        "white-space:nowrap;text-decoration:none;font-weight:500}" +
      "#ci-promo .ci-go:hover{background:#A93226}" +
      "#ci-promo .ci-x{background:none;border:0;color:#8FA2C0;font:inherit;font-size:19px;line-height:1;" +
        "cursor:pointer;padding:4px 2px}" +
      "#ci-promo .ci-x:hover{color:#F2EFE9}" +
      "#ci-promo .ci-short{display:none}" +
      "#ci-promo .ci-row{display:contents}" +
      /* Below 760px the single row cannot hold: stack it, use the short line,
         and lift the close out of reach of the button. Kept compact because
         the book strip already sits under this on the home page. */
      "@media(max-width:760px){" +
        "#ci-promo{flex-wrap:wrap;padding:9px 16px 11px;gap:8px 10px;align-items:center}" +
        "#ci-promo .ci-row{display:flex;align-items:center;justify-content:space-between;width:100%;gap:10px}" +
        "#ci-promo .ci-long{display:none}" +
        "#ci-promo .ci-short{display:block}" +
        "#ci-promo p{flex:1 1 auto;min-width:0;font-size:14.5px;line-height:1.3}" +
        "#ci-promo .ci-go{padding:8px 15px;font-size:10.5px}}" +
      /* --- inline article block --- */
      ".ci-endblock{background:#FFFDF8;border:1px solid #E0D8C4;border-left:3px solid #D4AF37;" +
        "padding:26px 28px;margin:44px 0 8px;max-width:100%}" +
      ".ci-endblock .ci-kicker{font-family:'Oswald',Arial,sans-serif;font-size:10px;letter-spacing:.18em;" +
        "text-transform:uppercase;color:#9A7D1E;margin:0 0 10px}" +
      ".ci-endblock h3{font-family:'EB Garamond',Georgia,serif;font-weight:600;font-size:23px;line-height:1.25;" +
        "color:#0A3161;margin:0 0 9px;letter-spacing:-.005em}" +
      ".ci-endblock p.ci-body{font-family:'EB Garamond',Georgia,serif;font-size:16.5px;color:#3B4654;" +
        "margin:0 0 17px;max-width:54ch;line-height:1.5}" +
      ".ci-endblock .ci-go{display:inline-block;font-family:'Oswald',Arial,sans-serif;font-size:11px;" +
        "letter-spacing:.12em;text-transform:uppercase;background:#D4AF37;color:#0A3161;padding:10px 18px;" +
        "border-radius:2px;text-decoration:none;font-weight:500}" +
      ".ci-endblock .ci-go:hover{background:#E0BE4E}" +
      ".ci-endblock .ci-fine{font-family:'Oswald',Arial,sans-serif;font-size:10px;letter-spacing:.1em;" +
        "text-transform:uppercase;color:#9A9484;margin:12px 0 0}" +
      "@media(max-width:600px){.ci-endblock{padding:20px 18px;margin-top:34px}" +
        ".ci-endblock h3{font-size:20px}.ci-endblock p.ci-body{font-size:16px}}";
    document.head.appendChild(s);
  }

  function snoozed() {
    try {
      var t = +localStorage.getItem(KEY);
      return t && (Date.now() - t) < SNOOZE_DAYS * 864e5;
    } catch (e) { return false; }
  }

  function bar() {
    if (snoozed() || document.getElementById("ci-promo")) return;

    /* Mount directly below the nav so it reads as part of the page chrome,
       not as an overlay. Falls back to the top of <main> on the handful of
       pages that have no <nav>. */
    var nav = document.querySelector("nav");
    var el = document.createElement("div");
    el.id = "ci-promo";
    el.setAttribute("role", "complementary");
    /* Eyebrow and close share a row so that on a phone the close sits top
       right, where a thumb expects it and where it will not be caught while
       reaching for the button. Above 760px the row is display:contents, so
       the children still lay out as one flex line. */
    el.innerHTML =
      '<div class="ci-row"><span class="ci-eyebrow">' + COPY.eyebrow + '</span>' +
        '<button class="ci-x" type="button" aria-label="' + COPY.close + '">&times;</button></div>' +
      '<p><span class="ci-long">' + COPY.barLead + '<em>' + COPY.barEm + '</em></span>' +
        '<span class="ci-short">' + COPY.barShort + '</span></p>' +
      '<a class="ci-go" href="' + link("ban-topbar") + '">' + COPY.cta + '</a>';

    /* The book-launch strip (.bookstrip; formerly the Quebec 2026 .qcstrip)
       sits directly under the nav. When present this goes below it, so the
       dated item keeps the higher slot. */
    var anchor = document.querySelector(".bookstrip,.qcstrip") || nav;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
    else {
      var host = document.querySelector("main") || document.body;
      host.insertBefore(el, host.firstChild);
    }

    el.querySelector(".ci-x").addEventListener("click", function () {
      el.parentNode.removeChild(el);
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    });
  }

  function endblock() {
    if (IS_BRIEF) return;
    var art = document.querySelector("article");
    if (!art || document.querySelector(".ci-endblock")) return;

    var el = document.createElement("aside");
    el.className = "ci-endblock";
    el.innerHTML =
      '<p class="ci-kicker">' + COPY.kicker + '</p>' +
      '<h3>' + COPY.title + '</h3>' +
      '<p class="ci-body">' + COPY.body + '</p>' +
      '<a class="ci-go" href="' + link("ban-article") + '">' + COPY.cta + '</a>' +
      '<p class="ci-fine">' + COPY.fine + '</p>';
    art.appendChild(el);
  }

  /* The consent notice is fixed to the bottom of the viewport and the sticky
     bar sits at the top, so they do not overlap — but stacking a second
     promotion on a phone while the first is still asking a question is a poor
     welcome. Wait for #ci-consent to clear before showing the bar. The inline
     block is in the flow and can render immediately. */
  function start() {
    css();
    endblock();
    if (!document.getElementById("ci-consent")) { bar(); return; }
    var tries = 0;
    var t = setInterval(function () {
      if (!document.getElementById("ci-consent")) { clearInterval(t); bar(); }
      else if (++tries > 240) { clearInterval(t); }   /* give up after ~2 min */
    }, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
