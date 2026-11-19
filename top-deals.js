/* Today's Top Deals: spotlights the strongest savings on the deals page.
   It reads the spotlight from Firestore (deals/current) so the daily deal
   check can update it with a document write and no deploy. If Firestore
   is unreachable, or the v13 rules are not published yet, it falls back
   to gathering the live deal rows from the brand pages at visit time. */
(function () {
  var grid = document.getElementById("tdgrid");
  if (!grid) return;
  function txt(el) { return el ? el.textContent.trim() : ""; }
  function tydSlug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
  /* v261: brand thumbnails for the spotlight cards. If a spotlight item
     has no img in Firestore, fall back to the brand logo so the card is
     not text-only (Unni, Nov 14, 2026). Same URLs as deals-live.js. */
  var BRAND_IMGS = {
    "bur-bur": "https://burbur.com/cdn/shop/files/BLACKlogo_9fe2987e-c0d1-4e25-87ac-274fd6fc4dac.png?v=1726160671",
    "rorry": "https://rorry.com/cdn/shop/files/IMG_202503146858_565x628_4594e37a-1f72-462f-9c2d-77016d43e64b.jpg?v=1741932872",
    "fanttik": "https://fanttik.com/cdn/shop/files/a2ef603fbf313567e18bc28e0e280ee2_96be3f40-c8e8-4681-b0d9-bc1253f6ae9d.png?v=1761643404&width=2048",
    "glocusent": "https://glocusent.com/cdn/shop/files/2_fe161971-dd8b-4497-afe4-0432f24af773.png?crop=center&height=1230&v=1757663890&width=410",
    "soundcore": "https://cdn.shopify.com/s/files/1/0501/7678/6607/files/logo-d_f9a37426-3dd4-4c03-9591-0da953d1f997_600x.png?v=1681962161",
    "aurzen": "https://aurzen.com/cdn/shop/files/Aurzen-Identity-Kit_Logo_Gold_120x.png?v=1723713535",
    "lotus-and-luna": "https://www.lotusandluna.com/cdn/shop/files/HORIZONTAL_LOGO_BLACK_1_a95458ff-b9bc-46c8-bb7b-a19cae950b9e_1600x.png?v=1727396860",
    "seeq": "https://seeqsupply.com/cdn/shop/files/logo-seeq.png?v=1741233889&width=600",
    "mellow-sleep": "https://mellowsleep.com/cdn/shop/files/plush_plum_86a2bfe3-29ec-4ac6-8473-655c22112954.png?v=1771248481&width=600",
    "ridge": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Ridge_company_logo.svg/250px-Ridge_company_logo.svg.png",
    "im8-health": "https://im8health.com/cdn/shop/files/Header-Logo-New.svg?v=1729066833&width=600",
    "weekend-sleepover": "https://www.weekendsleepover.com/cdn/shop/files/FULL_STACK.png?v=1770490174&width=1200",
    "ryze": "https://www.ryzesuperfoods.com/cdn/shop/files/LinkedIn_Actual_Profile_Picture_1_1.png?v=1777312333",
    "zawina-morocco": "https://www.zawinamorocco.com/cdn/shop/files/ZM_Brown_Logo2_e5245841-694b-43df-9ed0-76b8038f2a3d.png?v=1751139093"
  };
  function brandImgFor(d) {
    var slug = String(d.page || d.href || "").replace(/^brands\//, "").replace(/\.html$/, "");
    return d.img || BRAND_IMGS[slug] || "";
  }
  function renderDeals(deals) {
    deals = (deals || []).slice(0, 8);
    if (!deals.length) {
      grid.innerHTML = '<p class="td-load">No spotlight deals at this exact moment. Browse the brands below for the latest offers.</p>';
      return;
    }
    grid.innerHTML = "";
    deals.forEach(function (d) {
      var el = document.createElement("div");
      el.className = "tdcard";
      var top = document.createElement("a");
      top.href = d.href; top.target = "_blank"; top.rel = "noopener";
      top.addEventListener("click", function () {
        if (window.goatcounter && window.goatcounter.count) {
          var bslug = tydSlug(String(d.page || "").replace(/^brands\//, "").replace(/\.html$/, ""));
          window.goatcounter.count({ path: "click-deal-" + bslug + "-" + tydSlug(d.name), event: true });
        }
      });
      top.style.textDecoration = "none"; top.style.color = "inherit";
      var imgSrc = brandImgFor(d);
      if (imgSrc) {
        var im = document.createElement("img");
        im.src = imgSrc; im.alt = ""; im.loading = "lazy";
        im.onerror = function () { this.remove(); };
        top.appendChild(im);
      }
      var b = document.createElement("div"); b.className = "tdbrand"; b.textContent = d.brand; top.appendChild(b);
      var n = document.createElement("div"); n.className = "tdname"; n.textContent = d.name; top.appendChild(n);
      var o = document.createElement("div"); o.className = "tdoffer"; o.textContent = d.offer; top.appendChild(o);
      el.appendChild(top);
      var row = document.createElement("div");
      row.style.display = "flex"; row.style.gap = "6px"; row.style.flexWrap = "wrap";
      var sv = document.createElement("button");
      sv.className = "tdsave"; sv.type = "button"; sv.textContent = "＋ Save to list";
      sv.addEventListener("click", function () {
        if (window.TYDOpenSave) window.TYDOpenSave({ href: d.href, name: d.brand + " — " + d.name, offer: d.offer, img: d.img || "" });
      });
      var pg = document.createElement("a");
      pg.href = d.page; pg.className = "tdsave"; pg.style.textDecoration = "none"; pg.textContent = "Brand page ›";
      /* Share to the Shack (Nov 15, 2026, v312): a Share button in the
         card's button row (a sibling of the card link, never inside
         it). The share URL is the Pond brand page (d.page), never the
         retailer's deal link (d.href). */
      var sh = document.createElement("button");
      sh.className = "tdsave"; sh.type = "button"; sh.textContent = "↗ Share";
      sh.setAttribute("data-shack-share", "");
      sh.setAttribute("data-share-kind", "deal");
      sh.setAttribute("data-share-url", d.page ? "/" + String(d.page).replace(/^\//, "") : "/deals.html");
      sh.setAttribute("data-share-image", imgSrc || "");
      sh.setAttribute("data-share-title", (d.brand ? d.brand + " — " : "") + (d.name || ""));
      sh.setAttribute("data-share-text", d.offer || "");
      row.appendChild(sv); row.appendChild(pg); row.appendChild(sh);
      el.appendChild(row);
      grid.appendChild(el);
    });
  }
  /* Exposed for tests: render a spotlight list without Firestore. */
  window.TYDTopDealsRender = renderDeals;
  /* Fallback: gather the live deal rows from every brand page, same as
     before the Firestore change. */
  function fromBrandPages() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('a.card[href^="brands/"]'));
    var failed = 0;
    var jobs = cards.map(function (card) {
      var url = card.getAttribute("href");
      var brand = txt(card.querySelector(".name"));
      return fetch(url).then(function (r) { if (!r.ok) throw new Error("brand page " + r.status); return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var out = [];
        doc.querySelectorAll("a.deal").forEach(function (d) {
          var name = txt(d.querySelector(".name"));
          var offer = txt(d.querySelector(".offer"));
          var img = d.querySelector("img.thumb");
          var pct = 0;
          var m = offer.match(/\$([\d.]+)\s*\(was \$([\d.]+)/);
          if (m) { var now = parseFloat(m[1]), was = parseFloat(m[2]); if (was > now) pct = Math.round((1 - now / was) * 100); }
          else { var pm = offer.match(/(\d+)%\s*(off|OFF)/); if (pm) pct = parseInt(pm[1], 10); }
          out.push({ brand: brand, name: name, offer: offer, href: d.getAttribute("href"), img: img ? img.getAttribute("src") : "", pct: pct, page: url });
        });
        return out;
      }).catch(function () { failed++; return []; });
    });
    Promise.all(jobs).then(function (all) {
      var deals = [];
      all.forEach(function (list) { deals = deals.concat(list); });
      if (!deals.length && jobs.length && failed === jobs.length) {
        /* Every brand page failed to load: say so, instead of claiming
           there are no spotlight deals when the check never ran. */
        grid.innerHTML = '<p class="td-load">Today\'s Top Deals could not load right now. Browse the brands below for the latest offers.</p>';
        return;
      }
      deals.sort(function (a, b) { return b.pct - a.pct; });
      renderDeals(deals);
    });
  }
  (async function () {
    try {
      var appMod = await import("./pond-firebase-stub.js");
      var fsMod = await import("./pond-firebase-stub.js");
      var cfg = {
        apiKey: "preview-disabled",
        authDomain: "pond-preview-disabled.firebaseapp.com",
        projectId: "pond-preview-disabled",
        storageBucket: "pond-preview-disabled.firebasestorage.app",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:previewdisabled"
      };
      var app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(cfg);
      var db = fsMod.getFirestore(app);
      var snap = await fsMod.getDoc(fsMod.doc(db, "deals", "current"));
      if (snap.exists()) {
        var data = snap.data() || {};
        if (Array.isArray(data.spotlight) && data.spotlight.length) {
          renderDeals(data.spotlight);
          return;
        }
      }
    } catch (e) {}
    fromBrandPages();
  })();
})();
