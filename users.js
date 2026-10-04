/* users.js — ইউজার তালিকা ও রোল ম্যানেজমেন্ট (panel-users) */
(function () {
  "use strict";

  var users = {};
  var currentUid = null;
  var searchTerm = "";

  var stylesAdded = false;

  /* ডিজাইন: রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে (ডার্ক মোডেও ঠিক থাকে);
     সব রুল #panel-users-এর ভেতরে সীমাবদ্ধ। আগে এখানে inline <style> আর !important ছিল, সেগুলো আর লাগে না। */
  function ensureStyles() {
    if (stylesAdded || document.getElementById("ar-news-users-styles")) return;
    stylesAdded = true;

    var style = document.createElement("style");
    style.id = "ar-news-users-styles";

    style.textContent = `

      #panel-users {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        margin-bottom: 0;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      #panel-users > h2 {
        margin: 0;
        font-family: var(--font-display, Georgia, serif);
        font-size: 26px;
        line-height: 1.2;
        font-weight: 400;
      }

      #panel-users > .sub {
        margin: 3px 0 14px;
        color: var(--muted);
        font-size: 13px;
      }

      /* নিচের নোটটা */
      #panel-users > .sub:last-child {
        margin-bottom: 0;
        font-size: 12.5px;
        line-height: 1.7;
      }

      #panel-users .search-box { margin-bottom: 14px; }

      /* ---------- ইউজার কার্ড ---------- */
      #panel-users .user-list {
        display: grid;
        gap: 10px;
        width: 100%;
      }

      #panel-users .user-row {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        min-width: 0;
        padding: 13px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: var(--shadow);
      }

      #panel-users .user-main {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      #panel-users .user-avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        overflow: hidden;
        border-radius: 50%;
        background: var(--brand-soft);
        color: var(--brand-ink);
        font-size: 17px;
        font-weight: 700;
        text-transform: uppercase;
      }

      #panel-users .user-avatar img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #panel-users .user-info {
        flex: 1 1 0;
        min-width: 0;
      }

      #panel-users .user-name {
        font-size: 15px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #panel-users .user-meta {
        margin-top: 2px;
        color: var(--muted);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* রোল ব্যাজ বাঁয়ে, বাটন ডানে */
      #panel-users .user-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }

      #panel-users .role-badge {
        padding: 3px 11px;
        font-size: 12px;
      }

      #panel-users .user-actions .btn {
        min-height: 36px;
        padding: 6px 16px;
        font-size: 13px;
        white-space: nowrap;
      }

      /* ---------- বড় স্ক্রিন: এক সারিতে ---------- */
      @media (min-width: 700px) {
        #panel-users .user-row {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        #panel-users .user-main { flex: 1 1 0; }

        #panel-users .user-actions {
          flex-shrink: 0;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 0;
          border-top: 0;
        }
      }

    `;

    document.head.appendChild(style);
  }

  function esc(v) { return window.AdminUtil.esc(v); }
  function fmtDate(v) { return window.AdminUtil.fmtDate(v); }

  function panelShellHtml() {
    return (
      "<h2>ইউজার</h2>" +
      '<p class="sub">রোল পরিবর্তন করে কাউকে অ্যাডমিন বানান বা বাদ দিন।</p>' +
      '<div class="search-box"><input id="user-search" type="search" placeholder="নাম বা ইমেইল দিয়ে খুঁজুন…"></div>' +
      '<div id="user-list"><div class="empty">লোড হচ্ছে…</div></div>' +
      '<p class="sub" style="margin-top:10px">নোট: যারা এখনো একবারও লগইন করে সাইটের কিছু ব্যবহার করেননি (বায়ো/ছবি/মন্তব্য ইত্যাদি), তাদের এখানে না-ও দেখা যেতে পারে — অ্যাকাউন্ট রেকর্ড তৈরি হয় প্রথম সাইন-আপের সময় থেকে।</p>'
    );
  }

  function render() {
    var list = document.getElementById("user-list");
    if (!list) return;

    var term = searchTerm.trim().toLowerCase();
    var entries = Object.entries(users)
      .filter(function (e) {
        if (!term) return true;
        var u = e[1];
        return (u.name || "").toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term);
      })
      .sort(function (a, b) { return (b[1].createdAt || 0) - (a[1].createdAt || 0); });

    if (!entries.length) {
      list.innerHTML = '<div class="empty">' + (term ? "কোনো মিল পাওয়া যায়নি।" : "কোনো ইউজার রেকর্ড এখনো নেই।") + "</div>";
      return;
    }

    list.innerHTML =
      '<div class="user-list">' +
      entries
        .map(function (entry) {
          var uid = entry[0];
          var u = entry[1];
          var role = u.role || "user";
          var name = u.name || (u.email ? u.email.split("@")[0] : "ব্যবহারকারী");
          var letter = name.trim().charAt(0).toUpperCase();
          var isSelf = uid === currentUid;

          var joinDate = u.createdAt ? fmtDate(u.createdAt) : "অজানা";
          var metaLine = u.email
            ? esc(u.email) + " · যোগদান: " + joinDate
            : "যোগদান: " + joinDate;

          return (
            '<div class="user-row">' +
              '<div class="user-main">' +
                '<div class="user-avatar">' +
                  (u.photoURL ? '<img src="' + esc(u.photoURL) + '" alt="">' : esc(letter)) +
                '</div>' +
                '<div class="user-info">' +
                  '<div class="user-name">' + esc(name) + (isSelf ? " (আপনি)" : "") + '</div>' +
                  '<div class="user-meta">' + metaLine + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="user-actions">' +
                '<span class="role-badge' + (role === "admin" ? " admin" : "") + '">' +
                  (role === "admin" ? "অ্যাডমিন" : "ইউজার") +
                '</span>' +
                (isSelf
                  ? ""
                  : '<button class="btn small ' + (role === "admin" ? "ghost" : "secondary") +
                    '" data-action="toggle-role" data-uid="' + esc(uid) +
                    '" data-role="' + role + '">' +
                    (role === "admin" ? "বাদ দিন" : "অ্যাডমিন করুন") +
                    '</button>') +
              '</div>' +
            '</div>'
          );
        })
        .join("") +
      "</div>";

    list.querySelectorAll("[data-action=toggle-role]").forEach(function (btn) {
      btn.onclick = function () {
        var uid = btn.dataset.uid;
        var currentRole = btn.dataset.role;
        var nextRole = currentRole === "admin" ? "user" : "admin";
        var name = (users[uid] && (users[uid].name || users[uid].email)) || "এই ইউজার";
        var question =
          nextRole === "admin"
            ? name + '-কে অ্যাডমিন বানাতে চান? তিনি তখন পোস্ট, রিপোর্ট, ইউজার সবকিছু ম্যানেজ করতে পারবেন।'
            : name + '-কে অ্যাডমিন থেকে বাদ দিতে চান?';
        if (!confirm(question)) return;
        btn.disabled = true;
        window.rtdb
          .ref("users/" + uid + "/role")
          .set(nextRole)
          .catch(function (err) { alert("করা যায়নি: " + err.message); })
          .finally(function () { btn.disabled = false; });
      };
    });
  }

  document.addEventListener("admin:ready", function (e) {
    currentUid = e.detail.user.uid;
    ensureStyles();

    var panel = document.getElementById("panel-users");
    if (!panel) return;
    panel.innerHTML = panelShellHtml();

    document.getElementById("user-search").addEventListener("input", function (ev) {
      searchTerm = ev.target.value;
      render();
    });

    window.rtdb.ref("users").on("value", function (snap) {
      users = snap.val() || {};
      render();
    });
  });
})();