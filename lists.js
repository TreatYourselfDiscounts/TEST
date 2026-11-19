// TreatYourselfDiscounts personal deal lists.
// Visitors build their own lists of deals and coupon codes. Lists live on the
// device (localStorage) and sync to the visitor's Pond Account (Firestore
// users/{uid}.dealLists) when they are logged in, merged by union.
//
// Save deals (v342, Lucy Nov 17, 2026): every deal card has a Save button
// next to Share. Saving stores a saved-deal entry (deal id, name, price
// seen at save time, was-price if any, store, link, category/page, savedAt)
// in the default "Saved deals" list. The member can pick another of their
// lists in the same picker Add to list already used. Saving twice never
// duplicates: entries dedupe by deal id. My Deal Lists re-checks each
// saved deal against the live data for its source and shows Expired with
// a watching note when it is gone, or Live with the new price when it
// comes back. Expired saved deals are never deleted automatically.
export var SAVED_DEALS_LIST = "Saved deals";
export var EXPIRED_NOTE = "This deal has ended or is out of stock. It is still being watched, so if the deal or the stock comes back it will show as live again here.";
export var LS_KEY = "tydDealLists";
export var FIREBASE_CONFIG = {
  apiKey: "preview-disabled",
  authDomain: "pond-preview-disabled.firebaseapp.com",
  projectId: "pond-preview-disabled",
  storageBucket: "pond-preview-disabled.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:previewdisabled"
};

