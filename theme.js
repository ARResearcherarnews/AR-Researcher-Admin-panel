/* theme.js — AR News Admin: নতুন ডিজাইন (ব্র্যান্ড নীল)
   সবার শেষে লোড হয়। মডিউলগুলোর (create/posts/reports/users/stats/ad/advertise) নিজস্ব স্টাইলের ওপর
   বসে চেহারা বদলায়; তাদের কোড বা কাজ বদলায় না।
   - পেজের শিরোনাম অংশ নীল "ব্যান্ড" হয় (ডেমোর মতো)
   - তালিকাগুলো (পোস্ট/রিপোর্ট/ইউজার) একটি সাদা কার্ডের ভেতর দাগ-টানা সারি
   - স্ট্যাটসের ভিজিট অংশ নীল হিরো কার্ড
   - ফর্মের ঘর ও বাটন বড়, ফোনে সহজে চাপা যায়
   সব রুলের আগে "body" বসানো, যাতে মডিউলের #panel-… রুলকে হারাতে পারে। */
(function () {
  "use strict";

  var PANELS = ["create", "posts", "stats", "advertise", "reports", "users", "ad"];
  function each(tpl) {
    return PANELS.map(function (p) { return tpl.replace(/PANEL/g, "#panel-" + p); }).join("\n");
  }

  var css = "";

  /* ---------- শেল ---------- */
  css += `
body .ar-nav{border-radius:0;box-shadow:none}
body .shell{padding-top:0}
body .panel{background:none;border:0;box-shadow:none;padding:0;margin-bottom:0}
`;

  /* ---------- নীল শিরোনাম ব্যান্ড ---------- */
  css += each(`
body PANEL .ar-band{margin:0 -14px 16px;padding:10px 20px 26px;background:var(--nav-bg);color:#fff;border:0;border-radius:0 0 28px 28px;box-shadow:none;display:block}
body PANEL .ar-band h2{margin:0 0 4px;color:#fff;font-family:var(--font-display);font-size:30px;line-height:1.25;font-weight:400}
body PANEL .ar-band .sub{margin:0;color:#c9d8f5;font-size:13.5px;line-height:1.55}
body PANEL .ar-band .posts-header-text{margin:0}
body PANEL .ar-band .posts-search{margin:16px 0 0;width:100%}
body PANEL .ar-band .search-box{margin:16px 0 0}
body PANEL .ar-band input[type="search"],
body PANEL .ar-band .search-box input,
body PANEL .ar-band .posts-search input{width:100%;height:auto;min-height:50px;padding:0 16px;border:0;border-radius:16px;background:#fff;color:#14201f;font-size:15px}
body PANEL .ar-band input::placeholder{color:#5e6a80}
`);

  /* ---------- সাদা কার্ড (ফর্ম ও বাক্স) ---------- */
  css += `
body #panel-create .create-form,
body #panel-ad .ad-box,
body #panel-advertise .adv-box,
body #panel-stats .st-box{background:var(--surface);border:0;border-radius:22px;box-shadow:var(--shadow);padding:18px;margin-bottom:14px}
body #panel-stats .st-box{padding:18px 18px 6px}
body #panel-ad .ad-box h2,body #panel-advertise .adv-box h2,body #panel-stats .st-h{font-family:var(--font-display);font-weight:400}
`;

  /* ---------- তালিকা = একটি কার্ড, ভেতরে দাগ-টানা সারি ---------- */
  css += `
body #panel-posts .post-list,
body #panel-reports .report-list,
body #panel-users .user-list{display:block;gap:0;background:var(--surface);border-radius:22px;box-shadow:var(--shadow);overflow:hidden}
body #panel-posts .post-item,
body #panel-reports .report-item,
body #panel-users .user-row{border:0;border-top:1px solid var(--line);border-left:0;border-radius:0;box-shadow:none;background:none}
body #panel-posts .post-item:first-child,
body #panel-reports .report-item:first-child,
body #panel-users .user-row:first-child{border-top:0}
body #panel-posts #post-list .empty,body #panel-reports .empty,body #panel-users .empty{border:0;background:none}

/* পোস্ট সারি */
body #panel-posts .post-item{padding:14px 14px 12px;grid-template-columns:72px minmax(0,1fr);column-gap:14px}
body #panel-posts .post-thumb{width:72px;height:72px;border-radius:14px}
body #panel-posts .post-top h3{font-size:16px;line-height:1.45}
body #panel-posts .status-tag{background:#dcf3e4;color:#166534;font-weight:700}
body #panel-posts .status-tag.draft{background:var(--warn-soft);color:#92400e}
body #panel-posts .meta-cat{color:#0f766e;font-weight:700}
body #panel-posts .post-footer{border-top:0;margin-top:6px;padding-top:2px}
body #panel-posts .item-actions .btn{min-height:40px;border-radius:12px;font-size:13px}
@media(min-width:700px){body #panel-posts .post-item{grid-template-columns:96px minmax(0,1fr)}body #panel-posts .post-thumb{width:96px;height:80px}}

/* রিপোর্ট সারি */
body #panel-reports .report-item{padding:16px}
body #panel-reports .reason-tag{background:var(--danger-soft);color:var(--danger);font-weight:700;border-radius:999px}
body #panel-reports .item-actions .btn{min-height:44px;border-radius:12px}

/* ইউজার সারি */
body #panel-users .user-row{padding:12px 16px;gap:12px}
body #panel-users .user-avatar{background:var(--brand-soft);color:var(--brand-ink);font-weight:700}
body #panel-users .user-actions .btn{min-height:44px;border-radius:12px}
`;

  /* ---------- স্ট্যাটস: নীল হিরো কার্ড + সাদা সংখ্যা-কার্ড ---------- */
  css += `
body #panel-stats .st-visits{background:var(--nav-bg);border:0;border-radius:24px;gap:0;box-shadow:var(--shadow)}
body #panel-stats .st-visits .stat-card{background:none;padding:20px 18px 18px}
body #panel-stats .st-visits .stat-card + .stat-card{border-left:1px solid rgba(255,255,255,.22)}
body #panel-stats .st-visits .stat-card .label{color:#c9d8f5;font-size:13px}
body #panel-stats .st-visits .stat-card strong{color:#fff;font-size:44px;line-height:1.1}
body #panel-stats .st-counts{background:var(--surface);border:0;border-radius:22px;gap:0;box-shadow:var(--shadow)}
body #panel-stats .st-counts .stat-card{background:none;text-align:center;padding:16px 8px}
body #panel-stats .st-counts .stat-card + .stat-card{border-left:1px solid var(--line)}
body #panel-stats .st-counts .stat-card strong{font-size:30px}
body #panel-stats .top-post-row .rank{border-radius:50%;width:30px;height:30px}
`;

  /* ---------- ফর্ম ও বাটন ---------- */
  css += `
body .field input,body .field select{min-height:50px;font-size:16px;border-radius:12px}
body .field textarea{font-size:16px;border-radius:12px}
body #panel-create .form-actions{flex-direction:column}
body #panel-create .form-actions .btn,body #panel-create #save-btn{flex:none;width:100%;min-height:52px;border-radius:14px;font-size:16px}
body #panel-create #save-btn{font-weight:700}
@media(min-width:640px){
  body #panel-create .form-actions{flex-direction:row}
  body #panel-create .form-actions .btn,body #panel-create #save-btn{width:auto;min-height:46px;padding-left:28px;padding-right:28px}
}

/* ফিল্টার চিপ: ফোনে পাশে স্ক্রল করা যায় */
body .filter-row{flex-wrap:nowrap;overflow-x:auto;margin-left:-14px;margin-right:-14px;padding:0 14px 6px;scrollbar-width:none}
body .filter-row::-webkit-scrollbar{display:none}
body .filter-btn{flex:none}
body .filter-btn.active{background:var(--brand);border-color:var(--brand);color:#fff}
`;

  /* ---------- ডার্ক থিম ---------- */
  css += `
:root[data-theme="dark"] body #panel-posts .status-tag{background:#123a2c;color:#86efac}
:root[data-theme="dark"] body #panel-posts .status-tag.draft{background:var(--warn-soft);color:var(--warn)}
:root[data-theme="dark"] body #panel-posts .meta-cat{color:#5eead4}
:root[data-theme="dark"] body .filter-btn.active{color:#06143a}
`;

  /* ---------- ডেস্কটপ ---------- */
  css += `
@media(min-width:900px){
  body .shell{padding-top:30px}
  ${PANELS.map(function (p) { return "body #panel-" + p + " .ar-band"; }).join(",\n  ")}{margin:0 0 20px;padding:24px 28px 28px;border-radius:24px}
  body .filter-row{margin-left:0;margin-right:0;padding-left:0;padding-right:0;flex-wrap:wrap}
}
`;

  var style = document.createElement("style");
  style.id = "ar-theme-v2";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- শিরোনাম অংশকে "ব্যান্ড" বানানো ---------- */
  var HEAD_SEL = ".posts-header, .create-header, .st-head, .adv-head";

  function band(panel) {
    if (!panel || panel.querySelector(".ar-band")) return;

    // ১) মডিউলের নিজের হেডার-বাক্স থাকলে সেটাই ব্যান্ড (পোস্ট, নতুন পোস্ট, স্ট্যাটস, বিজ্ঞাপন-অর্ডার)
    var head = panel.querySelector(HEAD_SEL);
    if (head) { head.classList.add("ar-band"); return; }

    // ২) বিজ্ঞাপন প্যানেলে আলাদা শিরোনাম নেই — একটি যোগ করা হয়
    if (panel.id === "panel-ad") {
      var b = document.createElement("div");
      b.className = "ar-band";
      b.innerHTML = '<h2>বিজ্ঞাপন</h2><p class="sub">বিজ্ঞাপন তৈরি, এডিট ও কার্ড দেখানোর ব্যবধান ঠিক করুন।</p>';
      panel.insertBefore(b, panel.firstChild);
      return;
    }

    // ৩) রিপোর্ট ও ইউজার: সরাসরি h2 + .sub (+ সার্চ বক্স) একসাথে মুড়ে দিই
    var h2 = panel.querySelector(":scope > h2");
    if (!h2) return;
    var wrap = document.createElement("div");
    wrap.className = "ar-band";
    panel.insertBefore(wrap, h2);
    wrap.appendChild(h2);
    var n = wrap.nextElementSibling;
    while (n && (n.matches("p.sub") || n.classList.contains("search-box"))) {
      var next = n.nextElementSibling;
      wrap.appendChild(n);
      n = next;
    }
  }

  var app = document.getElementById("app");
  var pending = false;
  function run() {
    pending = false;
    if (!app) return;
    app.querySelectorAll(".panel").forEach(band);
  }
  function schedule() {
    if (pending) return;
    pending = true;
    (window.requestAnimationFrame || setTimeout)(run);
  }
  if (app) {
    new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
    schedule();
  }
  document.addEventListener("admin:ready", schedule);
})();
