/* TYD Scan Add — shared Add sheet for Movies & Shows and (later) Books.
   Three options, like the iCollect Add sheet Lucy sent:
     1. Barcode Scan — phone camera via the vendored html5-qrcode (ZXing) decoder
        over getUserMedia. iOS Safari does NOT support window.BarcodeDetector
        (Chromium-only), so it is never used here. Manual barcode entry fallback.
     2. AI Lookup and Auto-Fill — type a title; movies use the Wikipedia summary
        (free, no key) plus an Openverse cover; books use an Open Library search.
     3. Database Search / Manual Entry — search the same databases by title, or a
        plain manual form with every field editable.
   Barcode lookup after a scan:
     - Books: the barcode is the ISBN — Open Library (free, no key).
     - Movies: UPCItemDB trial endpoint (free, no key) as a best-effort attempt.
       It is quota-limited per IP and could not be verified live to return a
       match, so a miss ALWAYS falls back to the manual form with the scanned
       barcode pre-filled. Nothing is ever invented for a barcode that returns
       nothing.
   Every auto-filled value stays editable before saving; a saved record is never
   overwritten by a later lookup. Host pages pass onFilled(record) /
   onManual(barcode) callbacks; this component never writes to any account. */
(function () {
  "use strict";

  var SHEET_ID = "tydscan-overlay";
  var cssInjected = false;
  var scanner = null;
  var scannerRunning = false;
  var current = null; // {kind, onFilled, onManual}

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fetchJSON(url, timeoutMs) {
    var ctrl = null;
    var signal = undefined;
    try {
      if (typeof AbortController !== "undefined") {
        ctrl = new AbortController();
        signal = ctrl.signal;
        setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, timeoutMs || 8000);
      }
    } catch (e) {}
    return fetch(url, signal ? { signal: signal } : {}).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function yearFromText(t) {
    if (!t) return null;
    var m = String(t).match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : null;
  }

  function coverFromOpenLibraryId(id) {
    return id ? "https://covers.openlibrary.org/b/id/" + id + "-M.jpg" : null;
  }

  /* ---------------- Barcode lookups ---------------- */

  function lookupIsbn(isbnRaw) {
    var isbn = String(isbnRaw || "").replace(/[-\s]/g, "");
    if (!isbn) return Promise.resolve(null);
    // Primary: the /isbn/ endpoint (title, publish date, covers, author keys).
    return fetchJSON("https://openlibrary.org/isbn/" + encodeURIComponent(isbn) + ".json")
      .then(function (doc) {
        if (!doc || !doc.title) return null;
        var rec = {
          kind: "book", title: doc.title, barcode: isbn, source: "openlibrary",
          year: yearFromText(doc.publish_date) || null,
          cover: (doc.covers && doc.covers[0] > 0) ? coverFromOpenLibraryId(doc.covers[0]) : null,
          coverCredit: "Open Library",
          authors: []
        };
        var key = doc.authors && doc.authors[0] && doc.authors[0].key;
        if (!key) return rec;
        return fetchJSON("https://openlibrary.org" + key + ".json").then(function (a) {
          if (a && a.name) rec.authors = [a.name];
          return rec;
        }).catch(function () { return rec; });
      })
      .catch(function () {
        // Fallback: search by ISBN (author names inline, one call).
        return fetchJSON("https://openlibrary.org/search.json?isbn=" + encodeURIComponent(isbn)).then(function (res) {
          var d = res && res.docs && res.docs[0];
          if (!d || !d.title) return null;
          return {
            kind: "book", title: d.title, barcode: isbn, source: "openlibrary",
            year: d.first_publish_year || null,
            cover: d.cover_i ? coverFromOpenLibraryId(d.cover_i) : null,
            coverCredit: "Open Library",
            authors: d.author_name ? d.author_name.slice(0, 3) : []
          };
        }).catch(function () { return null; });
      });
  }

  function lookupUpc(upcRaw) {
    var upc = String(upcRaw || "").replace(/\D/g, "");
    if (!upc) return Promise.resolve(null);
    // Best effort only: the free trial endpoint is quota-limited per IP and
    // could not be verified live to return a match. Any miss means null.
    return fetchJSON("https://api.upcitemdb.com/prod/trial/lookup?upc=" + encodeURIComponent(upc))
      .then(function (data) {
        if (!data || data.code !== "OK" || !data.items || !data.items.length) return null;
        var item = data.items[0];
        if (!item.title) return null;
        return { kind: "movie", title: item.title, barcode: upc, source: "upcitemdb" };
      })
      .catch(function () { return null; });
  }

  function lookupBarcode(code, kind) {
    if (kind === "book") return lookupIsbn(code);
    return lookupUpc(code);
  }

  /* ---------------- AI Lookup / Database Search ---------------- */

  function wikiSummary(title, kind) {
    var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title);
    return fetchJSON(url).then(function (data) {
      if (!data || !data.extract || data.type === "disambiguation") return null;
      return data;
    }).catch(function () { return null; });
  }

  function openverseCover(query) {
    var url = "https://api.openverse.org/v1/images/?q=" + encodeURIComponent(query) + "&page_size=1";
    return fetchJSON(url).then(function (data) {
      var r = data && data.results && data.results[0];
      return (r && r.url) ? r.url : null;
    }).catch(function () { return null; });
  }

  function aiLookup(title, kind, year) {
    var t = String(title || "").trim();
    if (!t) return Promise.resolve(null);
    if (kind === "book") {
      return fetchJSON("https://openlibrary.org/search.json?title=" + encodeURIComponent(t) + "&limit=1")
        .then(function (res) {
          var d = res && res.docs && res.docs[0];
          if (!d || !d.title) return null;
          return {
            kind: "book", title: d.title, source: "openlibrary",
            year: d.first_publish_year || null,
            cover: d.cover_i ? coverFromOpenLibraryId(d.cover_i) : null,
            authors: d.author_name ? d.author_name.slice(0, 3) : [],
            barcode: (d.isbn && d.isbn[0]) ? d.isbn[0] : null
          };
        }).catch(function () { return null; });
    }
    // Movies and shows: Wikipedia summary, retrying with " (film)" on a
    // disambiguation page, plus an Openverse cover. Never a guessed field.
    return wikiSummary(t, kind).then(function (data) {
      if (!data) return wikiSummary(t + " (film)", kind);
      return data;
    }).then(function (data) {
      if (!data) return null;
      var rec = {
        kind: "movie", title: data.title || t, source: "wikipedia",
        synopsis: data.extract || null, cover: null, year: year || null
      };
      if (!rec.year && data.description) rec.year = yearFromText(data.description);
      return openverseCover(t).then(function (cover) {
        rec.cover = cover;
        rec.coverCredit = cover ? "Openverse" : null;
        return rec;
      });
    });
  }

  function searchDb(query, kind) {
    var q = String(query || "").trim();
    if (!q) return Promise.resolve([]);
    if (kind === "book") {
      return fetchJSON("https://openlibrary.org/search.json?title=" + encodeURIComponent(q) + "&limit=8")
        .then(function (res) {
          var docs = (res && res.docs) || [];
          return docs.map(function (d) {
            return {
              kind: "book", title: d.title, source: "openlibrary",
              year: d.first_publish_year || null,
              cover: d.cover_i ? coverFromOpenLibraryId(d.cover_i) : null,
              authors: d.author_name ? d.author_name.slice(0, 3) : [],
              barcode: (d.isbn && d.isbn[0]) ? d.isbn[0] : null
            };
          }).filter(function (r) { return r.title; });
        }).catch(function () { return []; });
    }
    return fetchJSON("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(q) + "&format=json&origin=*")
      .then(function (res) {
        var hits = (res && res.query && res.query.search) || [];
        return hits.slice(0, 8).map(function (h) {
          return { kind: "movie", title: h.title, source: "wikipedia", snippet: String(h.snippet || "").replace(/<[^>]+>/g, "") };
        });
      }).catch(function () { return []; });
  }

  /* ---------------- Sheet UI ---------------- */

  function injectCss() {
    if (cssInjected) return;
    cssInjected = true;
    var st = document.createElement("style");
    st.textContent =
      ".tydscan-overlay{position:fixed;inset:0;background:rgba(20,40,50,.55);z-index:10010;display:flex;align-items:flex-end;justify-content:center}" +
      ".tydscan-overlay[hidden]{display:none}" +
      ".tydscan-sheet{background:#eaf7fb;color:#123;width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px 24px;box-shadow:0 -6px 30px rgba(0,0,0,.3)}" +
      ".tydscan-head{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      ".tydscan-head h2{margin:0;font-size:19px;color:#1f5f74}" +
      ".tydscan-x{border:1px solid #9fc6d4;background:#fff;border-radius:50%;width:34px;height:34px;font-size:16px;cursor:pointer;color:#1f5f74}" +
      ".tydscan-menu{display:grid;gap:10px;margin-top:14px}" +
      ".tydscan-opt{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;background:#fff;border:2px solid #bfe6f2;border-radius:14px;padding:14px;cursor:pointer;font-size:16px;font-weight:700;color:#1f5f74}" +
      ".tydscan-opt span{font-size:13px;font-weight:400;color:#4a6a78}" +
      ".tydscan-opt:hover{border-color:#1f5f74}" +
      ".tydscan-view{margin-top:14px}" +
      ".tydscan-view label{display:block;font-size:13px;font-weight:700;color:#1f5f74;margin:10px 0 4px}" +
      ".tydscan-view input[type=text]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #9fc6d4;border-radius:10px;font-size:15px;background:#fff;color:#123}" +
      ".tydscan-back{background:none;border:0;color:#1f5f74;cursor:pointer;font-size:14px;padding:0;margin-bottom:6px;text-decoration:underline}" +
      ".tydscan-note{font-size:13px;color:#4a6a78;margin:8px 0}" +
      ".tydscan-status{font-size:14px;margin:10px 0;min-height:20px}" +
      ".tydscan-reader{width:100%;min-height:240px;background:#123;border-radius:12px;overflow:hidden}" +
      ".tydscan-reader video{width:100%!important}" +
      ".tydscan-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}" +
      ".tydscan-result{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #bfe6f2;border-radius:12px;padding:10px;margin-top:10px}" +
      ".tydscan-result img{width:52px;height:78px;object-fit:cover;border-radius:6px;background:#bfe6f2}" +
      ".tydscan-result .t{font-weight:700;color:#1f5f74}" +
      ".tydscan-result .s{font-size:13px;color:#4a6a78}" +
      ".tydscan-dbitem{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:#fff;border:1px solid #bfe6f2;border-radius:12px;padding:8px;margin-top:8px;cursor:pointer}" +
      ".tydscan-dbitem img{width:40px;height:60px;object-fit:cover;border-radius:6px;background:#bfe6f2}" +
      ".tydscan-dbitem .t{font-weight:700;color:#1f5f74;font-size:14px}" +
      ".tydscan-dbitem .s{font-size:12px;color:#4a6a78}" +
      ".tydscan-cancel{display:block;width:100%;margin-top:16px;background:none;border:0;color:#1f5f74;font-size:15px;cursor:pointer}" +
      "html[data-theme=\"dark\"] .tydscan-sheet{background:#172635;color:#eefaff}" +
      "html[data-theme=\"dark\"] .tydscan-head h2,html[data-theme=\"dark\"] .tydscan-opt,html[data-theme=\"dark\"] .tydscan-view label,html[data-theme=\"dark\"] .tydscan-back,html[data-theme=\"dark\"] .tydscan-cancel{color:#c9f0fc}" +
      "html[data-theme=\"dark\"] .tydscan-opt,html[data-theme=\"dark\"] .tydscan-result,html[data-theme=\"dark\"] .tydscan-dbitem{background:#22384d;border-color:#2f4b63}" +
      "html[data-theme=\"dark\"] .tydscan-opt span,html[data-theme=\"dark\"] .tydscan-note,html[data-theme=\"dark\"] .tydscan-result .s,html[data-theme=\"dark\"] .tydscan-dbitem .s{color:#9db8c6}" +
      "html[data-theme=\"dark\"] .tydscan-view input[type=text]{background:#22384d;border-color:#2f4b63;color:#eefaff}" +
      "html[data-theme=\"dark\"] .tydscan-result .t,html[data-theme=\"dark\"] .tydscan-dbitem .t{color:#c9f0fc}" +
      "html[data-theme=\"dark\"] .tydscan-x{background:#22384d;border-color:#2f4b63;color:#c9f0fc}";
    document.head.appendChild(st);
  }

  function sheetEl() {
    var el = document.getElementById(SHEET_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = SHEET_ID;
    el.className = "tydscan-overlay";
    el.hidden = true;
    el.innerHTML =
      '<div class="tydscan-sheet" role="dialog" aria-label="Add to your account">' +
      '<div class="tydscan-head"><h2>Add to your account</h2><button type="button" class="tydscan-x" data-scan-close aria-label="Close">✕</button></div>' +
      '<div class="tydscan-menu" id="tydscan-menu">' +
      '<button type="button" class="tydscan-opt" data-scan-opt="scan">📷 Barcode Scan<span>Point your camera at the barcode on the case or cover</span></button>' +
      '<button type="button" class="tydscan-opt" data-scan-opt="ai">✨ AI Lookup and Auto-Fill<span>Type a title and we fill in the details for you</span></button>' +
      '<button type="button" class="tydscan-opt" data-scan-opt="db">🔎 Database Search / Manual Entry<span>Search by title, or enter it all by hand</span></button>' +
      '</div>' +
      '<div class="tydscan-view" id="tydscan-view" hidden></div>' +
      '<button type="button" class="tydscan-cancel" data-scan-close>Cancel</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener("click", function (ev) {
      if (ev.target === el) close();
      var c = ev.target.closest("[data-scan-close]");
      if (c) close();
      var o = ev.target.closest("[data-scan-opt]");
      if (o) showView(o.getAttribute("data-scan-opt"));
    });
    return el;
  }

  function showMenu() {
    stopScanner();
    var menu = document.getElementById("tydscan-menu");
    var view = document.getElementById("tydscan-view");
    if (menu) menu.hidden = false;
    if (view) { view.hidden = true; view.innerHTML = ""; }
  }

  function showView(which) {
    var menu = document.getElementById("tydscan-menu");
    var view = document.getElementById("tydscan-view");
    if (!view) return;
    if (menu) menu.hidden = true;
    view.hidden = false;
    var back = '<button type="button" class="tydscan-back" data-scan-back>← Back to options</button>';
    if (which === "scan") {
      view.innerHTML = back +
        '<div class="tydscan-reader" id="tydscan-reader"></div>' +
        '<div class="tydscan-status" id="tydscan-status">Tap Start camera and point it at the barcode.</div>' +
        '<div class="tydscan-actions"><button type="button" class="btn btn-main" id="tydscan-start">📷 Start camera</button>' +
        '<button type="button" class="btn btn-alt" id="tydscan-stop" hidden>Stop camera</button></div>' +
        '<label for="tydscan-code">Or type the barcode number</label>' +
        '<input type="text" id="tydscan-code" inputmode="numeric" autocomplete="off" placeholder="e.g. 883929098156">' +
        '<div class="tydscan-actions"><button type="button" class="btn btn-alt" id="tydscan-lookup">Look up barcode</button>' +
        '<button type="button" class="btn btn-alt" id="tydscan-manual">Enter it by hand instead</button></div>' +
        '<p class="tydscan-note">The camera needs permission. If it cannot read the barcode, type the number instead and we will look it up.</p>';
      var startBtn = document.getElementById("tydscan-start");
      var stopBtn = document.getElementById("tydscan-stop");
      if (startBtn) startBtn.addEventListener("click", function () { startScanner(); });
      if (stopBtn) stopBtn.addEventListener("click", function () { stopScanner(); });
      var lookupBtn = document.getElementById("tydscan-lookup");
      if (lookupBtn) lookupBtn.addEventListener("click", function () {
        var code = (document.getElementById("tydscan-code") || {}).value || "";
        if (!code.trim()) { setStatus("Type a barcode number first."); return; }
        handleBarcode(code.trim());
      });
      var manualBtn = document.getElementById("tydscan-manual");
      if (manualBtn) manualBtn.addEventListener("click", function () {
        var code = (document.getElementById("tydscan-code") || {}).value || "";
        finishManual(code.trim());
      });
    } else if (which === "ai") {
      view.innerHTML = back +
        '<label for="tydscan-title">Title</label>' +
        '<input type="text" id="tydscan-title" autocomplete="off" placeholder="' + (current.kind === "book" ? "e.g. Fantastic Mr. Fox" : "e.g. The Princess Bride") + '">' +
        (current.kind === "movie" ? '<label for="tydscan-year">Year (optional, helps tell lookalikes apart)</label><input type="text" id="tydscan-year" inputmode="numeric" autocomplete="off" placeholder="e.g. 1987">' : "") +
        '<div class="tydscan-actions"><button type="button" class="btn btn-main" id="tydscan-ai-go">✨ Look it up</button></div>' +
        '<div class="tydscan-status" id="tydscan-status"></div><div id="tydscan-ai-out"></div>';
      var go = document.getElementById("tydscan-ai-go");
      if (go) go.addEventListener("click", function () {
        var t = (document.getElementById("tydscan-title") || {}).value || "";
        var yEl = document.getElementById("tydscan-year");
        var y = yEl ? parseInt(yEl.value, 10) || null : null;
        if (!t.trim()) { setStatus("Type a title first."); return; }
        setStatus("Looking it up…");
        aiLookup(t.trim(), current.kind, y).then(function (rec) {
          var out = document.getElementById("tydscan-ai-out");
          if (!rec) {
            setStatus("No match found for that title. Check the spelling, or enter it by hand.");
            if (out) out.innerHTML = '<div class="tydscan-actions"><button type="button" class="btn btn-alt" id="tydscan-ai-manual">Enter it by hand instead</button></div>';
            var m = document.getElementById("tydscan-ai-manual");
            if (m) m.addEventListener("click", function () { finishManual(""); });
            return;
          }
          setStatus("");
          if (out) out.innerHTML = resultHtml(rec) +
            '<div class="tydscan-actions"><button type="button" class="btn btn-main" id="tydscan-ai-use">Use these details</button>' +
            '<button type="button" class="btn btn-alt" id="tydscan-ai-edit">Edit before saving</button></div>';
          var use = document.getElementById("tydscan-ai-use");
          if (use) use.addEventListener("click", function () { finishFilled(rec); });
          var ed = document.getElementById("tydscan-ai-edit");
          if (ed) ed.addEventListener("click", function () { finishFilled(rec); });
        });
      });
    } else {
      view.innerHTML = back +
        '<label for="tydscan-q">Search by title' + (current.kind === "book" ? " or author" : "") + '</label>' +
        '<input type="text" id="tydscan-q" autocomplete="off" placeholder="' + (current.kind === "book" ? "e.g. Roald Dahl" : "e.g. Spirited Away") + '">' +
        '<div class="tydscan-actions"><button type="button" class="btn btn-main" id="tydscan-db-go">🔎 Search</button>' +
        '<button type="button" class="btn btn-alt" id="tydscan-db-manual">Enter it by hand</button></div>' +
        '<div class="tydscan-status" id="tydscan-status"></div><div id="tydscan-db-out"></div>';
      var dbGo = document.getElementById("tydscan-db-go");
      if (dbGo) dbGo.addEventListener("click", function () {
        var q = (document.getElementById("tydscan-q") || {}).value || "";
        if (!q.trim()) { setStatus("Type something to search for."); return; }
        setStatus("Searching…");
        searchDb(q.trim(), current.kind).then(function (results) {
          var out = document.getElementById("tydscan-db-out");
          if (!results.length) {
            setStatus("Nothing found for that search. Check the spelling, or enter it by hand.");
            if (out) out.innerHTML = "";
            return;
          }
          setStatus("");
          if (!out) return;
          out.innerHTML = results.map(function (r, i) {
            return '<button type="button" class="tydscan-dbitem" data-db-pick="' + i + '">' +
              (r.cover ? '<img src="' + esc(r.cover) + '" alt="">' : "") +
              '<span><span class="t">' + esc(r.title) + '</span><br><span class="s">' +
              esc([r.year, r.authors ? r.authors.join(", ") : "", r.snippet || ""].filter(Boolean).join(" · ")) + '</span></span></button>';
          }).join("");
          out.querySelectorAll("[data-db-pick]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              var r = results[parseInt(btn.getAttribute("data-db-pick"), 10)];
              if (!r) return;
              if (current.kind === "movie") {
                // A Wikipedia search hit only gives a title; fetch its summary.
                setStatus("Getting the details…");
                aiLookup(r.title, "movie").then(function (full) { finishFilled(full || r); });
              } else {
                finishFilled(r);
              }
            });
          });
        });
      });
      var dbManual = document.getElementById("tydscan-db-manual");
      if (dbManual) dbManual.addEventListener("click", function () { finishManual(""); });
    }
    var bk = view.querySelector("[data-scan-back]");
    if (bk) bk.addEventListener("click", function () { showMenu(); });
  }

  function resultHtml(rec) {
    var sub = [];
    if (rec.year) sub.push(String(rec.year));
    if (rec.authors && rec.authors.length) sub.push(rec.authors.join(", "));
    if (rec.synopsis) sub.push(rec.synopsis.slice(0, 160) + (rec.synopsis.length > 160 ? "…" : ""));
    return '<div class="tydscan-result">' +
      (rec.cover ? '<img src="' + esc(rec.cover) + '" alt="">' : "") +
      '<div><div class="t">' + esc(rec.title) + '</div><div class="s">' + esc(sub.join(" · ")) + '</div></div></div>';
  }

  function setStatus(msg) {
    var el = document.getElementById("tydscan-status");
    if (el) el.textContent = msg || "";
  }

  function handleBarcode(code) {
    setStatus("Looking up that barcode…");
    lookupBarcode(code, current.kind).then(function (rec) {
      if (rec) {
        setStatus("");
        var view = document.getElementById("tydscan-view");
        if (view) view.innerHTML = '<button type="button" class="tydscan-back" data-scan-back>← Back to options</button>' +
          resultHtml(rec) +
          '<div class="tydscan-actions"><button type="button" class="btn btn-main" id="tydscan-bc-use">Use these details</button>' +
          '<button type="button" class="btn btn-alt" id="tydscan-bc-manual">Not this one, enter it by hand</button></div>';
        var bk = view.querySelector("[data-scan-back]");
        if (bk) bk.addEventListener("click", function () { showMenu(); });
        var use = document.getElementById("tydscan-bc-use");
        if (use) use.addEventListener("click", function () { finishFilled(rec); });
        var man = document.getElementById("tydscan-bc-manual");
        if (man) man.addEventListener("click", function () { finishManual(code); });
      } else {
        finishManual(code);
      }
    });
  }

  function finishFilled(rec) {
    var cb = current && current.onFilled;
    close();
    if (cb) cb(rec);
  }

  function finishManual(barcode) {
    var cb = current && current.onManual;
    close();
    if (cb) cb(barcode || "");
  }

  /* ---------------- Camera scanning ---------------- */

  function startScanner() {
    var reader = document.getElementById("tydscan-reader");
    var startBtn = document.getElementById("tydscan-start");
    var stopBtn = document.getElementById("tydscan-stop");
    if (!window.Html5Qrcode) {
      setStatus("Barcode scanning is not available on this device. Type the barcode number below instead.");
      return;
    }
    if (!reader) return;
    setStatus("Starting the camera…");
    if (startBtn) startBtn.hidden = true;
    if (stopBtn) stopBtn.hidden = false;
    var done = false;
    var onDecoded = function (text) {
      if (done) return;
      done = true;
      stopScanner();
      setStatus("Got it: " + text);
      handleBarcode(String(text).trim());
    };
    try {
      scanner = new window.Html5Qrcode("tydscan-reader");
      scannerRunning = true;
      var p = scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        onDecoded,
        function () {}
      );
      if (p && p.catch) p.catch(function () {
        scannerRunning = false;
        if (startBtn) startBtn.hidden = false;
        if (stopBtn) stopBtn.hidden = true;
        setStatus("The camera could not be started, or permission was denied. Type the barcode number below instead.");
      });
    } catch (e) {
      scannerRunning = false;
      setStatus("The camera is not available on this device. Type the barcode number below instead.");
    }
  }

  function stopScanner() {
    if (!scannerRunning || !scanner) return;
    scannerRunning = false;
    try {
      var p = scanner.stop();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
    try { scanner.clear(); } catch (e) {}
    scanner = null;
    var startBtn = document.getElementById("tydscan-start");
    var stopBtn = document.getElementById("tydscan-stop");
    if (startBtn) startBtn.hidden = false;
    if (stopBtn) stopBtn.hidden = true;
  }

  /* ---------------- Public API ---------------- */

  function open(opts) {
    opts = opts || {};
    current = {
      kind: opts.kind === "book" ? "book" : "movie",
      onFilled: opts.onFilled || null,
      onManual: opts.onManual || null
    };
    injectCss();
    var el = sheetEl();
    showMenu();
    el.hidden = false;
    var first = el.querySelector("[data-scan-opt]");
    if (first) first.focus();
  }

  function close() {
    stopScanner();
    var el = document.getElementById(SHEET_ID);
    if (el) el.hidden = true;
    current = null;
  }

  window.TYDScanAdd = {
    open: open,
    close: close,
    lookupBarcode: lookupBarcode,
    lookupIsbn: lookupIsbn,
    lookupUpc: lookupUpc,
    aiLookup: aiLookup,
    searchDb: searchDb,
    _isOpen: function () { var el = document.getElementById(SHEET_ID); return !!el && !el.hidden; }
  };
})();
