/* nav.js — shared header (logo.png + AR News Admin + menu) and bottom navigation for every page.
   Usage: remove the page's own header/bottom-nav HTML and add before </body> (after config.js):
       <script src="./nav.js"></script>
   - Highlights the current page automatically (by file name)
   - Menu lists every page; shows Login / Logout when window.auth (config.js) exists
   - A page with its own login panel can listen for the "ar:open-login" event */
(function () {
  "use strict";
  if (window.__arNavLoaded) return;
  window.__arNavLoaded = true;

  function ic(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }
  var I = {
    home: ic('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
    posts: ic('<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    stats: ic('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
    reports: ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>'),
    orders: ic('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
    ads: ic('<path d="m3 11 18-5v12L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'),
    users: ic('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    chat: ic('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    ai: ic('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    menu: ic('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    close: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    login: ic('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5M15 12H3"/>'),
    logout: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>'),
  };

  // f = file, t = short label (bottom bar), full = menu label, i = icon
  var PAGES = [
    { f: "index.html", t: "Home", full: "Home", i: I.home },
    { f: "post.html", t: "Posts", full: "Manage Posts", i: I.posts },
    { f: "create.html", t: "Create", full: "New Post", i: I.plus, fab: true },
    { f: "stats.html", full: "Statistics", i: I.stats },
    { f: "reports.html", t: "Reports", full: "Reports", i: I.reports },
    { f: "advertise.html", full: "Ad Orders", i: I.orders },
    { f: "ad.html", full: "Advertising", i: I.ads },
    { f: "user.html", t: "Users", full: "Users", i: I.users },
    { f: "contact.html", full: "User Chat", i: I.chat },
    { f: "drafts.html", full: "AI Drafts", i: I.ai },
  ];

  var file = (location.pathname.split("/").pop() || "index.html").toLowerCase() || "index.html";

  var css = [
    ":root{--arn-brand:#0b3d91;--arn-brand2:#1b5fd1;--arn-ink:#0f1b33;--arn-muted:#64748b;--arn-line:#e6eaf2;--arn-soft:#eef3fc}",
    ".arn-head,.arn-menu,.arn-bottom{font-family:system-ui,-apple-system,'Segoe UI','Noto Sans Bengali','Hind Siliguri',Roboto,sans-serif;-webkit-tap-highlight-color:transparent}",
    /* header */
    ".arn-head{position:sticky;top:0;z-index:10;height:64px;padding:0 max(16px,calc((100vw - 1100px)/2));display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--arn-line)}",
    ".arn-brand{display:flex;align-items:center;gap:11px;min-width:0;text-decoration:none;color:var(--arn-ink)}",
    ".arn-brand img{width:40px;height:40px;object-fit:contain;border-radius:11px;background:#fff;box-shadow:0 0 0 1px var(--arn-line)}",
    ".arn-brand b{font-size:17px;font-weight:800;letter-spacing:-.3px;white-space:nowrap}",
    ".arn-brand b i{font-style:normal;color:var(--arn-brand)}",
    ".arn-menu-btn{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--arn-line);background:#fff;border-radius:12px;color:var(--arn-ink);cursor:pointer;transition:background .15s,border-color .15s}",
    ".arn-menu-btn:hover{background:var(--arn-soft);border-color:#cfdcf5}",
    ".arn-menu-btn svg{width:22px;height:22px}",
    /* menu */
    ".arn-back{position:fixed;inset:0;z-index:24;background:rgba(10,20,45,.38);opacity:0;visibility:hidden;transition:opacity .22s,visibility .22s}",
    ".arn-back.show{opacity:1;visibility:visible}",
    ".arn-menu{position:fixed;z-index:25;top:72px;right:max(12px,calc((100vw - 1100px)/2));width:272px;max-height:calc(100vh - 150px);overflow-y:auto;padding:8px;background:#fff;border:1px solid var(--arn-line);border-radius:16px;box-shadow:0 18px 50px rgba(10,20,45,.18);opacity:0;visibility:hidden;transform:translateY(-8px) scale(.98);transform-origin:top right;transition:opacity .18s,transform .18s,visibility .18s}",
    ".arn-menu.show{opacity:1;visibility:visible;transform:none}",
    ".arn-menu-title{padding:8px 10px 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--arn-muted)}",
    ".arn-menu a,.arn-menu button{display:flex;align-items:center;gap:12px;width:100%;padding:10px;border:0;border-radius:11px;background:none;text-decoration:none;text-align:left;color:var(--arn-ink);font:inherit;font-size:14.5px;font-weight:550;cursor:pointer;transition:background .12s}",
    ".arn-menu a svg,.arn-menu button svg{flex:none;width:34px;height:34px;padding:8px;border-radius:10px;background:var(--arn-soft);color:var(--arn-brand)}",
    ".arn-menu a:hover,.arn-menu button:hover{background:#f4f7fc}",
    ".arn-menu a.on{background:var(--arn-soft);color:var(--arn-brand);font-weight:700}",
    ".arn-menu a.on svg{background:var(--arn-brand);color:#fff}",
    ".arn-menu hr{border:0;border-top:1px solid var(--arn-line);margin:6px 4px}",
    ".arn-menu button.out svg{background:#fdecec;color:#c62828}",
    /* bottom nav */
    ".arn-bottom{position:fixed;z-index:20;left:0;right:0;bottom:0;height:calc(66px + env(safe-area-inset-bottom));padding:0 max(6px,calc((100vw - 640px)/2)) env(safe-area-inset-bottom);display:flex;align-items:stretch;justify-content:space-around;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid var(--arn-line);box-shadow:0 -6px 24px rgba(10,20,45,.06)}",
    ".arn-bottom a{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-decoration:none;color:var(--arn-muted);font-size:11.5px;font-weight:600;transition:color .15s}",
    ".arn-bottom a svg{width:23px;height:23px;transition:transform .2s}",
    ".arn-bottom a:hover{color:var(--arn-brand)}",
    ".arn-bottom a.on{color:var(--arn-brand);font-weight:700}",
    ".arn-bottom a.on svg{transform:translateY(-1px)}",
    ".arn-bottom a.on::before{content:'';position:absolute;top:0;left:50%;width:28px;height:3px;margin-left:-14px;border-radius:0 0 4px 4px;background:var(--arn-brand)}",
    ".arn-bottom a.fab{margin-top:-20px}",
    ".arn-bottom a.fab .fc{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--arn-brand),var(--arn-brand2));color:#fff;border:4px solid #fff;box-shadow:0 8px 18px rgba(11,61,145,.38)}",
    ".arn-bottom a.fab .fc svg{width:24px;height:24px;stroke-width:2.2}",
    ".arn-bottom a.fab.on::before{display:none}",
    "body.arn-pad{padding-bottom:calc(86px + env(safe-area-inset-bottom))}",
    "@media(max-width:360px){.arn-brand b{font-size:15px}.arn-brand img{width:36px;height:36px}}",
    "@media(prefers-reduced-motion:reduce){.arn-menu,.arn-back,.arn-bottom a svg{transition:none}}",
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function build() {
    document.body.classList.add("arn-pad");

    var head = document.createElement("header");
    head.className = "arn-head";
    head.innerHTML =
      '<a class="arn-brand" href="./index.html"><img src="./logo.png" alt="AR News" onerror="this.style.display=\'none\'"><b>AR News <i>Admin</i></b></a>' +
      '<button class="arn-menu-btn" id="arnMenuBtn" type="button" aria-label="Open menu" aria-haspopup="true" aria-expanded="false">' + I.menu + "</button>";

    var back = document.createElement("div");
    back.className = "arn-back";

    var menu = document.createElement("nav");
    menu.className = "arn-menu";
    menu.setAttribute("aria-label", "Main menu");
    menu.innerHTML =
      '<div class="arn-menu-title">Navigation</div>' +
      PAGES.map(function (p) {
        return '<a href="./' + p.f + '"' + (p.f === file ? ' class="on" aria-current="page"' : "") + ">" + p.i + "<span>" + esc(p.full) + "</span></a>";
      }).join("") +
      '<hr><button type="button" id="arnAuthBtn" hidden></button>';

    var bottom = document.createElement("nav");
    bottom.className = "arn-bottom";
    bottom.setAttribute("aria-label", "Bottom navigation");
    bottom.innerHTML = PAGES.filter(function (p) { return p.t; }).map(function (p) {
      var on = p.f === file ? " on" : "";
      return '<a href="./' + p.f + '" class="' + (p.fab ? "fab" : "") + on + '"' + (on ? ' aria-current="page"' : "") + ">" +
        (p.fab ? '<span class="fc">' + p.i + "</span>" : p.i) + "<span>" + esc(p.t) + "</span></a>";
    }).join("");

    document.body.insertBefore(head, document.body.firstChild);
    document.body.appendChild(back);
    document.body.appendChild(menu);
    document.body.appendChild(bottom);

    var btn = document.getElementById("arnMenuBtn");
    function setOpen(open) {
      menu.classList.toggle("show", open);
      back.classList.toggle("show", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.innerHTML = open ? I.close : I.menu;
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!menu.classList.contains("show")); });
    back.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });

    // Login / Logout (when config.js has loaded window.auth)
    var authBtn = document.getElementById("arnAuthBtn");
    if (window.auth && window.auth.onAuthStateChanged) {
      window.auth.onAuthStateChanged(function (user) {
        authBtn.hidden = false;
        if (user) {
          authBtn.className = "out";
          authBtn.innerHTML = I.logout + "<span>Log out</span>";
          authBtn.onclick = function () {
            window.auth.signOut().then(function () { location.href = "./index.html"; });
          };
        } else {
          authBtn.className = "";
          authBtn.innerHTML = I.login + "<span>Admin login</span>";
          authBtn.onclick = function () {
            setOpen(false);
            if (file === "index.html") document.dispatchEvent(new Event("ar:open-login"));
            else location.href = "./index.html";
          };
        }
      });
    }
  }

  if (document.body) build();
  else document.addEventListener("DOMContentLoaded", build);
})();
