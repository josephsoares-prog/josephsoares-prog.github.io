/* signup.js: working email signup for every "Subscribe" button on josephsoares.com.
   Added 2026-10-18. Replaces the Ghost Portal popup, which no longer starts (Portal fails to
   initialize against brief.josephsoares.com). Posts to the same Make webhook as the SPARK email
   capture ("JS Site - Lead Capture"), with form_type "newsletter_signup" and consent "newsletter".
   That scenario stores the lead in the "JS Funnel Leads" data store, notifies Joseph, and runs
   the existing newsletter route.
   - Any link with data-portal="signup" or an href containing "#/portal/signup" opens a bottom-sheet form.
   - Any element with data-inline-signup renders the form in place.
   - No names, no phone. Email only. Honeypot field for bots. Works in EN and FR (html lang). */
(function () {
  "use strict";
  var HOOK = "https://hook.us2.make.com/zrq4t9rdqj4v59sfxuofq0c3a4tvx8k1";
  var FR = /^fr/i.test(document.documentElement.lang || "");
  var T = FR ? {
    head: "Corridor Intelligence",
    sub: "Renseignement stratégique pour les décisions qui ne peuvent pas attendre. Gratuit.",
    ph: "vous@entreprise.com",
    btn: "Je m’abonne",
    sending: "Envoi…",
    consent: "En vous abonnant, vous acceptez de recevoir les courriels de Corridor Intelligence de la part de Joseph Soares. Désabonnement en tout temps.",
    priv: "Confidentialité",
    privHref: "/privacy-fr.html",
    okHead: "C’est fait.",
    okBody: "Merci. Vous recevrez Corridor Intelligence dans votre boîte courriel.",
    bad: "Veuillez entrer une adresse courriel valide.",
    close: "Fermer"
  } : {
    head: "Corridor Intelligence",
    sub: "Strategic intelligence for decisions that can’t wait. Free.",
    ph: "you@company.com",
    btn: "Subscribe free",
    sending: "Sending…",
    consent: "By subscribing you agree to receive Corridor Intelligence emails from Joseph Soares. Unsubscribe any time.",
    priv: "Privacy",
    privHref: "/privacy.html",
    okHead: "You’re in.",
    okBody: "Thank you. Corridor Intelligence will reach your inbox.",
    bad: "Please enter a valid email address.",
    close: "Close"
  };

  var css = "" +
    ".cs-form{font-family:'EB Garamond',Georgia,serif;color:#F2EFE9;text-align:left}" +
    ".cs-row{display:flex;gap:10px;flex-wrap:wrap}" +
    ".cs-in{flex:1 1 220px;min-width:0;font:inherit;font-size:16px;padding:14px 16px;border-radius:2px;" +
      "border:1px solid rgba(242,239,233,.28);background:#072244;color:#F2EFE9}" +
    ".cs-in:focus{outline:2px solid #D4AF37;outline-offset:1px}" +
    ".cs-btn{flex:0 0 auto;font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:.14em;font-weight:600;" +
      "font-size:15px;padding:15px 26px;border-radius:2px;border:1px solid #D4AF37;background:#D4AF37;color:#0E3A70;cursor:pointer}" +
    ".cs-btn:hover{background:#E6C860}.cs-btn[disabled]{opacity:.6;cursor:default}" +
    ".cs-fine{font-size:13px;line-height:1.45;color:#A9A39A;margin-top:10px}" +
    ".cs-fine a{color:#D4AF37}" +
    ".cs-err{font-size:14px;color:#F2B8B5;margin-top:8px;min-height:0}" +
    ".cs-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}" +
    ".cs-ok{font-family:'EB Garamond',Georgia,serif;color:#F2EFE9}" +
    ".cs-ok b{display:block;font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:.14em;color:#D4AF37;font-size:16px;margin-bottom:6px}" +
    ".cs-ov{position:fixed;inset:0;z-index:99999;background:rgba(3,14,30,.72);display:flex;align-items:flex-end;justify-content:center}" +
    ".cs-sheet{position:relative;width:100%;max-width:520px;background:#0A3161;border-top:2px solid #D4AF37;" +
      "padding:26px 22px calc(26px + env(safe-area-inset-bottom));border-radius:10px 10px 0 0;max-height:92vh;overflow:auto}" +
    ".cs-sheet h2{padding-right:44px;font-family:'Oswald',sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:24px;line-height:1.15;margin:0 0 6px;color:#F2EFE9}" +
    ".cs-sheet p.cs-sub{font-size:18px;line-height:1.45;color:#D8D3C9;margin:0 0 16px}" +
    ".cs-x{position:absolute;top:8px;right:10px;width:44px;height:44px;background:none;border:0;color:#F2EFE9;font-size:28px;cursor:pointer}" +
    "@media(max-width:520px){.cs-btn{flex:1 1 100%}}" +
    "@media(min-width:700px){.cs-ov{align-items:center}.cs-sheet{border-radius:6px;border:1px solid #D4AF37}}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function utm() {
    var u = null;
    try { u = JSON.parse(sessionStorage.getItem("utmData")); } catch (e) {}
    return u || {};
  }
  function qs(k) {
    try { return new URLSearchParams(location.search).get(k) || ""; } catch (e) { return ""; }
  }
  function track(name, params) {
    try { if (window.gtag) window.gtag("event", name, params || {}); } catch (e) {}
  }

  function send(email, where) {
    var u = utm(), ref = qs("ref") || where;
    var p = {
      form_type: "newsletter_signup", name: "", email: email, company: "", situation: "", timeline: "",
      consent: "newsletter", ref: ref, lang: FR ? "fr-CA" : "en",
      page_url: location.href, referrer: document.referrer || "(direct)",
      utm_source: u.utm_source || ref || "direct", utm_medium: u.utm_medium || "site",
      utm_campaign: u.utm_campaign || "(none)", utm_content: u.utm_content || "(none)",
      utm_term: u.utm_term || "(none)", submitted_at: new Date().toISOString()
    };
    track("newsletter_signup", { page: location.pathname, where: where });
    track("generate_lead", { lead_route: "newsletter", lead_path: location.pathname });
    try {
      fetch(HOOK, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p), keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  function buildForm(where, onDone) {
    var f = document.createElement("form");
    f.className = "cs-form";
    f.noValidate = true;
    f.innerHTML =
      '<div class="cs-row">' +
      '<input class="cs-in" type="email" inputmode="email" autocomplete="email" required placeholder="' + T.ph + '" aria-label="Email">' +
      '<input class="cs-hp" type="text" name="company_url" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="cs-btn" type="submit">' + T.btn + '</button></div>' +
      '<div class="cs-err" role="alert"></div>' +
      '<p class="cs-fine">' + T.consent + ' <a href="' + T.privHref + '">' + T.priv + '</a>.</p>';
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var inp = f.querySelector(".cs-in"), hp = f.querySelector(".cs-hp"), err = f.querySelector(".cs-err");
      var v = (inp.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { err.textContent = T.bad; inp.focus(); return; }
      err.textContent = "";
      f.querySelector(".cs-btn").disabled = true;
      f.querySelector(".cs-btn").textContent = T.sending;
      if (!hp.value) send(v, where);
      var ok = document.createElement("div");
      ok.className = "cs-ok";
      ok.setAttribute("role", "status");
      ok.innerHTML = "<b>" + T.okHead + "</b>" + T.okBody;
      f.parentNode.replaceChild(ok, f);
      if (onDone) onDone();
    });
    return f;
  }

  var open = null;
  function openSheet(e) {
    if (open) return;
    var ov = document.createElement("div");
    ov.className = "cs-ov";
    var sh = document.createElement("div");
    sh.className = "cs-sheet";
    sh.setAttribute("role", "dialog");
    sh.setAttribute("aria-modal", "true");
    sh.setAttribute("aria-label", T.head);
    sh.innerHTML = '<button class="cs-x" type="button" aria-label="' + T.close + '">&times;</button>' +
      "<h2>" + T.head + '</h2><p class="cs-sub">' + T.sub + "</p>";
    sh.appendChild(buildForm("subscribe-popup"));
    ov.appendChild(sh);
    document.body.appendChild(ov);
    open = ov;
    var prevFocus = document.activeElement;
    function close() {
      if (!open) return;
      document.body.removeChild(ov);
      open = null;
      document.removeEventListener("keydown", onKey);
      try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (er) {}
    }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    sh.querySelector(".cs-x").addEventListener("click", close);
    var first = sh.querySelector(".cs-in");
    if (first) setTimeout(function () { try { first.focus(); } catch (er) {} }, 50);
    track("subscribe_open", { page: location.pathname });
  }

  function isSignup(a) {
    if (!a) return false;
    if (a.getAttribute("data-portal") === "signup") return true;
    var h = a.getAttribute("href") || "";
    return h.indexOf("#/portal/signup") > -1;
  }

  // Capture phase, so this runs before the (broken) Ghost Portal handler.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (isSignup(a)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openSheet();
    }
  }, true);

  function inline() {
    var nodes = document.querySelectorAll("[data-inline-signup]");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-cs-ready")) continue;
      nodes[i].setAttribute("data-cs-ready", "1");
      nodes[i].appendChild(buildForm("subscribe-inline"));
    }
    if (location.hash === "#/portal/signup") openSheet();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inline);
  else inline();
})();
