/* Pond homepage banner (v348, Lucy Nov 17, 2026): the live port of the
   "one pond" mockup. 16 dressed category ducks swim on a spinning
   carousel ring in one Asian-garden pond under the live hero. Drag the
   water to spin (with momentum), ‹ › step duck by duck, tap a duck to
   hop, splash, quack and visit its page, and "Toss some crumbs" sends
   one random duck to the center to eat. 3 koi swim below.
   Duck art is the site's own dressed ducks, background-removed only
   (tools/cut-pond-ducks.py) -- never redrawn. Reduced motion turns off
   the idle drift, koi swim and bobbing. No version bump: this file is
   new for v341 and loads unversioned.
   v348 geometry (Lucy's Nov 17 screenshots: the ring bunched up and
   crowded on phones): the old ring was too small for 16 full-frame
   ducks -- measured worst bounding-box overlap 3,829px^2 on a 430px
   phone (front duck 116px tall vs ~76px between front neighbours) and
   6,553px^2 on desktop, plus the .8s left/top/height transition made
   every duck chase its target for 0.8s mid-spin, so dragging piled
   them up instead of spinning them. The ring is now bigger (phone
   ry 0.284H -> 0.32H, desktop ry 0.26H -> 0.28H), the ducks smaller
   (phone front 116px -> ~72px, desktop 141px -> ~89px), side ducks
   shrink hardest (perspective: 0.30x at the sides, 0.45x at the back),
   and position transitions are gone -- JS lays the ring out every
   frame, so the flock tracks the finger live. Verified zero
   bounding-box overlap at 430/728/768/840/1000/1120px stage widths
   at 64 rotation offsets (one 0.4px^2 sub-pixel touch at 728px).
   v354 (Lucy Nov 17, 2026: "it doesn't spin the correct way"): the
   spin direction is reversed -- drag right now moves the ducks right
   (offset decreases), idle drift runs the other way, momentum follows
   the drag, and the ‹ › buttons are swapped, so the ring turns the
   opposite way in every interaction. Ring geometry, duck sizes, tags,
   feed and tap-to-open are untouched.
   v354 also (Lucy Nov 17: bigger front ducks, bottom three names):
   front duck ~84px on phones / ~110px desktop (was ~72/~89), with a
   much steeper depth falloff (depth^10: neighbours ~0.62x, two steps
   away ~0.32x, back 0.30x) and opacity falling off the same way
   (front 1.00, back 0.55), so the ducks at the bottom of the ring are
   notably bigger and clearer. The ring itself (rx/ry) and the oval
   shape are unchanged; the bigger front duck still clears its
   neighbours with zero overlap (verified at 430/768/1120px, 16
   rotations each). Name tags are now the bottom three only
   (TAG_COUNT 3).
   v355 (Lucy Nov 17: "these are mini" -- the bottom three must be
   the big ones, every time, whichever ducks they are): the falloff
   is flattened at the top so the front duck AND its two neighbours
   form one big group (neighbours ~0.86x the front, two steps away
   ~0.56x, back 0.30x), the front duck grows again (phone ~93px,
   desktop ~132px), and the ring angles are warped (WARP_K) so the
   bottom three get extra horizontal room: angles near the front
   spread apart, angles near the back squeeze together, so the three
   big ducks still clear each other with zero overlap (verified at
   320-430px phones and 561-1120px desktop, 16 rotations each, real
   PNG aspects). Spin direction, tags, oval shape, feed and
   tap-to-open are untouched.
   v356 (live check of v355 caught two things): (1) a neighbour tag
   whose centred box collided with a placed tag was hidden -- at rot 0
   the Pond Post tag vanished under the wide Today's Deals tag, so the
   default view showed only two names. Tags now NUDGE outward, away
   from the stage centre, until they clear (hide only if they still
   cannot fit). (2) the v355 live-check sweep read heights 900ms after
   setOffset, by which time idle drift had moved the ring ~3.4 deg off
   its snap, so the neighbours read asymmetric (0.82x/0.90x instead of
   0.86x/0.86x). setOffset now counts as an interaction (resets the
   idle clock), so a programmatic snap stays put for 5s. Geometry,
   sizes, warp, spin, feed and tap-to-open are untouched.
   v357 (Lucy Nov 17, 2026: "These are still small" on the v356
   screenshot, where the bottom-three emphasis was working but the
   ducks still read as mini): the bottom three get a BIG jump, not
   another nudge -- front duck phone ~121px (was ~93), desktop ~178px
   (was 140, clamp raised), neighbours ~0.83x of the front. The
   geometry that buys it: the ring widens (phone rx 0.46W -> 0.48W)
   and sits higher (cy 0.54H -> 0.48H), the warp strengthens
   (WARP_K 0.28 -> 0.50) so the big three get more horizontal room,
   the scale floor drops to 0.15 and the falloff after the neighbours
   steepens (two steps away 0.33x, back 0.15x), so the ducks beside
   the big three are small enough to clear. The stage size and the
   oval shape are unchanged (phone water oval rx/ry 1.39, still wider
   than tall; desktop geometry untouched). A 130px front duck is NOT
   reachable on a 430px phone without overlap: the binding pair is
   the widest neighbour against the duck two steps away, which needs
   ~75px of horizontal room where the ring only has ~70px, and the
   side ducks cap rx. 121px is the largest front that keeps zero
   overlap at every width 320-1280px, 16 rotations each, real PNG
   aspects. Spin direction, tags, feed and tap-to-open are
   untouched.
   v358 (Lucy Nov 17, 2026: "when I go back it doesn't work after
   clicking a duck"): the pond broke on back-navigation. Two holes,
   both about the pond coming back stale. (1) pond-home.js loaded
   UNVERSIONED, so after a deploy the browser HTTP cache
   (max-age=14400 on the custom domain) can serve the previous
   version's pond code for up to 4 hours -- the same staleness that
   made v176-v178 look broken for site-nav.js (fixed at v179 by
   versioning the URL). index.html now loads pond-home.js?v=358,
   and _headers gives it the same max-age=60 as site-nav.js. (2) the
   pond had no pageshow handling: if the browser restores the page
   from the back-forward cache, nothing re-lays the ring or checks
   the animation loop. On a persisted pageshow, layout() re-runs at
   once and the loop is restarted if it did not survive the restore
   (two quiet checks, never while hidden). The bug did NOT reproduce
   in headless Chromium (back is a full reload there, and the reload
   works) -- it is only seen on her iPhone, so both holes are closed
   rather than just the one a desktop check could see. Sizes, spin,
   tags, oval, art, feed and tap-to-open are untouched.
   v359 (Lucy Nov 17, 2026: "when you spin it it should continuously
   be the bottom three that are big no matter what"): the v357 curve
   kept depth^2.9 down to depth 0.85 and then fell fast (^6), so the
   bottom three were only a big group within a few degrees of a snap
   -- as soon as the ring moved off a snap, the third duck's depth
   fell below 0.85 and its size collapsed toward 0.61x. Measured live
   on the v358 site (frame-by-frame rAF sampling through a slow drag,
   a fast flick, arrow tweens, idle drift and a touch drag): the
   3rd-largest duck read 0.645-0.657x of the front at EVERY phase of
   the spin, and even a few seconds after load, because idle drift
   walks the ring off its snap. The set was always right (the three
   largest were the three bottom-most) but the third duck was not
   BIG. The scale is now a plateau with a cliff (see duckScale): the
   third duck -- depth 0.831 at a half-step, 0.924 at a snap -- never
   drops below 0.80x at any offset, while the fourth duck at a snap
   (depth 0.707) stays ~0.32x, so the group still reads as three
   when settled. Settled proportions are unchanged (front 1.00,
   neighbours 0.83x); the phone front duck itself steps back a touch
   (see the trade-off note below). At a half-step the third and fourth ducks are
   mirror twins (same depth), so both read big mid-spin -- the ring
   is symmetric there, and the rule that matters (the ducks at the
   bottom are big) holds. The fine-offset overlap sweep also found
   the CURRENT code already grazes mid-spin on phones (worst
   41.6px^2 at 60 deg, deals/polls) -- the v357 suite only checked
   snaps, so it never saw it; the v359 suite sweeps every degree.
   TRADE-OFF (measured, not guessed): four big ducks cannot fit in
   the bottom of a 430px ring without touching -- a numerical search
   over warp, front size and ring height shows zero mid-spin overlap
   needs a ~95px front duck, which would undo the big jump Lucy
   called perfect. So the phone front duck steps back a touch
   (121px -> ~114px, 6%, imperceptible) and the warp strengthens
   (0.50 -> 0.54) to buy room: worst mid-spin overlap 178px^2 on
   phones (a brief edge touch between two adjacent bottom ducks,
   front duck correctly on top), zero on desktop, and the side ducks
   still clear the stage edges by ~2px. Desktop keeps the full
   178px front duck.
   v371 (Lucy Nov 18, 2026: "make the ducks all the same size on the
   carousel"): the v357/v359 bottom-three-big rule is SUPERSEDED --
   every duck on the ring now renders at ONE size, at every rotation
   phase, on phone and desktop. No depth scaling at all: duckScale
   returns 1 at every depth, and duckHeight replaces frontHeight.
   SIZE, BY MEASUREMENT (same numerical approach as v357: real PNG
   aspects, ring geometry, every 3 degrees plus all snaps and
   half-steps, phone and desktop widths):
   - Warp kept (K=0.54): the warp squeezes the back of the ring to
     0.46x angular spacing, so the back ducks bunch up and the fitting
     equal height collapses to ~38px on a 430px phone. Unusable.
   - Warp removed (K=0): uniform angular spacing. Overlap fit is
     ~48px on a 430px phone and ~58px on live desktop -- but at that
     size the side ducks are sliced ~17px by the stage edge on phones,
     because the ring point sits only 0.02W from the edge (rx 0.48W)
     and a full-size duck is ~52px wide. Zero overlap AND zero clip
     (clip <= 2px, the v359 bound) needs the phone ring a touch
     narrower, so phone rx goes 0.48W -> 0.43W; the joint fit is then
     46.4px on a 430px phone, 34.8px on a 320px phone, 34.8px on a
     768px desktop stage and 57.6px on live desktop (1280px), all
     with zero overlap and zero clip at every sampled offset.
   The code uses duckHeight = clamp(H*0.098, 28, 46) on phones
   (~45px at 430x464, ~34px at 320x346) and clamp(H*0.104, 28, 56)
   on desktop (~56px at 1280x538, ~34px at 768x323), each ~1-2px
   under its measured maximum. The warp existed ONLY to spread the
   big bottom three, so with equal ducks it is 0. The phone water
   oval narrows a little (rx/ry 1.39 -> 1.24, still wider than tall;
   desktop oval unchanged at 3.57) -- that is the price of equal
   ducks that are neither sliced at the sides nor overlapping.
   TRADE-OFF (measured, not guessed): equal ducks cap at ~45px on
   phones, against the 114px front duck Lucy had -- 16 full-frame
   ducks share one ring, and the sides of the ring (adjacent ducks
   ~ry*sin(22.5 deg) apart vertically) set the ceiling. Bigger equal
   ducks need overlap, sliced sides, or a different ring. Drag/spin
   direction, feeding, tap-to-open, bottom-three tags, bfcache/
   pageshow relayout, koi, bobbing and opacity falloff are unchanged. */
