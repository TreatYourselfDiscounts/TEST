/* The Pond's app-style bottom menu, shared by every page. Also carries the
   Install button (real install prompt where the browser offers one, plain
   instructions everywhere else) and registers the service worker so the
   site behaves like an app from any entry page. */
(function () {
  /* Dark / light theme: a small toggle pinned at the top of the screen on
     every page. Light is the site's original look (nothing changes); dark
     recolors the page surfaces, cards and text through the overrides below.
     The choice is remembered on the device in localStorage 'tydTheme'. */
  var tydTheme = "light";
  try { tydTheme = localStorage.getItem("tydTheme") === "dark" ? "dark" : "light"; } catch (e) {}
  if (tydTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  if (location.pathname.indexOf("/brands/") !== -1) document.documentElement.classList.add("tyd-brand");
  /* Accent theme (Lucy, Nov 12, 2026; Rose, Ocean and Black & White added
     Nov 13, 2026): Pond Blue is the standard default everyone gets;
     Sunset, Lavender, Forest, Rose and Ocean recolor the site's accent
     (switcher, bell, banners, buttons) in both light and dark mode, and
     Black & White is a greys-only monochrome accent. In light mode the
     accent also recolors the content background (the solid column behind
     the text, .app/.wrap) to the accent's soft tint; the duck wallpaper
     in the margins never changes. The choice lives in
     localStorage 'tydAccent' and, when signed in, in users/{uid}.themeAccent
     so it follows the member across devices. The light/dark theme
     (tydTheme) rides the account too, as users/{uid}.themeMode
     (v339), and works alongside it. Pond Blue is byte-for-byte the
     current look: the recolor rules below only apply under an accent class,
     so the default never changes. */
  var TYD_ACCENTS = ["pond", "sunset", "lavender", "forest", "rose", "ocean", "mono", "plain", "custom"];
  var TYD_ACCENT_NAMES = { pond: "Pond Blue", sunset: "Sunset", lavender: "Lavender", forest: "Forest", rose: "Rose", ocean: "Ocean", mono: "Black & White", plain: "Plain", custom: "Custom" };
  var TYD_ACCENT_DOTS = { pond: "#ffd94d", sunset: "#ff9e57", lavender: "#c9a7eb", forest: "#8fce9b", rose: "#f2a0c0", ocean: "#6fbcd4", mono: "#9aa3ab", plain: "#bfe6f2", custom: "conic-gradient(#f66,#fd6,#6f6,#6cf,#96f,#f6f,#f66)" };
  /* Custom accent color (Lucy, Nov 14, 2026): pick ANY color with the
     color wheel and slide how light light mode is and how dark dark mode
     is. The site derives every accent variable from the one chosen color,
     so a custom color behaves exactly like a preset accent. Saved in
     localStorage (tydAccentCustom / tydAccentLight / tydAccentDark) and,
     when signed in, in the account alongside themeAccent. */
  var tydCustomColor = "#ff9e57";
  var tydCustomLight = 88; /* % white mixed into the light tint */
  var tydCustomDark = 60; /* % black mixed into the dark tint */
  try {
    var ccSaved = localStorage.getItem("tydAccentCustom");
    if (ccSaved && /^#[0-9a-fA-F]{6}$/.test(ccSaved)) tydCustomColor = ccSaved.toLowerCase();
    var clSaved = parseInt(localStorage.getItem("tydAccentLight"), 10);
    if (!isNaN(clSaved) && clSaved >= 70 && clSaved <= 95) tydCustomLight = clSaved;
    var cdSaved = parseInt(localStorage.getItem("tydAccentDark"), 10);
    if (!isNaN(cdSaved) && cdSaved >= 40 && cdSaved <= 90) tydCustomDark = cdSaved;
  } catch (e) {}
  function tydHexToRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function tydRgbToHex(r, g, b) {
    function p(v) { var x = Math.max(0, Math.min(255, Math.round(v))).toString(16); return x.length === 1 ? "0" + x : x; }
    return "#" + p(r) + p(g) + p(b);
  }
  function tydMixHex(a, b, t) {
    var ca = tydHexToRgb(a), cb = tydHexToRgb(b);
    return tydRgbToHex(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
  }
  var TYD_ACC_VAR_NAMES = ["--tyd-acc", "--tyd-acc-soft", "--tyd-acc-dark", "--tyd-acc-ink", "--tyd-acc-bd", "--tyd-acc-bd2", "--tyd-acc-g1", "--tyd-acc-g2"];
  function tydCustomVars(color, lightPct, darkPct) {
    return {
      "--tyd-acc": color,
      "--tyd-acc-soft": tydMixHex(color, "#ffffff", lightPct / 100),
      "--tyd-acc-dark": tydMixHex(color, "#000000", darkPct / 100),
      "--tyd-acc-ink": tydMixHex(color, "#000000", 0.78),
      "--tyd-acc-bd": tydMixHex(color, "#000000", 0.28),
      "--tyd-acc-bd2": tydMixHex(color, "#000000", 0.16),
      "--tyd-acc-g1": tydMixHex(color, "#ffffff", 0.55),
      "--tyd-acc-g2": color
    };
  }
  function tydApplyCustomVars() {
    var vars = tydCustomVars(tydCustomColor, tydCustomLight, tydCustomDark);
    var de = document.documentElement;
    Object.keys(vars).forEach(function (k) { de.style.setProperty(k, vars[k]); });
  }
  function tydClearCustomVars() {
    var de = document.documentElement;
    TYD_ACC_VAR_NAMES.forEach(function (k) { de.style.removeProperty(k); });
  }
  var tydAccent = "pond";
  try {
    var aSaved = localStorage.getItem("tydAccent");
    if (TYD_ACCENTS.indexOf(aSaved) > -1) tydAccent = aSaved;
  } catch (e) {}
  function tydApplyAccent(v) {
    document.documentElement.classList.remove("tyd-accent-sunset", "tyd-accent-lavender", "tyd-accent-forest", "tyd-accent-rose", "tyd-accent-ocean", "tyd-accent-mono", "tyd-accent-plain", "tyd-accent-custom");
    if (v === "custom") { document.documentElement.classList.add("tyd-accent-custom"); tydApplyCustomVars(); return; }
    tydClearCustomVars();
    if (v && v !== "pond") document.documentElement.classList.add("tyd-accent-" + v);
  }
  tydApplyAccent(tydAccent);
  /* Color blindness simulation (Lucy, Nov 13, 2026): a "Color blindness
     preview" section in the Color panel lets anyone preview the site the
     way it looks with a type of color vision deficiency, so she can check
     the site reads well for those members. Uses standard simulation
     matrices (Machado et al.) as SVG feColorMatrix filters on the content
     column (.app/.wrap) and the duck wallpaper, plus grayscale for total
     color blindness. The preview is for people with normal vision: someone
     who already has that type of color blindness should leave it on None,
     because the preview on top of their own vision makes it duller twice
     over. For them there is "Boost colors (vivid)", which raises saturation
     and contrast so colors stay vivid and easier to tell apart. The choice
     lives in localStorage 'tydColorBlind' ("none" is the default) and,
     when signed in, in users/{uid}.colorBlind (v339) so it follows the
     member across devices. The Color button, the panel itself and the bottom
     nav stay unfiltered so the controls stay readable and the simulation
     can always be turned off. */
  var TYD_CB_TYPES = ["none", "protanopia", "deuteranopia", "tritanopia", "achromatopsia", "vivid"];
  var TYD_CB_NAMES = { none: "None", protanopia: "Protanopia (no red)", deuteranopia: "Deuteranopia (no green)", tritanopia: "Tritanopia (no blue)", achromatopsia: "Achromatopsia (no color)", vivid: "Boost colors (vivid)" };
  var tydColorBlind = "none";
  try {
    var cbSaved = localStorage.getItem("tydColorBlind");
    if (TYD_CB_TYPES.indexOf(cbSaved) > -1) tydColorBlind = cbSaved;
  } catch (e) {}
  function tydApplyColorBlind(v) {
    var de = document.documentElement;
    TYD_CB_TYPES.forEach(function (t) { if (t !== "none") de.classList.remove("tyd-cb-" + t); });
    if (v && v !== "none") de.classList.add("tyd-cb-" + v);
  }
  window.TYDSetColorBlind = function (v) {
    if (TYD_CB_TYPES.indexOf(v) < 0) v = "none";
    tydColorBlind = v;
    tydApplyColorBlind(v);
    try { localStorage.setItem("tydColorBlind", v); } catch (e) {}
    if (window.TYDAccountPush) window.TYDAccountPush({ colorBlind: v });
    tydPaintColorPop();
    // Force a repaint so the new filter shows at once, even when switching
    // straight from one type to another (iOS Safari can otherwise leave
    // the old filter painted, so a switch away from no-color looks stuck grey).
    void document.documentElement.offsetHeight;
  };
  /* Inject the SVG simulation filters (hidden, never display:none, so the
     url() references keep working). */
  function tydInjectCbFilters() {
    if (document.getElementById("tyd-cb-filters") || !document.body) return;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "tyd-cb-filters");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;");
    svg.innerHTML =
      '<defs>' +
      '<filter id="tyd-cb-protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0"/></filter>' +
      '<filter id="tyd-cb-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0"/></filter>' +
      '<filter id="tyd-cb-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0"/></filter>' +
      '</defs>';
    document.body.appendChild(svg);
  }
  tydApplyColorBlind(tydColorBlind);
  if (document.body) tydInjectCbFilters();
  else document.addEventListener("DOMContentLoaded", tydInjectCbFilters);
  var ACC_P = ["html.tyd-accent-sunset", "html.tyd-accent-lavender", "html.tyd-accent-forest", "html.tyd-accent-rose", "html.tyd-accent-ocean", "html.tyd-accent-mono", "html.tyd-accent-plain", "html.tyd-accent-custom"];
  function accJoin(sels) {
    var out = [];
    ACC_P.forEach(function (p) { sels.forEach(function (s) { out.push(p + " " + s); }); });
    return out.join(",");
  }
  function accJoinDark(sels) {
    var out = [];
    ACC_P.forEach(function (p) { sels.forEach(function (s) { out.push("html[data-theme=\"dark\"]" + p.slice(4) + " " + s); }); });
    return out.join(",");
  }
  function accJoinLight(sels) {
    var out = [];
    ACC_P.forEach(function (p) { sels.forEach(function (s) { out.push("html:not([data-theme=\"dark\"])" + p.slice(4) + " " + s); }); });
    return out.join(",");
  }
  var tydAccCss = ""
    + "html{--tyd-acc-dark:#4c5c61;}"
    + "html.tyd-accent-sunset{--tyd-acc:#ff9e57;--tyd-acc-bd:#e07b39;--tyd-acc-bd2:#eda06a;--tyd-acc-ink:#5a2d00;--tyd-acc-soft:#ffe4cf;--tyd-acc-g1:#ffd1a8;--tyd-acc-g2:#ff9e57;--tyd-acc-dark:#663f23;}"
    + "html.tyd-accent-lavender{--tyd-acc:#c9a7eb;--tyd-acc-bd:#9b72cf;--tyd-acc-bd2:#b394dd;--tyd-acc-ink:#3d2a5e;--tyd-acc-soft:#efe4fb;--tyd-acc-g1:#e3d1f7;--tyd-acc-g2:#c9a7eb;--tyd-acc-dark:#50435e;}"
    + "html.tyd-accent-forest{--tyd-acc:#8fce9b;--tyd-acc-bd:#5da56f;--tyd-acc-bd2:#7fb98d;--tyd-acc-ink:#1e4d2a;--tyd-acc-soft:#dff2e2;--tyd-acc-g1:#c8ecd0;--tyd-acc-g2:#8fce9b;--tyd-acc-dark:#39523e;}"
    + "html.tyd-accent-rose{--tyd-acc:#f2a0c0;--tyd-acc-bd:#d1739e;--tyd-acc-bd2:#e08bb0;--tyd-acc-ink:#5c2340;--tyd-acc-soft:#fde9f1;--tyd-acc-g1:#fad3e3;--tyd-acc-g2:#f2a0c0;--tyd-acc-dark:#61404d;}"
    + "html.tyd-accent-ocean{--tyd-acc:#6fbcd4;--tyd-acc-bd:#4a96ad;--tyd-acc-bd2:#5fa9c0;--tyd-acc-ink:#0f3d4a;--tyd-acc-soft:#e1f2f6;--tyd-acc-g1:#c6e7f0;--tyd-acc-g2:#6fbcd4;--tyd-acc-dark:#2c4b55;}"
    + "html.tyd-accent-mono{--tyd-acc:#9aa3ab;--tyd-acc-bd:#6e777f;--tyd-acc-bd2:#7d868e;--tyd-acc-ink:#212121;--tyd-acc-soft:#eceff1;--tyd-acc-g1:#dfe3e6;--tyd-acc-g2:#9aa3ab;--tyd-acc-dark:#3e4144;}"
    /* Plain accent (Lucy, Nov 15, 2026): the same Pond Blue colors as the
       default, but the duck wallpaper is hidden, so the margins are a
       solid color in both light and dark mode. Opt-in only; the ducks
       stay the default. */
    + "html.tyd-accent-plain{--tyd-acc:#ffd94d;--tyd-acc-bd:#e8b93c;--tyd-acc-bd2:#f0c93e;--tyd-acc-ink:#1f5f74;--tyd-acc-soft:#bfe6f2;--tyd-acc-g1:#ffe066;--tyd-acc-g2:#ffd94d;--tyd-acc-dark:#4c5c61;}"
    + "html.tyd-accent-plain body::before{background-image:none !important;}"
    + accJoin(["#tydswitchbtn", "#tydbell", ".tydtoparrow", "#tydthemebtn", "#tydhomebtn"]) + "{background:var(--tyd-acc);border-color:var(--tyd-acc-bd);}"
    + accJoin(["#tydnavfab"]) + "{background:var(--tyd-acc);border-color:var(--tyd-acc-bd);color:var(--tyd-acc-ink);}"
    + accJoin([".play-banner:not(.recipes-banner):not(.protect-banner)"]) + "{background:var(--tyd-acc-soft);border-color:var(--tyd-acc-bd2);}"
    + accJoin([".wbtn", "#whatsnew-ok", ".tydbellbtn", "#tydbellmark", "#tydcdone"]) + "{background:var(--tyd-acc);border-color:var(--tyd-acc-bd);color:var(--tyd-acc-ink);}"
    + accJoin([".tydcbtn.on"]) + "{background:var(--tyd-acc) !important;border-color:var(--tyd-acc-bd) !important;}"
    + accJoin(["#tydacctbar"]) + "{border-color:var(--tyd-acc-bd2);}"
    + accJoin([".tydab-btn.alt", ".ab-btn.alt"]) + "{background:var(--tyd-acc-soft);color:var(--tyd-acc-ink);}"
    + accJoinLight([".app", ".wrap"]) + "{background:var(--tyd-acc-soft) !important;}"
    + accJoin(["#tydthemebtn"]) + "{border-color:var(--tyd-acc-bd);}"
    + accJoinDark(["#tydnav .on"]) + "{color:var(--tyd-acc-ink) !important;background:transparent !important;}"
    /* v341 sliding pill: the active tab sits ON the accent pill, so its
       text is the dark accent ink (readable on the accent), never the
       accent color itself, and it carries no background of its own. */
    + accJoinDark(["#tydthemebtn"]) + "{color:var(--tyd-acc);}"
    + "#tydcolorpop{position:fixed;z-index:10100;width:240px;max-height:calc(100vh - 190px);max-height:calc(100dvh - 190px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;background:#fff;border:2px solid #bcd9e4;border-radius:14px;box-shadow:0 12px 28px rgba(35,65,77,.28);padding:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "#tydcolorpop::-webkit-scrollbar{width:8px;}"
    + "#tydcolorpop::-webkit-scrollbar-track{background:#eef6fa;border-radius:4px;}"
    + "#tydcolorpop::-webkit-scrollbar-thumb{background:#bcd9e4;border-radius:4px;}"
    + "#tydcolorpop{scrollbar-width:thin;scrollbar-color:#bcd9e4 #eef6fa;}"
    /* Set up your Pond sheet (Lucy, Nov 15, 2026): the first-visit
       picker where a new person chooses which sections are in their Pond.
       A centered modal over a dimmed backdrop, in the site's own card
       style. Deals is always on, matching the switcher customize rule. */
    + "#tydsetup{position:fixed;inset:0;z-index:10200;display:flex;align-items:flex-end;justify-content:center;background:rgba(23,38,53,.55);padding:0;}"
    + "@media (min-width:640px){#tydsetup{align-items:center;padding:24px;}}"
    + "#tydsetup .tydsetup-card{background:#fff;border:2px solid #bcd9e4;border-radius:18px 18px 0 0;width:100%;max-width:560px;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);display:flex;flex-direction:column;box-shadow:0 12px 28px rgba(35,65,77,.28);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "@media (min-width:640px){#tydsetup .tydsetup-card{border-radius:18px;}}"
    + "#tydsetup .tydsetup-head{display:flex;align-items:center;gap:10px;padding:16px 16px 8px;}"
    + "#tydsetup .tydsetup-head img{width:52px;height:52px;border-radius:50%;border:3px solid #ffd94d;background:#bfe6f2;flex:none;}"
    + "#tydsetup .tydsetup-head h2{margin:0;font-size:19px;color:#1f5f74;line-height:1.25;}"
    + "#tydsetup .tydsetup-head p{margin:2px 0 0;font-size:13.5px;color:#3f6b7a;line-height:1.45;}"
    + "#tydsetup .tydsetup-x{margin-left:auto;flex:none;width:34px;height:34px;border-radius:50%;border:2px solid #bcd9e4;background:#eef6fa;color:#1f5f74;font-size:17px;font-weight:800;cursor:pointer;}"
    + "#tydsetup .tydsetup-list{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 12px 8px;}"
    + "#tydsetup .tydsetup-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-bottom:1px solid #e3eef3;text-align:left;width:100%;background:none;border-left:none;border-right:none;border-top:none;font:inherit;cursor:pointer;}"
    + "#tydsetup .tydsetup-row:last-child{border-bottom:none;}"
    + "#tydsetup .tydsetup-row img{width:38px;height:38px;border-radius:10px;flex:none;object-fit:cover;}"
    + "#tydsetup .tydsetup-row .nm{flex:1;min-width:0;}"
    + "#tydsetup .tydsetup-row .nm b{display:block;font-size:15px;color:#1f5f74;}"
    + "#tydsetup .tydsetup-row .nm span{font-size:12.5px;color:#5b7a88;line-height:1.35;display:block;}"
    + "#tydsetup .tydsetup-row.off{opacity:.55;}"
    + "#tydsetup .tydsetup-row.off .nm b{text-decoration:line-through;}"
    + "#tydsetup .tydsetup-tgl{flex:none;min-width:86px;text-align:center;font-size:13px;font-weight:800;border-radius:999px;padding:6px 10px;border:2px solid #1f5f74;background:#1f5f74;color:#fff;}"
    + "#tydsetup .tydsetup-row.off .tydsetup-tgl{background:#fff;color:#5b7a88;border-color:#bcd9e4;}"
    + "#tydsetup .tydsetup-row.locked{cursor:default;}"
    + "#tydsetup .tydsetup-row.locked .tydsetup-tgl{background:#eef6fa;color:#1f5f74;border-color:#bcd9e4;}"
    + "#tydsetup .tydsetup-foot{display:flex;gap:8px;padding:12px 16px 16px;border-top:1px solid #e3eef3;}"
    + "#tydsetup .tydsetup-foot button{flex:1;border-radius:12px;padding:12px 10px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;}"
    + "#tydsetup .tydsetup-done{background:#ffd94d;border:2px solid #e8b93c;color:#1f5f74;}"
    + "#tydsetup .tydsetup-skip{background:#fff;border:2px solid #bcd9e4;color:#1f5f74;}"
    /* Set up your Pond banner (Lucy, Nov 15, 2026): a small dismissible
       bar on Home that invites the member to set up their Pond, instead
       of the sheet auto-opening and blocking the page. */
    + "#tydsetupbanner{display:flex;align-items:center;gap:10px;background:#fff8d6;border:2px solid #e8b93c;border-radius:14px;padding:10px 12px;margin:12px 12px 0;font-size:14px;color:#1f5f74;font-weight:700;line-height:1.35;}"
    + "#tydsetupbanner .tydsetupbanner-txt{flex:1;min-width:0;}"
    + "#tydsetupbanner .tydsetupbanner-open{flex:none;background:#ffd94d;border:2px solid #e8b93c;color:#1f5f74;border-radius:999px;padding:7px 12px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;}"
    + "#tydsetupbanner .tydsetupbanner-x{flex:none;background:none;border:none;color:#1f5f74;font-size:16px;font-weight:800;cursor:pointer;padding:4px 6px;font-family:inherit;}"
    + "html[data-theme=\"dark\"] #tydsetupbanner{background:#23414d !important;border-color:#2e4a5f !important;color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #tydsetupbanner .tydsetupbanner-open{background:#ffd94d !important;color:#1f5f74 !important;border-color:#e8b93c !important;}"
    + "html[data-theme=\"dark\"] #tydsetupbanner .tydsetupbanner-x{color:#eefaff !important;}"
    /* Verified badge (Lucy, Nov 15, 2026): brand pages carry a real green
       check badge, not small grey text, so the verification is visible. */
    + ".verified-badge{display:inline-flex;align-items:center;gap:6px;background:#e6f7e6;border:2px solid #2e9e4f;color:#1e5c33;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:800;margin:0 0 16px;line-height:1.3;}"
    + "html[data-theme=\"dark\"] .verified-badge{background:#1d3a24 !important;border-color:#2e9e4f !important;color:#b9e8c4 !important;}"
    /* Brand-page extras (v295, Nov 15, 2026): the "What we verified"
       line, the detail card and the related-brands row are injected by
       site-nav.js from one shared data map, so all 14 brand pages get
       them from a single change. */
    + ".tyd-verified-note{font-size:13px;color:#4a6b78;line-height:1.5;margin:0 0 12px;}"
    + ".tyd-brand-detail ul{margin:6px 0 0;padding-left:18px;line-height:1.55;font-size:15px;}"
    + ".tyd-brand-detail li{margin:0 0 4px;}"
    + ".tyd-expiry{font-size:13px;color:#4a6b78;margin:10px 0 0;}"
    + ".tyd-related p{line-height:1.6;}"
    + ".tyd-related a{color:#1f5f74;font-weight:700;}"
    + "html[data-theme=\"dark\"] .tyd-verified-note,html[data-theme=\"dark\"] .tyd-expiry{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .tyd-brand-detail,html[data-theme=\"dark\"] .tyd-brand-detail ul,html[data-theme=\"dark\"] .tyd-related{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] .tyd-related a{color:#c9f0fc !important;}"
    /* Brand-page hero tightening (v298, Nov 15, 2026): the 220px duck
       plus the full-height hero image pushed the deal card below the
       fold at desktop height. Desktop-width screens ONLY (min-width
       700px, so phones are untouched): the duck shrinks to 120px, the
       hero image is capped at 200px tall, and the top padding and
       heading margins tighten, so the deal card sits above the fold
       at an 800px-tall desktop viewport. The injected style element
       comes after each page's own inline style and these selectors
       (html.tyd-brand ...) outrank the page rules, so no !important
       is needed. */
    + "@media (min-width:700px){html.tyd-brand .wrap{padding-top:12px;}"
    + "html.tyd-brand .brand-duck{width:120px;height:120px;margin:4px auto 2px;}"
    + "html.tyd-brand .brand-page-logo{margin:2px 0 4px;}"
    + "html.tyd-brand h1{margin:12px 0 2px;}"
    + "html.tyd-brand .sub{margin:0 0 12px;}"
    + "html.tyd-brand .brand-hero{max-height:200px;object-fit:cover;margin-bottom:12px;}"
    + "html.tyd-brand .verified-badge{margin-bottom:12px;}}"
    /* "More from the Pond" cards (v298): each related brand is a real
       card — its own hero image on the left, name and one-line
       description on the right — in the same row style as the deal
       rows. The card is one link, so the whole card is tappable. */
    + ".tyd-rel-card{display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit;background:#fff;border-radius:14px;padding:10px 12px;margin:0 0 8px;box-shadow:0 2px 8px rgba(35,65,77,.06);}"
    + ".tyd-rel-card:last-child{margin-bottom:0;}"
    + ".tyd-rel-card img{width:64px;height:64px;object-fit:cover;border-radius:12px;flex-shrink:0;}"
    + ".tyd-rel-txt{min-width:0;}"
    + ".tyd-rel-name{display:block;font-weight:700;font-size:14px;color:#1f5f74;}"
    + ".tyd-rel-desc{display:block;font-size:13px;color:#4a6b78;line-height:1.4;}"
    + "html[data-theme=\"dark\"] .tyd-rel-card{background:#23414d !important;}"
    + "html[data-theme=\"dark\"] .tyd-rel-name{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .tyd-rel-desc{color:#bcd6e4 !important;}"
    /* The Color panel and button sit above the per-page help pills
       (.phelp-launch / .rhelp-launch, z-index 10080 on 13 pages), which
       otherwise cover the panel's lower rows and steal taps and drags
       there. The panel's bottom is also capped in code (tydToggleColorPop)
       so it stays above the bottom navigation. */
    + "#tydcolorpop .tydcolor-h{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5b7d89;margin:4px 4px 3px;}"
    + "#tydcolorpop .tydcolor-note{font-size:11px;line-height:1.35;color:#5b7d89;margin:0 4px 4px;}"
    + "#tydcolorpop .tydcolor-h:first-child{margin-top:0;}"
    + "#tydcolorpop .tydcolor-modes{display:flex;gap:8px;}"
    + "#tydcolorpop .tydcolor-modes button{flex:1;justify-content:center;}"
    + "#tydcolorpop button{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;background:none;border:none;border-radius:8px;padding:6px 8px;font-family:inherit;font-size:13px;font-weight:700;color:#1f5f74;cursor:pointer;text-align:left;}"
    + "#tydcolorpop button.on{background:#fff3b0;}"
    + "#tydcolorpop .dot{width:16px;height:16px;border-radius:50%;border:2px solid rgba(35,65,77,.25);flex:none;}"
    + "#tydcolorpop .ck{margin-left:auto;}"
    + "#tydcolorpop .tydcolor-custom{padding:2px 4px;}"
    + "#tydcolorpop .tydcolor-custom label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#1f5f74;padding:6px 4px;}"
    + "#tydcolorpop .tydcolor-custom input[type=color]{width:38px;height:28px;border:2px solid rgba(35,65,77,.25);border-radius:8px;padding:0;background:none;cursor:pointer;flex:none;}"
    + "#tydcolorpop .tydcolor-custom input[type=range]{flex:1;min-width:0;accent-color:#1f5f74;}"
    + "#tydcolorpop .tydcolor-custom .tydcdval{font-size:12px;font-weight:800;color:#5b7d89;min-width:36px;text-align:right;}"
    + "html[data-theme=\"dark\"] #tydcolorpop .tydcolor-custom label{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] #tydcolorpop .tydcolor-custom .tydcdval{color:#9fc6d4 !important;}"
    + "html[data-theme=\"dark\"] #tydcolorpop{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydcolorpop button{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-card{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-head h2{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-head p{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-x{background:#23414d !important;border-color:#2e4a5f !important;color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-row{border-bottom-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-row .nm b{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-row .nm span{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-row.off .tydsetup-tgl{background:#23414d !important;color:#c9f0fc !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-row.locked .tydsetup-tgl{background:#23414d !important;color:#c9f0fc !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-foot{border-top-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydsetup .tydsetup-skip{background:#23414d !important;border-color:#2e4a5f !important;color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #tydcolorpop button.on{background:#23414d !important;}"
    + "html[data-theme=\"dark\"] #tydcolorpop .tydcolor-h{color:#9fc6d4 !important;}"
    + "html[data-theme=\"dark\"] #tydcolorpop .tydcolor-note{color:#bcd6e4 !important;}"
    + "html.tyd-cb-protanopia .app,html.tyd-cb-protanopia .wrap{filter:url(#tyd-cb-protanopia);}"
    + "html.tyd-cb-deuteranopia .app,html.tyd-cb-deuteranopia .wrap{filter:url(#tyd-cb-deuteranopia);}"
    + "html.tyd-cb-tritanopia .app,html.tyd-cb-tritanopia .wrap{filter:url(#tyd-cb-tritanopia);}"
    + "html.tyd-cb-achromatopsia .app,html.tyd-cb-achromatopsia .wrap{filter:grayscale(1);}"
    + "html.tyd-cb-protanopia body::before{filter:url(#tyd-cb-protanopia);}"
    + "html.tyd-cb-deuteranopia body::before{filter:url(#tyd-cb-deuteranopia);}"
    + "html.tyd-cb-tritanopia body::before{filter:url(#tyd-cb-tritanopia);}"
    + "html.tyd-cb-achromatopsia body::before{filter:grayscale(1);}"
    + "html[data-theme=\"dark\"].tyd-cb-protanopia body::before{filter:url(#tyd-cb-protanopia) brightness(.42) saturate(.8);}"
    + "html[data-theme=\"dark\"].tyd-cb-deuteranopia body::before{filter:url(#tyd-cb-deuteranopia) brightness(.42) saturate(.8);}"
    + "html[data-theme=\"dark\"].tyd-cb-tritanopia body::before{filter:url(#tyd-cb-tritanopia) brightness(.42) saturate(.8);}"
    + "html[data-theme=\"dark\"].tyd-cb-achromatopsia body::before{filter:grayscale(1) brightness(.42) saturate(.8);}"
    + "html.tyd-cb-vivid .app,html.tyd-cb-vivid .wrap{filter:saturate(1.8) contrast(1.05);}"
    + "html.tyd-cb-vivid body::before{filter:saturate(1.8) contrast(1.05);}"
    + "html[data-theme=\"dark\"].tyd-cb-vivid body::before{filter:saturate(1.5) brightness(.42);}";
  var tydAccSt = document.createElement("style");
  tydAccSt.id = "tydacccss";
  tydAccSt.textContent = tydAccCss;
  document.head.appendChild(tydAccSt);
  /* Profile card loader: the shared popover module rides along on every
     page, so any [data-profile-uid] name on a share or comment opens it. */
  (function tydLoadProfileCard() {
    if (window.TYDShowProfile || document.querySelector("script[data-tydprof]")) return;
    var s = document.createElement("script");
    s.setAttribute("data-tydprof", "1");
    s.src = (location.pathname.indexOf("/brands/") !== -1 ? "../" : "") + "profile-card.js";
    document.head.appendChild(s);
  })();
  /* Block + report loader (Lucy, Nov 12, 2026): the shared moderation
     helper rides along on every page, so any share, comment or chat
     message can hide a blocked member and open a report. */
  (function tydLoadBlock() {
    if (window.TYDBlock || document.querySelector("script[data-tydblock]")) return;
    var s = document.createElement("script");
    s.setAttribute("data-tydblock", "1");
    s.src = (location.pathname.indexOf("/brands/") !== -1 ? "../" : "") + "block.js";
    document.head.appendChild(s);
  })();
  /* Friends-only comment filter loader (Lucy, Nov 12, 2026): the shared
     helper rides along on every page, so comment lists can be filtered
     to Pond friends. */
  (function tydLoadCommentFilter() {
    if (window.TYDFriends || document.querySelector("script[data-tydcmtf]")) return;
    var s = document.createElement("script");
    s.setAttribute("data-tydcmtf", "1");
    s.src = (location.pathname.indexOf("/brands/") !== -1 ? "../" : "") + "comment-filter.js";
    document.head.appendChild(s);
  })();
  /* Friends-only interactions loader (Lucy, Nov 12, 2026): the shared
     helper rides along on every page, so the persistent friends-only
     mode can filter chat and comments to Pond friends. */
  (function tydLoadFriendsOnly() {
    if (window.TYDFriendsOnly || document.querySelector("script[data-tydfo]")) return;
    var s = document.createElement("script");
    s.setAttribute("data-tydfo", "1");
    s.src = (location.pathname.indexOf("/brands/") !== -1 ? "../" : "") + "friends-only.js";
    document.head.appendChild(s);
  })();
  var tydSurf = "#q,.account-bar,.actbtn,.alertrow,.app,.bar,.brand-row,.btn-alt,.btn-ghost,.card,.card:active,.cardrow,.codechip,.coupon,.dashitem,.deal,.fback,.ffront,.fhear,.final,.found-list span,.hint-btn,.hint-panel,.item img,.jadd,.jbody,.jminus,.jnotes,.jtoggle,.kform button,.kiconbtn,.kiconbtn.del,.mini,.mkbadge.priv,.mkbadge.pub,.mkbtn,.mkbtn.ghost,.mkcard,.mkcard input[type=number],.mkcard input[type=text],.mkcard textarea,.mkitem,.mkitem button,.mkitem button.del,.mkvis,.nomatch,.rchip,.res,.res img,.rhelp-chips,.rhelp-form,.rhelp-log,.rhelp-logbar,.rhelp-msgs,.rhelp-panel,.rhelp-teaser,.rlogbtn,.rmsg.bot,.row button,.savedbar,.savedlist a,.side-links a,.social-row a,.soundbtn,.soundbtn.off,.status.ok,.tag,.tag.Brand,.tag.Deal,.tag.Page,.tag.Recipe,.tdcard,.tdcard img,.tdsave,.tile,.toolbar,.tyd-pop,.tyd-pop .lpick,.vowel,.win,.win .deal,.win a.play,.word,input,li.cknext";
  var tydInk = "#no-results,#q,.account-bar .ab-label,.account-bar .ab-who,.actbtn,.alertrow .when,.alertrow a,.alertrow b,.back,.brand-row,.brand-side h3,.card .count,.card .offer,.card a,.card h2,.card h3,.ckprog,.codechip,.count,.dashitem a,.deal .offer,.del-list,.disc,.empty,.fcdate,.fen,.fhear,.fhint,.filter-row label,.filter-row select,.fko,.foot,.foot-links a,.found-list span,.from,.hint-kicker,.hint-panel,.item .brand,.item .note,.item .title,.jadd,.jbadge,.jlab,.jlast,.jminus,.jnotes,.jsave,.jstat,.jtimes,.jtoggle,.kempty,.ken,.kform button,.kko,.kmeta,.meta,.mkbadge.priv,.mkbadge.pub,.mkbtn,.mkbtn.ghost,.mkcard .mkintro,.mkcard label,.mkitem button.del,.mkstatus,.nest,.nomatch,.note,.prefrow .prefgroup,.prefrow label,.quizmsg,.rchip,.rcount,.res .ss,.res .tt,.rhelp-form button,.rhelp-teaser,.rlogbtn,.rlogempty,.rlogitem,.rlogitem .rm,.rm,.rmsg.bot,.row button,.savedbar a,.savedbar b,.savedlist a,.search-row input,.section-title,.side-links a,.side-note,.side-title,.social-row a,.soundbtn,.soundbtn.off,.status.ok,.sub,.tag,.tag.Brand,.tag.Deal,.tag.Page,.tag.Recipe,.tagline,.td-load,.td-search,.td-sub,.tdbrand,.tdoffer,.tdsave,.tile .tname,.topdeals h2,.tyd-add,.tyd-pop,.tyd-pop .lcancel,.tyd-pop .lnew,.tyd-pop .lpick,.tyd-pop h3,.vowel b,.vowel span,.win .affiliate-disclosure,.win .deal .offer,.win .deal-note,.win a.play,.win h2,.win-deals h3,.word .wrom,.word b,.word span,a.back,details > summary .chev,footer,h1,input,label,summary .chev";
  var tydCss = ""
    /* v260: tell the browser this site handles its own light AND dark mode,
       so a phone in dark mode must NOT auto-darken (force-dark) the page.
       Without this, mobile browsers recolor the gradient-background pills
       (.brand-row, .chipbtn) into solid black rectangles with invisible
       dark text — Unni's mobile check, Nov 14, 2026. */
    + "html{color-scheme:light dark;}"
    + "#tydthemebtn,#tydhomebtn{flex:0 0 42px;position:relative;background:#ffd94d;color:#1f5f74;border:2px solid #e8b93c;border-radius:14px;font-weight:800;font-size:17px;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 3px 10px rgba(35,65,77,.18);padding:0;text-decoration:none;display:flex;flex-direction:column;gap:1px;align-items:center;justify-content:center;}"
    /* v298 (Nov 15, 2026, review item 4a): the top-bar Home/Color/bell
       buttons were icon-only, so a new visitor had to guess them from a
       tooltip. Each now carries a small visible label under its icon
       (.tydtoplab, same 10px-caption pattern as the bottom bar). The
       buttons stay 42px wide, so the switcher loses no room; on phones
       (<=480px) the labels hide and the buttons stay 44px icon-only. */
    + "#tydhomebtn .tydtoplab,#tydthemebtn .tydtoplab,#tydbell .tydtoplab{font-size:10px;font-weight:800;line-height:1.1;white-space:nowrap;}"
    + "@media (max-width:480px){#tydhomebtn .tydtoplab,#tydthemebtn .tydtoplab,#tydbell .tydtoplab{display:none;}}"
    + "html:not([data-theme=\"dark\"]){background-color:#bfe6f2;}"
    + "html:not([data-theme=\"dark\"]) body::before{content:\"\";position:fixed;inset:0;z-index:0;background-image:url(\"/images/pond-wallpaper.png\");background-repeat:repeat;background-size:840px 840px;pointer-events:none;}"
    /* v295 (Nov 15, 2026): at wide desktop widths the duck gutters are
       huge and busy, so the wallpaper is softened above 1400px — the
       ducks stay, just fainter, letting the solid blue show through.
       Dark mode is already dimmed (brightness .42), so this is light
       mode only. Mobile is untouched. */
    + "@media (min-width:1400px){html:not([data-theme=\"dark\"]) body::before{opacity:.55;}}"
    + "html:not([data-theme=\"dark\"]) body{background-color:transparent !important;background-image:none !important;}"
    + "html:not([data-theme=\"dark\"]) .app,html:not([data-theme=\"dark\"]) .wrap{position:relative !important;z-index:1 !important;margin-top:18px !important;margin-bottom:18px !important;min-height:calc(100vh - 36px) !important;}"
    + "html:not([data-theme=\"dark\"]).tyd-brand .wrap{background:#bfe6f2;}"
    + "html:not([data-theme=\"dark\"]) #tydnav{background:rgba(255,255,255,.78);}"
    + "@media (max-width:699px){html:not([data-theme=\"dark\"]) .app,html:not([data-theme=\"dark\"]) .wrap{max-width:100vw !important;margin-left:auto !important;margin-right:auto !important;}}"
    + "html[data-theme=\"dark\"] body{background:#0b141f !important;color:#f8fdff !important;}"
    + "html[data-theme=\"dark\"] body::before{content:\"\";position:fixed;inset:0;z-index:0;background-image:url(\"/images/pond-wallpaper.png\");background-repeat:repeat;background-size:840px 840px;pointer-events:none;filter:brightness(.42) saturate(.8);}"
    + "html[data-theme=\"dark\"] .app,html[data-theme=\"dark\"] .wrap{position:relative !important;z-index:1 !important;margin-top:18px !important;margin-bottom:18px !important;min-height:calc(100vh - 36px) !important;}"
    + "html[data-theme=\"dark\"] .wrap{background:var(--tyd-acc-dark, #172635) !important;}"
    + "@media (max-width:699px){html[data-theme=\"dark\"] .app,html[data-theme=\"dark\"] .wrap{max-width:100vw !important;margin-left:auto !important;margin-right:auto !important;}}"
    + "html[data-theme=\"dark\"] " + tydSurf.split(",").join(",html[data-theme=\"dark\"] ") + "{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] " + tydInk.split(",").join(",html[data-theme=\"dark\"] ") + "{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] .timebar label{color:#3f6b7a !important;}"
    + "html[data-theme=\"dark\"] .timebar .tf-unk{accent-color:#1f5f74;}"
    + "html[data-theme=\"dark\"] .catnavlab{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .units .ulabel,html[data-theme=\"dark\"] .units .unote{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .panel .box [style*=\"color:#3f6b7a\"],html[data-theme=\"dark\"] .panel .box [style*=\"color: #3f6b7a\"]{color:#3f6b7a !important;}"
    + "html[data-theme=\"dark\"] #kp-opts button.kp-right{background:#1d4a2c !important;color:#d9f2e2 !important;border-color:#7cc79b !important;}"
    + "html[data-theme=\"dark\"] #kp-opts button.kp-wrong{background:#5a1f1f !important;color:#fdecec !important;border-color:#f0b4b4 !important;}"
    + "html[data-theme=\"dark\"] #ktq-opts button.ktq-right{background:#1d4a2c !important;color:#d9f2e2 !important;border-color:#7cc79b !important;}"
    + "html[data-theme=\"dark\"] #ktq-opts button.ktq-wrong{background:#5a1f1f !important;color:#fdecec !important;border-color:#f0b4b4 !important;}"
    + "html[data-theme=\"dark\"] .sharemsg{color:#b7e4c7 !important;}"
    + "html[data-theme=\"dark\"] .mkintro{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .card .actions a{color:#1f5f74 !important;background:#eaf6fa !important;border-color:#9fc6d4 !important;}"
    + "html[data-theme=\"dark\"] .back a,html[data-theme=\"dark\"] a.back{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .btn-alt,html[data-theme=\"dark\"] .btn-ghost{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] .syncnote,html[data-theme=\"dark\"] .syncnote a{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .pfood .fname{color:#ffd94d !important;}"
    + "html[data-theme=\"dark\"] .gitem .gtext{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] .shelfcard .shelfitems{background:linear-gradient(180deg,#3a2a18,#2a1e10) !important;}"
    + "html[data-theme=\"dark\"] .shelfcard.fridge .shelfitems{background:linear-gradient(180deg,#1d3442,#14242e) !important;}"
    + "html[data-theme=\"dark\"] .shelfcard.freezer .shelfitems{background:linear-gradient(180deg,#1a2c3d,#101e2a) !important;}"
    + "html[data-theme=\"dark\"] .shelfcard .plank{background:linear-gradient(180deg,#6b4a26,#4a3018) !important;}"
    + "html[data-theme=\"dark\"] .shelfcard.fridge .plank,html[data-theme=\"dark\"] .shelfcard.freezer .plank{background:linear-gradient(180deg,#2e4a5f,#1d3442) !important;}"
    + "html[data-theme=\"dark\"] .shelfhead .lochead,html[data-theme=\"dark\"] .areahead{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #whatsnew{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #whatsnew h3,html[data-theme=\"dark\"] #whatsnew ul{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] .brand-logo{background:#ffffff !important;border-radius:6px;padding:2px 4px;}"
    + "html[data-theme=\"dark\"] .xduck{background:#ffffff !important;}"
    + "html[data-theme=\"dark\"] .footer-duck{filter:invert(1) drop-shadow(0 3px 5px rgba(255,255,255,.2)) !important;}"
    + "html[data-theme=\"dark\"] #tydbell{background:#1f5f74 !important;border-color:#0f3d4a !important;color:#ffd94d !important;}"
    /* v298: the bell's dark-mode rule set the background but no color, so
       the new visible "Alerts" label would be dark teal on dark teal.
       The label now reads yellow in dark mode (the emoji is unaffected). */
    + "html[data-theme=\"dark\"] footer a{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .cab-freezer{background:linear-gradient(180deg,#1a2c3d,#101e2a) !important;}"
    + "html[data-theme=\"dark\"] .cab-freezer::before{opacity:.2 !important;}"
    + "html[data-theme=\"dark\"] .cab-freezer .door.single{background:linear-gradient(180deg,#1a2c3d,#101e2a) !important;box-shadow:inset 0 0 0 6px #2e4a5f !important;}"
    + "html[data-theme=\"dark\"] .cab-freezer .areahead,html[data-theme=\"dark\"] .cab-freezer .unithead{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #day-heading,html[data-theme=\"dark\"] #week-heading,html[data-theme=\"dark\"] .daynav h2{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .pfood .fhave,html[data-theme=\"dark\"] .mininame{color:#bcd6e4 !important;}"
    + "html[data-theme=\"dark\"] #kp-card{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #kp-q{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] #kp-a,html[data-theme=\"dark\"] #kp-msg{color:#eefaff !important;}"
    + "html[data-theme=\"dark\"] #kp-hint{color:#bcd6e4 !important;}"
    + "html[data-theme=\"dark\"] h1{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] footer{color:#d7ecf5 !important;}"
    /* v342 (Nov 17, 2026, Lucy 2:45 AM "I can't see this"): the homepage
       footer in dark mode — "More in the Pond", the Protect the Pond /
       Invite a friend links, and the slogan line were dark teal/grey on
       dark. They live in the page's own <style> (index.html:233/265/
       267-268), so the [style*=...] catch-all below never sees them and
       none of them is in tydInk. Same pill-button pattern also covers
       #whatsnew-more and .brand-more-btn on the same page. Links
       #c9f0fc, body text #d7ecf5, matching footer / .foot-links a. */
    + "html[data-theme=\"dark\"] #explore-more-btn,html[data-theme=\"dark\"] #whatsnew-more,html[data-theme=\"dark\"] .brand-more-btn{color:#c9f0fc !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] .support-line,html[data-theme=\"dark\"] .tyd-nest-note{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] .support-line a{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] input:not([type=\"checkbox\"]):not([type=\"radio\"]):not([type=\"range\"]),html[data-theme=\"dark\"] select,html[data-theme=\"dark\"] textarea{background:#101e2c !important;color:#f8fdff !important;border-color:#33536b !important;}"
    + "html[data-theme=\"dark\"] ::placeholder{color:#bcd6e4 !important;}"
    + "html[data-theme=\"dark\"] th,html[data-theme=\"dark\"] td{border-color:#2c465a !important;}"
    + "html[data-theme=\"dark\"] #tydnav{background:rgba(13,24,36,.78) !important;border-color:#2c465a !important;}"
    + "html[data-theme=\"dark\"] #tydswitch{background:var(--tyd-acc-dark, #172635) !important;box-shadow:0 2px 8px rgba(0,0,0,.35);}"
    + "html[data-theme=\"dark\"] #tydnav a,html[data-theme=\"dark\"] #tydnav button{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] #tydnav .on{color:#ffffff !important;background:transparent !important;}"
    /* v341 sliding pill: in dark mode the active tab sits on the accent
       pill (white on Pond Blue is 4.57:1; named accents use the
       --tyd-acc-ink rule above). The pill is the highlight now, so the
       tab itself has no background. */
    + "html[data-theme=\"dark\"] #tydnavpill{box-shadow:0 2px 10px rgba(0,0,0,.45);}"
    + "html[data-theme=\"dark\"] #tydinstall .box{background:var(--tyd-acc-dark, #172635) !important;color:#f8fdff !important;}"
    + "html[data-theme=\"dark\"] #tydinstall h3{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] #tydthemebtn,html[data-theme=\"dark\"] #tydhomebtn{background:#1f5f74 !important;border-color:#0f3d4a !important;color:#ffd94d;}"
    + "html[data-theme=\"dark\"] small{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] [style*=\"background:#fff;\"],html[data-theme=\"dark\"] [style*=\"background: #fff;\"],html[data-theme=\"dark\"] [style*=\"background:#ffffff\"],html[data-theme=\"dark\"] [style*=\"background:#f2fafc\"],html[data-theme=\"dark\"] [style*=\"background:#eaf7fb\"]{background:var(--tyd-acc-dark, #172635) !important;}"
    + "html[data-theme=\"dark\"] [style*=\"color:#1f5f74\"],html[data-theme=\"dark\"] [style*=\"color: #1f5f74\"],html[data-theme=\"dark\"] [style*=\"color:#23414d\"],html[data-theme=\"dark\"] [style*=\"color:#5b7d89\"],html[data-theme=\"dark\"] [style*=\"color:#4a6b78\"],html[data-theme=\"dark\"] [style*=\"color:#123a4d\"],html[data-theme=\"dark\"] [style*=\"color:#3f6b7a\"],html[data-theme=\"dark\"] [style*=\"color: #3f6b7a\"]{color:#eefaff !important;}";
  var tydSt = document.createElement("style");
  tydSt.id = "tydthemecss";
  tydSt.textContent = tydCss;
  document.head.appendChild(tydSt);
  /* Color control (Lucy, Nov 13, 2026): one 🎨 Color button on every
     page, opening a single panel with both the light/dark Mode and the
     accent colors, so the color controls live in one place and stay out
     of the way. It replaces the old separate dark/light toggle and the
     Home-only accent button. The Mode and Accent choices are the same
     ones as before (tydTheme in localStorage, tydAccent in localStorage
     and users/{uid}.themeAccent), so a member's colors still follow
     them across devices. */
  function tydSetTheme(v) {
    tydTheme = v === "dark" ? "dark" : "light";
    if (tydTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("tydTheme", tydTheme); } catch (e) {}
    if (window.TYDAccountPush) window.TYDAccountPush({ themeMode: tydTheme });
    tydPaintColorPop();
  }
  /* Custom color setters: picking a color or moving a slider switches
     the accent to Custom on the spot, so the change shows at once. */
  function tydCustomSave() {
    try {
      localStorage.setItem("tydAccentCustom", tydCustomColor);
      localStorage.setItem("tydAccentLight", String(tydCustomLight));
      localStorage.setItem("tydAccentDark", String(tydCustomDark));
    } catch (e) {}
    if (typeof accPushAccount === "function") accPushAccount();
  }
  function tydSetCustomColor(hex) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    tydCustomColor = hex.toLowerCase();
    tydCustomSave();
    if (tydAccent !== "custom") { if (window.TYDSetAccent) window.TYDSetAccent("custom"); }
    else { tydApplyCustomVars(); tydPaintColorPop(); }
  }
  function tydSetCustomLight(n) {
    if (isNaN(n)) return;
    tydCustomLight = Math.max(70, Math.min(95, n));
    var v = document.getElementById("tydcustomlightval");
    if (v) v.textContent = tydCustomLight + "%";
    tydCustomSave();
    if (tydAccent !== "custom") { if (window.TYDSetAccent) window.TYDSetAccent("custom"); }
    else { tydApplyCustomVars(); tydPaintColorPop(); }
  }
  window.TYDSetCustomColor = function (hex) { tydSetCustomColor(hex); };
  window.TYDSetCustomLight = function (n) { tydSetCustomLight(n); };
  window.TYDSetCustomDark = function (n) { tydSetCustomDark(n); };
  function tydSetCustomDark(n) {
    if (isNaN(n)) return;
    tydCustomDark = Math.max(40, Math.min(90, n));
    var v = document.getElementById("tydcustomdarkval");
    if (v) v.textContent = tydCustomDark + "%";
    tydCustomSave();
    if (tydAccent !== "custom") { if (window.TYDSetAccent) window.TYDSetAccent("custom"); }
    else { tydApplyCustomVars(); tydPaintColorPop(); }
  }
  function tydPaintColorPop() {
    var pop = document.getElementById("tydcolorpop");
    if (!pop) return;
    var ms = pop.querySelectorAll("[data-mode]");
    ms.forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-mode") === tydTheme); });
    var as = pop.querySelectorAll("[data-acc]");
    as.forEach(function (b) {
      var on = b.getAttribute("data-acc") === tydAccent;
      b.classList.toggle("on", on);
      var ck = b.querySelector(".ck");
      if (on && !ck) { var s = document.createElement("span"); s.className = "ck"; s.textContent = "✓"; b.appendChild(s); }
      if (!on && ck) ck.remove();
    });
    var cbs = pop.querySelectorAll("[data-cb]");
    cbs.forEach(function (b) {
      var on = b.getAttribute("data-cb") === tydColorBlind;
      b.classList.toggle("on", on);
      var ck = b.querySelector(".ck");
      if (on && !ck) { var s = document.createElement("span"); s.className = "ck"; s.textContent = "✓"; b.appendChild(s); }
      if (!on && ck) ck.remove();
    });
  }
  function tydToggleColorPop() {
    var pop = document.getElementById("tydcolorpop");
    var btn = document.getElementById("tydthemebtn");
    if (pop) { pop.remove(); return; }
    pop = document.createElement("div");
    pop.id = "tydcolorpop";
    var modes = '<div class="tydcolor-h">Mode</div><div class="tydcolor-modes"><button type="button" data-mode="light"' + (tydTheme === "light" ? ' class="on"' : "") + '>☀️ Light</button><button type="button" data-mode="dark"' + (tydTheme === "dark" ? ' class="on"' : "") + '>🌙 Dark</button></div>';
    var accs = '<div class="tydcolor-h">Accent</div>' + TYD_ACCENTS.map(function (k) {
      return '<button type="button" data-acc="' + k + '"' + (k === tydAccent ? ' class="on"' : "") + '><span class="dot" style="background:' + TYD_ACCENT_DOTS[k] + '"></span>' + TYD_ACCENT_NAMES[k] + (k === tydAccent ? '<span class="ck">✓</span>' : "") + '</button>';
    }).join("");
    var cust = '<div class="tydcolor-h">Custom color</div><div class="tydcolor-custom">'
      + '<label>Pick a color <input type="color" id="tydcustomcolor" value="' + tydCustomColor + '" aria-label="Pick a custom accent color"></label>'
      + '<label>Light mode <input type="range" id="tydcustomlight" min="70" max="95" value="' + tydCustomLight + '" aria-label="How light light mode is"><span class="tydcdval" id="tydcustomlightval">' + tydCustomLight + '%</span></label>'
      + '<label>Dark mode <input type="range" id="tydcustomdark" min="40" max="90" value="' + tydCustomDark + '" aria-label="How dark dark mode is"><span class="tydcdval" id="tydcustomdarkval">' + tydCustomDark + '%</span></label>'
      + '</div>';
    var cbs = '<div class="tydcolor-h">Color blindness preview</div><div class="tydcolor-note">Preview only. If you have color blindness, use Boost colors.</div>' + TYD_CB_TYPES.map(function (k) {
      return '<button type="button" data-cb="' + k + '"' + (k === tydColorBlind ? ' class="on"' : "") + '>' + TYD_CB_NAMES[k] + (k === tydColorBlind ? '<span class="ck">✓</span>' : "") + '</button>';
    }).join("");
    pop.innerHTML = modes + accs + cust + cbs;
    var ccIn = pop.querySelector("#tydcustomcolor");
    if (ccIn) ccIn.addEventListener("input", function () { tydSetCustomColor(ccIn.value); });
    var clIn = pop.querySelector("#tydcustomlight");
    if (clIn) clIn.addEventListener("input", function () { tydSetCustomLight(parseInt(clIn.value, 10)); });
    var cdIn = pop.querySelector("#tydcustomdark");
    if (cdIn) cdIn.addEventListener("input", function () { tydSetCustomDark(parseInt(cdIn.value, 10)); });
    document.body.appendChild(pop);
    var b = btn.getBoundingClientRect();
    var top = Math.min(window.innerHeight - 340, b.bottom + 8);
    pop.style.top = top + "px";
    // Cap the panel so its bottom stays above the bottom navigation,
    // instead of relying only on the CSS max-height.
    pop.style.maxHeight = Math.max(200, window.innerHeight - top - 130) + "px";
    pop.style.right = "12px";
    pop.addEventListener("click", function (ev) {
      var m = ev.target && ev.target.closest ? ev.target.closest("[data-mode]") : null;
      if (m) { tydSetTheme(m.getAttribute("data-mode")); return; }
      var t = ev.target && ev.target.closest ? ev.target.closest("[data-acc]") : null;
      if (t && window.TYDSetAccent) window.TYDSetAccent(t.getAttribute("data-acc"));
      var cb = ev.target && ev.target.closest ? ev.target.closest("[data-cb]") : null;
      if (cb && window.TYDSetColorBlind) window.TYDSetColorBlind(cb.getAttribute("data-cb"));
    });
  }
  function tydPlaceThemeBtn() {
    /* No-op now (Nov 13, 2026): the Color button lives in the top bar
       beside the bell, so there is no floating pill left to place. Kept
       because resize timers still call it. */
    return;
  }
  window.addEventListener("resize", function () { tydPlaceThemeBtn(); });
  setTimeout(tydPlaceThemeBtn, 400);
  setTimeout(tydPlaceThemeBtn, 1300);
  function tydAddBtn() {
    if (document.getElementById("tydthemebtn") || !document.body) return;
    var b = document.createElement("button");
    b.id = "tydthemebtn";
    b.type = "button";
    b.setAttribute("aria-label", "Change colors");
    b.setAttribute("title", "Change colors");
    b.innerHTML = "🎨<span class=\"tydtoplab\">Colors</span>";
    b.addEventListener("click", function (e) { e.stopPropagation(); tydToggleColorPop(); });
    document.body.appendChild(b);
    document.addEventListener("click", function (e) {
      var pop = document.getElementById("tydcolorpop");
      if (pop && !pop.contains(e.target) && e.target !== b) pop.remove();
    });
  }
  if (document.body) tydAddBtn();
  else document.addEventListener("DOMContentLoaded", tydAddBtn);


  /* GoatCounter search events (Nov 10, 2026): one anonymous event per
     performed search, carrying only the normalized search term, nothing
     else. Called debounced from the home page filter and search.html.
     Event names look like search-home-tyd10 or search-pond-chicken. */
  window.tydSearchEvent = function (page, term) {
    var slug = String(term || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    if (!slug) { window.tydSearchEvent._last = ""; return; }
    var key = page + ":" + slug;
    if (window.tydSearchEvent._last === key) return;
    window.tydSearchEvent._last = key;
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: "search-" + page + "-" + slug, event: true });
    }
  };
  if (document.getElementById("tydnav")) return;
  var inBrands = /\/brands\//.test(location.pathname);
  var base = inBrands ? "../" : "";
  var file = location.pathname.split("/").pop() || "index.html";
  /* Page name without the .html ending (see the part detection below). */
  var fbase = file.replace(/\.html$/, "");

  var css = ""
    /* Threads-style floating pill (Lucy, Nov 15, 2026, v300): the bottom
       bar is a centered pill that floats with a gap below it, NOT a
       full-width bar attached to the bottom edge. Icons only, no text
       labels (labels stay in the DOM + aria-labels/tooltips, so nothing
       is a mystery and screen readers still get them). Each section
       keeps its OWN items (Lucy's standing rule) — only the container
       shape changes to the pill. The active item gets a soft accent
       pill behind its icon. v326 (Nov 16, 2026, Lucy: "transparent
       ish"): the pill is translucent — rgba .78 + backdrop blur, so
       page content shows faintly through it while the icons stay
       legible. Position, size and buttons unchanged. */
    + "#tydnav{position:fixed;left:50%;transform:translateX(-50%);right:auto;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9990;background:rgba(255,255,255,.78);backdrop-filter:blur(12px) saturate(1.25);-webkit-backdrop-filter:blur(12px) saturate(1.25);border:2px solid #bcd9e4;border-radius:999px;box-shadow:0 8px 24px rgba(35,65,77,.22);display:flex;justify-content:space-evenly;align-items:center;gap:2px;padding:6px 10px;width:min(560px, calc(100vw - 32px));max-width:calc(100vw - 24px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "#tydnav a,#tydnav button{flex:none;background:none;border:none;cursor:pointer;text-decoration:none;color:#5b7d89;font-size:0;font-weight:600;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:2px;padding:8px 10px;border-radius:999px;font-family:inherit;}"
    + "#tydnav .ic{font-size:20px;line-height:1;}"
    + "@media (max-width:699px){#tydnav{padding:5px 6px;}#tydnav a,#tydnav button{padding:7px 8px;}#tydnav .ic{font-size:19px;}}"
    /* Bottom-menu labels (v340, Lucy): the pill showed icons only, so
       it was unclear what each one did. Every bar item now carries a
       small label under its icon, on phones as well as desktop. The
       label lives in .nlb; the bar stacks icon over label. */
    + "#tydnav>a,#tydnav>button{flex-direction:column;gap:0;padding:6px 9px;}"
    + "#tydnav .nlb{font-size:9.5px;font-weight:700;line-height:1.15;white-space:nowrap;}"
    + "@media (max-width:699px){#tydnav>a,#tydnav>button{padding:5px 7px;}#tydnav .nlb{font-size:9px;}}"
    /* Sliding-pill active indicator (v341, Lucy picked option 1 from the
       Tab Bar Part 12 reel): one raised accent pill slides behind the
       active tab. It is positioned by JS (left/width from the active
       tab's offset), sits UNDER the tabs (z-index 0; the tabs are lifted
       to 1) so the v340 .nlb labels are never covered, and uses
       --tyd-acc so it follows the Color-panel accent. The settle uses an
       overshoot cubic-bezier; .stretch is the fast mid-flight phase
       (leading edge first, pill briefly ~1.5-2 tabs wide); .instant (and
       the reduced-motion query) moves it with no animation at all. */
    + "#tydnav>a,#tydnav>button{position:relative;z-index:1;}"
    + "#tydnavpill{position:absolute;top:6px;bottom:6px;left:0;width:0;border-radius:999px;background:var(--tyd-acc, #2b7ea0);box-shadow:0 2px 8px rgba(35,65,77,.25);z-index:0;pointer-events:none;transition:left .45s cubic-bezier(.34,1.56,.64,1),width .45s cubic-bezier(.34,1.56,.64,1);}"
    + "#tydnavpill.stretch{transition:left .18s ease-out,width .18s ease-out;}"
    + "#tydnavpill.instant{transition:none !important;}"
    + "@media (prefers-reduced-motion: reduce){#tydnavpill{transition:none !important;animation:none !important;}}"
    + "#tydnav{transition:transform .25s ease;}"
    + "body.tyd-nav-closed #tydnav{transform:translateX(-50%) translateY(calc(100% + 80px));}"
    + "body.tyd-nav-closed{padding-bottom:64px !important;}"
    + "body.tyd-nav-closed .tyd-pill{bottom:76px !important;}"
    + "body.tyd-nav-closed .gpill{bottom:16px !important;}"
    + "body.tyd-nav-closed .tyd-toast{bottom:140px !important;}"
    + "#tydnavfab{position:fixed;right:12px;bottom:calc(80px + env(safe-area-inset-bottom));z-index:9992;background:#ffd94d;color:#6b5900;border:2px solid #e8c832;border-radius:999px;padding:10px 16px;font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 4px 14px rgba(35,65,77,.25);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;transition:bottom .25s ease,opacity .25s ease;}"
    + "#tydnavfab .fic img{display:inline-block;height:20px;width:20px;border-radius:50%;object-fit:cover;vertical-align:-5px;background:#bfe6f2;border:2px solid #fff;box-sizing:border-box;box-shadow:0 1px 3px rgba(35,65,77,.25);}"
    + "@media (max-width:699px){#tydnavfab{width:44px;height:44px;padding:0;border-radius:50%;font-size:18px;display:flex;align-items:center;justify-content:center;}#tydnavfab .ftx{display:none;}#tydnavfab .fic img{width:40px;height:40px;vertical-align:0;}#tydnavfab.tyd-fab-fade{opacity:.35;}}"
    /* v260: the pill used to fade to opacity 0 while scrolling (and iOS
       momentum scrolling kept resetting the 400ms timer), so after closing
       the menu it could stay a near-invisible ghost for seconds. It now
       fades only to .35 and stays tappable, so it is always findable. */
    + "body.tyd-nav-open #tydnavfab{bottom:calc(80px + env(safe-area-inset-bottom));}"
    + "body.tyd-nav-closed #tydnavfab{bottom:calc(12px + env(safe-area-inset-bottom));}"
    + "#tydnav .on{color:var(--tyd-acc-ink, #ffffff);font-weight:800;background:transparent;}"
    /* Floating search pill (Lucy, Nov 18, 2026, v364): tapping Search in
       the bottom menu pops this frosted bar up just above the nav, so she
       can search from anywhere without scrolling to the top or leaving
       the page. Matches drop down from the search index; Enter (or See
       all results) opens the scoped search page. Hidden until Search. */
    + "#tydfloatsearch{position:fixed;touch-action:pan-x;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));z-index:9991;width:min(560px,calc(100vw - 32px));display:none;align-items:center;gap:8px;padding:8px 10px 8px 12px;border-radius:999px;background:rgba(255,255,255,.78);backdrop-filter:blur(12px) saturate(1.25);-webkit-backdrop-filter:blur(12px) saturate(1.25);border:2px solid #bcd9e4;box-shadow:0 8px 24px rgba(35,65,77,.22);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "#tydfloatsearch.open{display:flex;}"
    + "#tydfloatsearch input{flex:1;min-width:0;border:0;background:transparent;outline:none;font:inherit;font-size:16px;color:#23414d;}"
    + "#tydfloatsearch input::placeholder{color:#5a7a88;}"
    + "#tydfloatsearch input::-webkit-search-cancel-button{display:none;}"
    + "#tydfloatsearch .fs-scope{flex:0 0 auto;border:2px solid #bcd9e4;background:#eaf6fb;color:#1f5f74;font:inherit;font-size:12.5px;font-weight:800;border-radius:999px;padding:6px 10px;cursor:pointer;max-width:118px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
    + "#tydfloatsearch .fs-scope.on{background:#1f5f74;color:#fff;border-color:#174a5b;}"
    + "#tydfloatsearch .fs-ico{flex:0 0 auto;font-size:17px;}"
    + "#tydfloatsearch .fs-clear{flex:0 0 auto;border:0;background:transparent;font-size:20px;line-height:1;color:#5a7a88;cursor:pointer;padding:4px 6px;display:none;}"
    + "#tydfloatsearch.has-q .fs-clear{display:block;}"
    + "#tydfloatsearchpop{position:fixed;touch-action:pan-x;left:50%;transform:translateX(-50%);bottom:calc(140px + env(safe-area-inset-bottom));z-index:9991;width:min(560px,calc(100vw - 32px));background:rgba(255,255,255,.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:2px solid #bcd9e4;border-radius:16px;box-shadow:0 12px 32px rgba(35,65,77,.3);overflow:hidden;display:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "#tydfloatsearchpop.open{display:block;}"
    + "#tydfloatsearchpop a{display:flex;align-items:baseline;gap:8px;padding:10px 14px;color:#1f5f74;text-decoration:none;font-size:14.5px;font-weight:700;border-bottom:1.5px solid #d9edf4;}"
    + "#tydfloatsearchpop a:last-child{border-bottom:none;}"
    + "#tydfloatsearchpop a .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
    + "#tydfloatsearchpop a .s{flex:0 0 auto;font-size:11.5px;font-weight:800;color:#5b7a87;}"
    + "#tydfloatsearchpop a.all{background:#fff8d6;color:#6b5900;}"
    + "html[data-theme=\"dark\"] #tydfloatsearch{background:rgba(23,38,53,.78);border-color:#2a4a5a;box-shadow:0 8px 24px rgba(0,0,0,.45);}"
    + "html[data-theme=\"dark\"] #tydfloatsearch input{color:#eefaff;}"
    + "html[data-theme=\"dark\"] #tydfloatsearch input::placeholder{color:#9db8c4;}"
    + "html[data-theme=\"dark\"] #tydfloatsearch .fs-scope{background:#1d3442;color:#c9f0fc;border-color:#2a4a5a;}"
    + "html[data-theme=\"dark\"] #tydfloatsearch .fs-scope.on{background:#c9f0fc;color:#1f5f74;border-color:#c9f0fc;}"
    + "html[data-theme=\"dark\"] #tydfloatsearch .fs-clear{color:#9db8c4;}"
    + "html[data-theme=\"dark\"] #tydfloatsearchpop{background:rgba(23,38,53,.94);border-color:#2a4a5a;}"
    + "html[data-theme=\"dark\"] #tydfloatsearchpop a{color:#d7ecf5;border-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydfloatsearchpop a .s{color:#9fc3d2;}"
    + "html[data-theme=\"dark\"] #tydfloatsearchpop a.all{background:#3a2f10;color:#ffd94d;}"
    + "@media print{#tydfloatsearch,#tydfloatsearchpop{display:none !important;}}"
    + "body.tyd-floatsearch-open #tydnavfab{bottom:calc(140px + env(safe-area-inset-bottom)) !important;}"
    /* v341 sliding pill: the active tab sits ON the accent pill, so its
       text is the dark accent ink (white on the default Pond Blue,
       4.57:1), and the pill — not a background on the tab — is the
       highlight. The icon stays a dark outline; the pill is the color. */
    + "#tydnavmenu{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(100% + 8px);width:min(1120px,94vw);z-index:9994;background:#fff;border:2px solid #bcd9e4;border-radius:14px;box-shadow:0 12px 28px rgba(35,65,77,.28);padding:6px;text-align:left;max-height:min(55vh,520px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;}"
    /* v307: the open Menu panel was up to 74vh/660px tall on desktop, so it covered the footer and the Save buttons underneath it. Same 55vh cap as phones (v261), so the page stays visible above the panel. It still closes on any tap outside it. */
    /* v261: on phones the open Menu panel was up to 74vh tall, so it covered most of the page (it hid the "See all of today's deals" link). Cap it at 55vh on phones so the page stays visible above it. */
    + "@media (max-width:699px){#tydnavmenu{max-height:min(55vh,480px);}}"
    + "#tydnavmenu .tydnavgrp{padding:10px 12px 2px;}"
    + "#tydnavmenu .tydnavgrp b{display:block;font-size:13px;color:#1f5f74;}"
    + "#tydnavmenu .tydnavgrp span{display:block;font-size:11.5px;font-weight:600;color:#5b7a87;}"
    + "#tydnavmenu .tydnavpick{display:none;padding:12px 12px 0;font-size:15px;font-weight:800;color:#1f5f74;}"
    + "@media (min-width:700px){#tydnavmenu .tydnavpick{display:block;}}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydnavpick{color:#c9f0fc !important;}"
    + "#tydnavmenu a,#tydnavmenu button{display:flex;flex-direction:row;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:9px 12px;border-radius:9px;color:#1f5f74;font-weight:700;font-size:14.5px;text-decoration:none;border-bottom:1.5px solid #d9edf4;background:none;border-top:none;border-left:none;border-right:none;cursor:pointer;font-family:inherit;text-align:left;}"
    + "#tydnavmenu a .ic,#tydnavmenu button .ic{font-size:18px;line-height:1;}"
    + "#tydnavmenu a.cur{background:#fff3b0;color:#6b5900;}"
    + "#tydnavmenu a.last{border-bottom:none;}"
    + "html[data-theme=\"dark\"] #tydnavmenu{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydnavmenu a,html[data-theme=\"dark\"] #tydnavmenu button{color:#d7ecf5 !important;border-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydnavgrp b{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydnavgrp span{color:#9fc3d2 !important;}"
    + "html[data-theme=\"dark\"] #tydnavmenu a.cur{background:#23414d !important;color:#ffd94d !important;}"
    + ".phelp-launch,.rhelp-launch,.hfloat-launch,.rhelp-teaser{display:none !important;}"
    /* v307: the floating pill is ~52px tall at 12px above the bottom, and the Hide-bar button sits at 80px when the bar is open, so the page needs 132px of clearance at its end (was 118px — the button's top edge could still cover the last line). scroll-padding keeps anchor jumps and scrolled-into-view targets from landing underneath the pill. */
    + "html{scroll-padding-bottom:96px !important;}"
    + "body{padding-bottom:132px !important;}"
    /* v308: the OPEN Menu panel rises up to 55vh/520px above the pill, so at the bottom of a page it still covered the footer — scrolling down could not bring the footer into view because the page ended 132px below it. While the panel is open the page gets that much extra scroll room at its end, so the footer can scroll up above the panel. The :has() rule tracks the panel's hidden state, so every open/close path (Menu button, outside tap, Install/Setup rows) gets it with no extra JS. */
    + "body:has(#tydnavmenu:not([hidden])){padding-bottom:calc(132px + min(55vh,520px)) !important;}"
    + "html.tyd-lg body{zoom:1.14;}"
    + ".tyd-pill{bottom:100px !important;}"
    + ".gpill{bottom:100px !important;left:12px;}"
    + ".tyd-toast{bottom:172px !important;}"
    + ".prow2 input[type=date]{max-width:320px;}"
    + "input[type=date]{height:43px;min-height:0;box-sizing:border-box;}"
    + "body.tyd-nav-open .tyd-pill{bottom:150px !important;}"
    + "body.tyd-nav-open .tyd-toast{bottom:216px !important;}"
    + "body.tyd-nav-open .rhelp-launch{bottom:150px !important;}"
    + "body.tyd-nav-open .rhelp-panel{bottom:150px !important;}"
    + "body.tyd-nav-open .phelp-launch{bottom:150px !important;}"
    + "body.tyd-nav-open .phelp-panel{bottom:150px !important;}"
    + "body.tyd-nav-open .hfloat-launch{bottom:150px !important;}"
    + "body.tyd-nav-open .hfloat-panel{bottom:150px !important;}"
    /* Floating pills vs page content (Nov 13, 2026): the help pills,
       Menu pill and bottom nav are all fixed to the bottom-right, so on
       phones they sit on top of footer links and buttons. The pills stay
       visible (never hidden), but they are moved a little higher, made
       smaller on phones, and hidden only while their own panel is open
       (the panel has its own close button, so the launch pill is
       redundant then). Extra bottom padding on phones lets the last
       footer content scroll well above the fixed stack, so footer links
       and the bottom nav are reachable. The Color panel
       (#tydcolorpop, z-index 10100) still sits above the help pills. */
    + ".phelp-launch,.rhelp-launch,.hfloat-launch{bottom:calc(96px + env(safe-area-inset-bottom)) !important;}"
    + "body.tyd-nav-open .phelp-launch,body.tyd-nav-open .rhelp-launch,body.tyd-nav-open .hfloat-launch{bottom:calc(158px + env(safe-area-inset-bottom)) !important;}"
    + "@media (max-width:699px){.phelp-launch,.rhelp-launch,.hfloat-launch{padding:9px 12px !important;font-size:13px !important;}body{padding-bottom:132px !important;}footer{padding-bottom:24px !important;}.app,.wrap{padding-bottom:32px !important;}}"
    + "body:has(.phelp-panel.show) .phelp-launch,body:has(.rhelp-panel.show) .rhelp-launch,body:has(.hfloat-panel.show) .hfloat-launch{display:none !important;}"
    /* Horizontal chip rows (Deals brand chips, side links, recipe
       categories): they already scroll, but the last chip was cut off
       at the right edge with no sign you can scroll. Thin scrollbars,
       snap, and a fade at the right edge now signal the sideways scroll. */
    + ".side-links,.brand-list,.catnav{scrollbar-width:thin;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;scroll-padding-right:28px;mask-image:linear-gradient(90deg,#000 94%,transparent 100%);-webkit-mask-image:linear-gradient(90deg,#000 94%,transparent 100%);}"
    + ".side-links > *,.brand-list > *,.catnav > *{scroll-snap-align:start;}"
    + "#tydinstall{position:fixed;inset:0;z-index:9999;background:rgba(35,65,77,.45);display:none;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "#tydinstall.show{display:flex;}"
    + "#tydnav .spin .ic{display:inline-block;animation:tydspin 0.8s linear infinite;}"
    + "@keyframes tydspin{to{transform:rotate(360deg);}}"
    + "#tydinstall .box{background:#fff;border-radius:18px;padding:22px;max-width:360px;width:100%;color:#23414d;}"
    + "#tydinstall h3{margin:0 0 8px;color:#1f5f74;font-size:18px;}"
    + "#tydinstall p{font-size:14.5px;line-height:1.55;margin:6px 0;}"
    + "#tydinstall button{margin-top:12px;width:100%;border:none;background:#1f5f74;color:#fff;font-weight:800;font-size:15px;border-radius:999px;padding:11px;cursor:pointer;font-family:inherit;}"
    + "#tydswitch{position:fixed;top:0;left:0;right:0;z-index:9995;display:flex;justify-content:center;background:var(--tyd-acc-soft, #bfe6f2);box-shadow:0 2px 8px rgba(35,65,77,.10);padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + "#tydswitchin{position:relative;width:min(1120px,94vw);display:flex;gap:8px;align-items:stretch;}"
    + "@media (max-width:699px){#tydswitchin{width:100vw;padding:0 10px;box-sizing:border-box;}}"
    + ".tydtoparrow{flex:0 0 42px;background:#ffd94d;color:#1f5f74;border:2px solid #e8b93c;border-radius:14px;font-weight:800;font-size:17px;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(35,65,77,.18);display:flex;align-items:center;justify-content:center;}"
    + "#tydswitchbtn{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;width:100%;box-sizing:border-box;background:#ffd94d;color:#1f5f74;border:2px solid #e8b93c;font-weight:800;font-size:14px;border-radius:14px;padding:10px 12px;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(35,65,77,.18);}"
    + "#tydswitchbtn .swhint{font-size:12.5px;font-weight:700;opacity:.7;}"
    + "#tydswitchbtn .car{font-size:11px;}"
    + "#tydswitchmenu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:9994;background:#fff;border:2px solid #bcd9e4;border-radius:14px;box-shadow:0 12px 28px rgba(35,65,77,.28);padding:6px;text-align:left;max-height:min(74vh,660px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;}"
    + "#tydswitchmenu a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;color:#1f5f74;font-weight:700;font-size:14.5px;text-decoration:none;border-bottom:1.5px solid #d9edf4;}"
    + "#tydswitchmenu .swtx{display:flex;flex-direction:column;gap:1px;min-width:0;}"
     + "#tydswitchmenu .swds{font-size:12px;font-weight:600;color:#5b7a87;}"
     + "#tydswitchmenu .swbdg{margin-left:auto;flex:none;background:#d23b3b;color:#fff;border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(31,95,116,.35);border-radius:999px;font-size:11.5px;font-weight:800;line-height:1;padding:3px 7px;}"
     + ".tydcnote{font-size:12.5px;line-height:1.5;color:#5b7a87;padding:8px 12px 4px;}"
     + "html[data-theme=\"dark\"] .tydcnote{color:#9fc3d2;}"
     + ".tydcbtn.on{background:#ffd94d !important;border-color:#e8b93c !important;}"
     + "#tydswitchmenu a:last-of-type{border-bottom:none;}"
     + "#tydswitchmenu .tydswduck{width:34px;height:34px;border-radius:50%;object-fit:cover;flex:none;border:2px solid #bcd9e4;background:#bfe6f2;}"
    + "#tydswitchmenu .tydswgrp{padding:10px 12px 2px;}"
    + "#tydswitchmenu .tydswgrp b{display:block;font-size:13px;color:#1f5f74;}"
    + "#tydswitchmenu .tydswgrp span{display:block;font-size:11.5px;font-weight:600;color:#5b7a87;}"
    + "#tydswitchmenu .tydswnest{display:flex;align-items:stretch;border-bottom:1.5px solid #d9edf4;}"
    + "#tydswitchmenu .tydswnest a{flex:1;min-width:0;border-bottom:none;}"
    + "#tydswitchmenu .tydswnest.cur{background:#fff3b0;}"
    + "#tydswitchmenu .tydswchev{flex:none;align-self:center;width:44px;height:44px;min-height:44px;margin:0 10px 0 0;padding:0;border:2px solid #e8b93c;border-radius:12px;background:#ffd94d;color:#1f5f74;font-size:21px;font-weight:800;line-height:1;cursor:pointer;font-family:inherit;}"
    + "#tydswitchmenu .tydswsubs{background:#f2fafd;}"
    + "#tydswitchmenu .tydswsubs a{padding-left:48px;}"
    + "#tydswitchmenu .tydswsubs .tydswsubs a{padding-left:64px;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydswnest{border-bottom-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydswnest.cur{background:#23414d !important;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydswchev{background:#ffd94d !important;border-color:#e8b93c !important;color:#1f5f74 !important;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydswsubs{background:#12222e !important;}"
     + "#tydswitchmenu a.cur{background:#fff3b0;color:#6b5900;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu a{color:#d7ecf5 !important;}"
     + "html[data-theme=\"dark\"] #tydswitchmenu a{border-color:#2e4a5f;}"
     + "html[data-theme=\"dark\"] #tydswitchmenu .swds{color:#9fc3d2 !important;}"
     + "html[data-theme=\"dark\"] #tydswitchmenu .tydswgrp b{color:#c9f0fc !important;}"
     + "html[data-theme=\"dark\"] #tydswitchmenu .tydswgrp span{color:#9fc3d2 !important;}"
     + ".tydcrow{border-bottom:1.5px solid #d9edf4;}"
     + "html[data-theme=\"dark\"] .tydcrow{border-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu a.cur{background:#23414d !important;color:#ffd94d !important;}"
    + "#tydswitchmenu .tydcust{display:block;width:100%;box-sizing:border-box;margin-top:6px;border:none;border-top:1px solid #e3eff4;background:none;padding:10px 12px 5px;color:#5b7d89;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;text-align:left;}"
    + "#tydswitchmenu .tydcrow{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 12px;border-radius:9px;color:#1f5f74;font-weight:700;font-size:14.5px;}"
    + "#tydswitchmenu .tydcrow.cur{background:#fff3b0;color:#6b5900;}"
    + "#tydswitchmenu .tydcrow.dim{opacity:.55;}"
    + "#tydswitchmenu .tydcrow .nm{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}"
    + "#tydswitchmenu .tydcrow .hint{font-size:11px;font-weight:600;opacity:.75;white-space:nowrap;}"
    + "#tydswitchmenu .tydcmove{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 12px;border-radius:9px;color:#1f5f74;font-weight:700;font-size:14.5px;border-bottom:1.5px solid #d9edf4;}"
    + "#tydswitchmenu .tydcmove .nm{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}"
    + "#tydswitchmenu .tydcmove select{flex:none;max-width:158px;border:2px solid #bcd9e4;border-radius:999px;background:#eaf6fb;color:#1f5f74;font:inherit;font-size:12.5px;font-weight:800;padding:6px 8px;cursor:pointer;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydcmove{color:#d7ecf5 !important;border-bottom-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydcmove select{background:#1d3442;color:#c9f0fc;border-color:#2a4a5a;}"
    + ".tydcbtn{flex:0 0 auto;background:#eaf5f9;border:1.5px solid #bcd9e4;border-radius:8px;color:#1f5f74;font-size:13px;font-weight:800;padding:4px 8px;cursor:pointer;font-family:inherit;line-height:1;}"
    + ".tydcbtn:disabled{opacity:.35;cursor:default;}"
    + "#tydswitchmenu .tydcfoot{display:flex;gap:8px;margin-top:8px;background:#eaf7fb;border:2px solid #bcd9e4;border-radius:12px;padding:10px;}"
    + "#tydswitchmenu .tydcfoot button{flex:1;border-radius:9px;padding:9px 6px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;}"
    /* Switcher action box (v373, Lucy: the bottom rows "need to stand
       out... in its own box... towards the left wall"): Customize and
       Set up your Pond sit in their own box at the bottom of the
       switcher menu, left-aligned, clearly apart from the page rows. */
    + "#tydswitchmenu .tydswact{margin-top:8px;background:#eaf7fb;border:2px solid #bcd9e4;border-radius:12px;padding:6px;}"
    + "#tydswitchmenu .tydswact .tydcust{margin-top:0;border-top:none;text-align:left;justify-content:flex-start;}"
    + "#tydcdone{background:#ffd94d;border:2px solid #e8b93c;color:#6b5900;}"
    + "#tydcreset{background:none;border:2px solid #bcd9e4;color:#5b7d89;}"
    /* Bottom-menu reorder (Lucy, Nov 15, 2026, v324): the three-lines
       bottom menu sheet gets its own edit mode, same look as the
       switcher Customize rows (yellow Done, pale buttons, dark-mode
       text) so members can reorder the pages in every section. */
    + "#tydnavmenu .tydmenunote{font-size:12.5px;line-height:1.5;color:#5b7a87;padding:8px 12px 4px;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydmenunote{color:#9fc3d2;}"
    + "#tydnavmenu .tydmenurow{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 12px;border-radius:9px;color:#1f5f74;font-weight:700;font-size:14.5px;border-bottom:1.5px solid #d9edf4;}"
    + "#tydnavmenu .tydmenurow .nm{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}"
    + "#tydnavmenu .tydmenurow .nm .ic{font-size:16px;}"
    + "#tydnavmenu .tydmenufoot{display:flex;gap:8px;margin-top:8px;background:#eaf7fb;border:2px solid #bcd9e4;border-radius:12px;padding:10px;}"
    + "#tydnavmenu .tydmenufoot button{flex:1;border-radius:9px;padding:9px 6px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;}"
    /* Bottom-menu action box (v373, Lucy: the bottom rows "need to
       stand out... in its own box... towards the left wall"): Install,
       Set up your Pond and Edit menu order sit in their own box at the
       bottom of the Menu pull-down, left-aligned, clearly apart from
       the page rows. The Done/Reset foot in edit mode gets the same box. */
    + "#tydnavmenu .tydmenuact{margin-top:8px;background:#eaf7fb;border:2px solid #bcd9e4;border-radius:12px;padding:6px;}"
    + "#tydnavmenu .tydmenuact button{display:flex;justify-content:flex-start;text-align:left;border-bottom:none;}"
    + "#tydmenudone{background:#ffd94d;border:2px solid #e8b93c;color:#6b5900;}"
    + "#tydmenureset{background:none;border:2px solid #bcd9e4;color:#5b7d89;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydmenurow{color:#d7ecf5 !important;border-bottom-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydmenufoot{background:#101e2c !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydmenuact{background:#101e2c !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydnavmenu .tydmenuact button{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] #tydmenureset{border-color:#2e4a5f;color:#bcd6e4;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydcust{color:#bcd6e4 !important;border-top-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydcrow{color:#d7ecf5 !important;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydcrow.cur{background:#23414d !important;color:#ffd94d !important;}"
    + "html[data-theme=\"dark\"] .tydcbtn{background:#23414d;border-color:#2e4a5f;color:#d7ecf5;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydcfoot{background:#101e2c !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydswact{background:#101e2c !important;border-color:#2e4a5f !important;}"
    + "html[data-theme=\"dark\"] #tydswitchmenu .tydswact .tydcust{color:#bcd6e4 !important;border-top-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] #tydcreset{border-color:#2e4a5f;color:#bcd6e4;}"
    + "#tydacctchip{display:flex;align-items:center;gap:7px;background:#ffd94d;border:2px solid #e8b93c;border-radius:14px;padding:4px 12px 4px 4px;text-decoration:none;color:#1f5f74;font-weight:800;font-size:13px;font-family:inherit;box-shadow:0 3px 10px rgba(35,65,77,.18);white-space:nowrap;flex:0 1 auto;min-width:0;}"
    + "#tydacctcirc{flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:#bfe6f2;border:2px solid #ffffff;box-shadow:0 0 0 1.5px rgba(31,95,116,.45);display:flex;align-items:center;justify-content:center;font-size:19px;overflow:hidden;}"
    + "#tydacctcirc img{width:100%;height:100%;object-fit:cover;display:block;}"
    + "#tydacctlabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
    + "html[data-theme=\"dark\"] #tydacctchip{background:#ffd94d !important;border-color:#e8b93c !important;color:#1f5f74 !important;}"
    + "@media (min-width:700px){.app,.wrap{max-width:min(1120px,94vw) !important;}}"
    /* v295 (Nov 15, 2026): at wide desktop widths the content column
       grows modestly (1120px to 1280px) so a 1919px page is less empty
       patterned margin. Phones stay 100vw (the max-width:699px rules
       above still win there). */
    + "@media (min-width:1400px){.app,.wrap{max-width:min(1280px,92vw) !important;}}"
     + "#tydswitchbtn>span:first-child{flex:1;min-width:0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
     + ".swname{display:inline-block;white-space:nowrap;vertical-align:middle;}"
     + ".swbduck{width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:-6px;margin-right:6px;border:2px solid #fff;box-shadow:0 1px 3px rgba(35,65,77,.25);}"
     + "#tydswitchbtn .swhint{white-space:nowrap;flex:none;}"
     + "@media (max-width:480px){#tydswitchbtn .swwords{display:none;}}"
    + "@media (max-width:480px){#tydswitchin{gap:4px;}#tydbell,#tydthemebtn,#tydhomebtn{flex:0 0 44px;font-size:16px;}#tydswitchbtn{padding:8px 8px;font-size:12.5px;}.swbduck{width:18px;height:18px;margin-right:4px;vertical-align:-4px;}}"
     + "#acctpill{display:none !important;}"
     + "#tydacctbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 16px 12px;background:#fff;border:2px solid #ffe066;border-radius:999px;padding:7px 8px 7px 15px;box-shadow:0 2px 8px rgba(35,65,77,.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
     + "#tydacctbar .tydab-who{font-weight:800;font-size:13.5px;color:#1f5f74;white-space:nowrap;display:flex;align-items:center;min-width:0;overflow:hidden;text-overflow:ellipsis;}"
     + "#tydacctbar .tydab-av{width:26px;height:26px;border-radius:50%;object-fit:cover;margin-right:7px;flex:none;}"
     + "#tydacctbar .tydab-state{display:flex;align-items:center;gap:7px;flex:none;}"
     + "#tydacctbar .tydab-btn{display:inline-block;background:#1f5f74;color:#fff;font-weight:800;font-size:13px;text-decoration:none;border:none;cursor:pointer;font-family:inherit;border-radius:999px;padding:7px 14px;white-space:nowrap;}"
     + "#tydacctbar .tydab-btn.alt{background:#fff3b0;color:#6b5900;}"
     + "html[data-theme=\"dark\"] #tydacctbar{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;}"
     + "html[data-theme=\"dark\"] #tydacctbar .tydab-who{color:#f8fdff !important;}"
     + "#tydbell{position:relative;flex:0 0 42px;background:#ffd94d;color:#1f5f74;border:2px solid #e8b93c;border-radius:14px;font-size:17px;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(35,65,77,.18);display:flex;flex-direction:column;gap:1px;align-items:center;justify-content:center;}"
    + "#tydbellbadge{position:absolute;top:-8px;right:-8px;min-width:20px;height:20px;border-radius:999px;background:#d23b3b;color:#fff;font-size:11px;font-weight:800;line-height:16px;text-align:center;padding:0 4px;box-sizing:border-box;border:2px solid #fff;}"
    + "#tydbellpanel{position:absolute;right:0;top:calc(100% + 6px);z-index:9994;width:min(92vw,360px);max-height:70vh;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;background:#fff;border:2px solid #bcd9e4;border-radius:14px;box-shadow:0 12px 28px rgba(35,65,77,.28);padding:10px;text-align:left;color:#23414d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}"
    + ".tydbellhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}"
    + ".tydbellhead b{color:#1f5f74;font-size:15px;}"
    + "#tydbellmark{background:#ffd94d;color:#6b5900;border:2px solid #f0c93e;font-weight:800;font-size:12px;border-radius:999px;padding:5px 10px;cursor:pointer;font-family:inherit;}"
    + ".tydbellheadbtns{display:flex;gap:6px;}"
    + "#tydbelldelall{background:#fdecea;color:#b3261e;border:2px solid #f0b6b6;font-weight:800;font-size:12px;border-radius:999px;padding:5px 10px;cursor:pointer;font-family:inherit;}"
    + "html[data-theme=\"dark\"] #tydbelldelall{background:#3a1d1d !important;border-color:#5a2b2b !important;color:#ffb4ab !important;}"
    + ".tydbellrow{position:relative;border-bottom:1px solid #e3eff4;overflow:hidden;}"
    + ".tydbellrow:last-child{border-bottom:none;}"
    + ".tydbellrow .tydbellitem{position:relative;z-index:1;background:#fff;padding-right:32px;touch-action:pan-y;}"
    + ".tydbellrow .tydbellitem.unread{background:#fffbe8;}"
    + ".tydbellswipe{position:absolute;top:0;right:0;bottom:0;width:84px;background:#d23b3b;color:#fff;display:flex;align-items:center;justify-content:flex-end;padding-right:14px;font-weight:800;font-size:13px;cursor:pointer;}"
    + ".tydbellbinflip{position:absolute;inset:0;background:#d23b3b;display:flex;align-items:center;justify-content:center;z-index:0;overflow:hidden;transform:scaleX(0);transform-origin:right center;transition:transform .16s ease;}"
    + ".tydbellbinflip.binflip-grow{transform:scaleX(1);}"
    + ".tydbellbinflip .tydbellbin{width:34px;height:34px;flex:none;}"
    + ".tydbellbinflip .tydbellbinlid{fill:#fff;transform-box:fill-box;transform-origin:100% 50%;transition:transform .18s ease;}"
    + ".tydbellbinflip.lid-open .tydbellbinlid{transform:rotate(-55deg);}"
    + ".tydbellbinflip .tydbellbinbody{fill:#fff;}"
    + ".tydbellbinflip.binflip-collapse{transform:scaleX(1) scaleY(0);opacity:0;transition:transform .18s ease,opacity .18s ease;}"
    + ".tydbellrow.binflip-active .tydbelldel{display:none;}"
    + ".tydbellrow.binflip-collapsing{transition:max-height .18s ease;}"
    + "html[data-theme=\"dark\"] .tydbellbinflip{background:#d23b3b;}"
    + ".tydbelldel{position:absolute;top:6px;right:6px;z-index:2;width:24px;height:24px;border-radius:999px;border:1.5px solid #e3b7b7;background:#fff;color:#b3261e;font-size:13px;font-weight:900;line-height:1;cursor:pointer;padding:0;display:none;}"
    + ".tydbellrow:hover .tydbelldel,.tydbelldel:focus-visible{display:block;}"
    + "@media (hover:none){.tydbelldel{display:block;}}"
    + "html[data-theme=\"dark\"] .tydbellrow{border-bottom-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] .tydbellrow .tydbellitem{background:var(--tyd-acc-dark, #172635);}"
    + "html[data-theme=\"dark\"] .tydbellrow .tydbellitem.unread{background:#23414d;}"
    + "html[data-theme=\"dark\"] .tydbelldel{background:#3a1d1d;border-color:#5a2b2b;color:#ffb4ab;}"
    + "#tydbellundo{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#23414d;color:#eefaff;border-radius:10px;padding:8px 10px;margin-top:8px;font-size:13.5px;font-weight:700;}"
    + "#tydbellundo[hidden]{display:none;}"
    + "#tydbellundo button{flex:none;background:#ffd94d;color:#6b5900;border:2px solid #f0c93e;font-weight:800;font-size:12.5px;border-radius:999px;padding:4px 12px;cursor:pointer;font-family:inherit;}"
    + "html[data-theme=\"dark\"] #tydbellundo{background:#1e3245;border:1px solid #2e4a5f;color:#f8fdff;}"
    + ".tyddelconf{position:fixed;inset:0;background:rgba(23,38,53,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}"
    + ".tyddelconf[hidden]{display:none;}"
    + ".tyddelconf-card{background:#fff;border:2px solid #bcd9e4;border-radius:18px;padding:18px;max-width:420px;width:100%;box-shadow:0 12px 40px rgba(23,38,53,.35);}"
    + ".tyddelconf-card h3{margin:0;font-size:17px;color:#1f5f74;}"
    + ".tyddelconf-sub{margin:8px 0 0;font-size:14px;color:#4a6b78;line-height:1.5;overflow-wrap:break-word;}"
    + ".tyddelconf-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;}"
    + "#tydbelldelconf{z-index:10000;}"
    + "html[data-theme=\"dark\"] .tyddelconf-card{background:#172635;border-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] .tyddelconf-card h3{color:#eefaff;}"
    + "html[data-theme=\"dark\"] .tyddelconf-sub{color:#bcd6e4;}"
    + ".tydbellitem{padding:9px 8px;border-bottom:1px solid #e3eff4;font-size:13.5px;line-height:1.45;}"
    + ".tydbellitem:last-child{border-bottom:none;}"
    + ".tydbellitem .bt{font-weight:800;color:#1f5f74;display:block;font-size:14px;}"
    + ".tydbellitem .bwhen{font-size:11.5px;color:#5b7d89;margin-top:2px;}"
    + ".tydbellitem a{color:#1f5f74;font-weight:700;}"
    + ".tydbellitem.unread{background:#fffbe8;border-left:4px solid #ffd94d;}"
    + ".tydbellitem.pinned{background:#fffbe8;border-left:4px solid #ffd94d;cursor:pointer;position:relative;}"
    + ".tydbellitem.pinned .pin-x{position:absolute;top:6px;right:8px;border:none;background:none;color:#5b7d89;font-size:16px;font-weight:900;cursor:pointer;padding:2px 6px;line-height:1;}"
    + "html[data-theme=\"dark\"] .tydbellitem.pinned{background:#2a2410 !important;border-left-color:#ffd94d !important;}"
    + "html[data-theme=\"dark\"] .tydbellitem.pinned .pin-x{color:#c9f0fc !important;}"
    + ".tydbellbtn{background:#ffd94d;color:#6b5900;border:2px solid #f0c93e;font-weight:800;font-size:12.5px;border-radius:999px;padding:5px 12px;cursor:pointer;font-family:inherit;margin:6px 6px 2px 0;}"
    + ".tydbellbtn.alt{background:#eef6f9;color:#1f5f74;border-color:#bcd9e4;}"
    + ".tydbellmsg{font-size:13.5px;color:#3f6b7a;padding:8px;line-height:1.55;margin:0;}"
    + "#tydbelltools{padding:2px 0 6px;}"
    + "#tydbellsearch{width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;padding:7px 10px;border:1.5px solid #bcd9e4;border-radius:999px;background:#f4fafc;color:#23414d;outline:none;}"
    + "#tydbellsearch:focus{border-color:#1f5f74;}"
    + ".tydbelltabs{display:flex;gap:6px;margin-top:6px;}"
    + ".tydbelltabs button{flex:1;font-family:inherit;font-size:12.5px;font-weight:800;padding:5px 0;border-radius:999px;border:1.5px solid #bcd9e4;background:#eef6f9;color:#1f5f74;cursor:pointer;}"
    + ".tydbelltabs button.on{background:#ffd94d;border-color:#f0c93e;color:#6b5900;}"
    + "html[data-theme=\"dark\"] #tydbellsearch{background:#0b141f;border-color:#2e4a5f;color:#f8fdff;}"
    + "html[data-theme=\"dark\"] .tydbelltabs button{background:var(--tyd-acc-dark, #172635);border-color:#2e4a5f;color:#c9f0fc;}"
    + "html[data-theme=\"dark\"] .tydbelltabs button.on{background:#ffd94d;border-color:#f0c93e;color:#6b5900;}"
    + ".tydbellsettings{display:block;text-decoration:none;background:#fffbe8;border-radius:10px;margin-top:8px;}"
    + ".tydbellsettings .bt{font-weight:800;color:#1f5f74;display:block;font-size:14px;}"
    + ".tydbellsettings .bwhen{font-size:11.5px;color:#5b7d89;display:block;margin-top:2px;}"
    + "html[data-theme=\"dark\"] .tydbellsettings{background:#23414d;}"
    + "html[data-theme=\"dark\"] .tydbellsettings .bt{color:#c9f0fc !important;}"
    + ".tydbellmsg a{color:#1f5f74;font-weight:800;}"
    + "html[data-theme=\"dark\"] #tydbellpanel{background:var(--tyd-acc-dark, #172635) !important;border-color:#2e4a5f !important;color:#f8fdff !important;}"
    + "html[data-theme=\"dark\"] .tydbellitem{border-bottom-color:#2e4a5f;}"
    + "html[data-theme=\"dark\"] .tydbellitem .bt{color:#c9f0fc !important;}"
    + "html[data-theme=\"dark\"] .tydbellitem .bwhen{color:#bcd6e4;}"
    + "html[data-theme=\"dark\"] .tydbellitem a,html[data-theme=\"dark\"] .tydbellmsg a{color:#ffd94d;}"
    + "html[data-theme=\"dark\"] .tydbellitem.unread{background:#23414d;}"
    + "html[data-theme=\"dark\"] .tydbellmsg{color:#bcd6e4;}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  /* Text size (Lucy, Nov 10, 2026): a My Account comfort setting. The
     device copy (localStorage tydTextSize) applies instantly on every
     page; bell.js refreshes it from users/{uid}.textSize on sign-in so
     it follows the member. "large" adds the tyd-lg class, whose CSS
     above zooms the page a touch so every word grows. */
  window.TYDSetTextSize = function (v) {
    try { localStorage.setItem("tydTextSize", v); } catch (e) {}
    document.documentElement.classList.toggle("tyd-lg", v === "large");
  };
  try { if (localStorage.getItem("tydTextSize") === "large") document.documentElement.classList.add("tyd-lg"); } catch (e) {}

  /* Site parts (decided Nov 9, 2026): a top pulldown switcher picks the
     part of the site, and each part gets its own bottom bar. The bar stays
     uncluttered (Lucy, Nov 14, 2026): Menu, Search, the part's own list,
     and the AI helper when the page has one. The part's other pages
     live in the Menu pull-down above the bar. Refresh stays on the bar,
     at the right end, so it is one tap away (Lucy, Nov 14, 2026). The
     App button is off the bar (Lucy, Nov 14, 2026): the install tip
     lives as a pinned message in the bell notifications instead, with
     an "Install the Pond app" row in the Menu pull-down as a fallback. */
  var part = "deals", partName = "Deals";
  /* The server redirects every .html address to its clean form (/news.html
     becomes /news), so the page name here usually has no .html on the end.
     Match on the name without the extension, or every page but Deals falls
     back to Deals (Nov 13, 2026: the Pond Post switcher said Deals). */
  if (fbase === "index" || fbase === "") { part = "home"; partName = "Home"; }
  else if (fbase === "recipes" || fbase === "my-recipes" || fbase === "meal-plan" || fbase === "recipes-search" || fbase === "add-recipe") { part = "food"; partName = "Food"; }
  else if (fbase === "travel" || fbase === "travel-map") { part = "travel"; partName = "Travel"; }
  else if (fbase === "korean" || fbase === "korean-travel") { part = "korean"; partName = "Korean"; }
  else if (fbase === "planner") { part = "planner"; partName = "Planner"; }
  else if (fbase === "calendar") { part = "calendar"; partName = "Calendar"; }
  else if (fbase === "nest") { part = "nest"; partName = "My Nest"; }
  else if (fbase === "books") { part = "books"; partName = "Book Nook"; }
  else if (fbase === "movies") { part = "movies"; partName = "Movies & Shows"; }
  else if (fbase === "gifts") { part = "gifts"; partName = "Gift Planner"; }
  else if (fbase === "bills") { part = "bills"; partName = "Nest Egg"; }
  else if (fbase === "stuff") { part = "stuff"; partName = "My Stuff"; }
  else if (fbase === "bins") { part = "stuff"; partName = "My Stuff"; }
  else if (fbase === "pets" || fbase === "pet" || fbase === "pet-map") { part = "pets"; partName = "Pet Corner"; }
  else if (fbase === "countdowns") { part = "countdowns"; partName = "Countdowns"; }
  else if (fbase === "pantry" || fbase === "pantry-shelf") { part = "pantry"; partName = "Pantry"; }
  else if (fbase === "polls") { part = "polls"; partName = "Pond Polls"; }
  else if (fbase === "chat") { part = "chat"; partName = "The Quack Shack"; }
  else if (fbase === "news") { part = "news"; partName = "The Pond Post"; }
  else if (fbase === "about") { part = "about"; partName = "About"; }
  /* Pages that fell back to Deals (Lucy, Nov 14, 2026: the Korean for Travel
     page said Deals in the top bar). Every page now names its own section:
     account pages say My Account, info pages say About, the notebook picker
     is part of My Nest, Deal Pockets is part of Deals, and the error page
     says Home. Brand pages stay on Deals on purpose: brands are deal pages. The search page names
     its own section now (Lucy, Nov 15, 2026: the review caught the Search
     top bar saying Deals), while its bottom bar still falls back to the
     Deals bar, which already lists Search. */
  else if (fbase === "account" || fbase === "email-folders") { part = "account"; partName = "My Account"; }
  else if (fbase === "privacy" || fbase === "rules" || fbase === "terms" || fbase === "support" || fbase === "feedback") { part = "about"; partName = "About"; }
  else if (fbase === "covey-picker") { part = "nest"; partName = "My Nest"; }
  else if (fbase === "deal-pockets") { part = "deals"; partName = "Deals"; }
  else if (fbase === "404") { part = "home"; partName = "Home"; }
  else if (fbase === "search") { part = "search"; partName = "Search"; }
  /* Single-category Pond Post page (news.html?cat=stocks): the top bar
     names the category, not The Pond Post (Lucy, Nov 15, 2026: the Pond
     Post reads like a newspaper, and each section gets its own page). */
  if (fbase === "news") {
    try {
      var _cq = new URLSearchParams(location.search);
      var _cc = (_cq.get("cat") || "").toLowerCase();
      if (_cc === "everyday") { part = "news-everyday"; partName = "Everyday Stuff"; }
      else if (_cc === "stocks") { part = "news-stocks"; partName = "Stocks"; }
      else if (_cc === "politics") { part = "news-politics"; partName = "Politics"; }
      else if (_cc === "korea") { part = "news-korea"; partName = "South Korea"; }
    } catch (e) {}
  }
  var BARS = {
    /* Home searches the whole Pond (Lucy, Nov 15, 2026). Every other
       section's Search only searches that section (?scope=), so no results
       from other sections show up there. */
    home: [
      { ic: "🔥", label: "Deals", href: base + "deals.html", match: ["deals.html"] },
      { ic: "🗓️", label: "Calendar", href: base + "calendar.html", match: ["calendar.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "my-lists.html", match: ["my-lists.html"] }
    ],
    deals: [
      { ic: "🔥", label: "Deals", href: base + "deals.html", match: ["deals.html"] },
      { ic: "🧱", label: "LEGO Deals", href: base + "lego.html", match: ["lego.html"] },
      { ic: "🏡", label: "Home Goods", href: base + "home-goods.html", match: ["home-goods.html"] },
      { ic: "💻", label: "Tech", href: base + "tech.html", match: ["tech.html"] },
      { ic: "💄", label: "Beauty", href: base + "beauty.html", match: ["beauty.html"] },
      { ic: "👶", label: "Baby", href: base + "baby.html", match: ["baby.html"] },
      { ic: "🔥", label: "Viral Deals", href: base + "viral.html", match: ["viral.html"] },
      { ic: "🏠", label: "Pond Home", href: base + "index.html", match: ["index.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=deals", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "my-lists.html", match: ["my-lists.html"] },
      { ic: "🍬", label: "Deal Pockets", href: base + "deal-pockets.html", match: ["deal-pockets.html"] }
    ],
    food: [
      { ic: "🍳", label: "Recipes", href: base + "recipes.html", match: ["recipes.html"] },
      { ic: "🔎", label: "Search", href: base + "recipes-search.html", match: ["recipes-search.html"] },
      { ic: "📅", label: "Meal Plan", href: base + "meal-plan.html", match: ["meal-plan.html"] },
      { ic: "🥫", label: "Pantry", href: base + "pantry.html", match: ["pantry.html"] },
      { ic: "✏️", label: "My Recipes", href: base + "add-recipe.html", match: ["add-recipe.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "my-recipes.html", match: ["my-recipes.html"] }
    ],
    travel: [
      { ic: "✈️", label: "Trips", href: base + "travel.html#tab-active", match: ["travel.html"] },
      { ic: "🗓️", label: "Calendar", href: base + "travel.html#tab-calendar", match: [] },
      { ic: "⭐", label: "Favorites", href: base + "travel.html#tab-favorites", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=travel", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "travel.html", match: [] }
    ],
    korean: [
      { ic: "🇰🇷", label: "Lessons", href: base + "korean.html#lessons", match: ["korean.html"] },
      { ic: "🔎", label: "Search", href: base + "korean.html", match: [] },
      { ic: "🃏", label: "Flashcards", href: base + "korean.html#flashcards", match: [] },
      { ic: "🎧", label: "Quiz", href: base + "korean.html#quiz", match: [] },
      { ic: "📒", label: "My Words", href: base + "korean.html#mywords", match: [] },
      { ic: "🧺", label: "My Stuff", href: base + "korean.html#mywords", match: [] }
    ],
    planner: [
      { ic: "📖", label: "Day", href: base + "planner.html#day", match: ["planner.html"] },
      { ic: "🗓️", label: "Week", href: base + "planner.html#week", match: [] },
      { ic: "📅", label: "Month", href: base + "planner.html#month", match: [] },
      { ic: "📆", label: "Year", href: base + "planner.html#year", match: [] },
      { ic: "📝", label: "Notes", href: base + "planner.html#notes", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=planner", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "planner.html", match: [] }
    ],
    /* Master calendar (Lucy, Nov 16, 2026, v327): one big calendar for
       every date in the Pond — travel, pets, planner notes and reminders,
       meals, deals, countdowns and bills — with a switch for each kind.
       It is a normal reorderable menu item, exactly like every other
       page (v324), in its own group here and in the Home group too. */
    calendar: [
      { ic: "🗓️", label: "Calendar", href: base + "calendar.html", match: ["calendar.html"] },
      { ic: "📖", label: "Planner", href: base + "planner.html", match: ["planner.html"] },
      { ic: "✈️", label: "Travel", href: base + "travel.html", match: ["travel.html"] },
      { ic: "🐱", label: "Pet Corner", href: base + "pets.html", match: ["pets.html"] },
      { ic: "⏳", label: "Countdowns", href: base + "countdowns.html", match: ["countdowns.html"] },
      { ic: "💰", label: "Nest Egg", href: base + "bills.html", match: ["bills.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=calendar", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "calendar.html", match: [] }
    ],
    nest: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: ["nest.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=nest", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "nest.html", match: [] }
    ],
    books: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=books", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "books.html", match: [] }
    ],
    movies: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=movies", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "movies.html", match: [] }
    ],
    gifts: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=gifts", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "gifts.html", match: [] }
    ],
    bills: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=bills", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "bills.html", match: [] }
    ],
    stuff: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=stuff", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "stuff.html", match: [] },
      { ic: "📦", label: "Bins", href: base + "bins.html", match: ["bins.html"] }
    ],
    pets: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🗺️", label: "Pet Map", href: base + "pet-map.html", match: ["pet-map.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=pets", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "pets.html", match: [] }
    ],
    countdowns: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=countdowns", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "countdowns.html", match: [] }
    ],
    pantry: [
      { ic: "🍳", label: "Recipes", href: base + "recipes.html", match: [] },
      { ic: "📅", label: "Meal Plan", href: base + "meal-plan.html", match: ["meal-plan.html"] },
      { ic: "🥫", label: "Pantry", href: base + "pantry.html", match: ["pantry.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=pantry", match: ["search.html"] },
      { ic: "✏️", label: "My Recipes", href: base + "add-recipe.html", match: ["add-recipe.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "pantry.html", match: ["pantry.html"] }
    ],
    polls: [
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=polls", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "polls.html", match: [] }
    ],
    chat: [
      { ic: "💬", label: "Quack Shack", href: base + "chat.html", match: ["chat.html"] },
      { ic: "🪺", label: "My Nest", href: base + "nest.html", match: [] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=chat", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "chat.html", match: [] }
    ]
    ,
    news: [
      { ic: "📰", label: "Pond Post", href: base + "news.html", match: ["news.html"] },
      { ic: "🏠", label: "Everyday Stuff", href: base + "news.html?cat=everyday", match: ["news.html"] },
      { ic: "📈", label: "Stocks", href: base + "news.html?cat=stocks", match: ["news.html"] },
      { ic: "🏛️", label: "Politics", href: base + "news.html?cat=politics", match: ["news.html"] },
      { ic: "🇰🇷", label: "South Korea", href: base + "news.html?cat=korea", match: ["news.html"] },
      { ic: "🔥", label: "Deals", href: base + "deals.html", match: ["deals.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=news", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "news.html#clipped", match: [] }
    ]
    ,
    about: [
      { ic: "🔥", label: "Deals", href: base + "deals.html", match: ["deals.html"] },
      { ic: "🔎", label: "Search", href: base + "search.html?scope=about", match: ["search.html"] },
      { ic: "🧺", label: "My Stuff", href: base + "my-lists.html", match: ["my-lists.html"] }
    ]
  };
  var items = BARS[part] || BARS.deals;
  /* A scoped search page (search.html?scope=news) uses the section's own
     bottom bar, not the Deals bar (Lucy, Nov 15, 2026: she searched the
     Pond Post, tapped My Stuff, and got My Deal Lists instead of her
     clipped posts). The top bar still says Search; only the bottom menu
     follows the section being searched, so My Stuff goes to that
     section's stuff (news -> the Clipped tab). */
  if (part === "search") {
    try {
      var _sq = (new URLSearchParams(location.search).get("scope") || "").toLowerCase();
      if (_sq && BARS[_sq]) items = BARS[_sq];
      /* No scope = the whole Pond, which is Home's search (Lucy, Nov 15,
         2026): the Deals bar's Search would narrow a whole-Pond search
         down to deals, so the unscoped search page uses Home's bar. */
      else items = BARS.home;
    } catch (e) {}
  }
  /* A news category page (news.html?cat=stocks) uses the Pond Post bar,
     not the Deals bar (Lucy, Nov 15, 2026: the four categories live in
     the bottom Menu too). */
  if (part === "news-everyday" || part === "news-stocks" || part === "news-politics" || part === "news-korea") items = BARS.news;
  /* Bottom-menu reorder (Lucy, Nov 15, 2026, v324): members can reorder
     the pages in EVERY section's three-lines bottom menu. The group key
     is the BARS group actually shown (search follows its scope, news
     topics follow the Pond Post bar, anything without a bar shows
     Deals). Factory order is the BARS order; a saved order is a list
     of item hrefs (leading ../ stripped, so a reorder made on a root
     page still applies on brand pages). Saved on this device in
     localStorage tydMenuOrder (one JSON object, group -> href list)
     and, when signed in, in the member's Pond account (users doc
     fields menuOrder / menuOrderSet) so it follows them across
     devices; localStorage stays the instant layer that applies at
     first paint and when signed out. Reorder only — no hiding, no
     removing: every page stays in the menu, just in the member's
     order. New pages (not in a saved order) append at the end in
     factory order; saved entries for removed pages are dropped. */
  var menuGroupKey = BARS[part] ? part : "deals";
  if (part === "search") {
    try {
      var _sq2 = (new URLSearchParams(location.search).get("scope") || "").toLowerCase();
      menuGroupKey = (_sq2 && BARS[_sq2]) ? _sq2 : "home";
    } catch (e) { menuGroupKey = "home"; }
  }
  if (part === "news-everyday" || part === "news-stocks" || part === "news-politics" || part === "news-korea") menuGroupKey = "news";
  function menuKeyOf(it) { return String(it.href || "").replace(/^(\.\.\/|\.\/)+/, ""); }
  var menuOrderMap = {};
  try { menuOrderMap = JSON.parse(localStorage.getItem("tydMenuOrder") || "{}") || {}; } catch (e) { menuOrderMap = {}; }
  function menuOrderedRest() {
    var saved = menuOrderMap[menuGroupKey];
    if (!saved || !saved.length) return rest.slice();
    var byKey = {}, out = [], i;
    for (i = 0; i < rest.length; i++) byKey[menuKeyOf(rest[i])] = rest[i];
    for (i = 0; i < saved.length; i++) { var k = saved[i]; if (byKey[k]) { out.push(byKey[k]); delete byKey[k]; } }
    for (i = 0; i < rest.length; i++) if (byKey[menuKeyOf(rest[i])]) { out.push(rest[i]); delete byKey[menuKeyOf(rest[i])]; }
    return out;
  }
  function menuIsDefaultAll() {
    for (var g in menuOrderMap) if (menuOrderMap[g] && menuOrderMap[g].length) return false;
    return true;
  }
  function menuSaveLocal() {
    try { localStorage.setItem("tydMenuOrder", JSON.stringify(menuOrderMap)); } catch (e) {}
  }
  /* MENU-SYNC-BEGIN: same merge rule as the section switcher. Sign-in:
     if the account has a saved menu order (menuOrderSet true, or a
     menuOrder object) the account wins and this device adopts it. If
     the account has none but this device holds a non-default order,
     the device's order uploads once (first-time migration). Every
     reorder change while signed in writes BOTH layers (menuSave below
     wraps menuSaveLocal + menuPushAccount). Reset writes the map
     without this group (with menuOrderSet: true), so the reset follows
     the member to every device instead of being overwritten by a stale
     local order there. Sign-out leaves this device's menu exactly as
     it is. Any Firebase failure quietly degrades to localStorage-only. */
  var menuAcct = { uid: null, fs: null, db: null };
  function menuValidOrder(obj) {
    if (!obj || typeof obj !== "object") return null;
    var out = {}, g, arr;
    for (g in obj) {
      if (!BARS[g]) continue;
      arr = obj[g];
      if (Array.isArray(arr)) out[g] = arr.filter(function (k) { return typeof k === "string" && k; });
    }
    return out;
  }
  function menuPushAccount() {
    if (!menuAcct.uid || !menuAcct.fs || !menuAcct.db) return;
    try {
      menuAcct.fs.setDoc(menuAcct.fs.doc(menuAcct.db, "users", menuAcct.uid), {
        menuOrder: menuOrderMap,
        menuOrderSet: true
      }, { merge: true }).catch(function () {});
    } catch (e) {}
  }
  function menuSave() { menuSaveLocal(); menuPushAccount(); }
  function menuSetOrderForGroup(keys) {
    menuOrderMap[menuGroupKey] = keys.slice();
    menuSave();
  }
  function menuResetGroup() {
    delete menuOrderMap[menuGroupKey];
    menuSave();
  }
  function menuApplyAccount(orderMap) {
    menuOrderMap = menuValidOrder(orderMap) || {};
    menuSaveLocal();
    renderNavMenu();
  }
  function menuHandleUser(fsMod, db, user) {
    if (menuAcct.uid === user.uid) return Promise.resolve();
    menuAcct.fs = fsMod; menuAcct.db = db; menuAcct.uid = user.uid;
    return fsMod.getDoc(fsMod.doc(db, "users", user.uid)).then(function (snap) {
      var d = snap && snap.exists() ? snap.data() : {};
      var hasSaved = !!d && (d.menuOrderSet === true || (d.menuOrder && typeof d.menuOrder === "object"));
      if (hasSaved) {
        menuApplyAccount(d.menuOrder);
      } else if (!menuIsDefaultAll()) {
        menuPushAccount();
      }
    }).catch(function () {});
  }
  /* MENU-SYNC-END */
  var nav = document.createElement("nav");
  nav.id = "tydnav";
  nav.setAttribute("aria-label", "Pond menu");
  /* Bottom menu (Lucy, Nov 14, 2026): the bar stays uncluttered. Only the
     Menu pull-down, Search, this section's own list, the AI helper (when
     the page has one) and Refresh sit on the bar. Every other page link lives
     in the pull-down above the bar, grouped under this section.
     Refresh stays on the bar, at the right end, so it is one tap away.
     Each section keeps its own list: My Recipes
     on Food and Pantry, My Words on Korean, My Stuff everywhere else. */
  function tydIsOn(it) {
    var baseMatch = false;
    for (var mi = 0; mi < it.match.length; mi++) if (it.match[mi].replace(/\.html$/, "") === fbase) baseMatch = true;
    if (!baseMatch) return false;
    /* News category links (?cat=stocks): only "on" when the page's ?cat=
       matches. The plain Pond Post link is only "on" on the hub (no ?cat=). */
    var curCat = null;
    try { curCat = new URLSearchParams(location.search).get("cat"); } catch (e) {}
    var catIdx = it.href ? it.href.indexOf("?cat=") : -1;
    if (catIdx > -1) return curCat === it.href.slice(catIdx + 5).split("&")[0];
    if (fbase === "news" && it.href && it.href.indexOf("news.html") > -1) return !curCat;
    return true;
  }
  function tydBarLink(it) {
    var a = document.createElement("a");
    a.href = it.href;
    a.setAttribute("aria-label", it.label);
    a.setAttribute("title", it.label);
    if (tydIsOn(it)) a.className = "on";
    a.innerHTML = '<span class="ic">' + it.ic + '</span><span class="nlb">' + it.label + '</span>';
    return a;
  }
  var searchIt = null, myListIt = null, rest = [];
  items.forEach(function (it) {
    if (it.label === "Search") searchIt = it;
    else if (it.label === "My Recipes" || it.label === "My Words") myListIt = it;
    else rest.push(it);
  });
  if (!myListIt) {
    for (var ri = 0; ri < rest.length; ri++) if (rest[ri].label === "My Stuff") { myListIt = rest[ri]; rest.splice(ri, 1); break; }
  }
  var navMenu = document.createElement("div");
  navMenu.id = "tydnavmenu";
  navMenu.hidden = true;
  var menuEditing = false;
  /* Renders the Menu sheet. Normal mode: the section's pages in the
     member's order, then the Install / Set up rows and the Edit order
     row. Edit mode: the same pages as rows with up/down arrows, plus
     Done and Reset to default. Rebuilt on every change so a reorder,
     a reset, or an account sync landing mid-session shows at once. */
  function renderNavMenu() {
  navMenu.innerHTML = '<div class="tydnavpick">Select a category</div><div class="tydnavgrp"><b>In ' + partName + '</b><span>Pages in this section</span></div>';
  if (menuEditing) {
    var note = document.createElement("div");
    note.className = "tydmenunote";
    note.textContent = "Tap ↑ or ↓ to move a page. Changes save right away.";
    navMenu.appendChild(note);
    var ordered = menuOrderedRest();
    ordered.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "tydmenurow";
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.innerHTML = '<span class="ic">' + it.ic + '</span>' + it.label;
      row.appendChild(nm);
      var up = document.createElement("button");
      up.type = "button";
      up.className = "tydcbtn";
      up.setAttribute("data-mup", menuKeyOf(it));
      up.setAttribute("aria-label", "Move " + it.label + " up");
      up.textContent = "↑";
      if (idx === 0) up.disabled = true;
      row.appendChild(up);
      var dn = document.createElement("button");
      dn.type = "button";
      dn.className = "tydcbtn";
      dn.setAttribute("data-mdn", menuKeyOf(it));
      dn.setAttribute("aria-label", "Move " + it.label + " down");
      dn.textContent = "↓";
      if (idx === ordered.length - 1) dn.disabled = true;
      row.appendChild(dn);
      navMenu.appendChild(row);
    });
    var foot = document.createElement("div");
    foot.className = "tydmenufoot";
    var doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.id = "tydmenudone";
    doneBtn.textContent = "✓ Done";
    doneBtn.addEventListener("click", function (e) { e.stopPropagation(); menuEditing = false; renderNavMenu(); });
    foot.appendChild(doneBtn);
    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.id = "tydmenureset";
    resetBtn.textContent = "Reset to default";
    resetBtn.addEventListener("click", function (e) { e.stopPropagation(); menuResetGroup(); renderNavMenu(); });
    foot.appendChild(resetBtn);
    navMenu.appendChild(foot);
    var moveBtns = navMenu.querySelectorAll("[data-mup],[data-mdn]");
    for (var mi = 0; mi < moveBtns.length; mi++) (function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var isUp = b.hasAttribute("data-mup");
        var k = b.getAttribute(isUp ? "data-mup" : "data-mdn");
        var keys = menuOrderedRest().map(menuKeyOf);
        var ix = keys.indexOf(k), j = isUp ? ix - 1 : ix + 1;
        if (ix < 0 || j < 0 || j >= keys.length) return;
        keys.splice(ix, 1); keys.splice(j, 0, k);
        menuSetOrderForGroup(keys);
        renderNavMenu();
      });
    })(moveBtns[mi]);
    return;
  }
  var lastLink = null;
  menuOrderedRest().forEach(function (it) {
    var a = document.createElement("a");
    a.href = it.href;
    if (tydIsOn(it)) a.className = "cur";
    a.innerHTML = '<span class="ic">' + it.ic + '</span>' + it.label;
    navMenu.appendChild(a);
    lastLink = a;
  });
  if (lastLink) lastLink.className += (lastLink.className ? " " : "") + "last";
  /* Action box (v373, Lucy: the bottom rows "need to stand out... in
     its own box... towards the left wall"): Install, Set up your Pond
     and Edit menu order live in their own box at the bottom of the
     Menu pull-down, left-aligned, apart from the page rows above. */
  var actBox = document.createElement("div");
  actBox.className = "tydmenuact";
  /* Install row in the Menu pull-down (Lucy, Nov 14, 2026): the App
     button is off the bar, so the install tip lives as a pinned message
     in the bell notifications, and this row keeps it reachable even
     after that pinned tip is dismissed. */
  var instRow = document.createElement("button");
  instRow.type = "button";
  instRow.innerHTML = '<span class="ic">⬇️</span>Install the Pond app';
  instRow.addEventListener("click", function () {
    navMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    if (window.TYDShowInstall) window.TYDShowInstall();
  });
  actBox.appendChild(instRow);
  /* Set up your Pond row in the Menu pull-down (Lucy, Nov 15, 2026:
     the v292 banner replaced the auto-open dialog, but the sheet was
     only reachable from the top switcher menu and Home's "Make this
     yours" button — the main Menu had no setup entry, so after
     dismissing the banner there was no obvious way back to it). */
  var setupRow = document.createElement("button");
  setupRow.type = "button";
  setupRow.innerHTML = '<span class="ic">🦆</span>Set up your Pond';
  setupRow.addEventListener("click", function () {
    navMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    if (window.TYDSetupPond) window.TYDSetupPond.open();
  });
  actBox.appendChild(setupRow);
  var editRow = document.createElement("button");
  editRow.type = "button";
  editRow.id = "tydmenuedit";
  editRow.innerHTML = '<span class="ic">✏️</span>Edit menu order';
  editRow.setAttribute("aria-label", "Edit menu order");
  editRow.addEventListener("click", function (e) { e.stopPropagation(); menuEditing = true; renderNavMenu(); });
  actBox.appendChild(editRow);
  navMenu.appendChild(actBox);
  }
  renderNavMenu();
  /* Test seam (v324): jsdom tests drive the reorder directly, since
     the live account sync needs the Firebase CDN. */
  window.TYDMenuOrder = {
    group: function () { return menuGroupKey; },
    labels: function () { return menuOrderedRest().map(function (it) { return it.label; }); },
    hrefs: function () { return menuOrderedRest().map(menuKeyOf); },
    isEditing: function () { return menuEditing; },
    setEditing: function (v) { menuEditing = !!v; renderNavMenu(); },
    reset: function () { menuResetGroup(); menuEditing = false; renderNavMenu(); },
    _setMap: function (m) { menuOrderMap = m || {}; menuSaveLocal(); renderNavMenu(); },
    _setAcct: function (a) { menuAcct = a || { uid: null, fs: null, db: null }; },
    _applyAccount: menuApplyAccount,
    _handleUser: menuHandleUser
  };
  var refr = document.createElement("button");
  refr.type = "button";
  refr.setAttribute("aria-label", "Refresh");
  refr.setAttribute("title", "Refresh");
  refr.innerHTML = '<span class="ic">↻</span><span class="nlb">Refresh</span>';
  refr.addEventListener("click", function () {
    if (refr.classList.contains("spin")) return;
    refr.classList.add("spin");
    var done = function () { location.reload(); };
    var steps = [];
    try {
      if ("caches" in window) steps.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
      if ("serviceWorker" in navigator) steps.push(navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) return reg.update(); }).catch(function () {}));
    } catch (e) {}
    Promise.all(steps).then(function () { setTimeout(done, 60); }).catch(function () { done(); });
    setTimeout(done, 2500);
  });
  var menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.id = "tydnavmenubtn";
  menuBtn.setAttribute("aria-haspopup", "true");
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.setAttribute("aria-label", "Menu");
  menuBtn.setAttribute("title", "Menu");
  menuBtn.innerHTML = '<span class="ic">☰</span><span class="nlb">Menu</span>';
  menuBtn.addEventListener("click", function () {
    /* v309: near-bottom must be measured BEFORE the panel opens — flipping hidden grows the page by up to 520px (v308 padding), so measuring after always reads "not near the bottom" and the nudge never fired. */
    var opening = navMenu.hidden;
    var nearBottom = false;
    if (opening) {
      try {
        var docEl0 = document.documentElement;
        nearBottom = (window.innerHeight + window.scrollY) >= (docEl0.scrollHeight - 160);
      } catch (e) {}
    }
    navMenu.hidden = !navMenu.hidden;
    menuBtn.setAttribute("aria-expanded", navMenu.hidden ? "false" : "true");
    /* Closing the sheet leaves edit mode, so the next open is the
       normal menu (v324). */
    if (navMenu.hidden && menuEditing) { menuEditing = false; renderNavMenu(); }
    /* v308: if the Menu was opened while the reader was already at the bottom of the page, nudge the scroll to the new bottom (grown by the v308 open-menu padding) so the footer rises above the panel right away instead of waiting for them to scroll. Mid-page opens are untouched. */
    if (!navMenu.hidden && nearBottom) {
      try {
        var docEl = document.documentElement;
        window.scrollTo({ top: docEl.scrollHeight, behavior: "smooth" });
      } catch (e) {}
    }
  });
  nav.appendChild(menuBtn);
  if (searchIt) nav.appendChild(tydBarLink(searchIt));
  /* Threads-style compose button (Lucy, Nov 15, 2026, v302): the Threads
     screenshots all have a + in the middle of the bottom pill for starting
     a new post. Ours opens the Quack Shack composer — on the Shack it
     focuses the "What's quacking?" box, from anywhere else it goes to the
     Shack with #compose so the box is focused on arrival. */
  var composeBtn = document.createElement("a");
  composeBtn.href = base + "chat.html#compose";
  composeBtn.setAttribute("aria-label", "New quack");
  composeBtn.setAttribute("title", "New quack");
  /* v342 (Nov 17, 2026): the ➕ emoji ignores CSS color and renders as a
     dark plus on iOS, so in dark mode the New quack icon was nearly
     invisible on the dark pill while every other tab's icon inherits the
     light bar color (☰ / ↻ are text glyphs, 🔍 / 🧺 are bright emoji).
     ✚︎ is a text glyph (U+271A + VS15 forces text presentation), so it
     inherits #d7ecf5 in dark / #5b7d89 in light like the other icons. */
  composeBtn.innerHTML = '<span class="ic">✚︎</span><span class="nlb">New quack</span>';
  composeBtn.addEventListener("click", function (e) {
    if (fbase === "chat") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      var ci = document.getElementById("chat-input");
      if (ci) ci.focus();
    }
  });
  nav.appendChild(composeBtn);
  if (myListIt) {
    /* Threads-style active tab (Nov 15, 2026, v301): the section's own
       list is the bar's "current section" marker, so it carries the
       darker pill highlight on every page in the section — except on
       Search, where Search itself is the active item. Without this the
       highlight never showed, because no bar item's match list ever
       covered the main section pages (Home, Pantry, Pond Post, Chat). */
    var mlLink = tydBarLink(myListIt);
    if (fbase !== "search") mlLink.className = "on";
    nav.appendChild(mlLink);
  }
  /* Maps on the Travel bar (Lucy, Nov 14, 2026): the Travel Map page gets
     its own button on the bottom bar in the Travel category, so maps are
     one tap away instead of buried. */
  if (part === "travel") {
    var mapsLink = document.createElement("a");
    mapsLink.href = base + "travel-map.html";
    mapsLink.setAttribute("aria-label", "Maps");
    mapsLink.setAttribute("title", "Maps");
    if (fbase === "travel-map") mapsLink.className = "on";
    mapsLink.innerHTML = '<span class="ic">🗺️</span><span class="nlb">Maps</span>';
    nav.appendChild(mapsLink);
  }
  nav.appendChild(refr);
  nav.appendChild(navMenu);
  document.body.appendChild(nav);
  /* Floating search pill (Lucy, Nov 18, 2026, v364): tapping Search in
     the bottom menu pops this bar up just above the nav, instead of
     jumping to the search page. It searches the section you are in
     (tap the chip for the whole Pond). Matches drop down from the
     search index; tapping one goes to it, Enter (or See all results)
     opens the scoped search page. The recipes page has its own pill
     that searches the cookbook in place, so Search there opens that
     one instead of this shared one. Not built on the search page
     itself (that page IS the search box) or the 404 page. */
  (function tydFloatSearch() {
    if (part === "search" || fbase === "404") return;
    var searchLink = nav.querySelector('a[aria-label="Search"]');
    if (!searchLink) return;
    /* Swipe down to close (v369, Lucy Nov 18, 2026): a clear downward
       drag on the pill or its results closes it. Pointer Events cover
       touch and mouse alike. A tap (tiny movement) or a mostly
       horizontal swipe never closes, and typing, the scope chip and
       tapping a result are untouched. */
    function swipeDownClose(el, closeFn) {
      var sx = 0, sy = 0, lx = 0, ly = 0, tracking = false;
      function finish(upX, upY) {
        if (!tracking) return; tracking = false;
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onCancel, true);
        var dy = upY - sy, dx = upX - sx;
        if (dy >= 40 && dy > Math.abs(dx)) closeFn();
      }
      function onMove(e) { if (tracking) { lx = e.clientX; ly = e.clientY; } }
      function onUp(e) { finish(e.clientX, e.clientY); }
      function onCancel() { finish(lx, ly); }
      el.addEventListener("pointerdown", function (e) {
        if (e.isPrimary === false) return;
        sx = e.clientX; sy = e.clientY; lx = sx; ly = sy; tracking = true;
        window.addEventListener("pointermove", onMove, true);
        window.addEventListener("pointerup", onUp, true);
        window.addEventListener("pointercancel", onCancel, true);
      });
    }
    var pagePill = document.getElementById("floatsearch");
    if (pagePill) {
      /* Recipes page: its own pill searches the cookbook in place. */
      var pageInput = document.getElementById("floatsearchinput");
      searchLink.addEventListener("click", function (e) {
        e.preventDefault();
        var open = pagePill.classList.toggle("fs-open");
        if (open && pageInput) pageInput.focus();
      });
      document.addEventListener("click", function (e) {
        if (!pagePill.classList.contains("fs-open")) return;
        if (pagePill.contains(e.target) || searchLink.contains(e.target)) return;
        pagePill.classList.remove("fs-open");
      });
      if (pageInput) pageInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); pagePill.classList.remove("fs-open"); searchLink.focus(); }
      });
      swipeDownClose(pagePill, function () { pagePill.classList.remove("fs-open"); });
      return;
    }
    var SCOPE_BY_PART = { home: "", account: "", "news-everyday": "news", "news-stocks": "news", "news-politics": "news", "news-korea": "news" };
    var SCOPE_NAMES = { deals: "Deals", food: "Food", news: "The Pond Post", travel: "Travel", korean: "Korean Corner", planner: "Planner", nest: "My Nest", books: "Book Nook", movies: "Movies & Shows", gifts: "Gift Planner", bills: "Nest Egg", stuff: "My Stuff", pets: "Pet Corner", countdowns: "Countdowns", pantry: "Pantry", polls: "Pond Polls", chat: "The Quack Shack", about: "About", calendar: "Calendar" };
    var SCOPE_PH = { deals: "Try: projector, TYD10, coupon, Mellow...", food: "Try: chicken, chocolate, soup...", news: "Try: stocks, politics, Korea, everyday...", travel: "Try: Paris, beach, mountains...", korean: "Try: hangul, hello, thank you...", planner: "Try: Black Friday, sales, notes...", nest: "Try: books, gifts, bills, pets...", books: "Try: a book title, an author...", movies: "Try: a movie title, a show..." };
    var homeScope = SCOPE_BY_PART.hasOwnProperty(part) ? SCOPE_BY_PART[part] : (SCOPE_NAMES[part] ? part : "");
    var scope = homeScope;
    var pill = document.createElement("div");
    pill.id = "tydfloatsearch";
    pill.setAttribute("role", "search");
    pill.innerHTML = '<button type="button" class="fs-scope" title="Tap to search just this section, or the whole Pond"></button><span class="fs-ico" aria-hidden="true">\uD83D\uDD0D</span><input type="search" aria-label="Search" autocomplete="off"><button type="button" class="fs-clear" aria-label="Clear search">\u00D7</button>';
    var pop = document.createElement("div");
    pop.id = "tydfloatsearchpop";
    document.body.appendChild(pill);
    document.body.appendChild(pop);
    var scopeBtn = pill.querySelector(".fs-scope"),
        input = pill.querySelector("input"),
        clearBtn = pill.querySelector(".fs-clear");
    var indexPromise = null, timer = null;
    function syncScopeUI() {
      scopeBtn.textContent = scope ? ("In " + (SCOPE_NAMES[scope] || partName)) : "Whole Pond";
      scopeBtn.classList.toggle("on", !!scope);
      input.placeholder = scope ? (SCOPE_PH[scope] || ("Search in " + (SCOPE_NAMES[scope] || partName) + "\u2026")) : "Search the Pond\u2026";
    }
    function loadIndex() {
      if (!indexPromise) indexPromise = fetch(base + "search-index.json").then(function (r) { return r.json(); }).then(function (d) { return d.entries || []; }).catch(function () { return []; });
      return indexPromise;
    }
    function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function renderPop(q, entries) {
      var words = q.toLowerCase().split(/\s+/).filter(Boolean);
      var hits = [];
      for (var i = 0; i < entries.length && hits.length < 6; i++) {
        var e = entries[i];
        if (scope && e.sec !== scope) continue;
        var hay = ((e.title || "") + " " + (e.sub || "") + " " + (e.kw || "")).toLowerCase();
        var ok = true;
        for (var w = 0; w < words.length; w++) if (hay.indexOf(words[w]) === -1) { ok = false; break; }
        if (ok) hits.push(e);
      }
      if (!q || !hits.length) { pop.classList.remove("open"); pop.innerHTML = ""; return; }
      var html = "";
      hits.forEach(function (e) {
        html += '<a href="' + base + e.href + '" draggable="false"><span class="t">' + escapeHtml(e.title) + '</span><span class="s">' + escapeHtml(SCOPE_NAMES[e.sec] || e.t || "") + '</span></a>';
      });
      var allHref = base + "search.html?" + (scope ? "scope=" + scope + "&q=" : "q=") + encodeURIComponent(q);
      html += '<a class="all" href="' + allHref + '" draggable="false"><span class="t">See all results for \u201C' + escapeHtml(q) + '\u201D</span><span class="s">\u2192</span></a>';
      pop.innerHTML = html;
      pop.classList.add("open");
    }
    function goSearch() {
      var q = input.value.trim();
      if (!q) return;
      location.href = base + "search.html?" + (scope ? "scope=" + scope + "&q=" : "q=") + encodeURIComponent(q);
    }
    function openPill() { pill.classList.add("open"); document.body.classList.add("tyd-floatsearch-open"); syncScopeUI(); input.focus(); }
    function closePill() { pill.classList.remove("open"); document.body.classList.remove("tyd-floatsearch-open"); pop.classList.remove("open"); pop.innerHTML = ""; }
    searchLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (pill.classList.contains("open")) closePill(); else openPill();
    });
    scopeBtn.addEventListener("click", function () {
      scope = scope ? "" : homeScope;
      syncScopeUI();
      if (input.value.trim()) loadIndex().then(function (en) { renderPop(input.value.trim(), en); });
      input.focus();
    });
    clearBtn.addEventListener("click", function () {
      if (input.value) { input.value = ""; pill.classList.remove("has-q"); pop.classList.remove("open"); pop.innerHTML = ""; input.focus(); }
      else closePill();
    });
    input.addEventListener("input", function () {
      pill.classList.toggle("has-q", !!input.value);
      clearTimeout(timer);
      var q = input.value.trim();
      if (!q) { pop.classList.remove("open"); pop.innerHTML = ""; return; }
      timer = setTimeout(function () { loadIndex().then(function (en) { renderPop(q, en); }); }, 150);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); goSearch(); }
      else if (e.key === "Escape") { e.preventDefault(); closePill(); searchLink.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!pill.classList.contains("open")) return;
      if (pill.contains(e.target) || pop.contains(e.target) || searchLink.contains(e.target)) return;
      closePill();
    });
    swipeDownClose(pill, closePill);
    swipeDownClose(pop, closePill);
    syncScopeUI();
  })();
  /* Sliding-pill active indicator (v341, Lucy picked option 1 from the
     Tab Bar Part 12 reel): one raised accent pill slides to the active
     tab. Mid-flight it stretches — the leading edge reaches the new tab
     first while the trailing edge lags, briefly spanning ~1.5-2 tab
     slots — then springs back to exactly one tab wide with a small
     overshoot/settle (the cubic-bezier on #tydnavpill). The icon stays a
     dark outline; the pill is the highlight. The pill marks the .on tab
     (the same active logic as before); tapping a bar link slides it
     there and the link navigates exactly as today. Reduced motion: it
     just jumps, with no stretch or spring. */
  var slidePill = document.createElement("span");
  slidePill.id = "tydnavpill";
  slidePill.setAttribute("aria-hidden", "true");
  nav.insertBefore(slidePill, nav.firstChild);
  var slidePillTimer = null;
  function tydPillReduced() {
    try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
  }
  function tydPillActive() { return nav.querySelector(":scope > a.on, :scope > button.on"); }
  function tydPillPlace(target, animate) {
    var el = target || tydPillActive();
    if (!el) { slidePill.style.width = "0px"; slidePill.style.left = "0px"; return; }
    var left = el.offsetLeft, width = el.offsetWidth;
    if (!width) return; /* not laid out yet; the load/resize pass retries */
    if (slidePillTimer) { clearTimeout(slidePillTimer); slidePillTimer = null; }
    slidePill.classList.remove("stretch");
    if (!animate || tydPillReduced()) {
      slidePill.classList.add("instant");
      slidePill.style.left = left + "px";
      slidePill.style.width = width + "px";
      return;
    }
    slidePill.classList.remove("instant");
    var curLeft = parseFloat(slidePill.style.left || "0") || 0;
    var curWidth = parseFloat(slidePill.style.width || "0") || 0;
    if (!curWidth || curLeft === left) {
      slidePill.style.left = left + "px";
      slidePill.style.width = width + "px";
      return;
    }
    /* Stretch phase: the leading edge reaches the new tab first. Moving
       right, the left edge stays and the pill grows to the new right
       edge; moving left, the left edge jumps to the new tab and the pill
       grows back to the old right edge. Either way it briefly spans
       about one-and-a-half to two tab slots. */
    slidePill.classList.add("stretch");
    if (left > curLeft) {
      slidePill.style.left = curLeft + "px";
      slidePill.style.width = (left + width - curLeft) + "px";
    } else {
      slidePill.style.left = left + "px";
      slidePill.style.width = (curLeft + curWidth - left) + "px";
    }
    slidePillTimer = setTimeout(function () {
      slidePillTimer = null;
      slidePill.classList.remove("stretch");
      slidePill.style.left = left + "px";
      slidePill.style.width = width + "px";
    }, 180);
  }
  function tydPillReposition() { tydPillPlace(null, false); }
  /* Tapping a bar link slides the pill there; the link itself navigates
     exactly as before (no preventDefault, no behavior change). Buttons
     (Menu, Refresh, Pond Pal) are actions, not tabs, so they never move
     it. The Menu pull-down and New quack button are untouched. */
  nav.addEventListener("click", function (e) {
    var t = (e.target && e.target.closest) ? e.target.closest("a") : null;
    if (t && t.parentNode === nav) tydPillPlace(t, true);
  });
  window.addEventListener("resize", tydPillReposition);
  window.addEventListener("load", tydPillReposition);
  tydPillPlace(null, false);
  /* Test seam (v341): jsdom tests drive the pill directly, since jsdom
     has no layout (offsetLeft/offsetWidth are 0 until stubbed). */
  window.TYDNavPill = {
    pill: function () { return slidePill; },
    active: tydPillActive,
    place: tydPillPlace,
    reposition: tydPillReposition,
    reduced: tydPillReduced
  };
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) { navMenu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); if (menuEditing) { menuEditing = false; renderNavMenu(); } } });
  /* AI helper (Lucy, Nov 14, 2026): pages that already have a floating
     helper pill (Recipe help on Food, the helper chat everywhere else) get
     a Pond Pal button on the bar instead. The pill is hidden by CSS, and
     the button just taps it, so the panel opens exactly as before. The pill
     is created by the page's own script, which runs after this one, so the
     button is wired when the pill appears. */
  var aiWired = false;
  function tydWireAI() {
    if (aiWired) return;
    var pill = document.querySelector(".phelp-launch,.rhelp-launch,.hfloat-launch");
    if (!pill) return;
    aiWired = true;
    var aiBtn = document.createElement("button");
    aiBtn.type = "button";
    aiBtn.setAttribute("aria-label", "Pond Pal");
    aiBtn.setAttribute("title", "Pond Pal");
    aiBtn.innerHTML = '<span class="ic">🦆</span><span class="nlb">Pond Pal</span>';
    aiBtn.addEventListener("click", function () {
      navMenu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
      pill.click();
    });
    nav.insertBefore(aiBtn, refr);
    tydPillReposition(); /* the new button shifts the tabs, so the pill re-seats */
  }
  tydWireAI();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tydWireAI);
  if (window.MutationObserver) {
    var aiObs = new MutationObserver(function () { tydWireAI(); if (aiWired) aiObs.disconnect(); });
    aiObs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", function () { if (!aiWired) aiObs.disconnect(); });
  }

  /* Top pulldown section switcher, near the top of every page (admin.html
     does not load this script at all, and is double-guarded here). */
  if (fbase !== "admin") {
    var partLinks = [
      { key: "deals", label: "Deals", duck: base + "images/corners/duck-deals.jpg", desc: "Verified deals, codes and price drops", href: base + "deals.html" },
      { key: "news", label: "The Pond Post", duck: base + "images/corners/duck-news.jpg", desc: "Today's news, straight up", href: base + "news.html" },
      { key: "news-everyday", label: "Everyday Stuff", duck: base + "images/corners/duck-news.jpg", desc: "Everyday news, the live feed and the chat", href: base + "news.html?cat=everyday" },
      { key: "news-stocks", label: "Stocks", duck: base + "images/corners/duck-news.jpg", desc: "Live market news from Benzinga, plus the chat", href: base + "news.html?cat=stocks" },
      { key: "news-politics", label: "Politics", duck: base + "images/corners/duck-news.jpg", desc: "Politics news, the live feed and the chat", href: base + "news.html?cat=politics" },
      { key: "news-korea", label: "South Korea", duck: base + "images/corners/duck-news.jpg", desc: "Korea news in English or Korean, plus the chat", href: base + "news.html?cat=korea" },
      { key: "food", label: "Food", duck: base + "images/avatars/duck-chef.jpg", desc: "Recipes, meal plans and grocery lists", href: base + "recipes.html" },
      { key: "pantry", label: "Pantry", duck: base + "images/corners/duck-pantry.jpg", desc: "What you have, what you need", href: base + "pantry.html" },
      { key: "travel", label: "Travel", duck: base + "images/corners/duck-travel.jpg", desc: "Plan trips, places and packing lists", href: base + "travel.html" },
      { key: "korean", label: "Korean", duck: base + "images/corners/duck-korean.jpg", desc: "Flashcards, phrases and listening practice", href: base + "korean.html" },
      { key: "planner", label: "Planner", duck: base + "images/avatars/duck-artist.jpg", desc: "Your day, week and notes in one place", href: base + "planner.html" },
      { key: "calendar", label: "Calendar", duck: base + "images/corners/duck-calendar.jpg", desc: "Every date in the Pond, on one calendar", href: base + "calendar.html" },
      { key: "nest", label: "My Nest", duck: base + "images/corners/duck-nest.jpg", desc: "All your personal corners in one hub", href: base + "nest.html" },
      { key: "books", label: "Book Nook", duck: base + "images/avatars/duck-bookworm.jpg", desc: "Your books, shelves and star ratings", href: base + "books.html" },
      { key: "movies", label: "Movies & Shows", duck: base + "images/avatars/duck-movie.jpg", desc: "Your movies and shows, Have and Want to Watch", href: base + "movies.html" },
      { key: "gifts", label: "Gift Planner", duck: base + "images/corners/duck-gift.jpg", desc: "Gift ideas, budgets and price watches", href: base + "gifts.html" },
      { key: "bills", label: "Nest Egg", duck: base + "images/corners/duck-nestegg.jpg", desc: "Bills, due dates and money totals", href: base + "bills.html" },
      { key: "stuff", label: "My Stuff", duck: base + "images/corners/duck-stuff.jpg", desc: "Where everything is, plus warranties", href: base + "stuff.html" },
      { key: "pets", label: "Pet Corner", duck: base + "images/corners/duck-pet.jpg", desc: "Your pets, food, vet and care dates", href: base + "pets.html" },
      { key: "countdowns", label: "Countdowns", duck: base + "images/corners/duck-countdown.jpg", desc: "Count down to the big days", href: base + "countdowns.html" },
      { key: "polls", label: "Pond Polls", duck: base + "images/corners/duck-polls.jpg", desc: "Vote in the Pond's polls", href: base + "polls.html" },
      { key: "chat", label: "The Quack Shack", duck: base + "images/corners/duck-chat.jpg", desc: "Chat about anything duck-themed", href: base + "chat.html" }
    ];
    var curDuck = base + "images/duck-menu-blue.png";
    for (var ci = 0; ci < partLinks.length; ci++) if (partLinks[ci].key === part) curDuck = partLinks[ci].duck;
    var sw = document.createElement("div");
    sw.id = "tydswitch";
    var swIn = document.createElement("div");
    swIn.id = "tydswitchin";
    swIn.innerHTML = '<button type="button" id="tydswitchbtn" aria-haspopup="true"><span><img class="swbduck" src="' + curDuck + '" alt=""><span class="swname">' + partName + '</span></span><span class="swhint"><span class="swwords">Switch section </span><span class="car">▾</span></span></button>'
      + '<div id="tydswitchmenu" hidden></div>';
    sw.appendChild(swIn);
    document.body.insertBefore(sw, document.body.firstChild);
    /* The bar is fixed now, so it leaves the flow: push the page down by
       its height so nothing hides under it (Lucy, Nov 13, 2026). */
    function tydTopPad(){ document.body.style.paddingTop = (sw.offsetHeight + 10) + "px"; }
    tydTopPad();
    window.addEventListener("resize", tydTopPad);
    window.addEventListener("load", tydTopPad);
    var hostEl = document.querySelector(".app") || document.querySelector(".wrap") || document.body;
    var swBtn = sw.querySelector("#tydswitchbtn");
    var swMenu = sw.querySelector("#tydswitchmenu");
    /* Adaptive switcher name size (Lucy, Nov 13, 2026): short names like
       Home looked lost in the wide pill, so the name now scales to fill
       the button: it grows to a max (22px desktop / 18px phone) and only
       shrinks below that when a long name needs the room, never below
       today's size (14px / 12.5px), with the ellipsis as the last resort.
       The duck + name group is centered in the pill (first span flex:1).
       Runs on build, resize, load, and once the webfont arrives, and
       re-pads the page after, since a bigger name makes the bar taller. */
    function tydFitSwitchName(){
      var btn = document.getElementById("tydswitchbtn");
      if (!btn) return;
      var name = btn.querySelector(".swname");
      var span = name && name.parentElement;
      var duck = btn.querySelector(".swbduck");
      if (!name || !span) return;
      var phone = window.innerWidth <= 480;
      var max = phone ? 18 : 22, min = phone ? 12.5 : 14;
      var avail = span.clientWidth - (duck ? duck.offsetWidth + 6 : 0) - 8;
      if (avail < 40) return;
      name.style.fontSize = max + "px";
      var w = name.offsetWidth;
      if (w <= avail) { tydTopPad(); return; }
      var size = Math.max(min, Math.floor(max * avail / w * 10) / 10);
      name.style.fontSize = size + "px";
      while (name.offsetWidth > avail && size > min) {
        size = Math.max(min, size - 0.5);
        name.style.fontSize = size + "px";
      }
      tydTopPad();
    }
    tydFitSwitchName();
    window.addEventListener("resize", tydFitSwitchName);
    window.addEventListener("load", tydFitSwitchName);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(tydFitSwitchName);
    /* Customizable switcher (Lucy, Nov 10, 2026): each visitor can pick
       which sections the switcher shows and in what order. Saved on this
       device in localStorage tydSectionOrder / tydSectionHidden and, when
       signed in, synced to the member's Pond account (users doc fields
       sectionOrder / sectionHidden) so the menu follows them across
       devices; localStorage stays the instant layer that applies at
       first paint and when signed out. First visit is the factory order
       with everything visible. */
    /* Nested switcher groups (Lucy, Nov 15, 2026): the switcher list was
       too long with every related page as a flat row, so related pages
       live under their parent as a pull-down inside the pull-down.
       Groupings (only where the site already treats them as a group):
       - The Pond Post → its four topics (news.html?cat=, in the Pond
         Post bar and the news hub).
       - Deals → its seven pages (Deal Pockets first, then the six
         category pages: the bottom menu groups them under Deals,
         and the deals.html category row lists them).
       - Food → Pantry (recipes.html and pantry.html link to each
         other; Pantry is in the Food bottom bar).
       - My Nest → its five personal corners (nest.html cards them:
         Gift Planner, Nest Egg, My Stuff, Pet Corner, Countdowns).
       A parent is ONE unit — pinnable and reorderable as a whole, with
       its children in fixed order under it. Children are never
       individually pinnable, so any saved child pin is dropped here
       (and again wherever account prefs land). Hiding a parent hides
       the whole unit; hiding one child (possible for children that are
       switcher sections, e.g. a Pond Post topic) hides just that
       sub-row. Sub-lists start collapsed; a group auto-opens on one of
       its child pages so the current page is visible, and the
       open/closed state per group is remembered on this device
       (tydSubsOpen, one JSON object). The Deals children are not
       switcher sections themselves, so they are defined here (duck,
       label, description, page) and match the current page by filename
       (match), since the top bar still says Deals on those pages. */
    var SEC_GROUPS = {
      news: ["news-everyday", "news-stocks", "news-politics", "news-korea"],
      deals: ["deal-pockets", "lego", "home-goods", "tech", "beauty", "baby", "viral"],
      food: ["pantry"],
      nest: ["gifts", "bills", "stuff", "bins", "pets", "countdowns", "books", "movies"]
    };
    var SEC_EXTRA_ROWS = {
      /* v338 (Lucy, Nov 16, 2026): Deal Pockets first under Deals, before
         LEGO Deals, so it is right there in the switcher. */
      "deal-pockets": { key: "deal-pockets", label: "Deal Pockets", duck: base + "images/corners/duck-deals.jpg", desc: "One pocket a day, every day", href: base + "deal-pockets.html", match: "deal-pockets" },
      lego: { key: "lego", label: "LEGO Deals", duck: base + "images/corners/duck-deals.jpg", desc: "Discounted LEGO sets", href: base + "lego.html", match: "lego" },
      "home-goods": { key: "home-goods", label: "Home Goods", duck: base + "images/corners/duck-deals.jpg", desc: "Deals for the home", href: base + "home-goods.html", match: "home-goods" },
      tech: { key: "tech", label: "Tech", duck: base + "images/corners/duck-deals.jpg", desc: "Tech deals", href: base + "tech.html", match: "tech" },
      beauty: { key: "beauty", label: "Beauty", duck: base + "images/corners/duck-deals.jpg", desc: "Beauty deals", href: base + "beauty.html", match: "beauty" },
      baby: { key: "baby", label: "Baby", duck: base + "images/corners/duck-deals.jpg", desc: "Baby deals", href: base + "baby.html", match: "baby" },
      viral: { key: "viral", label: "Viral Deals", duck: base + "images/corners/duck-deals.jpg", desc: "What's blowing up online", href: base + "viral.html", match: "viral" },
      /* v345 (Lucy, Nov 17, 2026): Bins lived under My Stuff in the
         switcher, so the stuff row was a group of its own. v362 (Lucy,
         Nov 18, 2026): Bins is a direct My Nest member now, alongside
         Book Nook, so the My Stuff subgroup is gone. */
      bins: { key: "bins", label: "Bins", duck: base + "images/corners/duck-bins.jpg", desc: "Your storage bins, what's inside each one", href: base + "bins.html", match: "bins" }
    };
    /* v366 (Lucy, Nov 18, 2026): self-serve section moves. The canonical
       grouping above stays the default for everyone. A member can move a
       section under a different category (or back to the top level) from
       Customize; the choice is stored per account (tydSectionGroups
       locally, sectionGroups on the account, same v339 pattern as the
       order/hide/pin prefs) so one person's moves never change anyone
       else's Pond. The override maps a section key to its new parent
       key, or null for top level; moving a section back to its canonical
       parent drops it out of the map entirely. Group parents themselves
       (Pond Post, Deals, Food, My Nest) never move, since they carry
       their children with them. */
    var secGroupsOverride = {};
    try { secGroupsOverride = JSON.parse(localStorage.getItem("tydSectionGroups") || "{}") || {}; } catch (e) { secGroupsOverride = {}; }
    function secCanonicalParent(k) { for (var g in SEC_GROUPS) if (SEC_GROUPS[g].indexOf(k) > -1) return g; return null; }
    function secEffectiveGroups() {
      var eff = {}, g, k;
      for (g in SEC_GROUPS) eff[g] = SEC_GROUPS[g].slice();
      for (k in secGroupsOverride) {
        if (!secGroupsOverride.hasOwnProperty(k)) continue;
        for (g in eff) { var at = eff[g].indexOf(k); if (at > -1) eff[g].splice(at, 1); }
        var parent = secGroupsOverride[k];
        if (parent && eff[parent] && eff[parent].indexOf(k) === -1) eff[parent].push(k);
      }
      return eff;
    }
    function secChildKeys(parent) { return secEffectiveGroups()[parent] || []; }
    function secIsGroup(k) { return !!SEC_GROUPS[k]; }
    function isSecChild(k) { var eff = secEffectiveGroups(); for (var g in eff) if (eff[g].indexOf(k) > -1) return true; return false; }
    function secCurrentParent(k) { var eff = secEffectiveGroups(); for (var g in eff) if (eff[g].indexOf(k) > -1) return g; return null; }
    function secMovableKeys() {
      /* Movable sections are the switcher sections (partLinks, minus the
         group parents) plus Bins, which is a real section even though it
         is not a partLinks row (SEC_EXTRA_ROWS). The seven deal-category
         rows are not switcher sections, so they stay put under Deals. */
      var keys = partLinks.map(function (p) { return p.key; });
      if (keys.indexOf("bins") === -1) keys.push("bins");
      return keys.filter(function (x) { return !secIsGroup(x); });
    }
    function secValidGroups(obj) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
      var known = {}, out = {}, k;
      for (var i = 0; i < partLinks.length; i++) known[partLinks[i].key] = true;
      known.bins = true;
      for (k in obj) {
        if (!obj.hasOwnProperty(k) || !known[k] || secIsGroup(k)) continue;
        var v = obj[k];
        if (v === null || v === "") out[k] = null;
        else if (typeof v === "string" && secIsGroup(v)) out[k] = v;
      }
      return out;
    }
    function secSetParent(k, parent) {
      if (!k || secIsGroup(k)) return;
      if (parent !== null && !secIsGroup(parent)) return;
      if (parent === secCanonicalParent(k)) delete secGroupsOverride[k];
      else secGroupsOverride[k] = parent;
      if (parent && secIsPinned(k)) secPins = secPins.filter(function (x) { return x !== k; });
      secSaveLocal();
      renderMenu();
    }
    function secResetGroups() {
      secGroupsOverride = {};
      try { localStorage.removeItem("tydSectionGroups"); } catch (e) {}
    }
    /* Test seam (v366): jsdom tests drive moves directly, since the
       live account sync needs the Firebase CDN. */
    window.TYDSectionMoves = { groups: secEffectiveGroups, currentParent: secCurrentParent, set: secSetParent, reset: secResetGroups, movable: secMovableKeys, override: function () { return secGroupsOverride; } };
    function secChildRow(k) {
      for (var i = 0; i < partLinks.length; i++) if (partLinks[i].key === k) return partLinks[i];
      return SEC_EXTRA_ROWS[k] || null;
    }
    function secChildIsCurrent(c) { return c.key === part || (!!c.match && c.match === fbase); }
    /* A group is current when any of its children is (Nov 15, 2026,
       v321): on news.html?cat=stocks part is "news-stocks", so the
       Pond Post parent never equals part — without this only the
       child row highlighted. Same for Food/Pantry and My Nest. */
    function secGroupIsCurrent(parentKey) {
      var kids = secChildKeys(parentKey);
      for (var i = 0; i < kids.length; i++) { var c = secChildRow(kids[i]); if (c && secChildIsCurrent(c)) return true; }
      return false;
    }
    var groupSubsOpen = {};
    try { groupSubsOpen = JSON.parse(localStorage.getItem("tydSubsOpen") || "{}") || {}; } catch (e) { groupSubsOpen = {}; }
    function groupIsOpen(parent) {
      if (groupSubsOpen.hasOwnProperty(parent)) return !!groupSubsOpen[parent];
      var kids = secChildKeys(parent);
      for (var i = 0; i < kids.length; i++) { var c = secChildRow(kids[i]); if (c && secChildIsCurrent(c)) return true; }
      return false;
    }
    /* v361 (Lucy, Nov 18, 2026): accordion — only one group open per
       nesting level. Level 0 is the top-level groups (Pond Post,
       Deals, Food, My Nest); level 1 is a group nested inside another
       group. v362 (Lucy, Nov 18, 2026): Bins moved out of the My Stuff
       subgroup to a direct My Nest member, so no nested group remains
       right now; the level logic stays generic for any future one.
       Opening a group closes the other groups at its level only:
       opening a top-level group never destroys another group's stored
       state (it just hides with its parent and is still open when the
       parent opens again). */
    function secGroupParent(g) {
      var eff = secEffectiveGroups();
      for (var p in eff) if (eff[p].indexOf(g) > -1) return p;
      return null;
    }
    function secGroupLevel(g) {
      var lvl = 0, p = secGroupParent(g);
      while (p) { lvl++; p = secGroupParent(p); }
      return lvl;
    }
    /* Close every other open group at the same level as g. A group
       open by the current-page default (no stored entry) gets an
       explicit false, or the default would re-open it on the next
       render. */
    function secAccordionCloseOthers(g) {
      var lvl = secGroupLevel(g);
      for (var k in SEC_GROUPS) {
        if (k !== g && secGroupLevel(k) === lvl && groupIsOpen(k)) groupSubsOpen[k] = false;
      }
    }
    /* One-time tidy on load: pre-v361 state (and any later drift) can
       hold several groups open at one level — Lucy's menu showed Pond
       Post, Food and My Nest open at once. Keep the group holding the
       current page when there is one, else the first in SEC_GROUPS
       order; close the rest and persist, so the menu opens tidy. */
    function secNormalizeSubsOpen() {
      var byLevel = {};
      for (var k in SEC_GROUPS) {
        if (!groupIsOpen(k)) continue;
        var lvl = secGroupLevel(k);
        if (!byLevel[lvl]) { byLevel[lvl] = k; continue; }
        var keep = byLevel[lvl];
        if (secGroupIsCurrent(k) && !secGroupIsCurrent(keep)) byLevel[lvl] = k;
      }
      for (var k2 in SEC_GROUPS) {
        if (groupIsOpen(k2) && byLevel[secGroupLevel(k2)] !== k2) groupSubsOpen[k2] = false;
      }
      try { localStorage.setItem("tydSubsOpen", JSON.stringify(groupSubsOpen)); } catch (e) {}
    }
    secNormalizeSubsOpen();
    function secDropChildPins() { secPins = secPins.filter(function (k) { return !isSecChild(k); }); }
    var secOrder = null, secHidden = [];
    try {
      var soSaved = JSON.parse(localStorage.getItem("tydSectionOrder") || "null");
      if (soSaved && soSaved.length) secOrder = soSaved;
      var shSaved = JSON.parse(localStorage.getItem("tydSectionHidden") || "[]");
      if (shSaved && shSaved.length) secHidden = shSaved;
    } catch (e) {}
    function secIsHidden(k) { return secHidden.indexOf(k) > -1; }
    var secPins = [];
    try {
      var spSaved = JSON.parse(localStorage.getItem("tydSectionPins") || "[]");
      if (spSaved && spSaved.length) secPins = spSaved.filter(function (k) { return k !== "deals" && !isSecChild(k); }).slice(0, 3);
    } catch (e) {}
    function secIsPinned(k) { return secPins.indexOf(k) > -1; }
    function secOrdered() {
      var byKey = {}, out = [], i, k;
      for (i = 0; i < partLinks.length; i++) byKey[partLinks[i].key] = partLinks[i];
      if (secOrder) for (i = 0; i < secOrder.length; i++) { k = secOrder[i]; if (byKey[k]) { out.push(byKey[k]); delete byKey[k]; } }
      for (i = 0; i < partLinks.length; i++) if (byKey[partLinks[i].key]) { out.push(partLinks[i]); delete byKey[partLinks[i].key]; }
      return out;
    }
    function secSaveLocal() {
      try {
        localStorage.setItem("tydSectionOrder", JSON.stringify(secOrdered().map(function (p) { return p.key; })));
        localStorage.setItem("tydSectionHidden", JSON.stringify(secHidden));
        localStorage.setItem("tydSectionPins", JSON.stringify(secPins));
        localStorage.setItem("tydSectionGroups", JSON.stringify(secGroupsOverride));
      } catch (e) {}
    }
    /* Account sync for the customization (Lucy, Nov 10, 2026): when a
       member is signed in, their switcher also lives in their Pond
       account (users doc: sectionOrder, sectionHidden, sectionPrefsSet)
       so it is the same on every device. Rules:
       - Sign-in: if the account has saved prefs (sectionPrefsSet true,
         or either array present) the account wins and this device
         adopts them. If the account has none but this device holds a
         non-default customization, the device's prefs upload once
         (first-time migration). If both are defaults, nothing happens.
       - Every customize change while signed in writes BOTH layers
         (secSave below wraps secSaveLocal + secPushAccount).
       - Reset writes the factory defaults to the account WITH
         sectionPrefsSet: true (see the reset handler), so a reset on
         one device resets every device instead of being overwritten
         by a stale local customization there.
       - Sign-out leaves this device's menu exactly as it is.
       - Any Firebase failure quietly degrades to localStorage-only. */
    /* SEC-SYNC-BEGIN */
    var secAcct = { uid: null, fs: null, db: null };
    function secValidKeys(arr) {
      if (!Array.isArray(arr)) return null;
      var known = {};
      for (var i = 0; i < partLinks.length; i++) known[partLinks[i].key] = true;
      return arr.filter(function (k) { return known[k]; });
    }
    function secIsDefaultState() {
      if (secHidden.length) return false;
      if (secPins.length) return false;
      if (Object.keys(secGroupsOverride).length) return false;
      var cur = secOrdered();
      if (cur.length !== partLinks.length) return false;
      for (var i = 0; i < cur.length; i++) if (cur[i].key !== partLinks[i].key) return false;
      return true;
    }
    function secApplyState(order, hidden, pins, groups) {
      secOrder = order && order.length ? order : null;
      secHidden = hidden ? hidden.slice() : [];
      secPins = pins ? pins.slice() : [];
      secGroupsOverride = groups ? groups : {};
      secDropChildPins();
      secSaveLocal();
      renderMenu();
    }
    function secPushAccount() {
      if (!secAcct.uid || !secAcct.fs || !secAcct.db) return;
      try {
        secAcct.fs.setDoc(secAcct.fs.doc(secAcct.db, "users", secAcct.uid), {
          sectionOrder: secOrdered().map(function (p) { return p.key; }),
          sectionHidden: secHidden.slice(),
          sectionPins: secPins.slice(),
          sectionGroups: JSON.parse(JSON.stringify(secGroupsOverride)),
          sectionPrefsSet: true
        }, { merge: true }).catch(function () {});
      } catch (e) {}
    }
    function secSave() { secSaveLocal(); secPushAccount(); }
    function secHandleUser(fsMod, db, user) {
      secAcct.fs = fsMod; secAcct.db = db; secAcct.uid = user.uid;
      return fsMod.getDoc(fsMod.doc(db, "users", user.uid)).then(function (snap) {
        var d = snap && snap.exists() ? snap.data() : {};
        var hasSaved = !!d && (d.sectionPrefsSet === true || Array.isArray(d.sectionOrder) || Array.isArray(d.sectionHidden) || Array.isArray(d.sectionPins) || (d.sectionGroups && typeof d.sectionGroups === "object"));
        if (hasSaved) {
          var acctPins = (secValidKeys(d.sectionPins) || []).filter(function (k) { return k !== "deals"; }).slice(0, 3);
          secApplyState(secValidKeys(d.sectionOrder), secValidKeys(d.sectionHidden) || [], acctPins, secValidGroups(d.sectionGroups) || {});
          if (window.TYDSetupPond && window.TYDSetupPond.isOpen()) { tydSetupMarkDone(); window.TYDSetupPond.close(); }
        } else if (!secIsDefaultState()) {
          secPushAccount();
        }
      }).catch(function () {});
    }
    /* SEC-SYNC-END */
    /* What's New (Nov 15, 2026): the owner (Lucy) sees the FULL update
       list on her own account; everyone else sees only the last 5 (the
       CSS on index.html hides the rest) unless they tap "Show all
       updates". This runs on every auth change so signing out collapses
       the card again. */
    var TYD_OWNER_UID = "1hbpZnS7gfPd0ptzygwiaDBfjo63";
    var tydWhatsNewOwnerExpanded = false;
    function tydWhatsNewForUser(uid) {
      var card = document.getElementById("whatsnew");
      if (!card) return;
      if (uid === TYD_OWNER_UID) {
        card.classList.add("expanded");
        tydWhatsNewOwnerExpanded = true;
      } else if (tydWhatsNewOwnerExpanded) {
        card.classList.remove("expanded");
        tydWhatsNewOwnerExpanded = false;
      }
    }
    /* Signed-in only (Lucy, Nov 15, 2026): the What's New card shows
       only to signed-in members. When auth resolves to a member and this
       version has not been seen yet, show the card; when signed out (or
       the version was already seen), keep it hidden. The version lives
       on the card as data-v so this shared script does not need to know
       the current V. */
    function tydWhatsNewShow(uid) {
      var card = document.getElementById("whatsnew");
      if (!card) return;
      if (!uid) { card.hidden = true; return; }
      var v = card.getAttribute("data-v") || "";
      var seen = "";
      try { seen = localStorage.getItem("tydWhatsNewSeen") || ""; } catch (e) {}
      card.hidden = !v || seen === v;
    }
    /* Account bar sign-in state (v316): site-nav.js builds #tydacctbar on
       every page without its own .account-bar, but nothing painted the
       signed-in state into it — lego.html and the v313 pages never load
       auth-pill.js, so the bar stayed on "Log in / Sign up free" even
       while signed in. This paints the bar from site-nav.js's own auth
       wiring, so every page sharing the pattern shows the real state. */
    function paintAcctBar(user, label, av, onLogout) {
      var bar = document.getElementById("tydacctbar");
      if (!bar) return;
      var who = bar.querySelector(".tydab-who");
      var st = bar.querySelector(".tydab-state");
      var escLabel = String(label == null ? "" : label).replace(/</g, "&lt;");
      var img = "";
      if (/^duck-[a-z]+$/.test(av || "")) img = base + "images/avatars/" + av + ".jpg";
      if (who) who.innerHTML = (img ? '<img class="tydab-av" src="' + img + '" alt="">' : (user ? "" : "🦆 ")) + escLabel;
      if (st) {
        if (user) {
          st.innerHTML = '<a class="tydab-btn" href="' + base + 'account.html">My Account</a><button type="button" class="tydab-btn alt" id="tydab-logout">Log out</button>';
          var lo = document.getElementById("tydab-logout");
          if (lo && onLogout) lo.addEventListener("click", onLogout);
        } else {
          st.innerHTML = '<a class="tydab-btn" href="' + base + 'account.html">Log in</a><a class="tydab-btn alt" href="' + base + 'account.html">Sign up free</a>';
        }
      }
    }
    /* Test seam (v316): jsdom tests drive the paint directly, since the
       live auth wiring needs the Firebase CDN. */
    window.TYDAccountBar = { paint: paintAcctBar };
    /* ACC-SYNC-BEGIN: accent theme sync, same merge rule as the section
       switcher. Sign-in: if the account has a saved themeAccent the
       account wins and this device adopts it. If the account has none
       but this device holds a non-default accent, the device's accent
       uploads once. Every accent change while signed in writes both
       layers. Any Firebase failure quietly degrades to localStorage. */
    var accAcct = { uid: null, fs: null, db: null };
    /* Shared account push (v339): any site-nav code that saves a member
       preference (theme mode, color-blindness, clipped codes) pushes it
       through here; signed out it quietly does nothing and the local
       copy stays the fallback. */
    function accPush(fields) {
      if (window.TYDAccountPush && window.TYDAccountPush._pushSink) { try { window.TYDAccountPush._pushSink(fields); } catch (e) {} return; }
      if (!accAcct.uid || !accAcct.fs || !accAcct.db || !fields) return;
      try {
        accAcct.fs.setDoc(accAcct.fs.doc(accAcct.db, "users", accAcct.uid), fields, { merge: true }).catch(function () {});
      } catch (e) {}
    }
    window.TYDAccountPush = function (fields) { accPush(fields); };
    function accPushAccount() {
      accPush({ themeAccent: tydAccent, themeAccentCustom: tydCustomColor, themeAccentLight: tydCustomLight, themeAccentDark: tydCustomDark });
    }
    window.TYDSetAccent = function (v) {
      if (TYD_ACCENTS.indexOf(v) === -1) return;
      tydAccent = v;
      tydApplyAccent(v);
      try { localStorage.setItem("tydAccent", v); } catch (e) {}
      accPushAccount();
      if (window.TYDAccentPaint) window.TYDAccentPaint(v);
      tydPaintColorPop();
    };
    window.TYDGetAccent = function () { return tydAccent; };
    function accHandleUser(fsMod, db, user) {
      accAcct.fs = fsMod; accAcct.db = db; accAcct.uid = user.uid;
      return fsMod.getDoc(fsMod.doc(db, "users", user.uid)).then(function (snap) {
        var d = snap && snap.exists() ? snap.data() : {};
        if (d && TYD_ACCENTS.indexOf(d.themeAccent) > -1) {
          tydAccent = d.themeAccent;
          if (tydAccent === "custom") {
            if (d.themeAccentCustom && /^#[0-9a-fA-F]{6}$/.test(d.themeAccentCustom)) tydCustomColor = d.themeAccentCustom.toLowerCase();
            if (typeof d.themeAccentLight === "number" && d.themeAccentLight >= 70 && d.themeAccentLight <= 95) tydCustomLight = d.themeAccentLight;
            if (typeof d.themeAccentDark === "number" && d.themeAccentDark >= 40 && d.themeAccentDark <= 90) tydCustomDark = d.themeAccentDark;
          }
          tydApplyAccent(tydAccent);
          try { localStorage.setItem("tydAccent", tydAccent); } catch (e) {}
          if (window.TYDAccentPaint) window.TYDAccentPaint(tydAccent);
          tydPaintColorPop();
        } else if (tydAccent !== "pond") {
          accPushAccount();
        }
        /* v339: light/dark mode, color-blindness and clipped codes follow
           the same rule — the account wins when it has a value; when it
           has none but this device holds a non-default choice, the
           device's choice uploads once. Codes union-merge by id, so a
           code clipped on another device is never lost. */
        if (d && (d.themeMode === "light" || d.themeMode === "dark")) {
          if (d.themeMode !== tydTheme) tydSetTheme(d.themeMode);
        } else if (tydTheme === "dark") {
          accPush({ themeMode: "dark" });
        }
        if (d && TYD_CB_TYPES.indexOf(d.colorBlind) > -1) {
          if (d.colorBlind !== tydColorBlind) window.TYDSetColorBlind(d.colorBlind);
        } else if (tydColorBlind !== "none") {
          accPush({ colorBlind: tydColorBlind });
        }
        var remoteCodes = (d && Array.isArray(d.plannerCodes)) ? d.plannerCodes : [];
        var localCodes = [];
        try { localCodes = JSON.parse(localStorage.getItem("tydClippedCodes") || "[]") || []; } catch (e) { localCodes = []; }
        if (!Array.isArray(localCodes)) localCodes = [];
        if (remoteCodes.length) {
          var cids = {};
          localCodes.forEach(function (c) { if (c && c.id) cids[c.id] = 1; });
          var codesAdded = false;
          remoteCodes.forEach(function (c) { if (c && c.id && !cids[c.id]) { localCodes.push(c); codesAdded = true; } });
          if (codesAdded) {
            try { localStorage.setItem("tydClippedCodes", JSON.stringify(localCodes)); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent("tyd:codes")); } catch (e) {}
            accPush({ plannerCodes: localCodes });
          }
        } else if (localCodes.length) {
          accPush({ plannerCodes: localCodes });
        }
      }).catch(function () {});
    }
    (function accInitSync() {
      try {
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
          var db = mods[2].getFirestore(app);
          mods[1].onAuthStateChanged(mods[1].getAuth(app), function (user) {
            if (!user) { accAcct.uid = null; tydWhatsNewForUser(null); tydWhatsNewShow(null); paintAcctBar(null, "Pond Account", "", null); return; }
            if (accAcct.uid === user.uid) return;
            accHandleUser(mods[2], db, user);
            tydWhatsNewForUser(user.uid);
            tydWhatsNewShow(user.uid);
            var logoutFn = function () { try { mods[1].signOut(mods[1].getAuth(app)); } catch (e) {} };
            paintAcctBar(user, user.email || "", "", logoutFn);
            mods[2].getDoc(mods[2].doc(db, "profiles", user.uid)).then(function (snap) {
              var un = snap.exists() ? (snap.data().username || "") : "";
              var av = snap.exists() ? (snap.data().avatar || "") : "";
              paintAcctBar(user, un ? "@" + un : (user.email || ""), av, logoutFn);
            }).catch(function () {});
          });
        }).catch(function () {});
      } catch (e) {}
    })();
    /* ACC-SYNC-END */
    /* Firebase load + auth wiring, copying bell.js / auth-pill.js: the
       modular SDK via dynamic import, the shared app via the getApps()
       guard so nothing double-initializes alongside them. */
    (function secInitSync() {
      try {
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
          var db = mods[2].getFirestore(app);
          mods[1].onAuthStateChanged(mods[1].getAuth(app), function (user) {
            if (!user) { secAcct.uid = null; menuAcct.uid = null; tydWhatsNewForUser(null); tydWhatsNewShow(null); paintAcctBar(null, "Pond Account", "", null); return; }
            if (secAcct.uid === user.uid) return;
            secHandleUser(mods[2], db, user);
            menuHandleUser(mods[2], db, user);
            tydWhatsNewForUser(user.uid);
            tydWhatsNewShow(user.uid);
            var logoutFn = function () { try { mods[1].signOut(mods[1].getAuth(app)); } catch (e) {} };
            paintAcctBar(user, user.email || "", "", logoutFn);
            mods[2].getDoc(mods[2].doc(db, "profiles", user.uid)).then(function (snap) {
              var un = snap.exists() ? (snap.data().username || "") : "";
              var av = snap.exists() ? (snap.data().avatar || "") : "";
              paintAcctBar(user, un ? "@" + un : (user.email || ""), av, logoutFn);
            }).catch(function () {});
          });
        }).catch(function () {});
      } catch (e) {}
    })();
    var customizing = false;
    function renderMenu() {
      var list = secOrdered(), html = "", i, p;
      var secCounts = window.TYD_SEC_COUNTS || {};
      var homeRow = '<a href="' + base + 'index.html"' + (part === "home" ? ' class="cur"' : "") + '><img class="tydswduck" src="' + base + 'icon-192.png" alt=""><span class="swtx"><span class="swlb">' + (part === "home" ? "✓ " : "") + 'Home</span><span class="swds">Every category and the special links</span></span>' + (secCounts.home ? '<span class="swbdg">' + (secCounts.home > 9 ? "9+" : secCounts.home) + '</span>' : "") + '</a>';
      function secRow(p, pinned, forceCur) {
        var cnt = secCounts[p.key] || 0;
        var isCur = !!forceCur || secChildIsCurrent(p);
        return '<a href="' + p.href + '"' + (isCur ? ' class="cur"' : "") + '><img class="tydswduck" src="' + p.duck + '" alt=""><span class="swtx"><span class="swlb">' + (isCur ? "✓ " : "") + p.label + (pinned ? " 📌" : "") + '</span><span class="swds">' + p.desc + '</span></span>' + (cnt ? '<span class="swbdg">' + (cnt > 9 ? "9+" : cnt) + '</span>' : "") + '</a>';
      }
      function secByKey(k) { for (var q = 0; q < partLinks.length; q++) if (partLinks[q].key === k) return partLinks[q]; return null; }
      /* A parent row with its nested sub-list (Nov 15, 2026): the row
         itself links to the parent page; the chevron beside it opens
         the children in place. The sub-list is the fixed child order;
         a hidden child hides just its sub-row. The row's chevrons are
         wired after innerHTML is set (see data-group-chev below). */
      function groupRowWithSubs(parentKey, pinned) {
        var parent = secByKey(parentKey);
        if (!parent) return "";
        var open = groupIsOpen(parentKey);
        var isCur = parent.key === part || secGroupIsCurrent(parentKey);
        var out = '<div class="tydswnest' + (isCur ? " cur" : "") + '">'
          + secRow(parent, pinned, isCur)
          + '<button type="button" class="tydswchev" data-group-chev="' + parentKey + '" aria-expanded="' + (open ? "true" : "false") + '" aria-label="' + (open ? "Hide " + parent.label + " pages" : "Show " + parent.label + " pages") + '">' + (open ? "▾" : "▸") + "</button></div>";
        if (open) {
          out += '<div class="tydswsubs">';
          var kids = secChildKeys(parentKey);
          for (var s = 0; s < kids.length; s++) {
            var t = secChildRow(kids[s]);
            if (!t || secIsHidden(t.key)) continue;
            /* v345: a child can be a group of its own, so it renders
               as a nested group row with its own chevron and sub-list
               instead of a flat row. (My Stuff held Bins that way until
               v362 moved Bins to a direct My Nest member; no nested
               group remains right now, the branch stays for later.) */
            if (secIsGroup(t.key)) out += groupRowWithSubs(t.key, false);
            else out += secRow(t, false);
          }
          out += "</div>";
        }
        return out;
      }

      var visibleCount = 0;
      for (i = 0; i < list.length; i++) if (!secIsHidden(list[i].key) && !isSecChild(list[i].key)) visibleCount++;
      if (!customizing) {
        var dealsEntry = secByKey("deals");
        var restHtml = "";
        for (i = 0; i < list.length; i++) {
          p = list[i];
          if (p.key === "deals" || secIsPinned(p.key)) continue;
          if (secIsHidden(p.key)) continue;
          if (isSecChild(p.key)) continue;
          if (secIsGroup(p.key)) { restHtml += groupRowWithSubs(p.key, false); continue; }
          restHtml += secRow(p, false);
        }
        html += '<div class="tydswgrp"><b>📌 Pinned</b><span>Your favorites, always on top</span></div>';
        if (dealsEntry) html += groupRowWithSubs("deals", true);
        for (i = 0; i < secPins.length; i++) {
          p = secByKey(secPins[i]);
          if (!p || secIsHidden(p.key)) continue;
          if (secIsGroup(p.key)) { html += groupRowWithSubs(p.key, true); continue; }
          html += secRow(p, true);
        }
        if (restHtml) html += '<div class="tydswgrp"><b>All sections</b><span>Everything else in the Pond</span></div>' + restHtml;
        /* Action box (v373): Customize and Set up your Pond sit in
           their own box at the bottom of the switcher menu,
           left-aligned, apart from the page rows above. */
        html += '<div class="tydswact"><button type="button" class="tydcust" id="tydcustopen">✏️ Customize</button>';
        html += '<button type="button" class="tydcust" id="tydsetupopen">🦆 Set up your Pond</button></div>';
        html += homeRow;
      } else {
        html += '<div class="tydcnote">📌 Deals is pinned first and Home is pinned last, so they are not in this list. Pin up to 3 favorites to keep them at the top of your menu.</div>';
        for (i = 0; i < list.length; i++) {
          p = list[i];
          if (p.key === "deals") continue;
          if (isSecChild(p.key)) continue;
          var hid = secIsHidden(p.key);
          var isCur = p.key === part || (secIsGroup(p.key) && secChildKeys(p.key).indexOf(part) > -1);
          var eyeOff = isCur || (!hid && visibleCount <= 1);
          html += '<div class="tydcrow' + (isCur ? " cur" : "") + (hid ? " dim" : "") + '">'
            + '<span class="nm"><img class="tydswduck" src="' + p.duck + '" alt="">' + (isCur ? "✓ " : "") + p.label
            + (hid ? ' <span class="hint">Hidden</span>' : "")
            + (isCur ? ' <span class="hint">you are here</span>' : "")
            + "</span>"
            + '<button type="button" class="tydcbtn' + (secIsPinned(p.key) ? " on" : "") + '" data-pin="' + p.key + '"' + (!secIsPinned(p.key) && secPins.length >= 3 ? " disabled" : "") + ' aria-label="Pin ' + p.label + ' to the top">📌</button>'
            + '<button type="button" class="tydcbtn" data-eye="' + p.key + '"' + (eyeOff ? " disabled" : "") + ' aria-label="Show or hide ' + p.label + '">' + (hid ? "🚫" : "👁") + "</button>"
            + '<button type="button" class="tydcbtn" data-up="' + p.key + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Move ' + p.label + ' up">↑</button>'
            + '<button type="button" class="tydcbtn" data-dn="' + p.key + '"' + (i === list.length - 1 ? " disabled" : "") + ' aria-label="Move ' + p.label + ' down">↓</button>'
            + "</div>";
        }
        html += '<div class="tydswgrp"><b>Move sections</b><span>Put a section under a different category, or back on top</span></div>';
        var moveKeys = secMovableKeys();
        for (var mk = 0; mk < moveKeys.length; mk++) {
          var mp = secChildRow(moveKeys[mk]);
          if (!mp) continue;
          var curParent = secCurrentParent(mp.key);
          html += '<div class="tydcmove"><span class="nm"><img class="tydswduck" src="' + mp.duck + '" alt="">' + mp.label + '</span>'
            + '<select data-move="' + mp.key + '" aria-label="Move ' + mp.label + ' under a category">'
            + '<option value=""' + (curParent === null ? " selected" : "") + '>Top level</option>'
            + '<option value="news"' + (curParent === "news" ? " selected" : "") + '>The Pond Post</option>'
            + '<option value="deals"' + (curParent === "deals" ? " selected" : "") + '>Deals</option>'
            + '<option value="food"' + (curParent === "food" ? " selected" : "") + '>Food</option>'
            + '<option value="nest"' + (curParent === "nest" ? " selected" : "") + '>My Nest</option>'
            + "</select></div>";
        }
        html += '<div class="tydcfoot"><button type="button" id="tydcdone">✓ Done</button><button type="button" id="tydcreset">Reset to default</button></div>';
        html += homeRow;
      }
      swMenu.innerHTML = html;
      var groupChevs = swMenu.querySelectorAll("[data-group-chev]");
      for (var gc = 0; gc < groupChevs.length; gc++) (function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var g = b.getAttribute("data-group-chev");
          var willOpen = !groupIsOpen(g);
          /* v361 accordion: opening a group closes the other open
             groups at its level; closing one leaves the rest alone. */
          if (willOpen) secAccordionCloseOthers(g);
          groupSubsOpen[g] = willOpen;
          try { localStorage.setItem("tydSubsOpen", JSON.stringify(groupSubsOpen)); } catch (err) {}
          renderMenu();
        });
      })(groupChevs[gc]);
      var openBtn = swMenu.querySelector("#tydcustopen");
      if (openBtn) openBtn.addEventListener("click", function (e) { e.stopPropagation(); customizing = true; renderMenu(); });
      var setupBtn = swMenu.querySelector("#tydsetupopen");
      if (setupBtn) setupBtn.addEventListener("click", function (e) { e.stopPropagation(); if (window.TYDSetupPond) window.TYDSetupPond.open(); });
      var doneBtn = swMenu.querySelector("#tydcdone");
      if (doneBtn) doneBtn.addEventListener("click", function (e) { e.stopPropagation(); customizing = false; renderMenu(); });
      var resetBtn = swMenu.querySelector("#tydcreset");
      if (resetBtn) resetBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        secOrder = null; secHidden = []; secPins = [];
        groupSubsOpen = {};
        secResetGroups();
        try { localStorage.removeItem("tydSectionOrder"); localStorage.removeItem("tydSectionHidden"); localStorage.removeItem("tydSectionPins"); localStorage.removeItem("tydSubsOpen"); } catch (err) {}
        /* Signed in: the account gets the factory defaults too (with
           sectionPrefsSet: true), so the reset follows the member to
           every device. No-op when signed out. */
        secPushAccount();
        renderMenu();
      });
      var eyeBtns = swMenu.querySelectorAll("[data-eye]");
      for (i = 0; i < eyeBtns.length; i++) (function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var k = b.getAttribute("data-eye");
          if (secIsHidden(k)) secHidden = secHidden.filter(function (x) { return x !== k; });
          else { secHidden.push(k); if (secIsPinned(k)) secPins = secPins.filter(function (x) { return x !== k; }); }
          secSave(); renderMenu();
        });
      })(eyeBtns[i]);
      var pinBtns = swMenu.querySelectorAll("[data-pin]");
      for (i = 0; i < pinBtns.length; i++) (function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var k = b.getAttribute("data-pin");
          if (secIsPinned(k)) secPins = secPins.filter(function (x) { return x !== k; });
          else {
            if (secPins.length >= 3) return;
            secPins.push(k);
            if (secIsHidden(k)) secHidden = secHidden.filter(function (x) { return x !== k; });
          }
          secSave(); renderMenu();
        });
      })(pinBtns[i]);
      var moveSels = swMenu.querySelectorAll("[data-move]");
      for (i = 0; i < moveSels.length; i++) (function (s) {
        s.addEventListener("change", function (e) {
          e.stopPropagation();
          secSetParent(s.getAttribute("data-move"), s.value || null);
          secSave(); renderMenu();
        });
      })(moveSels[i]);
      var moveBtns = swMenu.querySelectorAll("[data-up],[data-dn]");
      for (i = 0; i < moveBtns.length; i++) (function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var up = b.hasAttribute("data-up");
          var k = b.getAttribute(up ? "data-up" : "data-dn");
          var keys = secOrdered().map(function (x) { return x.key; });
          var idx = keys.indexOf(k), j = up ? idx - 1 : idx + 1;
          if (idx < 0 || j < 0 || j >= keys.length) return;
          keys.splice(idx, 1); keys.splice(j, 0, k);
          secOrder = keys;
          secSave(); renderMenu();
        });
      })(moveBtns[i]);
    }
    renderMenu();
    /* Set up your Pond (Lucy, Nov 15, 2026): the first-visit picker
       where a new person chooses which sections are in their Pond.
       The Pond has everything; this is the "I want this, not this"
       moment. It uses the same section state as the switcher Customize
       UI (tydSectionHidden / secSave, so choices follow the account),
       and it only reorders nothing: picking is the whole job, reorder
       stays in Customize. Deals is always on, matching Customize.
       Auto-shows once, on Home only, when nothing is customized yet.
       Re-openable anytime from the switcher menu ("Set up your Pond")
       and from Home ("Make this yours"). Dismissing or skipping marks
       it done without changing anything. If the account sync lands
       while the sheet is open, the account already has their choices,
       so the sheet closes. */
    var tydSetupEl = null, tydSetupOn = {};
    function tydSetupMarkDone() { try { localStorage.setItem("tydPondSetupDone", "1"); } catch (e) {} }
    function tydSetupIsDone() { try { return localStorage.getItem("tydPondSetupDone") === "1"; } catch (e) { return false; } }
    function tydSetupClose() {
      if (tydSetupEl && tydSetupEl.parentNode) tydSetupEl.parentNode.removeChild(tydSetupEl);
      tydSetupEl = null;
    }
    function tydSetupBuild() {
      tydSetupOn = {};
      for (var i = 0; i < partLinks.length; i++) tydSetupOn[partLinks[i].key] = !secIsHidden(partLinks[i].key);
      tydSetupOn.deals = true;
      var el = document.createElement("div");
      el.id = "tydsetup";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", "Set up your Pond");
      var rows = "";
      for (var j = 0; j < partLinks.length; j++) {
        var p = partLinks[j], on = !!tydSetupOn[p.key], locked = p.key === "deals";
        rows += '<button type="button" class="tydsetup-row' + (on ? "" : " off") + (locked ? " locked" : "") + '" data-setup-key="' + p.key + '"' + (locked ? ' aria-disabled="true"' : "") + '>'
          + '<img src="' + p.duck + '" alt="">'
          + '<span class="nm"><b>' + p.label + '</b><span>' + p.desc + '</span></span>'
          + '<span class="tydsetup-tgl">' + (locked ? "Always on" : (on ? "✓ In your Pond" : "✕ Hidden")) + '</span></button>';
      }
      el.innerHTML = '<div class="tydsetup-card">'
        + '<div class="tydsetup-head"><img src="' + base + 'images/duck-menu-blue.png" alt="">'
        + '<div><h2>Set up your Pond 🦆</h2><p>The Pond has everything. Pick what you want to see, and hide the rest. You can change this anytime from the menu.</p></div>'
        + '<button type="button" class="tydsetup-x" id="tydsetup-x" aria-label="Close">✕</button></div>'
        + '<div class="tydsetup-list">' + rows + '</div>'
        + '<div class="tydsetup-foot"><button type="button" class="tydsetup-skip" id="tydsetup-skip">Show me everything</button>'
        + '<button type="button" class="tydsetup-done" id="tydsetup-done">Done — show me my Pond</button></div></div>';
      el.addEventListener("click", function (e) { if (e.target === el) { tydSetupMarkDone(); tydSetupClose(); } });
      var x = el.querySelector("#tydsetup-x");
      if (x) x.addEventListener("click", function () { tydSetupMarkDone(); tydSetupClose(); });
      var skip = el.querySelector("#tydsetup-skip");
      if (skip) skip.addEventListener("click", function () { tydSetupMarkDone(); tydSetupClose(); });
      var done = el.querySelector("#tydsetup-done");
      if (done) done.addEventListener("click", function () {
        secHidden = [];
        for (var k in tydSetupOn) if (tydSetupOn.hasOwnProperty(k) && !tydSetupOn[k] && k !== "deals") secHidden.push(k);
        secSave();
        tydSetupMarkDone();
        try { window.dispatchEvent(new CustomEvent("tyd-sections-changed")); } catch (e) {}
        renderMenu();
        tydSetupClose();
      });
      var rowBtns = el.querySelectorAll("[data-setup-key]");
      for (var r = 0; r < rowBtns.length; r++) (function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-setup-key");
          if (k === "deals") return;
          tydSetupOn[k] = !tydSetupOn[k];
          var visible = 0;
          for (var q in tydSetupOn) if (tydSetupOn.hasOwnProperty(q) && tydSetupOn[q]) visible++;
          if (!tydSetupOn[k] && visible < 1) { tydSetupOn[k] = true; return; }
          b.classList.toggle("off", !tydSetupOn[k]);
          var t = b.querySelector(".tydsetup-tgl");
          if (t) t.textContent = tydSetupOn[k] ? "✓ In your Pond" : "✕ Hidden";
        });
      })(rowBtns[r]);
      return el;
    }
    window.TYDSetupPond = {
      open: function () {
        if (tydSetupEl) return;
        tydSetupEl = tydSetupBuild();
        document.body.appendChild(tydSetupEl);
      },
      close: tydSetupClose,
      isOpen: function () { return !!tydSetupEl; }
    };
    /* First visit: the sheet no longer auto-opens (Lucy, Nov 15, 2026:
       it blocked the whole home page). Instead a small dismissible
       banner invites the member to set up their Pond. The sheet still
       opens from the Menu pull-down and Home's Make this yours button. */
    function tydSetupBannerIsDismissed() { try { return localStorage.getItem("tydSetupBannerDismissed") === "1"; } catch (e) { return false; } }
    function tydSetupBannerDismiss() { try { localStorage.setItem("tydSetupBannerDismissed", "1"); } catch (e) {} }
    function tydSetupBannerShow() {
      if (document.getElementById("tydsetupbanner")) return;
      var host = document.querySelector(".app") || document.body;
      if (!host) return;
      var b = document.createElement("div");
      b.id = "tydsetupbanner";
      b.setAttribute("role", "note");
      b.innerHTML = '<span class="tydsetupbanner-txt">Make this yours — pick the sections you want in your Pond.</span>'
        + '<button type="button" class="tydsetupbanner-open">Set up your Pond</button>'
        + '<button type="button" class="tydsetupbanner-x" aria-label="Dismiss">✕</button>';
      var openBtn = b.querySelector(".tydsetupbanner-open");
      if (openBtn) openBtn.addEventListener("click", function () { window.TYDSetupPond.open(); });
      var xBtn = b.querySelector(".tydsetupbanner-x");
      if (xBtn) xBtn.addEventListener("click", function () { tydSetupBannerDismiss(); if (b.parentNode) b.parentNode.removeChild(b); });
      if (host.firstChild) host.insertBefore(b, host.firstChild); else host.appendChild(b);
    }
    if ((fbase === "index" || fbase === "") && !tydSetupIsDone() && !tydSetupBannerIsDismissed()) {
      setTimeout(function () {
        if (!tydSetupIsDone() && !tydSetupBannerIsDismissed() && secIsDefaultState() && !tydSetupEl) tydSetupBannerShow();
      }, 700);
    }
    /* v295 (Nov 15, 2026): the Back / Forward arrows that used to live
       beside the section switcher were removed — they only duplicated
       the browser's own back/forward buttons. */
    /* Account lives at the top now (Lucy, Nov 10, 2026): a round chip at
       the end of the switcher row, its avatar in a circle so it stands
       out. auth-pill.js fills in the picture and name when signed in.
       Skipped on the home page, whose account bar already does this. */
    if (!document.querySelector(".account-bar")) {
      var acctBar = document.createElement("div");
      acctBar.id = "tydacctbar";
      acctBar.innerHTML = '<span class="tydab-who">🦆 Pond Account</span><span class="tydab-state"><a class="tydab-btn" href="' + base + 'account.html">Log in</a><a class="tydab-btn alt" href="' + base + 'account.html">Sign up free</a></span>';
      hostEl.insertBefore(acctBar, hostEl.firstChild);
    }
    /* Bell notifications (Lucy, Nov 10, 2026): a bell at the right end of
       the switcher row, after the account chip. site-nav only builds the
       button and panel shell; bell.js (loaded below) brings the data:
       announcements from Firestore, filtered by the member's own alert
       preferences, with an unread badge. */
    var bellBtn = document.createElement("button");
    bellBtn.type = "button";
    bellBtn.id = "tydbell";
    bellBtn.setAttribute("aria-label", "Deal alerts");
    bellBtn.setAttribute("title", "Deal alerts");
    bellBtn.innerHTML = '🔔<span class="tydtoplab">Alerts</span><span id="tydbellbadge" hidden></span>';
    swIn.appendChild(bellBtn);
    /* Color button lives in the top bar now, beside the bell (Lucy, Nov 13,
       2026): the old floating pill covered the page on phones. It is
       created in the body by tydAddBtn and moved here, so it sits in the
       bar's own row and never floats over content. */
    var themeBtn = document.getElementById("tydthemebtn");
    if (themeBtn) swIn.appendChild(themeBtn);
    /* Home button in the top bar, beside the Color button (Lucy, Nov 13,
       2026): a quick way home from every page, same 42px bar-button style
       as the bell and Color. Home is gone from the bottom menu, so this is
       the way home now. */
    var homeBtn = document.createElement("a");
    homeBtn.id = "tydhomebtn";
    homeBtn.href = base + "index.html";
    homeBtn.setAttribute("aria-label", "Home");
    homeBtn.setAttribute("title", "Home");
    homeBtn.innerHTML = "🏠<span class=\"tydtoplab\">Home</span>";
    swIn.appendChild(homeBtn);
    /* Bell goes last in the row (Lucy, Nov 13, 2026): notifications at the
       far right end. appendChild moves the already-appended bell button
       to the end; the bell panel stays absolutely positioned. */
    swIn.appendChild(bellBtn);
    /* Home sits right next to the category pull-down (Lucy, Nov 13, 2026),
       before the Color button. */
    swIn.insertBefore(homeBtn, themeBtn);
    var bellPanel = document.createElement("div");
    bellPanel.id = "tydbellpanel";
    bellPanel.hidden = true;
    bellPanel.innerHTML = '<div class="tydbellhead"><b>🔔 Deal alerts</b><span class="tydbellheadbtns"><button type="button" id="tydbelldelall">Delete all</button><button type="button" id="tydbellmark">Mark all read</button></span></div><div id="tydbelltools" hidden><input type="search" id="tydbellsearch" placeholder="Search notifications" aria-label="Search notifications"><div class="tydbelltabs"><button type="button" id="tydbelltabnew" class="on">New</button><button type="button" id="tydbelltabhist">History</button></div></div><div id="tydbelllist"><p class="tydbellmsg">Loading your alerts…</p></div><a class="tydbellitem tydbellsettings" href="' + base + 'account.html#notifications"><span class="bt">⚙️ Notification settings</span><span class="bwhen">Pick which kinds of alerts you want to see</span></a>';
    swIn.appendChild(bellPanel);
    swBtn.addEventListener("click", function () {
      if (swMenu.hidden) { customizing = false; renderMenu(); swMenu.hidden = false; }
      else swMenu.hidden = true;
    });
    document.addEventListener("click", function (e) { if (!sw.contains(e.target)) swMenu.hidden = true; });
  }

  var fab = document.createElement("button");
  fab.id = "tydnavfab";
  fab.type = "button";
  document.body.appendChild(fab);
  function setNavOpen(open) {
    document.body.classList.toggle("tyd-nav-open", open);
    document.body.classList.toggle("tyd-nav-closed", !open);
    if (typeof tydPillReposition === "function") { try { tydPillReposition(); } catch (e) {} }
    /* v295 (Nov 15, 2026): the floating pill is the bottom-bar show/hide
       toggle, NOT a second Menu — it used to read "Menu" when the bar was
       closed, which duplicated the Menu button already on the bar. It now
       reads as a hide/show toggle in both states, with a tooltip. */
    fab.innerHTML = open ? '<span class="fic">⌄</span><span class="ftx"> Hide bar</span>' : '<span class="fic">⌃</span><span class="ftx"> Show bar</span>';
    fab.setAttribute("aria-label", open ? "Hide the bottom menu bar" : "Show the bottom menu bar");
    fab.title = open ? "Hide the bottom menu bar" : "Show the bottom menu bar";
    if (typeof navMenu !== "undefined" && navMenu) { navMenu.hidden = true; }
    if (typeof menuBtn !== "undefined" && menuBtn) { menuBtn.setAttribute("aria-expanded", "false"); }
    try { localStorage.setItem("tydNavOpen", open ? "1" : "0"); } catch (e) {}
  }
  fab.addEventListener("click", function () {
    setNavOpen(!document.body.classList.contains("tyd-nav-open"));
  });
  /* v256: on phones the pill sits over the content (no side margin), so it fades out while the page is scrolling and comes back when scrolling stops. */
  var fabFadeT = null;
  window.addEventListener("scroll", function () {
    fab.classList.add("tyd-fab-fade");
    if (fabFadeT) clearTimeout(fabFadeT);
    fabFadeT = setTimeout(function () { fab.classList.remove("tyd-fab-fade"); }, 400);
  }, { passive: true });
  /* v261: the bottom bar now starts OPEN on a first visit (Unni, Nov 14, 2026: the bar was hidden until you tapped the duck pill, and on phones the pill is just a duck with no Menu label, so nobody knew it opened anything). A saved Hide choice is still respected. */
  var startOpen = true;
  try { var savedNav = localStorage.getItem("tydNavOpen"); if (savedNav !== null) startOpen = savedNav === "1"; } catch (e) {}
  setNavOpen(startOpen);

  var overlay = document.createElement("div");
  overlay.id = "tydinstall";
  /* Install steps (Lucy, Nov 14, 2026): both iPhone and Android, with the
     exact menu names each browser uses, so anyone can add the Pond. iPhone
     is Share, then scroll to Add to Home Screen. Android Chrome is the
     three-dot menu, then Install and create shortcut (older Chrome calls
     it Add to Home screen), then Create shortcut and Add; a PWA-ready
     site may offer Install app instead. */
  overlay.innerHTML = '<div class="box"><h3>Put the Pond on your home screen 🦆</h3>'
    + '<p><b>iPhone or iPad (Safari):</b> tap the <b>Share</b> button, scroll down, tap <b>Add to Home Screen</b>, then tap <b>Add</b>.</p>'
    + '<p><b>Android (Chrome):</b> tap the three dots <b>⋮</b>, tap <b>Install and create shortcut</b> (older Chrome calls it <b>Add to Home screen</b>), then tap <b>Create shortcut</b> and <b>Add</b>. If it offers <b>Install app</b>, tap that instead.</p>'
    + '<p>The Pond gets its own duck icon on your home screen, just like an app.</p>'
    + '<button type="button">Got it</button></div>';
  document.body.appendChild(overlay);
  overlay.querySelector("button").addEventListener("click", function () { overlay.classList.remove("show"); });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.classList.remove("show"); });

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  /* The App button is off the bar (Lucy, Nov 14, 2026): the install tip
     lives as a pinned message in the bell notifications instead. This
     global is what the pinned tip (and the Menu pull-down row) call to
     show the same overlay. */
  window.TYDShowInstall = function () {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "click-app-install", event: true });
    if (deferred) { deferred.prompt(); deferred = null; }
    else overlay.classList.add("show");
  };

  /* bell.js carries the bell's data + behavior (Firestore announcements).
     Loaded dynamically so pages keep working even if it fails. */
  try {
    var bellScr = document.createElement("script");
    bellScr.src = base + "bell.js";
    bellScr.async = true;
    document.head.appendChild(bellScr);
  } catch (e) {}

  /* Sign-up prompt deferral (Nov 13, 2026): the homepage #welcome-join
     card is shown by index.html on first load to signed-out visitors,
     which is too fast. This shared gate only touches that one card, and
     only on a first visit: it hides the card until the visitor has
     browsed a bit (60 seconds AND a tap on a deal or brand link), or
     until 3 minutes of browsing have passed, whichever comes first.
     On a later visit it does not gate at all. It never touches the
     signed-in welcome card, and if the visitor taps "Maybe later"
     (index.html sets localStorage tydWelcomeSeen) the gate stops at
     once. New keys only: tydDealViewed, tydWelcomeDeferred. */
  (function tydDeferJoin() {
    var join = document.getElementById("welcome-join");
    if (!join) return;
    var seen = false, deferredBefore = false;
    try {
      seen = !!localStorage.getItem("tydWelcomeSeen");
      deferredBefore = localStorage.getItem("tydWelcomeDeferred") === "1";
      if (!deferredBefore) localStorage.setItem("tydWelcomeDeferred", "1");
    } catch (e) {}
    if (seen || deferredBefore) return;
    var start = Date.now();
    var shown = false;
    function markDealViewed() {
      try { localStorage.setItem("tydDealViewed", "1"); } catch (e) {}
    }
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!t) return;
      var href = t.getAttribute("href") || "";
      var cls = typeof t.className === "string" ? t.className : "";
      if (/deals\.html|brands\//.test(href) || /(^|\s)deal(\s|$)/.test(cls)) markDealViewed();
    });
    var timer = setInterval(function () {
      var dismissed = false, viewed = false;
      try {
        dismissed = !!localStorage.getItem("tydWelcomeSeen");
        viewed = !!localStorage.getItem("tydDealViewed");
      } catch (e) {}
      /* Signed in by now (auth-pill.js adds a #tydab-logout button):
         the card is for signed-out visitors only, so never show it. */
      if (document.getElementById("tydab-logout")) { clearInterval(timer); join.hidden = true; return; }
      if (dismissed || shown) { clearInterval(timer); return; }
      var elapsed = Date.now() - start;
      if ((elapsed >= 60000 && viewed) || elapsed >= 180000) {
        shown = true;
        clearInterval(timer);
        join.hidden = false;
        return;
      }
      join.hidden = true;
    }, 2000);
    join.hidden = true;
  })();

