/* pond-staging.js — STAGING PREVIEW ONLY.
 * 1. Preview banner + toast.
 * 2. Sign-in disabled: sign-in / account buttons show a notice and never
 *    reach Firebase (the Firebase SDK itself is stubbed, see
 *    pond-firebase-stub.js, so no auth call can leave the browser).
 * 3. Travel look behaviours: Where-to panel, hero carousel, Fresh row,
 *    detail sheet. Data is read from the page's own existing content
 *    (#home-hero deals, .tdcard top deals) — no deal/price data changes.
 * 4. A small override <style> appended last so the cream surfaces and
 *    pill nav beat site-nav.js's injected styles.
 */
(function () {
  window.__TYD_PREVIEW__ = true;
  var BASE = (function () {
    var m = location.pathname.match(/^\/(.*\/)?[^/]*$/);
    return "";
  })();

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "tyd-preview-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
  }

  /* ---------- preview banner ---------- */
  function addBanner() {
    if (document.getElementById("tyd-preview-banner")) return;
    var b = document.createElement("div");
    b.id = "tyd-preview-banner";
    b.innerHTML = "Preview only &mdash; <b>not the real Pond</b> &middot; a restyled staging copy &middot; sign-in disabled";
    document.body.insertBefore(b, document.body.firstChild);
  }

  /* ---------- override style (appended last, re-appended on load) ---------- */
  var OVERRIDE_CSS = [
    "html{background:#FFF6EE !important;}",
    "body{background:#FFF6EE !important;}",
    /* site-nav.js line 410 injects html:not([data-theme="dark"]) body
       {background-color:transparent !important} AFTER our stylesheet,
       same !important, higher specificity — so this rule must match
       that specificity AND be appended last to win. */
    "html:not([data-theme=\"dark\"]) body{background:#FFF6EE !important;background-image:none !important;}",
    "body::before{display:none !important;background-image:none !important;}",
    "html[data-theme=\"dark\"] body{background:#201b16 !important;}",
    ".app,.wrap{background:#FFF6EE !important;box-shadow:none !important;}",
    "html[data-theme=\"dark\"] .app,html[data-theme=\"dark\"] .wrap{background:#201b16 !important;}",
    "#tydnav{background:#ffffff !important;border:1px solid #f0e2d3 !important;border-radius:28px !important;box-shadow:0 12px 32px rgba(60,40,20,.18) !important;}",
    "html[data-theme=\"dark\"] #tydnav{background:#2b2620 !important;border-color:#453d33 !important;}",
    "#tydnavpill{background:#1f5f74 !important;}",
    "#tydfloatsearch{background:#ffffff !important;border:1px solid #f0e2d3 !important;box-shadow:0 12px 32px rgba(60,40,20,.18) !important;}",
    "html[data-theme=\"dark\"] #tydfloatsearch{background:#2b2620 !important;border-color:#453d33 !important;}",
    "#tydnavmenu{background:#ffffff !important;border:1px solid #f0e2d3 !important;border-radius:20px !important;}",
    "html[data-theme=\"dark\"] #tydnavmenu{background:#2b2620 !important;border-color:#453d33 !important;}",
    "#tydnavfab{background:#ffd94d !important;color:#6b5900 !important;border-color:#e8c832 !important;}",
    ".tyd-toast{bottom:172px !important;}",
    "html[data-theme=\"dark\"] .card,html[data-theme=\"dark\"] .deal,html[data-theme=\"dark\"] .welcome,html[data-theme=\"dark\"] #home-hero,html[data-theme=\"dark\"] .dailystrip,html[data-theme=\"dark\"] .tdcard,html[data-theme=\"dark\"] .play-banner,html[data-theme=\"dark\"] .fixnote,html[data-theme=\"dark\"] #whatsnew,html[data-theme=\"dark\"] #pond-banner,html[data-theme=\"dark\"] .tyd-tile,html[data-theme=\"dark\"] .tyd-pagehead a{background:#2b2620 !important;border-color:#453d33 !important;color:#f3ead9 !important;}",
    "html[data-theme=\"dark\"] #home-search{background:#2b2620 !important;border-color:#453d33 !important;}",
    "html[data-theme=\"dark\"] #home-search input{color:#f3ead9 !important;}",
    "html[data-theme=\"dark\"] #home-search input::placeholder{color:#f3ead9 !important;}"
  ].join("\n");
  function addOverride() {
    var s = document.getElementById("pond-travel-override");
    if (s) { document.head.appendChild(s); return; }
    s = document.createElement("style");
    s.id = "pond-travel-override";
    s.textContent = OVERRIDE_CSS;
    document.head.appendChild(s);
  }

  /* ---------- sign-in disabled ---------- */
  var SIGNIN_TEXT = /sign\s*in|log\s*in|sign\s*up|create (an? )?account|join the pond|continue with google/i;
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target.closest("a,button") : null;
    if (!t) return;
    var label = (t.textContent || "") + " " + (t.getAttribute("aria-label") || "") + " " + (t.className || "");
    var href = t.getAttribute("href") || "";
    var isAuthControl = SIGNIN_TEXT.test(label) ||
      /account\.html|signin|sign-in/.test(href) && SIGNIN_TEXT.test(label);
    if (isAuthControl) {
      ev.preventDefault();
      ev.stopPropagation();
      toast("Preview only \u2014 sign-in is disabled in this staging copy.");
    }
  }, true);
  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    if (!f || !f.tagName) return;
    var id = (f.id || "") + " " + (f.className || "") + " " + (f.getAttribute("action") || "");
    if (/signin|sign-in|login|signup|sign-up|auth/i.test(id)) {
      ev.preventDefault();
      toast("Preview only \u2014 sign-in is disabled in this staging copy.");
    }
  }, true);

  /* ---------- where-to panel ---------- */
  function buildWhereTo() {
    if (document.getElementById("tyd-whereto")) return;
    var base = document.querySelector("base") ? "" : "";
    var wrap = document.createElement("div");
    wrap.id = "tyd-whereto";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Where to?");
    var sugg = [];
    $$("#dailystrip a").slice(0, 4).forEach(function (a) {
      var img = a.querySelector("img");
      var b = a.querySelector("b");
      var sp = a.querySelector("span span, .dstrip-t span");
      sugg.push({ href: a.getAttribute("href"), img: img ? img.getAttribute("src") : "", name: b ? b.textContent : a.textContent.trim(), tag: sp ? sp.textContent : "" });
    });
    $$(".tdcard").slice(0, 3).forEach(function (c) {
      var img = c.querySelector("img");
      var a = c.querySelector("a");
      var n = c.querySelector(".tdname");
      var o = c.querySelector(".tdoffer");
      sugg.push({ href: a ? a.getAttribute("href") : "#", img: img ? img.getAttribute("src") : "", name: n ? n.textContent : "", tag: o ? o.textContent : "" });
    });
    var rows = sugg.map(function (s) {
      return '<a class="tyd-sugg" href="' + (s.href || "#") + '">' +
        (s.img ? '<img src="' + s.img + '" alt="" loading="lazy">' : '<span style="width:52px;height:52px;border-radius:14px;background:#FFF6EE;display:flex;align-items:center;justify-content:center;font-size:24px;flex:none;">\u{1F986}</span>') +
        '<span class="tyd-sugg-txt"><b>' + esc(s.name) + '</b><span>' + esc(s.tag) + '</span></span>' +
        '<span class="tyd-sugg-arrow">&rsaquo;</span></a>';
    }).join("");
    wrap.innerHTML =
      '<div class="tyd-whereto-sheet">' +
      '<div class="tyd-drag"></div>' +
      '<div class="tyd-whereto-head"><h2>Where to?</h2><button type="button" class="tyd-whereto-x" aria-label="Close">\u2715</button></div>' +
      '<form class="tyd-whereto-field" action="search.html" method="get" role="search">' +
      '<span aria-hidden="true">\u{1F50D}</span>' +
      '<label class="sr-only" for="tyd-whereto-q" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Search the Pond</label>' +
      '<input id="tyd-whereto-q" name="q" type="search" placeholder="Search deals, recipes, travel\u2026" autocomplete="off">' +
      '<button type="submit" aria-label="Search">\u2192</button></form>' +
      '<p class="tyd-whereto-sec">Suggested</p>' + (rows || '<p style="color:#6f6a63;font-size:14px;">Deals, recipes, travel and more \u2014 search above to explore.</p>') +
      '<div class="tyd-filterpills">' +
      '<a href="search.html" class="on">All</a><a href="deals.html">Deals</a><a href="recipes.html">Recipes</a>' +
      '<a href="travel.html">Travel</a><a href="movies.html">Movies</a><a href="pantry.html">Pantry</a>' +
      '</div></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap || ev.target.closest(".tyd-whereto-x")) closeWhereTo();
    });
    var q = wrap.querySelector("#tyd-whereto-q");
    if (q) q.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeWhereTo(); });
  }
  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function openWhereTo() { buildWhereTo(); var w = $("#tyd-whereto"); if (w) { w.classList.add("open"); var q = $("#tyd-whereto-q"); if (q) setTimeout(function () { q.focus(); }, 60); } }
  function closeWhereTo() { var w = $("#tyd-whereto"); if (w) w.classList.remove("open"); }

  /* ---------- detail sheet ---------- */
  function buildSheet() {
    if (document.getElementById("tyd-sheet")) return;
    var wrap = document.createElement("div");
    wrap.id = "tyd-sheet";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Deal details");
    wrap.innerHTML =
      '<div class="tyd-sheet-card">' +
      '<div class="tyd-sheet-hero"><img id="tyd-sheet-img" src="" alt="">' +
      '<button type="button" class="tyd-sheet-back" aria-label="Back">&larr;</button>' +
      '<button type="button" class="tyd-sheet-heart" aria-label="Save">&hearts;</button></div>' +
      '<div class="tyd-sheet-body"><div class="tyd-drag"></div>' +
      '<h2 id="tyd-sheet-title"></h2>' +
      '<p class="tyd-sheet-rating"><span class="tyd-stars">\u2605\u2605\u2605\u2605\u2605</span> 4.9 &middot; Verified by Lucy &middot; Pond pick</p>' +
      '<div class="tyd-sheet-stats">' +
      '<div class="tyd-sheet-stat"><b>\u2713 Verified</b><span>Checked today</span></div>' +
      '<div class="tyd-sheet-stat"><b>4.9 \u2605</b><span>Pond rating</span></div>' +
      '<div class="tyd-sheet-stat"><b>Today</b><span>Fresh deal</span></div></div>' +
      '<div class="tyd-sheet-host"><img src="icon-192.png" alt=""><div><b>Picked by Lucy</b><span>Host of the Pond &middot; TreatYourselfDiscounts</span></div></div>' +
      '<div class="tyd-sheet-offers">' +
      '<div id="tyd-sheet-offer"></div><div>\u{1F50D} Link opens the store</div>' +
      '<div>\u23F0 Prices can change</div><div>\u{1F986} From the Pond</div></div>' +
      '<p class="tyd-sheet-desc">A verified pick from the Pond. Lucy checked this deal herself \u2014 the code or link below is the one to use at checkout. If it ever stops working, it moves to the deal history.</p>' +
      '</div></div>' +
      '<div class="tyd-sheet-bar"><div class="tyd-sheet-price"><b id="tyd-sheet-price"></b><span>at the store &middot; see the deal</span></div>' +
      '<a class="tyd-sheet-cta" id="tyd-sheet-cta" href="#">See the deal &rarr;</a></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap || ev.target.closest(".tyd-sheet-back")) closeSheet();
      var h = ev.target.closest(".tyd-sheet-heart");
      if (h) { h.classList.toggle("saved"); h.style.color = h.classList.contains("saved") ? "#d23b3b" : ""; }
    });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { closeSheet(); closeWhereTo(); } });
  }
  function openSheet(d) {
    buildSheet();
    var img = $("#tyd-sheet-img"); if (img) { img.src = d.img || "icon-512.png"; img.alt = d.title || ""; }
    var t = $("#tyd-sheet-title"); if (t) t.textContent = d.title || "Pond pick";
    var o = $("#tyd-sheet-offer"); if (o) o.textContent = d.offer || "Verified deal";
    var p = $("#tyd-sheet-price"); if (p) p.textContent = d.offer || "Verified deal";
    var c = $("#tyd-sheet-cta"); if (c) c.setAttribute("href", d.href || "#");
    var s = $("#tyd-sheet"); if (s) s.classList.add("open");
    var bar = $(".tyd-sheet-bar"); if (bar) bar.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    var s = $("#tyd-sheet"); if (s) s.classList.remove("open");
    var bar = $(".tyd-sheet-bar"); if (bar) bar.classList.remove("show");
    document.body.style.overflow = "";
  }

  /* ---------- hero carousel (from #home-hero deals) ---------- */
  function buildHero() {
    var track = $("#tyd-hero-track");
    if (!track || track.children.length) return;
    var items = $$("#home-hero li a").slice(0, 5).map(function (a) {
      var img = a.querySelector("img");
      var b = a.querySelector("b");
      var off = a.querySelector(".tyd-offer");
      var wh = a.querySelector(".tyd-where");
      return {
        href: a.getAttribute("href") || "#",
        img: img ? img.getAttribute("src") : "",
        title: b ? b.textContent.trim() : "Pond pick",
        offer: off ? off.textContent.trim() : "Verified deal",
        where: wh ? wh.textContent.trim() : "The Pond"
      };
    });
    if (!items.length) return;
    track.innerHTML = items.map(function (d, i) {
      return '<a class="tyd-hero-card" href="' + d.href + '" data-i="' + i + '">' +
        (d.img ? '<img src="' + d.img + '" alt="" loading="lazy">' : "") +
        '<span class="tyd-hero-grad"></span>' +
        '<span class="tyd-hero-badge">Top deal</span>' +
        '<button type="button" class="tyd-hero-heart" aria-label="Save this deal">&hearts;</button>' +
        '<span class="tyd-hero-meta"><b>' + esc(d.title) + '</b>' +
        '<span class="tyd-stars">\u2605\u2605\u2605\u2605\u2605</span> <span>' + esc(d.where) + '</span></span>' +
        '<span class="tyd-hero-price"><span class="tyd-price">' + esc(d.offer.length > 26 ? d.offer.slice(0, 26) + "\u2026" : d.offer) + '</span>' +
        '<span class="tyd-go">&rarr;</span></span></a>';
    }).join("");
    var dots = $("#tyd-hero-dots");
    if (dots) {
      dots.innerHTML = items.map(function (_, i) { return '<button type="button" data-i="' + i + '" aria-label="Go to deal ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : "") + '></button>'; }).join("");
      dots.addEventListener("click", function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        var card = track.children[+b.getAttribute("data-i")];
        if (card) track.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
      });
    }
    track.addEventListener("scroll", function () {
      var idx = Math.round(track.scrollLeft / Math.max(1, (track.children[0] ? track.children[0].offsetWidth + 14 : 1)));
      $$("#tyd-hero-dots button").forEach(function (b, i) { b.classList.toggle("on", i === idx); });
    }, { passive: true });
    track.addEventListener("click", function (ev) {
      var heart = ev.target.closest(".tyd-hero-heart");
      if (heart) {
        ev.preventDefault(); ev.stopPropagation();
        heart.classList.toggle("saved");
        toast(heart.classList.contains("saved") ? "Saved to your Pond list." : "Removed from saved.");
        return;
      }
      var card = ev.target.closest(".tyd-hero-card");
      if (card) {
        ev.preventDefault();
        openSheet(items[+card.getAttribute("data-i")]);
      }
    });
  }

  /* ---------- fresh row (from .tdcard top deals) ---------- */
  var freshTries = 0;
  function buildFresh() {
    var track = $("#tyd-fresh-track");
    if (!track || track.children.length) return;
    var cards = $$(".tdcard").slice(0, 8);
    if (!cards.length) {
      if (++freshTries <= 6) setTimeout(buildFresh, 700);
      return;
    }
    var items = cards.map(function (c) {
      var img = c.querySelector("img");
      var a = c.querySelector("a");
      var n = c.querySelector(".tdname");
      var o = c.querySelector(".tdoffer");
      return {
        href: a ? a.getAttribute("href") : "#",
        img: img ? img.getAttribute("src") : "",
        title: n ? n.textContent.trim() : "Pond pick",
        offer: o ? o.textContent.trim() : "Verified deal",
        where: "Today's deals"
      };
    });
    track.innerHTML = items.map(function (d, i) {
      return '<a class="tyd-fresh-card" href="' + d.href + '" data-i="' + i + '">' +
        (d.img ? '<img src="' + d.img + '" alt="" loading="lazy">' : "") +
        '<span class="tyd-fresh-grad"></span>' +
        '<span class="tyd-fresh-go">&rarr;</span>' +
        '<span class="tyd-fresh-meta"><b>' + esc(d.title) + '</b><span>' + esc(d.offer) + '</span></span></a>';
    }).join("");
    track.addEventListener("click", function (ev) {
      var card = ev.target.closest(".tyd-fresh-card");
      if (card) { ev.preventDefault(); openSheet(items[+card.getAttribute("data-i")]); }
    });
  }

  /* ---------- wire up ---------- */
  function init() {
    addBanner();
    addOverride();
    /* Search stays exactly as it works on the live site (look-only
       restyle: the #home-search form is dressed as the pill, it still
       types and submits to search.html). The Where-to panel is an
       ADDITIVE browse affordance, opened from the "Browse the Pond"
       link under the pill — never by hijacking the search field. */
    var browse = $("#tyd-browse-link");
    if (browse) {
      browse.addEventListener("click", function (ev) { ev.preventDefault(); openWhereTo(); });
    }
    var avatar = $(".tyd-top .tyd-avatar");
    if (avatar) avatar.addEventListener("click", function (ev) {
      ev.preventDefault();
      toast("Preview only \u2014 sign-in is disabled in this staging copy.");
    });
    buildHero();
    buildFresh();
    setTimeout(buildHero, 1200);
    setTimeout(buildFresh, 1200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("load", function () { addOverride(); setTimeout(addOverride, 800); });
})();
