/* advertise.js — বিজ্ঞাপনদাতাদের অর্ডার ব্যবস্থাপনা (panel-advertise)
   আগে এটা আলাদা admin-advertise.html পেজ ছিল। এখন অন্য ফাইলগুলোর (posts.js, reports.js …) মতো
   index.html-এর ভেতরের একটা ট্যাব। লগইন যাচাই login.js-ই করে, তাই এখানে আলাদা লগইন নেই।

   কাজ:
   - প্যাকেজ সেটিংস (adPackages)
   - পেমেন্ট নম্বর (adSettings/payment)
   - বিজ্ঞাপন অর্ডার তালিকা (advertisements): পেমেন্ট যাচাই / ফিডে চালু / বন্ধ / বাতিল / ডিলিট
   - ফিডে চালু করলে "ads" নোডেও লেখা হয় (ad.js ও feed.html সেখান থেকে পড়ে) */

(function () {
  "use strict";

  var DAY = 24 * 60 * 60 * 1000;

  var allAds = {};
  var pendingStartId = null;
  var adsRef = null;
  var adsHandler = null;
  var stylesAdded = false;

  /* =========================================================
     Helpers
  ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toLocalInput(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    function pad(n) { return String(n).padStart(2, "0"); }
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
    );
  }

  function fromLocalInput(val) {
    if (!val) return null;
    var t = new Date(val).getTime();
    return isNaN(t) ? null : t;
  }

  /* =========================================================
     Styles — সব রুল #panel-advertise / .adv-* এর ভেতরে সীমাবদ্ধ
     রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে
  ========================================================= */

  function ensureStyles() {
    if (stylesAdded || document.getElementById("ar-news-advertise-styles")) return;
    stylesAdded = true;

    var style = document.createElement("style");
    style.id = "ar-news-advertise-styles";

    style.textContent = `

      #panel-advertise {
        max-width: none;
        margin-bottom: 0;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      @media (min-width: 900px) {
        #panel-advertise { max-width: 1180px; }
      }

      /* ---------- পেজ হেডার ---------- */
      #panel-advertise .adv-head { margin-bottom: 14px; }

      #panel-advertise .adv-head h2 {
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 26px;
        line-height: 1.2;
        font-weight: 400;
      }

      #panel-advertise .adv-head .sub {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 13px;
      }

      /* ---------- লেআউট: মোবাইলে এক কলাম (তালিকা আগে), বড় স্ক্রিনে তালিকা + সেটিংস ---------- */
      #panel-advertise .adv-wrap {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
        align-items: start;
      }

      @media (min-width: 1240px) {
        #panel-advertise .adv-wrap {
          grid-template-columns: minmax(0, 1fr) 330px;
        }
      }

      #panel-advertise .adv-settings {
        display: grid;
        gap: 14px;
        min-width: 0;
      }

      #panel-advertise .adv-box {
        min-width: 0;
        padding: 16px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: var(--shadow);
      }

      #panel-advertise .adv-h {
        margin: 0 0 12px;
        font-family: var(--font-display, Georgia, serif);
        font-size: 19px;
        line-height: 1.3;
        font-weight: 400;
      }

      /* ---------- ফর্ম ---------- */
      #panel-advertise .field { margin-bottom: 12px; }

      #panel-advertise .field input,
      #panel-advertise .field select,
      #panel-advertise .field textarea {
        font-size: 16px; /* iOS জুম ঠেকায় */
      }

      @media (min-width: 600px) {
        #panel-advertise .field input,
        #panel-advertise .field select,
        #panel-advertise .field textarea { font-size: 14.5px; }
      }

      #panel-advertise .field textarea { min-height: 68px; }

      #panel-advertise .adv-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      #panel-advertise .adv-check {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0 14px;
        font-size: 13.5px;
        font-weight: 600;
      }

      #panel-advertise .adv-check input {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        accent-color: var(--brand);
      }

      #panel-advertise .adv-block { width: 100%; }

      /* ---------- তালিকার হেডার + ফিল্টার ---------- */
      #panel-advertise .adv-list-head {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 14px;
      }

      #panel-advertise .adv-list-head .adv-h { margin: 0; }

      @media (min-width: 520px) {
        #panel-advertise .adv-list-head {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
      }

      #panel-advertise .adv-filter {
        width: 100%;
        min-height: 42px;
        padding: 8px 12px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--surface);
        color: var(--ink);
        font: inherit;
        font-size: 14.5px;
      }

      @media (min-width: 520px) {
        #panel-advertise .adv-filter { width: auto; min-width: 180px; }
      }

      #panel-advertise .adv-filter:focus {
        outline: none;
        border-color: var(--brand);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent);
      }

      /* ---------- অর্ডার কার্ড ---------- */
      #panel-advertise .adv-list { display: grid; gap: 10px; }

      #panel-advertise .adv-card {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        column-gap: 13px;
        min-width: 0;
        padding: 12px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 14px;
      }

      #panel-advertise .adv-thumb {
        display: block;
        width: 96px;
        height: 64px;
        object-fit: cover;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: var(--surface);
      }

      #panel-advertise .adv-main { min-width: 0; }

      #panel-advertise .adv-title {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--ink);
        font-size: 15px;
        line-height: 1.4;
        font-weight: 600;
        text-decoration: none;
        overflow-wrap: anywhere;
      }

      #panel-advertise .adv-title:hover { color: var(--brand); }

      #panel-advertise .adv-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
      }

      #panel-advertise .adv-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.5;
        white-space: nowrap;
      }

      #panel-advertise .adv-b-pending  { background: var(--warn-soft); color: var(--warn); }
      #panel-advertise .adv-b-verified,
      #panel-advertise .adv-b-approved { background: var(--brand-soft); color: var(--brand-ink); }
      #panel-advertise .adv-b-running  { background: color-mix(in srgb, var(--ok) 15%, var(--surface)); color: var(--ok); }
      #panel-advertise .adv-b-ended    { background: var(--line); color: var(--muted); }
      #panel-advertise .adv-b-rejected { background: var(--danger-soft); color: var(--danger); }
      #panel-advertise .adv-b-pkg      { background: transparent; border: 1px solid var(--line); color: var(--muted); }

      #panel-advertise .adv-meta {
        margin-top: 8px;
        color: var(--muted);
        font-size: 12.5px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      #panel-advertise .adv-meta strong { color: var(--ink); font-weight: 600; }

      #panel-advertise .adv-meta code {
        padding: 1px 5px;
        border-radius: 4px;
        background: var(--line);
        color: var(--ink);
        font-size: 11.5px;
        word-break: break-all;
      }

      /* ---------- বাটন সারি ---------- */
      #panel-advertise .adv-actions {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }

      #panel-advertise .adv-actions .btn {
        flex: 1 1 120px;
        min-height: 38px;
      }

      #panel-advertise .adv-actions .adv-btn-warn {
        background: var(--warn-soft);
        color: var(--warn);
      }

      @media (min-width: 700px) {
        #panel-advertise .adv-actions .btn { flex: 0 0 auto; padding-left: 16px; padding-right: 16px; }
      }

      #panel-advertise .adv-empty {
        padding: 30px 12px;
        text-align: center;
        color: var(--muted);
        font-size: 14px;
      }

      /* ---------- "বিজ্ঞাপন শুরু করুন" মোডাল (মোবাইলে নিচ থেকে ওঠা শিট) ---------- */
      .adv-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 80;
        display: none;
        align-items: flex-end;
        justify-content: center;
        background: rgba(8, 18, 17, .5);
      }

      .adv-modal-overlay.open { display: flex; }

      .adv-modal {
        width: 100%;
        max-width: 440px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 22px 18px calc(22px + var(--safe-b, 0px));
        background: var(--surface);
        color: var(--ink);
        border-radius: 18px 18px 0 0;
        box-shadow: 0 -8px 40px rgba(0, 0, 0, .18);
      }

      @media (min-width: 520px) {
        .adv-modal-overlay { align-items: center; padding: 20px; }
        .adv-modal { padding: 24px; border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, .22); }
      }

      .adv-modal h3 {
        margin: 0 0 4px;
        font-family: var(--font-display, Georgia, serif);
        font-size: 20px;
        font-weight: 400;
      }

      .adv-modal .sub { margin: 0 0 16px; color: var(--muted); font-size: 13px; }

      .adv-modal-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 18px;
      }

    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     Panel HTML
  ========================================================= */

  function panelShellHtml() {
    return (
      '<div class="adv-head">' +
        "<h2>বিজ্ঞাপন ব্যবস্থাপনা</h2>" +
        '<p class="sub">বিজ্ঞাপনদাতাদের অর্ডার, পেমেন্ট যাচাই ও প্যাকেজ সেটিংস।</p>' +
      "</div>" +

      '<div class="adv-wrap">' +

        /* ---- অর্ডার তালিকা ---- */
        '<section class="adv-box">' +
          '<div class="adv-list-head">' +
            '<h3 class="adv-h">বিজ্ঞাপন তালিকা</h3>' +
            '<select id="adv-filter" class="adv-filter" aria-label="স্ট্যাটাস ফিল্টার">' +
              '<option value="All">সব বিজ্ঞাপন</option>' +
              '<option value="pending">Pending</option>' +
              '<option value="verified">Payment Verified</option>' +
              '<option value="approved">Approved</option>' +
              '<option value="running">Running</option>' +
              '<option value="ended">Ended</option>' +
              '<option value="rejected">Rejected</option>' +
            "</select>" +
          "</div>" +
          '<div class="adv-list" id="adv-list"><div class="adv-empty">ডেটা লোড হচ্ছে…</div></div>' +
        "</section>" +

        /* ---- সেটিংস ---- */
        '<aside class="adv-settings">' +

          '<div class="adv-box">' +
            '<h3 class="adv-h">প্যাকেজ সেটিংস</h3>' +
            '<form id="adv-pkg-form">' +
              '<div class="field">' +
                '<label for="adv-pkg-select">প্যাকেজ সিলেক্ট</label>' +
                '<select id="adv-pkg-select">' +
                  '<option value="basic">Basic</option>' +
                  '<option value="standard">Standard</option>' +
                  '<option value="premium">Premium</option>' +
                "</select>" +
              "</div>" +
              '<div class="field">' +
                '<label for="adv-pkg-name">প্যাকেজের নাম</label>' +
                '<input type="text" id="adv-pkg-name" required>' +
              "</div>" +
              '<div class="adv-row">' +
                '<div class="field">' +
                  '<label for="adv-pkg-duration">মেয়াদ (দিন)</label>' +
                  '<input type="number" id="adv-pkg-duration" min="1" required inputmode="numeric">' +
                "</div>" +
                '<div class="field">' +
                  '<label for="adv-pkg-price">মূল্য (৳)</label>' +
                  '<input type="number" id="adv-pkg-price" min="0" required inputmode="numeric">' +
                "</div>" +
              "</div>" +
              '<div class="field">' +
                '<label for="adv-pkg-desc">বিবরণ</label>' +
                '<textarea id="adv-pkg-desc" rows="2"></textarea>' +
              "</div>" +
              '<label class="adv-check">' +
                '<input type="checkbox" id="adv-pkg-active" checked>' +
                "Active (পাবলিক ফরমে দেখাবে)" +
              "</label>" +
              '<button type="submit" class="btn adv-block">প্যাকেজ সেভ করুন</button>' +
            "</form>" +
          "</div>" +

          '<div class="adv-box">' +
            '<h3 class="adv-h">পেমেন্ট নম্বর</h3>' +
            '<form id="adv-pay-form">' +
              '<div class="field">' +
                '<label for="adv-bkash">bKash নম্বর</label>' +
                '<input type="text" id="adv-bkash" required placeholder="01XXXXXXXXX" inputmode="tel">' +
              "</div>" +
              '<div class="field">' +
                '<label for="adv-nagad">Nagad নম্বর</label>' +
                '<input type="text" id="adv-nagad" required placeholder="01XXXXXXXXX" inputmode="tel">' +
              "</div>" +
              '<button type="submit" class="btn adv-block">নম্বর আপডেট করুন</button>' +
            "</form>" +
          "</div>" +

        "</aside>" +
      "</div>"
    );
  }

  function modalHtml() {
    return (
      '<div class="adv-modal">' +
        "<h3>বিজ্ঞাপন শুরু করুন</h3>" +
        '<p class="sub" id="adv-start-sub">মেয়াদ অনুযায়ী শেষ তারিখ হিসাব করা হবে।</p>' +
        '<div class="field">' +
          '<label for="adv-start-date">শুরুর তারিখ</label>' +
          '<input type="datetime-local" id="adv-start-date">' +
        "</div>" +
        '<div class="field">' +
          '<label for="adv-end-date">শেষের তারিখ</label>' +
          '<input type="datetime-local" id="adv-end-date">' +
        "</div>" +
        '<div class="adv-modal-actions">' +
          '<button type="button" class="btn ghost" id="adv-start-cancel">বাতিল</button>' +
          '<button type="button" class="btn" id="adv-start-confirm">শুরু করুন</button>' +
        "</div>" +
      "</div>"
    );
  }

  /* =========================================================
     প্যাকেজ ও পেমেন্ট সেটিংস
  ========================================================= */

  function getDefaults(id) {
    if (id === "basic") return { name: "Basic", duration: 7, price: 500, description: "৭ দিনের বেসিক প্যাকেজ", status: "active" };
    if (id === "standard") return { name: "Standard", duration: 15, price: 1200, description: "১৫ দিনের স্ট্যান্ডার্ড", status: "active" };
    if (id === "premium") return { name: "Premium", duration: 30, price: 2200, description: "৩০ দিনের প্রিমিয়াম", status: "active" };
    return { name: id, duration: 7, price: 0, description: "", status: "active" };
  }

  function loadPackageForm() {
    var pId = $("adv-pkg-select").value;
    window.rtdb.ref("adPackages/" + pId).once("value", function (snap) {
      var data = snap.val() || getDefaults(pId);
      if (!$("adv-pkg-name")) return;
      $("adv-pkg-name").value = data.name || pId;
      $("adv-pkg-duration").value = data.duration || 7;
      $("adv-pkg-price").value = data.price || 0;
      $("adv-pkg-desc").value = data.description || "";
      $("adv-pkg-active").checked = data.status === "active";
    });
  }

  function savePackage(e) {
    e.preventDefault();
    var pId = $("adv-pkg-select").value;
    window.rtdb.ref("adPackages/" + pId).update({
      name: $("adv-pkg-name").value.trim(),
      duration: Number($("adv-pkg-duration").value),
      price: Number($("adv-pkg-price").value),
      description: $("adv-pkg-desc").value.trim(),
      status: $("adv-pkg-active").checked ? "active" : "inactive",
    }).then(function () { alert("প্যাকেজ সংরক্ষিত হয়েছে।"); });
  }

  function loadPaymentSettings() {
    window.rtdb.ref("adSettings/payment").once("value", function (snap) {
      var data = snap.val() || {};
      if (!$("adv-bkash")) return;
      $("adv-bkash").value = data.bkashNumber || "";
      $("adv-nagad").value = data.nagadNumber || "";
    });
  }

  function savePayment(e) {
    e.preventDefault();
    window.rtdb.ref("adSettings/payment").update({
      bkashNumber: $("adv-bkash").value.trim(),
      nagadNumber: $("adv-nagad").value.trim(),
    }).then(function () { alert("পেমেন্ট তথ্য আপডেট হয়েছে।"); });
  }

  /* =========================================================
     অর্ডার তালিকা
  ========================================================= */

  function listenToAdvertisements() {
    if (adsRef && adsHandler) adsRef.off("value", adsHandler);

    adsRef = window.rtdb.ref("advertisements");
    adsHandler = function (snap) {
      allAds = snap.val() || {};
      renderAdsList();
    };
    adsRef.on("value", adsHandler);
  }

  function computeStatus(ad) {
    var s = ad.status || "pending";
    if (s === "running" && ad.endDate && Date.now() > ad.endDate) s = "ended";
    return s;
  }

  function badgeClass(status) {
    var known = { pending: 1, verified: 1, approved: 1, running: 1, ended: 1, rejected: 1 };
    return "adv-b-" + (known[status] ? status : "ended");
  }

  function actionBtn(act, cls, label) {
    return '<button type="button" class="btn small ' + cls + '" data-act="' + act + '">' + label + "</button>";
  }

  function renderAdsList() {
    var list = $("adv-list");
    if (!list) return;

    list.innerHTML = "";

    var filter = $("adv-filter").value;
    var fmt = window.formatDate || function (v) { return String(v); };
    var count = 0;

    var ids = Object.keys(allAds).sort(function (a, b) {
      return (allAds[b].createdAt || 0) - (allAds[a].createdAt || 0);
    });

    ids.forEach(function (adId) {
      var ad = allAds[adId] || {};
      var status = computeStatus(ad);

      if (filter !== "All" && status !== filter && ad.paymentStatus !== filter) return;
      count++;

      var actions = [];

      if (ad.paymentStatus === "pending") {
        actions.push(actionBtn("verify", "", "পেমেন্ট যাচাই"));
      }

      /* approved / verified / ended — আবার ফিডে চালু করা যায় */
      if (
        status === "approved" ||
        status === "ended" ||
        (ad.paymentStatus === "verified" && status !== "running" && status !== "rejected")
      ) {
        actions.push(actionBtn("start", status === "ended" ? "secondary" : "", status === "ended" ? "আবার চালু করুন" : "ফিডে চালু করুন"));
      }

      if (status === "running") {
        actions.push(actionBtn("end", "adv-btn-warn", "বন্ধ করুন"));
      }

      if (status !== "rejected" && status !== "ended") {
        actions.push(actionBtn("reject", "danger", "বাতিল"));
      }

      /* সব স্ট্যাটাসেই সম্পূর্ণ মুছে ফেলা যায় */
      actions.push(actionBtn("delete", "danger", "ডিলিট"));

      var card = document.createElement("article");
      card.className = "adv-card";

      card.innerHTML =
        (ad.imageUrl
          ? '<img src="' + esc(ad.imageUrl) + '" class="adv-thumb" alt="" onerror="this.style.display=\'none\'">'
          : '<div class="adv-thumb"></div>') +

        '<div class="adv-main">' +
          '<a class="adv-title" href="' + esc(ad.link || "#") + '" target="_blank" rel="noopener">' + esc(ad.title) + "</a>" +
          '<div class="adv-badges">' +
            '<span class="adv-badge ' + badgeClass(status) + '">' + esc(status) + "</span>" +
            '<span class="adv-badge adv-b-pkg">' + esc(ad.packageName) + " · ৳" + Number(ad.packagePrice || 0).toLocaleString("bn-BD") + "</span>" +
          "</div>" +
          '<div class="adv-meta">' +
            "<strong>" + esc(ad.advertiserName) + "</strong> · " + esc(ad.companyName) + "<br>" +
            esc(ad.phone) + " · " + esc(ad.email) + "<br>" +
            esc(ad.paymentMethod) + " · TrxID: <code>" + esc(ad.transactionId) + "</code>" +
          "</div>" +
          '<div class="adv-meta">' +
            "জমা: " + fmt(ad.createdAt) +
            (ad.startDate ? "<br>শুরু: " + fmt(ad.startDate) : "") +
            (ad.endDate ? "<br>শেষ: " + fmt(ad.endDate) : "") +
          "</div>" +
        "</div>" +

        '<div class="adv-actions" data-id="' + esc(adId) + '">' +
          actions.join("") +
        "</div>";

      list.appendChild(card);
    });

    if (!count) {
      list.innerHTML = '<div class="adv-empty">কোনো মিল থাকা বিজ্ঞাপন নেই।</div>';
    }
  }

  /* =========================================================
     ফিডে প্রকাশ / সরানো / মোছা
  ========================================================= */

  /* feed.html ও admin panel (ad.js) দুটোই "ads" নোড থেকে পড়ে —
     ad.js-এর স্কিমার সাথে মিলিয়ে authorId/createdAt সহ লিখি */
  function publishToFeed(adId, ad, startDate, endDate) {
    var user = window.auth.currentUser;
    var now = Date.now();
    var payload = {
      title: (ad.title || "").trim() || "বিজ্ঞাপন",
      description: (ad.description || "").trim(),
      imageUrl: ad.imageUrl || "",
      link: ad.link || "",
      buttonLabel: (ad.buttonLabel || "ভিজিট").trim() || "ভিজিট",
      status: "active",
      authorId: user ? user.uid : "admin",
      authorName: (user && (user.displayName || user.email)) || "এডমিন",
      sourceAdId: adId,
      startDate: startDate || null,
      endDate: endDate || null,
      createdAt: ad.feedCreatedAt || now,
      updatedAt: now,
    };
    return window.rtdb.ref("ads/" + adId).set(payload);
  }

  function unpublishFromFeed(adId) {
    return window.rtdb.ref("ads/" + adId).update({
      status: "inactive",
      updatedAt: Date.now(),
    }).catch(function () { /* ads নোডে না থাকলে ignore */ });
  }

  /* সম্পূর্ণ মুছে ফেলা — advertisements + ads দুই জায়গা থেকে */
  function deleteAdCompletely(adId) {
    return Promise.all([
      window.rtdb.ref("advertisements/" + adId).remove(),
      window.rtdb.ref("ads/" + adId).remove().catch(function () {}),
    ]);
  }

  /* =========================================================
     বাটনের ক্লিক (একটাই ইভেন্ট, তালিকা নতুন করে আঁকলেও কাজ করে)
  ========================================================= */

  function onListClick(e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;

    var box = btn.closest(".adv-actions");
    if (!box) return;

    var id = box.dataset.id;
    var act = btn.dataset.act;

    if (act === "verify") {
      if (!confirm("পেমেন্ট যাচাই করে অনুমোদন করবেন?")) return;
      window.rtdb.ref("advertisements/" + id).update({
        paymentStatus: "verified",
        status: "approved",
        updatedAt: Date.now(),
      });
      return;
    }

    if (act === "reject") {
      if (!confirm("এই বিজ্ঞাপন বাতিল করবেন?")) return;
      window.rtdb.ref("advertisements/" + id).update({
        status: "rejected",
        updatedAt: Date.now(),
      }).then(function () { return unpublishFromFeed(id); });
      return;
    }

    if (act === "start") {
      openStartModal(id);
      return;
    }

    if (act === "end") {
      if (!confirm("বিজ্ঞাপন এখনই শেষ করবেন? ফিড থেকে সরে যাবে।")) return;
      window.rtdb.ref("advertisements/" + id).update({
        status: "ended",
        endDate: Date.now(),
        updatedAt: Date.now(),
      }).then(function () { return unpublishFromFeed(id); });
      return;
    }

    if (act === "delete") {
      if (!confirm("এই বিজ্ঞাপন সম্পূর্ণ মুছে ফেলবেন?\n\nadvertisements ও ফিড (ads) — দুই জায়গা থেকেই চিরতরে মুছে যাবে। ফিরিয়ে আনা যাবে না।")) return;
      btn.disabled = true;
      deleteAdCompletely(id).catch(function (err) {
        alert("মুছে ফেলা যায়নি: " + (err.message || err));
        btn.disabled = false;
      });
    }
  }

  /* =========================================================
     "বিজ্ঞাপন শুরু করুন" মোডাল
  ========================================================= */

  function openStartModal(adId) {
    pendingStartId = adId;
    var ad = allAds[adId] || {};
    var durationDays = Number(ad.duration) || 7;
    var now = Date.now();
    var end = now + durationDays * DAY;

    $("adv-start-sub").textContent = "প্যাকেজ: " + (ad.packageName || "—") + " · " + durationDays + " দিন";
    $("adv-start-date").value = toLocalInput(now);
    $("adv-end-date").value = toLocalInput(end);
    $("adv-start-modal").classList.add("open");
  }

  function closeStartModal() {
    var modal = $("adv-start-modal");
    if (modal) modal.classList.remove("open");
    pendingStartId = null;
  }

  async function confirmStart() {
    if (!pendingStartId) return;

    var id = pendingStartId;
    var ad = allAds[id] || {};
    var startDate = fromLocalInput($("adv-start-date").value) || Date.now();
    var endDate =
      fromLocalInput($("adv-end-date").value) ||
      startDate + (Number(ad.duration) || 7) * DAY;

    var confirmBtn = $("adv-start-confirm");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "প্রকাশ হচ্ছে…";

    try {
      await window.rtdb.ref("advertisements/" + id).update({
        status: "running",
        paymentStatus: ad.paymentStatus === "pending" ? "verified" : (ad.paymentStatus || "verified"),
        startDate: startDate,
        endDate: endDate,
        updatedAt: Date.now(),
      });
      await publishToFeed(id, ad, startDate, endDate);
      closeStartModal();
      alert("✓ বিজ্ঞাপন ফিডে চালু হয়েছে।\n\nfeed.html ও অ্যাডমিন প্যানেলের «বিজ্ঞাপন» ট্যাবে এখন দেখা যাবে।");
    } catch (err) {
      console.error("Start/publish error:", err);
      alert("ত্রুটি: " + (err.message || err) + "\n\nFirebase Rules আপডেট করেছেন কি? ads নোডে লেখার অনুমতি অ্যাডমিনের থাকতে হবে।");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "শুরু করুন";
    }
  }

  /* =========================================================
     Admin Ready — login.js লগইন যাচাই শেষে এই ইভেন্ট পাঠায়
  ========================================================= */

  document.addEventListener("admin:ready", function () {
    ensureStyles();

    var panel = $("panel-advertise");
    if (!panel) return;

    panel.innerHTML = panelShellHtml();

    /* মোডাল <body>-তে, যাতে পুরো স্ক্রিন ঢাকতে পারে। আগেরটা থাকলে সরিয়ে নতুন বসাই */
    var oldModal = $("adv-start-modal");
    if (oldModal) oldModal.remove();

    var modal = document.createElement("div");
    modal.id = "adv-start-modal";
    modal.className = "adv-modal-overlay";
    modal.innerHTML = modalHtml();
    document.body.appendChild(modal);

    pendingStartId = null;

    /* ইভেন্ট */
    $("adv-pkg-select").addEventListener("change", loadPackageForm);
    $("adv-pkg-form").addEventListener("submit", savePackage);
    $("adv-pay-form").addEventListener("submit", savePayment);
    $("adv-filter").addEventListener("change", renderAdsList);
    $("adv-list").addEventListener("click", onListClick);
    $("adv-start-cancel").addEventListener("click", closeStartModal);
    $("adv-start-confirm").addEventListener("click", confirmStart);

    /* হেডারের পুরনো বিজ্ঞাপন-আইকন (.nav-ad-btn) আর লাগে না — বিজ্ঞাপন অর্ডারের কাজ "অর্ডার" ট্যাবেই হয়।
       index.html থেকে ওটা সরানো হয়েছে; তবু পুরনো/ক্যাশ হওয়া index.html থাকলেও যেন আইকনটা না দেখায়, তাই এখানেও সরিয়ে দিই। */
    document.querySelectorAll(".nav-ad-btn").forEach(function (el) { el.remove(); });

    /* ডেটা লোড */
    loadPackageForm();
    loadPaymentSettings();
    listenToAdvertisements();
  });
})();