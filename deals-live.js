/* deals-live.js — the deals page reads its brand cards from Firestore
   (deals/current) so the daily deal check can update an offer with a
   document write and no deploy. The baked-in cards in deals.html stay
   as the fallback: if Firestore is unreachable, or the v13 rules are
   not published yet, the page simply shows the baked-in cards and this
   loader does nothing. Cards are updated in place so the search and
   filter on the page keep working; after any change the page is told
   to re-collect its cards. */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* v261: brand card thumbnails. A local slug -> logo/product image map,
     so the cards show a picture whether the data comes from Firestore or
     from the baked-in fallback. The same URLs are baked into deals.html.
     If a logo fails to load, onerror removes it so the card falls back
     to the text-only look instead of a broken image. */
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
  function brandImg(b) {
    var slug = b.slug || (b.href || "").replace(/^brands\//, "").replace(/\.html$/, "");
    var src = b.img || BRAND_IMGS[slug] || "";
    if (!src) return "";
    return '<img class="brand-thumb" src="' + esc(src) + '" alt="" loading="lazy" onerror="this.remove()">';
  }
  /* v307: product photo on brand cards. The brand pages' own hero product
     images (same CDN URLs the brand pages already use), keyed by slug so
     the live render keeps the photo even when Firestore re-renders the
     cards. If a brand has no photo here, the card stays logo-only. */
  var BRAND_PHOTOS = {
    "bur-bur": "https://cdn.shopify.com/s/files/1/0588/9841/5771/files/STYLING_CREAM.jpg?v=1790621316&width=900",
    "rorry": "https://rorry.com/cdn/shop/files/RORRY-AuraDock_-M2-5000mAh-4in1-ChargingStation-with-MagSafe-Power-Bank-pink.jpg?v=1793352674&width=1200",
    "fanttik": "https://fanttik.com/cdn/shop/files/9_535c6730-aea8-4ae7-a592-96ad568b1101.jpg?v=1786358127&width=1200",
    "glocusent": "https://glocusent.com/cdn/shop/files/a13-neck_light_4.jpg?v=1773992320&width=900",
    "soundcore": "https://us.soundcore.com/cdn/shop/files/A3388Z11_DTC_listing_image_TD01_US_V1_59c18857-9355-46ac-ac07-48f92411ed6a.png?v=1763430064&width=900",
    "aurzen": "https://aurzen.com/cdn/shop/files/Aurzen_ZIP_Tri-Fold_Portable_Projector_-_Titanium_Gold.webp?v=1776421892&width=900",
    "lotus-and-luna": "https://cdn.shopify.com/s/files/1/1134/8440/files/XHLB017_ORN_1_2d249b49-2b7c-401a-a51a-7f763bb784f9.jpg?v=1794517752&width=900",
    "seeq": "https://seeqsupply.com/cdn/shop/files/1_144b9381-0a1c-4797-b800-c37806c09565.jpg?v=1791923727&width=1200",
    "mellow-sleep": "https://mellowsleep.com/cdn/shop/files/Hero_41351ffa-55da-45af-9ad0-9281919a7cd1.jpg?v=1771959104&width=1200",
    "ridge": "https://ca.ridge.com/cdn/shop/files/TobaccoBrown-Wallet-THUMBNAIL_b071bd25-a027-4f5d-a7e9-e0d6890119c9.jpg?v=1783469399&width=900",
    "im8-health": "https://im8health.com/cdn/shop/files/USD_30DAY_ESSENTIALS_COPY1_VISUAL_B_97edb232-7b04-4be6-8eb5-f6a3187588be.jpg?v=1778121212&width=1200",
    "weekend-sleepover": "https://cdn.shopify.com/s/files/1/0762/3897/9329/files/robe-amalfi1.jpg?v=1790851358&width=900",
    "ryze": "https://www.ryzesuperfoods.com/cdn/shop/files/mushroom-coffee-add-ona3b6ryze-115181.jpg?v=1724682354&width=1200",
    "zawina-morocco": "https://cdn.shopify.com/s/files/1/0509/8068/3950/files/NilaBundleSet_Acopy_a357fc66-f47f-4e5f-8bdd-eebf5db15fc2.jpg?v=1794385284&width=900"
  };
  function brandPhoto(b) {
    var slug = b.slug || (b.href || "").replace(/^brands\//, "").replace(/\.html$/, "");
    var src = BRAND_PHOTOS[slug] || "";
    if (!src) return "";
    return '<img class="brand-photo" src="' + esc(src) + '" alt="" loading="lazy" onerror="this.remove()">';
  }
  /* Share to the Shack (Nov 15, 2026, v312): a small Share button on
     every brand deal card. A <button> nested inside the card's <a> is
     invalid HTML, so the card is wrapped in a div.tyd-sharewrap and
     the button sits as its sibling, absolutely positioned on the
     card's bottom-right corner. The button carries the card's real
     data (name, offer, chip, photo, brand page link); the share URL
     is the Pond brand page, never a retailer. applyFilters moves the
     whole wrapper (see deals.html), and stale cards take their wrapper
     with them when they are removed. Runs on the baked-in cards at
     load and again after any Firestore re-render. */
  function paintBrandShare() {
    var main = document.querySelector("main.links");
    if (!main) return;
    main.querySelectorAll('a.card[href^="brands/"]').forEach(function (card) {
      if (card.parentNode && card.parentNode.classList && card.parentNode.classList.contains("tyd-sharewrap")) return;
      var name = card.querySelector(".name"), offer = card.querySelector(".offer"), chip = card.querySelector(".chip");
      var photo = card.querySelector(".brand-photo"), thumb = card.querySelector(".brand-thumb");
      var href = card.getAttribute("href") || "";
      var wrap = document.createElement("div");
      wrap.className = "tyd-sharewrap";
      card.parentNode.insertBefore(wrap, card);
      wrap.appendChild(card);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-shack-share", "");
      btn.setAttribute("data-share-kind", "deal");
      btn.setAttribute("data-share-url", "/" + href.replace(/^\//, ""));
      btn.setAttribute("data-share-image", photo ? photo.getAttribute("src") : (thumb ? thumb.getAttribute("src") : ""));
      btn.setAttribute("data-share-title", name ? name.textContent.trim() : "Pond deal");
      var info = offer ? offer.textContent.trim() : "";
      if (chip && chip.textContent.trim()) info += (info ? " · " : "") + chip.textContent.trim();
      btn.setAttribute("data-share-text", info);
      btn.textContent = "↗ Share";
      wrap.appendChild(btn);
    });
  }
  function cardHtml(b) {
    /* Clip button (Lucy, Nov 14, 2026): a code chip gets a Clip code
       button, so a member can save the code and have it land on their
       Planner calendar on its expiry date. The button lives inside the
       card link, so the shared clip handler in site-nav.js stops the
       tap from following the link. */
    var clipBtn = "";
    if (b.chip && /^code:/i.test(b.chip)) {
      var code = b.chip.replace(/^code:\s*/i, "").trim();
      clipBtn = '<br><button type="button" data-clip-code="' + esc(code) + '" data-brand="' + esc(b.name || "") + '" data-slug="' + esc(b.slug || "") + '">📌 Clip code</button>';
    }
    return brandImg(b) + '<span class="info"><span class="name">' + esc(b.name) + '</span><br><span class="offer">' + esc(b.offer) + "</span>"
      + (b.chip ? '<br><span class="chip">' + esc(b.chip) + "</span>" : "")
      + clipBtn
      + '</span>' + brandPhoto(b) + '<span class="arrow" aria-hidden="true">&#8250;</span>';
  }
  function applyBrands(brands) {
    var main = document.querySelector("main.links");
    if (!main || !Array.isArray(brands) || !brands.length) return false;
    var anchor = document.getElementById("dealmath") || document.getElementById("postpartum");
    var seen = {};
    var changed = false;
    brands.forEach(function (b) {
      if (!b.href) return;
      var card = main.querySelector('a.card[href="' + b.href + '"]');
      if (!card) {
        card = document.createElement("a");
        card.className = "card";
        card.target = "_blank";
        card.rel = "noopener";
        if (anchor) main.insertBefore(card, anchor);
        else main.appendChild(card);
        changed = true;
      }
      card.setAttribute("data-category", b.category || "");
      card.setAttribute("href", b.href);
      var next = cardHtml(b);
      if (card.innerHTML !== next) { card.innerHTML = next; changed = true; }
      seen[b.href] = true;
    });
    main.querySelectorAll('a.card[href^="brands/"]').forEach(function (card) {
      if (!seen[card.getAttribute("href")]) {
        /* A wrapped card takes its Share button with it. */
        var unit = card.parentNode && card.parentNode.classList && card.parentNode.classList.contains("tyd-sharewrap") ? card.parentNode : card;
        unit.remove(); changed = true;
      }
    });
    if (changed) paintBrandShare();
    var countEl = document.querySelector('.side-links a[href="#brands"] span');
    if (countEl && countEl.textContent !== String(brands.length)) countEl.textContent = String(brands.length);
    if (changed && window.TYDDealsRecollect) window.TYDDealsRecollect();
    if (window.TYDCodeClips) window.TYDCodeClips.paint();
    return true;
  }
  /* Exposed for the page and for tests: apply a brands list to the cards. */
  window.TYDDealsApplyBrands = applyBrands;
  window.TYDDealsPaintShare = paintBrandShare;
  paintBrandShare();
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
        if (Array.isArray(data.brands) && data.brands.length) applyBrands(data.brands);
      }
    } catch (e) {
      // Firestore unreachable or rules not published yet: the baked-in
      // cards stay. Nothing to do.
      try { console.log("Deals live content unavailable, showing the baked-in cards."); } catch (e2) {}
    }
  })();
})();
