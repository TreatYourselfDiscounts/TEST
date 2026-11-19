/* pondpost-live.js — the Pond Post reads its edition from Firestore
   (pondPost/current) so a new edition goes live with a document write
   and no deploy. The baked-in Nov 13 edition in news.html stays as the
   fallback: if Firestore is unreachable, or the v13 rules are not
   published yet, the page simply shows the baked-in edition and this
   loader does nothing. Opening news.html?edition=YYYY-MM-DD loads that
   past edition from pondPostEditions instead of the current one. */
(function () {
  if (!window.TYDNewsApplyEdition) return;
  var baked = "2026-11-15";
  try {
    var m = (location.search || "").match(/[?&]edition=(\d{4}-\d{2}-\d{2})/);
    var wantDate = m ? m[1] : null;
  } catch (e) { var wantDate = null; }
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
      var F = fsMod;
      var data = null;
      if (wantDate) {
        var past = await F.getDoc(F.doc(db, "pondPostEditions", wantDate));
        if (past.exists()) data = past.data();
      } else {
        var cur = await F.getDoc(F.doc(db, "pondPost", "current"));
        if (cur.exists()) data = cur.data();
      }
      if (data && data.editionDate && data.stories && data.stories.length) {
        // Apply the live edition when it is newer than the baked-in one,
        // or when a specific past edition was asked for.
        if (wantDate || data.editionDate !== baked) {
          window.TYDNewsApplyEdition(data);
        }
      }
      // Past Posts: list the archived editions, newest first.
      if (window.TYDNewsApplyPastList) {
        try {
          var q = F.query(F.collection(db, "pondPostEditions"), F.orderBy("editionDate", "desc"), F.limit(12));
          var snap = await F.getDocs(q);
          var items = [];
          var archive = [];
          snap.forEach(function (d) {
            var v = d.data() || {};
            items.push({ editionDate: d.id, dateline: v.dateline || d.id, blurb: v.blurb || "" });
            archive.push({
              editionDate: d.id,
              dateline: v.dateline || d.id,
              blurb: v.blurb || "",
              summaries: v.summaries || {},
              stories: v.stories || [],
              sectionsOrder: v.sectionsOrder || [],
              sectionLabels: v.sectionLabels || {},
              sectionIcons: v.sectionIcons || {}
            });
          });
          // The archive powers the history calendar and the Week/Month/Year
          // summaries (news.html reads it and re-renders on this event).
          window.TYDPondPostArchive = archive;
          window.TYDPondPostDates = items.map(function (it) { return it.editionDate; });
          if (items.length) window.TYDNewsApplyPastList(items);
          try { window.dispatchEvent(new CustomEvent("tyd-news-archive", { detail: { dates: window.TYDPondPostDates } })); } catch (e2) {}
        } catch (e) {}
      }
    } catch (e) {
      // Firestore unreachable or rules not published yet: the baked-in
      // edition stays. Nothing to do.
      try { console.log("Pond Post live edition unavailable, showing the baked-in edition."); } catch (e2) {}
    }
  })();
})();
