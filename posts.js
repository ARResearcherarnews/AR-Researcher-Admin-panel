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
      /* AR News — পোস্ট ম্যানেজার (নতুন ডিজাইন)
         রং ও ফন্ট index.html-এর :root ভ্যারিয়েবল থেকে আসে।
         সব রুল #panel-posts-এর ভেতরে সীমাবদ্ধ, যাতে বিজ্ঞাপন প্যানেলে প্রভাব না পড়ে। */

      #panel-posts .posts-wrap {
        width: 100%;
        margin: 0 auto;
        padding: 0 0 24px;
        box-sizing: border-box;
      }

      /* ---------- হেডার + সার্চ ---------- */
      #panel-posts .posts-header {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-bottom: 14px;
        padding: 0;
        background: none;
        border: 0;
        box-shadow: none;
      }

      #panel-posts .posts-header-text {
        min-width: 0;
      }

      #panel-posts .posts-header-text h2 {
        margin: 0;
        color: var(--ink);
        font-family: var(--font-display, Georgia, serif);
        font-size: 26px;
        line-height: 1.2;
        font-weight: 400;
      }

      #panel-posts .posts-header-text .sub {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }

      #panel-posts .posts-search {
        width: 100%;
      }

      #panel-posts .posts-search input {
        width: 100%;
        height: 44px;
        box-sizing: border-box;
        padding: 0 14px;
        border: 1px solid var(--line);
        border-radius: 12px;
        outline: none;
        background: var(--surface);
        color: var(--ink);
        font: inherit;
        font-size: 14.5px;
      }

      #panel-posts .posts-search input::placeholder {
        color: var(--muted);
      }

      #panel-posts .posts-search input:focus {
        border-color: var(--brand);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent);
      }

      /* ---------- তালিকা ---------- */
      #panel-posts .post-list {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }

      /* কার্ড: বাঁয়ে থাম্বনেইল, ডানে শিরোনাম ও মেটা, নিচে পুরো প্রস্থে ফুটার */
      #panel-posts .post-item {
        position: relative;
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        column-gap: 13px;
        min-width: 0;
        padding: 11px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 14px;
        box-shadow: var(--shadow);
      }

      #panel-posts .post-body {
        display: contents;
      }

      /* ---------- থাম্বনেইল ---------- */
      #panel-posts .post-thumb {
        grid-column: 1;
        grid-row: 1 / span 2;
        align-self: start;
        width: 96px;
        height: 96px;
        overflow: hidden;
        border-radius: 10px;
        background: var(--bg);
      }

      #panel-posts .post-thumb img {
        display: block;
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
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

      /* ---------- শিরোনাম + স্ট্যাটাস ---------- */
      #panel-posts .post-top {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        min-width: 0;
      }

      #panel-posts .post-top h3 {
        display: block;
        margin: 0;
        color: var(--ink);
        font-family: var(--font-display, Georgia, serif);
        font-size: 16.5px;
        line-height: 1.4;
        font-weight: 400;
        word-break: break-word;
      }

      #panel-posts .status-tag {
        display: inline-flex;
        align-items: center;
        padding: 2px 9px;
        border-radius: 999px;
        background: var(--brand-soft);
        color: var(--brand-ink);
        font-size: 11.5px;
        line-height: 1.5;
        font-weight: 600;
        white-space: nowrap;
      }

      #panel-posts .status-tag.draft {
        background: var(--warn-soft);
        color: var(--warn);
      }

      /* ---------- ক্যাটাগরি + তারিখ ---------- */
      #panel-posts .post-meta {
        grid-column: 2;
        grid-row: 2;
        align-self: end;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        color: var(--muted);
        font-size: 12px;
      }

      #panel-posts .meta-cat {
        color: var(--brand);
        font-weight: 600;
      }

      #panel-posts .meta-dot {
        color: var(--line);
      }

      /* ---------- ফুটার: পরিসংখ্যান + বাটন ---------- */
      #panel-posts .post-footer {
        grid-column: 1 / -1;
        grid-row: 3;
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 11px;
        padding-top: 10px;
        border-top: 1px solid var(--line);
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

      #panel-posts .post-engage svg {
        width: 15px;
        height: 15px;
      }

      #panel-posts .post-engage b {
        color: var(--ink);
        font-size: 12px;
        font-weight: 600;
      }

      #panel-posts .item-actions {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 0;
      }

      #panel-posts .item-actions .btn {
        flex: 1 1 0;
        min-width: 0;
        min-height: 34px;
        padding: 6px 8px;
        font-size: 12.5px;
      }

      /* ---------- খালি অবস্থা ---------- */
      #panel-posts .empty {
        padding: 42px 18px;
      }

      /* ---------- বড় স্ক্রিন ---------- */
      @media (min-width: 700px) {

        #panel-posts .posts-header {
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
        }

        #panel-posts .posts-search {
          width: 320px;
        }

        #panel-posts .post-item {
          grid-template-columns: 128px minmax(0, 1fr);
          column-gap: 16px;
          padding: 13px;
        }

        #panel-posts .post-thumb {
          width: 128px;
          height: 100px;
        }

        #panel-posts .post-footer {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        #panel-posts .item-actions .btn {
          flex: 0 0 auto;
          padding: 6px 14px;
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

        var id =
          entry[0];

        var post =
          entry[1] || {};

        var stats =
          postStats[id] || {};

        var published =
          post.status === "published";


        return (

          '<article class="post-item">' +


            /* -----------------------------------------------
               16:9 Image
            ----------------------------------------------- */

            (

              post.imageUrl

                ?

                '<div class="post-thumb">' +

                  '<img' +

                    ' src="' +
                      esc(post.imageUrl) +
                    '"' +

                    ' alt=""' +

                    ' loading="lazy"' +

                    ' onerror="' +

                      "this.parentElement.innerHTML='কোনো ছবি নেই';" +

                      "this.parentElement.classList.add('post-thumb-empty')" +

                    '"' +

                  '>' +

                '</div>'

                :

                '<div class="post-thumb post-thumb-empty">' +
                  'কোনো ছবি নেই' +
                '</div>'

            ) +


            '<div class="post-body">' +


              /* ---------------------------------------------
                 Title
              --------------------------------------------- */

              '<div class="post-top">' +

                '<h3>' +

                  esc(

                    post.title ||

                    "শিরোনামহীন"

                  ) +

                '</h3>' +


                '<span class="status-tag' +

                  (

                    published
                      ? ""
                      : " draft"

                  ) +

                '">' +

                  (

                    published
                      ? "প্রকাশিত"
                      : "ড্রাফট"

                  ) +

                '</span>' +

              '</div>' +


              /* ---------------------------------------------
                 Category + Date
              --------------------------------------------- */

              '<div class="post-meta">' +

                '<span class="meta-cat">' +

                  esc(

                    post.category ||

                    "সাধারণ"

                  ) +

                '</span>' +

                '<span class="meta-dot">·</span>' +

                '<span>' +

                  fmtDate(

                    post.createdAt

                  ) +

                '</span>' +

              '</div>' +


              /* ---------------------------------------------
                 Stats + Actions
              --------------------------------------------- */

              '<div class="post-footer">' +


                '<div class="post-engage">' +

                  '<span title="লাইক">' +

                    ICON_HEART +

                    '<b>' +

                      (

                        stats.likes ||

                        0

                      ) +

                    '</b>' +

                  '</span>' +


                  '<span title="কমেন্ট">' +

                    ICON_COMMENT +

                    '<b>' +

                      (

                        stats.comments ||

                        0

                      ) +

                    '</b>' +

                  '</span>' +


                  '<span title="ভিউ">' +

                    ICON_EYE +

                    '<b>' +

                      (

                        stats.views ||

                        0

                      ) +

                    '</b>' +

                  '</span>' +

                '</div>' +


                '<div class="item-actions">' +


                  /* Edit */

                  '<button' +

                    ' class="btn secondary small"' +

                    ' data-action="edit"' +

                    ' data-id="' +

                      esc(id) +

                    '"' +

                  '>' +

                    'এডিট' +

                  '</button>' +


                  /* Publish / Draft */

                  '<button' +

                    ' class="btn secondary small"' +

                    ' data-action="toggle"' +

                    ' data-id="' +

                      esc(id) +

                    '"' +

                  '>' +

                    (

                      published

                        ? "ড্রাফট করুন"

                        : "প্রকাশ করুন"

                    ) +

                  '</button>' +


                  /* Delete */

                  '<button' +

                    ' class="btn danger small"' +

                    ' data-action="delete"' +

                    ' data-id="' +

                      esc(id) +

                    '"' +

                  '>' +

                    'ডিলিট' +

                  '</button>' +


                '</div>' +

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