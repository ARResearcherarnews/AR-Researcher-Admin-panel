/* stats.js — পরিসংখ্যান (panel-stats)
   ভিজিট, মোট পোস্ট/ইউজার/অপেক্ষমাণ-রিপোর্ট সংখ্যা, আর এনগেজমেন্ট (লাইক×৩ + কমেন্ট×২ + ভিউ×১)
   অনুযায়ী সেরা পোস্টগুলোর একটা তালিকা — feed.html-এর ট্রেন্ডিং স্কোরের সাথে সামঞ্জস্যপূর্ণ।

   ডিজাইন: রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে; সব রুল #panel-stats-এর ভেতরে সীমাবদ্ধ। */
(function () {
  "use strict";

  var posts = {};
  var postStats = {};
  var stylesAdded = false;

  function esc(v) { return window.AdminUtil.esc(v); }

  /* =========================================================
     Styles
  ========================================================= */

  function ensureStyles() {
    if (stylesAdded || document.getElementById("ar-news-stats-styles")) return;
    stylesAdded = true;

    var style = document.createElement("style");
    style.id = "ar-news-stats-styles";

    style.textContent = `

      #panel-stats {
        margin-bottom: 0;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      #panel-stats .st-head h2 {
        margin: 0 0 14px;
        font-family: var(--font-display, Georgia, serif);
        font-size: 26px;
        line-height: 1.2;
        font-weight: 400;
      }

      /* ---------- সংখ্যার স্ট্রিপ: ভিজিট (বড়) আর গণনা (ছোট) ---------- */
      #panel-stats .stats-row {
        margin-bottom: 10px;
        box-shadow: var(--shadow);
      }

      #panel-stats .st-visits { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      #panel-stats .st-counts { grid-template-columns: repeat(3, minmax(0, 1fr)); }

      #panel-stats .stat-card { padding: 14px; }
      #panel-stats .st-visits .stat-card { padding: 16px 16px 15px; }

      #panel-stats .stat-card .label { line-height: 1.35; }

      #panel-stats .st-visits .stat-card strong { font-size: 34px; }
      #panel-stats .st-counts .stat-card strong { font-size: 26px; }

      /* অপেক্ষমাণ রিপোর্ট থাকলে সংখ্যাটা লাল */
      #panel-stats .stat-card.alert strong { color: var(--danger); }

      /* ---------- সেরা পোস্ট ---------- */
      #panel-stats .st-box {
        padding: 16px 16px 6px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 16px;
        box-shadow: var(--shadow);
      }

      #panel-stats .st-h {
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 19px;
        line-height: 1.3;
        font-weight: 400;
      }

      #panel-stats .st-sub {
        margin: 2px 0 8px;
        color: var(--muted);
        font-size: 12.5px;
      }

      #panel-stats .top-post-row:last-child { border-bottom: 0; }

      /* প্রথম স্থানটা আলাদা করে চেনা যায় */
      #panel-stats .top-post-row:first-child .rank {
        background: var(--brand);
        color: #fff;
      }

      #panel-stats .st-main { flex: 1; min-width: 0; }

      #panel-stats .top-post-row .sc {
        min-width: 74px;
        text-align: right;
      }

      #panel-stats .st-main .ttl {
        display: block;
        flex: none;
      }

      /* স্কোরের তুলনামূলক দাগ (সবার ওপরের পোস্ট = ১০০%) */
      #panel-stats .st-bar {
        display: block;
        height: 4px;
        margin-top: 7px;
        overflow: hidden;
        border-radius: 999px;
        background: var(--brand-soft);
      }

      #panel-stats .st-bar i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--brand);
      }

      #panel-stats .empty {
        padding: 26px 10px 30px;
        border: 0;
        background: none;
      }

      @media (min-width: 900px) {
        #panel-stats .st-visits .stat-card strong { font-size: 38px; }
        #panel-stats .st-counts .stat-card strong { font-size: 30px; }
        #panel-stats .st-box { padding: 20px 22px 8px; }
      }

    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     Panel HTML
  ========================================================= */

  function panelShellHtml() {
    return (
      '<div class="st-head"><h2>পরিসংখ্যান</h2></div>' +

      '<div class="stats-row st-visits">' +
      '<div class="stat-card"><span class="label">মোট ভিজিট</span><strong id="stat-total">—</strong></div>' +
      '<div class="stat-card"><span class="label">আজকের ভিজিট</span><strong id="stat-today">—</strong></div>' +
      "</div>" +

      '<div class="stats-row st-counts">' +
      '<div class="stat-card"><span class="label">মোট পোস্ট</span><strong id="stat-posts">—</strong></div>' +
      '<div class="stat-card"><span class="label">মোট ইউজার</span><strong id="stat-users">—</strong></div>' +
      '<div class="stat-card" id="stat-pending-card"><span class="label">অপেক্ষমাণ রিপোর্ট</span><strong id="stat-pending-reports">—</strong></div>' +
      "</div>" +

      '<section class="st-box">' +
      '<h3 class="st-h">সেরা ১০ পোস্ট</h3>' +
      '<p class="st-sub">এনগেজমেন্ট অনুযায়ী</p>' +
      '<div id="top-posts"><div class="empty">লোড হচ্ছে…</div></div>' +
      "</section>"
    );
  }

  /* =========================================================
     Top posts
  ========================================================= */

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

    var top = ranked[0][2] || 1;

    el.innerHTML = ranked
      .map(function (r, i) {
        var pct = Math.max(3, Math.round((r[2] / top) * 100));
        return (
          '<div class="top-post-row">' +
          '<span class="rank">' + (i + 1) + "</span>" +
          '<span class="st-main">' +
          '<span class="ttl">' + esc(r[1].title || "শিরোনামহীন") + "</span>" +
          '<span class="st-bar"><i style="width:' + pct + '%"></i></span>' +
          "</span>" +
          '<span class="sc">স্কোর ' + r[2] + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  /* =========================================================
     Admin Ready
  ========================================================= */

  document.addEventListener("admin:ready", function () {
    ensureStyles();

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
      var card = document.getElementById("stat-pending-card");
      if (card) card.classList.toggle("alert", pending > 0);
    });
  });
})();