export function emptyLists() { return { "My List": [] }; }
export function loadLocal() {
  try {
    var v = JSON.parse(localStorage.getItem(LS_KEY));
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch (e) {}
  return emptyLists();
}
export function saveLocal(lists) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(lists)); } catch (e) {}
}
export function itemId(it) {
  if (it && it.dealId) return "deal:" + it.dealId;
  return (it.href || "") + "|" + (it.title || "") + "|" + (it.code || "");
}
export function numOrNull(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
function parseMoney(text, which) {
  if (!text) return null;
  var m = String(text).match(/\$([\d,]+(?:\.\d{1,2})?)/g);
  if (!m || !m[which]) return null;
  return numOrNull(m[which].replace(/[$,]/g, ""));
}
/* Normalize any saved-deal shape (category Save button data attributes,
   a brand card, a Top Deals spotlight object) into one stored entry.
   The deal id is the card id (deal-...) on category pages, brand:<slug>
   for a Deals brand card, or href:<shop link> when there is no card id. */
export function normalizeSavedDeal(raw) {
  raw = raw || {};
  var name = raw.title || raw.name || "";
  var brand = raw.brand || raw.store || "";
  if (!brand && name.indexOf(" — ") > -1) {
    brand = name.split(" — ")[0].trim();
    name = name.split(" — ").slice(1).join(" — ").trim();
  }
  var offer = raw.note || raw.offer || "";
  var price = numOrNull(raw.savedPrice != null && raw.savedPrice !== "" ? raw.savedPrice : raw.price);
  if (price == null) price = parseMoney(offer, 0);
  var was = numOrNull(raw.savedWas != null && raw.savedWas !== "" ? raw.savedWas : raw.was);
  if (was == null) was = parseMoney(offer, 1);
  var href = raw.href || raw.link || raw.url || "";
  var dealId = raw.dealId || raw.id || "";
  if (!dealId && href) dealId = "href:" + href;
  var code = raw.code || "";
  if (!code && offer) { var cm = offer.match(/Code:\s*([A-Za-z0-9\-_]+)/); if (cm) code = cm[1]; }
  if (!offer && price != null) {
    offer = "$" + price.toFixed(2) + (was != null ? " was $" + was.toFixed(2) : "") + (brand ? " at " + brand : "");
  }
  return {
    kind: "savedDeal", dealId: dealId,
    brand: brand || "Pond deal", title: name || "Deal",
    note: offer, code: code, href: href, img: raw.img || "",
    savedPrice: price, savedWas: was, store: brand || "",
    source: raw.source || raw.category || "deals",
    page: raw.page || "",
    savedAt: raw.savedAt || Date.now()
  };
}
export function ensureSavedDealsList() {
  var lists = getLists();
  if (!lists[SAVED_DEALS_LIST]) { lists[SAVED_DEALS_LIST] = []; emit(); }
  return SAVED_DEALS_LIST;
}
/* Save a deal to a list ("Saved deals" by default). Dedupes by deal id
   inside that list, so saving twice never duplicates it. Returns
   { list, item, added, alreadySaved }. */
export function saveDeal(deal, listName) {
  var item = normalizeSavedDeal(deal);
  var name = (listName || SAVED_DEALS_LIST).trim() || SAVED_DEALS_LIST;
  var lists = getLists();
  if (!lists[name]) lists[name] = [];
  var id = itemId(item);
  if (lists[name].some(function (x) { return itemId(x) === id; })) {
    return { list: name, item: item, added: false, alreadySaved: true };
  }
  lists[name].push(item);
  emit();
  return { list: name, item: item, added: true, alreadySaved: false };
}
export function isDealSaved(dealId) {
  if (!dealId) return false;
  var lists = getLists();
  var id = "deal:" + dealId;
  return Object.keys(lists).some(function (n) {
    return (lists[n] || []).some(function (x) { return itemId(x) === id; });
  });
}
/* Expiry watch (pure, so tests can drive it without Firestore or fetch):
   liveById maps deal id -> { price } for one source's current live data.
   loadedSources names the sources whose live data actually loaded; a
   saved deal whose source never loaded stays "unknown" and is never
   shown as expired on a failed check. */
export function savedDealStatus(item, liveById, loadedSources) {
  var id = item && (item.dealId || "");
  if (!id || !liveById) return { status: "unknown", livePrice: null };
  if (loadedSources && item.source && !loadedSources[item.source]) {
    if (!(item.source === "deals" && id.indexOf("href:") === 0 && loadedSources.spotlight)) {
      return { status: "unknown", livePrice: null };
    }
  }
  var live = liveById[id];
  if (live === undefined && item.href) live = liveById["href:" + item.href];
  if (live === undefined) live = liveById[item.href || ""];
  if (live === undefined || live === null) return { status: "expired", livePrice: null };
  return { status: "live", livePrice: (live && typeof live.price === "number") ? live.price : null };
}
export function checkSavedDeals(lists, liveById, loadedSources) {
  var out = [];
  Object.keys(lists || {}).forEach(function (name) {
    (lists[name] || []).forEach(function (it) {
      if (it && (it.kind === "savedDeal" || it.dealId)) {
        var st = savedDealStatus(it, liveById, loadedSources);
        out.push({ list: name, item: it, status: st.status, livePrice: st.livePrice });
      }
    });
  });
  return out;
}
/* Live-index builders for the sources My Deal Lists reads. LEGO comes
   from data/lego-deals-v321.json (cards[].id/price); home-goods and tech
   from data/category-additions-v321.json (homeGoods[]/tech[]) UNION the
   category page HTML, because the JSON only holds half the live cards
   (18 of 36 home-goods, 17 of 34 tech) while the page holds them all;
   beauty, baby and viral have no JSON file, so their live index is
   parsed from the category page HTML itself (article id + data-price),
   which the daily refresh rebuilds. Deals brand cards are checked
   against the live deals.html brand list and the Firestore
   deals/current spotlight. */
export function liveIndexFromCards(cards) {
  var out = {};
  (cards || []).forEach(function (c) {
    if (!c) return;
    var id = c.id || c.dealId || "";
    if (id) out[id] = { price: numOrNull(c.price) };
  });
  return out;
}
export function liveIndexFromPageHtml(html) {
  var out = {};
  String(html || "").replace(/<article[^>]*\sid="(deal-[^"]+)"[^>]*>/g, function (m, id) {
    var pm = m.match(/data-price="([\d.]+)"/);
    out[id] = { price: pm ? numOrNull(pm[1]) : null };
    return m;
  });
  return out;
}
/* Test seam (v339 pattern): when set, pushes go to the sink instead of
   Firestore, so tests can assert the users/{uid}.dealLists write. */
