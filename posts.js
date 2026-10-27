/* posts.js — AR News Admin
   Compact Professional 16:9 Posts Manager

   Features:
   - Firebase Realtime Database
   - Search by title/category
   - Edit
   - Publish / Draft
   - Delete
   - Like / Comment / View stats
   - 16:9 thumbnail
   - Description completely removed
   - Responsive mobile + desktop
*/

(function () {
  "use strict";

  var posts = {};
  var postStats = {};
  var searchTerm = "";
  var stylesAdded = false;

  /* =========================================================
     Helpers
  ========================================================= */

  function esc(value) {
    return window.AdminUtil.esc(value);
  }

  function fmtDate(value) {
    return window.AdminUtil.fmtDate(value);
  }

  /* =========================================================
     Professional Styles
  ========================================================= */

  function ensureStyles() {

    if (
      stylesAdded ||
      document.getElementById("ar-news-posts-styles")
    ) {
      return;
    }

    stylesAdded = true;

    var style = document.createElement("style");

    style.id = "ar-news-posts-styles";

    style.textContent = `
      /* AR News — পোস্ট ম্যানেজার (ব্র্যান্ড নীল ডিজাইন)
         রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে।
         সব রুল #panel-posts-এর ভেতরে সীমাবদ্ধ, যাতে অন্য প্যানেলে প্রভাব না পড়ে। */

      #panel-posts { margin-top: 0; }

      #panel-posts .posts-wrap {
        width: 100%;
        margin: 0 auto;
        padding: 0 0 24px;
        box-sizing: border-box;
      }

      /* ---------- পেজ হেডার: নীল ব্যান্ড + সার্চ ---------- */
      #panel-posts .posts-header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 0 -14px 16px;
        padding: 12px 20px 26px;
        background: var(--nav-bg);
        color: #fff;
        border: 0;
        border-radius: 0 0 28px 28px;
        box-shadow: none;
      }

      #panel-posts .posts-header-text { min-width: 0; }

      #panel-posts .posts-header-text h2 {
        margin: 0;
        color: #fff;
        font-family: var(--font-display, Georgia, serif);
        font-size: 30px;
        line-height: 1.25;
        font-weight: 400;
      }

      #panel-posts .posts-header-text .sub {
        margin: 4px 0 0;
        color: #c9d8f5;
        font-size: 13.5px;
        line-height: 1.55;
      }

      #panel-posts .posts-search { width: 100%; }

      #panel-posts .posts-search input {
        width: 100%;
        height: auto;
        min-height: 50px;
        box-sizing: border-box;
        padding: 0 16px;
        border: 0;
        border-radius: 16px;
        outline: none;
        background: #fff;
        color: #14201f;
        font: inherit;
        font-size: 15px;
      }

      #panel-posts .posts-search input::placeholder { color: #5e6a80; }

      #panel-posts .posts-search input:focus {
        box-shadow: 0 0 0 3px rgba(255, 255, 255, .35);
      }

      /* ---------- তালিকা: একটি সাদা কার্ড, ভেতরে দাগ-টানা সারি ---------- */
      #panel-posts .post-list {
        display: block;
        overflow: hidden;
        background: var(--surface);
        border-radius: 22px;
        box-shadow: var(--shadow);
      }

      /* সারি: ছবি | শিরোনাম+মেটা | সুইচ  — নিচে পুরো প্রস্থে ফুটার */
      #panel-posts .post-item {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) auto;
        grid-template-areas:
          "thumb main sw"
          "foot  foot foot";
        column-gap: 14px;
        align-items: start;
        min-width: 0;
        padding: 14px 12px 8px 14px;
        border-top: 1px solid var(--line);
      }

      #panel-posts .post-item:first-child { border-top: 0; }

      /* ---------- ছবি ---------- */
      #panel-posts .post-thumb {
        grid-area: thumb;
        width: 72px;
        height: 72px;
        overflow: hidden;
        border-radius: 14px;
        background: var(--brand-soft);
      }

      #panel-posts .post-thumb img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #panel-posts .post-thumb-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        box-sizing: border-box;
        text-align: center;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.3;
      }

      /* ---------- শিরোনাম ও মেটা ---------- */
      #panel-posts .post-main {
        grid-area: main;
        min-width: 0;
        padding-top: 1px;
      }

      #panel-posts .post-main h3 {
        margin: 0;
        color: var(--ink);
        font-family: var(--font-display, Georgia, serif);
        font-size: 16px;
        line-height: 1.45;
        font-weight: 400;
        word-break: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      #panel-posts .post-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        color: var(--muted);
        font-size: 12px;
      }

      #panel-posts .meta-cat { color: #0f766e; font-weight: 700; }
      #panel-posts .meta-dot { color: var(--line); }

      /* ---------- প্রকাশিত/ড্রাফট সুইচ ---------- */
      #panel-posts .post-switch {
        grid-area: sw;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 60px;
      }

      #panel-posts .sw {
        width: 60px;
        height: 44px;
        padding: 0;
        border: 0;
        background: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      #panel-posts .sw-track {
        position: relative;
        display: block;
        width: 50px;
        height: 28px;
        border-radius: 999px;
        background: #b9c3d6;
        transition: background .15s ease;
      }

      #panel-posts .sw[aria-checked="true"] .sw-track { background: var(--brand); }

      #panel-posts .sw-knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, .25);
        transition: transform .15s ease;
      }

      #panel-posts .sw[aria-checked="true"] .sw-knob { transform: translateX(22px); }

      #panel-posts .sw:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
        border-radius: 12px;
      }

      #panel-posts .status-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 9px;
        border-radius: 999px;
        background: #dcf3e4;
        color: #166534;
        font-size: 11.5px;
        line-height: 1.5;
        font-weight: 700;
        white-space: nowrap;
      }

      #panel-posts .status-tag.draft {
        background: var(--warn-soft);
        color: #92400e;
      }

      /* ---------- ফুটার: পরিসংখ্যান + আইকন বাটন ---------- */
      #panel-posts .post-footer {
        grid-area: foot;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 2px;
      }

      #panel-posts .post-engage {
        display: flex;
        align-items: center;
        gap: 16px;
        margin: 0;
        color: var(--muted);
      }

      #panel-posts .post-engage span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        white-space: nowrap;
      }

      #panel-posts .post-engage svg { width: 15px; height: 15px; }

      #panel-posts .post-engage b {
        color: var(--ink);
        font-size: 12px;
        font-weight: 700;
      }

      #panel-posts .item-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 0;
      }

      #panel-posts .icon-btn {
        width: 44px;
        height: 44px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--brand-soft);
        color: var(--brand-ink);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      #panel-posts .icon-btn.danger {
        background: var(--danger-soft);
        color: var(--danger);
      }

      #panel-posts .icon-btn svg { width: 19px; height: 19px; }

      #panel-posts .icon-btn:focus-visible {
        outline: 2px solid var(--brand);
        outline-offset: 2px;
      }

      /* ---------- খালি অবস্থা ---------- */
      #panel-posts .empty { padding: 42px 18px; }

      /* ---------- ডার্ক থিম ---------- */
      :root[data-theme="dark"] #panel-posts .status-tag { background: #123a2c; color: #86efac; }
      :root[data-theme="dark"] #panel-posts .status-tag.draft { background: var(--warn-soft); color: var(--warn); }
      :root[data-theme="dark"] #panel-posts .meta-cat { color: #5eead4; }

      /* ---------- বড় স্ক্রিন ---------- */
      @media (min-width: 700px) {
        #panel-posts .post-item {
          grid-template-columns: 112px minmax(0, 1fr) auto;
          padding: 16px 14px 10px 16px;
        }
        #panel-posts .post-thumb { width: 112px; height: 80px; }
        #panel-posts .post-main h3 { font-size: 17px; }
      }

      @media (min-width: 900px) {
        #panel-posts .posts-header {
          margin: 0 0 20px;
          padding: 24px 28px 28px;
          border-radius: 24px;
        }
      }
    `;

    document.head.appendChild(style);
  }


  /* =========================================================
     Panel HTML
  ========================================================= */

  function panelShellHtml() {

    return (

      '<div class="posts-wrap">' +

        '<div class="posts-header">' +

          '<div class="posts-header-text">' +

            '<h2>সব পোস্ট</h2>' +

            '<p class="sub">' +
              'পোস্ট এডিট, প্রকাশ/ড্রাফট পরিবর্তন বা ডিলিট করুন।' +
            '</p>' +

          '</div>' +

          '<div class="posts-search">' +

            '<input' +
              ' id="post-search"' +
              ' type="search"' +
              ' autocomplete="off"' +
              ' placeholder="শিরোনাম বা ক্যাটাগরি দিয়ে খুঁজুন…"' +
            '>' +

          '</div>' +

        '</div>' +

        '<div id="post-list">' +

          '<div class="empty">' +
            'লোড হচ্ছে…' +
          '</div>' +

        '</div>' +

      '</div>'

    );
  }


  /* =========================================================
     Icons
  ========================================================= */

  var ICON_EYE =
    '<svg viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +

      '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/>' +

      '<circle cx="12" cy="12" r="3"/>' +

    '</svg>';


  var ICON_HEART =
    '<svg viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +

      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>' +

    '</svg>';


  var ICON_COMMENT =
    '<svg viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +

      '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.9-.9L3 21l1.9-5.6a8.4 8.4 0 0 1-.9-3.9 8.5 8.5 0 1 1 17 0Z"/>' +

    '</svg>';


  var ICON_EDIT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' +
    '</svg>';

  var ICON_TRASH =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>' +
    '</svg>';


  /* =========================================================
     Render
  ========================================================= */

  function render() {

    var list =
      document.getElementById("post-list");

    if (!list) return;


    var term =
      searchTerm
        .trim()
        .toLowerCase();


    var entries =
      Object.entries(posts)

        .filter(function (entry) {

          if (!term) return true;

          var post =
            entry[1] || {};

          return (

            (post.title || "")
              .toLowerCase()
              .includes(term)

            ||

            (post.category || "")
              .toLowerCase()
              .includes(term)

          );

        })


        .sort(function (a, b) {

          return (

            (b[1].createdAt || 0) -

            (a[1].createdAt || 0)

          );

        });


    /* =======================================================
       Empty
    ======================================================= */

    if (!entries.length) {

      list.innerHTML =

        '<div class="empty">' +

          (
            term
              ? "কোনো মিল পাওয়া যায়নি।"
              : "কোনো পোস্ট নেই।"
          ) +

        '</div>';

      return;
    }


    /* =======================================================
       Cards
    ======================================================= */

    list.innerHTML =
      '<div class="post-list">' +
      entries.map(function (entry) {
        var id = entry[0];
        var post = entry[1] || {};
        var stats = postStats[id] || {};
        var published = post.status === "published";
        var title = esc(post.title || "শিরোনামহীন");

        var thumb = post.imageUrl
          ? '<div class="post-thumb">' +
              '<img src="' + esc(post.imageUrl) + '" alt="" loading="lazy"' +
              ' onerror="this.parentElement.innerHTML=\'কোনো ছবি নেই\';this.parentElement.classList.add(\'post-thumb-empty\')">' +
            '</div>'
          : '<div class="post-thumb post-thumb-empty">কোনো ছবি নেই</div>';

        return (
          '<article class="post-item">' +
            thumb +

            /* শিরোনাম + ক্যাটাগরি/তারিখ */
            '<div class="post-main">' +
              '<h3>' + title + '</h3>' +
              '<div class="post-meta">' +
                '<span class="meta-cat">' + esc(post.category || "সাধারণ") + '</span>' +
                '<span class="meta-dot">·</span>' +
                '<span>' + fmtDate(post.createdAt) + '</span>' +
              '</div>' +
            '</div>' +

            /* প্রকাশিত/ড্রাফট সুইচ */
            '<div class="post-switch">' +
              '<button type="button" class="sw" role="switch"' +
                ' aria-checked="' + (published ? "true" : "false") + '"' +
                ' aria-label="প্রকাশিত অবস্থা: ' + (published ? "চালু" : "বন্ধ") + '"' +
                ' title="' + (published ? "ড্রাফট করুন" : "প্রকাশ করুন") + '"' +
                ' data-action="toggle" data-id="' + esc(id) + '">' +
                '<span class="sw-track"><span class="sw-knob"></span></span>' +
              '</button>' +
              '<span class="status-tag' + (published ? "" : " draft") + '">' +
                (published ? "প্রকাশিত" : "ড্রাফট") +
              '</span>' +
            '</div>' +

            /* পরিসংখ্যান + এডিট/ডিলিট */
            '<div class="post-footer">' +
              '<div class="post-engage">' +
                '<span title="লাইক">' + ICON_HEART + '<b>' + (stats.likes || 0) + '</b></span>' +
                '<span title="কমেন্ট">' + ICON_COMMENT + '<b>' + (stats.comments || 0) + '</b></span>' +
                '<span title="ভিউ">' + ICON_EYE + '<b>' + (stats.views || 0) + '</b></span>' +
              '</div>' +
              '<div class="item-actions">' +
                '<button type="button" class="icon-btn" data-action="edit" data-id="' + esc(id) + '"' +
                  ' aria-label="এডিট করুন" title="এডিট">' + ICON_EDIT + '</button>' +
                '<button type="button" class="icon-btn danger" data-action="delete" data-id="' + esc(id) + '"' +
                  ' aria-label="ডিলিট করুন" title="ডিলিট">' + ICON_TRASH + '</button>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }).join("") +
      '</div>';


    /* =======================================================
       Button Events
    ======================================================= */

    list
      .querySelectorAll("[data-action]")
      .forEach(function (button) {

        button.onclick = function () {

          var id =
            button.dataset.id;

          var action =
            button.dataset.action;

          var post =
            posts[id];


          if (!post) return;


          /* =================================================
             Edit
          ================================================= */

          if (action === "edit") {

            document.dispatchEvent(

              new CustomEvent(

                "admin:edit-post",

                {

                  detail: {

                    id: id,

                    post: post

                  }

                }

              )

            );

          }


          /* =================================================
             Publish / Draft
          ================================================= */

          if (action === "toggle") {

            window.rtdb

              .ref(
                "posts/" +
                id +
                "/status"
              )

              .set(

                post.status === "published"

                  ? "draft"

                  : "published"

              );

          }


          /* =================================================
             Delete
          ================================================= */

          if (action === "delete") {

            var title =
              post.title ||
              "এই পোস্ট";


            if (

              !confirm(

                '"' +

                title +

                '" ডিলিট করবেন? এটি ফিরিয়ে আনা যাবে না।'

              )

            ) {

              return;

            }


            window.rtdb

              .ref(
                "posts/" +
                id
              )

              .remove();

          }

        };

      });

  }


  /* =========================================================
     Admin Ready
  ========================================================= */

  document.addEventListener(

    "admin:ready",

    function () {


      /* Load CSS */

      ensureStyles();


      /* Find Panel */

      var panel =
        document.getElementById(
          "panel-posts"
        );


      if (!panel) return;


      /* Build Panel */

      panel.innerHTML =
        panelShellHtml();


      /* =====================================================
         Search
      ===================================================== */

      var search =
        document.getElementById(
          "post-search"
        );


      if (search) {

        search.addEventListener(

          "input",

          function (event) {

            searchTerm =
              event.target.value;

            render();

          }

        );

      }


      /* =====================================================
         Firebase Posts
      ===================================================== */

      window.rtdb

        .ref("posts")

        .on(

          "value",

          function (snapshot) {

            posts =
              snapshot.val() || {};


            /* Update Posts Badge */

            var postsBadge =
              document.getElementById(
                "stat-posts"
              );


            if (postsBadge) {

              postsBadge.textContent =
                Object.keys(posts).length;

            }


            render();

          }

        );


      /* =====================================================
         Firebase Post Statistics
      ===================================================== */

      window.rtdb

        .ref("postStats")

        .on(

          "value",

          function (snapshot) {

            postStats =
              snapshot.val() || {};

            render();

          }

        );

    }

  );

})();