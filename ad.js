/* ad.js — বিজ্ঞাপন (Ad) তৈরি, এডিট, তালিকা ও মুছে ফেলার প্যানেল (panel-ad)
   posts.js-এর মতোই: login.js "admin:ready" পাঠানোর আগেই TABS তালিকা অনুযায়ী
   #panel-ad আর বটম-ন্যাভে "বিজ্ঞাপন" বাটন তৈরি করে রাখে (login.js-এর TABS-এ
   "ad" যোগ করা হয়েছে), তাই এই ফাইলের কাজ শুধু panel-ad-এর ভেতরে কনটেন্ট বসানো।
   ডেটা রাখা হয় আলাদা Firebase নোড "ads"-এ, যাতে পোস্ট থেকে সম্পূর্ণ আলাদা থাকে। */
(function () {
  "use strict";

  var editingId = null;
  var IMGBB_API_KEY = "aede02b305570da9ff878b94285d9623";
  var ADS_REF = "ads";

  var stylesAdded = false;

  /* ডিজাইন: রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে (ডার্ক মোডেও ঠিক থাকে);
     সব রুল #panel-ad-এর ভেতরে সীমাবদ্ধ, তাই পোস্ট বা অন্য প্যানেলে প্রভাব পড়ে না। */
  function ensureStyles() {
    if (stylesAdded || document.getElementById("ar-news-ad-styles")) return;
    stylesAdded = true;

    var style = document.createElement("style");
    style.id = "ar-news-ad-styles";

    style.textContent = `

      #panel-ad {
        max-width: 780px;
        margin-bottom: 0;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      @media (min-width: 900px) {
        #panel-ad { max-width: 780px; }
      }

      /* ---------- কার্ড ---------- */
      #panel-ad .ad-box {
        margin-bottom: 14px;
        padding: 18px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: var(--shadow);
      }

      @media (min-width: 640px) {
        #panel-ad .ad-box { padding: 22px; }
      }

      /* এডিট মোডে (বাতিল বাটন দেখা গেলে) ফর্ম-কার্ডের মাথায় রঙিন দাগ */
      #panel-ad .ad-box:has(#ad-cancel-btn:not([hidden])) {
        border-top: 3px solid var(--brand);
      }

      #panel-ad .ad-box h2 {
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 22px;
        line-height: 1.25;
        font-weight: 400;
      }

      #panel-ad .ad-box .sub {
        margin: 3px 0 16px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
      }

      /* ---------- ফিডের ব্যবধান সেটিং ---------- */
      #panel-ad .ad-interval label {
        display: block;
        margin-bottom: 8px;
        color: var(--ink);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.5;
      }

      #panel-ad .ad-interval select {
        width: 100%;
        min-height: 44px;
        padding: 10px 14px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--surface);
        color: var(--ink);
        font: inherit;
        font-size: 16px;
      }

      #panel-ad .ad-interval select:focus {
        outline: none;
        border-color: var(--brand);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent);
      }

      @media (min-width: 640px) {
        #panel-ad .ad-interval select { width: auto; min-width: 260px; font-size: 14.5px; }
      }

      #panel-ad .ad-interval .msg { margin-top: 8px; min-height: 0; }
      #panel-ad .ad-interval .msg:empty { display: none; }

      /* ---------- ফর্ম ---------- */
      #panel-ad .field { margin-bottom: 14px; }

      #panel-ad .field input:not([type="file"]),
      #panel-ad .field select,
      #panel-ad .field textarea {
        font-size: 16px; /* iOS জুম ঠেকায় */
      }

      @media (min-width: 640px) {
        #panel-ad .field input:not([type="file"]),
        #panel-ad .field select,
        #panel-ad .field textarea { font-size: 14.5px; }
      }

      #panel-ad #ad-desc {
        min-height: 96px;
        line-height: 1.7;
      }

      #panel-ad input[type="file"] {
        padding: 8px;
        color: var(--muted);
        font-size: 13.5px;
        cursor: pointer;
      }

      #panel-ad input[type="file"]::file-selector-button {
        margin-right: 12px;
        padding: 7px 14px;
        border: 0;
        border-radius: 8px;
        background: var(--brand-soft);
        color: var(--brand-ink);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      #panel-ad .img-preview-wrap { max-width: 420px; }

      /* "অথবা ছবির লিংক দিন" ঘরটা স্ক্রিনে দেখানো হয় না।
         ইনপুটটা DOM-এ থেকে যায়, তাই আপলোড করা ছবির লিংক, প্রিভিউ আর এডিট আগের মতোই কাজ করে।
         আবার দেখাতে নিচের দুই রুল মুছে দিলেই হবে। */
      #panel-ad label[for="ad-image"],
      #panel-ad #ad-image { display: none; }

      /* ডিফল্ট/"যাচাই হচ্ছে" লেখাটাও লুকানো; ✓ বা ✗ ফলাফল আগের মতো দেখায় */
      #panel-ad #ad-img-hint:not(.ok):not(.bad) { display: none; }

      /* "অথবা ছবির লিংক দিন" ঘরটা স্ক্রিনে দেখানো হয় না।
         ইনপুটটা DOM-এ থেকে যায়, তাই আপলোড করা ছবির লিংক, প্রিভিউ আর এডিট আগের মতোই কাজ করে।
         আবার দেখাতে নিচের দুই রুল মুছে দিলেই হবে। */
      #panel-ad label[for="ad-image"],
      #panel-ad #ad-image { display: none; }

      /* ডিফল্ট/"যাচাই হচ্ছে" লেখাটাও লুকানো; ✓ বা ✗ ফলাফল আগের মতো দেখায় */
      #panel-ad #ad-img-hint:not(.ok):not(.bad) { display: none; }

      /* বাটনের লেখা + স্ট্যাটাস পাশাপাশি (বাটনের লেখা লুকানো থাকলে স্ট্যাটাস পুরো প্রস্থ নেয়) */
      #panel-ad .ad-row2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        column-gap: 14px;
      }

      #panel-ad .ad-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 6px;
      }

      #panel-ad .ad-actions .btn {
        flex: 1 1 auto;
        min-height: 46px;
      }

      #panel-ad #ad-save-btn { flex: 2 1 auto; }

      @media (min-width: 640px) {
        #panel-ad .ad-actions .btn,
        #panel-ad #ad-save-btn {
          flex: 0 0 auto;
          min-height: 42px;
          padding-left: 24px;
          padding-right: 24px;
        }
      }

      #panel-ad .msg {
        margin-top: 12px;
        font-size: 13.5px;
        font-weight: 600;
      }

      /* ---------- বিজ্ঞাপনের তালিকা ---------- */
      #panel-ad .post-list { display: grid; gap: 10px; }

      #panel-ad .ad-item {
        padding: 12px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 14px;
      }

      #panel-ad .ad-main {
        display: flex;
        align-items: flex-start;
        gap: 13px;
        min-width: 0;
      }

      #panel-ad .ad-thumb {
        flex-shrink: 0;
        display: block;
        width: 112px;
        height: 63px;
        margin: 0;
        object-fit: cover;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: var(--surface);
      }

      #panel-ad .ad-body { flex: 1 1 0; min-width: 0; }

      #panel-ad .ad-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;
      }

      #panel-ad .ad-item h3 {
        display: block;
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 16.5px;
        font-weight: 400;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      #panel-ad .ad-item p {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin: 5px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      #panel-ad .ad-item .post-meta { margin-top: 5px; font-size: 12px; }

      #panel-ad .ad-item .item-actions {
        gap: 7px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }

      #panel-ad .ad-item .item-actions .btn {
        flex: 1 1 auto;
        min-height: 36px;
        padding: 6px 12px;
      }

      @media (min-width: 640px) {
        #panel-ad .ad-item .item-actions .btn { flex: 0 0 auto; padding: 6px 16px; }
      }

      @media (max-width: 380px) {
        #panel-ad .ad-thumb { width: 88px; height: 50px; }
      }

    `;

    document.head.appendChild(style);
  }

  function esc(v) { return window.AdminUtil.esc(v); }
  function fmtDate(v) { return window.AdminUtil.fmtDate(v); }

  /* ---------------- ফর্ম + তালিকার HTML ---------------- */

  function panelHtml() {
    return (
      '<div class="ad-box ad-interval">' +
      '<label for="ad-interval">ফিডে কয়টি পোস্টের পর একটি বিজ্ঞাপন দেখাবে</label>' +
      '<select id="ad-interval">' +
      '<option value="2">প্রতি ২টি পোস্টের পর</option>' +
      '<option value="3">প্রতি ৩টি পোস্টের পর</option>' +
      '<option value="4">প্রতি ৪টি পোস্টের পর</option>' +
      "</select>" +
      '<p class="msg" id="ad-interval-msg"></p>' +
      "</div>" +

      '<div class="ad-box">' +
      '<h2 id="ad-form-title">নতুন বিজ্ঞাপন তৈরি করুন</h2>' +
      '<p class="sub">টাইটেল, ডেসক্রিপশন আর একটা ছবি (16:9) দিয়ে বিজ্ঞাপন তৈরি করুন। লিংক দিলে কার্ডে ভিজিট/ওপেন বাটন দেখাবে।</p>' +
      '<form id="ad-form">' +
      '<div class="field"><label for="ad-title">টাইটেল</label><input id="ad-title" required maxlength="120"></div>' +
      '<div class="field"><label for="ad-desc">ডেসক্রিপশন (ঐচ্ছিক)</label><textarea id="ad-desc" maxlength="800"></textarea></div>' +
      '<div class="field">' +
      '<label for="ad-image-file">ছবি আপলোড করুন (16:9)</label>' +
      '<input id="ad-image-file" type="file" accept="image/*">' +
      '<small id="ad-upload-status" class="img-hint"></small>' +
      "</div>" +
      '<div class="field">' +
      '<label for="ad-image">অথবা ছবির লিংক দিন</label>' +
      '<input id="ad-image" placeholder="ibb.co-এর লিংক বা HTML/BBCode এম্বেড কোড এখানে পেস্ট করুন">' +
      '<small id="ad-img-hint" class="img-hint">উপরে ছবি আপলোড করলে এখানে লিংক নিজে থেকেই বসে যাবে। ছবিটা সবসময় 16:9 অনুপাতে ক্রপ হয়ে দেখাবে।</small>' +
      '<div id="ad-img-preview-wrap" class="img-preview-wrap" hidden><img id="ad-img-preview" class="img-preview" alt="প্রিভিউ"></div>' +
      "</div>" +
      '<div class="field"><label for="ad-link">লিংক (ঐচ্ছিক)</label><input id="ad-link" type="url" placeholder="https://example.com"></div>' +
      '<div class="ad-row2">' +
      '<div class="field" id="ad-btn-label-wrap" hidden>' +
      '<label for="ad-btn-label">বাটনের লেখা</label>' +
      '<select id="ad-btn-label"><option value="ভিজিট করুন">ভিজিট করুন</option><option value="ওপেন করুন">ওপেন করুন</option></select>' +
      "</div>" +
      '<div class="field"><label for="ad-status">স্ট্যাটাস</label>' +
      '<select id="ad-status"><option value="active">সক্রিয়</option><option value="inactive">নিষ্ক্রিয়</option></select>' +
      "</div>" +
      "</div>" +
      '<div class="actions ad-actions">' +
      '<button class="btn" type="submit" id="ad-save-btn">বিজ্ঞাপন সংরক্ষণ করুন</button>' +
      '<button class="btn secondary" type="button" id="ad-cancel-btn" hidden>বাতিল</button>' +
      "</div>" +
      '<p class="msg" id="ad-form-msg"></p>' +
      "</form>" +
      "</div>" +

      '<div class="ad-box">' +
      "<h2>সব বিজ্ঞাপন</h2>" +
      '<p class="sub">এখান থেকে যেকোনো বিজ্ঞাপন এডিট বা মুছে ফেলা যাবে।</p>' +
      '<div class="post-list" id="ad-list"><div class="empty">লোড হচ্ছে…</div></div>' +
      "</div>"
    );
  }

  /* ---------------- ফর্ম রিসেট ---------------- */

  function resetForm() {
    editingId = null;
    var form = document.getElementById("ad-form");
    if (!form) return;
    form.reset();
    document.getElementById("ad-form-title").textContent = "নতুন বিজ্ঞাপন তৈরি করুন";
    document.getElementById("ad-save-btn").textContent = "বিজ্ঞাপন সংরক্ষণ করুন";
    document.getElementById("ad-cancel-btn").hidden = true;
    var hint = document.getElementById("ad-img-hint");
    var wrap = document.getElementById("ad-img-preview-wrap");
    var uploadStatus = document.getElementById("ad-upload-status");
    if (hint) {
      hint.textContent = "উপরে ছবি আপলোড করলে এখানে লিংক নিজে থেকেই বসে যাবে। ছবিটা সবসময় 16:9 অনুপাতে ক্রপ হয়ে দেখাবে।";
      hint.className = "img-hint";
    }
    if (uploadStatus) { uploadStatus.textContent = ""; uploadStatus.className = "img-hint"; }
    if (wrap) wrap.hidden = true;
    var msg = document.getElementById("ad-form-msg");
    if (msg) { msg.textContent = ""; msg.className = "msg"; }
    toggleBtnLabelField();
  }

  // ibb.co-এর HTML/BBCode এম্বেড কোড থেকে আসল ছবির লিংক বের করে আনে (create.js-এর মতোই)
  function extractImageUrl(raw) {
    var s = (raw || "").trim();
    if (!s) return "";
    var m = s.match(/\[img\](.*?)\[\/img\]/i);
    if (m) return m[1].trim();
    m = s.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1].trim();
    return s;
  }

  function bindImagePreview() {
    var input = document.getElementById("ad-image");
    var hint = document.getElementById("ad-img-hint");
    var wrap = document.getElementById("ad-img-preview-wrap");
    var img = document.getElementById("ad-img-preview");
    var timer = null;

    function check() {
      var cleaned = extractImageUrl(input.value);
      if (cleaned && cleaned !== input.value.trim()) input.value = cleaned;

      var url = input.value.trim();
      if (!url) {
        wrap.hidden = true;
        hint.textContent = "সরাসরি ছবির লিংক দিন, অথবা ibb.co-এর HTML/BBCode এম্বেড কোড কপি-পেস্ট করলেও চলবে।";
        hint.className = "img-hint";
        return;
      }
      hint.textContent = "যাচাই করা হচ্ছে…";
      hint.className = "img-hint";
      img.onload = function () {
        wrap.hidden = false;
        hint.textContent = "✓ ছবি ঠিক আছে, 16:9 অনুপাতে এভাবেই দেখাবে।";
        hint.className = "img-hint ok";
      };
      img.onerror = function () {
        wrap.hidden = true;
        hint.textContent = "✗ এই লিংক থেকে ছবি লোড করা যায়নি। HTML বা BBCode এম্বেড কোডটা পুরো কপি করে পেস্ট করুন।";
        hint.className = "img-hint bad";
      };
      img.src = url;
    }

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(check, 400);
    });
    if (input.value.trim()) check();
  }

  // ছবি সিলেক্ট করলে ImgBB API দিয়ে আপলোড হয়, রিটার্ন করা লিংক ad-image ইনপুটে বসে যায়
  function bindImageUpload() {
    var fileInput = document.getElementById("ad-image-file");
    var urlInput = document.getElementById("ad-image");
    var status = document.getElementById("ad-upload-status");

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        status.textContent = "✗ শুধু ছবি ফাইল আপলোড করা যাবে।";
        status.className = "img-hint bad";
        fileInput.value = "";
        return;
      }

      status.textContent = "আপলোড হচ্ছে…";
      status.className = "img-hint";
      fileInput.disabled = true;

      var formData = new FormData();
      formData.append("image", file);

      fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY, {
        method: "POST",
        body: formData,
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data || !data.success || !data.data || !data.data.url) {
            throw new Error((data && data.error && data.error.message) || "আপলোড ব্যর্থ হয়েছে");
          }
          urlInput.value = data.data.url;
          urlInput.dispatchEvent(new Event("input"));
          status.textContent = "✓ ছবি আপলোড হয়ে গেছে।";
          status.className = "img-hint ok";
        })
        .catch(function (err) {
          status.textContent = "✗ আপলোড করা যায়নি: " + err.message + " — ইন্টারনেট সংযোগ পরীক্ষা করুন অথবা লিংক পেস্ট করে দিন।";
          status.className = "img-hint bad";
        })
        .finally(function () {
          fileInput.disabled = false;
        });
    });
  }

  function toggleBtnLabelField() {
    var link = document.getElementById("ad-link");
    var wrap = document.getElementById("ad-btn-label-wrap");
    if (!link || !wrap) return;
    wrap.hidden = !link.value.trim();
  }

  /* ---------------- কয়টি পোস্টের পর বিজ্ঞাপন দেখাবে — সেটিং ---------------- */

  function bindIntervalSetting() {
    var sel = document.getElementById("ad-interval");
    var msg = document.getElementById("ad-interval-msg");
    if (!sel) return;

    window.rtdb
      .ref("settings/adInterval")
      .once("value")
      .then(function (snap) {
        var v = snap.val();
        sel.value = v === 2 || v === 3 || v === 4 ? String(v) : "3";
      });

    sel.addEventListener("change", function () {
      window.rtdb
        .ref("settings/adInterval")
        .set(parseInt(sel.value, 10))
        .then(function () {
          if (!msg) return;
          msg.textContent = "সংরক্ষণ হয়েছে ✓";
          msg.className = "msg ok";
          setTimeout(function () { msg.textContent = ""; msg.className = "msg"; }, 2000);
        })
        .catch(function (err) {
          if (!msg) return;
          msg.textContent = "সংরক্ষণ করা যায়নি: " + err.message;
          msg.className = "msg bad";
        });
    });
  }

  /* ---------------- সংরক্ষণ / এডিট / মুছে ফেলা ---------------- */

  function saveAd(e, user) {
    e.preventDefault();
    var msg = document.getElementById("ad-form-msg");
    var saveBtn = document.getElementById("ad-save-btn");
    var link = document.getElementById("ad-link").value.trim();
    var data = {
      title: document.getElementById("ad-title").value.trim(),
      description: document.getElementById("ad-desc").value.trim(),
      imageUrl: extractImageUrl(document.getElementById("ad-image").value),
      link: link,
      buttonLabel: link ? document.getElementById("ad-btn-label").value : "",
      status: document.getElementById("ad-status").value,
      authorId: user.uid,
      authorName: user.displayName || user.email || "এডমিন",
      updatedAt: Date.now(),
    };
    var id = editingId || window.rtdb.ref(ADS_REF).push().key;
    if (!editingId) data.createdAt = Date.now();

    saveBtn.disabled = true;
    msg.textContent = "";
    window.rtdb
      .ref(ADS_REF + "/" + id)
      .update(data)
      .then(function () {
        resetForm(); // resetForm বার্তাটা মুছে দেয়, তাই সফলতার বার্তা এর পরে বসাই
        msg.textContent = "সফলভাবে সংরক্ষণ হয়েছে ✓";
        msg.className = "msg ok";
      })
      .catch(function (err) {
        msg.textContent = "সংরক্ষণ করা যায়নি: " + err.message;
        msg.className = "msg bad";
      })
      .finally(function () {
        saveBtn.disabled = false;
      });
  }

  function fillFormForEdit(id, ad) {
    editingId = id;
    document.getElementById("ad-title").value = ad.title || "";
    document.getElementById("ad-desc").value = ad.description || "";
    document.getElementById("ad-image").value = ad.imageUrl || "";
    document.getElementById("ad-image").dispatchEvent(new Event("input"));
    document.getElementById("ad-link").value = ad.link || "";
    toggleBtnLabelField();
    document.getElementById("ad-btn-label").value = ad.buttonLabel || "ভিজিট করুন";
    document.getElementById("ad-status").value = ad.status || "active";
    document.getElementById("ad-form-title").textContent = "বিজ্ঞাপন এডিট করুন";
    document.getElementById("ad-save-btn").textContent = "আপডেট করুন";
    document.getElementById("ad-cancel-btn").hidden = false;
    var form = document.getElementById("ad-form");
    if (form && form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteAd(id) {
    if (!window.confirm("এই বিজ্ঞাপনটি মুছে ফেলতে চান? এটা আর ফিরিয়ে আনা যাবে না।")) return;
    window.rtdb.ref(ADS_REF + "/" + id).remove().catch(function (err) {
      window.alert("মুছে ফেলা যায়নি: " + err.message);
    });
  }

  /* ---------------- তালিকা রেন্ডার ---------------- */

  function renderList(snapshotVal) {
    var list = document.getElementById("ad-list");
    if (!list) return;
    var ids = snapshotVal ? Object.keys(snapshotVal) : [];
    if (!ids.length) {
      list.innerHTML = '<div class="empty">এখনো কোনো বিজ্ঞাপন তৈরি হয়নি।</div>';
      return;
    }
    ids.sort(function (a, b) { return (snapshotVal[b].createdAt || 0) - (snapshotVal[a].createdAt || 0); });

    list.innerHTML = ids
      .map(function (id) {
        var ad = snapshotVal[id] || {};
        var statusTag =
          ad.status === "inactive"
            ? '<span class="status-tag draft">নিষ্ক্রিয়</span>'
            : '<span class="status-tag">সক্রিয়</span>';
        var dateStr = fmtDate(ad.createdAt);
        var metaRow = dateStr ? '<p class="post-meta">' + esc(dateStr) + "</p>" : "";
        var descRow = ad.description ? "<p>" + esc(ad.description) + "</p>" : "";
        var linkBtn = ad.link
          ? '<a class="btn small secondary" href="' +
            esc(ad.link) +
            '" target="_blank" rel="noopener">' +
            esc(ad.buttonLabel || "ভিজিট করুন") +
            "</a>"
          : "";
        return (
          '<div class="post-item ad-item" data-id="' + esc(id) + '">' +
          '<div class="ad-main">' +
          (ad.imageUrl ? '<img class="ad-thumb" src="' + esc(ad.imageUrl) + '" alt="">' : "") +
          '<div class="ad-body">' +
          '<div class="ad-tags"><span class="status-tag ad-badge">বিজ্ঞাপন</span>' + statusTag + "</div>" +
          "<h3>" + esc(ad.title || "") + "</h3>" +
          descRow +
          metaRow +
          "</div></div>" +
          '<div class="item-actions">' +
          linkBtn +
          '<button class="btn small secondary" type="button" data-action="edit">এডিট</button>' +
          '<button class="btn small danger" type="button" data-action="delete">ডিলিট</button>' +
          "</div></div>"
        );
      })
      .join("");
  }

  function bindListEvents() {
    var list = document.getElementById("ad-list");
    if (!list) return;
    list.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-action]");
      if (!btn) return;
      var item = btn.closest(".post-item");
      var id = item && item.getAttribute("data-id");
      if (!id) return;
      var action = btn.getAttribute("data-action");
      if (action === "delete") { deleteAd(id); return; }
      if (action === "edit") {
        window.rtdb
          .ref(ADS_REF + "/" + id)
          .once("value")
          .then(function (snap) { fillFormForEdit(id, snap.val() || {}); });
      }
    });
  }

  /* ---------------- চালু ---------------- */

  document.addEventListener("admin:ready", function (e) {
    var user = e.detail.user;
    ensureStyles();

    var panel = document.getElementById("panel-ad");
    if (!panel) return;
    panel.innerHTML = panelHtml();
    resetForm();
    bindIntervalSetting();
    bindImagePreview();
    bindImageUpload();
    bindListEvents();
    document.getElementById("ad-form").addEventListener("submit", function (ev) { saveAd(ev, user); });
    document.getElementById("ad-cancel-btn").addEventListener("click", resetForm);
    document.getElementById("ad-link").addEventListener("input", toggleBtnLabelField);

    window.rtdb.ref(ADS_REF).on("value", function (snap) { renderList(snap.val()); });
  });
})();