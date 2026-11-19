// Friends-only interactions (Lucy, Nov 12, 2026): a persistent
// per-member mode. When it is on, chat and comments only show
// messages from people the member has added as Pond friends (plus
// their own). The setting lives in localStorage 'tydFriendsOnly'
// ("1" on, "0" off) and is mirrored to the member's
// users/{uid}.friendsOnly, so it follows them across devices.
// The friends list is the same one comment-filter.js builds from
// accepted friendRequests (cached in localStorage 'tydFriendUids').
// Enforcement is reader-side at render time, like block.js:
//   - chat.html filters pondChat messages with TYDFriendsOnly.passes.
//   - news.html and the corner pages already filter comments through
//     TYDFriends.passes; this helper wraps that function once so the
//     mode applies there too, without touching those files.
// Toggling the mode (or the friends list changing) re-renders by
// dispatching 'tyd-friends-only-changed', plus the existing
// 'tyd-comment-filter-changed' that comment lists already listen for.
// The per-view Everyone/Friends-only toggle still works for temporary
// switching; the mode is the persistent floor underneath it, so while
// the mode is on, both view choices show friends only.
(function () {
  if (window.TYDFriendsOnly) return;
  var KEY = "tydFriendsOnly";
  var FKEY = "tydFriendUids";
  var listeners = [];
  var friendSet = {};
  var fbPromise = null;
  var fb = null;

  function isOn() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function saveLocal(v) {
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {}
  }
  function emit() {
    try { window.dispatchEvent(new CustomEvent("tyd-friends-only-changed")); } catch (e) {}
    // Comment lists already re-render on this event; reuse it so the
    // mode takes effect on news.html and the corner pages at once.
    try { window.dispatchEvent(new CustomEvent("tyd-comment-filter-changed")); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
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
  // Last signed-in member's friends, so the mode works before Firebase
  // answers. Replaced as soon as the signed-in member's list loads.
  friendSet = readCachedFriends();
  function currentSet() {
    if (window.TYDFriends && typeof window.TYDFriends.getFriendUids === "function") {
      var o = {};
      window.TYDFriends.getFriendUids().forEach(function (u) { if (u) o[u] = 1; });
      return o;
    }
    return friendSet;
  }
  // Signed out, the mode does not filter (there is no friends list).
  function passes(authorUid, myUid) {
    if (!isOn()) return true;
    if (!myUid) return true;
    if (authorUid === myUid) return true;
    return !!currentSet()[authorUid];
  }

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
      m.setDoc(m.doc(f.db, "users", user.uid), { friendsOnly: v }, { merge: true }).catch(function () {});
    });
  }

  function hydratePref(user) {
    if (!fb || !user) return;
    var m = fb.mods;
    m.getDoc(m.doc(fb.db, "users", user.uid)).then(function (snap) {
      if (!snap.exists()) return;
      var v = (snap.data() || {}).friendsOnly;
      if (typeof v === "boolean" && v !== isOn()) {
        saveLocal(v);
        emit();
      }
    }).catch(function () {});
  }

  loadFb().then(function (f) {
    if (!f) return;
    var m = f.mods;
    m.onAuthStateChanged(f.auth, function (user) {
      if (user) hydratePref(user);
      else { friendSet = {}; }
    });
    if (f.auth.currentUser) hydratePref(f.auth.currentUser);
  });

  function set(v) {
    v = !!v;
    if (v === isOn()) return;
    saveLocal(v);
    writeRemote(v);
    emit();
  }

  // Wrap the comment view filter's passes() once, so every existing
  // call site (news.html, all corner pages, comment counts) also
  // applies this mode. The wrapper keeps the view filter's own check
  // first, then adds the mode check, so both must pass. Guarded so a
  // second load never double-wraps, and retried because the helper
  // scripts load in no guaranteed order.
  var wrapTries = 0;
  function wrapPasses() {
    if (!window.TYDFriends || typeof window.TYDFriends.passes !== "function") return false;
    if (window.TYDFriends.passes.__tydFO) return true;
    var orig = window.TYDFriends.passes;
    var wrapped = function (authorUid, myUid) {
      if (!orig(authorUid, myUid)) return false;
      return passes(authorUid, myUid);
    };
    wrapped.__tydFO = true;
    window.TYDFriends.passes = wrapped;
    return true;
  }
  wrapPasses();
  var wrapTimer = setInterval(function () {
    if (wrapPasses() || ++wrapTries > 20) clearInterval(wrapTimer);
  }, 500);
  window.addEventListener("load", wrapPasses);
  window.addEventListener("tyd-friends-changed", function () {
    friendSet = readCachedFriends();
    wrapPasses();
    if (isOn()) emit();
  });

  window.TYDFriendsOnly = {
    isOn: isOn,
    set: set,
    passes: passes,
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); }
  };
})();
