// Member profile card (Lucy, Nov 12, 2026): tap a member's name on a
// share or a comment and a small card pops up with their duck, their
// username, the bio they wrote, and their favorite sections. A bio and
// favorites only show when that member filled them in; nothing is shared
// that they did not write themselves. The public copy lives in
// profiles/{uid} (readable by any signed-in member); the users doc copy
// is the member's own synced backup. Loaded by site-nav.js on every page.
(function () {
  if (window.TYDShowProfile) return;
  var SECTIONS = {
    deals: "Deals", news: "The Pond Post", food: "Food", pantry: "Pantry",
    travel: "Travel", korean: "Korean", planner: "Planner", nest: "My Nest",
    books: "Book Nook", gifts: "Gift Planner", bills: "Nest Egg",
    stuff: "My Stuff", pets: "Pet Corner", countdowns: "Countdowns",
    polls: "Pond Polls", chat: "The Quack Shack"
  };
  var cache = {};
  var pop = null, popUid = null, meUid = null;
  var OWNER_UID = "1hbpZnS7gfPd0ptzygwiaDBfjo63";
  // Who is looking at this card? Needed to hide Block on your own card
  // and on Lucy's card. Resolves from the shared Firebase app; null when
  // signed out or before auth has restored (the card just shows no
  // moderation row then).
  var mePromise = null;
  function getMeUid() {
    if (mePromise) return mePromise;
    mePromise = Promise.all([
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
      var user = mods[1].getAuth(app).currentUser;
      return user ? user.uid : null;
    }).catch(function () { return null; });
    return mePromise;
  }
  function inBrands() { return window.location.pathname.indexOf("/brands/") !== -1; }
  function base() { return inBrands() ? "../" : ""; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectCss() {
    if (document.getElementById("tydprofcss")) return;
    var st = document.createElement("style");
    st.id = "tydprofcss";
    st.textContent = ""
      + ".tydprof{background:none;border:none;padding:0;margin:0;font:inherit;font-weight:800;color:inherit;cursor:pointer;text-decoration:underline dotted;}"
      + ".tydprof:hover{color:#1f5f74;}"
      + "#tydprofpop{position:fixed;z-index:10095;width:min(88vw,300px);background:#fff;border:2px solid #bcd9e4;border-radius:16px;box-shadow:0 14px 32px rgba(35,65,77,.3);padding:14px;color:#23414d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
      + "#tydprofpop .pp-head{display:flex;align-items:center;gap:10px;}"
      + "#tydprofpop .pp-av{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #ffd94d;background:#bfe6f2;flex:none;}"
      + "#tydprofpop .pp-avtxt{width:48px;height:48px;border-radius:50%;background:#bfe6f2;display:flex;align-items:center;justify-content:center;font-size:26px;flex:none;}"
      + "#tydprofpop .pp-name{font-weight:800;color:#1f5f74;font-size:16px;word-break:break-word;}"
      + "#tydprofpop .pp-bio{font-size:14px;line-height:1.5;margin:10px 0 0;color:#3f6b7a;}"
      + "#tydprofpop .pp-favs{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}"
      + "#tydprofpop .pp-fav{background:#eaf7fb;border:1.5px solid #bcd9e4;border-radius:999px;padding:4px 10px;font-size:12.5px;font-weight:700;color:#1f5f74;}"
      + "#tydprofpop .pp-note{font-size:13px;color:#5b7d89;margin:10px 0 0;line-height:1.5;}"
      + "#tydprofpop .pp-close{position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;cursor:pointer;color:#5b7d89;font-family:inherit;}"
      + "#tydprofpop .pp-x{margin-top:10px;text-align:right;}"
      + "#tydprofpop .pp-x a{color:#1f5f74;font-weight:800;font-size:13px;}"
      + "#tydprofpop .pp-mod{display:flex;gap:8px;margin-top:12px;}"
      + "#tydprofpop .pp-mod button{flex:1;font-family:inherit;font-size:13px;font-weight:800;border-radius:999px;padding:7px 10px;cursor:pointer;}"
      + "#tydprofpop .pp-block{background:#fff;border:2px solid #e0a3a3;color:#8c2b2b;}"
      + "#tydprofpop .pp-report{background:#fff;border:2px solid #bcd9e4;color:#1f5f74;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-block{background:#23414d !important;border-color:#7a3a3a !important;color:#ffb3b3 !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-report{background:#23414d !important;border-color:#2e4a5f !important;color:#c9f0fc !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop{background:#172635 !important;border-color:#2e4a5f !important;color:#f8fdff !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-name{color:#c9f0fc !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-bio{color:#bcd6e4 !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-fav{background:#23414d !important;border-color:#2e4a5f !important;color:#c9f0fc !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-note{color:#bcd6e4 !important;}"
      + "html[data-theme=\"dark\"] #tydprofpop .pp-x a{color:#ffd94d !important;}";
    document.head.appendChild(st);
  }
  function closePop() {
    if (pop) { pop.remove(); pop = null; popUid = null; }
  }
  function placePop(anchor) {
    if (!pop) return;
    var r = anchor ? anchor.getBoundingClientRect() : null;
    var w = Math.min(window.innerWidth * 0.88, 300);
    var h = pop.offsetHeight || 180;
    var left = 12, top = 80;
    if (r) {
      left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      top = r.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    }
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }
  function renderPop(uid, data, anchor) {
    injectCss();
    closePop();
    popUid = uid;
    pop = document.createElement("div");
    pop.id = "tydprofpop";
    var un = (data && data.username) ? "@" + data.username : "Pond member";
    var av = (data && data.avatar) || "";
    var img = /^duck-[a-z-]+$/.test(av)
      ? '<img class="pp-av" src="' + base() + 'images/avatars/' + av + '.jpg" alt="">'
      : '<span class="pp-avtxt">🦆</span>';
    var bio = (data && typeof data.profileBio === "string") ? data.profileBio.trim() : "";
    var favs = (data && Array.isArray(data.profileFavs)) ? data.profileFavs.filter(function (k) { return SECTIONS[k]; }).slice(0, 3) : [];
    var h = '<button type="button" class="pp-close" aria-label="Close profile">×</button>'
      + '<div class="pp-head">' + img + '<span class="pp-name">' + esc(un) + '</span></div>';
    if (bio) h += '<p class="pp-bio">' + esc(bio) + '</p>';
    if (favs.length) h += '<div class="pp-favs">' + favs.map(function (k) { return '<span class="pp-fav">' + esc(SECTIONS[k]) + '</span>'; }).join("") + '</div>';
    if (!bio && !favs.length) h += '<p class="pp-note">This member has not added a bio or favorite sections yet.</p>';
    // Block + Report (Lucy, Nov 12, 2026): never on Lucy's own card and
    // never on your own card. Block hides this member's messages,
    // comments and shares everywhere, right away.
    if (meUid && meUid !== uid && uid !== OWNER_UID) {
      var blocked = window.TYDBlock && window.TYDBlock.isBlocked(uid);
      var dispName = (data && data.username) ? data.username : "";
      h += '<div class="pp-mod">'
        + '<button type="button" class="pp-block" data-ppblock="' + esc(uid) + '" data-ppname="' + esc(dispName) + '">' + (blocked ? "Unblock" : "Block") + '</button>'
        + '<button type="button" class="pp-report" data-ppreport="' + esc(uid) + '" data-ppname="' + esc(dispName) + '">Report</button>'
        + '</div>';
    }
    pop.innerHTML = h;
    document.body.appendChild(pop);
    pop.querySelector(".pp-close").addEventListener("click", function (e) { e.stopPropagation(); closePop(); });
    var blk = pop.querySelector("[data-ppblock]");
    if (blk) blk.addEventListener("click", function (e) {
      e.stopPropagation();
      var tUid = blk.getAttribute("data-ppblock"), tName = blk.getAttribute("data-ppname");
      if (window.TYDBlock) {
        if (window.TYDBlock.isBlocked(tUid)) window.TYDBlock.unblock(tUid);
        else window.TYDBlock.block(tUid, tName);
      }
      if (popUid === tUid) renderPop(tUid, cache[tUid] ? cache[tUid].data : {}, blk);
    });
    var rep = pop.querySelector("[data-ppreport]");
    if (rep) rep.addEventListener("click", function (e) {
      e.stopPropagation();
      if (window.TYDReport) window.TYDReport.open(rep.getAttribute("data-ppreport"), rep.getAttribute("data-ppname"), "profile", rep.getAttribute("data-ppreport"), rep);
    });
    placePop(anchor);
  }
  function renderSignedOut(anchor) {
    injectCss();
    closePop();
    pop = document.createElement("div");
    pop.id = "tydprofpop";
    pop.innerHTML = '<button type="button" class="pp-close" aria-label="Close profile">×</button>'
      + '<div class="pp-head"><span class="pp-avtxt">🦆</span><span class="pp-name">Pond member</span></div>'
      + '<p class="pp-note">Sign in to see member profiles.</p>'
      + '<div class="pp-x"><a href="' + base() + 'account.html">Log in or sign up ›</a></div>';
    document.body.appendChild(pop);
    pop.querySelector(".pp-close").addEventListener("click", function (e) { e.stopPropagation(); closePop(); });
    placePop(anchor);
  }
  function showProfile(uid, anchor) {
    if (!uid) return;
    if (popUid === uid && pop) { placePop(anchor); return; }
    injectCss();
    closePop();
    popUid = uid;
    pop = document.createElement("div");
    pop.id = "tydprofpop";
    pop.innerHTML = '<div class="pp-head"><span class="pp-avtxt">🦆</span><span class="pp-name">Loading…</span></div>';
    document.body.appendChild(pop);
    placePop(anchor);
    var hit = cache[uid];
    if (hit && Date.now() - hit.ts < 300000) {
      getMeUid().then(function (me) { meUid = me; if (popUid === uid) renderPop(uid, hit.data, anchor); });
      return;
    }
    Promise.all([
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
      var user = mods[1].getAuth(app).currentUser;
      meUid = user ? user.uid : null;
      if (!user) { renderSignedOut(anchor); return; }
      var db = mods[2].getFirestore(app);
      return mods[2].getDoc(mods[2].doc(db, "profiles", uid)).then(function (snap) {
        var data = snap.exists() ? snap.data() : {};
        cache[uid] = { ts: Date.now(), data: data };
        if (popUid === uid) renderPop(uid, data, anchor);
      });
    }).catch(function () {
      if (popUid === uid) renderPop(uid, {}, anchor);
    });
  }
  window.TYDShowProfile = showProfile;
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-profile-uid]") : null;
    if (t) {
      e.stopPropagation();
      showProfile(t.getAttribute("data-profile-uid"), t);
      return;
    }
    if (pop && !pop.contains(e.target)) closePop();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePop();
  });
})();