/* Clipped deal codes (Lucy, Nov 14, 2026): when a member clips a code
   from a deal card or a brand page, the code is saved to their own
   clipped codes (localStorage tydClippedCodes, synced to the account
   as plannerCodes by the Planner) and, when its expiry date is known,
   a Planner reminder lands on the expiry date so the code shows on
   their calendar. The bell lists clipped codes expiring within 7 days
   for members who left the notify switch on. */
(function () {
  var LS = "tydClippedCodes";
  var LS_PLANNER = "tydPlannerLocal"; /* the Planner's own state key */
  /* Known code expiries, verified from the brand terms. A code not
     listed here has no confirmed expiry, so the clip sheet asks the
     member to pick the date. */
  var CODE_EXPIRY = {
    aurzen: "2027-01-30" /* CJ10, 10% off, to Jan 30, 2027 */
  };
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function load() { try { var v = JSON.parse(localStorage.getItem(LS) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(list) {
    try { localStorage.setItem(LS, JSON.stringify(list)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("tyd:codes")); } catch (e) {}
    if (window.TYDAccountPush) window.TYDAccountPush({ plannerCodes: list });
    if (window.TYDPlannerChanged) { try { window.TYDPlannerChanged(); } catch (e) {} }
  }
  function find(list, code) {
    var c = String(code || "").toLowerCase().trim();
    for (var i = 0; i < list.length; i++) if (String(list[i].code || "").toLowerCase().trim() === c) return list[i];
    return null;
  }
  function plannerState() { try { return JSON.parse(localStorage.getItem(LS_PLANNER) || "{}"); } catch (e) { return {}; } }
  function plannerSave(s) { try { localStorage.setItem(LS_PLANNER, JSON.stringify(s)); } catch (e) {} }
  function reminderFor(code) {
    return { id: "code-" + code.id, title: "🏷️ Code " + code.code + " (" + code.brand + ") expires today", date: code.expires, time: "", codeId: code.id, kind: "code" };
  }
  /* Keep the Planner reminder in step with the code: a dated code has
     one reminder on its expiry date, an undated code has none. */
  function syncReminder(code) {
    var s = plannerState();
    if (!Array.isArray(s.reminders)) s.reminders = [];
    var i = -1;
    s.reminders.forEach(function (r, ix) { if (r && r.codeId === code.id) i = ix; });
    if (code.expires) {
      var nr = reminderFor(code);
      if (i > -1) s.reminders[i] = nr; else s.reminders.push(nr);
    } else if (i > -1) {
      s.reminders.splice(i, 1);
    }
    plannerSave(s);
    if (window.TYDPlannerChanged) { try { window.TYDPlannerChanged(); } catch (e) {} }
  }
  function clip(info) {
    var list = load();
    var ex = find(list, info.code);
    if (ex) return ex;
    var item = {
      id: uid(),
      code: String(info.code || "").trim(),
      brand: String(info.brand || "").trim(),
      slug: String(info.slug || "").trim(),
      expires: String(info.expires || CODE_EXPIRY[String(info.slug || "").toLowerCase()] || "").trim(),
      notify: info.notify !== false,
      clippedAt: Date.now()
    };
    if (!item.code) return null;
    list.push(item);
    save(list);
    syncReminder(item);
    paintButtons();
    return item;
  }
  function unclip(code) {
    var list = load();
    var ex = find(list, code);
    if (!ex) return false;
    save(list.filter(function (c) { return c.id !== ex.id; }));
    syncReminder({ id: ex.id, expires: "" });
    paintButtons();
    return true;
  }
  function setExpires(id, iso) {
    var list = load();
    var it = null;
    list.forEach(function (c) { if (c.id === id) it = c; });
    if (!it) return false;
    it.expires = String(iso || "").trim();
    save(list);
    syncReminder(it);
    return true;
  }
  function setNotify(id, on) {
    var list = load();
    var it = null;
    list.forEach(function (c) { if (c.id === id) it = c; });
    if (!it) return false;
    it.notify = !!on;
    save(list);
    return true;
  }
  function paintButtons() {
    var list = load();
    document.querySelectorAll("[data-clip-code]").forEach(function (b) {
      var on = !!find(list, b.getAttribute("data-clip-code"));
      b.classList.toggle("clipped", on);
      b.textContent = on ? "✓ Clipped" : "📌 Clip code";
    });
  }
  /* Clip sheet: for a code with no known expiry, ask the member for
     the date (so it can land on their calendar) and whether they want
     a bell nudge before it expires. */
  var sheetEl = null;
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
  function openSheet(info) {
    closeSheet();
    var wrap = document.createElement("div");
    wrap.className = "tydclipsheet";
    wrap.innerHTML = '<div class="tydclipsheet-card" role="dialog" aria-label="Clip this code">'
      + '<h3>📌 Clip this code</h3>'
      + '<p><b>' + esc(info.code) + '</b>' + (info.brand ? ' · ' + esc(info.brand) : '') + '</p>'
      + '<label>When does it expire?<br><input type="date" id="tydclip-date"></label>'
      + '<p class="tydclipsheet-hint">Add the date and it lands on your Planner calendar on that day. Leave it blank to just save the code.</p>'
      + '<label class="tydclipsheet-check"><input type="checkbox" id="tydclip-notify" checked> Notify me before it expires</label>'
      + '<div class="tydclipsheet-row"><button type="button" class="tydclipsheet-save" id="tydclip-save">Save code</button>'
      + '<button type="button" class="tydclipsheet-cancel" id="tydclip-cancel">Cancel</button></div>'
      + '</div>';
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeSheet(); });
    document.body.appendChild(wrap);
    sheetEl = wrap;
    var saveBtn = wrap.querySelector("#tydclip-save");
    wrap.querySelector("#tydclip-cancel").addEventListener("click", closeSheet);
    saveBtn.addEventListener("click", function () {
      var d = wrap.querySelector("#tydclip-date").value || "";
      var n = wrap.querySelector("#tydclip-notify").checked;
      clip({ code: info.code, brand: info.brand, slug: info.slug, expires: d, notify: n });
      closeSheet();
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-clip-code]") : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var code = b.getAttribute("data-clip-code") || "";
    var brand = b.getAttribute("data-brand") || "";
    var slug = (b.getAttribute("data-slug") || "").toLowerCase();
    if (find(load(), code)) { unclip(code); return; }
    var known = CODE_EXPIRY[slug] || b.getAttribute("data-expires") || "";
    if (known) clip({ code: code, brand: brand, slug: slug, expires: known });
    else openSheet({ code: code, brand: brand, slug: slug });
  });
  /* Clip button + sheet styling, so it looks right on every page that
     carries a clip button (deals cards, brand pages). */
  var st = document.createElement("style");
  st.textContent = "[data-clip-code]{display:inline-block;margin-top:6px;font-size:12.5px;font-weight:700;border:1px solid #9fc6d4;background:#eaf6fa;color:#1f5f74;border-radius:20px;padding:5px 10px;cursor:pointer;font-family:inherit;}"
    + "[data-clip-code].clipped{background:#ffd94d;border-color:#e6b800;color:#6b5900;}"
    + ".tydclipsheet{position:fixed;inset:0;background:rgba(35,65,77,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;}"
    + ".tydclipsheet-card{background:#fff;border-radius:16px;padding:18px;max-width:340px;width:100%;box-shadow:0 8px 30px rgba(35,65,77,.3);color:#23414d;}"
    + ".tydclipsheet-card h3{margin:0 0 6px;font-size:18px;color:#1f5f74;}"
    + ".tydclipsheet-card p{margin:0 0 10px;font-size:14px;line-height:1.5;}"
    + ".tydclipsheet-hint{font-size:12.5px !important;color:#4a6b78 !important;}"
    + ".tydclipsheet-card label{font-size:14px;font-weight:700;}"
    + ".tydclipsheet-card input[type=date]{margin-top:6px;font:inherit;font-size:15px;padding:8px;border:2px solid #bcd9e4;border-radius:10px;width:100%;box-sizing:border-box;}"
    + ".tydclipsheet-check{display:flex;gap:8px;align-items:center;font-weight:700;margin:4px 0 12px;}"
    + ".tydclipsheet-row{display:flex;gap:8px;}"
    + ".tydclipsheet-save{flex:1;background:#ffd94d;border:2px solid #e8b93c;color:#6b5900;font-weight:800;font-size:15px;border-radius:12px;padding:10px;cursor:pointer;font-family:inherit;}"
    + ".tydclipsheet-cancel{background:none;border:2px solid #bcd9e4;color:#1f5f74;font-weight:700;font-size:15px;border-radius:12px;padding:10px 14px;cursor:pointer;font-family:inherit;}"
    + "html[data-theme=\"dark\"] .tydclipsheet-card{background:#1e3245;color:#dceef6;border:1px solid #2e4a5f;}"
    + "html[data-theme=\"dark\"] .tydclipsheet-card h3{color:#c9f0fc;}"
    + "html[data-theme=\"dark\"] .tydclipsheet-hint{color:#9fc6d4 !important;}"
    + "html[data-theme=\"dark\"] [data-clip-code]{background:#1e3245;border-color:#2e4a5f;color:#c9f0fc;}"
    + "html[data-theme=\"dark\"] [data-clip-code].clipped{background:#ffd94d;border-color:#e6b800;color:#6b5900;}";
  document.head.appendChild(st);
  window.TYDCodeClips = {
    list: load,
    isClipped: function (code) { return !!find(load(), code); },
    clip: clip,
    unclip: unclip,
    setExpires: setExpires,
    setNotify: setNotify,
    expiryFor: function (slug) { return CODE_EXPIRY[String(slug || "").toLowerCase()] || ""; },
    paint: paintButtons
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintButtons);
  else paintButtons();
})();

  /* Share to the Shack (Nov 15, 2026, v312): share any Pond card (a LEGO
     deal, a brand deal, a Top Deal, a trip, a recipe, a news story, a
     book) into the Quack Shack (pondChat) as a preview card. The sheet
     shows what will be shared, lets the member pick one of the five
     Shack channels, and posts ONE pondChat doc. The post's `text` is
     the shared title (the pondChat rules require a non-empty text of
     1-500 chars, and there is no hasOnly, so the extra share fields
     are allowed with no rules change). Guests get a sign-in prompt and
     post nothing. The preview card itself renders in chat.html.
     Never links a preview to a retailer: the share URL is always a
     Pond page (plus a #anchor where the card has one). */
  (function () {
    /* Local helpers (this IIFE is top-level, like TYDCodeClips, so it
       defines its own esc/base rather than borrowing the menu's). */
    function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    var base = location.pathname.indexOf("/brands/") !== -1 ? "../" : "";
    var POND = "/";
    var SHARE_CHANNELS = [
      { id: "general", label: "General", emoji: "💬" },
      { id: "deals", label: "Deals", emoji: "🔥" },
      { id: "food", label: "Food", emoji: "🍳" },
      { id: "pets", label: "Pets", emoji: "🐾" },
      { id: "pondpost", label: "Pond Post", emoji: "📰" }
    ];
    var DEFAULT_CHANNEL = { deal: "deals", recipe: "food", news: "pondpost", trip: "general", book: "general" };
    /* Section ducks for cards with no image of their own. Never a
       broken image: a card with no photo shares its section duck. */
    var FALLBACK_IMG = {
      deal: "images/corners/duck-deals.jpg",
      trip: "images/corners/duck-travel.jpg",
      news: "images/corners/duck-news.jpg",
      recipe: "images/corners/duck-chat.jpg",
      book: "images/corners/duck-chat.jpg"
    };
    var KINDS = ["deal", "trip", "recipe", "news", "book"];
    /* The signed-in member, resolved from Firebase Auth + profiles/{uid}
       (name/avatar), like chat.html does. Null for guests. The profile
       is cached per uid so the sheet never waits on a read twice. */
    var me = null;
    var profileCache = {};
    var fb = null; /* { addDoc, collection, getDoc, doc, db } once Firebase loads */
    var writerOverride = null; /* test seam: capture the doc instead of writing it */
    var sheetEl = null, toastEl = null;
    function clean(s) { return String(s == null ? "" : s).trim(); }
    function absUrl(u) {
      u = clean(u);
      if (!u) return "";
      if (/^https?:\/\//i.test(u)) return u;
      if (u.charAt(0) === "/") return POND + u;
      return POND + "/" + u;
    }
    function absImg(u, kind) {
      u = clean(u);
      /* A data: URL (a pasted cover photo) would bloat the post and is
         not a shareable image: fall back to the section duck instead. */
      if (/^data:/i.test(u)) u = "";
      if (/^https?:\/\//i.test(u)) return u;
      if (u) return absUrl(u);
      return absUrl(FALLBACK_IMG[kind] || FALLBACK_IMG.book);
    }
    function defaultChannel(kind) { return DEFAULT_CHANNEL[kind] || "general"; }
    function channelDef(id) {
      for (var i = 0; i < SHARE_CHANNELS.length; i++) if (SHARE_CHANNELS[i].id === id) return SHARE_CHANNELS[i];
      return SHARE_CHANNELS[0];
    }
    /* buildPayload: the pure part. Takes a Share button (or any card
       element) or a plain data object, and returns {kind, url, image,
       title, text} using ONLY the card's real data. Buttons carry
       data-share-* attributes; a bare card element is scraped for its
       first image, heading and short info line as a fallback. */
    function buildPayload(src) {
      var d = { kind: "", url: "", image: "", title: "", text: "" };
      if (src && src.nodeType === 1) {
        var el = src;
        var has = function (k) { return el.getAttribute("data-share-" + k) || ""; };
        if (has("kind") || has("title") || has("url")) {
          d = { kind: has("kind"), url: has("url"), image: has("image"), title: has("title"), text: has("text") };
        } else {
          var card = el;
          if (el.closest) {
            var found = el.closest(".lego-card, .tdcard, .tcard, .recipe-card, .card, .crow");
            if (found) card = found;
          }
          var img = card.querySelector ? card.querySelector("img") : null;
          if (img) d.image = img.getAttribute("src") || "";
          var head = card.querySelector ? (card.querySelector("h2") || card.querySelector("h3") || card.querySelector(".btitle") || card.querySelector(".name")) : null;
          if (head) d.title = head.textContent || "";
          var info = card.querySelector ? (card.querySelector(".meta") || card.querySelector(".tdest") || card.querySelector("p")) : null;
          if (info) d.text = info.textContent || "";
          if (card.getAttribute) d.url = card.getAttribute("data-share-url") || "";
        }
      } else if (src && typeof src === "object") {
        d = { kind: src.kind || "", url: src.url || "", image: src.image || "", title: src.title || "", text: src.text || "" };
      }
      d.kind = KINDS.indexOf(clean(d.kind).toLowerCase()) !== -1 ? clean(d.kind).toLowerCase() : "deal";
      d.url = absUrl(d.url) || POND + "/";
      d.image = absImg(d.image, d.kind);
      d.title = clean(d.title).slice(0, 200) || "Shared from the Pond";
      d.text = clean(d.text).slice(0, 200);
      return d;
    }
    /* buildShareDoc: the pure pondChat doc for a payload + member. The
       `text` is the member's comment when one was typed (rules:
       non-empty, 1-500 chars), otherwise the shared title — so no
       mention parsing runs on share posts and no new fields are needed. */
    function buildShareDoc(p, who, channel, comment) {
      if (!p || !who || !who.uid) return null;
      var title = clean(p.title).slice(0, 500) || "Shared from the Pond";
      var commentText = clean(comment).slice(0, 500);
      return {
        uid: who.uid,
        name: clean(who.name).slice(0, 40) || "Pond friend",
        avatar: who.avatar || "",
        text: commentText || title,
        createdAt: Date.now(),
        channel: channelDef(channel || p.channel || defaultChannel(p.kind)).id,
        type: "share",
        shareKind: p.kind,
        shareUrl: p.url,
        shareImage: p.image,
        shareTitle: title,
        shareText: clean(p.text).slice(0, 200)
      };
    }
    function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
    function hideToast() { if (toastEl) { toastEl.remove(); toastEl = null; } }
    function showToast(channel) {
      hideToast();
      var t = document.createElement("div");
      t.className = "tydshare-toast";
      t.innerHTML = "Shared to #" + esc(channel) + " ✓ · <a href=\"" + esc(base + "chat.html?ch=" + channel) + "\">Open the Shack ›</a>";
      document.body.appendChild(t);
      toastEl = t;
      setTimeout(hideToast, 6000);
    }
    function previewHtml(p) {
      return '<div class="tydshare-prev"><img src="' + esc(p.image) + '" alt="" onerror="this.remove()">'
        + '<div class="tydshare-prevtxt"><b>' + esc(p.title) + '</b>'
        + (p.text ? '<span>' + esc(p.text) + '</span>' : "") + "</div></div>";
    }
    /* openSheet: the share sheet. Guests see the preview plus a sign-in
       prompt (and post nothing); members pick a channel and confirm. */
    function openSheet(payload) {
      var p = buildPayload(payload);
      if (!p) return;
      closeSheet();
      var picked = defaultChannel(p.kind);
      var wrap = document.createElement("div");
      wrap.className = "tydsharesheet";
      var inner = '<div class="tydsharesheet-card" role="dialog" aria-label="Share to the Quack Shack">'
        + "<h3>🦆 Share to the Shack</h3>" + previewHtml(p);
      if (!me) {
        inner += '<p class="tydshare-signin"><b>Sign in to share to the Shack</b></p>'
          + '<p class="tydshare-hint">Sharing is for Pond members — it posts under your @username and duck, as a preview card in the Shack.</p>'
          + '<div class="tydshare-row"><a class="tydshare-login" href="' + esc(base + "account.html") + '">Log in</a>'
          + '<a class="tydshare-login" href="' + esc(base + "account.html") + '">Sign up free</a>'
          + '<button type="button" class="tydshare-cancel" id="tydshare-cancel">Cancel</button></div>';
      } else {
        inner += '<p class="tydshare-label">Pick a channel</p><div class="tydshare-chs">'
          + SHARE_CHANNELS.map(function (c) {
            return '<button type="button" data-tydshare-channel="' + c.id + '" class="' + (c.id === picked ? "on" : "") + '" aria-pressed="' + (c.id === picked) + '">' + c.emoji + " " + esc(c.label) + "</button>";
          }).join("") + "</div>"
          + '<p class="tydshare-label"><label for="tydshare-comment">Add a comment (optional)</label></p>'
          + '<textarea id="tydshare-comment" class="tydshare-comment" maxlength="500" rows="2" placeholder="Say something about this deal…"></textarea>'
          + '<p class="tydshare-err" id="tydshare-err" style="display:none;"></p>'
          + '<div class="tydshare-row"><button type="button" class="tydshare-confirm" id="tydshare-confirm">Share to the Shack</button>'
          + '<button type="button" class="tydshare-cancel" id="tydshare-cancel">Cancel</button></div>'
          + '<p class="tydshare-hint">It posts as a preview card — members tap it to open the Pond page.</p>';
      }
      inner += "</div>";
      wrap.innerHTML = inner;
      wrap.addEventListener("click", function (e) { if (e.target === wrap) closeSheet(); });
      document.body.appendChild(wrap);
      sheetEl = wrap;
      wrap.querySelector("#tydshare-cancel").addEventListener("click", closeSheet);
      if (me) {
        wrap.querySelectorAll("[data-tydshare-channel]").forEach(function (b) {
          b.addEventListener("click", function () {
            picked = b.getAttribute("data-tydshare-channel") || picked;
            wrap.querySelectorAll("[data-tydshare-channel]").forEach(function (x) {
              var on = x.getAttribute("data-tydshare-channel") === picked;
              x.classList.toggle("on", on);
              x.setAttribute("aria-pressed", on ? "true" : "false");
            });
          });
        });
        var confirmBtn = wrap.querySelector("#tydshare-confirm");
        confirmBtn.addEventListener("click", function () {
          var commentEl = wrap.querySelector("#tydshare-comment");
          var doc = buildShareDoc(p, me, picked, commentEl ? commentEl.value : "");
          if (!doc) return;
          confirmBtn.disabled = true;
          confirmBtn.textContent = "Sharing…";
          var wr;
          if (writerOverride) {
            try { wr = writerOverride(doc); } catch (e) { wr = Promise.reject(e); }
          } else if (fb) {
            try { wr = fb.addDoc(fb.collection(fb.db, "pondChat"), doc); } catch (e) { wr = Promise.reject(e); }
          } else {
            wr = Promise.reject(new Error("firebase not ready"));
          }
          Promise.resolve(wr).then(function () {
            closeSheet();
            showToast(picked);
          }).catch(function () {
            var errEl = sheetEl && sheetEl.querySelector("#tydshare-err");
            if (errEl) { errEl.textContent = "That did not share. Try again in a little while."; errEl.style.display = "block"; }
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Share to the Shack";
          });
        });
      }
    }
    /* Auth, same pattern as the accent/section syncs: dynamic Firebase
       import with the getApps() guard, then Auth + profiles/{uid} for
       the member's name and duck. Any failure leaves `me` null (guest)
       and the sheet shows the sign-in prompt instead of posting. */
    (function shareInitAuth() {
      try {
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
          var db = mods[2].getFirestore(app);
          fb = { addDoc: mods[2].addDoc, collection: mods[2].collection, getDoc: mods[2].getDoc, doc: mods[2].doc, db: db };
          mods[1].onAuthStateChanged(mods[1].getAuth(app), function (user) {
            if (!user) { me = null; return; }
            if (me && me.uid === user.uid) return;
            me = { uid: user.uid, name: "Pond friend", avatar: "" };
            if (profileCache[user.uid]) {
              me.name = profileCache[user.uid].name || me.name;
              me.avatar = profileCache[user.uid].avatar || "";
              return;
            }
            mods[2].getDoc(mods[2].doc(db, "profiles", user.uid)).then(function (snap) {
              if (!snap.exists()) return;
              var d = snap.data() || {};
              profileCache[user.uid] = { name: d.username || "", avatar: d.avatar || "" };
              if (me && me.uid === user.uid) {
                if (d.username) me.name = d.username;
                if (d.avatar) me.avatar = d.avatar;
              }
            }).catch(function () {});
          });
        }).catch(function () {});
      } catch (e) {}
    })();
    document.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-shack-share]") : null;
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      openSheet(buildPayload(b));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheet();
    });
    /* Share sheet + button styling, so every page's Share button and
       sheet look the same. Solid colors only, no gradients; dark mode
       uses explicit dark colors. */
    var st = document.createElement("style");
    st.textContent = "button[data-shack-share]{display:inline-block;background:#fff;border:2px solid #1f5f74;color:#1f5f74;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit;line-height:1.3;white-space:nowrap;}"
      + "button[data-shack-share]:hover{background:#eaf7fb;}"
      + ".tydsharesheet{position:fixed;inset:0;background:rgba(35,65,77,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;}"
      + ".tydsharesheet-card{background:#fff;border-radius:16px;padding:18px;max-width:380px;width:100%;box-shadow:0 8px 30px rgba(35,65,77,.3);color:#23414d;}"
      + ".tydsharesheet-card h3{margin:0 0 10px;font-size:18px;color:#1f5f74;}"
      + ".tydshare-prev{display:flex;gap:10px;align-items:flex-start;background:#eaf7fb;border:1.5px solid #bcd9e4;border-radius:12px;padding:10px;margin-bottom:12px;}"
      + ".tydshare-prev img{width:64px;height:64px;object-fit:cover;border-radius:10px;flex:none;background:#fff;}"
      + ".tydshare-prevtxt{min-width:0;}"
      + ".tydshare-prevtxt b{display:block;font-size:15px;line-height:1.35;color:#23414d;overflow-wrap:break-word;}"
      + ".tydshare-prevtxt span{display:block;font-size:13px;line-height:1.45;color:#4a6b78;margin-top:3px;overflow-wrap:break-word;}"
      + ".tydshare-label{font-size:13px;font-weight:800;color:#1f5f74;margin:0 0 6px;}"
      + ".tydshare-chs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}"
      + ".tydshare-chs button{border:2px solid #bcd9e4;background:#fff;color:#1f5f74;font-family:inherit;font-size:13px;font-weight:800;border-radius:999px;padding:6px 11px;cursor:pointer;white-space:nowrap;}"
      + ".tydshare-chs button.on{background:#1f5f74;border-color:#1f5f74;color:#fff;}"
      + ".tydshare-comment{display:block;width:100%;box-sizing:border-box;border:2px solid #bcd9e4;border-radius:12px;padding:8px 10px;font-family:inherit;font-size:13.5px;line-height:1.45;color:#23414d;background:#fff;resize:vertical;margin-bottom:12px;}"
      + ".tydshare-comment::placeholder{color:#7ba3b0;}"
      + ".tydshare-err{background:#fdecec;border:1.5px solid #f2c1c1;color:#8c2b2b;border-radius:10px;padding:8px 10px;font-size:13.5px;font-weight:700;margin:0 0 10px;line-height:1.45;}"
      + ".tydshare-row{display:flex;gap:8px;flex-wrap:wrap;}"
      + ".tydshare-confirm{flex:1;background:#ffd94d;border:2px solid #e8b93c;color:#6b5900;font-weight:800;font-size:15px;border-radius:12px;padding:10px;cursor:pointer;font-family:inherit;}"
      + ".tydshare-confirm:disabled{opacity:.6;cursor:default;}"
      + ".tydshare-cancel{background:none;border:2px solid #bcd9e4;color:#1f5f74;font-weight:700;font-size:15px;border-radius:12px;padding:10px 14px;cursor:pointer;font-family:inherit;}"
      + ".tydshare-login{display:inline-block;background:#1f5f74;border:2px solid #1f5f74;color:#fff;font-weight:800;font-size:15px;border-radius:12px;padding:10px 14px;text-decoration:none;text-align:center;}"
      + ".tydshare-signin{font-size:15px;margin:0 0 4px;color:#23414d;}"
      + ".tydshare-hint{font-size:12.5px !important;color:#4a6b78 !important;margin:10px 0 0 !important;line-height:1.5;}"
      + ".tydshare-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(84px + env(safe-area-inset-bottom));z-index:10000;background:#1f5f74;color:#fff;font-family:inherit;font-weight:700;font-size:14px;border-radius:999px;padding:10px 16px;box-shadow:0 8px 22px rgba(35,65,77,.35);max-width:calc(100vw - 24px);text-align:center;}"
      + ".tydshare-toast a{color:#ffd94d;font-weight:800;}"
      + "html[data-theme=\"dark\"] button[data-shack-share]{background:#172635;border-color:#2e4a5f;color:#c9f0fc;}"
      + "html[data-theme=\"dark\"] button[data-shack-share]:hover{background:#23414d;}"
      + "html[data-theme=\"dark\"] .tydsharesheet-card{background:#1e3245;color:#dceef6;border:1px solid #2e4a5f;}"
      + "html[data-theme=\"dark\"] .tydsharesheet-card h3{color:#c9f0fc;}"
      + "html[data-theme=\"dark\"] .tydshare-prev{background:#101e2c;border-color:#2e4a5f;}"
      + "html[data-theme=\"dark\"] .tydshare-prevtxt b{color:#eefaff;}"
      + "html[data-theme=\"dark\"] .tydshare-prevtxt span{color:#bcd6e4;}"
      + "html[data-theme=\"dark\"] .tydshare-label{color:#c9f0fc;}"
      + "html[data-theme=\"dark\"] .tydshare-chs button{background:#172635;border-color:#2e4a5f;color:#d7ecf5;}"
      + "html[data-theme=\"dark\"] .tydshare-chs button.on{background:#ffd94d;border-color:#ffd94d;color:#172635;}"
      + "html[data-theme=\"dark\"] .tydshare-comment{background:#101e2c;border-color:#2e4a5f;color:#eefaff;}"
      + "html[data-theme=\"dark\"] .tydshare-comment::placeholder{color:#7ba3b0;}"
      + "html[data-theme=\"dark\"] .tydshare-err{background:#3a1d1d;border-color:#6e3434;color:#f3c1c1;}"
      + "html[data-theme=\"dark\"] .tydshare-cancel{border-color:#2e4a5f;color:#d7ecf5;}"
      + "html[data-theme=\"dark\"] .tydshare-login{background:#ffd94d;border-color:#ffd94d;color:#172635;}"
      + "html[data-theme=\"dark\"] .tydshare-signin{color:#eefaff;}"
      + "html[data-theme=\"dark\"] .tydshare-hint{color:#bcd6e4 !important;}";
    document.head.appendChild(st);
    window.TYDShare = {
      buildPayload: buildPayload,
      buildShareDoc: buildShareDoc,
      defaultChannel: defaultChannel,
      channels: SHARE_CHANNELS,
      openSheet: openSheet,
      closeSheet: closeSheet,
      getMe: function () { return me; },
      /* Test seams: pretend to be signed in, and capture the doc
         instead of writing it to Firestore. No Firestore involved. */
      _setMe: function (m) { me = m || null; },
      _setWriter: function (fn) { writerOverride = fn || null; }
    };
  })();

  /* Site-wide photo lightbox + document viewer (v332, Nov 16, 2026):
     any thumbnail with data-tydlb opens full-size in a full-screen
     overlay (close button, tap the backdrop to close, swipe or ‹ ›
     arrows when its data-tydlb-group has several, Escape/arrows on
     desktop). Thumbnails are untouched; delete buttons are separate
     elements, so a tap on × still deletes and never opens the
     lightbox. Documents (data-tyddoc) open in a new tab from a blob
     URL — iOS Safari renders PDFs natively. The overlay is dark in
     both themes so photos read the same light or dark. v335: a photo
     with data-tydlb-cap / data-tydlb-date shows its caption and date
     under the full image. */
  (function () {
    var docs = {};
    var overlay = null, items = [], idx = 0, touchX = null;
    var LB_CSS = ".tydlb{position:fixed;inset:0;background:rgba(8,18,24,.94);z-index:10080;display:flex;align-items:center;justify-content:center;}"
      + ".tydlb img{max-width:100vw;max-height:100vh;object-fit:contain;display:block;}"
      + ".tydlb button{position:fixed;z-index:2;width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.65);background:rgba(0,0,0,.55);color:#fff;font-size:22px;font-weight:800;line-height:1;cursor:pointer;padding:0;}"
      + ".tydlb .tydlb-close{top:calc(10px + env(safe-area-inset-top));right:12px;}"
      + ".tydlb .tydlb-prev{left:10px;top:50%;transform:translateY(-50%);}"
      + ".tydlb .tydlb-next{right:10px;top:50%;transform:translateY(-50%);}"
      + ".tydlb .tydlb-count{position:fixed;z-index:2;bottom:calc(14px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);color:#fff;background:rgba(0,0,0,.55);border-radius:999px;padding:6px 14px;font-size:14px;font-weight:700;white-space:nowrap;}"
      + ".tydlb-cap{position:fixed;z-index:2;bottom:calc(64px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);max-width:92vw;color:#fff;background:rgba(0,0,0,.55);border-radius:12px;padding:8px 14px;font-size:14px;font-weight:600;text-align:center;line-height:1.35;}"
      + ".tydlb-cap .tydlb-capdate{display:block;font-size:12.5px;font-weight:400;color:#d7ecf5;margin-top:2px;}"
      + "[data-tydlb]{cursor:zoom-in;}"
      + "[data-tyddoc]{cursor:pointer;}";
    function ensureCss() {
      if (document.getElementById("tydlbc")) return;
      var st = document.createElement("style");
      st.id = "tydlbc"; st.textContent = LB_CSS;
      document.head.appendChild(st);
    }
    function build() {
      if (overlay) return;
      ensureCss();
      overlay = document.createElement("div");
      overlay.className = "tydlb";
      overlay.innerHTML = '<img alt=""><button type="button" class="tydlb-close" aria-label="Close">✕</button><button type="button" class="tydlb-prev" aria-label="Previous photo">‹</button><button type="button" class="tydlb-next" aria-label="Next photo">›</button><div class="tydlb-count"></div><div class="tydlb-cap"></div>';
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
      overlay.querySelector(".tydlb-close").addEventListener("click", function () { close(); });
      overlay.querySelector(".tydlb-prev").addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
      overlay.querySelector(".tydlb-next").addEventListener("click", function (e) { e.stopPropagation(); step(1); });
      overlay.addEventListener("touchstart", function (e) {
        var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        touchX = t ? t.clientX : null;
      }, { passive: true });
      overlay.addEventListener("touchend", function (e) {
        var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
        if (touchX === null || !t) { touchX = null; return; }
        var dx = t.clientX - touchX; touchX = null;
        if (dx > 40) step(-1); else if (dx < -40) step(1);
      }, { passive: true });
      document.addEventListener("keydown", function (e) {
        if (!overlay || !overlay.parentNode) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowLeft") step(-1);
        else if (e.key === "ArrowRight") step(1);
      });
    }
    function show() {
      if (!overlay || !items.length) return;
      var it = items[idx];
      var im = overlay.querySelector("img");
      im.src = it.src; im.alt = it.alt || "";
      var multi = items.length > 1;
      overlay.querySelector(".tydlb-prev").style.display = multi ? "" : "none";
      overlay.querySelector(".tydlb-next").style.display = multi ? "" : "none";
      var ct = overlay.querySelector(".tydlb-count");
      ct.style.display = multi ? "" : "none";
      ct.textContent = multi ? ((idx + 1) + " of " + items.length) : "";
      /* v335: caption + date under the full image, when the item has them. */
      var cp = overlay.querySelector(".tydlb-cap");
      var cap = it.cap || "", dt = it.dt || "";
      if (cap || dt) {
        cp.style.display = "";
        cp.innerHTML = (cap ? escHtml(cap) : "") + (dt ? '<span class="tydlb-capdate">' + fmtLbDate(dt) + "</span>" : "");
      } else cp.style.display = "none";
    }
    function step(d) {
      if (!items.length) return;
      idx = (idx + d + items.length) % items.length;
      show();
    }
    function open(list, i) {
      if (!list || !list.length) return;
      build();
      items = list; idx = Math.max(0, Math.min(i || 0, list.length - 1));
      show();
      if (!overlay.parentNode) document.body.appendChild(overlay);
      try { document.body.style.overflow = "hidden"; } catch (e) {}
    }
    function close() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      try { document.body.style.overflow = ""; } catch (e) {}
      items = []; idx = 0;
    }
    function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function fmtLbDate(ds) { if (!ds) return ""; try { return new Date(ds + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch (e) { return ds; } }
    function dataUrlToBlob(dataUrl) {
      var comma = dataUrl.indexOf(",");
      var head = dataUrl.slice(0, comma), b64 = dataUrl.slice(comma + 1);
      var mime = "application/octet-stream";
      var m = head.match(/data:([^;]+)/); if (m) mime = m[1];
      var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    function openDoc(src) {
      if (!src) return false;
      var url = src;
      if (src.indexOf("data:") === 0) {
        try { url = URL.createObjectURL(dataUrlToBlob(src)); }
        catch (e) { return false; }
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e2) {} }, 120000);
      }
      var w = null;
      try { w = window.open(url, "_blank", "noopener"); } catch (e) {}
      return !!w;
    }
    window.TYDLightbox = {
      open: open,
      close: close,
      openDoc: openDoc,
      registerDoc: function (id, src, name, type) { if (id) docs[id] = { src: src, name: name || "", type: type || "" }; },
      _docs: docs,
      _isOpen: function () { return !!(overlay && overlay.parentNode); }
    };
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      /* Buttons (delete ×, Remove, form buttons) are never lightbox
         triggers — a tap on one must run its own handler, never open
         a photo or a document. */
      if (t.closest("button")) return;
      var docEl = t.closest("[data-tyddoc]");
      if (docEl) {
        var d = docs[docEl.getAttribute("data-tyddoc")];
        /* Sources, in order: the registry, the page's provider (the
           pet gallery binds before site-nav.js loads, so it serves
           its documents this way), then a data-doc-src attribute. */
        var src = (d && d.src)
          || (typeof window.TYDPetDocSrc === "function" ? window.TYDPetDocSrc(docEl.getAttribute("data-tyddoc")) : "")
          || docEl.getAttribute("data-doc-src") || "";
        if (src) { e.preventDefault(); openDoc(src); }
        return;
      }
      var im = t.closest("[data-tydlb]");
      if (!im) return;
      if (im.closest && im.closest(".tydlb")) return;
      e.preventDefault();
      var grp = im.getAttribute("data-tydlb-group");
      var list = [], at = 0;
      if (grp) {
        var nodes = document.querySelectorAll('[data-tydlb-group="' + grp + '"]');
        for (var i = 0; i < nodes.length; i++) {
          list.push({ src: nodes[i].getAttribute("data-tydlb-src") || nodes[i].src || "", kind: "img", cap: nodes[i].getAttribute("data-tydlb-cap") || "", dt: nodes[i].getAttribute("data-tydlb-date") || "" });
          if (nodes[i] === im) at = i;
        }
      } else {
        list = [{ src: im.getAttribute("data-tydlb-src") || im.src || "", kind: "img", cap: im.getAttribute("data-tydlb-cap") || "", dt: im.getAttribute("data-tydlb-date") || "" }];
      }
      list = list.filter(function (x) { return x.src; });
      if (list.length) open(list, at);
    });
  })();

  /* Brand pages (v295, Nov 15, 2026): every brand page gets a "What we
     verified" line, a detail block with the true offer, and a
     related-brands row, from one shared data map — so this is one
     change, not 14 hand-edits. All facts come from the verified partner
     list; no prices, discounts or expiry dates are invented. Only
     Aurzen CJ10 (to Jan 30, 2027) and the SEEQ 30% first-order offer
     (to Nov 30, 2026, already shown on its deal row) have a verified
     customer-facing end date; every other brand says so plainly. */
  var TYD_BRAND_ORDER = ["aurzen", "bur-bur", "fanttik", "glocusent", "im8-health", "lotus-and-luna", "mellow-sleep", "ridge", "rorry", "ryze", "seeq", "soundcore", "weekend-sleepover", "zawina-morocco"];
  var TYD_BRAND_NAMES = { "aurzen": "Aurzen", "bur-bur": "Bur Bur", "fanttik": "Fanttik", "glocusent": "Glocusent", "im8-health": "IM8 Health", "lotus-and-luna": "Lotus and Luna", "mellow-sleep": "Mellow Sleep", "ridge": "Ridge", "rorry": "Rorry", "ryze": "Ryze", "seeq": "SEEQ", "soundcore": "Soundcore", "weekend-sleepover": "Weekend Sleepover", "zawina-morocco": "Zawina Morocco" };
  var TYD_BRAND_INFO = {
    /* img/desc (v298, Nov 15, 2026): each brand's own hero image and
       one-line description, copied verbatim from its own brand page
       (.brand-hero src and .brand-desc text), so "More from the Pond"
       renders as real cards instead of bare text links. Nothing here
       is invented; the image and description already exist on the
       brand's own page. */
    "aurzen": { verified: "Code CJ10 (10% off all products) and the ZIP deal with merchant code ZIP20.", details: ["10% off all products with code CJ10", "ZIP Tri-Fold Projector $259.99 (was $499.99, save 48%) with merchant code ZIP20"], expiry: "Code CJ10 runs to Jan 30, 2027.", img: "https://aurzen.com/cdn/shop/files/Aurzen_ZIP_Tri-Fold_Portable_Projector_-_Titanium_Gold.webp?v=1776421892&width=900", desc: "Portable projectors for movie nights anywhere, from the backyard to the bedroom." },
    "bur-bur": { verified: "Code TYD15 took 15% off at checkout on Oct 26, 2026.", details: ["15% off with code TYD15", "Shop through the Pond link: burbur.com/?ref=TYD15"], expiry: "", img: "https://cdn.shopify.com/s/files/1/0588/9841/5771/files/STYLING_CREAM.jpg?v=1790621316&width=900", desc: "Hair care essentials for soft, healthy hair." },
    "fanttik": { verified: "The Pond link opens the Fanttik store.", details: ["Link-only partner: shop through the Pond link, no code to type in"], expiry: "", img: "https://fanttik.com/cdn/shop/files/9_535c6730-aea8-4ae7-a592-96ad568b1101.jpg?v=1786358127&width=1200", desc: "Portable tools and tire inflators for home, car, and road trips." },
    "glocusent": { verified: "The Pond link opens the Glocusent store.", details: ["Link-only partner: shop through the Pond link, no code to type in", "No customer discount percentage is published for Glocusent"], expiry: "", img: "https://glocusent.com/cdn/shop/files/a13-neck_light_4.jpg?v=1773992320&width=900", desc: "Rechargeable reading lights that clip on and go anywhere." },
    "im8-health": { verified: "Code Take10 (10% off) and the Pond link.", details: ["10% off with code Take10", "Shop through the Pond link: im8health.com/Take10"], expiry: "", img: "https://im8health.com/cdn/shop/files/USD_30DAY_ESSENTIALS_COPY1_VISUAL_B_97edb232-7b04-4be6-8eb5-f6a3187588be.jpg?v=1778121212&width=1200", desc: "Daily health essentials, made simple." },
    "lotus-and-luna": { verified: "The Pond link shows 20% off (verified Nov 14, 2026).", details: ["20% off through the Pond link (lotusandluna.com/buzzlune)", "No code to type in — the discount shows when you follow the link"], expiry: "", img: "https://cdn.shopify.com/s/files/1/1134/8440/files/XHLB017_ORN_1_2d249b49-2b7c-401a-a51a-7f763bb784f9.jpg?v=1794517752&width=900", desc: "Handmade jewelry with a story, made to be worn every day." },
    "mellow-sleep": { verified: "The Pond link and the comforter prices for all three sizes.", details: ["15% off through the Pond link (mellowsleep.com/TYD15OFF)", "Twin — $69.99 (was $179.99)", "Full/Queen — $79.99 (was $209.99)", "King — $89.99 (was $224.99)", "Link-only — the code alone will not track, so use the link"], expiry: "", img: "https://mellowsleep.com/cdn/shop/files/Hero_41351ffa-55da-45af-9ad0-9281919a7cd1.jpg?v=1771959104&width=1200", desc: "Temperature-controlling bedding for better sleep." },
    "ridge": { verified: "The Ridge storefront link opens (checked Oct 20, 2026).", details: ["No code and no customer discount — the Pond link takes you to the Ridge storefront", "Storefront: ridge.euka.to/snyh5u"], expiry: "", img: "https://ca.ridge.com/cdn/shop/files/TobaccoBrown-Wallet-THUMBNAIL_b071bd25-a027-4f5d-a7e9-e0d6890119c9.jpg?v=1783469399&width=900", desc: "Slim wallets and everyday carry, built to last." },
    "rorry": { verified: "Code TYD10 took 10% off at checkout on Oct 23, 2026.", details: ["10% off with code TYD10", "Shop through the Pond link: rorry.com/?ref=TYD10"], expiry: "", img: "https://rorry.com/cdn/shop/files/RORRY-AuraDock_-M2-5000mAh-4in1-ChargingStation-with-MagSafe-Power-Bank-pink.jpg?v=1793352674&width=1200", desc: "Chargers and power banks that keep up with you." },
    "ryze": { verified: "The Pond link gives 15% off.", details: ["15% off through the Pond link (ryzesuperfoods.com/LUCY14)", "LUCY14 is the link itself, not a type-in code"], expiry: "", img: "https://www.ryzesuperfoods.com/cdn/shop/files/mushroom-coffee-add-ona3b6ryze-115181.jpg?v=1724682354&width=1200", desc: "Mushroom coffee for calm, focused mornings." },
    "seeq": { verified: "The Subscribe & Save offer rang up 30% off the first order at checkout on Nov 13, 2026.", details: ["30% off your first Subscribe & Save order (to Nov 30), then 10% off refills", "Variety Pack $49.00 — first order $34.30, then $44.10 every 6 weeks", "Link-only: seeqsupply.com/LUCY45522"], expiry: "The 30% first-order offer ends Nov 30, 2026; refills stay 10% off after that.", img: "https://seeqsupply.com/cdn/shop/files/1_144b9381-0a1c-4797-b800-c37806c09565.jpg?v=1791923727&width=1200", desc: "Clear protein that tastes like juice, not a shake." },
    "soundcore": { verified: "Code AFSC20 (extra 20% off full-price items).", details: ["Extra 20% off full-price items with code AFSC20"], expiry: "", img: "https://us.soundcore.com/cdn/shop/files/A3388Z11_DTC_listing_image_TD01_US_V1_59c18857-9355-46ac-ac07-48f92411ed6a.png?v=1763430064&width=900", desc: "Anker audio, earbuds and speakers that sound great." },
    "weekend-sleepover": { verified: "Code LUCY59928 took 10% off at checkout on Oct 23, 2026.", details: ["10% off with code LUCY59928", "Shop through the Pond link: weekendsleepover.com/LUCY59928"], expiry: "", img: "https://cdn.shopify.com/s/files/1/0762/3897/9329/files/robe-amalfi1.jpg?v=1790851358&width=900", desc: "Cozy sleepwear and robes for slow mornings." },
    "zawina-morocco": { verified: "The Pond link opens the Zawina Morocco store (checked Nov 3, 2026).", details: ["Link-only partner: no code and no customer discount", "Shop through the Pond link: zawinamorocco.com/?ref=kcugjbmk"], expiry: "", img: "https://cdn.shopify.com/s/files/1/0509/8068/3950/files/NilaBundleSet_Acopy_a357fc66-f47f-4e5f-8bdd-eebf5db15fc2.jpg?v=1794385284&width=900", desc: "Moroccan skincare, made with natural ingredients." }
  };
  function tydEnhanceBrandPage() {
    if (!inBrands) return;
    if (document.querySelector(".tyd-brand-detail")) return;
    var slug = String(file || "").replace(/\.html$/, "");
    var info = TYD_BRAND_INFO[slug];
    if (!info) return;
    var wrap = document.querySelector(".wrap");
    if (!wrap) return;
    var badge = document.querySelector(".verified-badge");
    var note = document.createElement("p");
    note.className = "tyd-verified-note";
    note.textContent = "What we verified (Nov 15, 2026): " + info.verified;
    if (badge && badge.parentNode) badge.parentNode.insertBefore(note, badge.nextSibling);
    else wrap.insertBefore(note, wrap.firstChild);
    var card = document.createElement("div");
    card.className = "card tyd-brand-detail";
    var h = "<h2>About this deal</h2><ul>";
    info.details.forEach(function (d) { h += "<li>" + d + "</li>"; });
    h += "</ul>";
    h += '<p class="tyd-expiry">' + (info.expiry || "No expiry date published for this offer.") + "</p>";
    card.innerHTML = h;
    note.parentNode.insertBefore(card, note.nextSibling);
    /* v298: move the deal row up so it sits directly under the verified
       note, ahead of the "About this deal" card — with the tightened
       hero above, the deal is above the fold at desktop height instead
       of buried under the detail card. Only the row's position changes;
       the row itself (and any list button wired onto it) is untouched.
       The 7 brand pages with no deal row have nothing to move. */
    var deal = wrap.querySelector("a.deal");
    if (deal) note.parentNode.insertBefore(deal, card);
    var idx = TYD_BRAND_ORDER.indexOf(slug);
    var rel = [];
    for (var i = 1; i <= 3; i++) rel.push(TYD_BRAND_ORDER[(idx + i) % TYD_BRAND_ORDER.length]);
    var relEl = document.createElement("div");
    relEl.className = "card tyd-related";
    /* v298: "More from the Pond" is real cards now, not bare text links.
       Each card shows the brand's own hero image and its own one-line
       description from TYD_BRAND_INFO (copied from that brand's page),
       so nothing is invented. If an image fails to load it drops out
       and the name + description still read. */
    var rh = "<h2>More from the Pond</h2>";
    rel.forEach(function (r) {
      var ri = TYD_BRAND_INFO[r] || {};
      rh += '<a class="tyd-rel-card" href="' + r + '.html">';
      if (ri.img) rh += '<img src="' + ri.img + '" alt="" loading="lazy" onerror="this.remove()">';
      rh += '<span class="tyd-rel-txt"><span class="tyd-rel-name">' + TYD_BRAND_NAMES[r] + '</span>';
      if (ri.desc) rh += '<span class="tyd-rel-desc">' + ri.desc + '</span>';
      rh += "</span></a>";
    });
    relEl.innerHTML = rh;
    var back = document.querySelector("a.back");
    if (back && back.parentNode) back.parentNode.insertBefore(relEl, back);
    else wrap.appendChild(relEl);
    /* v298: the shop card repeats its own heading as the link text
       ("Shop Mellow Sleep" as both the h2 and the link, on all 14 brand
       pages). Keep one: the heading stays, the link reads "Shop now ›".
       The link URL and its tracking attribute are untouched. */
    Array.prototype.forEach.call(wrap.querySelectorAll(".card"), function (c) {
      var sh = c.querySelector("h2");
      var sa = c.querySelector("a");
      if (sh && sa && sh.textContent.trim().indexOf("Shop ") === 0 && sa.textContent.trim() === sh.textContent.trim()) sa.textContent = "Shop now \u203A";
      /* The same heading is also repeated inside the offer line on
         three pages ("Shop Fanttik ›", "Reading Lights Shop Glocusent
         ›", "Shop Ridge ›"). Strip the repeated heading from the offer
         line; if nothing but the arrow is left, drop the line. */
      if (sh) {
        var head = sh.textContent.trim();
        Array.prototype.forEach.call(c.querySelectorAll("p"), function (p) {
          if (p.querySelector("a") || p.querySelector("button")) return;
          if (p.textContent.indexOf(head) !== -1) {
            var t = p.textContent.split(head).join("").replace(/\s+/g, " ").trim();
            if (/^[›»\s]*$/.test(t)) p.remove();
            else p.textContent = t;
          }
        });
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tydEnhanceBrandPage);
  else tydEnhanceBrandPage();

  if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register(base + "sw.js").catch(function () {}); } catch (e) {}
  }
})();

