/* stats.js — পরিসংখ্যান (panel-stats)
   ভিজিট, মোট পোস্ট/ইউজার/অপেক্ষমাণ-রিপোর্ট সংখ্যা, আর এনগেজমেন্ট (লাইক×৩ + কমেন্ট×২ + ভিউ×১)
   অনুযায়ী সেরা পোস্টগুলোর একটা তালিকা — feed.html-এর ট্রেন্ডিং স্কোরের সাথে সামঞ্জস্যপূর্ণ। */
(function () {
  "use strict";

  var posts = {};
  var postStats = {};

  function esc(v) { return window.AdminUtil.esc(v); }

  function panelShellHtml() {
    return (
      "<h2>পরিসংখ্যান</h2>" +
      '<div class="stats-row">' +
      '<div class="stat-card"><span class="label">মোট ভিজিট</span><strong id="stat-total">—</strong></div>' +
      '<div class="stat-card"><span class="label">আজকের ভিজিট</span><strong id="stat-today">—</strong></div>' +
      '<div class="stat-card"><span class="label">মোট পোস্ট</span><strong id="stat-posts">—</strong></div>' +
      '<div class="stat-card"><span class="label">মোট ইউজার</span><strong id="stat-users">—</strong></div>' +
      '<div class="stat-card"><span class="label">অপেক্ষমাণ রিপোর্ট</span><strong id="stat-pending-reports">—</strong></div>' +
      "</div>" +
      '<h2 style="margin-top:26px;font-size:16px">সেরা ১০ পোস্ট (এনগেজমেন্ট অনুযায়ী)</h2>' +
      '<div id="top-posts"><div class="empty">লোড হচ্ছে…</div></div>'
    );
  }

  function score(id) {
    var s = postStats[id] || {};
    return (s.likes || 0) * 3 + (s.comments || 0) * 2 + (s.views || 0);
  }

  function renderTopPosts() {
    var el = document.getElementById("top-posts");
    if (!el) return;
    var ranked = Object.keys(posts)
      .map(function (id) { return [id, posts[id], score(id)]; })
      .filter(function (r) { return r[2] > 0; })
      .sort(function (a, b) { return b[2] - a[2]; })
      .slice(0, 10);

    if (!ranked.length) {
      el.innerHTML = '<div class="empty">এখনো কোনো এনগেজমেন্ট (লাইক/কমেন্ট/ভিউ) নেই।</div>';
      return;
    }

    el.innerHTML = ranked
      .map(function (r, i) {
        return (
          '<div class="top-post-row">' +
          '<span class="rank">' + (i + 1) + "</span>" +
          '<span class="ttl">' + esc(r[1].title || "শিরোনামহীন") + "</span>" +
          '<span class="sc">স্কোর ' + r[2] + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  document.addEventListener("admin:ready", function () {
    var panel = document.getElementById("panel-stats");
    if (!panel) return;
    panel.innerHTML = panelShellHtml();

    var today = new Date().toISOString().slice(0, 10);
    window.rtdb.ref("stats/totalVisits").on("value", function (snap) {
      document.getElementById("stat-total").textContent = snap.val() || 0;
    });
    window.rtdb.ref("stats/dailyVisits/" + today).on("value", function (snap) {
      document.getElementById("stat-today").textContent = snap.val() || 0;
    });

    window.rtdb.ref("posts").on("value", function (snap) {
      posts = snap.val() || {};
      document.getElementById("stat-posts").textContent = Object.keys(posts).length;
      renderTopPosts();
    });

    window.rtdb.ref("postStats").on("value", function (snap) {
      postStats = snap.val() || {};
      renderTopPosts();
    });

    window.rtdb.ref("users").on("value", function (snap) {
      var u = snap.val() || {};
      document.getElementById("stat-users").textContent = Object.keys(u).length;
    });

    window.rtdb.ref("reports").on("value", function (snap) {
      var r = snap.val() || {};
      var pending = Object.keys(r).filter(function (k) { return (r[k].status || "pending") === "pending"; }).length;
      document.getElementById("stat-pending-reports").textContent = pending;
    });
  });
})();