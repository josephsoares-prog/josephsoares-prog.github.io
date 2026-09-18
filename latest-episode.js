/* latest-episode.js — fills the "Latest episode" facade on the home pages from
   /latest-episode.json ({ "id": "<YouTube video id>", "title": "<title>" }).
   Update the JSON (Make.com: on new upload → commit) and the home page follows.
   The title is refreshed from YouTube's oEmbed endpoint when reachable, so the
   JSON title is only a fallback. Added 2026-09-18. */
(function(){
  "use strict";
  var wrap = document.querySelector("[data-latest-episode]");
  if (!wrap) return;
  var btn = wrap.querySelector(".epfacade");
  if (!btn) return;
  function apply(id, title){
    if (id) {
      btn.setAttribute("data-video-id", id);
      btn.style.backgroundImage = "url(https://i.ytimg.com/vi/" + id + "/hqdefault.jpg)";
      btn.classList.add("hasthumb");
      btn.onclick = function(){
        var f = document.createElement("iframe");
        f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
        f.title = "Corridor Intelligence \u2014 latest episode";
        f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture";
        f.allowFullscreen = true; f.loading = "lazy";
        btn.replaceWith(f);
      };
    }
    var t = btn.querySelector(".eptitle");
    if (t && title) t.textContent = title.replace(/\s*[|\u2014-]\s*Corridor Intelligence.*$/i, "");
  }
  fetch("/latest-episode.json", { cache: "no-cache" }).then(function(r){ return r.json(); }).then(function(d){
    if (!d || !d.id) return;
    apply(d.id, d.title);
    return fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + d.id))
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(o){ if (o && o.title) apply(null, o.title); })
      .catch(function(){});
  }).catch(function(){});
})();
