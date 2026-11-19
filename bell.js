// Pond bell: deal-alert notifications for the bell button site-nav.js puts
// at the right end of the top switcher row. Data is the site's Firestore
// "announcements" collection (written by the admin deal-alert composer:
// { title, message, link, tag, from, createdAt }), filtered by the signed-in
// member's own alert preferences (users/{uid}.alertPrefs, an array of tag
// strings, exactly the rule account.html uses: with prefs set, a member sees
// their chosen tags plus "general" and untagged alerts; no prefs = all).
// Unread = announcements newer than the member's last-seen time, kept in
// localStorage "tydBellSeen" and best-effort in users/{uid}.bellSeenAt.
// "Mark all read" in the panel advances the seen time for everything at
// once; tapping one notification marks just that one read instead.
// Comments other members leave on MY shared posts (nestComments where
// shareOwner is me) ride the bell too (Lucy, Nov 10, 2026): they count on
// the badge until Mark all read, tracked by a separate seen time kept in
// localStorage "tydBellCommentSeen" and users/{uid}.commentSeenAt.
(function () {
  var bell = document.getElementById("tydbell");
  var panel = document.getElementById("tydbellpanel");
  if (!bell || !panel) return;
  var badge = document.getElementById("tydbellbadge");
  var listEl = document.getElementById("tydbelllist");
  var markBtn = document.getElementById("tydbellmark");
  var delAllBtn = document.getElementById("tydbelldelall");

  function inBrands() { return window.location.pathname.indexOf("/brands/") !== -1; }
  function accountUrl() { return (inBrands() ? "../" : "") + "account.html"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function relTime(ts) {
    if (!ts) return "";
    var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 86400 * 7) return Math.floor(s / 86400) + "d ago";
    return new Date(ts).toLocaleDateString();
  }

  /* Per-item read (Lucy, Nov 12, 2026): tapping a notification marks just
     that one read. Read IDs live in localStorage "tydBellReadIds" and,
     best-effort, in users/{uid}.bellReadIds (account wins when present,
     local is pushed up when the account has none), capped at 200 so the
     list cannot grow forever. Search and the New/History toggle live in
     state.query / state.view and reset when the panel closes. */
  var state = { user: null, uid: null, items: null, friends: null, comments: null, pantry: null, expiry: null, codes: null, grocery: null, seen: 0, commentSeen: 0, news: null, newsSeen: 0, newsNotify: null, updates: null, updatesSeen: 0, readIds: [], deletedIds: [], query: "", view: "new", fs: null, db: null, bellPrefs: null, shack: null, shackSeen: {}, shackNotifs: null, mentionNotifs: true, shackFollowing: null };
  /* Bell type toggles (Lucy, Nov 12, 2026): the Notification settings in
     My Account let a member switch whole kinds off. bellPrefs is null
     until loaded, which means everything on (the existing behavior).
     A stored object only ever turns kinds off; a missing key stays on. */
  function bellOn(key) {
    if (!state.bellPrefs || typeof state.bellPrefs !== "object") return true;
    return state.bellPrefs[key] !== false;
  }
  /* Site updates (Lucy, Nov 15, 2026): the bell lists site updates
     (new feature, new category, fix) from updates.json, and a member
     picks which kinds they want in Notification settings. Each kind is
     its own bellPrefs key ("upd-feature", "upd-category", "upd-fix");
     a missing key stays on. */
  function updOn(kind) { return bellOn("upd-" + kind); }
  try { state.seen = parseInt(localStorage.getItem("tydBellSeen") || "0", 10) || 0; } catch (e) {}
  try { state.commentSeen = parseInt(localStorage.getItem("tydBellCommentSeen") || "0", 10) || 0; } catch (e) {}
  try { state.newsSeen = parseInt(localStorage.getItem("tydNewsSeen") || "0", 10) || 0; } catch (e) {}
  try { state.updatesSeen = parseInt(localStorage.getItem("tydUpdatesSeen") || "0", 10) || 0; } catch (e) {}
  try { var rl = JSON.parse(localStorage.getItem("tydBellReadIds") || "[]"); if (Array.isArray(rl)) state.readIds = rl.filter(function (x) { return typeof x === "string"; }).slice(-200); } catch (e) {}
  /* Deleted notifications (v340): a deleted notification stays gone.
     Dismissed IDs live in localStorage "tydBellDeletedIds" and,
     best-effort, in users/{uid}.bellDeletedIds (account wins when
     present, local is pushed up when the account has none), capped
     at 500 so the list cannot grow forever. Same pattern as readIds. */
  try { var dl = JSON.parse(localStorage.getItem("tydBellDeletedIds") || "[]"); if (Array.isArray(dl)) state.deletedIds = dl.filter(function (x) { return typeof x === "string"; }).slice(-500); } catch (e) {}

  function hasRead(id) { return !!id && state.readIds.indexOf(id) !== -1; }
  function hasDeleted(id) { return !!id && state.deletedIds.indexOf(id) !== -1; }
  function saveDeletedIds() {
    if (state.deletedIds.length > 500) state.deletedIds = state.deletedIds.slice(-500);
    try { localStorage.setItem("tydBellDeletedIds", JSON.stringify(state.deletedIds)); } catch (e) {}
    if (state.uid && state.fs && state.db) state.fs.setDoc(state.fs.doc(state.db, "users", state.uid), { bellDeletedIds: state.deletedIds }, { merge: true }).catch(function () {});
  }
  function deleteOne(id) {
    if (!id || hasDeleted(id)) return false;
    state.deletedIds.push(id);
    saveDeletedIds();
    return true;
  }
  /* Every deletable notification has a stable ID: deal alerts, news and
     updates use their own IDs; Shack items use "shack-<message id>";
     comments and Pond shares use their Firestore doc IDs so an edit
     does not resurrect them. */
  function allNotifIds() {
    var ids = [];
    function add(id) { if (id && ids.indexOf(id) === -1) ids.push(id); }
    if (state.items) state.items.forEach(function (it) { add(it.id); });
    if (state.news) state.news.forEach(function (n) { add(n.id); });
    if (state.updates) state.updates.forEach(function (u) { add(u.id); });
    if (state.comments && bellOn("comments")) filteredComments().forEach(function (c) { add(c.id); });
    if (state.pond && bellOn("pond")) filteredPond().forEach(function (s) { add(s.id); });
    if (state.shack) state.shack.forEach(function (s) { if (shackVisible(s)) add(s.id); });
    return ids;
  }
  function deletableCount() { return allNotifIds().filter(function (id) { return !hasDeleted(id); }).length; }
  function deleteAllNotifs() {
    var ids = allNotifIds().filter(function (id) { return !hasDeleted(id); });
    if (!ids.length) return 0;
    state.deletedIds = state.deletedIds.concat(ids);
    saveDeletedIds();
    return ids.length;
  }
  /* Undo for deletes (v341, Lucy: "Yes, add an undo"): after any delete
     a small toast at the bottom of the bell panel offers Undo for ~5s.
     The toast is a child of the panel but OUTSIDE #tydbelllist, so
     render() (which replaces listEl.innerHTML) never destroys it, and
     it sits below the list so it never covers a row or its swipe zone.
     Undo removes just those IDs from deletedIds (readIds are never
     touched by delete, so restored items keep their original read
     state), saves, hides the toast and re-renders. If the toast
     expires, the delete stands as permanent. A second delete while a
     toast is showing replaces the pending IDs and resets the timer. */
  var undoToastEl = null, undoMsgEl = null, undoTimer = null, pendingUndoIds = [];
  function ensureUndoToast() {
    if (undoToastEl) return undoToastEl;
    undoToastEl = document.createElement("div");
    undoToastEl.id = "tydbellundo";
    undoToastEl.className = "tydbellundo";
    undoToastEl.hidden = true;
    undoToastEl.innerHTML = '<span class="tydbellundo-msg"></span><button type="button" id="tydbellundo-btn">Undo</button>';
    panel.appendChild(undoToastEl);
    undoMsgEl = undoToastEl.querySelector(".tydbellundo-msg");
    return undoToastEl;
  }
  function hideUndoToast() {
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    pendingUndoIds = [];
    if (undoToastEl) undoToastEl.hidden = true;
  }
  function showUndoToast(ids, label) {
    if (!ids || !ids.length) return;
    ensureUndoToast();
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    pendingUndoIds = ids.slice();
    if (undoMsgEl) undoMsgEl.textContent = label;
    undoToastEl.hidden = false;
    undoTimer = setTimeout(function () { undoTimer = null; pendingUndoIds = []; if (undoToastEl) undoToastEl.hidden = true; }, 5000);
  }
  function undoDelete() {
    if (!pendingUndoIds.length) return false;
    var ids = pendingUndoIds.slice();
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    pendingUndoIds = [];
    if (undoToastEl) undoToastEl.hidden = true;
    state.deletedIds = state.deletedIds.filter(function (id) { return ids.indexOf(id) === -1; });
    saveDeletedIds();
    render();
    return true;
  }
  function isDealUnread(it) { return it.ts > state.seen && !hasRead(it.id); }
  function isNewsUnread(n) { return n.ts > state.newsSeen && !hasRead(n.id); }
  function isUpdatesUnread(u) { return u.ts > state.updatesSeen && !hasRead(u.id) && !hasDeleted(u.id); }
  function saveReadIds() {
    if (state.readIds.length > 200) state.readIds = state.readIds.slice(-200);
    try { localStorage.setItem("tydBellReadIds", JSON.stringify(state.readIds)); } catch (e) {}
    if (state.uid && state.fs && state.db) state.fs.setDoc(state.fs.doc(state.db, "users", state.uid), { bellReadIds: state.readIds }, { merge: true }).catch(function () {});
  }
  function markRead(id) {
    if (!id || hasRead(id)) return false;
    state.readIds.push(id);
    saveReadIds();
    return true;
  }

  function unreadCount() {
    var n = 0;
    if (state.items) n += state.items.filter(function (it) { return isDealUnread(it) && !hasDeleted(it.id); }).length;
    if (state.friends && bellOn("friends")) n += state.friends.length;
    if (state.comments && bellOn("comments")) n += filteredComments().filter(function (c) { return c.ts > state.commentSeen && !hasDeleted(c.id); }).length;
    if (state.news) n += state.news.filter(function (x) { return isNewsUnread(x) && !hasDeleted(x.id); }).length;
    if (state.updates) n += state.updates.filter(isUpdatesUnread).length;
    if (state.shack) n += state.shack.filter(isShackUnread).length;
    return n;
  }
  /* Quack Shack notifications (Nov 15, 2026, v306): new quacks in rooms
     with notifications on, @mentions of the member, and Lucy's
     @Ducklings. One-shot, like the bell's other sources: the pondChat
     snapshot (up to 60, newest first) is filtered client-side against
     the member's per-channel last-seen, mute and mention prefs. A muted
     room never shows and never counts; an @mention only counts when
     @mention notifications are on. @Ducklings is an owner announcement,
     not a personal @mention, so it does not depend on mentionNotifs —
     but it still respects a muted room. Own quacks never notify.
     The bell is one-shot on sign-in (like announcements): Shack items
     refresh on the next page load after the member marks rooms seen in
     the Shack; the on-page channel badges in the Shack are the live
     surface. */
  var SHACK_LABELS = { general: "General", deals: "Deals", food: "Food", pets: "Pets", pondpost: "Pond Post" };
  var LUCY_UID_BELL = "1hbpZnS7gfPd0ptzygwiaDBfjo63";
  function shackNotifOn(id) { return !state.shackNotifs || state.shackNotifs[id] !== false; }
  function shackLastSeenAt(id) { return (state.shackSeen && state.shackSeen[id]) || 0; }
  function shackVisible(s) {
    if (!s) return false;
    if (!shackNotifOn(s.channel)) return false;
    if (s.kind === "mention" && !state.mentionNotifs) return false;
    return true;
  }
  function isShackUnread(s) {
    if (!shackVisible(s)) return false;
    if (!s.ts || s.ts <= shackLastSeenAt(s.channel)) return false;
    return !hasRead(s.id) && !hasDeleted(s.id);
  }
  function shackUrl(ch) { return (inBrands() ? "../" : "") + "chat.html?ch=" + encodeURIComponent(ch || "general"); }
  function shackItemHtml(s) {
    var chLabel = SHACK_LABELS[s.channel] || s.channel;
    var title;
    if (s.kind === "everyone") title = "📣 @Ducklings — @" + s.from + " in #" + chLabel;
    else if (s.kind === "mention") title = "💬 @" + s.from + " mentioned you in #" + chLabel;
    else title = "🦆 @" + s.from + " quacked in #" + chLabel;
    var body = (s.text || "").length > 120 ? (s.text || "").slice(0, 120).trim() + "…" : (s.text || "");
    return '<a class="tydbellitem' + (isShackUnread(s) ? " unread" : "") + '" data-readid="' + esc(s.id) + '" data-delid="' + esc(s.id) + '" style="display:block;text-decoration:none;" href="' + shackUrl(s.channel) + '"><span class="bt">' + esc(title) + "</span>" + (body ? esc(body) : "") + (s.ts ? '<div class="bwhen">' + relTime(s.ts) + "</div>" : "") + "</a>";
  }
  function loadShack() {
    if (!state.fs || !state.db || !state.uid) { state.shack = []; return; }
    var fsMod = state.fs, db = state.db, uid = state.uid;
    fsMod.getDoc(fsMod.doc(db, "profiles", uid)).then(function (psnap) {
      var myName = "";
      try { if (psnap.exists()) myName = (psnap.data().username || "").toLowerCase(); } catch (e) {}
      var q = fsMod.query(fsMod.collection(db, "pondChat"), fsMod.orderBy("createdAt", "desc"), fsMod.limit(60));
      return fsMod.getDocs(q).then(function (snap) {
        var out = [];
        snap.forEach(function (d) {
          var v = d.data() || {};
          // Reposts (v373) are member pages, not new quacks: they never
          // notify here, so the bell keeps showing only real posts.
          if (v.type === "repost") return;
          var ch = (v.channel && SHACK_LABELS[v.channel]) ? v.channel : "general";
          var ts = (typeof v.createdAt === "number") ? v.createdAt : 0;
          if (!ts || ts <= shackLastSeenAt(ch)) return;
          if (v.uid === uid) return;
          if (window.TYDBlock && window.TYDBlock.isBlocked(v.uid)) return;
          var mentions = Array.isArray(v.mentions) ? v.mentions : [];
          var isEveryone = !!v.mentionsEveryone && v.uid === LUCY_UID_BELL;
          var isMention = !!myName && mentions.indexOf(myName) !== -1;
          var kind = isEveryone ? "everyone" : (isMention ? "mention" : "post");
          // Friends-only hides other members' posts/mentions, never Lucy's @Ducklings.
          if (kind !== "everyone" && !foPasses(v.uid)) return;
          out.push({ id: "shack-" + d.id, msgId: d.id, channel: ch, kind: kind, from: v.name || "Pond friend", text: v.text || "", ts: ts });
        });
        out.sort(function (a, b) { return b.ts - a.ts; });
        state.shack = out.slice(0, 10);
        render();
      });
    }).catch(function () { if (!state.shack) state.shack = []; });
  }
  /* Friends-only mode (Lucy, Nov 12, 2026): when it is on, the bell
     hides comment pings and New in the Pond shares from members who are
     not Pond friends. Friend requests, Lucy's announcements, Pantry
     Watch and gift reminders are never hidden. The badge counts only
     what is shown, because unreadCount uses these same lists. */
  function foPasses(uid) {
    if (!window.TYDFriendsOnly) return true;
    try { return window.TYDFriendsOnly.passes(uid, state.uid); } catch (e) { return true; }
  }
  function filteredComments() {
    if (!state.comments) return [];
    return state.comments.filter(function (c) { return foPasses(c.uid); });
  }
  function filteredPond() {
    if (!state.pond) return [];
    return state.pond.filter(function (s) { return foPasses(s.uid); });
  }
  function commentItemHtml(c) {
    var body = c.text.length > 120 ? c.text.slice(0, 120).trim() + "\u2026" : c.text;
    return '<div class="tydbellitem' + (c.ts > state.commentSeen ? " unread" : "") + '" data-delid="' + esc(c.id) + '"><span class="bt">\u{1F4AC} @' + esc(c.from) + " commented</span>" + esc(body)
      + (c.ts ? '<div class="bwhen">' + relTime(c.ts) + "</div>" : "") + "</div>";
  }
  /* Pond Post notifications (Lucy, Nov 12, 2026): a member who taps
     Notify on a Pond Post section gets a bell item when a new edition
     is up for that section. The edition marker lives in Firestore
     (pondPost/current, with news-meta.json as the fallback); a section
     counts as new while its timestamp is newer than the member's
     last-seen time (users/{uid}.newsSeenAt, local fallback localStorage
     "tydNewsSeen"). Mark all read advances it. */
  var NEWS_LABELS = { everyday: "Everyday Stuff", stocks: "Stocks", politics: "Politics", korea: "South Korea" };
  function newsUrl() { return (inBrands() ? "../" : "") + "news.html"; }
  function newsMetaUrl() { return (inBrands() ? "../" : "") + "news-meta.json"; }
  function newsItemHtml(n) {
    return '<a class="tydbellitem' + (isNewsUnread(n) ? " unread" : "") + '" data-readid="' + esc(n.id) + '" data-delid="' + esc(n.id) + '" style="display:block;text-decoration:none;" href="' + newsUrl() + '"><span class="bt">📰 Pond Post: ' + esc(n.label) + " is up</span>" + (n.ts ? '<div class="bwhen">' + relTime(n.ts) + "</div>" : "") + "</a>";
  }
  function newsFromSections(sections, followed) {
    var all = [];
    if (sections && typeof sections === "object") {
      followed.forEach(function (k) {
        var ts = Number(sections[k]) || 0;
        if (ts) all.push({ key: k, label: NEWS_LABELS[k] || k, ts: ts, id: "news-" + k + "-" + ts });
      });
    }
    return all;
  }
  function loadNewsMeta() {
    var notify = state.newsNotify || {};
    var followed = Object.keys(NEWS_LABELS).filter(function (k) { return !!notify[k]; });
    if (!followed.length) { state.news = []; return; }
    function fromMetaFile() {
      fetch(newsMetaUrl(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (meta) {
        state.news = newsFromSections(meta && meta.sections, followed);
        render();
      }).catch(function () { state.news = []; });
    }
    /* Live edition (Nov 13, 2026): the edition marker lives in Firestore
       (pondPost/current) so a new edition pings the bell with no deploy.
       Falls back to news-meta.json when Firestore is unreachable or the
       v13 rules are not published yet. */
    try {
      if (!state.fs || !state.db) { fromMetaFile(); return; }
      state.fs.getDoc(state.fs.doc(state.db, "pondPost", "current")).then(function (snap) {
        if (snap.exists() && snap.data() && snap.data().sections) {
          state.news = newsFromSections(snap.data().sections, followed);
          render();
        } else fromMetaFile();
      }).catch(function () { fromMetaFile(); });
    } catch (e) { fromMetaFile(); }
  }
  /* Site updates (Lucy, Nov 15, 2026): the bell lists site updates from
     updates.json (a new feature, a new category, or a fix), newest
     first, capped at 10. Only the kinds the member picked in
     Notification settings show up; a kind with no toggle set stays on.
     New entries are added only when Lucy approves them, and only new
     features (a new page, a new category, a big new function) go in
     the What's New card; the bell list also carries fixes. */
  var UPD_LABELS = { feature: "✨ New feature", category: "📂 New category", fix: "🔧 Fix" };
  var UPD_KINDS = ["feature", "category", "fix"];
  function updatesUrl() { return (inBrands() ? "../" : "") + "updates.json"; }
  function updatesItemHtml(u) {
    var label = UPD_LABELS[u.kind] || "🦆 Update";
    var href = u.link ? (inBrands() && u.link.indexOf("http") !== 0 && u.link.indexOf("../") !== 0 ? "../" + u.link : u.link) : "";
    var body = (u.message || "").length > 140 ? (u.message || "").slice(0, 140).trim() + "…" : (u.message || "");
    var h = '<a class="tydbellitem' + (isUpdatesUnread(u) ? " unread" : "") + '" data-readid="' + esc(u.id) + '" data-delid="' + esc(u.id) + '" style="display:block;text-decoration:none;"' + (href ? ' href="' + esc(href) + '"' : "") + '><span class="bt">' + label + ": " + esc(u.title || "Update") + "</span>";
    if (body) h += esc(body);
    if (u.ts) h += '<div class="bwhen">' + relTime(u.ts) + "</div>";
    return h + "</a>";
  }
  function loadUpdates() {
    fetch(updatesUrl(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      var list = (data && Array.isArray(data.updates)) ? data.updates : [];
      var out = [];
      list.forEach(function (u) {
        if (!u || !u.id || !u.title) return;
        var kind = UPD_KINDS.indexOf(u.kind) !== -1 ? u.kind : "feature";
        if (!updOn(kind)) return;
        out.push({ id: String(u.id), kind: kind, title: String(u.title), message: String(u.message || ""), link: String(u.link || ""), ts: Number(u.ts) || 0 });
      });
      out.sort(function (a, b) { return b.ts - a.ts; });
      state.updates = out.slice(0, 10);
      render();
    }).catch(function () { state.updates = []; });
  }
  /* Pending friend requests ride the bell (Lucy, Nov 10, 2026): a request
     used to sit silently in My Account until she happened to open it. Now
     it counts on the bell badge and shows at the top of the panel with
     working Accept / Decline buttons (the same status write account.html
     makes; friendships are derived from accepted requests). Requests stay
     on the badge until she acts on them; Mark all read only clears deal
     alerts, never requests. */
  var POND_KINDS = { pets: ["a pet", "pets.html"], books: ["a book", "books.html"], gifts: ["a gift list", "gifts.html"], bills: ["a bill", "bills.html"], stuff: ["an item", "stuff.html"], pantry: ["a pantry", "pantry.html"], countdowns: ["a countdown", "countdowns.html"], trips: ["a trip", "travel.html"], recipes: ["a recipe", "recipes.html"] };
  function pondItemHtml(s) {
    var k = POND_KINDS[s.kind] || ["something", "nest.html"];
    var href = (inBrands() ? "../" : "") + k[1];
    return '<a class="tydbellitem" data-delid="' + esc(s.id) + '" style="display:block;text-decoration:none;" href="' + href + '"><span class="bt">@' + esc(s.from) + "</span>shared " + k[0] + ": " + esc(s.title) + (s.ts ? '<div class="bwhen">' + relTime(s.ts) + "</div>" : "") + "</a>";
  }
  function giftSoon(udata) {
    var people = (udata && Array.isArray(udata.gifts)) ? udata.gifts : [];
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var out = [];
    people.forEach(function (p) {
      if (!p || !p.date) return;
      var parts = String(p.date).split("-");
      if (parts.length < 3) return;
      var mo = parseInt(parts[1], 10) - 1, da = parseInt(parts[2], 10);
      if (isNaN(mo) || isNaN(da)) return;
      var next = new Date(now.getFullYear(), mo, da);
      if (next < now) next = new Date(now.getFullYear() + 1, mo, da);
      var days = Math.round((next - now) / 864e5);
      if (days <= 14) out.push({ name: p.name || "Someone", occasion: p.occasion || "Occasion", days: days, label: next.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    });
    out.sort(function (a, b) { return a.days - b.days; });
    return out.slice(0, 4);
  }
  function giftsUrl() { return (inBrands() ? "../" : "") + "gifts.html"; }
  function giftsHtml() {
    if (!bellOn("gifts")) return "";
    if (!state.gifts || !state.gifts.length) return "";
    var h = '<div class="tydbellitem"><span class="bt">\u{1F381} Coming up on your gift list</span></div>';
    h += state.gifts.map(function (g) {
      var when = g.days === 0 ? "is today!" : g.days === 1 ? "is tomorrow" : "is in " + g.days + " days";
      return '<div class="tydbellitem"><span class="bt">' + esc(g.name) + '</span>' + esc(g.occasion) + " " + when + '<div class="bwhen">' + g.label + "</div></div>";
    }).join("");
    return h + '<a class="tydbellitem" style="display:block;text-decoration:none;" href="' + giftsUrl() + '"><span class="bt">Open Gift Planner \u203A</span></a>';
  }
  /* Pantry watch (Lucy, Nov 11, 2026): the foods a member stars as
     Usuals are the ones they use all the time, so when one runs out or
     drops under its keep-on-hand number, it shows up here with a one-tap
     way onto the grocery list. Panel only, like gift reminders. */
  function pantryWatch(udata) {
    var items = (udata && Array.isArray(udata.pantry)) ? udata.pantry : [];
    var usuals = (udata && Array.isArray(udata.pantryUsuals)) ? udata.pantryUsuals : [];
    var byIdMap = {};
    items.forEach(function (it) { if (it && it.id) byIdMap[it.id] = it; });
    var out = [];
    usuals.forEach(function (u) {
      if (!u || !u.id) return;
      var it = byIdMap[u.id];
      if (!it) return;
      var have = Math.max(0, parseInt(it.have, 10) || 0);
      var need = Math.max(0, parseInt(it.need, 10) || 0);
      if (have < need) out.push({ id: it.id, name: it.name || u.name || "A usual", pic: it.pic || u.pic || "\u{1F96B}", have: have, need: need, out: have === 0 });
    });
    out.sort(function (a, b) { if (a.out !== b.out) return a.out ? -1 : 1; return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
    return out.slice(0, 5);
  }
  /* Expiry reminders (Lucy, Nov 17, 2026, v344): a food with an
     expiration date shows up here when it is inside its own reminder
     lead time (remindDays: 7, 3, 2, 1 or 0 days before expiry, default
     2), and once it has expired. Panel only, like the rest of Pantry
     Watch: it never adds to the unread badge. No expiry date means no
     reminder, never a guessed one. */
  function pantryExpiry(udata) {
    var items = (udata && Array.isArray(udata.pantry)) ? udata.pantry : [];
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var out = [];
    items.forEach(function (it) {
      if (!it || !it.expires) return;
      var parts = String(it.expires).split("-");
      if (parts.length !== 3) return;
      var d = Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (isNaN(d)) return;
      var days = Math.round((d - t) / 86400000);
      var lead = (typeof it.remindDays === "number") ? it.remindDays : 2;
      if (isNaN(lead)) lead = 2;
      lead = Math.max(0, Math.min(7, lead));
      if (days > lead) return;
      out.push({ id: it.id, name: it.name || "A food", pic: it.pic || "\u{1F96B}", expires: it.expires, days: days });
    });
    out.sort(function (a, b) { return a.days - b.days; });
    return out.slice(0, 5);
  }
  window.TYDPantryExpiry = pantryExpiry;
  function pantryOnList(id) {
    var lists = [];
    try { var lg = JSON.parse(localStorage.getItem("tydGrocery") || "[]"); if (Array.isArray(lg)) lists = lists.concat(lg); } catch (e) {}
    if (Array.isArray(state.grocery)) lists = lists.concat(state.grocery);
    return lists.some(function (g) { return g && g.pantryId === id && !g.done && !g.used; });
  }
  function pantryUrl() { return (inBrands() ? "../" : "") + "pantry.html"; }
  function plannerUrl() { return (inBrands() ? "../" : "") + "planner.html"; }
  /* Codes expiring soon (Lucy, Nov 14, 2026): the deal codes a member
     clipped, with the notify switch on, whose expiry date is within 7
     days. Panel only, like Pantry Watch: it never adds to the unread
     badge, it just nudges before a code runs out. */
  function codesSoon(udata) {
    var codes = (udata && Array.isArray(udata.plannerCodes)) ? udata.plannerCodes : [];
    var now = new Date();
    var t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var out = [];
    codes.forEach(function (c) {
      if (!c || !c.code || !c.expires || c.notify === false) return;
      var parts = String(c.expires).split("-");
      if (parts.length !== 3) return;
      var d = Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (isNaN(d)) return;
      var days = Math.round((d - t) / 86400000);
      if (days < 0 || days > 7) return;
      out.push({ code: c.code, brand: c.brand || "", expires: c.expires, days: days });
    });
    out.sort(function (a, b) { return a.days - b.days; });
    return out.slice(0, 5);
  }
  function codesHtml() {
    if (!bellOn("codes")) return "";
    if (!state.codes || !state.codes.length) return "";
    var h = '<div class="tydbellitem"><span class="bt">🏷️ Codes expiring soon</span></div>';
    h += state.codes.map(function (c) {
      var when = c.days === 0 ? "expires today!" : c.days === 1 ? "expires tomorrow" : "expires in " + c.days + " days";
      return '<div class="tydbellitem"><span class="bt">' + esc(c.code) + (c.brand ? " · " + esc(c.brand) : "") + "</span>" + when
        + '<div class="bwhen">' + esc(c.expires) + '</div></div>';
    }).join("");
    return h + '<a class="tydbellitem" style="display:block;text-decoration:none;" href="' + plannerUrl() + '#month"><span class="bt">Open your Planner ›</span></a>';
  }
  function pantryHtml() {
    if (!bellOn("pantry")) return "";
    var lows = state.pantry || [];
    var exps = state.expiry || [];
    if (!lows.length && !exps.length) return "";
    var h = "";
    if (lows.length) {
      h += '<div class="tydbellitem"><span class="bt">\u{1F96B} Pantry watch \u00B7 your usuals</span></div>';
      h += lows.map(function (w) {
        var status = w.out ? "Used up!" : "Only " + w.have + " left \u00B7 you keep " + w.need;
        var btn = pantryOnList(w.id) ? '<div><button type="button" class="tydbellbtn" disabled>\u2713 On your grocery list</button></div>' : '<div><button type="button" class="tydbellbtn" data-padd="' + esc(w.id) + '">\u{1F6D2} Add to groceries</button></div>';
        return '<div class="tydbellitem"><span class="bt">' + esc(w.pic) + " " + esc(w.name) + "</span>" + status + btn + "</div>";
      }).join("");
    }
    if (exps.length) {
      h += '<div class="tydbellitem"><span class="bt">\u23F3 Expiring soon in your Pantry</span></div>';
      h += exps.map(function (x) {
        var when = x.days < 0 ? ("Expired" + (x.days === -1 ? " yesterday" : " " + (-x.days) + " days ago")) : x.days === 0 ? "Expires today" : x.days === 1 ? "Expires tomorrow" : "Expires in " + x.days + " days";
        return '<div class="tydbellitem"><span class="bt">' + esc(x.pic) + " " + esc(x.name) + "</span>" + when + '<div class="bwhen">' + esc(x.expires) + "</div></div>";
      }).join("");
    }
    return h + '<a class="tydbellitem" style="display:block;text-decoration:none;" href="' + pantryUrl() + '"><span class="bt">Open the Pantry \u203A</span></a>';
  }
  /* Pinned install tip (Lucy, Nov 14, 2026): the App button is off the
     bottom bar, so the "add the Pond as an app" tip lives pinned at the
     top of the bell notifications instead. Tapping it opens the same
     install overlay the App button used to show. The ✕ dismisses it
     (saved per device); the Menu pull-down keeps an Install row so the
     tip stays reachable after dismissal. */
  function pinnedHtml() {
    try { if (localStorage.getItem("tydInstallPinnedDismissed") === "1") return ""; } catch (e) {}
    return '<div class="tydbellitem pinned" data-install-tip><span class="bt">📌 Add the Pond as an app</span>Put the Pond on your home screen, just like an app. Tap here for how.<div class="bwhen">Pinned</div><button type="button" class="pin-x" data-install-dismiss aria-label="Dismiss">✕</button></div>';
  }
  function friendsHtml() {
    if (!bellOn("friends")) return "";
    if (!state.friends || !state.friends.length) return "";
    var h = state.friends.map(function (f) {
      return '<div class="tydbellitem unread"><span class="bt">👥 Friend request</span>@' + esc(f.from) + " wants to be Pond friends"
        + '<div><button type="button" class="tydbellbtn" data-faccept="' + f.id + '">Accept</button>'
        + '<button type="button" class="tydbellbtn alt" data-fdecline="' + f.id + '">Decline</button></div>'
        + (f.ts ? '<div class="bwhen">' + relTime(f.ts) + "</div>" : "") + "</div>";
    }).join("");
    return h + '<a class="tydbellitem" style="display:block;text-decoration:none;" href="' + accountUrl() + '#cat-friends"><span class="bt">Manage friends ›</span></a>';
  }
  function paintBadge() {
    if (!badge) return;
    var n = state.user ? unreadCount() : 0;
    badge.textContent = n > 9 ? "9+" : String(n);
    badge.hidden = !n;
  }
  /* Per-section unread counts (Lucy, Nov 10, 2026): each announcement's
     tag buckets into a site section, and the counts paint onto any
     [data-secbadge] element on the page (the home page category rows)
     and into window.TYD_SEC_COUNTS for the switcher menu rows, which
     site-nav.js renders. Shopping tags land on Deals, food on Food,
     travel on Travel, pets on Pet Corner; general and untagged alerts
     land on Home. */
  var TAG_SECTION = { "food": "food", "travel": "travel", "pets": "pets", "general": "home" };
  function sectionCounts() {
    var counts = {};
    if (!state.user || !state.items) return counts;
    state.items.forEach(function (i) {
      if (!isDealUnread(i) || hasDeleted(i.id)) return;
      var sec = i.tag ? (TAG_SECTION[i.tag] || "deals") : "home";
      counts[sec] = (counts[sec] || 0) + 1;
    });
    return counts;
  }
  function paintSectionBadges() {
    var counts = sectionCounts();
    window.TYD_SEC_COUNTS = counts;
    var els = document.querySelectorAll("[data-secbadge]");
    for (var i = 0; i < els.length; i++) {
      var n = counts[els[i].getAttribute("data-secbadge")] || 0;
      els[i].textContent = n > 9 ? "9+" : String(n);
      els[i].hidden = !n;
    }
  }
  /* Unified notification list (Lucy, Nov 12, 2026): deals, Pond Post
     items, comments and Pond shares are one list so the New view can put
     unread first and the History view can show only what is read, and so
     one search box can filter them all. Friend requests, Pantry Watch
     and gift reminders are utility sections, not notifications: they are
     never filtered by search or by the view toggle. */
  function dealHtml(it) {
    var body = it.message.length > 140 ? it.message.slice(0, 140).trim() + "…" : it.message;
    var h = '<div class="tydbellitem' + (isDealUnread(it) ? " unread" : "") + '" data-readid="' + esc(it.id) + '" data-delid="' + esc(it.id) + '"><span class="bt">' + esc(it.title) + "</span>";
    if (body) h += esc(body);
    if (it.link) h += '<br><a href="' + esc(it.link) + '" target="_blank" rel="noopener">See the deal &#8250;</a>';
    if (it.ts) h += '<div class="bwhen">' + relTime(it.ts) + "</div>";
    return h + "</div>";
  }
  function notifEntries() {
    var out = [];
    var q = state.query;
    function match(text) { return !q || text.indexOf(q) !== -1; }
    if (state.items) state.items.forEach(function (it) {
      if (hasDeleted(it.id)) return;
      var text = ((it.title || "") + " " + (it.message || "") + " " + (it.tag || "")).toLowerCase();
      if (!match(text)) return;
      out.push({ ts: it.ts, unread: isDealUnread(it), html: dealHtml(it), id: it.id });
    });
    if (state.news) state.news.forEach(function (n) {
      if (hasDeleted(n.id)) return;
      var text = ("pond post " + n.label).toLowerCase();
      if (!match(text)) return;
      out.push({ ts: n.ts, unread: isNewsUnread(n), html: newsItemHtml(n), id: n.id });
    });
    if (state.updates) state.updates.forEach(function (u) {
      if (hasDeleted(u.id)) return;
      var text = ("update " + u.kind + " " + u.title + " " + u.message).toLowerCase();
      if (!match(text)) return;
      out.push({ ts: u.ts, unread: isUpdatesUnread(u), html: updatesItemHtml(u), id: u.id });
    });
    if (state.comments && bellOn("comments")) {
      var cs = filteredComments().slice();
      if (state.view === "history") cs = cs.filter(function (c) { return c.ts <= state.commentSeen; });
      else { var fr = cs.filter(function (c) { return c.ts > state.commentSeen; }); cs = fr.length ? fr : cs; }
      cs.slice(0, 5).forEach(function (c) {
        if (hasDeleted(c.id)) return;
        var text = ("@" + c.from + " commented " + c.text).toLowerCase();
        if (!match(text)) return;
        out.push({ ts: c.ts, unread: c.ts > state.commentSeen, html: commentItemHtml(c), id: c.id });
      });
    }
    if (state.pond && bellOn("pond")) filteredPond().forEach(function (s) {
      if (hasDeleted(s.id)) return;
      var text = ("@" + s.from + " shared " + s.title).toLowerCase();
      if (!match(text)) return;
      out.push({ ts: s.ts, unread: false, html: pondItemHtml(s), id: s.id });
    });
    if (state.shack) state.shack.forEach(function (s) {
      if (!shackVisible(s) || hasDeleted(s.id)) return;
      var text = ("quack shack @" + s.from + " " + s.text + " #" + (SHACK_LABELS[s.channel] || s.channel)).toLowerCase();
      if (!match(text)) return;
      out.push({ ts: s.ts, unread: isShackUnread(s), html: shackItemHtml(s), id: s.id });
    });
    return out;
  }
  function visibleNotifs() {
    var all = notifEntries();
    if (state.view === "history") return all.filter(function (e) { return !e.unread; });
    all.sort(function (a, b) { if (a.unread !== b.unread) return a.unread ? -1 : 1; return b.ts - a.ts; });
    return all;
  }
  /* One notification row (v340): a swipeable row with a red Delete
     zone behind it and a small ✕ delete button for mouse users. The
     row carries the notification's stable ID; the item inside keeps
     its own markup (link or div) and its data-readid behavior. */
  function notifRowHtml(e) {
    return '<div class="tydbellrow" data-delid="' + esc(e.id) + '"><div class="tydbellswipe" aria-hidden="true">Delete</div>' + e.html + '<button type="button" class="tydbelldel" data-del="' + esc(e.id) + '" aria-label="Delete notification">✕</button></div>';
  }
  function syncTools() {
    var tools = document.getElementById("tydbelltools");
    if (tools) tools.hidden = !state.user;
    var tn = document.getElementById("tydbelltabnew"), th = document.getElementById("tydbelltabhist");
    if (tn) tn.classList.toggle("on", state.view === "new");
    if (th) th.classList.toggle("on", state.view === "history");
    var se = document.getElementById("tydbellsearch");
    if (se && se.value !== state.query && document.activeElement !== se) se.value = state.query;
  }
  function render() {
    paintBadge();
    paintSectionBadges();
    if (!listEl) return;
    if (markBtn) markBtn.style.display = state.user ? "" : "none";
    if (delAllBtn) delAllBtn.style.display = (state.user && deletableCount() > 0) ? "" : "none";
    syncTools();
    if (!state.user) {
      listEl.innerHTML = pinnedHtml() + '<p class="tydbellmsg">🔔 <a href="' + accountUrl() + '">Sign in</a> to see your alerts. Deal alerts you pick in your Pond Account will land right here.</p>';
      return;
    }
    if (!state.items) {
      var ln = visibleNotifs();
      listEl.innerHTML = pinnedHtml() + friendsHtml() + (ln.length ? ln.map(notifRowHtml).join("") : "") + '<p class="tydbellmsg">Loading your alerts…</p>' + pantryHtml() + codesHtml() + giftsHtml();
      return;
    }
    var notifs = visibleNotifs();
    var h = pinnedHtml() + friendsHtml();
    if (notifs.length) {
      h += notifs.map(notifRowHtml).join("");
      if (state.comments && bellOn("comments") && filteredComments().length && !state.query) h += '<a class="tydbellitem" style="display:block;text-decoration:none;" href="' + accountUrl() + '#cat-comments"><span class="bt">See all comments \u203A</span></a>';
    } else if (state.query) {
      h += '<p class="tydbellmsg">No notifications match that search.</p>';
    } else if (state.view === "history") {
      h += '<p class="tydbellmsg">Nothing here yet. Notifications you have read will show up here.</p>';
    }
    h += pantryHtml() + codesHtml() + giftsHtml();
    if (!state.items.length && !state.query && state.view === "new") {
      h += '<p class="tydbellmsg">No deal alerts for you right now. When a deal lands in the kinds you picked, it will show up here. 🦆</p>';
    }
    listEl.innerHTML = h;
  }

  bell.addEventListener("click", function (e) {
    e.stopPropagation();
    var menu = document.getElementById("tydswitchmenu");
    if (menu) menu.hidden = true;
    panel.hidden = !panel.hidden;
    if (panel.hidden) {
      state.view = "new"; state.query = "";
      var se = document.getElementById("tydbellsearch"); if (se) se.value = "";
    } else render();
  });
  panel.addEventListener("click", function (e) { e.stopPropagation(); });
  /* Pinned install tip (Lucy, Nov 14, 2026): tapping the pinned tip
     opens the install overlay; the ✕ dismisses it for this device. */
  panel.addEventListener("click", function (e) {
    var x = e.target && e.target.closest ? e.target.closest("[data-install-dismiss]") : null;
    if (x) {
      e.stopPropagation();
      try { localStorage.setItem("tydInstallPinnedDismissed", "1"); } catch (e2) {}
      render();
      return;
    }
    var tip = e.target && e.target.closest ? e.target.closest("[data-install-tip]") : null;
    if (tip && window.TYDShowInstall) window.TYDShowInstall();
  });
  panel.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-faccept],[data-fdecline]") : null;
    if (!b || !state.fs || !state.db || !state.uid) return;
    var id = b.getAttribute("data-faccept") || b.getAttribute("data-fdecline");
    var status = b.hasAttribute("data-faccept") ? "accepted" : "declined";
    b.disabled = true;
    state.fs.updateDoc(state.fs.doc(state.db, "friendRequests", id), { status: status }).then(function () {
      state.friends = (state.friends || []).filter(function (f) { return f.id !== id; });
      render();
    }).catch(function () { b.disabled = false; });
  });
  panel.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-padd]") : null;
    if (!b || !state.pantry) return;
    var w = state.pantry.filter(function (x) { return x.id === b.getAttribute("data-padd"); })[0];
    if (!w) return;
    var qty = Math.max(1, w.need - w.have);
    var row = { id: "pantry|" + w.id, text: w.pic + " " + w.name + " \u00D7 " + qty, recipe: "\u{1F96B} From the Pantry", done: false, used: false, got: false, pantryId: w.id, qty: qty };
    var g = [];
    try { var lg2 = JSON.parse(localStorage.getItem("tydGrocery") || "[]"); if (Array.isArray(lg2)) g = lg2; } catch (e2) {}
    var found = false;
    g.forEach(function (r) { if (r && r.id === row.id) { r.text = row.text; r.qty = qty; r.done = false; r.used = false; r.got = false; found = true; } });
    if (!found) g.push(row);
    try { localStorage.setItem("tydGrocery", JSON.stringify(g)); } catch (e3) {}
    if (state.uid && state.fs && state.db) {
      var cloud = Array.isArray(state.grocery) ? state.grocery.slice() : [];
      var cfound = false;
      cloud.forEach(function (r) { if (r && r.id === row.id) { r.text = row.text; r.qty = qty; r.done = false; r.used = false; r.got = false; cfound = true; } });
      if (!cfound) cloud.push(row);
      state.grocery = cloud;
      state.fs.updateDoc(state.fs.doc(state.db, "users", state.uid), { groceryList: cloud }).catch(function () {});
    }
    b.disabled = true;
    b.textContent = "\u2713 On your grocery list";
  });
  /* Click to read (Lucy, Nov 12, 2026): tapping a deal alert or a Pond
     Post item marks just that one read. The link still works: the read
     is saved and the badge drops at once, and the list re-renders on a
     beat so a same-tab navigation is never cut off by the re-render. */
  panel.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-readid]") : null;
    if (!t || !state.uid) return;
    /* A swipe that just deleted a row must not also count as a tap:
       the browser can still fire the row's click after the drag. */
    if (Date.now() < swipeBlockUntil) return;
    if (!markRead(t.getAttribute("data-readid"))) return;
    paintBadge();
    paintSectionBadges();
    setTimeout(render, 0);
  });
  /* Bin lid flip delete (v341, Lucy: the "Swipe to Delete Part 3"
     reel, design 1): the row slides left rigidly off the panel (no
     fade, no squash) while a red bar grows in from the right behind
     it; once the row is off, the white bin's lid flips open on its
     rear hinge; then the bar collapses vertically and the row folds
     up, and only then is the notification deleted and the undo toast
     shown. The ✕ button runs the same sequence. Reduced motion skips
     the flip entirely and deletes at once, as before. */
  var BINFLIP_SLIDE_MS = 170, BINFLIP_LID_MS = 210, BINFLIP_FOLD_MS = 200;
  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function binFlipSvg() {
    return '<svg class="tydbellbin" viewBox="0 0 48 48" aria-hidden="true"><g class="tydbellbinlid"><circle cx="24" cy="8.5" r="2.4"/><rect x="11" y="11" width="26" height="4.6" rx="2.2"/></g><path class="tydbellbinbody" d="M13.5 18.5h21l-2.3 21.2a2.4 2.4 0 0 1-2.4 2.1H18.2a2.4 2.4 0 0 1-2.4-2.1z"/><g stroke="#d23b3b" stroke-width="1.7" stroke-linecap="round"><line x1="20.5" y1="23" x2="19.8" y2="37"/><line x1="24" y1="23" x2="24" y2="37.5"/><line x1="27.5" y1="23" x2="28.2" y2="37"/></g></svg>';
  }
  function startBinFlip(row, id, item) {
    if (!id || hasDeleted(id)) return false;
    if (!row || reducedMotion()) {
      if (deleteOne(id)) { showUndoToast([id], "Notification deleted"); render(); }
      return true;
    }
    if (row.getAttribute("data-binflipping") === "1") return false;
    row.setAttribute("data-binflipping", "1");
    swipeBlockUntil = Date.now() + 900;
    var bar = document.createElement("div");
    bar.className = "tydbellbinflip";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = binFlipSvg();
    row.appendChild(bar);
    row.classList.add("binflip-active");
    if (item) {
      item.style.transition = "transform .16s ease";
      item.style.transform = "translateX(-100%)";
      item.style.opacity = "";
    }
    setTimeout(function () { bar.classList.add("binflip-grow"); }, 10);
    setTimeout(function () { bar.classList.add("lid-open"); }, BINFLIP_SLIDE_MS);
    setTimeout(function () {
      bar.classList.add("binflip-collapse");
      row.classList.add("binflip-collapsing");
      var h = 0;
      try { h = row.scrollHeight || row.offsetHeight || 0; } catch (e) {}
      if (!h) h = 60;
      row.style.maxHeight = h + "px";
      try { void row.offsetHeight; } catch (e) {}
      row.style.maxHeight = "0px";
    }, BINFLIP_SLIDE_MS + BINFLIP_LID_MS);
    setTimeout(function () {
      if (deleteOne(id)) { showUndoToast([id], "Notification deleted"); render(); }
    }, BINFLIP_SLIDE_MS + BINFLIP_LID_MS + BINFLIP_FOLD_MS);
    return true;
  }
  /* Per-row delete (v340): the ✕ on a row, or a tap on the red Delete
     zone a swipe reveals, deletes just that notification. The button
     sits in the row wrapper, outside the item itself, so deleting never
     also marks the item read or follows its link. (v341: both run the
     bin lid flip first; the delete lands when the flip finishes.) */
  panel.addEventListener("click", function (e) {
    var d = e.target && e.target.closest ? e.target.closest("[data-del]") : null;
    if (d) {
      e.stopPropagation();
      var delId = d.getAttribute("data-del");
      var delRow = d.closest ? d.closest(".tydbellrow") : null;
      startBinFlip(delRow, delId, delRow ? delRow.querySelector(".tydbellitem") : null);
      return;
    }
    var sw = e.target && e.target.closest ? e.target.closest(".tydbellswipe") : null;
    if (sw) {
      var row = sw.parentNode;
      if (row && row.getAttribute) {
        var swId = row.getAttribute("data-delid");
        startBinFlip(row, swId, row.querySelector ? row.querySelector(".tydbellitem") : null);
      }
    }
  });
  /* Undo button on the delete toast (v341). */
  panel.addEventListener("click", function (e) {
    var u = e.target && e.target.closest ? e.target.closest("#tydbellundo-btn") : null;
    if (u) { e.stopPropagation(); undoDelete(); }
  });
  /* Swipe left to delete (v340): drag a row left and it follows the
     finger; past the threshold it flies off and the notification is
     deleted. A short drag snaps back. Vertical scrolling is untouched:
     the swipe only starts when the drag is clearly horizontal. */
  var swipe = null;
  var swipeBlockUntil = 0;
  function swipeTouch(e) {
    var t = e.touches && e.touches[0];
    if (t) return t;
    var c = e.changedTouches && e.changedTouches[0];
    return c || null;
  }
  listEl.addEventListener("touchstart", function (e) {
    var row = e.target && e.target.closest ? e.target.closest(".tydbellrow") : null;
    if (!row) return;
    var t = swipeTouch(e);
    if (!t) return;
    var item = row.querySelector(".tydbellitem");
    swipe = { row: row, item: item, x0: t.clientX, y0: t.clientY, dx: 0, on: false };
    if (item) item.style.transition = "none";
  }, { passive: true });
  listEl.addEventListener("touchmove", function (e) {
    if (!swipe) return;
    var t = swipeTouch(e);
    if (!t) return;
    var dx = t.clientX - swipe.x0, dy = t.clientY - swipe.y0;
    if (!swipe.on) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipe.on = true;
      else return;
    }
    if (e.cancelable) e.preventDefault();
    swipe.dx = Math.max(-140, Math.min(0, dx));
    if (swipe.item) swipe.item.style.transform = "translateX(" + swipe.dx + "px)";
  }, { passive: false });
  function swipeSnapBack(s) {
    if (!s.item) return;
    s.item.style.transition = "transform .18s ease";
    s.item.style.transform = "";
    setTimeout(function () { if (s.item) s.item.style.transition = ""; }, 200);
  }
  function swipeEnd() {
    if (!swipe) return;
    var s = swipe; swipe = null;
    if (!s.on || !s.item) { if (s.item) { s.item.style.transition = ""; s.item.style.transform = ""; } return; }
    var delid = s.row.getAttribute("data-delid");
    if (s.dx <= -70 && delid) {
      swipeBlockUntil = Date.now() + 350;
      startBinFlip(s.row, delid, s.item);
    } else swipeSnapBack(s);
  }
  listEl.addEventListener("touchend", swipeEnd);
  listEl.addEventListener("touchcancel", function () {
    if (!swipe) return;
    var s = swipe; swipe = null;
    if (s.item) { s.item.style.transition = ""; s.item.style.transform = ""; }
  });
  /* Delete all (v340): wipes every notification in the bell, behind
     the same in-page confirm sheet the Quack Shack uses for deletes
     (v316) — the native confirm() is auto-dismissed by automated
     browsers, so Delete never ran there. Friend requests, gift
     reminders, Pantry watch and codes are utility sections, not
     notifications, and are never touched. */
  var delConfEl = null;
  function delConf() {
    if (delConfEl) return delConfEl;
    var box = document.createElement("div");
    box.className = "tyddelconf";
    box.id = "tydbelldelconf";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = '<div class="tyddelconf-card"><h3>Delete all notifications?</h3><p class="tyddelconf-sub"></p><div class="tyddelconf-btns"><button type="button" class="tydbellbtn alt" id="tydbelldelconf-cancel">Cancel</button><button type="button" class="tydbellbtn" id="tydbelldelconf-yes">Delete all</button></div></div>';
    document.body.appendChild(box);
    delConfEl = box;
    var yes = document.getElementById("tydbelldelconf-yes");
    if (yes) yes.addEventListener("click", function () {
      closeDeleteAllConfirm();
      var ids = allNotifIds().filter(function (id) { return !hasDeleted(id); });
      var n = deleteAllNotifs();
      if (n) { showUndoToast(ids, n === 1 ? "Notification deleted" : n + " notifications deleted"); render(); }
    });
    var cancel = document.getElementById("tydbelldelconf-cancel");
    if (cancel) cancel.addEventListener("click", closeDeleteAllConfirm);
    box.addEventListener("click", function (e) { if (e.target === box) closeDeleteAllConfirm(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && delConfEl && !delConfEl.hidden) closeDeleteAllConfirm();
    });
    return box;
  }
  function openDeleteAllConfirm() {
    var n = deletableCount();
    if (!n) return;
    var box = delConf();
    var sub = box.querySelector(".tyddelconf-sub");
    if (sub) sub.textContent = "This clears all " + n + (n === 1 ? " notification" : " notifications") + " in your bell. Deleted notifications stay gone. Your friend requests, gift reminders, Pantry watch and codes stay put.";
    box.hidden = false;
    var yes = document.getElementById("tydbelldelconf-yes");
    if (yes) yes.focus();
  }
  function closeDeleteAllConfirm() {
    if (delConfEl) delConfEl.hidden = true;
  }
  if (delAllBtn) delAllBtn.addEventListener("click", function () { openDeleteAllConfirm(); });
  /* Search and the New/History toggle live in the panel shell (built by
     site-nav.js, outside the list render() replaces), so typing never
     loses focus or the query when the list re-renders. */
  var searchEl = document.getElementById("tydbellsearch");
  if (searchEl) searchEl.addEventListener("input", function () {
    state.query = (searchEl.value || "").trim().toLowerCase();
    render();
  });
  var tabNew = document.getElementById("tydbelltabnew");
  if (tabNew) tabNew.addEventListener("click", function () { state.view = "new"; render(); });
  var tabHist = document.getElementById("tydbelltabhist");
  if (tabHist) tabHist.addEventListener("click", function () { state.view = "history"; render(); });
  /* Friends-only mode (Lucy, Nov 12, 2026): re-render the bell when the
     mode toggles or the friends list loads, so hidden items drop off
     (and come back when the mode turns off). */
  window.addEventListener("tyd-friends-only-changed", function () { render(); });
  window.addEventListener("tyd-friends-changed", function () { render(); });
  document.addEventListener("click", function (e) {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== bell) {
      panel.hidden = true;
      state.view = "new"; state.query = "";
      var se2 = document.getElementById("tydbellsearch"); if (se2) se2.value = "";
    }
  });
  if (markBtn) markBtn.addEventListener("click", function () {
    state.seen = Date.now();
    state.commentSeen = state.seen;
    state.newsSeen = state.seen;
    state.updatesSeen = state.seen;
    // Quack Shack (v306): Mark all read advances every room's
    // last-seen to now, so the channel badges clear too.
    Object.keys(SHACK_LABELS).forEach(function (ch) { state.shackSeen[ch] = state.seen; });
    try { localStorage.setItem("tydBellSeen", String(state.seen)); } catch (e) {}
    try { localStorage.setItem("tydBellCommentSeen", String(state.commentSeen)); } catch (e) {}
    try { localStorage.setItem("tydNewsSeen", String(state.newsSeen)); } catch (e) {}
    try { localStorage.setItem("tydUpdatesSeen", String(state.updatesSeen)); } catch (e) {}
    try { localStorage.setItem("tydShackLastSeen", JSON.stringify(state.shackSeen)); } catch (e) {}
    if (state.uid && state.fs && state.db) {
      state.fs.setDoc(state.fs.doc(state.db, "users", state.uid), { bellSeenAt: state.seen, commentSeenAt: state.commentSeen, newsSeenAt: state.newsSeen, updatesSeenAt: state.updatesSeen, shackLastSeen: state.shackSeen }, { merge: true }).catch(function () {});
    }
    render();
  });

  ensureUndoToast();
  render();

  /* Test/debug hook (v340): lets jsdom tests drive the bell without
     Firebase — state, render, and the delete helpers. Harmless in the
     browser: it only exposes what the panel already shows. */
  window.TYDBell = { state: state, render: render, deleteOne: deleteOne, deleteAll: deleteAllNotifs, isDeleted: hasDeleted, allNotifIds: allNotifIds, deletableCount: deletableCount, undoDelete: undoDelete, undo: undoDelete, pendingUndoIds: function () { return pendingUndoIds.slice(); }, showUndoToast: showUndoToast, hideUndoToast: hideUndoToast, startBinFlip: startBinFlip, reducedMotion: reducedMotion };

  (async function init() {
    try {
      var appMod = await import("./pond-firebase-stub.js");
      var authMod = await import("./pond-firebase-stub.js");
      var fsMod = await import("./pond-firebase-stub.js");
      var config = {
        apiKey: "preview-disabled",
        authDomain: "pond-preview-disabled.firebaseapp.com",
        projectId: "pond-preview-disabled",
        storageBucket: "pond-preview-disabled.firebasestorage.app",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:previewdisabled"
      };
      var app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(config);
      var db = fsMod.getFirestore(app);
      state.fs = fsMod; state.db = db;
      authMod.onAuthStateChanged(authMod.getAuth(app), async function (user) {
        if (!user) { state.user = null; state.uid = null; state.items = null; state.friends = null; state.comments = null; state.pantry = null; state.expiry = null; state.codes = null; state.grocery = null; state.news = null; state.newsNotify = null; state.updates = null; state.readIds = []; state.deletedIds = []; state.query = ""; state.view = "new"; state.bellPrefs = null; state.shack = null; state.shackSeen = {}; state.shackNotifs = null; state.mentionNotifs = true; state.shackFollowing = null; render(); return; }
        state.user = user; state.uid = user.uid;
        try {
          var usnap = await fsMod.getDoc(fsMod.doc(db, "users", user.uid));
          var udata = usnap.exists() ? usnap.data() : {};
          var prefs = Array.isArray(udata.alertPrefs) ? udata.alertPrefs : null;
          if (!prefs) {
            try { prefs = JSON.parse(localStorage.getItem("tydAlertPrefs") || "[]"); } catch (e) { prefs = []; }
            if (!Array.isArray(prefs)) prefs = [];
          }
          // Quack Shack prefs (v306): per-channel notification on/off
          // (mute), @mention notifications, hidden channels, last-seen
          // per channel, and the following list. Account first, local
          // mirror as the fallback, same as the bell's other prefs.
          var sn = (udata.shackNotifs && typeof udata.shackNotifs === "object") ? udata.shackNotifs : null;
          if (!sn) { try { sn = JSON.parse(localStorage.getItem("tydShackNotifs") || "null"); } catch (e) { sn = null; } if (!sn || typeof sn !== "object") sn = null; }
          state.shackNotifs = sn;
          var mn = (typeof udata.mentionNotifs === "boolean") ? udata.mentionNotifs : null;
          if (mn === null) { try { mn = localStorage.getItem("tydMentionNotifs") !== "0"; } catch (e) { mn = true; } }
          state.mentionNotifs = !!mn;
          var sl = (udata.shackLastSeen && typeof udata.shackLastSeen === "object") ? udata.shackLastSeen : null;
          if (!sl) { try { sl = JSON.parse(localStorage.getItem("tydShackLastSeen") || "null"); } catch (e) { sl = null; } if (!sl || typeof sl !== "object") sl = {}; }
          state.shackSeen = sl;
          state.shackFollowing = Array.isArray(udata.following) ? udata.following : null;
          if (udata.bellSeenAt) state.seen = Math.max(state.seen, Number(udata.bellSeenAt) || 0);
          if (udata.commentSeenAt) state.commentSeen = Math.max(state.commentSeen, Number(udata.commentSeenAt) || 0);
          if (udata.newsSeenAt) state.newsSeen = Math.max(state.newsSeen, Number(udata.newsSeenAt) || 0);
          if (udata.updatesSeenAt) state.updatesSeen = Math.max(state.updatesSeen, Number(udata.updatesSeenAt) || 0);
          if (Array.isArray(udata.bellReadIds)) {
            state.readIds = udata.bellReadIds.filter(function (x) { return typeof x === "string"; }).slice(-200);
          } else if (state.readIds.length) {
            fsMod.setDoc(fsMod.doc(db, "users", user.uid), { bellReadIds: state.readIds }, { merge: true }).catch(function () {});
          }
          if (Array.isArray(udata.bellDeletedIds)) {
            state.deletedIds = udata.bellDeletedIds.filter(function (x) { return typeof x === "string"; }).slice(-500);
          } else if (state.deletedIds.length) {
            fsMod.setDoc(fsMod.doc(db, "users", user.uid), { bellDeletedIds: state.deletedIds }, { merge: true }).catch(function () {});
          }
          var nn = (udata.newsNotify && typeof udata.newsNotify === "object") ? udata.newsNotify : null;
          if (!nn) {
            try { nn = JSON.parse(localStorage.getItem("tydNewsNotify") || "null"); } catch (e) { nn = null; }
            if (!nn || typeof nn !== "object") nn = {};
          }
          state.newsNotify = nn;
          var bp = (udata.bellPrefs && typeof udata.bellPrefs === "object") ? udata.bellPrefs : null;
          if (!bp) {
            try { bp = JSON.parse(localStorage.getItem("tydBellPrefs") || "null"); } catch (e) { bp = null; }
            if (!bp || typeof bp !== "object") bp = null;
          }
          state.bellPrefs = bp;
          loadNewsMeta();
          loadUpdates();
          state.gifts = giftSoon(udata);
          state.pantry = pantryWatch(udata);
          state.expiry = pantryExpiry(udata);
          state.codes = codesSoon(udata);
          state.grocery = Array.isArray(udata.groceryList) ? udata.groceryList : null;
          if (udata.textSize) {
            try { localStorage.setItem("tydTextSize", udata.textSize); } catch (e) {}
            document.documentElement.classList.toggle("tyd-lg", udata.textSize === "large");
          }
          var q = fsMod.query(fsMod.collection(db, "announcements"), fsMod.orderBy("createdAt", "desc"), fsMod.limit(50));
          var snap = await fsMod.getDocs(q);
          var items = [];
          snap.forEach(function (d) {
            var v = d.data() || {};
            if (prefs.length && v.tag && v.tag !== "general" && prefs.indexOf(v.tag) === -1) return;
            var ts = 0;
            try { if (v.createdAt && v.createdAt.toDate) ts = v.createdAt.toDate().getTime(); } catch (e) {}
            items.push({ id: d.id, title: v.title || "Deal alert", message: v.message || "", link: v.link || "", tag: v.tag || "", ts: ts });
          });
          state.items = items;
        } catch (e) {
          if (!state.items) state.items = [];
        }
        try {
          var cq = fsMod.query(fsMod.collection(db, "nestComments"), fsMod.where("shareOwner", "==", user.uid));
          var csnap = await fsMod.getDocs(cq);
          var cm = [];
          csnap.forEach(function (d) {
            var v = d.data() || {};
            if (v.author === user.uid) return;
            var cts = 0;
            if (typeof v.createdAt === "number") cts = v.createdAt;
            else try { if (v.createdAt && v.createdAt.toDate) cts = v.createdAt.toDate().getTime(); } catch (e) {}
            cm.push({ id: "comment-" + d.id, uid: v.author || "", from: v.authorName || "someone", text: v.text || "", ts: cts });
          });
          cm.sort(function (a, b) { return b.ts - a.ts; });
          state.comments = cm.slice(0, 30);
        } catch (e) { if (!state.comments) state.comments = []; }
        try {
          var sq = fsMod.query(fsMod.collection(db, "nestShares"), fsMod.where("visibility", "==", "pond"));
          var ssnap = await fsMod.getDocs(sq);
          var sh = [];
          ssnap.forEach(function (d) {
            var v = d.data() || {};
            if (v.owner === user.uid) return;
            var sts = 0;
            if (typeof v.createdAt === "number") sts = v.createdAt;
            else try { if (v.createdAt && v.createdAt.toDate) sts = v.createdAt.toDate().getTime(); } catch (e) {}
            sh.push({ id: "pond-" + d.id, uid: v.owner || "", from: v.ownerName || "someone", kind: v.kind || "", title: v.title || "something", ts: sts });
          });
          sh.sort(function (a, b2) { return b2.ts - a.ts; });
          state.pond = sh.slice(0, 6);
        } catch (e) { if (!state.pond) state.pond = []; }
        try {
          var fq = fsMod.query(fsMod.collection(db, "friendRequests"), fsMod.where("toUid", "==", user.uid));
          var fsnap = await fsMod.getDocs(fq);
          var fr = [];
          fsnap.forEach(function (d) { var v = d.data() || {}; if (v.status === "pending") fr.push({ id: d.id, from: v.fromUsername || "someone", ts: v.createdAt || 0 }); });
          fr.sort(function (a, b) { return b.ts - a.ts; });
          state.friends = fr;
        } catch (e) { if (!state.friends) state.friends = []; }
        loadShack();
        render();
      });
    } catch (e) {}
  })();
})();
