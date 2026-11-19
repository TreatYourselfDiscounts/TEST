/* Pond language filter: keeps bad words out of usernames and comments.
   Shared by account.html (username picker + comment replies) and the six
   corner pages (comments on shared items). It gives members a friendly
   "please reword" message at the moment they post. Matching shrugs off
   tricks (leet speak, stretched letters, words squashed together) but is
   careful with innocent lookalikes (shiitake, peacock, spice, Scunthorpe). */
(function () {
  var WORDS = ["fuck", "fucking", "fucker", "fuckface", "motherfucker",
    "shit", "shitty", "shithead", "bullshit",
    "bitch", "bitches", "bastard", "asshole",
    "whore", "whores", "slut", "sluts", "cunt",
    "dickhead", "cock", "pussy", "porn", "porno", "dildo",
    "nigger", "nigga", "faggot", "fag", "retard", "retarded",
    "spic", "kike", "chink", "wetback", "tranny", "kys"];
  /* Stems whose squashed-together form appears inside innocent words:
     these are only blocked as whole words, never as substrings. */
  var NO_SQUASH = { shit: 1, cock: 1, cunt: 1, spic: 1 };
  /* Blocked in usernames only: as a comment word it is also a beloved
     actor's first name (Dick Van Dyke), and the Pond talks about movies. */
  var NAME_ONLY = ["dick"];
  function norm(s) {
    return String(s == null ? "" : s).toLowerCase()
      .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a")
      .replace(/5/g, "s").replace(/7/g, "t").replace(/@/g, "a").replace(/\$/g, "s");
  }
  function collapse(s) { return s.replace(/(.)\1+/g, "$1"); }
  var STEMS = WORDS.map(function (w) { return { raw: w, flat: collapse(w) }; });
  function test(text, strict) {
    if (!text) return false;
    var n = norm(text);
    var tokens = n.split(/[^a-z]+/).filter(Boolean).map(collapse);
    var squashed = collapse(n.replace(/[^a-z]/g, ""));
    for (var i = 0; i < STEMS.length; i++) {
      var w = STEMS[i];
      if (tokens.indexOf(w.flat) > -1) return true;
      if (w.raw.length >= 4 && !NO_SQUASH[w.raw] && squashed.indexOf(w.flat) > -1) return true;
    }
    if (strict) {
      for (var j = 0; j < NAME_ONLY.length; j++) {
        if (tokens.indexOf(NAME_ONLY[j]) > -1) return true;
      }
    }
    return false;
  }
  window.TYDBadWords = { test: test };
})();
