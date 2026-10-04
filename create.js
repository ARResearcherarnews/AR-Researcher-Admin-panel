/* create.js — নতুন পোস্ট তৈরি / এডিট ফর্ম (panel-create)
   posts.js-এর "এডিট" বাটনে চাপ দিলে "admin:edit-post" ইভেন্ট পাঠানো হয়,
   এই ফাইল সেটা শুনে ফর্মে আগের ডেটা বসিয়ে দেয় ও Create ট্যাবে নিয়ে যায়। */
(function () {
  "use strict";

  var editingId = null;
  var IMGBB_API_KEY = "aede02b305570da9ff878b94285d9623";

  var stylesAdded = false;

  /* ডিজাইন: রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে (ডার্ক মোডেও ঠিক থাকে);
     সব রুল #panel-create-এর ভেতরে সীমাবদ্ধ। */
  function ensureStyles() {
    if (stylesAdded || document.getElementById("ar-news-create-styles")) return;
    stylesAdded = true;

    var style = document.createElement("style");
    style.id = "ar-news-create-styles";

    style.textContent = `

      #panel-create {
        margin-bottom: 0;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      #panel-create .create-wrap { max-width: 780px; }

      /* ---------- পেজ হেডার ---------- */
      #panel-create .create-header { margin-bottom: 14px; }

      #panel-create .create-header h2 {
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 26px;
        line-height: 1.2;
        font-weight: 400;
      }

      #panel-create .create-header .sub {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.6;
      }

      /* ---------- ফর্ম কার্ড ---------- */
      #panel-create .create-form {
        padding: 18px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: var(--shadow);
      }

      /* এডিট মোডে (বাতিল বাটন দেখা গেলে) কার্ডের মাথায় রঙিন দাগ */
      #panel-create .create-form:has(#cancel-btn:not([hidden])) {
        border-top: 3px solid var(--brand);
      }

      #panel-create .form-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        column-gap: 14px;
      }

      @media (min-width: 640px) {
        #panel-create .form-grid { grid-template-columns: minmax(0, 1fr) 220px; }
        #panel-create .create-form { padding: 22px; }
      }

      #panel-create .field { margin-bottom: 14px; }

      #panel-create .field input:not([type="file"]),
      #panel-create .field select,
      #panel-create .field textarea {
        font-size: 16px; /* iOS জুম ঠেকায় */
      }

      @media (min-width: 640px) {
        #panel-create .field input:not([type="file"]),
        #panel-create .field select,
        #panel-create .field textarea { font-size: 14.5px; }
      }

      #panel-create #p-body {
        min-height: 240px;
        line-height: 1.7;
      }

      /* ---------- ফাইল বাছাই ---------- */
      #panel-create input[type="file"] {
        padding: 8px;
        color: var(--muted);
        font-size: 13.5px;
        cursor: pointer;
      }

      #panel-create input[type="file"]::file-selector-button {
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

      #panel-create .img-preview-wrap { max-width: 420px; }

      /* "অথবা ছবির লিংক দিন" ঘরটা স্ক্রিনে দেখানো হয় না।
         ইনপুটটা DOM-এ থেকে যায়, তাই আপলোড করা ছবির লিংক, প্রিভিউ আর এডিট আগের মতোই কাজ করে।
         আবার দেখাতে নিচের দুই রুল মুছে দিলেই হবে। */
      #panel-create label[for="p-image"],
      #panel-create #p-image { display: none; }

      /* ডিফল্ট/"যাচাই হচ্ছে" লেখাটাও লুকানো; ✓ বা ✗ ফলাফল আগের মতো দেখায় */
      #panel-create #img-hint:not(.ok):not(.bad) { display: none; }

      /* ---------- বাটন ও বার্তা ---------- */
      #panel-create .form-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 6px;
      }

      #panel-create .form-actions .btn {
        flex: 1 1 auto;
        min-height: 46px;
      }

      #panel-create #save-btn { flex: 2 1 auto; }

      @media (min-width: 640px) {
        #panel-create .form-actions .btn,
        #panel-create #save-btn {
          flex: 0 0 auto;
          min-height: 42px;
          padding-left: 24px;
          padding-right: 24px;
        }
      }

      #panel-create .msg {
        margin-top: 12px;
        font-size: 13.5px;
        font-weight: 600;
      }

    `;

    document.head.appendChild(style);
  }

  function esc(v) { return window.AdminUtil.esc(v); }

  function panelHtml() {
    return (
      '<div class="create-wrap">' +
        '<div class="create-header">' +
          '<h2 id="form-title">নতুন পোস্ট তৈরি করুন</h2>' +
          '<p class="sub">শিরোনাম, বিস্তারিত লেখা আর (ঐচ্ছিক) একটা ছবি দিয়ে পোস্ট প্রকাশ করুন।</p>' +
        '</div>' +
        '<form id="post-form" class="create-form">' +
          '<div class="form-grid">' +
            '<div class="field">' +
              '<label for="p-title">শিরোনাম</label>' +
              '<input id="p-title" required maxlength="180" placeholder="পোস্টের শিরোনাম লিখুন">' +
            '</div>' +
            '<div class="field">' +
              '<label for="p-category">ক্যাটাগরি</label>' +
              '<input id="p-category" maxlength="80" placeholder="সাধারণ">' +
            '</div>' +
          '</div>' +
          '<div class="field">' +
            '<label for="p-body">বিস্তারিত লেখা</label>' +
            '<textarea id="p-body" required maxlength="20000" placeholder="পোস্টের সম্পূর্ণ বিবরণ লিখুন..."></textarea>' +
          '</div>' +
          '<div class="form-grid form-grid-2">' +
            '<div class="field">' +
              '<label for="p-image-file">ছবি আপলোড করুন</label>' +
              '<input id="p-image-file" type="file" accept="image/*">' +
              '<small id="upload-status" class="img-hint"></small>' +
            '</div>' +
            '<div class="field">' +
              '<label for="p-status">স্ট্যাটাস</label>' +
              '<select id="p-status">' +
                '<option value="published">প্রকাশিত</option>' +
                '<option value="draft">ড্রাফট</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<div class="field">' +
            '<label for="p-image">অথবা ছবির লিংক দিন</label>' +
            '<input id="p-image" placeholder="ibb.co-এর লিংক বা HTML/BBCode এম্বেড কোড এখানে পেস্ট করুন">' +
            '<small id="img-hint" class="img-hint">উপরে ছবি আপলোড করলে এখানে লিংক নিজে থেকেই বসে যাবে। অথবা সরাসরি লিংক/এম্বেড কোড পেস্ট করতে পারেন।</small>' +
            '<div id="img-preview-wrap" class="img-preview-wrap" hidden>' +
              '<img id="img-preview" class="img-preview" alt="প্রিভিউ">' +
            '</div>' +
          '</div>' +
          '<div class="form-actions">' +
            '<button class="btn" type="submit" id="save-btn">পোস্ট সংরক্ষণ করুন</button>' +
            '<button class="btn secondary" type="button" id="cancel-btn" hidden>বাতিল</button>' +
          '</div>' +
          '<p class="msg" id="form-msg"></p>' +
        '</form>' +
      '</div>'
    );
  }

  function resetForm() {
    editingId = null;
    var form = document.getElementById("post-form");
    if (!form) return;
    form.reset();
    document.getElementById("form-title").textContent = "নতুন পোস্ট তৈরি করুন";
    document.getElementById("save-btn").textContent = "পোস্ট সংরক্ষণ করুন";
    document.getElementById("cancel-btn").hidden = true;
    var hint = document.getElementById("img-hint");
    var wrap = document.getElementById("img-preview-wrap");
    var uploadStatus = document.getElementById("upload-status");
    if (hint) {
      hint.textContent = "উপরে ছবি আপলোড করলে এখানে লিংক নিজে থেকেই বসে যাবে। অথবা সরাসরি লিংক/এম্বেড কোড পেস্ট করতে পারেন।";
      hint.className = "img-hint";
    }
    if (uploadStatus) { uploadStatus.textContent = ""; uploadStatus.className = "img-hint"; }
    if (wrap) wrap.hidden = true;
    var msg = document.getElementById("form-msg");
    if (msg) { msg.textContent = ""; msg.className = "msg"; }
  }

  // ibb.co-এর HTML/BBCode এম্বেড কোড থেকে আসল ছবির লিংক বের করে আনে
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
    var input = document.getElementById("p-image");
    var hint = document.getElementById("img-hint");
    var wrap = document.getElementById("img-preview-wrap");
    var img = document.getElementById("img-preview");
    var timer = null;

    function check() {
      var cleaned = extractImageUrl(input.value);
      if (cleaned && cleaned !== input.value.trim()) input.value = cleaned;

      var url = input.value.trim();
      if (!url) {
        wrap.hidden = true;
        hint.textContent = "সরাসরি ছবির লিংক দিন, অথবা ibb.co-এর HTML/BBCode এম্বেড কোড কপি-পেস্ট করলেও চলবে — আমরা নিজে থেকেই লিংকটা বের করে নেব।";
        hint.className = "img-hint";
        return;
      }
      hint.textContent = "যাচাই করা হচ্ছে…";
      hint.className = "img-hint";
      img.onload = function () {
        wrap.hidden = false;
        hint.textContent = "✓ ছবি ঠিক আছে, ফিডে এভাবেই দেখাবে।";
        hint.className = "img-hint ok";
      };
      img.onerror = function () {
        wrap.hidden = true;
        hint.textContent = "✗ এই লিংক থেকে ছবি লোড করা যায়নি। শুধু পেজ লিংক (ibb.co/xxxx) না দিয়ে HTML বা BBCode এম্বেড কোডটা পুরো কপি করে পেস্ট করুন।";
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

  // ছবি সিলেক্ট করলে ImgBB API দিয়ে আপলোড হয়, রিটার্ন করা লিংক p-image ইনপুটে বসে যায়
  function bindImageUpload() {
    var fileInput = document.getElementById("p-image-file");
    var urlInput = document.getElementById("p-image");
    var status = document.getElementById("upload-status");

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

  function savePost(e, user) {
    e.preventDefault();
    var msg = document.getElementById("form-msg");
    var saveBtn = document.getElementById("save-btn");
    var data = {
      title: document.getElementById("p-title").value.trim(),
      category: document.getElementById("p-category").value.trim() || "সাধারণ",
      description: document.getElementById("p-body").value.trim(),
      imageUrl: extractImageUrl(document.getElementById("p-image").value),
      status: document.getElementById("p-status").value,
      authorId: user.uid,
      authorName: user.displayName || user.email || "এডমিন",
      updatedAt: Date.now(),
    };
    var id = editingId || window.rtdb.ref("posts").push().key;
    if (!editingId) data.createdAt = Date.now();

    saveBtn.disabled = true;
    msg.textContent = "";
    window.rtdb
      .ref("posts/" + id)
      .update(data)
      .then(function () {
        var wasEditing = !!editingId;
        resetForm(); // resetForm বার্তাটা মুছে দেয়, তাই সফলতার বার্তা এর পরে বসাই
        msg.textContent = "সফলভাবে সংরক্ষণ হয়েছে ✓";
        msg.className = "msg ok";
        if (wasEditing) window.AdminUtil.setActiveTab("posts");
      })
      .catch(function (err) {
        msg.textContent = "সংরক্ষণ করা যায়নি: " + err.message;
        msg.className = "msg bad";
      })
      .finally(function () {
        saveBtn.disabled = false;
      });
  }

  function fillFormForEdit(id, post) {
    editingId = id;
    document.getElementById("p-title").value = post.title || "";
    document.getElementById("p-category").value = post.category || "";
    document.getElementById("p-body").value = post.description || "";
    document.getElementById("p-image").value = post.imageUrl || "";
    document.getElementById("p-image").dispatchEvent(new Event("input"));
    document.getElementById("p-status").value = post.status || "draft";
    document.getElementById("form-title").textContent = "পোস্ট এডিট করুন";
    document.getElementById("save-btn").textContent = "আপডেট করুন";
    document.getElementById("cancel-btn").hidden = false;
    window.AdminUtil.setActiveTab("create");
  }

  document.addEventListener("admin:ready", function (e) {
    var user = e.detail.user;
    ensureStyles();

    var panel = document.getElementById("panel-create");
    if (!panel) return;
    panel.innerHTML = panelHtml();
    resetForm();
    bindImagePreview();
    bindImageUpload();
    document.getElementById("post-form").addEventListener("submit", function (ev) { savePost(ev, user); });
    document.getElementById("cancel-btn").addEventListener("click", resetForm);
  });

  document.addEventListener("admin:edit-post", function (e) {
    fillFormForEdit(e.detail.id, e.detail.post);
  });
})();