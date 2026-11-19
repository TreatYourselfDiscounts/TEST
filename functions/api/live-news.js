// Live news for the Pond Post (Lucy, Nov 15, 2026).
// GET /api/live-news?cat=stocks|everyday|politics|korea&lang=en|ko
// GET /api/live-news?cat=stocks-tickers (v350, Nov 17, 2026)
// Server-side fetch so the browser never hits a CORS wall.
// Stocks uses Benzinga, the real-time news provider Robinhood uses.
// Other categories use BBC News RSS (Google News returns 503 to
// Cloudflare Workers, so BBC is the reliable source). Korea supports
// lang=ko for Korean-language headlines via BBC News Korean.
// Stocks-tickers fans out server-side over 14 Yahoo Finance per-ticker
// RSS feeds (one combined browser call, never 14). Yahoo gates on
// User-Agent (Mozilla UA -> 200, default UA -> 404, empty UA -> 429),
// so the Mozilla UA below is mandatory on those fetches.
// Short cache so it stays fresh.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const cat = (url.searchParams.get("cat") || "stocks").toLowerCase();
  const lang = (url.searchParams.get("lang") || "en").toLowerCase();

  // v350: per-ticker Stocks news. One combined browser call fans out
  // server-side over the 14 Yahoo per-ticker feeds.
  if (cat === "stocks-tickers") return stocksTickers();

  const FEEDS = {
    stocks: "https://www.benzinga.com/feed",
    everyday: "https://feeds.bbci.co.uk/news/rss.xml",
    politics: "https://feeds.bbci.co.uk/news/politics/rss.xml",
    korea_en: "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    korea_ko: "https://feeds.bbci.co.uk/korean/rss.xml",
  };

  let feed = FEEDS.stocks;
  let sourceName = "Benzinga";
  if (cat === "everyday") { feed = FEEDS.everyday; sourceName = "BBC News"; }
  else if (cat === "politics") { feed = FEEDS.politics; sourceName = "BBC News"; }
  else if (cat === "korea") {
    if (lang === "ko") { feed = FEEDS.korea_ko; sourceName = "BBC News 코리아"; }
    else { feed = FEEDS.korea_en; sourceName = "BBC News"; }
  } else if (cat !== "stocks") {
    return json({ error: "unknown category", cat }, 400);
  }

  const cacheSeconds = cat === "stocks" ? 60 : 300;
  try {
    const res = await fetch(feed, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TreatYourselfDiscounts Pond Post live news)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      cf: { cacheTtl: cacheSeconds, cacheEverything: true },
    });
    if (!res.ok) return json({ error: "upstream " + res.status, cat, lang }, 502);
    const xml = await res.text();
    // v349: korea_en is BBC Asia (the whole region), not Korea-only, so
    // filter to Korea-related items before slicing. Parse a deeper pool
    // for that feed so 12 can still fill when early items are filtered
    // out. If fewer than 12 pass, return only those — never pad with a
    // non-Korea item.
    const isKoreaEn = cat === "korea" && lang !== "ko";
    let items = parseRss(xml, sourceName, isKoreaEn ? 40 : 20);
    if (isKoreaEn) items = items.filter(isKoreaRelated);
    items = items.slice(0, 12);
    return json(
      { cat, lang, updated: new Date().toISOString(), source: sourceName, items },
      200,
      cacheSeconds
    );
  } catch (e) {
    return json({ error: "fetch failed", cat, lang, detail: String(e && e.message || e) }, 502);
  }
}

// v350: per-ticker Stocks news via Yahoo Finance RSS.
// The 14 tickers Lucy follows (Nov 17, 2026), in display order. SPX is
// not a Yahoo symbol (?s=SPX returns an empty channel), so it uses the
// S&P 500 index feed ^GSPC. Yahoo feeds are "related news", not strict
// ticker feeds (about half of each feed is sector/market filler), so
// every ticker except SPX is mention-filtered: keep an item only if the
// ticker symbol (word-boundaried) or a company name appears in the
// title + summary. parseRss already slices the summary to 220 chars,
// so the filter sees exactly the window the page displays — never the
// full description, where a footer link could false-positive. SPX is
// unfiltered: only 2/19 ^GSPC items mention "S&P 500", and index news
// is general market news. A single ticker failing yields an empty
// bucket, never a thrown error; if ALL fail, tickersUnavailable: true.
const TICKERS = [
  { sym: "SPX", feed: "%5EGSPC", names: ["S&P 500"], unfiltered: true },
  { sym: "GOOGL", feed: "GOOGL", names: ["Google", "Alphabet"] },
  { sym: "AMD", feed: "AMD", names: ["AMD"] },
  { sym: "NVDA", feed: "NVDA", names: ["Nvidia"] },
  { sym: "META", feed: "META", names: ["Meta", "Facebook"] },
  { sym: "MU", feed: "MU", names: ["Micron"] },
  { sym: "AAPL", feed: "AAPL", names: ["Apple"] },
  { sym: "MSFT", feed: "MSFT", names: ["Microsoft"] },
  { sym: "AMZN", feed: "AMZN", names: ["Amazon"] },
  { sym: "TSLA", feed: "TSLA", names: ["Tesla"] },
  { sym: "AVGO", feed: "AVGO", names: ["Broadcom"] },
  { sym: "INTC", feed: "INTC", names: ["Intel"] },
  { sym: "QCOM", feed: "QCOM", names: ["Qualcomm"] },
  { sym: "TSM", feed: "TSM", names: ["TSMC", "Taiwan Semiconductor"] },
];

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tickerRe(t) {
  const parts = [t.sym].concat(t.names).map(escRe);
  return new RegExp("\\b(?:" + parts.join("|") + ")\\b", "i");
}

