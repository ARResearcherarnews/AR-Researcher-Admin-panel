/* login.js — অ্যাডমিন প্যানেলের প্রবেশদ্বার
   এই ফাইলটাই ঠিক করে কে ড্যাশবোর্ড দেখতে পাবে: লগইন ফর্ম, "অনুমতি নেই" স্ক্রিন,
   অথবা আসল ড্যাশবোর্ড (নিচের ন্যাভ বার + খালি প্যানেল)। ড্যাশবোর্ড দেখানোর পর
   "admin:ready" ইভেন্ট পাঠানো হয় — create.js/posts.js/reports.js/users.js/stats.js
   প্রত্যেকে এই ইভেন্ট শুনে নিজের প্যানেলের কনটেন্ট বসায় ও নিজের Firebase লিসেনার চালু করে।
   ছোট কিছু শেয়ার্ড হেল্পার (esc, fmtDate, setActiveTab) window.AdminUtil-এ রাখা আছে,
   যাতে বাকি ফাইলগুলোতে এগুলো বারবার লিখতে না হয়। */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var navActions = document.getElementById("nav-actions");
  var bottomNav = document.getElementById("bottom-nav");

  var TABS = [
    { key: "create", label: "নতুন", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' },
    { key: "ad", label: "বিজ্ঞাপন", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="M3 11v2"/></svg>' },
    { key: "advertise", label: "অর্ডার", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' },
    { key: "posts", label: "পোস্ট", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>' },
    { key: "reports", label: "রিপোর্ট", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
    { key: "users", label: "ইউজার", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { key: "stats", label: "স্ট্যাটস", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
  ];

  // ---------- শেয়ার্ড হেল্পার — বাকি সব js ফাইল window.AdminUtil থেকে এগুলো ব্যবহার করবে ----------
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function fmtDate(v) {
    if (!v) return "";
    try { return new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)); }
    catch (_) { return ""; }
  }
  function setActiveTab(key) {
    TABS.forEach(function (t) {
      var btn = document.getElementById("nav-" + t.key);
      var panel = document.getElementById("panel-" + t.key);
      if (btn) btn.classList.toggle("active", t.key === key);
      if (panel) panel.hidden = t.key !== key;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setNavBadge(key, count) {
    var el = document.getElementById("nav-badge-" + key);
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 99 ? "99+" : String(count);
      el.classList.add("show");
    } else {
      el.classList.remove("show");
    }
  }

  window.AdminUtil = { esc: esc, fmtDate: fmtDate, setActiveTab: setActiveTab, setNavBadge: setNavBadge };

  // ---------- লগইন স্ক্রিন ----------
  function renderLogin() {
    bottomNav.hidden = true;
    navActions.innerHTML = "";
    app.innerHTML =
      '<div class="gate">' +
      "<h2>অ্যাডমিন লগইন</h2>" +
      "<p>শুধুমাত্র অনুমোদিত অ্যাডমিন এখানে পোস্ট প্রকাশ ও ম্যানেজ করতে পারবেন।</p>" +
      '<div class="error" id="login-error"></div>' +
      '<form id="login-form">' +
      '<div class="field"><label for="email">ইমেইল</label><input id="email" type="email" required autocomplete="email"></div>' +
      '<div class="field"><label for="pass">পাসওয়ার্ড</label><input id="pass" type="password" required autocomplete="current-password" minlength="6"></div>' +
      '<button class="btn" type="submit" style="width:100%">লগইন করুন</button>' +
      "</form>" +
      "</div>";

    document.getElementById("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var errEl = document.getElementById("login-error");
      errEl.classList.remove("show");
      window.auth
        .signInWithEmailAndPassword(
          document.getElementById("email").value.trim(),
          document.getElementById("pass").value
        )
        .catch(function () {
          errEl.textContent = "লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড যাচাই করুন।";
          errEl.classList.add("show");
        });
    });
  }

  function renderNoAccess(user) {
    bottomNav.hidden = true;
    navActions.innerHTML = '<button class="btn secondary small" id="logout-btn">লগআউট</button>';
    document.getElementById("logout-btn").onclick = function () { window.auth.signOut(); };
    app.innerHTML =
      '<div class="gate"><h2>অনুমতি নেই</h2><p>' +
      esc(user.email || "") +
      " — এই একাউন্টের অ্যাডমিন অনুমতি নেই। সঠিক একাউন্ট দিয়ে লগইন করুন অথবা কোনো অ্যাডমিনকে আপনাকে অনুমতি দিতে বলুন।</p>" +
      '<button class="btn secondary" id="logout-btn-2" style="margin-top:6px">অন্য একাউন্টে লগইন করুন</button>' +
      "</div>";
    document.getElementById("logout-btn-2").onclick = function () { window.auth.signOut(); };
  }

  // ---------- ড্যাশবোর্ড শেল (নিচের ন্যাভ + খালি প্যানেল) ----------
  function renderDashboard(user) {
    navActions.innerHTML =
      '<span class="who">' + esc(user.displayName || user.email || "") + "</span>" +
      '<button class="btn icon ghost" id="logout-btn" aria-label="লগআউট" title="লগআউট">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
      "</button>";
    document.getElementById("logout-btn").onclick = function () { window.auth.signOut(); };

    app.innerHTML = TABS.map(function (t) {
      return '<section class="panel" id="panel-' + t.key + '" hidden><div class="loading-line">লোড হচ্ছে…</div></section>';
    }).join("");

    bottomNav.hidden = false;
    bottomNav.innerHTML = TABS.map(function (t) {
      return (
        '<button type="button" id="nav-' + t.key + '" data-tab="' + t.key + '">' +
        t.icon +
        '<span class="nav-badge" id="nav-badge-' + t.key + '"></span>' +
        "<span>" + t.label + "</span>" +
        "</button>"
      );
    }).join("");
    bottomNav.querySelectorAll("button[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () { setActiveTab(btn.dataset.tab); });
    });

    setActiveTab("create");
    document.dispatchEvent(new CustomEvent("admin:ready", { detail: { user: user } }));
  }

  // ---------- entry point ----------
  if (!window.auth || !window.rtdb) {
    app.innerHTML = '<div class="loading-line">Firebase সংযোগ পাওয়া যায়নি — config.js ঠিকভাবে লোড হয়েছে কিনা দেখুন।</div>';
    return;
  }

  window.auth.onAuthStateChanged(function (user) {
    if (!user) return renderLogin();
    window.isAdmin(user).then(function (allowed) {
      if (!allowed) return renderNoAccess(user);
      renderDashboard(user);
    });
  });
})();