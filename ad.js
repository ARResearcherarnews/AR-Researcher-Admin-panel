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

  function esc(v) { return window.AdminUtil.esc(v); }
  function fmtDate(v) { return window.AdminUtil.fmtDate(v); }

  /* ---------------- ফর্ম + তালিকার HTML ---------------- */

  function panelHtml() {
    return (
      '<div style="margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid var(--line)">' +
      '<label for="ad-interval" style="display:block;font-size:12.5px;font-weight:700;color:var(--muted);margin-bottom:6px">ফিডে কয়টি পোস্টের পর একটি বিজ্ঞাপন দেখাবে</label>' +
      '<select id="ad-interval">' +
      '<option value="2">প্রতি ২টি পোস্টের পর</option>' +
      '<option value="3">প্রতি ৩টি পোস্টের পর</option>' +
      '<option value="4">প্রতি ৪টি পোস্টের পর</option>' +
      "</select>" +
      '<p class="msg" id="ad-interval-msg"></p>' +
      "</div>" +
      '<h2 id="ad-form-title">নতুন বিজ্ঞাপন তৈরি করুন</h2>' +
      '<p class="sub">টাইটেল, ডেসক্রিপশন আর একটা ছবি (16:9) দিয়ে বিজ্ঞাপন তৈরি করুন। লিংক দিলে কার্ডে ভিজিট/ওপেন বাটন দেখাবে।</p>' +
      '<form id="ad-form">' +
      '<div class="field"><label for="ad-title">টাইটেল</label><input id="ad-title" required maxlength="120"></div>' +
      '<div class="field"><label for="ad-desc">ডেসক্রিপশন</label><textarea id="ad-desc" required maxlength="800"></textarea></div>' +
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
      '<div class="field" id="ad-btn-label-wrap" hidden>' +
      '<label for="ad-btn-label">বাটনের লেখা</label>' +
      '<select id="ad-btn-label"><option value="ভিজিট করুন">ভিজিট করুন</option><option value="ওপেন করুন">ওপেন করুন</option></select>' +
      "</div>" +
      '<div class="field"><label for="ad-status">স্ট্যাটাস</label>' +
      '<select id="ad-status"><option value="active">সক্রিয়</option><option value="inactive">নিষ্ক্রিয়</option></select>' +
      "</div>" +
      '<div class="actions">' +
      '<button class="btn" type="submit" id="ad-save-btn">বিজ্ঞাপন সংরক্ষণ করুন</button>' +
      '<button class="btn secondary" type="button" id="ad-cancel-btn" hidden>বাতিল</button>' +
      "</div>" +
      '<p class="msg" id="ad-form-msg"></p>' +
      "</form>" +
      '<div style="margin-top:24px;padding-top:18px;border-top:1px solid var(--line)">' +
      '<h2 style="margin-bottom:4px">সব বিজ্ঞাপন</h2>' +
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
        msg.textContent = "সফলভাবে সংরক্ষণ হয়েছে ✓";
        msg.className = "msg ok";
        resetForm();
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
        var linkRow = ad.link
          ? '<div class="item-actions"><a class="btn small secondary" href="' +
            esc(ad.link) +
            '" target="_blank" rel="noopener">' +
            esc(ad.buttonLabel || "ভিজিট করুন") +
            "</a></div>"
          : "";
        return (
          '<div class="post-item" data-id="' + esc(id) + '">' +
          (ad.imageUrl ? '<img src="' + esc(ad.imageUrl) + '" alt="">' : "") +
          '<h3><span class="status-tag ad-badge">বিজ্ঞাপন</span>' + esc(ad.title || "") + statusTag + "</h3>" +
          "<p>" + esc(ad.description || "") + "</p>" +
          metaRow +
          linkRow +
          '<div class="item-actions">' +
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