export function setPushSink(fn) { state.pushSink = typeof fn === "function" ? fn : null; }
export function mergeLists(a, b) {
  var out = {};
  [a || {}, b || {}].forEach(function (src) {
    Object.keys(src).forEach(function (name) {
      if (!out[name]) out[name] = [];
      (src[name] || []).forEach(function (it) {
        var id = itemId(it);
        if (!out[name].some(function (x) { return itemId(x) === id; })) out[name].push(it);
      });
    });
  });
  if (!Object.keys(out).length) return emptyLists();
  return out;
}
export function countItems(lists) {
  return Object.keys(lists || {}).reduce(function (n, k) { return n + (lists[k] || []).length; }, 0);
}

var state = { lists: null, uid: null, db: null, fs: null, listeners: [], pushSink: null };
function getLists() {
  if (!state.lists) state.lists = loadLocal();
  return state.lists;
}
function emit() {
  saveLocal(getLists());
  state.listeners.forEach(function (cb) { try { cb(getLists()); } catch (e) {} });
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("tyd-lists-changed", { detail: getLists() }));
  }
  pushRemote();
}
var pushTimer = null;
function pushRemote() {
  if (state.pushSink) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      try { state.pushSink({ dealLists: getLists() }); } catch (e) {}
    }, 400);
    return;
  }
  if (!state.uid || !state.db || !state.fs) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(function () {
    state.fs.setDoc(state.fs.doc(state.db, "users", state.uid), { dealLists: getLists() }, { merge: true }).catch(function () {});
  }, 400);
}
export function addItem(listName, item) {
  var lists = getLists();
  var name = (listName || "My List").trim() || "My List";
  if (!lists[name]) lists[name] = [];
  var id = itemId(item);
  if (!lists[name].some(function (x) { return itemId(x) === id; })) {
    lists[name].push(item);
  }
  emit();
  return name;
}
export function removeItem(listName, id) {
  var lists = getLists();
  if (lists[listName]) lists[listName] = lists[listName].filter(function (x) { return itemId(x) !== id; });
  emit();
}
export function createList(name) {
  var lists = getLists();
  var n = (name || "").trim();
  if (n && !lists[n]) { lists[n] = []; emit(); }
  return n;
}
export function deleteList(name) {
  var lists = getLists();
  if (lists[name]) { delete lists[name]; emit(); }
}
export function onListsChange(cb) { state.listeners.push(cb); }

async function initSync() {
  try {
    var appMod = await import("./pond-firebase-stub.js");
    var authMod = await import("./pond-firebase-stub.js");
    var fsMod = await import("./pond-firebase-stub.js");
    var app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(FIREBASE_CONFIG);
    var auth = authMod.getAuth(app);
    var db = fsMod.getFirestore(app);
    state.db = db; state.fs = fsMod;
    authMod.onAuthStateChanged(auth, async function (user) {
      var note = typeof document !== "undefined" ? document.getElementById("sync-note") : null;
      if (user) {
        state.uid = user.uid;
        try {
          var snap = await fsMod.getDoc(fsMod.doc(db, "users", user.uid));
          var remote = (snap.exists() && snap.data().dealLists) || {};
          state.lists = mergeLists(getLists(), remote);
          emit();
        } catch (e) {}
        if (note) note.textContent = "Your lists are synced to your Pond account, so they follow you across your devices.";
      } else {
        state.uid = null;
        if (note) note.textContent = "Your lists are saved on this device. Log in with your free Pond Account and they will sync across your devices.";
      }
    });
  } catch (e) {}
}

