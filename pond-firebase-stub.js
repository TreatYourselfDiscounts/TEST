/* pond-firebase-stub.js — STAGING PREVIEW ONLY.
 *
 * The staging copy must never talk to the live Firebase project
 * (treatyourselfdiscounts-881a9): no auth, no Firestore reads or writes.
 * Every firebasejs CDN import in the staging tree is rewritten to this
 * local module, so all Firebase calls resolve against these harmless
 * stubs instead of Google's SDK:
 *  - onAuthStateChanged always reports signed-out (null user).
 *  - sign-in / sign-up / link calls reject with a "preview" error.
 *  - Firestore reads resolve as "does not exist / empty"; writes
 *    resolve without doing anything.
 *  - Storage uploads/downloads reject; nothing leaves the browser.
 * Local-only features (localStorage saves, filters, spin) keep working.
 */
var _emptySnap = {
  exists: function () { return false; },
  data: function () { return {}; },
  get: function () { return undefined; },
  id: "preview",
};
var _emptyQuerySnap = {
  docs: [],
  empty: true,
  size: 0,
  forEach: function () {},
};
var _fakeRef = { id: "preview", path: "preview" };
var _noopUnsub = function () {};

function _previewError() {
  return new Error("Sign-in is disabled in this preview copy of the Pond.");
}

export function initializeApp() { return {}; }
export function getApps() { return []; }
export function getApp() { return {}; }
export function getAuth() { return { currentUser: null }; }
export function onAuthStateChanged(_auth, cb) {
  if (typeof cb === "function") { try { setTimeout(function () { cb(null); }, 0); } catch (e) {} }
  return _noopUnsub;
}
export function onIdTokenChanged(_auth, cb) {
  if (typeof cb === "function") { try { setTimeout(function () { cb(null); }, 0); } catch (e) {} }
  return _noopUnsub;
}
export function signInWithEmailAndPassword() { return Promise.reject(_previewError()); }
export function createUserWithEmailAndPassword() { return Promise.reject(_previewError()); }
export function signInWithPopup() { return Promise.reject(_previewError()); }
export function signInWithEmailLink() { return Promise.reject(_previewError()); }
export function signInWithCustomToken() { return Promise.reject(_previewError()); }
export function isSignInWithEmailLink() { return false; }
export function sendSignInLinkToEmail() { return Promise.reject(_previewError()); }
export function sendPasswordResetEmail() { return Promise.reject(_previewError()); }
export function signOut() { return Promise.resolve(); }
export function deleteUser() { return Promise.reject(_previewError()); }
export function reauthenticateWithCredential() { return Promise.reject(_previewError()); }
export function reauthenticateWithPopup() { return Promise.reject(_previewError()); }
export function getRedirectResult() { return Promise.resolve(null); }
export function GoogleAuthProvider() {}
export var EmailAuthProvider = { credential: function () { return {}; } };

export function getFirestore() { return {}; }
export function doc() { return _fakeRef; }
export function collection() { return _fakeRef; }
export function getDoc() { return Promise.resolve(_emptySnap); }
export function getDocs() { return Promise.resolve(_emptyQuerySnap); }
export function setDoc() { return Promise.resolve(); }
export function updateDoc() { return Promise.resolve(); }
export function deleteDoc() { return Promise.resolve(); }
export function addDoc() { return Promise.resolve(_fakeRef); }
export function query() { return _fakeRef; }
export function where() { return {}; }
export function orderBy() { return {}; }
export function limit() { return {}; }
export function onSnapshot(_ref, cb) {
  if (typeof cb === "function") {
    try { setTimeout(function () { cb(_emptySnap); }, 0); } catch (e) {}
  } else if (typeof arguments[1] === "object" && arguments[1] && typeof arguments[1].next === "function") {
    try { setTimeout(function () { arguments[1].next(_emptySnap); }, 0); } catch (e) {}
  }
  return _noopUnsub;
}
export function writeBatch() {
  return { set: function () {}, update: function () {}, delete: function () {}, commit: function () { return Promise.resolve(); } };
}
export function serverTimestamp() { return {}; }
export function arrayUnion() { return {}; }
export function arrayRemove() { return {}; }
export function deleteField() { return {}; }

export function getStorage() { return {}; }
export function ref() { return _fakeRef; }
export function uploadBytes() { return Promise.reject(new Error("Uploads are disabled in this preview copy.")); }
export function getDownloadURL() { return Promise.reject(new Error("Downloads are disabled in this preview copy.")); }
export function deleteObject() { return Promise.resolve(); }
