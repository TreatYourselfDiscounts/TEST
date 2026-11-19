// Live / updated news for the Pond Post (Lucy, Nov 15, 2026).
// - Fetches /api/live-news (server-side Benzinga for Stocks, Google News
//   for the rest) and renders the "Updated news" section.
// - Refresh button re-fetches on demand. Stocks auto-refreshes every
//   2 minutes so it can help with trading as news happens.
// - v350: the Stocks page also carries per-ticker news
//   (/api/live-news?cat=stocks-tickers, Yahoo Finance per-ticker RSS,
//   one combined call), rendered in a #tickerbox right after the daily
//   Stocks section. The general Benzinga live feed is untouched.
// - Korea language toggle: English / Korean. Switches the live feed
//   language and swaps the daily Korea stories to their Korean text
//   where a translation is on file.
(function () {
  var LANG_KEY = "tydNewsLang";
  var KO = {
    // Nov 14 edition
    "korea-china": {
      en: { title: "South Korea should not fear China's rise, foreign minister says", text: "Foreign Minister Cho Hyun said South Korea should neither fear China's rise nor underestimate its capabilities, after talks and dinner with Chinese Foreign Minister Wang Yi in Beijing on Friday. The two discussed ties, the Korean Peninsula and economic cooperation ahead of next week's APEC summit." },
      ko: { title: "조현 외교부 장관, “중국의 부상을 두려워할 필요 없다”", text: "조현 외교부 장관은 금요일 베이징에서 왕이 중국 외교부 장관과 회담 및 만찬을 가진 뒤, 한국은 중국의 부상을 두려워하지도, 그 역량을 과소평가하지도 말아야 한다고 말했다. 양측은 다음 주 APEC 정상회의를 앞두고 양국 관계, 한반도, 경제 협력에 대해 논의했다." }
    },
    "apec-lee-xi": {
      en: { title: "Lee to attend APEC in Shenzhen, meet Xi", text: "President Lee Jae Myung will attend the APEC leaders' summit in Shenzhen on November 18-19 and is expected to meet Chinese President Xi Jinping, including a dinner hosted by Xi. Several world leaders are set to attend, with the Trump-Xi-Putin meeting also planned on the sidelines." },
      ko: { title: "이재명 대통령, 선전 APEC 참석…시진핑과 만날 예정", text: "이재명 대통령은 11월 18~19일 선전에서 열리는 APEC 정상회의에 참석하며, 시진핑 중국 국가주석과 만날 예정이다. 시 주석이 주최하는 만찬도 예정돼 있다. 트럼프-시진핑-푸틴 회동도 회의 기간 중 추진되고 있다." }
    },
    // Nov 15 edition
    "lee-reform": {
      en: { title: "President Lee warns against blocking reform", text: "President Lee Jae-myung said on Sunday that he understands people who lose out from reforms pushing back, but it is hard to tolerate public officials who speak of reform yet obstruct it. The message, his second in two days, signals a push for structural reform across government in his second year in office." },
      ko: { title: "이재명 대통령, 개혁 가로막는 행위 경고", text: "이재명 대통령은 일요일 개혁으로 손해를 보는 사람들이 반발하는 것은 이해하지만, 개혁을 말하면서 이를 가로막는 공직자는 참기 어렵다고 말했다. 이틀 만에 두 번째 나온 이 메시지는 집권 2년 차에 정부 전반의 구조 개혁을 추진하겠다는 신호다." }
    },
    "exam-cheating": {
      en: { title: "Top exam scorer admits cheating with AI", text: "South Korea's top scorer in the national tax accountant exam admitted he used a hidden microcamera, a smartphone and generative AI to get answers. The government says it is preparing measures to prevent similar cheating at Thursday's national college entrance exam." },
      ko: { title: "세무사 시험 수석, AI 부정행위 인정", text: "국가 세무사 시험 수석 합격자가 숨겨진 초소형 카메라와 스마트폰, 생성형 AI를 이용해 답을 얻었다고 인정했다. 정부는 목요일 대학수학능력시험에서 비슷한 부정행위를 막기 위한 대책을 마련 중이라고 밝혔다." }
    },
    // Nov 17 edition (v351: Lucy, Nov 17, 2026 - the translate button
    // must cover the whole Korea section, so these three ship with it)
    "suneung-crackdown": {
      en: { title: "Korea locks down its big college exam against AI cheating", text: "South Korea will deploy thousands of extra staff to prevent cheating at Thursday's national college entrance exam, the Suneung, after the top scorer on a tax accountant exam admitted using a hidden camera and AI. Proctors will inspect students' glasses, seal shirt buttons with stickers, and block Wi-Fi at test sites, and cheaters could face a 10-year ban from retaking the exam." },
      ko: { title: "한국, AI 부정행위 막기 위해 수능 대대적으로 단속", text: "한국은 세무사 시험 수석 합격자가 숨겨진 카메라와 AI를 이용해 부정행위를 했다고 인정한 뒤, 목요일 대학수학능력시험에서 부정행위를 막기 위해 수천 명의 추가 인력을 투입할 예정이다. 감독관들은 학생들의 안경을 검사하고, 셔츠 단추에 스티커를 붙여 봉인하며, 시험장 내 와이파이를 차단할 예정이고, 부정행위를 한 학생은 10년 동안 시험 재응시가 금지될 수 있다." }
    },
    "kospi-below-5000": {
      en: { title: "KOSPI closes below 5,000 for the first time since February", text: "South Korea's KOSPI fell 2.59 percent on Tuesday to close at 4,968.48, its first close below 5,000 since February, as the global chip selloff deepened. Foreign investors sold about 1.4 to 1.5 trillion won of shares, with large chip stocks dragging the index lower." },
      ko: { title: "코스피, 2월 이후 처음 5,000 아래로 마감", text: "한국 코스피는 화요일 2.59% 하락해 4,968.48로 마감하며, 2월 이후 처음으로 5,000 아래에서 마감했다. 글로벌 반도체주 매도가 심화되는 가운데 외국인 투자자들은 약 1조 4천억에서 1조 5천억 원어치의 주식을 매도했고, 대형 반도체주가 지수를 끌어내렸다." }
    },
    "suneung-flights": {
      en: { title: "Korea grounds flights for 35 minutes on exam day", text: "South Korea will suspend all aircraft takeoffs and landings for 35 minutes on Thursday to keep the skies quiet during the English listening section of the Suneung exam. The Korea Exchange will also open an hour late, at 10 a.m., so students can reach their test sites more easily." },
      ko: { title: "한국, 수능 당일 35분간 항공기 운항 중단", text: "한국은 목요일 수능 영어 듣기 평가 시간 동안 하늘을 조용하게 유지하기 위해 모든 항공기의 이착륙을 35분간 중단할 예정이다. 한국거래소도 학생들이 시험장에 더 쉽게 도착할 수 있도록 한 시간 늦은 오전 10시에 개장한다." }
    },
    // Nov 13 baked-in fallback
    "googlemaps": {
      en: { title: "Google removes Korean coordinates from Maps", text: "South Korea’s government said Friday that Google has removed latitude and longitude coordinates for South Korean territory from Google Maps and Google Earth, one of the security conditions attached to a permit granted in February to export high-precision map data." },
      ko: { title: "구글, 지도에서 한국 좌표 삭제", text: "한국 정부는 금요일 구글이 고정밀 지도 데이터 수출 허가에 붙은 보안 조건 중 하나로, 구글 지도와 구글 어스에서 한국 영토의 위도와 경도 좌표를 삭제했다고 밝혔다." }
    },
    "koreaeconomy": {
      en: { title: "South Korea’s economy upgraded to solid growth, exports near $1 trillion", text: "The government raised its economic assessment to a “solid growth trajectory” in its November Green Book. October exports hit $115.28 billion, up 93.7% from a year earlier, and total exports are expected to pass $1 trillion for the first time ever." },
      ko: { title: "한국 경제, 견조한 성장으로 상향…수출 1조 달러 눈앞", text: "정부는 11월 그린북에서 경제 평가를 ‘견조한 성장 궤도’로 상향했다. 10월 수출은 1,152억 8천만 달러로 전년보다 93.7% 증가했으며, 연간 수출은 사상 처음으로 1조 달러를 넘어설 전망이다." }
    }
  };

  // v350: the 14 tickers the Stocks page carries per-ticker news for
  // (Lucy, Nov 17, 2026), in display order. Same order as the server's
  // TICKERS array in functions/api/live-news.js.
  var TICKERS = [
    { sym: "SPX", name: "S&P 500" },
    { sym: "GOOGL", name: "Google" },
    { sym: "AMD", name: "AMD" },
    { sym: "NVDA", name: "Nvidia" },
    { sym: "META", name: "Meta" },
    { sym: "MU", name: "Micron" },
    { sym: "AAPL", name: "Apple" },
    { sym: "MSFT", name: "Microsoft" },
    { sym: "AMZN", name: "Amazon" },
    { sym: "TSLA", name: "Tesla" },
    { sym: "AVGO", name: "Broadcom" },
    { sym: "INTC", name: "Intel" },
    { sym: "QCOM", name: "Qualcomm" },
    { sym: "TSM", name: "TSMC" },
  ];

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || "en"; } catch (e) { return "en"; }
  }
  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
  }
  // v351: a tap on the toggle is a deliberate choice, and it must win
  // over a stale stored account value. The old bug: the click handler
  // never told the account, and the auth re-apply in news.html then
  // overwrote a fresh Korean tap with the old stored "en". So a tap
  // records itself in localStorage (survives reloads, same device) and
  // news.html only applies the stored account value when no tap has
  // ever been recorded on this device.
  var LANG_CHOSEN_KEY = "tydNewsLangChosen";
  function langChosen() {
    try { return localStorage.getItem(LANG_CHOSEN_KEY) === "1"; } catch (e) { return false; }
  }
  function markLangChosen() {
    try { localStorage.setItem(LANG_CHOSEN_KEY, "1"); } catch (e) {}
  }
  // v351: merge Korean title/text shipped inside a loaded edition, so a
  // future edition can carry its own translations (koTitle/koText per
  // Korea story) with no code edit. Called from TYDNewsApplyEdition in
  // news.html, where the edition object is in hand. Stories without
  // both Korean fields are left alone; the baked-in KO dict stays.
  function mergeEditionKo(ed) {
    if (!ed || !Array.isArray(ed.stories)) return;
    ed.stories.forEach(function (s) {
      if (!s || s.section !== "korea" || !s.koTitle || !s.koText) return;
      KO[s.id] = {
        en: { title: s.title || "", text: s.text || "" },
        ko: { title: s.koTitle, text: s.koText }
      };
    });
  }
  // v351: one place that flips the language. Records the choice, swaps
  // the cards and the toggle label, tells the account (so the choice
  // follows Lucy across devices), and reloads the Korea live feed in
  // the new language when on the Korea page.
  function toggleLang() {
    var next = getLang() === "ko" ? "en" : "ko";
    setLang(next);
    markLangChosen();
    applyKoreaLang();
    if (window.TYDNewsLangChanged) window.TYDNewsLangChanged(next);
    var c = currentCat();
    if (c === "korea") load("korea", { fresh: true });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // v341: decode entities iteratively (max 3 passes) BEFORE esc().
  // The Benzinga RSS description is double-encoded (&amp;amp;), so a
  // single decode leaves "&amp;" behind and esc() then re-escapes it,
  // rendering literally as "&amp;". Decode first, then escape: the
  // esc() XSS protection still holds (a decoded "<script>" is escaped
  // again before it reaches innerHTML).
  function decodeEntities(s) {
    var out = String(s == null ? "" : s);
    for (var i = 0; i < 3; i++) {
      var next = out
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 10)); })
        .replace(/&#x([0-9a-fA-F]+);/g, function (_, n) { return String.fromCharCode(parseInt(n, 16)); });
      if (next === out) break;
      out = next;
    }
    return out;
  }
  function relTime(iso) {
    if (!iso) return "";
    var t = new Date(iso).getTime();
    if (isNaN(t)) return "";
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return "just now";
    var m = Math.floor(s / 60);
    if (m < 60) return m + " min ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " hr ago";
    var d = Math.floor(h / 24);
    return d + " day" + (d === 1 ? "" : "s") + " ago";
  }

  // Swap the daily Korea story cards between English and Korean.
  // Only touch the DOM when the text actually differs: setting
  // textContent always replaces the text node, which would re-trigger
  // the MutationObserver below and hang the page in a loop
  // (v282, Nov 15, 2026: the /news pages never rendered in the browser
  // check because applyKoreaLang kept mutating on every observation).
  function applyKoreaLang() {
    var lang = getLang();
    var cards = document.querySelectorAll(".newssec[data-newssec='korea'] .card[data-story]");
    cards.forEach(function (card) {
      var id = card.getAttribute("data-story");
      var entry = KO[id];
      if (!entry) return;
      var ver = entry[lang] || entry.en;
      var h3 = card.querySelector("h3");
      if (h3 && h3.textContent !== ver.title) h3.textContent = ver.title;
      // The story text is the first <p> that is not the .src line.
      var ps = card.querySelectorAll("p");
      for (var i = 0; i < ps.length; i++) {
        if (!ps[i].classList.contains("src")) {
          if (ps[i].textContent !== ver.text) ps[i].textContent = ver.text;
          break;
        }
      }
      if (card.getAttribute("data-lang") !== lang) card.setAttribute("data-lang", lang);
    });
    // Update the toggle button labels (guarded too: setting textContent
    // always replaces the text node, and the Korea toggle lives inside
    // #view-today, so an unguarded set re-triggers the MutationObserver
    // below and starves the main thread — the real v282/v283 hang).
    document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
      var label = lang === "ko" ? "🌐 English" : "🌐 한국어";
      if (b.textContent !== label) b.textContent = label;
      var pressed = lang === "ko" ? "true" : "false";
      if (b.getAttribute("aria-pressed") !== pressed) b.setAttribute("aria-pressed", pressed);
    });
  }

  function renderLive(container, data, cat) {
    if (!container) return;
    var lang = getLang();
    var isKo = cat === "korea" && lang === "ko";
    var head = isKo ? "실시간 업데이트" : "Updated news";
    var sub = cat === "stocks"
      ? (isKo ? "" : "Live from Benzinga, the news feed Robinhood uses. Updates as it happens.")
      : (isKo ? "구글 뉴스에서 가져온 최신 소식입니다." : "Fresh since today's Pond Post. Tap Refresh for the very latest.");
    var html = "<h2>" + (cat === "stocks" ? "🔴 LIVE · " : "📰 ") + esc(head) + "</h2>"
      + "<p style='font-size:13px;color:#4a6b78;margin:0 0 10px;'>" + esc(sub) + "</p>";
    if (!data || !data.items || !data.items.length) {
      html += "<p style='font-size:14px;color:#4a6b78;'>Live news is not available right now. Today's Pond Post below is still current.</p>";
    } else {
      html += "<ul style='list-style:none;margin:0;padding:0;'>";
      data.items.forEach(function (it) {
        var title = decodeEntities(it.title);
        var link = decodeEntities(it.link);
        var source = decodeEntities(it.source || "");
        var summary = decodeEntities(it.summary || "");
        html += "<li style='margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #d7e9f0;'>"
          + "<a href='" + esc(link) + "' target='_blank' rel='noopener' style='font-weight:700;color:#1f5f74;text-decoration:none;font-size:14.5px;line-height:1.4;'>" + esc(title) + "</a>"
          + "<div style='font-size:12.5px;color:#4a6b78;margin-top:2px;'>" + esc(source) + (it.pubDate ? " · " + esc(relTime(it.pubDate)) : "") + "</div>"
          + (summary ? "<div style='font-size:13.5px;color:#23414d;line-height:1.45;margin-top:3px;'>" + esc(summary) + "</div>" : "")
          + "</li>";
      });
      html += "</ul>";
    }
    var when = data && data.updated ? new Date(data.updated) : null;
    var stamp = when && !isNaN(when.getTime())
      ? "Updated " + when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "";
    html += "<p style='font-size:12.5px;color:#4a6b78;margin:6px 0 0;'>" + esc(stamp)
      + (data && data.source ? " · via " + esc(decodeEntities(data.source)) : "") + "</p>";
    container.innerHTML = html;
  }

  // v350: per-ticker news for the Stocks page. One group per ticker, in
  // TICKERS order; the item markup is renderLive's verbatim (same li
  // structure, same inline styles, same decodeEntities -> esc -> relTime
  // pipeline), so the site-nav.js blanket dark rules treat it exactly
  // like the general live feed. A ticker with no fresh on-ticker
  // stories says so honestly instead of showing stale or off-topic
  // news; if the whole ticker call failed, a section-level note says
  // so and points at the general live news below.
  function renderTickers(container, data) {
    if (!container) return;
    var html = "<h2>📈 News by ticker</h2>"
      + "<p style='font-size:13px;color:#4a6b78;margin:0 0 10px;'>Fresh headlines for the tickers the Pond follows. Tap Refresh for the very latest.</p>";
    if (!data || !data.tickers) {
      html += "<p style='font-size:14px;color:#4a6b78;'>Ticker news could not be loaded right now. The general live news below is still current.</p>";
    } else {
      if (data.tickersUnavailable) {
        html += "<p style='font-size:14px;color:#4a6b78;'>Ticker news could not be loaded right now. The general live news below is still current.</p>";
      }
      TICKERS.forEach(function (t) {
        var bucket = data.tickers[t.sym];
        var items = bucket && bucket.items ? bucket.items : [];
        html += "<h3 style='font-size:15px;color:#1f5f74;margin:14px 0 6px;'><b>" + esc(t.sym) + "</b> " + esc(t.name) + "</h3>";
        if (!items.length) {
          html += "<p style='font-size:14px;color:#4a6b78;'>No fresh news for " + esc(t.sym) + " right now.</p>";
        } else {
          html += "<ul style='list-style:none;margin:0;padding:0;'>";
          items.forEach(function (it) {
            var title = decodeEntities(it.title);
            var link = decodeEntities(it.link);
            var source = decodeEntities(it.source || "");
            var summary = decodeEntities(it.summary || "");
            html += "<li style='margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #d7e9f0;'>"
              + "<a href='" + esc(link) + "' target='_blank' rel='noopener' style='font-weight:700;color:#1f5f74;text-decoration:none;font-size:14.5px;line-height:1.4;'>" + esc(title) + "</a>"
              + "<div style='font-size:12.5px;color:#4a6b78;margin-top:2px;'>" + esc(source) + (it.pubDate ? " · " + esc(relTime(it.pubDate)) : "") + "</div>"
              + (summary ? "<div style='font-size:13.5px;color:#23414d;line-height:1.45;margin-top:3px;'>" + esc(summary) + "</div>" : "")
              + "</li>";
          });
          html += "</ul>";
        }
      });
    }
    var when = data && data.updated ? new Date(data.updated) : null;
    var stamp = when && !isNaN(when.getTime())
      ? "Updated " + when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "";
    html += "<p style='font-size:12.5px;color:#4a6b78;margin:6px 0 0;'>" + esc(stamp)
      + (data && data.source ? " · via " + esc(decodeEntities(data.source)) : "") + "</p>";
    container.innerHTML = html;
  }

  function currentCat() {
    try {
      var q = new URLSearchParams(location.search);
      var c = (q.get("cat") || "").toLowerCase();
      if (c === "everyday" || c === "stocks" || c === "politics" || c === "korea") return c;
    } catch (e) {}
    return null; // hub (all categories)
  }

  var timer = null;
  // v350: the Refresh button is shared by the general feed and the
  // ticker feed. Count in-flight refreshes so the button stays disabled
  // until BOTH have finished — whichever finishes first must not
  // re-enable it while the other is still loading.
  var refreshInflight = 0;
  function setRefreshBusy(busy) {
    var btn = document.getElementById("live-refresh");
    if (!btn) return;
    if (busy) {
      refreshInflight++;
      btn.disabled = true;
      btn.textContent = "↻ Refreshing…";
    } else {
      refreshInflight = Math.max(0, refreshInflight - 1);
      if (refreshInflight === 0) { btn.disabled = false; btn.textContent = "🔄 Refresh news"; }
    }
  }

  function load(cat, opts) {
    opts = opts || {};
    var container = document.getElementById("live-news");
    if (!container) return;
    var lang = getLang();
    var url = "/api/live-news?cat=" + encodeURIComponent(cat) + "&lang=" + encodeURIComponent(lang);
    // Cache-bust on a manual refresh so the button really pulls fresh news.
    if (opts.fresh) url += "&_=" + Date.now();
    setRefreshBusy(true);
    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.items) renderLive(container, data, cat);
        else renderLive(container, null, cat);
      })
      .catch(function () { renderLive(container, null, cat); })
      .finally(function () {
        setRefreshBusy(false);
        var stamp = document.getElementById("live-stamp");
        if (stamp) stamp.textContent = "Last checked " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      });
  }

  // v350: one combined call for all 14 tickers (the server fans out).
  // Same pattern as load(): manual refresh cache-busts, failures render
  // the honest empty state. Skipped while a ticker load is already in
  // flight, and a no-op when there is no ticker box (not the Stocks page).
  var tickersLoading = false;
  function loadTickers(opts) {
    opts = opts || {};
    var box = document.getElementById("tickerbox");
    if (!box || tickersLoading) return;
    tickersLoading = true;
    var url = "/api/live-news?cat=stocks-tickers";
    if (opts.fresh) url += "&_=" + Date.now();
    setRefreshBusy(true);
    fetch(url, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.tickers) renderTickers(box, data);
        else renderTickers(box, null);
      })
      .catch(function () { renderTickers(box, null); })
      .finally(function () {
        tickersLoading = false;
        setRefreshBusy(false);
      });
  }

  // v350: the ticker box is created by JS (never static markup, so a
  // stale cached HTML cannot show an empty box) and sits immediately
  // after the daily Stocks section — below the daily stories, above
  // the next section. NEVER inside a .newssec: TYDNewsApplyEdition
  // destroys those on every edition swap. And never rely on where it
  // was placed once: applyNewsPrefs re-appends the sections, which
  // moves the Stocks section after the box, so callers re-place it
  // after every edition render (see init()).
  function placeTickerBox() {
    if (currentCat() !== "stocks") return;
    var sec = document.querySelector('.newssec[data-newssec="stocks"]');
    if (!sec || !sec.parentNode) return;
    var box = document.getElementById("tickerbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "tickerbox";
      box.setAttribute("style", "background:#fff;border:1px solid #9fc6d4;border-radius:12px;padding:10px 12px;margin:0 0 12px;");
      box.innerHTML = "<p style='font-size:14px;color:#4a6b78;margin:0;'>Loading ticker news…</p>";
    }
    if (sec.nextSibling !== box) sec.parentNode.insertBefore(box, sec.nextSibling);
  }

  function startAutoRefresh(cat) {
    if (timer) { clearInterval(timer); timer = null; }
    if (cat === "stocks") {
      // Real-time for trading: re-check every 2 minutes.
      timer = setInterval(function () { load("stocks"); loadTickers(); }, 120000);
    }
  }

  function init() {
    var cat = currentCat();
    var btn = document.getElementById("live-refresh");
    if (btn) {
      btn.addEventListener("click", function () {
        var c = currentCat() || btn.getAttribute("data-cat") || "stocks";
        load(c, { fresh: true });
        if (c === "stocks") loadTickers({ fresh: true });
      });
    }
    // Korea language toggle buttons (v351). Delegated on document: the
    // Korea section's toggle is rendered LATER by TYDNewsApplyEdition
    // (news.html), after init ran, so binding the buttons that exist
    // at init time left the button Lucy taps with no handler at all.
    // Delegation catches every toggle no matter when it renders, and
    // there is exactly one listener, so a re-render can never double
    // bind or double flip.
    document.addEventListener("click", function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("[data-lang-toggle]") : null;
      if (!b) return;
      toggleLang();
    });
    applyKoreaLang();
    // Re-apply Korean text whenever the edition re-renders the cards.
    var view = document.getElementById("view-today");
    if (view && window.MutationObserver) {
      var mo = new MutationObserver(function () { applyKoreaLang(); });
      mo.observe(view, { childList: true, subtree: true });
    }
    if (cat) {
      load(cat);
      startAutoRefresh(cat);
      if (cat === "stocks") {
        // v350: ticker box after the daily Stocks section, then the
        // combined ticker call. Re-place after every edition render:
        // TYDNewsApplyEdition rebuilds the sections and applyNewsPrefs
        // re-appends them, which would otherwise leave the box above
        // the Stocks section.
        placeTickerBox();
        loadTickers();
        window.addEventListener("tyd-news-edition", function () { placeTickerBox(); });
      }
    } else {
      // Hub: no live box. The front page is the daily edition's top
      // stories; the live Stocks feed lives on the Stocks page, and each
      // category page has its own live feed. (Lucy, Nov 15, 2026)
      var box = document.getElementById("livebox");
      if (box) box.style.display = "none";
    }
  }

  window.TYDLiveNews = {
    load: load,
    renderLive: renderLive,
    loadTickers: loadTickers,
    renderTickers: renderTickers,
    placeTickerBox: placeTickerBox,
    TICKERS: TICKERS,
    decodeEntities: decodeEntities,
    esc: esc,
    refresh: function () { var c = currentCat() || "stocks"; load(c, { fresh: true }); },
    setLang: function (l) { setLang(l); markLangChosen(); applyKoreaLang(); if (window.TYDNewsLangChanged) window.TYDNewsLangChanged(l === "ko" ? "ko" : "en"); var c = currentCat(); if (c === "korea") load("korea", { fresh: true }); },
    getLang: getLang,
    hasUserLangChoice: langChosen,
    mergeEditionKo: mergeEditionKo,
    toggleLang: toggleLang,
    KO: KO,
    applyKoreaLang: applyKoreaLang,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
