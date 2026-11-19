// Shared Pond Account pill: shows the visitor's real login state on every
// page. Logged out it invites log in / sign up; logged in it shows their
// email and links to their account. Firebase Auth keeps the session across
// the whole site, so this pill just makes that visible everywhere.
(function () {
  function inBrands() { return window.location.pathname.indexOf("/brands/") !== -1; }
  function accountUrl() { return (inBrands() ? "../" : "") + "account.html"; }
  function ensurePill() {
    var pill = document.getElementById("acctpill");
    if (pill) return pill;
    pill = document.createElement("a");
    pill.id = "acctpill";
    pill.href = accountUrl();
    pill.style.cssText = "display:inline-block; background:#1f5f74; color:#fff; font-weight:800; font-size:13px; text-decoration:none; border-radius:999px; padding:8px 15px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
    pill.textContent = "🦆 Pond Account · Log in / Sign up";
    var holder = document.createElement("div");
    holder.style.cssText = "text-align:right; margin:8px 0;";
    holder.appendChild(pill);
    var host = document.querySelector(".app") || document.querySelector(".wrap") || document.body;
    host.insertBefore(holder, host.firstChild);
    return pill;
  }
  async function init() {
    var chip = document.getElementById("tydacctchip");
    var bar = document.getElementById("tydacctbar");
    var pill = (chip || bar) ? null : ensurePill();
    try {
      var appMod = await import("./pond-firebase-stub.js");
      var authMod = await import("./pond-firebase-stub.js");
      var config = {
        apiKey: "preview-disabled",
        authDomain: "pond-preview-disabled.firebaseapp.com",
        projectId: "pond-preview-disabled",
        storageBucket: "pond-preview-disabled.firebasestorage.app",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:previewdisabled"
      };
      var app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(config);
      var fsMod = null, db = null;
      try {
        fsMod = await import("./pond-firebase-stub.js");
        db = fsMod.getFirestore(app);
      } catch (e) {}
      authMod.onAuthStateChanged(authMod.getAuth(app), function (user) {
        var foot = document.getElementById("footacct");
        if (foot) foot.textContent = user ? "Your Pond Account: " + user.email + " · My Account" : "Your Pond Account: sign up or log in";
        function paint(label, av) {
          var escLabel = String(label).replace(/</g, "&lt;");
          var img = "";
          if (/^duck-[a-z]+$/.test(av || "")) img = (inBrands() ? "../" : "") + "images/avatars/" + av + ".jpg";
          if (bar) {
            var who = bar.querySelector(".tydab-who");
            var st = bar.querySelector(".tydab-state");
            if (who) who.innerHTML = (img ? '<img class="tydab-av" src="' + img + '" alt="">' : (user ? "" : "🦆 ")) + escLabel;
            if (st) {
              if (user) {
                st.innerHTML = '<a class="tydab-btn" href="' + accountUrl() + '">My Account</a><button type="button" class="tydab-btn alt" id="tydab-logout">Log out</button>';
                var lo = document.getElementById("tydab-logout");
                if (lo) lo.addEventListener("click", function () { try { authMod.signOut(authMod.getAuth(app)); } catch (e) {} });
              } else {
                st.innerHTML = '<a class="tydab-btn" href="' + accountUrl() + '">Log in</a><a class="tydab-btn alt" href="' + accountUrl() + '">Sign up free</a>';
              }
            }
          } else if (chip) {
            var circ = document.getElementById("tydacctcirc");
            var lab = document.getElementById("tydacctlabel");
            if (circ) circ.innerHTML = img ? '<img src="' + img + '" alt="">' : "🦆";
            if (lab) lab.textContent = label;
          } else if (pill) {
            var imgHtml = img ? '<img src="' + img + '" alt="" style="width:20px; height:20px; border-radius:50%; object-fit:cover; vertical-align:-5px; margin-right:6px;">' : "";
            pill.innerHTML = imgHtml + "🦆 " + escLabel + (user ? " · My Account" : " · Log in / Sign up");
          }
        }
        if (!user) { paint(chip ? "Sign in" : "Pond Account", ""); return; }
        paint(user.email, "");
        if (db && fsMod) {
          fsMod.getDoc(fsMod.doc(db, "users", user.uid)).then(function (us) {
            var rv = us.exists() ? (us.data().sessionsRevokedAt || 0) : 0;
            var li = user.metadata && user.metadata.lastSignInTime ? Date.parse(user.metadata.lastSignInTime) : 0;
            if (rv && li && rv > li + 60000) { try { authMod.signOut(authMod.getAuth(app)); } catch (e) {} }
          }).catch(function () {});
        }
        if (db && fsMod) {
          fsMod.getDoc(fsMod.doc(db, "profiles", user.uid)).then(function (snap) {
            var un = snap.exists() ? (snap.data().username || "") : "";
            var av = snap.exists() ? (snap.data().avatar || "") : "";
            paint(un ? "@" + un : user.email, av);
          }).catch(function () {});
        }
      });
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
