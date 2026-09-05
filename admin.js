/* AR News — admin dashboard */
(function () {
  "use strict";
  const app = document.getElementById("admin-app");
  let posts = {};
  let editingId = null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function imageUrl(value) {
    const text = String(value || "").trim();
    const found = text.match(/https?:\/\/[^\s"'\[\]<>]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s"'\[\]<>]*)?/i);
    return found ? found[0] : text;
  }
  function isAdmin(user) {
    return window.rtdb && user ? window.rtdb.ref(`users/${user.uid}/role`).once("value").then((s) => s.val() === "admin") : Promise.resolve(false);
  }
  function notify(message, error) {
    const el = document.getElementById("admin-alert");
    if (!el) return;
    el.textContent = message;
    el.className = `admin-alert show${error ? "" : ""}`;
    setTimeout(() => { el.className = "admin-alert"; }, 3500);
  }
  function date(value) {
    if (!value) return "";
    try { return new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch (_) { return ""; }
  }
  function loadStats() {
    window.rtdb.ref("users").once("value").then((snap) => {
      const users = Object.values(snap.val() || {});
      const now = Date.now();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const regularSince = now - (30 * 24 * 60 * 60 * 1000);
      const regular = users.filter((item) => Number(item.lastVisit || 0) >= regularSince).length;
      const todayCount = users.filter((item) => Number(item.lastVisit || 0) >= today.getTime()).length;
      const visits = users.reduce((sum, item) => sum + Number(item.visitCount || 0), 0);
      document.getElementById("stat-users").textContent = users.length;
      document.getElementById("stat-regular").textContent = regular;
      document.getElementById("stat-today").textContent = todayCount;
      document.getElementById("stat-visits").textContent = visits;
    }).catch(() => notify("পরিসংখ্যান লোড করা যায়নি। Users Rules যাচাই করুন।", true));
  }
  function renderPreview() {
    const title = document.getElementById("post-title").value.trim() || "শিরোনাম এখানে দেখা যাবে";
    const category = document.getElementById("post-category").value.trim() || "সাধারণ";
    const description = document.getElementById("post-description").value.trim() || "আপনার পোস্টের বিস্তারিত লেখা এখানে দেখা যাবে।";
    const image = imageUrl(document.getElementById("post-image").value);
    document.getElementById("admin-preview").innerHTML = `<div class="ar-post-preview-card"><div class="ar-post-meta"><span class="cat-dot"></span><span class="cat-name">${esc(category)}</span><span>·</span><span>প্রিভিউ</span></div><h3>${esc(title)}</h3>${image ? `<img class="ar-post-img" src="${esc(image)}" alt="" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><div class="preview-note" hidden>ছবি দেখা যাচ্ছে না। ছবির ওয়েবপেজ লিংক নয়, সরাসরি image URL দিন (যেমন: https://i.ibb.co/.../photo.jpg)।</div>` : ""}<p class="body">${esc(description)}</p><div class="preview-note">এটি শুধু প্রিভিউ — এখনো প্রকাশিত হয়নি</div></div>`;
  }
  function layout(user) {
    app.innerHTML = `
      <div class="admin-header"><div><h1>অ্যাডমিন প্যানেল</h1><p>পোস্ট, কমেন্ট ও রিপোর্ট নিয়ন্ত্রণ করুন</p></div><div class="admin-user">${esc(user.displayName || user.email || "অ্যাডমিন")}</div></div>
      <div id="admin-alert" class="admin-alert"></div>
      <section class="admin-stats" aria-label="সাইট পরিসংখ্যান">
        <div class="stat-card"><span class="stat-label">মোট ইউজার</span><strong id="stat-users">—</strong><small>অ্যাকাউন্ট তৈরি করেছে</small></div>
        <div class="stat-card"><span class="stat-label">নিয়মিত ভিজিটর</span><strong id="stat-regular">—</strong><small>গত ৩০ দিনে সক্রিয়</small></div>
        <div class="stat-card"><span class="stat-label">আজকের ভিজিটর</span><strong id="stat-today">—</strong><small>আজ সক্রিয় হয়েছে</small></div>
        <div class="stat-card"><span class="stat-label">মোট ভিজিট</span><strong id="stat-visits">—</strong><small>সব ইউজারের ভিজিট</small></div>
      </section>
      <div class="admin-grid">
        <section class="admin-panel"><h2 id="form-title">নতুন পোস্ট তৈরি করুন</h2>
          <form id="post-form" class="admin-form">
            <div class="ar-field"><label for="post-title">শিরোনাম</label><input id="post-title" required maxlength="180"></div>
            <div class="ar-field"><label for="post-category">ক্যাটাগরি</label><input id="post-category" maxlength="80" placeholder="সাধারণ"></div>
            <div class="ar-field"><label for="post-description">বিস্তারিত লেখা</label><textarea id="post-description" required maxlength="20000"></textarea></div>
            <div class="ar-field"><label for="post-image">ছবির লিংক বা ImgBB embed code (ঐচ্ছিক)</label><input id="post-image" type="text" placeholder="https://i.ibb.co.com/.../photo.png অথবা সম্পূর্ণ embed code"></div>
            <div class="ar-field"><label for="post-status">স্ট্যাটাস</label><select id="post-status"><option value="published">প্রকাশিত</option><option value="draft">ড্রাফট</option></select></div>
            <div class="admin-actions"><button class="admin-btn" type="submit" id="save-post">পোস্ট সংরক্ষণ করুন</button><button class="admin-btn secondary" type="button" id="cancel-edit" hidden>বাতিল</button></div>
          </form><div class="preview-heading">লাইভ প্রিভিউ</div><div id="admin-preview"></div>
        </section>
        <section class="admin-panel"><div class="admin-tabs"><button class="admin-tab active" data-tab="posts">পোস্টসমূহ</button><button class="admin-tab" data-tab="reports">রিপোর্ট</button></div><div id="admin-content"><div class="admin-loading">লোড হচ্ছে…</div></div></section>
      </div>`;
    document.getElementById("logout-btn").onclick = async () => {
      try { await window.auth.signOut(); } finally { window.location.replace("login.html?next=admin.html"); }
    };
    document.getElementById("post-form").onsubmit = savePost;
    document.getElementById("cancel-edit").onclick = resetForm;
    ["post-title", "post-category", "post-description", "post-image"].forEach((id) => document.getElementById(id).addEventListener("input", renderPreview));
    app.querySelectorAll(".admin-tab").forEach((tab) => tab.onclick = () => {
      app.querySelectorAll(".admin-tab").forEach((item) => item.classList.remove("active")); tab.classList.add("active");
      tab.dataset.tab === "reports" ? renderReports() : renderPosts();
    });
    renderPosts();
    loadStats();
    renderPreview();
  }
  function resetForm() {
    editingId = null;
    document.getElementById("post-form").reset();
    document.getElementById("form-title").textContent = "নতুন পোস্ট তৈরি করুন";
    document.getElementById("save-post").textContent = "পোস্ট সংরক্ষণ করুন";
    document.getElementById("cancel-edit").hidden = true;
  }
  async function savePost(event) {
    event.preventDefault();
    const user = window.auth.currentUser;
    const data = { title: document.getElementById("post-title").value.trim(), description: document.getElementById("post-description").value.trim(), category: document.getElementById("post-category").value.trim() || "সাধারণ", imageUrl: imageUrl(document.getElementById("post-image").value), status: document.getElementById("post-status").value, authorId: user.uid, authorName: user.displayName || user.email || "এডমিন", authorPhoto: user.photoURL || "", updatedAt: Date.now() };
    if (!editingId) data.createdAt = Date.now();
    try { await window.rtdb.ref(`posts/${editingId || window.rtdb.ref("posts").push().key}`).set(data); notify(editingId ? "পোস্ট আপডেট হয়েছে।" : "পোস্ট তৈরি হয়েছে।"); resetForm(); } catch (error) { notify(`সংরক্ষণ করা যায়নি: ${error.message}`, true); }
  }
  function renderPosts() {
    const entries = Object.entries(posts).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    document.getElementById("admin-content").innerHTML = entries.length ? `<div class="admin-list">${entries.map(([id, post]) => `<article class="admin-item"><h3>${esc(post.title || "শিরোনামহীন")}</h3><div class="admin-meta">${esc(post.status || "draft")} · ${date(post.createdAt)} · ${esc(post.authorName || "এডমিন")}</div><p>${esc(post.description || post.body || "")}</p><div class="admin-item-actions"><button class="admin-btn secondary" data-action="edit" data-id="${esc(id)}">এডিট</button><button class="admin-btn secondary" data-action="toggle" data-id="${esc(id)}">${post.status === "published" ? "ড্রাফট করুন" : "প্রকাশ করুন"}</button><button class="admin-btn danger" data-action="delete-post" data-id="${esc(id)}">ডিলিট</button><button class="admin-btn secondary" data-action="delete-comments" data-id="${esc(id)}">কমেন্ট মুছুন</button></div></article>`).join("")}</div>` : `<div class="admin-empty">কোনো পোস্ট নেই।</div>`;
    bindContentActions();
  }
  function renderReports() {
    const reports = [];
    Object.entries(posts).forEach(([postId, post]) => Object.entries(post.reports || {}).forEach(([reportId, report]) => reports.push({ postId, reportId, post, report })));
    reports.sort((a, b) => (b.report.createdAt || 0) - (a.report.createdAt || 0));
    document.getElementById("admin-content").innerHTML = reports.length ? `<div class="admin-list">${reports.map((item) => `<article class="admin-item report-card"><h3>${esc(item.post.title || "পোস্ট")}</h3><div class="admin-meta">রিপোর্ট করেছেন: ${esc(item.report.userName || "ব্যবহারকারী")} · ${date(item.report.createdAt)} · ${esc(item.report.status || "new")}</div><p>${esc(item.report.reason)}</p><div class="admin-item-actions"><button class="admin-btn secondary" data-action="resolve-report" data-post-id="${esc(item.postId)}" data-report-id="${esc(item.reportId)}">সমাধান হিসেবে চিহ্নিত</button><button class="admin-btn danger" data-action="delete-report" data-post-id="${esc(item.postId)}" data-report-id="${esc(item.reportId)}">রিপোর্ট মুছুন</button></div></article>`).join("")}</div>` : `<div class="admin-empty">কোনো রিপোর্ট নেই।</div>`;
    bindContentActions();
  }
  function bindContentActions() {
    document.querySelectorAll("#admin-content [data-action]").forEach((button) => button.onclick = async () => {
      const id = button.dataset.id, action = button.dataset.action;
      try {
        if (action === "edit") { const post = posts[id]; editingId = id; ["title", "category", "description", "image"].forEach((key) => { const field = document.getElementById(`post-${key}`); if (field) field.value = post[key === "image" ? "imageUrl" : key] || post[key === "description" ? "body" : key] || ""; }); document.getElementById("post-status").value = post.status || "draft"; document.getElementById("form-title").textContent = "পোস্ট এডিট করুন"; document.getElementById("save-post").textContent = "আপডেট করুন"; document.getElementById("cancel-edit").hidden = false; window.scrollTo({ top: 0, behavior: "smooth" }); }
        if (action === "toggle") { await window.rtdb.ref(`posts/${id}/status`).set(posts[id].status === "published" ? "draft" : "published"); notify("পোস্টের স্ট্যাটাস আপডেট হয়েছে।"); }
        if (action === "delete-post" && confirm("এই পোস্ট ও এর সব তথ্য ডিলিট করবেন?")) { await window.rtdb.ref(`posts/${id}`).remove(); notify("পোস্ট ডিলিট হয়েছে।"); }
        if (action === "delete-comments" && confirm("এই পোস্টের সব কমেন্ট ও রিপ্লাই মুছবেন?")) { await window.rtdb.ref(`posts/${id}/comments`).remove(); notify("কমেন্ট মুছে ফেলা হয়েছে।"); }
        if (action === "resolve-report") await window.rtdb.ref(`posts/${button.dataset.postId}/reports/${button.dataset.reportId}/status`).set("resolved");
        if (action === "delete-report") await window.rtdb.ref(`posts/${button.dataset.postId}/reports/${button.dataset.reportId}`).remove();
      } catch (error) { notify(`কাজটি করা যায়নি: ${error.message}`, true); }
    });
  }
  function start(user) {
    if (!user) { app.innerHTML = `<div class="admin-empty">অ্যাডমিন প্যানেলে ঢুকতে লগইন করুন।<br><br><a class="ar-btn" href="login.html?next=admin.html">লগইন পেজে যান</a></div>`; return; }
    isAdmin(user).then((allowed) => { if (!allowed) { app.innerHTML = `<div class="admin-empty">আপনার অ্যাডমিন অনুমতি নেই।<br><br><a class="ar-btn" href="login.html?next=admin.html">অ্যাডমিন লগইন পেজে যান</a></div>`; return; } layout(user); window.rtdb.ref("posts").on("value", (snap) => { posts = snap.val() || {}; const tab = document.querySelector(".admin-tab.active"); tab && tab.dataset.tab === "reports" ? renderReports() : renderPosts(); }); });
  }
  if (!window.auth || !window.rtdb) { app.innerHTML = `<div class="admin-empty">Firebase সংযোগ পাওয়া যায়নি।</div>`; return; }
  window.auth.onAuthStateChanged(start);
})();