(function () {
  "use strict";

  /* The 16 sections, in the order Lucy listed them (verified against
     partLinks in site-nav.js and the homepage Explore section). Labels
     match the pond names; hrefs are the sections' real pages. */
  var DUCKS = [
    { key: "deals", label: "Today's Deals", href: "deals.html" },
    { key: "news", label: "Pond Post", href: "news.html" },
    { key: "food", label: "Food", href: "recipes.html" },
    { key: "books", label: "Book Nook", href: "books.html" },
    { key: "planner", label: "Planner", href: "planner.html" },
    { key: "stuff", label: "My Stuff", href: "stuff.html" },
    { key: "nest", label: "My Nest", href: "nest.html" },
    { key: "chat", label: "Quack Shack", href: "chat.html" },
    { key: "pantry", label: "Pantry", href: "pantry.html" },
    { key: "travel", label: "Travel", href: "travel.html" },
    { key: "korean", label: "Korean", href: "korean.html" },
    { key: "nestegg", label: "Nest Egg", href: "bills.html" },
    { key: "gifts", label: "Gifts", href: "gifts.html" },
    { key: "pets", label: "Pets", href: "pets.html" },
    { key: "countdowns", label: "Countdowns", href: "countdowns.html" },
    { key: "polls", label: "Polls", href: "polls.html" }
  ];
  var N = DUCKS.length;
  var STEP = Math.PI * 2 / N;
  var FRONT_ANGLE = Math.PI / 2; /* bottom centre of the ring */
  var TAG_COUNT = 3; /* v354 (Lucy Nov 17): only the three ducks at the
     bottom/front of the ring wear a name tag -- the front duck plus its
     two nearest neighbours, following the ring as it spins */

  var KOI_SVG =
    '<svg viewBox="0 0 120 48" aria-hidden="true">' +
    '<path d="M16 24 Q36 8 62 10 Q96 12 108 24 Q96 40 62 38 Q36 40 16 24Z" fill="#fff7ea"/>' +
    '<path d="M34 12 Q48 8 58 12 Q54 20 44 20 Q36 18 34 12Z" fill="#f57c00"/>' +
    '<path d="M62 12 Q78 12 88 20 Q80 26 66 24 Q60 18 62 12Z" fill="#f57c00"/>' +
    '<path d="M86 24 Q100 18 108 24 Q100 30 86 24Z" fill="#f57c00"/>' +
    '<path d="M16 24 L4 12 L8 24 L4 36 Z" fill="#ffb74d"/>' +
    '<circle cx="98" cy="20" r="2.4" fill="#23414d"/></svg>';

  var banner = document.getElementById("pond-banner");
  if (!banner) return;
  var stage = document.getElementById("pond-stage");
  var water = document.getElementById("pond-water");
  var ducksEl = document.getElementById("pond-ducks");
  var tagsEl = document.getElementById("pond-tags");
  var koiEl = document.getElementById("pond-koi");
  var crumbsEl = document.getElementById("pond-crumbs");
  var statusEl = document.getElementById("pond-status");
  var prevBtn = document.getElementById("pond-prev");
  var nextBtn = document.getElementById("pond-next");
  var crumbsBtn = document.getElementById("pond-crumbs-btn");
  if (!stage || !ducksEl || !tagsEl) return;

  var reduced = false;
  try {
    reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}
  if (reduced) banner.classList.add("pond-reduced");

  var offset = FRONT_ANGLE; /* duck 0 (Today's Deals) starts at the front */
  var velocity = 0;
  var dragging = false;
  var lastInteract = 0; /* ms timestamp of the last drag/arrow/crumb */
  var snapTarget = null;
  var tween = null; /* {from, to, start, dur} angle tween for arrows */
  var feeding = null; /* {index, until} while a duck is at the centre */
  var lastFed = -1;
  var justDraggedUntil = 0;
  var audioCtx = null;
  var tagWidths = {}; /* key -> measured px width, cached */
  var duckEls = [];
  var tagEls = [];
  var koiEls = [];
  var koiState = [
    { a: 0.4, speed: 0.00016, rx: 0.52, ry: 0.42, dir: 1, size: 0.085 },
    { a: 2.6, speed: 0.00011, rx: 0.34, ry: 0.55, dir: -1, size: 0.07 },
    { a: 4.4, speed: 0.0002, rx: 0.62, ry: 0.3, dir: 1, size: 0.06 }
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function normAngle(a) {
    a = a % (Math.PI * 2);
    return a < 0 ? a + Math.PI * 2 : a;
  }
  function now() { return Date.now(); }

  /* Geometry derives from the stage's live size, so desktop (long oval)
     and phone share one layout. v348: the ring had to grow and the
     ducks shrink -- 16 full-frame ducks (the PNGs fill their frames,
     98-100% visible art, no transparent padding to hide in) cannot
     fit larger on this ring without overlapping. Phone water oval is
     now rx/ry = 1.39 (was 1.33 at v356): still wider than tall, not a
     circle, and a touch closer to her approved 3:2 -- the wider ring
     is what buys the horizontal room for the much bigger bottom
     three. Desktop water oval is 3.57 (was 3.85). */
  function pondGeom(W, H) {
    /* v357: the ring widens (phone rx 0.46W -> 0.48W) and sits higher
       (cy 0.54H -> 0.48H) so the much bigger bottom three have room;
       ry is unchanged, so the phone water oval stays wider than tall
       (rx/ry 1.39, was 1.33) and the stage size is unchanged.
       v371: phone rx steps back 0.48W -> 0.43W. Equal ducks (see the
       header note) are ~52px wide at the sides, and the ring point
       sat only 0.02W from the stage edge, so the side ducks were
       sliced ~17px by overflow:hidden. At 0.43W the side ducks clear
       the edge with room to spare; the phone water oval narrows a
       little (rx/ry 1.39 -> 1.24, still wider than tall) and the
       desktop ring is untouched. */
    if (W < 561) return { cx: W * 0.5, cy: H * 0.48, rx: W * 0.43, ry: H * 0.32 };
    return { cx: W * 0.5, cy: H * 0.56, rx: W * 0.42, ry: H * 0.28 };
  }
  function duckHeight(W, H) {
    /* v371 (Lucy Nov 18): ONE size for every duck on the ring, at
       every rotation phase. Measured joint fit (zero overlap AND
       clip <= 2px at every sampled offset, real PNG aspects): 46.4px
       at 430x464, 34.8px at 320x346, 34.8px at 768x323, 57.6px at
       1280x538. These formulas sit ~1-2px under those maxima, so
       rounding in a real browser cannot tip a pair into overlap.
       The old frontHeight clamps (v359 ~114px phone / ~178px
       desktop front duck) are gone with the big-three rule. */
    if (W < 561) return clamp(H * 0.098, 28, 46);
    return clamp(H * 0.104, 28, 56);
  }
  /* v371: the warp is 0. It existed ONLY to spread the big bottom
     three (v355-v359: angles near the front spread apart, near the
     back squeeze together). With every duck the same size there is
     nothing to spread, and the squeeze only bunches the back ducks
     (0.46x angular spacing there caps the equal height at ~38px on
     a 430px phone, measured). Uniform angles now; snap/frontIndex/
     step keep working exactly as before, since the warp's fixed
     points were the front (90 deg) and the back (270 deg) and
     warpAngle with K=0 is the identity. */
  var WARP_K = 0;
  function warpAngle(a) { return a + WARP_K * Math.sin(a - FRONT_ANGLE); }
  /* v371: no depth scaling at all -- every duck renders at the one
     duckHeight, whichever duck it is and wherever the ring sits.
     The v359 plateau/cliff curve (bottom three big continuously) is
     gone with the rule it served. duckScale stays as a function so
     the TYD_POND test seam is stable; it returns 1 at every depth. */
  function duckScale(depth) {
    return 1;
  }
  function rawAngle(i) { return normAngle(offset + i * STEP); }
  function duckAngle(i) { return normAngle(warpAngle(rawAngle(i))); }
  function duckDepth(i) { return Math.sin(duckAngle(i)); } /* +1 front, -1 back */
  function frontIndex() {
    var best = 0, bestD = -2;
    for (var i = 0; i < N; i++) {
      var d = duckDepth(i);
      if (d > bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function build() {
    var i, d, b, img, tag, k;
    for (i = 0; i < N; i++) {
      d = DUCKS[i];
      b = document.createElement("button");
      b.type = "button";
      b.className = "pond-duck";
      b.setAttribute("aria-label", "Visit " + d.label);
      b.setAttribute("data-key", d.key);
      b.dataset.index = String(i);
      img = document.createElement("img");
      img.src = "images/pond-ducks/" + d.key + ".png";
      img.alt = "";
      img.draggable = false;
      b.appendChild(img);
      var wl = document.createElement("span");
      wl.className = "duck-water";
      wl.setAttribute("aria-hidden", "true");
      b.appendChild(wl);
      var rip = document.createElement("span");
      rip.className = "duck-ripple";
      rip.setAttribute("aria-hidden", "true");
      rip.style.animationDelay = ((i * 0.37) % 3).toFixed(2) + "s";
      b.appendChild(rip);
      ducksEl.appendChild(b);
      duckEls.push(b);
      img.addEventListener("load", layout);
      tag = document.createElement("span");
      tag.className = "pond-tag";
      tag.textContent = d.label;
      tag.setAttribute("data-key", d.key);
      tag.hidden = true;
      tagsEl.appendChild(tag);
      tagEls.push(tag);
    }
    for (k = 0; k < 3; k++) {
      var kw = document.createElement("div");
      kw.className = "koi";
      kw.innerHTML = KOI_SVG;
      koiEl.appendChild(kw);
      koiEls.push(kw);
    }
  }

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    var g = pondGeom(W, H);
    var hf = duckHeight(W, H);
    var i, b, img, depth, h, w, aspect, x, y, yb;
    /* The water layer is the pond oval itself, feathered into the scene. */
    water.style.left = (g.cx - g.rx) + "px";
    water.style.top = (g.cy - g.ry) + "px";
    water.style.width = (g.rx * 2) + "px";
    water.style.height = (g.ry * 2) + "px";
    for (i = 0; i < N; i++) {
      if (feeding && feeding.index === i) continue; /* fed duck is centred */
      b = duckEls[i];
      img = b.querySelector("img");
      depth = duckDepth(i);
      /* v371: one size for every duck -- no depth scaling, so the
         height is duckHeight for all 16 ducks, whichever ducks they
         are; opacity/z-index below still follow the warped depth
         (screen position), so the ring keeps its depth cue. */
      h = hf;
      aspect = (img && img.naturalWidth && img.naturalHeight)
        ? img.naturalWidth / img.naturalHeight : 0.8;
      w = h * aspect;
      x = g.cx + g.rx * Math.cos(duckAngle(i));
      y = g.cy + g.ry * Math.sin(duckAngle(i));
      /* The duck's bottom sits just past the ring point, so the lower
         body (tinted by .duck-water) reads as submerged. */
      yb = y + h * 0.10;
      b.style.height = h.toFixed(1) + "px";
      b.style.left = (x - w / 2).toFixed(1) + "px";
      b.style.top = (yb - h).toFixed(1) + "px";
      b.style.zIndex = String(10 + Math.round((depth + 1) * 25));
      b.style.opacity = (0.55 + 0.45 * Math.pow(Math.max(0, depth), 2)).toFixed(2); /* v354: opacity falls off with the size -- front 1.00, back 0.55 */
      b.dataset.depth = depth.toFixed(3);
      b.dataset.bottom = yb.toFixed(1);
      b.dataset.cx = x.toFixed(1);
    }
    layoutKoi(W, H, g);
    layoutTags(W, H);
  }

  function layoutKoi(W, H, g) {
    for (var k = 0; k < 3; k++) {
      var s = koiState[k];
      var el = koiEls[k];
      var kw = W * s.size;
      var x, y, heading;
      if (reduced) {
        /* Static spots, spread around the pond, facing the centre. */
        x = g.cx + g.rx * s.rx * Math.cos(s.a);
        y = g.cy + g.ry * s.ry * Math.sin(s.a);
        heading = Math.atan2(g.cy - y, g.cx - x) * 180 / Math.PI;
      } else {
        x = g.cx + g.rx * s.rx * Math.cos(s.a);
        y = g.cy + g.ry * s.ry * Math.sin(s.a);
        var dx = -g.rx * s.rx * Math.sin(s.a) * s.dir;
        var dy = g.ry * s.ry * Math.cos(s.a) * s.dir;
        heading = Math.atan2(dy, dx) * 180 / Math.PI;
      }
      el.style.width = kw.toFixed(1) + "px";
      el.style.transform =
        "translate(" + (x - kw / 2).toFixed(1) + "px," + (y - 12).toFixed(1) + "px)" +
        " rotate(" + heading.toFixed(1) + "deg)" +
        (s.dir < 0 ? " scaleY(-1)" : "");
    }
  }

  /* Name tags live in their own layer above the ducks, so a duck can
     never clip one. Only the nearest ducks are candidates for a tag,
     on ONE shared row just below the front ducks' bottoms (v348: the
     old two-row greedy pack slid tags sideways into a pile on phones
     -- Pantry / Quack Shack / My Nest / My Stuff / Planner stacked on
     each other in Lucy's screenshots). The front duck's tag always
     shows; any other candidate whose tag would collide with a tag
     already placed, or would not fit inside the stage, is hidden
     instead of piled. Tags never overlap each other at any rotation. */
  function layoutTags(W, H) {
    var order = [];
    for (var i = 0; i < N; i++) order.push(i);
    order.sort(function (a, b) { return duckDepth(b) - duckDepth(a); });
    /* Shared baseline: the lowest duck bottom among the tagged ducks,
       so every tag in the row sits at exactly the same y. One row
       only: the v348 ring leaves 34px+ below the front bottoms. */
    var yBase = 0;
    for (var j = 0; j < TAG_COUNT; j++) {
      var dj = order[j];
      if (feeding && feeding.index === dj) continue;
      yBase = Math.max(yBase, parseFloat(duckEls[dj].dataset.bottom || "0"));
    }
    var ROW_H = 28, GAP = 6;
    /* Right clearance for the site's fixed "Hide bar" button, which
       floats at the bottom-right of the viewport above the bar: tags
       must never slide under it (it covered the Countdowns tag). The
       button's left edge sits ~56px from the stage's right edge. */
    var RIGHT_PAD = 58;
    var y0 = yBase + 6;
    if (y0 + ROW_H > H - 4) y0 = Math.max(4, H - ROW_H - 4);
    /* Place front duck first (its tag is guaranteed), then the rest
       by depth. v356: a candidate whose centred tag would overlap a
       placed tag is NUDGED outward, away from the stage centre,
       until it clears the placed tag(s) -- so the bottom three keep
       all three names. (v355 hid it instead, and at rot 0 the Pond
       Post tag collided with the wide Today's Deals tag and vanished
       from the default view.) A nudge only ever moves a tag away
       from the others, never into a pile. If the nudge runs into the
       stage edge -- usually the Hide-bar pad on the right, which the
       tag must not slide under -- the placed tag it clashes with
       (in practice the front tag) YIELDS a few px away instead, so
       the neighbour still shows. If neither move fits, the candidate
       is hidden as before. Tags never overlap each other at any
       rotation. */
    var placed = []; /* {x0, x1, el, w} on the single row */
    for (var t = 0; t < TAG_COUNT; t++) {
      var idx = order[t];
      var tag = tagEls[idx];
      if (feeding && feeding.index === idx) { tag.hidden = true; continue; }
      var cx = parseFloat(duckEls[idx].dataset.cx || "0");
      var w = tagWidths[DUCKS[idx].key];
      if (w == null) {
        try { w = tag.getBoundingClientRect().width || 0; } catch (e) { w = 0; }
        if (w > 0) tagWidths[DUCKS[idx].key] = w;
      }
      if (!w) w = DUCKS[idx].label.length * 8 + 24; /* jsdom fallback */
      var maxX = Math.max(4, W - w - RIGHT_PAD);
      var x = clamp(cx - w / 2, 4, maxX);
      var clash = false;
      if (x + w > W - 4) clash = true;
      for (var p = 0; p < placed.length; p++) {
        if (x < placed[p].x1 + GAP && x + w > placed[p].x0 - GAP) { clash = true; break; }
      }
      if (clash && placed.length > 0) {
        var dir = (cx < W / 2) ? -1 : 1;
        var nx = x;
        for (var q = 0; q < placed.length; q++) {
          if (dir < 0) nx = Math.min(nx, placed[q].x0 - GAP - w);
          else nx = Math.max(nx, placed[q].x1 + GAP);
        }
        nx = clamp(nx, 4, maxX);
        var clash2 = false;
        if (nx + w > W - 4) clash2 = true;
        for (var r = 0; r < placed.length; r++) {
          if (nx < placed[r].x1 + GAP && nx + w > placed[r].x0 - GAP) { clash2 = true; break; }
        }
        if (!clash2) { x = nx; clash = false; }
        else {
          /* Yield with cascade: shift the placed tag we clash with
             away from us by the shortfall (a few px live), and if
             that push lands on the other placed tag, push that one
             too -- at most three tags, so the chain is one link.
             Every moved tag must stay inside the stage and clear of
             the others, or the candidate stays hidden. */
          var blocker = null;
          for (var s = 0; s < placed.length; s++) {
            if (nx < placed[s].x1 + GAP && nx + w > placed[s].x0 - GAP) { blocker = placed[s]; break; }
          }
          if (blocker) {
            var mv = -dir; /* blocker moves away from the candidate */
            var shift = (dir > 0)
              ? (blocker.x1 + GAP - nx)
              : (nx + w + GAP - blocker.x0);
            var moves = [];
            var bx0 = blocker.x0 + mv * shift, bx1 = blocker.x1 + mv * shift;
            moves.push([blocker, bx0, bx1]);
            var okc = shift > 0;
            for (var c = 0; c < placed.length && okc; c++) {
              var other = placed[c];
              if (other === blocker) continue;
              if (bx0 < other.x1 + GAP && bx1 > other.x0 - GAP) {
                var shift2 = (mv < 0) ? (other.x1 + GAP - bx0) : (bx1 + GAP - other.x0);
                var ox0 = other.x0 + mv * shift2, ox1 = other.x1 + mv * shift2;
                moves.push([other, ox0, ox1]);
              }
            }
            for (var d = 0; d < moves.length && okc; d++) {
              var mmaxX = Math.max(4, W - moves[d][0].w - RIGHT_PAD);
              if (moves[d][1] < 4 || moves[d][1] > mmaxX) okc = false;
            }
            if (okc) {
              for (var e = 0; e < moves.length; e++) {
                moves[e][0].x0 = moves[e][1]; moves[e][0].x1 = moves[e][2];
                moves[e][0].el.style.left = Math.round(moves[e][1]) + "px";
              }
              x = nx; clash = false;
            }
          }
        }
      }
      /* The front tag is placed first, so it can never clash; a later
         candidate that fits nowhere is hidden instead. */
      if (clash) { tag.hidden = true; continue; }
      placed.push({ x0: x, x1: x + w, el: tag, w: w });
      tag.hidden = false;
      tag.style.left = Math.round(x) + "px";
      tag.style.top = Math.round(y0) + "px";
    }
    for (var m = 0; m < N; m++) {
      if (order.indexOf(m) === -1 || order.indexOf(m) >= TAG_COUNT) tagEls[m].hidden = true;
      if (feeding && feeding.index === m) tagEls[m].hidden = true;
    }
  }

  function nearestStepTarget() {
    /* Snap so a duck sits exactly at the front. */
    var k = Math.round((FRONT_ANGLE - offset) / STEP);
    return FRONT_ANGLE - k * STEP;
  }
  function startTween(to, dur) {
    if (reduced) { offset = to; layout(); return; }
    tween = { from: offset, to: to, start: now(), dur: dur || 320 };
    snapTarget = null;
  }
  function step(dir) {
    /* dir +1 = previous duck to the front, -1 = next duck to the front. */
    lastInteract = now();
    startTween(offset + dir * STEP, 320);
  }

  function quack() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t0 = audioCtx.currentTime;
      [[0, 620, 0.09], [0.11, 420, 0.13]].forEach(function (n) {
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(n[1], t0 + n[0]);
        o.frequency.exponentialRampToValueAtTime(n[1] * 0.55, t0 + n[0] + n[2]);
        g.gain.setValueAtTime(0.0001, t0 + n[0]);
        g.gain.exponentialRampToValueAtTime(0.1, t0 + n[0] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[0] + n[2]);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t0 + n[0]);
        o.stop(t0 + n[0] + n[2] + 0.02);
      });
    } catch (e) {}
  }

  function splash(x, y) {
    var s = document.createElement("span");
    s.className = "pond-splash";
    s.setAttribute("aria-hidden", "true");
    s.style.left = x + "px";
    s.style.top = y + "px";
    stage.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 900);
  }

  function navigate(url) { window.location.href = url; }

  function hopAndVisit(i) {
    var b = duckEls[i];
    var d = DUCKS[i];
    var cx = parseFloat(b.dataset.cx || "0");
    var bottom = parseFloat(b.dataset.bottom || "0");
    b.classList.remove("hop");
    void b.offsetWidth; /* restart the hop animation */
    b.classList.add("hop");
    splash(cx, bottom - 6);
    quack();
    setTimeout(function () { api.navigate(d.href); }, 480);
  }

  /* Feeding: a random duck each toss.
     v367 spin audit (Lucy, Nov 18, 2026: every spin must be truly random,
     always): the old picker never fed the same duck twice in a row, so one
     duck was always excluded from the next toss. That is gone now. Each
     toss is one independent uniform pick over all the ducks. */
  function pickFeedingDuck() {
    if (N < 2) return 0;
    return Math.floor(Math.random() * N);
  }
  function feedDuck(i) {
    if (feeding) return false;
    lastInteract = now();
    lastFed = i;
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return false;
    var g = pondGeom(W, H);
    var b = duckEls[i];
    var hf = duckHeight(W, H);
    var tag = tagEls[i];
    feeding = { index: i, until: now() + 2400 };
    /* Crumbs land at the centre. */
    crumbsEl.innerHTML = "";
    for (var c = 0; c < 5; c++) {
      var cr = document.createElement("span");
      cr.className = "crumb";
      cr.style.left = (g.cx + (c - 2) * 14 + ((c % 2) ? 6 : -4)) + "px";
      cr.style.top = (g.cy + ((c % 3) - 1) * 10) + "px";
      crumbsEl.appendChild(cr);
    }
    /* Koi gather at the crumbs. */
    for (var k = 0; k < 3; k++) {
      koiState[k].gather = { x: g.cx, y: g.cy };
    }
    /* The duck swims to the centre, big, tag above it. */
    b.style.transition = "left .8s ease, top .8s ease, height .8s ease";
    b.style.zIndex = "90";
    b.style.opacity = "1";
    b.style.height = hf.toFixed(1) + "px";
    var aspect = 0.8;
    var img = b.querySelector("img");
    if (img && img.naturalWidth && img.naturalHeight) aspect = img.naturalWidth / img.naturalHeight;
    var w = hf * aspect;
    b.style.left = (g.cx - w / 2).toFixed(1) + "px";
    b.style.top = (g.cy - hf * 0.58).toFixed(1) + "px";
    tag.hidden = false;
    tag.style.left = clamp(g.cx - (tagWidths[DUCKS[i].key] || 120) / 2, 4, Math.max(4, W - 130)) + "px";
    tag.style.top = Math.max(4, g.cy - hf * 0.58 - 32) + "px";
    if (statusEl) statusEl.textContent = DUCKS[i].label + " swam over for some crumbs!";
    setTimeout(function () {
      crumbsEl.innerHTML = "";
      for (var kk = 0; kk < 3; kk++) delete koiState[kk].gather;
      feeding = null;
      /* v348: the duck CSS no longer transitions left/top/height (that
         lag is what piled the ring up mid-spin), so the swim back to
         the ring gets its transition inline here, then cleared. */
      b.style.transition = "left .8s ease, top .8s ease, height .8s ease";
      layout();
      setTimeout(function () { b.style.transition = ""; }, 850);
    }, 2400);
    return true;
  }

  /* Drag to spin, with momentum. */
  var dragX = 0, dragOffset = 0, dragMoved = false, lastX = 0, lastT = 0;
  function onPointerDown(e) {
    if (feeding) return;
    dragging = true;
    dragMoved = false;
    dragX = e.clientX;
    lastX = e.clientX;
    lastT = now();
    dragOffset = offset;
    velocity = 0;
    tween = null;
    snapTarget = null;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onPointerMove(e) {
    if (!dragging) return;
    var W = stage.clientWidth || 430;
    var dx = e.clientX - dragX;
    if (Math.abs(e.clientX - dragX) > 6 || Math.abs(e.clientY - (dragY0 || 0)) > 6) dragMoved = true;
    var t = now();
    var dt = Math.max(1, t - lastT);
    /* v354: reversed -- a rightward drag decreases the offset, so the
       ducks follow the finger to the right instead of sliding left. */
    velocity = clamp(-(e.clientX - lastX) / dt, -2, 2); /* px per ms */
    lastX = e.clientX;
    lastT = t;
    offset = dragOffset - dx * (Math.PI * 2 / W) * 1.1;
    layout();
  }
  var dragY0 = 0;
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    lastInteract = now();
    if (dragMoved) {
      justDraggedUntil = now() + 300;
      var W = stage.clientWidth || 430;
      /* Momentum: px/ms -> radians/frame, decaying in the loop.
         Capped so one fast flick spins at most ~3.5 degrees a frame
         and settles in about a second, instead of whirling for many
         seconds and swallowing the next arrow step. */
      velocity = clamp(velocity * (Math.PI * 2 / W) * 1.1 * 16, -0.06, 0.06);
      if (Math.abs(velocity) < 0.004) snapTarget = nearestStepTarget();
    }
  }

  /* Main loop: idle drift, momentum, snap, tweens, koi swim, bobbing. */
  var lastFrame = 0;
  var lastFrameAt = 0; /* ms timestamp of the most recent frame() tick;
     the pageshow restart check (v358) reads it */
  function frame(t) {
    var dt = Math.min(50, t - (lastFrame || t));
    lastFrame = t;
    lastFrameAt = now();
    if (!reduced) {
      if (tween) {
        var p = clamp((now() - tween.start) / tween.dur, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        offset = tween.from + (tween.to - tween.from) * e;
        if (p >= 1) { offset = tween.to; tween = null; snapTarget = null; lastInteract = now(); }
        layout();
      } else if (dragging) {
        /* layout happens in the pointermove handler */
      } else if (Math.abs(velocity) > 0.0004) {
        offset += velocity;
        velocity *= 0.94;
        layout();
      } else if (snapTarget != null) {
        var diff = snapTarget - offset;
        offset += diff * 0.18;
        if (Math.abs(diff) < 0.001) { offset = snapTarget; snapTarget = null; }
        layout();
      } else if (!feeding && now() - lastInteract > 5000) {
        offset -= 0.0011 * (dt / 16.7); /* v354: slow idle drift, reversed */
        layout();
      }
      /* Koi swim (unless gathering for crumbs). */
      var W = stage.clientWidth, H = stage.clientHeight;
      if (W && H) {
        var g = pondGeom(W, H);
        for (var k = 0; k < 3; k++) {
          var s = koiState[k];
          if (s.gather) {
            /* ease toward the crumbs, then hold */
            var gx = s.gather.x, gy = s.gather.y;
            var cxk = g.cx + g.rx * s.rx * Math.cos(s.a);
            var cyk = g.cy + g.ry * s.ry * Math.sin(s.a);
            s.a += Math.atan2(gy - cyk, gx - cxk) * 0.02 * s.dir;
          } else {
            s.a += s.speed * dt * s.dir;
          }
        }
        layoutKoi(W, H, g);
      }
      /* Gentle bobbing on the duck images. */
      if (!feeding) {
        for (var i = 0; i < N; i++) {
          var img = duckEls[i].querySelector("img");
          if (img) img.style.transform = "translateY(" +
            (Math.sin(t / 900 + i * 1.7) * 2.5).toFixed(2) + "px)";
        }
      }
    }
    requestAnimationFrame(frame);
  }

  /* v358: restart the animation loop if it did not survive a
     back-forward-cache restore. A live loop ticks at least once
     within ~500ms, so two quiet checks (500ms, 1500ms after the
     restore) mean it died; the checks read lastFrameAt, which only
     frame() updates, so a live loop can never trigger a restart
     (no double loop). Never restart while the page is hidden --
     rAF does not tick there -- and re-check when it becomes
     visible again. */
  function restartLoopIfDead() {
    if (reduced) return;
    var at = now();
    function check() {
      if (document.visibilityState === "hidden") return;
      if (lastFrameAt >= at) return; /* a frame ran since the restore */
      lastFrame = 0;
      if (window.requestAnimationFrame) requestAnimationFrame(frame);
    }
    setTimeout(check, 500);
    setTimeout(check, 1500);
  }

  function init() {
    build();
    layout();
    /* v354: the ‹ › buttons are swapped, so the ring turns the
       opposite way from before: › now brings the duck that used to
       come from the ‹ side, and vice versa. stepNext/stepPrev below
       keep their list-order meaning (next/previous duck in DUCKS)
       for the test seam; only the buttons are reversed. */
    if (prevBtn) prevBtn.addEventListener("click", function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { step(1); });
    if (crumbsBtn) crumbsBtn.addEventListener("click", function () {
      if (feeding) return;
      feedDuck(pickFeedingDuck());
    });
    ducksEl.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".pond-duck") : null;
      if (!b) return;
      if (now() < justDraggedUntil) return; /* it was a drag, not a tap */
      hopAndVisit(parseInt(b.dataset.index, 10));
    });
    stage.addEventListener("pointerdown", function (e) {
      dragY0 = e.clientY;
      onPointerDown(e);
    });
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", layout);
    /* v358: after a back-forward-cache restore, re-lay the ring at
       once (sizes/tags are correct immediately, whatever the stage
       size is now) and restart the loop if it died in the freeze. A
       normal load already runs init+layout, so only persisted
       restores take this path. */
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      layout();
      restartLoopIfDead();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") restartLoopIfDead();
    });
    lastInteract = now();
    if (!reduced && window.requestAnimationFrame) requestAnimationFrame(frame);
  }

  /* Test hooks (jsdom): layout, stepping, the crumb picker and the
     navigate target are all drivable without a real browser. */
  var api = {
    ducks: DUCKS,
    frontIndex: frontIndex,
    stepNext: function () { step(-1); },
    stepPrev: function () { step(1); },
    pickFeedingDuck: pickFeedingDuck,
    feedDuck: feedDuck,
    layout: layout,
    layoutTags: layoutTags,
    isReducedMotion: function () { return reduced; },
    getOffset: function () { return offset; },
    setOffset: function (v) { offset = v; lastInteract = now(); layout(); },
    pondGeom: pondGeom,
    duckHeight: duckHeight,
    duckScale: duckScale,
    getLastFed: function () { return lastFed; },
    navigate: navigate,
    isFeeding: function () { return !!feeding; },
    getLastFrameAt: function () { return lastFrameAt; },
    restartLoopIfDead: restartLoopIfDead
  };
  window.TYD_POND = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
