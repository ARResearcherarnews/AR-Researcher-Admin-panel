/* AR News — Firebase login */
(function () {
  "use strict";
  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("login-error");
  const submit = document.getElementById("login-submit");
  const params = new URLSearchParams(window.location.search);
  const next = params.has("next")
    ? (params.get("next") === "admin.html" ? "admin.html" : "index.html")
    : "admin.html";

  if (!form) {
    window.openLogin = function () {
      window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname.endsWith("admin.html") ? "admin.html" : "index.html")}`;
    };
    return;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("show");
  }
  function friendlyError(error) {
    const messages = {
      "auth/invalid-credential": "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
      "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট নেই।",
      "auth/wrong-password": "পাসওয়ার্ড সঠিক নয়।",
      "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    };
    return messages[error && error.code] || "লগইন করা যায়নি। আবার চেষ্টা করুন।";
  }
  async function isAdmin(user) {
    const snap = await window.rtdb.ref(`users/${user.uid}/role`).once("value");
    return snap.val() === "admin";
  }
  if (!window.auth || !window.rtdb) {
    showError("Firebase সংযোগ পাওয়া যায়নি।");
    return;
  }
  window.auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    if (next !== "admin.html" || await isAdmin(user).catch(() => false)) {
      window.location.replace(next);
    } else {
      await window.auth.signOut();
      showError("এই অ্যাকাউন্টের অ্যাডমিন অনুমতি নেই।");
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.classList.remove("show");
    submit.disabled = true;
    submit.textContent = "লগইন হচ্ছে…";
    try {
      await window.auth.signInWithEmailAndPassword(document.getElementById("email").value.trim(), document.getElementById("password").value);
    } catch (error) {
      showError(friendlyError(error));
      submit.disabled = false;
      submit.textContent = "লগইন করুন";
    }
  });
})();
