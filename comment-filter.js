// Friends-only comment filter (Lucy, Nov 12, 2026): one shared helper,
// loaded by site-nav.js on every page. The choice lives in localStorage
// 'tydCommentFilter' ("everyone" or "friends") and is mirrored to the
// member's users/{uid}.commentFilter, so it follows them across devices.
// The friends list is derived from the friendRequests collection
// (accepted requests, either direction), the same source the Pond friends
// panel in account.html reads. When "Friends only" is on, a comment
// renders only if its author is a Pond friend or the member themself;
// "Everyone" shows everything (blocked members are still hidden by
// block.js). Signed out, the toggle is hidden and nothing is filtered.
(function () {
  if (window.TYDFriends) return;
  var KEY = "tydCommentFilter";
  var FKEY = "tydFriendUids";
  var listeners = [];
  var friendSet = {};
  var fbPromise = null;
  var fb = null;

  function getFilter() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "friends" ? "friends" : "everyone";
    } catch (e) { return "everyone"; }
  }
  function saveFilter(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function emitFilter() {
    try { window.dispatchEvent(new CustomEvent("tyd-comment-filter-changed")); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function emitFriends() {
    try { window.dispatchEvent(new CustomEvent("tyd-friends-changed")); } catch (e) {}
  }
  function readCachedFriends() {
    try {
      var v = JSON.parse(localStorage.getItem(FKEY) || "null");
      if (v && Array.isArray(v.friends)) {
        var set = {};
        v.friends.forEach(function (u) { if (u) set[u] = 1; });
        return set;
      }
    } catch (e) {}
    return {};
  }
  // Last signed-in member's friends, so filtering works before Firebase
  // answers. Replaced as soon as the signed-in member's list loads.
  friendSet = readCachedFriends();

  function loadFb() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import("./pond-firebase-stub.js"),
      import("./pond-firebase-stub.js"),
      import("./pond-firebase-stub.js")
    ]).then(function (mods) {
      var config = {
        apiKey: "preview-disabled",
        authDomain: "pond-preview-disabled.firebaseapp.com",
        projectId: "pond-preview-disabled",
        storageBucket: "pond-preview-disabled.firebasestorage.app",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:previewdisabled"
      };
      var app = mods[0].getApps().length ? mods[0].getApps()[0] : mods[0].initializeApp(config);
      fb = { mods: Object.assign({}, mods[0], mods[1], mods[2]), app: app, auth: mods[1].getAuth(app), db: mods[2].getFirestore(app) };
      return fb;
    }).catch(function () { fbPromise = null; return null; });
    return fbPromise;
  }

  function writeRemote(v) {
    loadFb().then(function (f) {
      if (!f) return;
      var user = f.auth.currentUser;
      if (!user) return;
      var m = f.mods;
      m.setDoc(m.doc(f.db, "users", user.uid), { commentFilter: v }, { merge: true }).catch(function () {});
    });
  }

  function fetchFriends(user) {
    if (!fb || !user) return;
    var m = fb.mods;
    Promise.all([
      m.getDocs(m.query(m.collection(fb.db, "friendRequests"), m.where("fromUid", "==", user.uid))),
      m.getDocs(m.query(m.collection(fb.db, "friendRequests"), m.where("toUid", "==", user.uid)))
    ]).then(function (ress) {
      var set = {};
      ress.forEach(function (qs) {
        qs.forEach(function (d) {
          var r = d.data();
          if (!r || r.status !== "accepted") return;
          var other = r.fromUid === user.uid ? r.toUid : r.fromUid;
          if (other) set[other] = 1;
        });
      });
      friendSet = set;
      try { localStorage.setItem(FKEY, JSON.stringify({ uid: user.uid, friends: Object.keys(set) })); } catch (e) {}
      emitFriends();
    }).catch(function () {});
  }

  function hydratePref(user) {
    if (!fb || !user) return;
    var m = fb.mods;
    m.getDoc(m.doc(fb.db, "users", user.uid)).then(function (snap) {
      if (!snap.exists()) return;
      var v = (snap.data() || {}).commentFilter;
      if ((v === "friends" || v === "everyone") && v !== getFilter()) {
        saveFilter(v);
        emitFilter();
      }
    }).catch(function () {});
  }

  loadFb().then(function (f) {
    if (!f) return;
    var m = f.mods;
    m.onAuthStateChanged(f.auth, function (user) {
      if (user) { fetchFriends(user); hydratePref(user); }
      else { friendSet = {}; emitFriends(); }
    });
    if (f.auth.currentUser) { fetchFriends(f.auth.currentUser); hydratePref(f.auth.currentUser); }
  });

  function setFilter(v) {
    if (v !== "friends" && v !== "everyone") return;
    if (v === getFilter()) return;
    saveFilter(v);
    writeRemote(v);
    emitFilter();
  }
  // Signed out, the filter is not applied (the toggle is hidden then).
  function passes(authorUid, myUid) {
    if (getFilter() !== "friends") return true;
    if (!myUid) return true;
    if (authorUid === myUid) return true;
    return !!friendSet[authorUid];
  }
  function getFriendUids() { return Object.keys(friendSet); }
  function toggleHtml() {
    var f = getFilter();
    return '<div class="cmtf" role="group" aria-label="Show comments from">'
      + '<button type="button" data-cmtfilter="everyone"' + (f === "everyone" ? ' class="on"' : "") + '>Everyone</button>'
      + '<button type="button" data-cmtfilter="friends"' + (f === "friends" ? ' class="on"' : "") + '>Friends only</button>'
      + "</div>";
  }

  // Small pill styling, matching the site's chips.
  (function injectCss() {
    if (document.getElementById("tydcmtfcss")) return;
    var st = document.createElement("style");
    st.id = "tydcmtfcss";
    st.textContent = ""
      + ".cmtf{display:inline-flex;gap:4px;margin:0 0 8px;}"
      + ".cmtf button{font-family:inherit;font-size:12.5px;font-weight:800;border:2px solid #bcd9e4;background:#fff;color:#1f5f74;border-radius:999px;padding:5px 11px;cursor:pointer;}"
      + ".cmtf button.on{background:#ffd94d;border-color:#e8c93a;color:#5a4a00;}"
      + "html[data-theme=\"dark\"] .cmtf button{background:#23414d !important;color:#c9f0fc !important;border-color:#2e4a5f !important;}"
      + "html[data-theme=\"dark\"] .cmtf button.on{background:#ffd94d !important;color:#5a4a00 !important;border-color:#e8c93a !important;}";
    document.head.appendChild(st);
  })();

  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-cmtfilter]") : null;
    if (!b) return;
    setFilter(b.getAttribute("data-cmtfilter"));
  });

  window.TYDFriends = {
    getFilter: getFilter,
    setFilter: setFilter,
    passes: passes,
    getFriendUids: getFriendUids,
    toggleHtml: toggleHtml,
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); }
  };
})();
