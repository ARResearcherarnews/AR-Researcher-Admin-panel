/* reports.js — মন্তব্য রিপোর্ট মডারেশন (panel-reports)
   ইউজাররা feed.html-এ কমেন্ট/রিপ্লাই রিপোর্ট করলে reports/{key}-এ জমা হয়,
   এখানে সেগুলো রিভিউ করে কমেন্ট মুছে ফেলা বা রিপোর্ট খারিজ করা যায়। */
(function () {
  "use strict";

  var reports = {};
  var filter = "pending";

  var REASON_LABEL = {
    spam: "স্প্যাম",
    abusive: "আপত্তিকর / হয়রানিমূলক",
    misinformation: "ভুয়া তথ্য",
    other: "অন্যান্য",
  };
  var STATUS_LABEL = { pending: "অপেক্ষমাণ", reviewed: "রিভিউড", dismissed: "খারিজ" };


  var stylesAdded = false;

  /* ডিজাইন: রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে; সব রুল #panel-reports-এর ভেতরে সীমাবদ্ধ */
  function ensureStyles() {
    if (stylesAdded || document.getElementById("ar-news-reports-styles")) return;
    stylesAdded = true;

    var style = document.createElement("style");
    style.id = "ar-news-reports-styles";

    style.textContent = `

      #panel-reports {
        margin-bottom: 0;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      #panel-reports > h2 {
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 26px;
        line-height: 1.2;
        font-weight: 400;
      }

      #panel-reports > .sub {
        margin: 3px 0 14px;
        color: var(--muted);
        font-size: 13px;
      }

      /* ---------- ফিল্টার: এক সারিতে, দরকারে পাশে স্ক্রল ---------- */
      #panel-reports .filter-row {
        flex-wrap: nowrap;
        overflow-x: auto;
        margin-bottom: 14px;
        scrollbar-width: none;
      }

      #panel-reports .filter-row::-webkit-scrollbar { display: none; }

      #panel-reports .filter-btn { flex: 0 0 auto; }

      /* ---------- রিপোর্ট কার্ড ---------- */
      #panel-reports .report-item {
        padding: 14px;
        border-radius: 14px;
        box-shadow: var(--shadow);
      }

      #panel-reports .report-top { margin-bottom: 10px; }

      /* স্ট্যাটাস এখন একটা ছোট ট্যাগ */
      #panel-reports .report-status {
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
      }

      #panel-reports .status-pending .report-status   { background: var(--warn-soft);  color: var(--warn); }
      #panel-reports .status-reviewed .report-status  { background: var(--brand-soft); color: var(--brand-ink); }
      #panel-reports .status-dismissed .report-status { background: var(--line);       color: var(--muted); }

      /* রিপোর্ট করা মন্তব্য — উদ্ধৃতির মতো */
      #panel-reports .report-comment {
        margin: 0 0 10px;
        padding: 10px 12px 11px;
        background: var(--bg);
        border-left: 3px solid var(--line);
        border-radius: 4px 10px 10px 4px;
        font-size: 14px;
        line-height: 1.65;
      }

      #panel-reports .report-comment .by {
        margin-bottom: 4px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 600;
      }

      #panel-reports .status-pending .report-comment { border-left-color: var(--danger); }

      #panel-reports .report-meta {
        margin-bottom: 2px;
        font-size: 12.5px;
        line-height: 1.6;
      }

      /* ---------- বাটন ---------- */
      #panel-reports .item-actions {
        gap: 7px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }

      #panel-reports .item-actions .btn {
        flex: 1 1 auto;
        min-height: 38px;
      }

      @media (min-width: 700px) {
        #panel-reports .item-actions .btn {
          flex: 0 0 auto;
          padding-left: 16px;
          padding-right: 16px;
        }
      }

    `;

    document.head.appendChild(style);
  }

  function esc(v) { return window.AdminUtil.esc(v); }
  function fmtDate(v) { return window.AdminUtil.fmtDate(v); }

  function panelShellHtml() {
    return (
      "<h2>মন্তব্য রিপোর্ট</h2>" +
      '<p class="sub">ইউজাররা রিপোর্ট করা মন্তব্য এখানে রিভিউ করুন।</p>' +
      '<div class="filter-row">' +
      '<button class="filter-btn active" data-status="pending" type="button">অপেক্ষমাণ</button>' +
      '<button class="filter-btn" data-status="reviewed" type="button">রিভিউড</button>' +
      '<button class="filter-btn" data-status="dismissed" type="button">খারিজ</button>' +
      '<button class="filter-btn" data-status="all" type="button">সব</button>' +
      "</div>" +
      '<div id="report-list"><div class="empty">লোড হচ্ছে…</div></div>'
    );
  }

  function updatePendingCount() {
    var count = Object.keys(reports).filter(function (k) { return reports[k].status === "pending" || !reports[k].status; }).length;
    window.AdminUtil.setNavBadge("reports", count);
  }

  function render() {
    var list = document.getElementById("report-list");
    if (!list) return;

    var entries = Object.entries(reports)
      .filter(function (e) {
        if (filter === "all") return true;
        var st = e[1].status || "pending";
        return st === filter;
      })
      .sort(function (a, b) { return (b[1].createdAt || 0) - (a[1].createdAt || 0); });

    if (!entries.length) {
      list.innerHTML = '<div class="empty">এই তালিকায় কোনো রিপোর্ট নেই।</div>';
      return;
    }

    list.innerHTML =
      '<div class="report-list">' +
      entries
        .map(function (entry) {
          var key = entry[0];
          var r = entry[1];
          var status = r.status || "pending";
          return (
            '<article class="report-item status-' + status + '" data-key="' + esc(key) + '">' +
            '<div class="report-top">' +
            '<span class="reason-tag">' + esc(REASON_LABEL[r.reason] || r.reason || "অন্যান্য") + "</span>" +
            '<span class="report-status">' + esc(STATUS_LABEL[status] || status) + "</span>" +
            "</div>" +
            '<div class="report-comment"><span class="by">' + esc(r.commentAuthorName || "অজানা") + " লিখেছেন" + (r.replyId ? " (উত্তর)" : "") + "</span>" + esc(r.commentText || "") + "</div>" +
            '<div class="report-meta">পোস্ট: <a href="feed.html#post/' + encodeURIComponent(r.postId || "") + '" target="_blank" rel="noopener">' + esc(r.postTitle || "দেখুন") + "</a></div>" +
            '<div class="report-meta">রিপোর্ট করেছেন: ' + esc(r.reporterName || "অজানা") + " · " + fmtDate(r.createdAt) + "</div>" +
            '<div class="item-actions">' +
            (status !== "dismissed" ? '<button class="btn danger small" data-action="delete-comment" data-key="' + esc(key) + '">কমেন্ট মুছে ফেলুন</button>' : "") +
            (status !== "reviewed" ? '<button class="btn secondary small" data-action="mark-reviewed" data-key="' + esc(key) + '">রিভিউড করুন</button>' : "") +
            (status !== "dismissed" ? '<button class="btn ghost small" data-action="dismiss" data-key="' + esc(key) + '">খারিজ করুন</button>' : "") +
            "</div>" +
            "</article>"
          );
        })
        .join("") +
      "</div>";

    list.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.onclick = function () {
        var key = btn.dataset.key;
        var r = reports[key];
        if (!r) return;
        var action = btn.dataset.action;

        if (action === "delete-comment") {
          if (!confirm("এই মন্তব্যটি স্থায়ীভাবে মুছে ফেলতে চান?")) return;
          var updates = {};
          if (r.replyId) {
            updates["commentReplies/" + r.postId + "/" + r.commentId + "/" + r.replyId] = null;
          } else {
            updates["postComments/" + r.postId + "/" + r.commentId] = null;
            updates["postStats/" + r.postId + "/comments"] = firebase.database.ServerValue.increment(-1);
          }
          updates["reports/" + key + "/status"] = "reviewed";
          window.rtdb.ref().update(updates).catch(function (err) { alert("করা যায়নি: " + err.message); });
        }
        if (action === "mark-reviewed") {
          window.rtdb.ref("reports/" + key + "/status").set("reviewed");
        }
        if (action === "dismiss") {
          window.rtdb.ref("reports/" + key + "/status").set("dismissed");
        }
      };
    });
  }

  document.addEventListener("admin:ready", function () {
    ensureStyles();

    var panel = document.getElementById("panel-reports");
    if (!panel) return;
    panel.innerHTML = panelShellHtml();

    panel.querySelectorAll(".filter-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        panel.querySelectorAll(".filter-btn").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        filter = b.dataset.status;
        render();
      });
    });

    window.rtdb.ref("reports").on("value", function (snap) {
      reports = snap.val() || {};
      updatePendingCount();
      render();
    });
  });
})();