/* ---------- injected styles ---------- */
var CSS = [
  ".tyd-add { margin-left:auto; flex-shrink:0; background:#ffd94d; color:#6b5900; font-weight:800; font-size:12.5px; border-radius:999px; padding:7px 12px; cursor:pointer; border:2px solid #f0c93e; font-family:inherit; white-space:nowrap; }",
  ".tyd-add:active { transform:scale(.96); }",
  ".card .tyd-add { display:inline-block; margin:8px 0 2px; }",
  ".tyd-pop { position:fixed; left:50%; bottom:18px; transform:translateX(-50%); z-index:70; background:#fff; border-radius:18px; box-shadow:0 12px 32px rgba(35,65,77,.35); padding:16px; width:min(92vw,360px); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#23414d; }",
  ".tyd-pop h3 { margin:0 0 8px; font-size:16px; color:#1f5f74; }",
  ".tyd-pop .lpick { display:block; width:100%; text-align:left; background:#eaf7fb; border:none; border-radius:12px; padding:10px 12px; font-weight:700; font-size:14px; color:#1f5f74; cursor:pointer; margin:0 0 6px; font-family:inherit; }",
  ".tyd-pop .lrow { display:flex; gap:6px; margin-top:8px; }",
  ".tyd-pop input { flex:1; border:2px solid #bcd9e4; border-radius:12px; padding:9px 10px; font-size:14px; font-family:inherit; min-width:0; }",
  ".tyd-pop .lnew { background:#ffd94d; color:#6b5900; border:2px solid #f0c93e; font-weight:800; border-radius:999px; padding:9px 13px; cursor:pointer; font-family:inherit; }",
  ".tyd-pop .lcancel { display:block; margin:10px auto 0; background:none; border:none; color:#5b7d89; font-weight:700; cursor:pointer; font-family:inherit; font-size:13.5px; }",
  ".tyd-toast { position:fixed; left:50%; bottom:84px; transform:translateX(-50%) translateY(20px); z-index:80; background:#23414d; color:#fff; font-weight:700; font-size:14px; padding:10px 16px; border-radius:999px; opacity:0; pointer-events:none; transition:all .3s ease; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:92vw; text-align:center; }",
  ".tyd-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }",
  /* Save a deal (v342): mirrors the Share button (same pill, same size)
     so Save sits next to Share on every deal card and looks like it
     belongs there. A saved button turns yellow, like a kept deal. */
  ".tyd-save-deal { display:inline-block; background:#fff; border:2px solid #1f5f74; color:#1f5f74; border-radius:999px; padding:5px 12px; font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit; line-height:1.3; white-space:nowrap; }",
  ".tyd-save-deal:hover { background:#eaf7fb; }",
  ".lego-info [data-save-deal] { margin-top:8px; margin-left:6px; }",
  ".tyd-save-deal.saved, .tyd-add.saved { background:#ffd94d; border-color:#f0c93e; color:#6b5900; }",
  "html[data-theme=\"dark\"] .tyd-save-deal { background:#172635; border-color:#2e4a5f; color:#c9f0fc; }",
  "html[data-theme=\"dark\"] .tyd-save-deal:hover { background:#23414d; }",
  "html[data-theme=\"dark\"] .tyd-save-deal.saved, html[data-theme=\"dark\"] .tyd-add.saved { background:#ffd94d; border-color:#f0c93e; color:#6b5900; }"
].join("\n");

/* The floating "My Lists" pill was removed (Lucy, Nov 15, 2026): it
   duplicated the bottom menu's My Stuff button, which already goes to
   My Deal Lists. The Add-to-list / Save-to-list buttons and the picker
   popup below are untouched. */