function isTickerRelated(item, re) {
  return re.test((item.title || "") + " " + (item.summary || ""));
}

async function stocksTickers() {
  const cacheSeconds = 60;
  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; TreatYourselfDiscounts Pond Post live news)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  };
  const results = await Promise.all(TICKERS.map(async (t) => {
    try {
      const res = await fetch(
        "https://feeds.finance.yahoo.com/rss/2.0/headline?s=" + t.feed + "&region=US&lang=en-US",
        { headers, cf: { cacheTtl: cacheSeconds, cacheEverything: true } }
      );
      if (!res.ok) return { ok: false, items: [] };
      const xml = await res.text();
      let items = parseRss(xml, "Yahoo Finance", 20);
      if (!t.unfiltered) items = items.filter((it) => isTickerRelated(it, tickerRe(t)));
      return { ok: true, items: items.slice(0, 3) };
    } catch (e) {
      return { ok: false, items: [] };
    }
  }));
  const tickers = {};
  TICKERS.forEach((t, i) => { tickers[t.sym] = { items: results[i].items }; });
  const body = {
    cat: "stocks-tickers",
    updated: new Date().toISOString(),
    source: "Yahoo Finance",
    tickers,
  };
  if (results.every((r) => !r.ok)) body.tickersUnavailable = true;
  return json(body, 200, cacheSeconds);
}

function json(obj, status, cacheSeconds) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=" + (cacheSeconds || 60),
  };
  return new Response(JSON.stringify(obj), { status, headers });
}

function decodeEntities(s) {
  // v341: loop until stable (max 3 passes). Some feeds double-encode
  // (&amp;amp; in the XML), so one pass leaves a literal "&amp;" behind
  // that the browser then renders as text.
  var out = (s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
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

function stripTags(s) {
  return decodeEntities(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tagText(block, tag) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1] : "";
}

// v349: Korea filter for the korea_en feed (BBC Asia covers the whole
// region). Keep an item only if its title or summary mentions Korea.
// Word boundaries so "Korean" matches but "Koreatown" does not; a hyphen
// is a word boundary, so hyphenated forms (K-pop, Lee Jae-myung,
// Kim Jong-un) still match.
const KOREA_RE = /\b(?:koreans?|seoul|pyongyang|busan|jeju|incheon|dmz|suneung|k-pop|kpop|kim jong|yoon suk|lee jae|north korea|south korea)\b/i;

function isKoreaRelated(item) {
  return KOREA_RE.test((item.title || "") + " " + (item.summary || ""));
}

function parseRss(xml, sourceName, maxItems) {
  const out = [];
  const cap = maxItems || 20;
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) && out.length < cap) {
    const block = m[1];
    let title = decodeEntities(tagText(block, "title")).trim();
    const link = decodeEntities(tagText(block, "link")).trim();
    const pubRaw = decodeEntities(tagText(block, "pubDate")).trim();
    const desc = stripTags(tagText(block, "description"));
    let source = decodeEntities(tagText(block, "source")).trim();
    // Google News titles end with " - SourceName". Prefer the <source>
    // tag; otherwise split it off the title so the headline reads clean.
    if (!source && title.indexOf(" - ") > -1) {
      const idx = title.lastIndexOf(" - ");
      source = title.slice(idx + 3).trim();
      title = title.slice(0, idx).trim();
    }
    if (!title || !link) continue;
    let pubDate = null;
    if (pubRaw) {
      const d = new Date(pubRaw);
      if (!isNaN(d.getTime())) pubDate = d.toISOString();
    }
    out.push({
      title,
      link,
      source: source || sourceName,
      pubDate,
      summary: desc ? desc.slice(0, 220) : "",
    });
  }
  return out;
}
