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

  // নতুন ডিজাইন: মোবাইলে নিচের বারে ৪টি প্রধান ট্যাব + "আরও"; বাকিগুলো "আরও" শিটে (ডেস্কটপ সাইডবারে সব)।
  var PRIMARY = ["posts", "stats", "create", "reports"];
  var SHEET_DESC = {
    ad: "সব বিজ্ঞাপন দেখুন ও পরিচালনা করুন",
    advertise: "বিজ্ঞাপনের অর্ডার ব্যবস্থাপনা",
    users: "রোল পরিবর্তন করে কাউকে অ্যাডমিন বানান বা বাদ দিন",
  };
  var ICON_MORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

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
    var more = document.getElementById("nav-more");
    if (more) more.classList.toggle("active", PRIMARY.indexOf(key) === -1);
    closeMore(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- "আরও" শিট ----------
  function openMore() {
    var sheet = document.getElementById("more-sheet");
    var back = document.getElementById("more-backdrop");
    var list = document.getElementById("more-list");
    var btn = document.getElementById("nav-more");
    if (!sheet || !back || !list) return;

    var rows = TABS.filter(function (t) { return PRIMARY.indexOf(t.key) === -1; }).map(function (t) {
      return sheetRow('data-tab="' + t.key + '"', t.icon, t.label, SHEET_DESC[t.key] || "", "");
    });
    var chat = document.getElementById("ar-chat-nav-btn");
    if (chat) {
      var cb = document.getElementById("ar-chat-total-badge");
      var unread = cb && cb.classList.contains("show") ? cb.textContent : "";
      rows.push(sheetRow('data-chat="1"', ICON_CHAT, "ইউজার চ্যাট", "ইউজারদের মেসেজের উত্তর দিন", unread));
    }
    list.innerHTML = rows.join("");
    list.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("data-chat")) {
          closeMore(false);
          chat.click();
        } else {
          setActiveTab(b.getAttribute("data-tab"));
        }
      });
    });

    back.hidden = false;
    sheet.hidden = false;
    if (btn) btn.setAttribute("aria-expanded", "true");
    var first = list.querySelector("button");
    if (first) first.focus();
  }
  function closeMore(restoreFocus) {
    var sheet = document.getElementById("more-sheet");
    var back = document.getElementById("more-backdrop");
    var btn = document.getElementById("nav-more");
    var wasOpen = sheet && !sheet.hidden;
    if (sheet) sheet.hidden = true;
    if (back) back.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (wasOpen && restoreFocus && btn) btn.focus();
  }
  function sheetRow(attr, icon, label, desc, badge) {
    return (
      '<button type="button" class="sheet-row" ' + attr + ">" +
      '<span class="sheet-ic">' + icon + "</span>" +
      '<span class="sheet-txt"><b>' + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span>" +
      (badge ? '<span class="sheet-badge">' + esc(badge) + "</span>" : "") +
      '<span class="sheet-chev">' + ICON_CHEV + "</span>" +
      "</button>"
    );
  }
  var sheetWired = false;
  function wireSheet() {
    if (sheetWired) return;
    sheetWired = true;
    var back = document.getElementById("more-backdrop");
    if (back) back.addEventListener("click", function () { closeMore(true); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMore(true);
    });
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
    closeMore(false);
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
    closeMore(false);
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
    var byKey = {};
    TABS.forEach(function (t) { byKey[t.key] = t; });
    function navBtn(t) {
      var fab = t.key === "create";
      var secondary = PRIMARY.indexOf(t.key) === -1;
      return (
        '<button type="button" id="nav-' + t.key + '" data-tab="' + t.key + '"' +
        ' class="' + (fab ? "nav-fab" : "") + (secondary ? " nav-secondary" : "") + '">' +
        (fab ? '<span class="fab-circle">' + t.icon + "</span>" : t.icon) +
        '<span class="nav-badge" id="nav-badge-' + t.key + '"></span>' +
        "<span>" + t.label + "</span>" +
        "</button>"
      );
    }
    bottomNav.innerHTML =
      PRIMARY.map(function (k) { return navBtn(byKey[k]); }).join("") +
      '<button type="button" id="nav-more" aria-haspopup="dialog" aria-expanded="false">' + ICON_MORE + "<span>আরও</span></button>" +
      TABS.filter(function (t) { return PRIMARY.indexOf(t.key) === -1; }).map(navBtn).join("");
    bottomNav.querySelectorAll("button[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () { setActiveTab(btn.dataset.tab); });
    });
    document.getElementById("nav-more").addEventListener("click", function () {
      var sheet = document.getElementById("more-sheet");
      if (sheet && !sheet.hidden) closeMore(true);
      else openMore();
    });
    wireSheet();

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
