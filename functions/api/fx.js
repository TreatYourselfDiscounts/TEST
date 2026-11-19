// Currency converter live rate for the Travel page (Lucy, Nov 18, 2026).
// GET /api/fx?base=USD&target=KRW
// Server-side fetch so the browser never hits a CORS wall: Wise's live
// rate endpoint sends no Access-Control-Allow-Origin, and neither does
// Naver's. Wise updates intraday (live market); ER-API and Frankfurter
// (the browser fallbacks) are once-daily ECB reference rates, which is
// why the converter kept disagreeing with Naver by a few won
// (Nov 18: ER-API 1,335.36 vs Naver 1,332.60). The browser tries this
// endpoint first and falls back to ER-API, then Frankfurter, then the
// saved rate. Short cache (15 min) so it stays close to the live market.
// No API key needed for Wise.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const base = (url.searchParams.get("base") || "USD").toUpperCase();
  const target = (url.searchParams.get("target") || "KRW").toUpperCase();
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(target)) {
    return json({ error: "bad currency code", base, target }, 400);
  }
  const cacheSeconds = 900;
  try {
    const res = await fetch(
      "https://wise.com/rates/live?source=" + base + "&target=" + target,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TreatYourselfDiscounts Travel converter)",
          "Accept": "application/json",
        },
        cf: { cacheTtl: cacheSeconds, cacheEverything: true },
      }
    );
    if (!res.ok) return json({ error: "upstream " + res.status, base, target }, 502);
    const d = await res.json();
    const value = Number(d && d.value);
    if (!value || !(value > 0)) return json({ error: "empty rate", base, target }, 502);
    return json(
      {
        base,
        target,
        rate: value,
        ts: Number(d.time) || Date.now(),
        source: "Wise",
      },
      200,
      cacheSeconds
    );
  } catch (e) {
    return json({ error: "fetch failed", base, target, detail: String((e && e.message) || e) }, 502);
  }
}

function json(obj, status, cacheSeconds) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=" + (cacheSeconds || 60),
  };
  return new Response(JSON.stringify(obj), { status, headers });
}
