/* Pull to refresh (v341) — site-wide, touch only.
 *
 * Dragging down from the very top of any page shows a small duck spinner
 * and reloads the page on release past the threshold (~70px). A short pull
 * snaps back with no reload. The bottom-bar Refresh button is untouched —
 * this is an extra way to refresh, not a replacement.
 *
 * Rules:
 * - Only fires when the page is already scrolled to the very top
 *   (window.scrollY === 0). Never fires mid-page or on ordinary scrolling.
 * - Only a mostly-vertical downward touch drag. Horizontal drags, the pond
 *   carousel drag, the bell panel, the color panel and the section
 *   switcher menu are all ignored.
 * - The spinner is a fixed pill at the top of the viewport (z-index 9980:
 *   above content and the duck wallpaper layer, below the bottom bar
 *   #tydnav at 9990 and the bell panel at 9994). It disappears on release
 *   and never covers anything permanently. pointer-events:none, so it can
 *   never swallow a tap.
 * - Dark mode: dark pill, light text (html[data-theme="dark"]).
 * - Reduced motion: no spin animation — static duck + text, reload still
 *   happens on release past the threshold.
 * - Self-contained IIFE, no dependencies, guards against double-init.
 *   Safe to load on every page; no-ops gracefully where there is nothing
 *   to refresh.
 *
 * Test hook: window.TYDPullRefresh = { THRESHOLD, onReload, isPulling,
 * isVisible, reset }. Tests set onReload to a stub instead of a real
 * location.reload(); production default is a real location.reload().
 */