function toast(msg) {
  var t = document.querySelector(".tyd-toast");
  if (!t) { t = document.createElement("div"); t.className = "tyd-toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 2000);
}
function closePop() { var p = document.querySelector(".tyd-pop"); if (p) p.remove(); }
function markSavedBtn(btn) {
  btn.textContent = "✓ Saved";
  btn.classList.add("saved");
  btn.setAttribute("aria-pressed", "true");
}
/* The list picker already existed: Save opens it, with "Saved deals"
   first when the item is a saved deal. onSaved (optional) runs after
   the member picks a list, so the Save button can flip to Saved. */
function openPicker(item, onSaved) {
  if (item && item.kind === "savedDeal") ensureSavedDealsList();
  if (item && !item.kind && item.name) { item = normalizeSavedDeal(item); ensureSavedDealsList(); }
  closePop();
  var pop = document.createElement("div");
  pop.className = "tyd-pop";
  var names = Object.keys(getLists());
  if (item && item.kind === "savedDeal") {
    names.sort(function (a, b) {
      if (a === SAVED_DEALS_LIST) return -1;
      if (b === SAVED_DEALS_LIST) return 1;
      return 0;
    });
  }
  var html = "<h3>Save to which list?</h3>";
  names.forEach(function (n) { html += '<button class="lpick" data-list="' + n.replace(/"/g, "&quot;") + '">🧺 ' + n.replace(/</g, "&lt;") + " (" + getLists()[n].length + ")</button>"; });
  html += '<div class="lrow"><input type="text" placeholder="New list name, like Gift ideas"><button class="lnew">Create + save</button></div>';
  html += '<button class="lcancel">Cancel</button>';
  pop.innerHTML = html;
  document.body.appendChild(pop);
  pop.querySelectorAll(".lpick").forEach(function (b) {
    b.addEventListener("click", function () {
      addItem(b.getAttribute("data-list"), item);
      closePop();
      toast("Saved to " + b.getAttribute("data-list") + " 🧺");
      if (onSaved) onSaved(b.getAttribute("data-list"));
    });
  });
  pop.querySelector(".lnew").addEventListener("click", function () {
    var v = pop.querySelector("input").value.trim();
    if (!v) { pop.querySelector("input").focus(); return; }
    addItem(v, item);
    closePop();
    toast("Saved to your new list, " + v + " 🧺");
    if (onSaved) onSaved(v);
  });
  pop.querySelector(".lcancel").addEventListener("click", closePop);
}
function snapshotFromDeal(a) {
  var nameEl = a.querySelector(".name");
  var offerEl = a.querySelector(".offer");
  var img = a.querySelector("img");
  var h1 = document.querySelector("h1");
  return {
    kind: "deal",
    brand: h1 ? h1.textContent.trim() : "TreatYourselfDiscounts",
    title: nameEl ? nameEl.textContent.trim() : a.textContent.trim().slice(0, 60),
    note: offerEl ? offerEl.textContent.trim() : "",
    code: "",
    href: a.href,
    img: img ? img.src : ""
  };
}
function snapshotFromCard(card) {
  var nameEl = card.querySelector(".name");
  var offerEl = card.querySelector(".offer");
  var chip = card.querySelector(".chip");
  var img = card.querySelector("img");
  var code = "";
  if (chip) { var m = chip.textContent.match(/Code:\s*(.+)/); if (m) code = m[1].trim(); }
  return {
    kind: code ? "coupon" : "deal",
    brand: nameEl ? nameEl.textContent.trim() : "TreatYourselfDiscounts",
    title: nameEl ? nameEl.textContent.trim() : "Deal",
    note: offerEl ? offerEl.textContent.trim() : "",
    code: code,
    href: card.href,
    img: img ? img.src : ""
  };
}
/* Save button on a category deal card: everything the button carries
   in its data attributes becomes the saved-deal entry. */
export function snapshotFromSaveButton(btn) {
  var d = btn.dataset || {};
  function attr(k) { return btn.getAttribute("data-" + k) || ""; }
  return normalizeSavedDeal({
    dealId: d.dealId || attr("deal-id") || "",
    title: d.dealName || attr("deal-name") || "",
    savedPrice: d.dealPrice || attr("deal-price") || "",
    savedWas: d.dealWas || attr("deal-was") || "",
    store: d.dealStore || attr("deal-store") || "",
    href: d.dealHref || attr("deal-href") || "",
    source: d.dealSource || attr("deal-source") || "",
    page: d.dealPage || attr("deal-page") || "",
    img: d.dealImg || attr("deal-img") || ""
  });
}
/* Save on a Deals brand card: the card link is the brand page, the
   offer text carries the price when there is one, and a code chip
   (Code: X) is kept so the saved entry still shows its code. */
export function snapshotFromBrandCard(card) {
  var nameEl = card.querySelector(".name");
  var offerEl = card.querySelector(".offer");
  var chip = card.querySelector(".chip");
  var img = card.querySelector(".brand-photo") || card.querySelector(".brand-thumb") || card.querySelector("img");
  var href = card.getAttribute("href") || "";
  var slug = href.replace(/^brands\//, "").replace(/\.html$/, "");
  var offer = offerEl ? offerEl.textContent.trim() : "";
  if (chip && chip.textContent.trim()) offer += (offer ? " · " : "") + chip.textContent.trim();
  return normalizeSavedDeal({
    dealId: slug ? "brand:" + slug : "",
    title: nameEl ? nameEl.textContent.trim() : "Deal",
    note: offer, href: href, source: "deals", page: "deals.html",
    img: img ? (img.getAttribute("src") || "") : ""
  });
}
function wireButtons() {
  /* Save buttons on category deal cards (v342): the button carries the
     deal in data attributes. Tapping opens the existing list picker
     ("Saved deals" first); picking a list flips the button to Saved.
     A deal already in any list shows Saved from the start, and tapping
     it again never duplicates it. */
  document.querySelectorAll("[data-save-deal]").forEach(function (btn) {
    if (btn.getAttribute("data-tyd-save-wired")) return;
    btn.setAttribute("data-tyd-save-wired", "1");
    var snap = snapshotFromSaveButton(btn);
    if (snap.dealId && isDealSaved(snap.dealId)) markSavedBtn(btn);
    btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (snap.dealId && isDealSaved(snap.dealId)) {
        markSavedBtn(btn);
        toast("Already saved in your lists 🧺");
        return;
      }
      openPicker(snap, function () { markSavedBtn(btn); });
    });
  });
  document.querySelectorAll("a.deal").forEach(function (a) {
    if (a.querySelector(".tyd-add")) return;
    var b = document.createElement("span");
    b.className = "tyd-add"; b.setAttribute("role", "button"); b.tabIndex = 0;
    b.textContent = "＋ Add to list";
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); openPicker(snapshotFromDeal(a)); });
    a.appendChild(b);
  });
  document.querySelectorAll("a.card").forEach(function (card) {
    var href = card.getAttribute("href") || "";
    if (!(href.indexOf("http") === 0 || href.indexOf("brands/") !== -1)) return;
    if (card.querySelector(".tyd-add")) return;
    var info = card.querySelector(".info") || card;
    var b = document.createElement("span");
    b.className = "tyd-add"; b.setAttribute("role", "button"); b.tabIndex = 0;
    /* Save on a Deals brand card (v342): same picker as a deal card,
       saving a saved-deal entry (brand id, offer price when there is
       one, code when there is one) instead of the old generic snapshot. */
    var snap = snapshotFromBrandCard(card);
    b.textContent = (snap.dealId && isDealSaved(snap.dealId)) ? "✓ Saved" : "＋ Save to list";
    if (snap.dealId && isDealSaved(snap.dealId)) b.classList.add("saved");
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (snap.dealId && isDealSaved(snap.dealId)) {
        b.textContent = "✓ Saved"; b.classList.add("saved");
        toast("Already saved in your lists 🧺");
        return;
      }
      openPicker(snap, function () { b.textContent = "✓ Saved"; b.classList.add("saved"); });
    });
    info.appendChild(document.createElement("br"));
    info.appendChild(b);
  });
}
function init() {
  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);
  wireButtons();
  initSync();
  document.dispatchEvent(new CustomEvent("tyd-lists-ready", { detail: getLists() }));
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.TYDLists = {
    getLists: getLists, addItem: addItem, removeItem: removeItem,
    createList: createList, deleteList: deleteList, onListsChange: onListsChange,
    itemId: itemId, countItems: countItems,
    saveDeal: saveDeal, isDealSaved: isDealSaved,
    normalizeSavedDeal: normalizeSavedDeal,
    snapshotFromSaveButton: snapshotFromSaveButton,
    snapshotFromBrandCard: snapshotFromBrandCard,
    savedDealStatus: savedDealStatus, checkSavedDeals: checkSavedDeals,
    liveIndexFromCards: liveIndexFromCards,
    liveIndexFromPageHtml: liveIndexFromPageHtml,
    setPushSink: setPushSink,
    SAVED_DEALS_LIST: SAVED_DEALS_LIST, EXPIRED_NOTE: EXPIRED_NOTE
  };
  window.TYDOpenSave = openPicker;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}
