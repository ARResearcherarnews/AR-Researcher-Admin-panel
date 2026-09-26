/* users.js — ইউজার তালিকা ও রোল ম্যানেজমেন্ট (panel-users)
   users/{uid} থেকে সব ইউজার লোড করে দেখায় (শুধু admin পুরো তালিকা পড়তে পারে,
   database.rules.json-এ users/.read নিয়ম অনুযায়ী)। এডমিন বানানো/বাদ দেওয়া যাবে,
   নিজের একাউন্টের রোল নিজে বদলাতে পারবে না (ভুলে নিজেকে ডিমোট করা ঠেকাতে)। */
(function () {
  "use strict";

  var users = {};
  var currentUid = null;
  var searchTerm = "";

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
          return (
            '<div class="user-row">' +
            '<div class="user-avatar">' + (u.photoURL ? '<img src="' + esc(u.photoURL) + '" alt="">' : esc(letter)) + "</div>" +
            '<div class="user-info">' +
            '<div class="user-name">' + esc(name) + (isSelf ? " (আপনি)" : "") + "</div>" +
            '<div class="user-email">' + esc(u.email || "") + " · যোগদান: " + fmtDate(u.createdAt) + "</div>" +
            "</div>" +
            '<span class="role-badge' + (role === "admin" ? " admin" : "") + '">' + (role === "admin" ? "অ্যাডমিন" : "ইউজার") + "</span>" +
            (isSelf
              ? ""
              : '<button class="btn small ' + (role === "admin" ? "ghost" : "secondary") + '" data-action="toggle-role" data-uid="' + esc(uid) + '" data-role="' + role + '" style="margin-left:8px;flex-shrink:0">' +
                (role === "admin" ? "বাদ দিন" : "অ্যাডমিন করুন") +
                "</button>") +
            "</div>"
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