/* v368 duplicate check, shared helper (Lucy, Nov 18, 2026): "Say if
   there is a duplicate for anything when adding anything." Every add
   flow on the site uses this one sheet so the wording and the buttons
   stay the same everywhere: the sheet names the existing item, Cancel
   is the safe default and saves nothing, "Add it anyway" runs the
   callback the page passes in. Pages only call it from inside a click
   handler, so it is built lazily on first use (site-nav.js loads after
   most inline page scripts). Inline styles only, no CSS file edit. */
(function () {
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  var sheet = null, msgEl = null, addBtn = null, cancelBtn = null, onAdd = null;
  function build() {
    sheet = document.createElement("div");
    sheet.id = "tyd-dup-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.style.cssText = "display:none;position:fixed;inset:0;z-index:10000;background:rgba(20,40,55,.55);align-items:center;justify-content:center;padding:20px;";
    var card = document.createElement("div");
    card.style.cssText = "background:#ffffff;border-radius:18px;max-width:420px;width:100%;padding:22px 20px;box-shadow:0 12px 40px rgba(0,0,0,.3);font-family:inherit;";
    msgEl = document.createElement("p");
    msgEl.id = "tyd-dup-msg";
    msgEl.style.cssText = "margin:0 0 18px;font-size:16px;line-height:1.5;color:#14384a;";
    var row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;";
    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "background:#e8f3f7;color:#14384a;border:none;border-radius:999px;padding:11px 18px;font-weight:800;font-size:15px;cursor:pointer;";
    addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add it anyway";
    addBtn.style.cssText = "background:#ffd94d;color:#14384a;border:none;border-radius:999px;padding:11px 18px;font-weight:800;font-size:15px;cursor:pointer;";
    row.appendChild(cancelBtn);
    row.appendChild(addBtn);
    card.appendChild(msgEl);
    card.appendChild(row);
    sheet.appendChild(card);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) hide(); });
    sheet.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
    cancelBtn.addEventListener("click", hide);
    addBtn.addEventListener("click", function () { var f = onAdd; hide(); if (f) f(); });
    document.body.appendChild(sheet);
  }
  function hide() { if (sheet) sheet.style.display = "none"; onAdd = null; }
  function show(msg, onAddAnyway) {
    if (!sheet) build();
    msgEl.textContent = msg;
    onAdd = onAddAnyway || null;
    sheet.style.display = "flex";
    try { cancelBtn.focus(); } catch (e) {}
  }
  window.TYDDup = { norm: norm, show: show, hide: hide };
})();
