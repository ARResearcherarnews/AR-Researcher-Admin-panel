/* posts.js — সব পোস্টের তালিকা (panel-posts)
   এডিট বাটনে চাপ দিলে "admin:edit-post" ইভেন্ট পাঠায়, create.js সেটা শুনে ফর্ম ভরে দেয়। */
(function () {
  "use strict";

  var posts = {};
  var postStats = {};
  var searchTerm = "";

  function esc(v) { return window.AdminUtil.esc(v); }
  function fmtDate(v) { return window.AdminUtil.fmtDate(v); }

  function panelShellHtml() {
    return (
      "<h2>সব পোস্ট</h2>" +
      '<p class="sub">এডিট, প্রকাশ/ড্রাফট পরিবর্তন বা ডিলিট করুন।</p>' +
      '<div class="search-box"><input id="post-search" type="search" placeholder="শিরোনাম বা ক্যাটাগরি দিয়ে খুঁজুন…"></div>' +
      '<div id="post-list"><div class="empty">লোড হচ্ছে…</div></div>'
    );
  }

  var ICON_EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var ICON_HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  var ICON_COMMENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.9-.9L3 21l1.9-5.6a8.4 8.4 0 0 1-.9-3.9 8.5 8.5 0 1 1 17 0Z"/></svg>';

  function render() {
    var list = document.getElementById("post-list");
    if (!list) return;

    var term = searchTerm.trim().toLowerCase();
    var entries = Object.entries(posts)
      .filter(function (e) {
        if (!term) return true;
        var p = e[1];
        return (p.title || "").toLowerCase().includes(term) || (p.category || "").toLowerCase().includes(term);
      })
      .sort(function (a, b) { return (b[1].createdAt || 0) - (a[1].createdAt || 0); });

    if (!entries.length) {
      list.innerHTML = '<div class="empty">' + (term ? "কোনো মিল পাওয়া যায়নি।" : "কোনো পোস্ট নেই।") + "</div>";
      return;
    }

    list.innerHTML =
      '<div class="post-list">' +
      entries
        .map(function (entry) {
          var id = entry[0];
          var p = entry[1];
          var s = postStats[id] || {};
          return (
            '<article class="post-item">' +
            (p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="" loading="lazy" onerror="this.remove()">' : "") +
            "<h3>" +
            esc(p.title || "শিরোনামহীন") +
            '<span class="status-tag' + (p.status === "published" ? "" : " draft") + '">' + (p.status === "published" ? "প্রকাশিত" : "ড্রাফট") + "</span>" +
            "</h3>" +
            '<div class="post-meta">' + esc(p.category || "সাধারণ") + " · " + fmtDate(p.createdAt) + "</div>" +
            "<p>" + esc((p.description || "").slice(0, 140)) + ((p.description || "").length > 140 ? "…" : "") + "</p>" +
            '<div class="post-engage">' +
            "<span>" + ICON_HEART + (s.likes || 0) + "</span>" +
            "<span>" + ICON_COMMENT + (s.comments || 0) + "</span>" +
            "<span>" + ICON_EYE + (s.views || 0) + "</span>" +
            "</div>" +
            '<div class="item-actions">' +
            '<button class="btn secondary small" data-action="edit" data-id="' + esc(id) + '">এডিট</button>' +
            '<button class="btn secondary small" data-action="toggle" data-id="' + esc(id) + '">' + (p.status === "published" ? "ড্রাফট করুন" : "প্রকাশ করুন") + "</button>" +
            '<button class="btn danger small" data-action="delete" data-id="' + esc(id) + '">ডিলিট</button>' +
            "</div>" +
            "</article>"
          );
        })
        .join("") +
      "</div>";

    list.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.dataset.id;
        var action = btn.dataset.action;
        var post = posts[id];
        if (!post) return;

        if (action === "edit") {
          document.dispatchEvent(new CustomEvent("admin:edit-post", { detail: { id: id, post: post } }));
        }
        if (action === "toggle") {
          window.rtdb.ref("posts/" + id + "/status").set(post.status === "published" ? "draft" : "published");
        }
        if (action === "delete") {
          if (!confirm('"' + (post.title || "এই পোস্ট") + '" ডিলিট করবেন? এটা ফিরিয়ে আনা যাবে না।')) return;
          window.rtdb.ref("posts/" + id).remove();
        }
      };
    });
  }

  document.addEventListener("admin:ready", function () {
    var panel = document.getElementById("panel-posts");
    if (!panel) return;
    panel.innerHTML = panelShellHtml();

    document.getElementById("post-search").addEventListener("input", function (e) {
      searchTerm = e.target.value;
      render();
    });

    window.rtdb.ref("posts").on("value", function (snap) {
      posts = snap.val() || {};
      var postsBadgeEl = document.getElementById("stat-posts");
      if (postsBadgeEl) postsBadgeEl.textContent = Object.keys(posts).length;
      render();
    });

    window.rtdb.ref("postStats").on("value", function (snap) {
      postStats = snap.val() || {};
      render();
    });
  });
})();