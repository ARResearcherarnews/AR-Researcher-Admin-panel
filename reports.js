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