(function () {
  "use strict";

  if (window.TYDPullRefresh) return; /* already loaded — do not double-init */

  var THRESHOLD = 70; /* px of downward pull needed to refresh */
  var MAX_PULL = 110; /* px the spinner follows the finger, at most */
  var START_SLOP = 8; /* px before we decide the gesture is a pull */

  /* Elements the gesture must never start on: the pond carousel banner,
     the bell panel, the color panel, the section switcher menu/button,
     form fields, and anything explicitly marked data-tyd-nopull. */
  var EXCLUDED_SELECTOR =
    "#pond-banner, #tydbellpanel, #tydcolorpop, #tydswitchmenu, #tydswitchbtn," +
    " input, textarea, select, [contenteditable], [data-tyd-nopull]";

  var reducedMotion = false;
  try {
    reducedMotion =
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    reducedMotion = false;
  }

  var el = null; /* spinner pill */
  var hintEl = null;
  var duckEl = null;
  var startX = 0;
  var startY = 0;
  var lastDy = 0;
  var pulling = false;
  var decided = false; /* true once we know this touch is / is not a pull */
  var started = false; /* true while a candidate touch is in progress */

  function duckSrc() {
    /* Mirror the page's own relative path: root pages load
       pull-refresh.js, brands/* pages load ../pull-refresh.js, so the
       duck sits next to this script in both cases. */
    try {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var s = scripts[i].getAttribute("src") || "";
        if (s.indexOf("pull-refresh.js") !== -1) {
          return s.slice(0, s.indexOf("pull-refresh.js")) + "icon-512.png";
        }
      }
    } catch (e) {}
    return "icon-512.png";
  }

  function isAtTop() {
    var y = 0;
    try {
      y = window.scrollY || 0;
    } catch (e) {}
    var de = document.documentElement ? document.documentElement.scrollTop || 0 : 0;
    var b = document.body ? document.body.scrollTop || 0 : 0;
    return y === 0 && de === 0 && b === 0;
  }

  function isExcluded(target) {
    if (!target) return true;
    var node = target.nodeType === 3 ? target.parentNode : target;
    if (!node || typeof node.closest !== "function") return false;
    if (node.closest(EXCLUDED_SELECTOR)) return true;
    /* Any horizontally scrollable ancestor owns the gesture (carousel
       strips, horizontal scrollers) — leave it alone. */
    var n = node;
    while (n && n !== document.body && n !== document.documentElement) {
      try {
        if (n.scrollWidth > n.clientWidth + 1) {
          var cs = window.getComputedStyle ? window.getComputedStyle(n) : null;
          var ox = cs ? cs.overflowX : "";
          /* Inline style as a fallback (computed style is authoritative
             where the browser reports it). */
          if (!ox && n.style) ox = n.style.overflowX || "";
          if (ox === "auto" || ox === "scroll") return true;
        }
      } catch (e) {}
      n = n.parentNode;
    }
    return false;
  }

  function build() {
    if (el) return;
    var style = document.createElement("style");
    style.id = "tyd-pullrefresh-css";
    style.textContent =
      "#tyd-pullrefresh{position:fixed;left:50%;top:0;z-index:9980;" +
      "display:flex;flex-direction:column;align-items:center;gap:2px;" +
      "padding:8px 16px 10px;background:rgba(255,255,255,.94);" +
      "border:2px solid #bcd9e4;border-top:none;" +
      "border-bottom-left-radius:16px;border-bottom-right-radius:16px;" +
      "box-shadow:0 6px 18px rgba(35,65,77,.18);" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
      "color:#23414d;pointer-events:none;" +
      "transform:translate(-50%,calc(-100% - 4px));" +
      "transition:transform .18s ease;will-change:transform;}" +
      "#tyd-pullrefresh img{width:36px;height:36px;display:block;}" +
      "#tyd-pullrefresh .tyd-pr-hint{font-size:12px;font-weight:700;line-height:1.2;white-space:nowrap;}" +
      "#tyd-pullrefresh.tyd-pr-show{transform:translate(-50%,calc(-100% + var(--tyd-pr-pull,0px)));transition:none;}" +
      "#tyd-pullrefresh.tyd-pr-ready img{animation:tyd-pr-spin 1s linear infinite;}" +
      "#tyd-pullrefresh.tyd-pr-refreshing img{animation:tyd-pr-spin .7s linear infinite;}" +
      "@keyframes tyd-pr-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}" +
      "html[data-theme=\"dark\"] #tyd-pullrefresh{background:rgba(23,38,53,.96);" +
      "border-color:#2e4a5f;color:#eefaff;box-shadow:0 6px 18px rgba(0,0,0,.45);}" +
      "@media (prefers-reduced-motion: reduce){" +
      "#tyd-pullrefresh img{animation:none !important;}" +
      "#tyd-pullrefresh{transition:none;}}";
    document.head.appendChild(style);

    el = document.createElement("div");
    el.id = "tyd-pullrefresh";
    el.setAttribute("aria-hidden", "true");
    if (reducedMotion) el.classList.add("tyd-pr-reduced");
    duckEl = document.createElement("img");
    duckEl.src = duckSrc();
    duckEl.alt = "";
    hintEl = document.createElement("span");
    hintEl.className = "tyd-pr-hint";
    hintEl.textContent = "Pull to refresh";
    el.appendChild(duckEl);
    el.appendChild(hintEl);
    document.body.appendChild(el);
  }

  function show(pull) {
    if (!el) return;
    el.classList.add("tyd-pr-show");
    el.style.setProperty("--tyd-pr-pull", Math.min(pull, MAX_PULL) + "px");
    if (pull >= THRESHOLD) {
      el.classList.add("tyd-pr-ready");
      hintEl.textContent = "Release to refresh";
    } else {
      el.classList.remove("tyd-pr-ready");
      hintEl.textContent = "Pull to refresh";
    }
  }

  function hide() {
    if (!el) return;
    el.classList.remove("tyd-pr-show", "tyd-pr-ready", "tyd-pr-refreshing");
    el.style.setProperty("--tyd-pr-pull", "0px");
    hintEl.textContent = "Pull to refresh";
  }

  function doReload() {
    var hook = window.TYDPullRefresh;
    if (hook && typeof hook.onReload === "function") {
      hook.onReload();
      return;
    }
    try {
      window.location.reload();
    } catch (e) {}
  }

  function resetState() {
    started = false;
    decided = false;
    pulling = false;
    startX = 0;
    startY = 0;
    lastDy = 0;
  }

  function onTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
    if (!isAtTop()) return;
    var t = e.touches[0];
    if (isExcluded(e.target)) return;
    started = true;
    decided = false;
    pulling = false;
    startX = t.clientX;
    startY = t.clientY;
    lastDy = 0;
  }

  function onTouchMove(e) {
    if (!started || !e.touches || e.touches.length !== 1) return;
    var t = e.touches[0];
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;
    lastDy = dy;
    if (!decided) {
      if (Math.abs(dx) > Math.abs(dy)) {
        /* Mostly horizontal — a carousel swipe or sideways scroll. Not us. */
        resetState();
        return;
      }
      if (dy <= 0) {
        /* Upward or no downward movement — ordinary scrolling. Not us. */
        resetState();
        return;
      }
      if (dy < START_SLOP) return; /* tiny jitter, wait for a real move */
      decided = true;
      pulling = true;
    }
    if (!pulling) return;
    if (dy <= 0) {
      hide();
      resetState();
      return;
    }
    /* We have claimed the gesture: stop the browser's own overscroll
       fighting us while the spinner follows the finger. */
    if (e.cancelable) {
      try {
        e.preventDefault();
      } catch (err) {}
    }
    show(dy);
  }

  function onTouchEnd() {
    if (!started) return;
    var wasPulling = pulling;
    var dy = lastDy;
    resetState();
    if (!wasPulling) return;
    if (dy >= THRESHOLD) {
      if (el) {
        el.classList.add("tyd-pr-refreshing");
        el.classList.remove("tyd-pr-ready");
        hintEl.textContent = "Refreshing…";
      }
      doReload();
    } else {
      hide(); /* short pull: snap back, no reload */
    }
  }

  function init() {
    if (!document.body) return;
    build();
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
  }

  window.TYDPullRefresh = {
    THRESHOLD: THRESHOLD,
    onReload: null, /* tests set this to a stub; default is location.reload() */
    isPulling: function () {
      return pulling;
    },
    isVisible: function () {
      return !!el && el.classList.contains("tyd-pr-show");
    },
    isReady: function () {
      return !!el && el.classList.contains("tyd-pr-ready");
    },
    hintText: function () {
      return hintEl ? hintEl.textContent : "";
    },
    reducedMotion: function () {
      return reducedMotion;
    },
    reset: function () {
      hide();
      resetState();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
