/* auth-secure.js — v342 (Nov 17, 2026).
   Optional secure sign-in choices for account.html:
   (1) an email sign-in link, using Firebase's built-in email-link auth;
   (2) a 6-digit email code, sent and checked by /api/auth-code.
   Both are OPTIONAL. The usual email/password and Google sign-in are
   untouched and stay the default. Nobody is forced into these, existing
   accounts do not change, and nothing here enrolls anyone in anything.
   Classic script (no imports): account.html's module script hands it the
   Firebase auth object and the Firebase functions it needs, so this file
   works in a plain browser and in the jsdom tests. */
(function () {
  "use strict";

  var LINK_KEY = "tydSecureLinkEmail";
  var SITE_URL = "/account.html";
  var CODE_ENDPOINT = "/api/auth-code";
  var CODE_TTL_MINUTES = 10;

  var auth = null, fns = null, opts = {}, doFetch = null, inited = false;

  function $(id) { return document.getElementById(id); }
  function show(el, msg, ok) {
    if (!el) return;
    el.textContent = msg;
    el.className = "status show " + (ok ? "ok" : "err");
  }
  function showComing() {
    var n = $("secure-code-coming");
    if (n) n.hidden = false;
  }
  function hideComing() {
    var n = $("secure-code-coming");
    if (n) n.hidden = true;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }
  function isValidCode(code) {
    return /^\d{6}$/.test(String(code || "").trim());
  }

  /* The link must come back to this site, and handleCodeInApp tells
     Firebase to finish the sign-in here instead of on a Firebase page. */
  function actionCodeSettings() {
    return { url: SITE_URL, handleCodeInApp: true };
  }

  function friendlyLinkError(err) {
    var c = (err && err.code) || "";
    if (c === "auth/invalid-action-code") return "That sign-in link is not valid any more. Ask for a fresh link and try again.";
    if (c === "auth/expired-action-code") return "That sign-in link has expired. Ask for a fresh link and try again.";
    if (c === "auth/invalid-email") return "That email address does not look complete. Check it and try again.";
    if (c === "auth/user-disabled") return "That account has been turned off. Email Lucy from another address and she can help.";
    if (c === "auth/too-many-requests") return "Too many tries in a row. Please wait a little and try again.";
    if (c === "auth/network-request-failed") return "The connection hiccuped. Check your internet and try again.";
    if (c === "auth/user-not-found") return "We could not find an account for that email. Try the usual sign-in above, or create an account first.";
    return "Something did not work. Please try again in a moment.";
  }

  /* Plain-words messages for the 6-digit code, keyed by the status the
     /api/auth-code function returns. The "unavailable" message is the
     honest holding state: the code flow is built, but the email sender
     (and the Firebase service-account key that mints the sign-in token)
     is not connected yet, so it says so instead of looking broken. */
  function codeErrorMessage(status) {
    if (status === "invalid" || status === "wrong") return "That code does not match the one we sent. Check the 6 digits and try again.";
    if (status === "expired") return "That code has expired. Ask for a new one and try again.";
    if (status === "too-many") return "Too many wrong tries. Ask for a new code and try again.";
    if (status === "not-requested") return "We have not sent a code to that email yet. Tap Send me a code first.";
    if (status === "send-failed") return "We could not send the code just now. Check your internet and try again in a moment.";
    if (status === "unavailable") return "The 6-digit code is coming soon. The email sender is not connected yet, so codes cannot go out. The usual sign-in above still works.";
    return "Something did not work. Please try again in a moment.";
  }

  /* ---- email sign-in link ---- */

  function finishLinkSignIn(email) {
    var status = $("secure-link-status");
    var box = $("secure-link-box");
    if (!isValidEmail(email)) {
      show(status, "Type the email you asked the link for, then tap Finish signing in.");
      return Promise.resolve(false);
    }
    show(status, "Signing you in from your link...", true);
    return fns.signInWithEmailLink(auth, email, window.location.href)
      .then(function (cred) {
        try { localStorage.removeItem(LINK_KEY); } catch (e) {}
        if (box) box.hidden = true;
        show(status, "Logged in with your sign-in link. Welcome back!", true);
        if (opts.onSignedIn) opts.onSignedIn(cred.user, "link");
        return true;
      })
      .catch(function (e) {
        show(status, friendlyLinkError(e));
        return false;
      });
  }

  function sendLink() {
    var input = $("secure-link-email");
    var status = $("secure-link-status");
    var email = input ? input.value.trim() : "";
    if (!isValidEmail(email)) {
      show(status, "Type your email address first, then tap Send me the link.");
      return Promise.resolve(false);
    }
    return fns.sendSignInLinkToEmail(auth, email, actionCodeSettings())
      .then(function () {
        try { localStorage.setItem(LINK_KEY, email); } catch (e) {}
        show(status, "We sent a sign-in link to " + email + ". Tap the link in that email and it brings you right back here, signed in. Check spam if you do not see it.", true);
        return true;
      })
      .catch(function (e) {
        show(status, friendlyLinkError(e));
        return false;
      });
  }

  /* ---- 6-digit email code ---- */

  function requestCode() {
    var input = $("secure-code-email");
    var status = $("secure-code-status");
    var email = input ? input.value.trim() : "";
    hideComing();
    if (!isValidEmail(email)) {
      show(status, "Type your email address first, then tap Send me a code.");
      return Promise.resolve(false);
    }
    if (!doFetch) {
      show(status, codeErrorMessage("unavailable"));
      showComing();
      return Promise.resolve(false);
    }
    return doFetch(CODE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", email: email })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok) {
          show(status, "We sent a 6-digit code to " + email + ". It works for " + CODE_TTL_MINUTES + " minutes. Type it below.", true);
          var row = $("secure-code-verify-row");
          if (row) row.hidden = false;
          var codeInput = $("secure-code-input");
          if (codeInput) codeInput.focus();
          return true;
        }
        if (data && data.error === "unavailable") {
          show(status, codeErrorMessage("unavailable"));
          showComing();
          return false;
        }
        show(status, codeErrorMessage(data && data.error));
        return false;
      })
      .catch(function () {
        show(status, codeErrorMessage("send-failed"));
        return false;
      });
  }

  function verifyCode() {
    var emailInput = $("secure-code-email");
    var codeInput = $("secure-code-input");
    var status = $("secure-code-status");
    var email = emailInput ? emailInput.value.trim() : "";
    var code = codeInput ? codeInput.value.trim() : "";
    if (!isValidCode(code)) {
      show(status, "That code should be 6 digits. Check the email we sent and type all 6 numbers.");
      return Promise.resolve(false);
    }
    if (!doFetch) {
      show(status, codeErrorMessage("unavailable"));
      showComing();
      return Promise.resolve(false);
    }
    return doFetch(CODE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", email: email, code: code })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.customToken) {
          return fns.signInWithCustomToken(auth, data.customToken)
            .then(function (cred) {
              show(status, "Logged in with your email code. Welcome back!", true);
              if (opts.onSignedIn) opts.onSignedIn(cred.user, "code");
              return true;
            })
            .catch(function (e) {
              show(status, friendlyLinkError(e));
              return false;
            });
        }
        if (data && data.ok && data.tokenReady === false) {
          show(status, codeErrorMessage("unavailable"));
          showComing();
          return false;
        }
        show(status, codeErrorMessage(data && data.error));
        return false;
      })
      .catch(function () {
        show(status, codeErrorMessage("send-failed"));
        return false;
      });
  }

  /* ---- wiring ---- */

  function toggleBox(boxId, focusId) {
    var box = $(boxId);
    if (!box) return;
    box.hidden = !box.hidden;
    if (!box.hidden) {
      var input = $(focusId);
      if (input && !input.value) {
        var main = $("email");
        if (main && main.value) input.value = main.value;
      }
      if (input) input.focus();
    }
  }

  function init(authObj, fnsObj, optsObj) {
    if (inited) return false;
    inited = true;
    auth = authObj;
    fns = fnsObj || {};
    opts = optsObj || {};
    doFetch = (opts && opts.fetch) || (window.fetch ? window.fetch.bind(window) : null);

    var linkBtn = $("secure-link-btn");
    if (linkBtn) linkBtn.addEventListener("click", function () { toggleBox("secure-link-box", "secure-link-email"); });
    var codeBtn = $("secure-code-btn");
    if (codeBtn) codeBtn.addEventListener("click", function () { toggleBox("secure-code-box", "secure-code-email"); });
    var linkSend = $("secure-link-send");
    if (linkSend) linkSend.addEventListener("click", sendLink);
    var linkFinish = $("secure-link-finish");
    if (linkFinish) linkFinish.addEventListener("click", function () {
      var em = $("secure-link-email");
      finishLinkSignIn(em ? em.value.trim() : "");
    });
    var codeSend = $("secure-code-send");
    if (codeSend) codeSend.addEventListener("click", requestCode);
    var codeVerify = $("secure-code-verify");
    if (codeVerify) codeVerify.addEventListener("click", verifyCode);

    /* Coming back from an email link: if this browser asked for the
       link, the email is saved and sign-in finishes on its own. If the
       link was opened on another device, the saved email is missing, so
       ask for it here instead of failing quietly. */
    try {
      if (fns.isSignInWithEmailLink && fns.isSignInWithEmailLink(window.location.href)) {
        var stored = null;
        try { stored = localStorage.getItem(LINK_KEY); } catch (e) {}
        if (stored) {
          finishLinkSignIn(stored);
        } else {
          var box = $("secure-link-box");
          if (box) box.hidden = false;
          var finish = $("secure-link-finish");
          if (finish) finish.hidden = false;
          show($("secure-link-status"), "You opened a sign-in link on a different device or browser than the one you asked for it on. Type the email you asked the link for, then tap Finish signing in.");
        }
      }
    } catch (e) {}
    return true;
  }

  window.TYDSecureLogin = {
    init: init,
    isValidEmail: isValidEmail,
    isValidCode: isValidCode,
    codeErrorMessage: codeErrorMessage,
    friendlyLinkError: friendlyLinkError,
    actionCodeSettings: actionCodeSettings,
    LINK_KEY: LINK_KEY,
    SITE_URL: SITE_URL
  };
})();
