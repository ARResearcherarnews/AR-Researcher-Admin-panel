/* login.js — অ্যাডমিন প্যানেলের প্রবেশদ্বার (নতুন ডিজাইন)
   index.html-এ লগইন শিট (#login), উপরের বার (#topbar), নিচের নেভিগেশন (#bottom-nav) ও
   মেনু শিট (#more-sheet) আগে থেকেই আছে। এই ফাইল ঠিক করে কে ভেতরে ঢুকবে:
   - কেউ লগইন না থাকলে: লগইন শিট নিচ থেকে উঠে আসে
   - লগইন আছে কিন্তু অ্যাডমিন নয়: "অনুমতি নেই" দেখায়
   - অ্যাডমিন হলে: শিট নেমে যায়, ড্যাশবোর্ড (নিচের নেভ + প্যানেল) দেখায়, তারপর "admin:ready" ইভেন্ট পাঠায়
   প্রতিটা পেজ আলাদা HTML ফাইল (index/stats/create/reports/advertise/ad/users/contact/drafts) — নিজের JS ফাইলের ভেতরেই।
   <body data-page="..."> দেখে এই ফাইল শেল বানায়: উপরের বার, নিচের নেভ (লিংক), মেনু, আর শুধু ওই পেজের #panel-<key>।
   তারপর "admin:ready" পাঠায়, পেজের মডিউল ওই ইভেন্ট শুনে নিজের প্যানেল ভরে। শেয়ার্ড হেল্পার window.AdminUtil-এ আগের মতোই আছে। */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }


  // ---------- হোম/ল্যান্ডিং পেজ (index.html): লগইন ড্রয়ার ----------
  // index.html-এ #fallbackLogin ফর্ম থাকে; এখানে window.auth / window.isAdmin (config.js) ব্যবহার হয়।
  if (document.getElementById("fallbackLogin")) {
    var loginForm = $("fallbackLogin");
    var msg = $("loginMessage");
    var say = function (text, ok) {
      if (!msg) return;
      msg.textContent = text;
      msg.style.color = ok ? "#15803d" : "#dc2626";
    };
    var ERRORS = {
      "auth/invalid-credential": "ইমেইল অথবা পাসওয়ার্ড ভুল।",
      "auth/user-not-found": "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।",
      "auth/wrong-password": "পাসওয়ার্ড সঠিক নয়।",
      "auth/invalid-email": "সঠিক ইমেইল লিখুন।",
      "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে। পরে আবার চেষ্টা করুন।",
      "auth/network-request-failed": "ইন্টারনেট সংযোগ পরীক্ষা করুন।",
    };
    if (!window.auth || !window.rtdb || !window.isAdmin) {
      say("Firebase সংযোগ পাওয়া যায়নি — config.js ঠিকভাবে লোড হয়েছে কিনা দেখুন।");
      return;
    }
    var submitting = false;
    loginForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = $("email").value.trim(), pass = $("password").value;
      if (!email || !pass) { say("ইমেইল ও পাসওয়ার্ড লিখুন।"); return; }
      var btn = loginForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      submitting = true;
      say("লগইন করা হচ্ছে...", true);
      window.auth.signInWithEmailAndPassword(email, pass)
        .then(function (cred) {
          return window.isAdmin(cred.user).then(function (ok) {
            if (ok) { say("লগইন সফল।", true); window.location.href = "post.html"; }
            else return window.auth.signOut().then(function () { say("আপনার অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।"); });
          });
        })
        .catch(function (err) { say(ERRORS[err && err.code] || "লগইন ব্যর্থ হয়েছে। Firebase সেটিংস পরীক্ষা করুন।"); })
        .then(function () { submitting = false; if (btn) btn.disabled = false; });
    });
    // আগে থেকেই অ্যাডমিন লগইন থাকলে সরাসরি পোস্ট পেজে
    window.auth.onAuthStateChanged(function (user) {
      if (!user || submitting) return;
      window.isAdmin(user).then(function (ok) { if (ok && !submitting) window.location.replace("post.html"); });
    });
    return;
  }

  var app = $("app");
  var navActions = $("nav-actions");
  var bottomNav = $("bottom-nav");
  var topbar = $("topbar");
  var loginEl = $("login");

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }

  // নিচের বারে থাকবে: পোস্ট, স্ট্যাটস, নতুন (মাঝের বড় বাটন), রিপোর্ট + "মেনু"। বাকিগুলো মেনুতে।
  var TABS = [
    { key: "posts", label: "পোস্ট", icon: svg('<path d="M4 4h16v16H4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>') },
    { key: "stats", label: "স্ট্যাটস", icon: svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>') },
    { key: "create", label: "নতুন", icon: svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>') },
    { key: "reports", label: "রিপোর্ট", icon: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>') },
    { key: "advertise", label: "অর্ডার", icon: svg('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>') },
    { key: "ad", label: "বিজ্ঞাপন", icon: svg('<path d="m3 11 18-5v12L3 13"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="M3 11v2"/>') },
    { key: "users", label: "ইউজার", icon: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>') },
  ];
  var PAGE_FILE = {
    posts: "post.html", stats: "stats.html", create: "create.html", reports: "reports.html",
    advertise: "advertise.html", ad: "ad.html", users: "user.html", chat: "contact.html", drafts: "drafts.html",
  };
  var PAGE = document.body.getAttribute("data-page") || "posts";
  var PRIMARY = ["posts", "stats", "create", "reports"];
  var SHEET_DESC = {
    advertise: "বিজ্ঞাপনের অর্ডার ও পেমেন্ট যাচাই",
    ad: "ফিডের বিজ্ঞাপন তৈরি ও পরিচালনা",
    users: "রোল পরিবর্তন করে কাউকে অ্যাডমিন বানান বা বাদ দিন",
  };
  var ICON_MORE = svg('<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>');
  var ICON_AI = svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>');
  var ICON_CHAT = svg('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
  var ICON_CHEV = svg('<path d="m9 6 6 6-6 6"/>');
  var ICON_OUT = svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>');

  // ---------- শেয়ার্ড হেল্পার — বাকি সব ফাইল window.AdminUtil থেকে এগুলো ব্যবহার করে ----------
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
    // প্রতিটা পেজ আলাদা ফাইল: অন্য ট্যাব মানে অন্য পেজে যাওয়া
    if (key && key !== PAGE && PAGE_FILE[key]) { window.location.href = PAGE_FILE[key]; return; }
    closeMore(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setNavBadge(key, count) {
    var el = $("nav-badge-" + key);
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 99 ? "99+" : String(count);
      el.classList.add("show");
    } else {
      el.classList.remove("show");
    }
  }
  window.AdminUtil = { esc: esc, fmtDate: fmtDate, setActiveTab: setActiveTab, setNavBadge: setNavBadge };

  // ---------- মেনু শিট ----------
  var sheetTimer = null;
  function sheetRow(attr, icon, label, desc, badge) {
    return (
      '<button type="button" class="m-row" ' + attr + ">" +
      '<span class="m-ic">' + icon + "</span>" +
      '<span class="m-tx"><b>' + label + "</b>" + (desc ? "<small>" + desc + "</small>" : "") + "</span>" +
      (badge ? '<span class="m-bd">' + esc(badge) + "</span>" : "") +
      '<span class="m-ch">' + ICON_CHEV + "</span>" +
      "</button>"
    );
  }
  function openMore() {
    var sheet = $("more-sheet"), back = $("more-backdrop"), list = $("more-list"), btn = $("nav-more");
    if (!sheet || !back || !list) return;

    var rows = TABS.filter(function (t) { return PRIMARY.indexOf(t.key) === -1; }).map(function (t) {
      return sheetRow('data-go="' + PAGE_FILE[t.key] + '"', t.icon, t.label, SHEET_DESC[t.key] || "", "");
    });
    rows.push(sheetRow('data-go="' + PAGE_FILE.chat + '"', ICON_CHAT, "ইউজার চ্যাট", "ইউজারদের মেসেজের উত্তর দিন", ""));
    rows.push(sheetRow('data-go="' + PAGE_FILE.drafts + '"', ICON_AI, "AI ড্রাফট", "স্বয়ংক্রিয় খবরের ড্রাফট রিভিউ ও প্রকাশ", ""));
    list.innerHTML = rows.join("");
    list.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        var go = b.getAttribute("data-go");
        if (go === PAGE_FILE[PAGE] || (PAGE === "chat" && go === "contact.html")) { closeMore(false); return; }
        window.location.href = go;
      });
    });

    clearTimeout(sheetTimer);
    back.hidden = false;
    sheet.hidden = false;
    void sheet.offsetWidth; // ট্রানজিশন চালু করতে
    back.classList.add("show");
    sheet.classList.add("show");
    if (btn) btn.setAttribute("aria-expanded", "true");
    var first = list.querySelector("button");
    if (first) first.focus();
  }
  function closeMore(restoreFocus) {
    var sheet = $("more-sheet"), back = $("more-backdrop"), btn = $("nav-more");
    if (!sheet || !back) return;
    var wasOpen = sheet.classList.contains("show");
    sheet.classList.remove("show");
    back.classList.remove("show");
    if (btn) btn.setAttribute("aria-expanded", "false");
    clearTimeout(sheetTimer);
    sheetTimer = setTimeout(function () {
      if (!sheet.classList.contains("show")) { sheet.hidden = true; back.hidden = true; }
    }, 340);
    if (wasOpen && restoreFocus && btn) btn.focus();
  }
  var sheetWired = false;
  function wireSheet() {
    if (sheetWired) return;
    sheetWired = true;
    $("more-backdrop").addEventListener("click", function () { closeMore(true); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMore(true);
    });
  }

  // ---------- লগইন শিট ----------
  function showLoginSheet() {
    closeMore(false);
    topbar.hidden = true;
    bottomNav.hidden = true;
    $("lg-form-view").hidden = false;
    $("lg-noaccess").hidden = true;
    loginEl.classList.remove("checking"); // শিট নিচ থেকে উঠে আসবে
  }

  function bindLoginForm() {
    var form = $("lg-form");
    var errEl = $("lg-err");
    var btn = $("lg-btn");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      errEl.classList.remove("show");
      btn.disabled = true;
      btn.textContent = "যাচাই হচ্ছে…";
      window.auth
        .signInWithEmailAndPassword($("em").value.trim(), $("pw").value)
        .catch(function () {
          errEl.textContent = "লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড যাচাই করুন।";
          errEl.classList.add("show");
          btn.disabled = false;
          btn.textContent = "লগইন করুন";
        });
      // সফল হলে onAuthStateChanged বাকিটা সামলায়
    });
    $("na-out").addEventListener("click", function () { window.auth.signOut(); });
  }

  function showNoAccess(user) {
    closeMore(false);
    topbar.hidden = true;
    bottomNav.hidden = true;
    $("na-text").textContent = (user.email || "") + " — এই একাউন্টের অ্যাডমিন অনুমতি নেই। সঠিক একাউন্ট দিয়ে লগইন করুন অথবা কোনো অ্যাডমিনকে আপনাকে অনুমতি দিতে বলুন।";
    $("lg-form-view").hidden = true;
    $("lg-noaccess").hidden = false;
    loginEl.classList.remove("checking");
  }

  // ---------- ড্যাশবোর্ড ----------
  function navBtn(t) {
    var fab = t.key === "create";
    return (
      '<a id="nav-' + t.key + '" href="' + PAGE_FILE[t.key] + '"' + (t.key === PAGE ? ' class="active' + (fab ? " nav-fab" : "") + '" aria-current="page"' : (fab ? ' class="nav-fab"' : "")) + ">" +
      (fab ? '<span class="fab-circle">' + t.icon + "</span>" : t.icon) +
      '<span class="nav-badge" id="nav-badge-' + t.key + '"></span>' +
      '<span class="nl">' + t.label + "</span>" +
      "</a>"
    );
  }

  // সব পেজে "অপেক্ষমাণ রিপোর্ট" ব্যাজ (reports.js শুধু রিপোর্ট পেজে চলে, তাই এখানে আলাদা হালকা লিসেনার)
  function watchReportBadge() {
    if (PAGE === "reports") return;
    window.rtdb.ref("reports").on("value", function (snap) {
      var v = snap.val() || {}, n = 0;
      Object.keys(v).forEach(function (k) { if (!v[k].status || v[k].status === "pending") n++; });
      setNavBadge("reports", n);
    }, function () {});
  }

  function showDashboard(user) {
    var links = "";
    if (PAGE !== "chat") links += '<a class="btn icon ghost" href="contact.html" aria-label="ইউজার চ্যাট" title="ইউজার চ্যাট">' + ICON_CHAT + "</a>";
    if (PAGE !== "drafts") links += '<a class="btn icon ghost" href="drafts.html" aria-label="AI ড্রাফট" title="AI ড্রাফট">' + ICON_AI + "</a>";
    navActions.innerHTML =
      links +
      '<span class="who">' + esc(user.displayName || user.email || "") + "</span>" +
      '<button class="btn icon ghost" id="logout-btn" aria-label="লগআউট" title="লগআউট">' + ICON_OUT + "</button>";
    $("logout-btn").onclick = function () { window.auth.signOut(); };

    app.innerHTML = '<section class="panel" id="panel-' + PAGE + '"><div class="loading-line">লোড হচ্ছে…</div></section>';

    var byKey = {};
    TABS.forEach(function (t) { byKey[t.key] = t; });
    bottomNav.innerHTML =
      PRIMARY.map(function (k) { return navBtn(byKey[k]); }).join("") +
      '<button type="button" id="nav-more" aria-haspopup="dialog" aria-expanded="false">' + ICON_MORE + '<span class="nl">মেনু</span></button>';
    $("nav-more").addEventListener("click", function () {
      if ($("more-sheet").classList.contains("show")) closeMore(true);
      else openMore();
    });
    if (PRIMARY.indexOf(PAGE) === -1) $("nav-more").classList.add("active");
    wireSheet();

    topbar.hidden = false;
    bottomNav.hidden = false;
    document.body.classList.add("authed");
    watchReportBadge();

    // লগইন শিট সরানো: ফর্ম থেকে এলে শিট নিচে নামে, আগে থেকে লগইন থাকলে হালকা মিলিয়ে যায়
    if (loginEl.classList.contains("checking")) {
      loginEl.classList.add("gone");
    } else {
      loginEl.classList.add("leaving");
      setTimeout(function () { loginEl.classList.add("gone"); }, 450);
    }

    // posts → create: এডিটের তথ্য sessionStorage দিয়ে পাঠানো (আলাদা পেজ বলে)
    if (PAGE === "posts") {
      document.addEventListener("admin:edit-post", function (e) {
        try { sessionStorage.setItem("ar_edit", JSON.stringify(e.detail)); } catch (_) {}
        window.location.href = PAGE_FILE.create;
      });
    }

    document.dispatchEvent(new CustomEvent("admin:ready", { detail: { user: user } }));

    if (PAGE === "create") {
      var edit = null, pre = null;
      try {
        edit = JSON.parse(sessionStorage.getItem("ar_edit") || "null");
        pre = JSON.parse(sessionStorage.getItem("ar_prefill") || "null");
        sessionStorage.removeItem("ar_edit"); sessionStorage.removeItem("ar_prefill");
      } catch (_) {}
      if (edit && edit.id) document.dispatchEvent(new CustomEvent("admin:edit-post", { detail: edit }));
      else if (pre) setTimeout(function () {
        if ($("p-title")) $("p-title").value = pre.title || "";
        if ($("p-category")) $("p-category").value = pre.category || "";
      }, 120);
    }

    // চ্যাট / AI ড্রাফট: নিজের পেজ খুললেই ফুল-স্ক্রিন প্যানেল খোলা, বন্ধ করলে হোমে ফেরা
    var ov = { chat: ["ar-chat-nav-btn", "ar-chat-overlay"], drafts: ["ar-drafts-nav-btn", "ar-drafts-overlay"] }[PAGE];
    if (ov) {
      var tries = 0;
      var timer = setInterval(function () {
        var btn = $(ov[0]), el = $(ov[1]);
        if (btn && (!el || el.hidden)) btn.click();
        el = $(ov[1]);
        if (btn && el && !el.hidden) {
          clearInterval(timer);
          new MutationObserver(function () {
            if (el.hidden) window.location.href = PAGE_FILE.posts;
          }).observe(el, { attributes: true, attributeFilter: ["hidden"] });
        } else if (++tries > 40) clearInterval(timer);
      }, 150);
    }
  }

  // ---------- entry point ----------
  if (!window.auth || !window.rtdb) {
    loginEl.classList.remove("checking");
    $("lg-err").textContent = "Firebase সংযোগ পাওয়া যায়নি — config.js ঠিকভাবে লোড হয়েছে কিনা দেখুন।";
    $("lg-err").classList.add("show");
    return;
  }

  bindLoginForm();

  var wasLoggedIn = false;
  var dashboardShown = false;
  window.auth.onAuthStateChanged(function (user) {
    if (!user) {
      // লগআউটের পর পেজ নতুন করে লোড — সব লিসেনার পরিষ্কার থাকে
      if (wasLoggedIn) { window.location.reload(); return; }
      showLoginSheet();
      return;
    }
    wasLoggedIn = true;
    window.isAdmin(user).then(function (allowed) {
      if (!allowed) { showNoAccess(user); return; }
      if (dashboardShown) return;
      dashboardShown = true;
      showDashboard(user);
    });
  });
})();
