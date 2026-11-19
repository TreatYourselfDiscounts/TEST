// Member blocking + reporting (Lucy, Nov 12, 2026): one shared helper,
// loaded by site-nav.js on every page. A member's block list lives on
// their own users/{uid}.blocked (array of {uid, name, at}) and is mirrored
// to localStorage 'tydBlocked', so filtering works even before Firebase
// answers and survives a sign-out. Reports go to the userReports
// collection; only Lucy (the Pond owner) can read or delete them.
// Blocking hides that member's chat messages, news comments, shares and
// comments on every page, without a reload.
(function () {
  if (window.TYDBlock) return;
  var OWNER_UID = "1hbpZnS7gfPd0ptzygwiaDBfjo63";
  var KEY = "tydBlocked";
  var listeners = [];
  var fbPromise = null;
  var fb = null;

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function emit() {
    try { window.dispatchEvent(new CustomEvent("tyd-block-changed")); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }
  function isBlocked(uid) {
    if (!uid) return false;
    return read().some(function (b) { return b.uid === uid; });
  }
  function getBlocked() { return read(); }

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

  function writeRemote(list) {
    loadFb().then(function (f) {
      if (!f) return;
      var user = f.auth.currentUser;
      if (!user) return;
      var m = f.mods;
      m.setDoc(m.doc(f.db, "users", user.uid), { blocked: list }, { merge: true }).catch(function () {});
    });
  }

  function hydrateFor(user) {
    if (!user || !fb) return;
    var m = fb.mods;
    m.getDoc(m.doc(fb.db, "users", user.uid)).then(function (snap) {
      if (!snap.exists()) return;
      var d = snap.data() || {};
      if (!Array.isArray(d.blocked) || !d.blocked.length) return;
      var merged = read();
      var changed = false;
      d.blocked.forEach(function (b) {
        if (b && b.uid && !merged.some(function (x) { return x.uid === b.uid; })) {
          merged.push({ uid: b.uid, name: b.name || "", at: b.at || 0 });
          changed = true;
        }
      });
      if (changed) { save(merged); emit(); }
    }).catch(function () {});
  }

  // When a member signs in, pull their block list from their users doc so
  // it follows them to a new device. Local blocks made while signed out
  // are kept too (union by uid).
  loadFb().then(function (f) {
    if (!f) return;
    var m = f.mods;
    m.onAuthStateChanged(f.auth, function (user) { if (user) hydrateFor(user); });
    if (f.auth.currentUser) hydrateFor(f.auth.currentUser);
  });

  function block(uid, name) {
    if (!uid || uid === OWNER_UID || isBlocked(uid)) return;
    var list = read();
    list.push({ uid: uid, name: name || "", at: Date.now() });
    save(list);
    emit();
    writeRemote(list);
  }
  function unblock(uid) {
    if (!uid) return;
    var list = read().filter(function (b) { return b.uid !== uid; });
    save(list);
    emit();
    writeRemote(list);
  }

  window.TYDBlock = {
    getBlocked: getBlocked,
    isBlocked: isBlocked,
    block: block,
    unblock: unblock,
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); }
  };

  /* ---- Reporting ---- */
  var REASONS = ["Spam", "Harassment", "Inappropriate content", "Something else"];
  var repPop = null;
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectRepCss() {
    if (document.getElementById("tydrepcss")) return;
    var st = document.createElement("style");
    st.id = "tydrepcss";
    st.textContent = ""
      + "#tydreppop{position:fixed;z-index:10096;width:min(88vw,320px);background:#fff;border:2px solid #bcd9e4;border-radius:16px;box-shadow:0 14px 32px rgba(35,65,77,.3);padding:14px;color:#23414d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
      + "#tydreppop h3{margin:0 0 4px;color:#1f5f74;font-size:16px;}"
      + "#tydreppop .rp-sub{font-size:13.5px;color:#5b7d89;margin:0 0 10px;line-height:1.45;}"
      + "#tydreppop label.rp-r{display:flex;gap:8px;align-items:center;font-size:14px;padding:6px 0;cursor:pointer;}"
      + "#tydreppop textarea{width:100%;box-sizing:border-box;font-family:inherit;font-size:14px;border:2px solid #bcd9e4;border-radius:12px;padding:8px 10px;margin-top:8px;resize:vertical;}"
      + "#tydreppop .rp-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;}"
      + "#tydreppop .rp-btns button{font-family:inherit;font-size:14px;font-weight:800;border-radius:999px;padding:8px 14px;cursor:pointer;}"
      + "#tydreppop .rp-send{background:#ffd94d;border:2px solid #e8c93a;color:#5a4a00;}"
      + "#tydreppop .rp-cancel{background:#fff;border:2px solid #bcd9e4;color:#1f5f74;}"
      + "#tydreppop .rp-note{font-size:13px;color:#5b7d89;margin:10px 0 0;line-height:1.5;}"
      + "html[data-theme=\"dark\"] #tydreppop{background:#172635 !important;border-color:#2e4a5f !important;color:#f8fdff !important;}"
      + "html[data-theme=\"dark\"] #tydreppop h3{color:#c9f0fc !important;}"
      + "html[data-theme=\"dark\"] #tydreppop .rp-sub,html[data-theme=\"dark\"] #tydreppop .rp-note{color:#bcd6e4 !important;}"
      + "html[data-theme=\"dark\"] #tydreppop .rp-cancel{background:#23414d !important;color:#c9f0fc !important;}";
    document.head.appendChild(st);
  }
  function closeRep() {
    if (repPop) { repPop.remove(); repPop = null; }
  }
  function placeRep(anchor) {
    if (!repPop) return;
    var r = anchor ? anchor.getBoundingClientRect() : null;
    var w = Math.min(window.innerWidth * 0.88, 320);
    var h = repPop.offsetHeight || 260;
    var left = 12, top = 80;
    if (r) {
      left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      top = r.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    }
    repPop.style.left = left + "px";
    repPop.style.top = top + "px";
  }
  function openReport(targetUid, targetName, contentType, contentId, anchor) {
    if (!targetUid) return;
    injectRepCss();
    closeRep();
    var who = targetName ? "@" + targetName : "this member";
    repPop = document.createElement("div");
    repPop.id = "tydreppop";
    var h = "<h3>Report</h3>"
      + '<p class="rp-sub">Tell Lucy what is wrong with ' + esc(who) + (contentType && contentType !== "profile" ? " (" + esc(contentType) + ")" : "") + '. She reviews every report.</p>'
      + REASONS.map(function (r, i) {
          return '<label class="rp-r"><input type="radio" name="tydrep-reason" value="' + esc(r) + '"' + (i === 0 ? " checked" : "") + "> " + esc(r) + "</label>";
        }).join("")
      + '<textarea id="tydrep-note" rows="2" maxlength="300" placeholder="Anything else that helps? (optional)"></textarea>'
      + '<div class="rp-btns"><button type="button" class="rp-cancel">Cancel</button><button type="button" class="rp-send">Send report</button></div>'
      + '<p class="rp-note" style="display:none;"></p>';
    repPop.innerHTML = h;
    document.body.appendChild(repPop);
    placeRep(anchor);
    repPop.querySelector(".rp-cancel").addEventListener("click", function () { closeRep(); });
    repPop.querySelector(".rp-send").addEventListener("click", function () {
      var reason = "Something else";
      var picked = repPop.querySelector('input[name="tydrep-reason"]:checked');
      if (picked) reason = picked.value;
      var note = (document.getElementById("tydrep-note").value || "").trim().slice(0, 300);
      var noteEl = repPop.querySelector(".rp-note");
      function done(msg) {
        noteEl.style.display = "block";
        noteEl.textContent = msg;
        var send = repPop.querySelector(".rp-send");
        if (send) send.disabled = true;
        setTimeout(closeRep, 2200);
      }
      loadFb().then(function (f) {
        if (!f) { done("That report did not send. Try again in a little while."); return; }
        var user = f.auth.currentUser;
        if (!user) {
          noteEl.style.display = "block";
          noteEl.innerHTML = 'Sign in to report. <a href="account.html" style="color:#1f5f74;font-weight:800;">Log in or sign up</a>';
          return;
        }
        var m = f.mods;
        m.getDoc(m.doc(f.db, "profiles", user.uid)).then(function (snap) {
          var reporterName = (snap.exists() && snap.data().username) ? snap.data().username : (user.email || "Pond member");
          return m.addDoc(m.collection(f.db, "userReports"), {
            reporterUid: user.uid,
            reporterName: reporterName,
            targetUid: targetUid,
            targetName: targetName || "",
            contentType: contentType || "profile",
            contentId: contentId || "",
            reason: reason,
            note: note,
            createdAt: Date.now()
          });
        }).then(function () {
          done("Thanks. Lucy will take a look. 🦆");
        }).catch(function () {
          done("That report did not send. Try again in a little while.");
        });
      });
    });
  }
  window.TYDReport = { open: openReport };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeRep();
  });
})();
