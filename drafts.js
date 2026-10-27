/* drafts.js — AI ড্রাফট রিভিউ (শুধু অ্যাডমিন)
   Worker যে খবরগুলো যাচাই করে Firebase-এর `drafts`-এ জমা রাখে, সেগুলো এখানে দেখা, সম্পাদনা,
   অনুমোদন (→ `posts`-এ প্রকাশ) বা বাতিল করা যায়। অনুমোদন না দিলে কিছুই প্রকাশ হয় না।
   হেডারে একটা বাটন বসে (#nav-actions-এ); চাপলে পুরো স্ক্রিনের প্যানেল খোলে। login.js বদলাতে হয় না। */
(function () {
  "use strict";

  // create.js-এর মতোই একই ImgBB key (AI-ছবি ও ছবি আপলোডের জন্য)
  var IMGBB_API_KEY = "99e869a5e930f58f491beb611c8f1bcd";

  var VERIFY_LABEL = {
    verified: "যাচাইকৃত",
    partially_verified: "আংশিক যাচাইকৃত",
    unverified: "অযাচাইকৃত",
    false_misleading: "ভুল/বিভ্রান্তিকর",
  };
  var REVIEW_LABEL = {
    pending_review: "রিভিউয়ের অপেক্ষায়",
    review_required: "রিভিউ প্রয়োজন",
    approved: "প্রকাশিত",
    rejected: "বাতিল",
  };

  var user = null;
  var drafts = {};
  var autoState = null;
  var autoLog = null;
  var view = "pending"; // pending | archive
  var openId = null;
  var imageAi = false;
  var overlay = null;
  var stylesAdded = false;

  /* ---------- ছোট সহায়ক ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toArr(x) {
    if (!x) return [];
    return Array.isArray(x) ? x.filter(Boolean) : Object.keys(x).map(function (k) { return x[k]; });
  }
  function safeUrl(u) {
    return /^https?:\/\//i.test(String(u || "")) ? String(u) : "";
  }
  function fmt(ms) {
    if (!ms) return "";
    try {
      return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(Number(ms)));
    } catch (e) { return ""; }
  }
  function $(id) { return document.getElementById(id); }
  function isPending(d) { return d.reviewStatus === "pending_review" || d.reviewStatus === "review_required"; }

  function ensureStyles() {
    if (stylesAdded || $("ar-drafts-styles")) return;
    stylesAdded = true;
    var s = document.createElement("style");
    s.id = "ar-drafts-styles";
    s.textContent = `
      #ar-drafts-nav-btn{position:relative;width:44px;height:44px;padding:0;border-radius:12px;margin-right:8px;
        background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:var(--nav-ink,#fff);
        display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
      #ar-drafts-nav-btn svg{width:20px;height:20px}
      #ar-drafts-nav-btn.dr-float{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:40;
        background:var(--brand);color:#fff;border:0;border-radius:50%;box-shadow:0 4px 14px rgba(11,61,145,.35)}
      #ar-drafts-nav-btn .dr-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;
        background:var(--danger,#b42318);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
      #ar-drafts-nav-btn .dr-badge[hidden]{display:none}

      #ar-drafts-overlay{position:fixed;inset:0;z-index:70;background:var(--bg);color:var(--ink);overflow-y:auto;
        padding:calc(12px + env(safe-area-inset-top,0px)) 14px calc(28px + env(safe-area-inset-bottom,0px))}
      #ar-drafts-overlay[hidden]{display:none}
      #ar-drafts-overlay .dr-wrap{max-width:780px;margin:0 auto}
      #ar-drafts-overlay .dr-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
      #ar-drafts-overlay .dr-top h2{flex:1;margin:0;font-family:var(--font-display,Georgia,serif);font-weight:400;font-size:22px}
      #ar-drafts-overlay .dr-stats{font-size:12.5px;color:var(--muted);line-height:1.7;margin-bottom:10px}
      #ar-drafts-overlay .dr-err{background:var(--danger-soft);color:var(--danger);border-radius:10px;padding:8px 11px;font-size:12.5px;margin-bottom:10px;line-height:1.6;overflow-wrap:anywhere}
      #ar-drafts-overlay .dr-seg{display:flex;gap:8px;margin:10px 0 12px}
      #ar-drafts-overlay .dr-seg button{flex:1;min-height:42px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font:inherit;font-weight:600;font-size:13.5px;cursor:pointer}
      #ar-drafts-overlay .dr-seg button.on{background:var(--brand-soft);color:var(--brand-ink);border-color:var(--brand)}
      #ar-drafts-overlay .dr-list{display:grid;gap:10px}
      #ar-drafts-overlay .dr-item{display:block;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;
        background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px;box-shadow:var(--shadow)}
      #ar-drafts-overlay .dr-item.rr{border-left:4px solid var(--warn)}
      #ar-drafts-overlay .dr-item h3{margin:7px 0 5px;font-size:15.5px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}
      #ar-drafts-overlay .dr-meta{font-size:12px;color:var(--muted);line-height:1.6}
      #ar-drafts-overlay .dr-pill{display:inline-block;font-size:11.5px;font-weight:700;padding:2px 10px;border-radius:999px;margin-right:6px;background:var(--brand-soft);color:var(--brand-ink)}
      #ar-drafts-overlay .st-verified{background:#dcfce7;color:#166534}
      #ar-drafts-overlay .st-partially_verified{background:var(--warn-soft);color:var(--warn)}
      #ar-drafts-overlay .st-unverified{background:var(--line);color:var(--muted)}
      #ar-drafts-overlay .st-false_misleading,#ar-drafts-overlay .rv-review_required{background:var(--danger-soft);color:var(--danger)}
      :root[data-theme="dark"] #ar-drafts-overlay .st-verified{background:#123a2c;color:#86efac}
      #ar-drafts-overlay .dr-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:var(--shadow)}
      #ar-drafts-overlay .dr-card h4{margin:0 0 8px;font-size:14px}
      #ar-drafts-overlay .dr-warn{background:var(--warn-soft);color:var(--warn);border-radius:10px;padding:9px 11px;font-size:13px;line-height:1.6;margin-bottom:10px}
      #ar-drafts-overlay .dr-claim{border-top:1px solid var(--line);padding:9px 0;font-size:13.5px;line-height:1.6;overflow-wrap:anywhere}
      #ar-drafts-overlay .dr-claim:first-of-type{border-top:0}
      #ar-drafts-overlay .dr-claim small,#ar-drafts-overlay .dr-note{display:block;color:var(--muted);font-size:12.5px;line-height:1.6}
      #ar-drafts-overlay ul.dr-links{margin:0;padding-left:18px;font-size:13px;line-height:1.8}
      #ar-drafts-overlay ul.dr-links a{color:var(--brand-ink);overflow-wrap:anywhere}
      #ar-drafts-overlay .dr-f{margin-bottom:12px}
      #ar-drafts-overlay .dr-f label{display:block;font-size:12.5px;font-weight:600;color:var(--muted);margin-bottom:5px}
      #ar-drafts-overlay .dr-f input[type=text],#ar-drafts-overlay .dr-f textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;
        padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)}
      #ar-drafts-overlay .dr-f textarea{line-height:1.7;min-height:90px;resize:vertical}
      #ar-drafts-overlay #dr-content{min-height:280px}
      #ar-drafts-overlay .dr-chk{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin:6px 0;line-height:1.5}
      #ar-drafts-overlay .dr-imgprev{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-top:8px}
      #ar-drafts-overlay .dr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
      #ar-drafts-overlay .dr-actions .btn{flex:1 1 auto;min-height:46px}
      #ar-drafts-overlay .dr-empty{color:var(--muted);text-align:center;padding:34px 12px;font-size:13.5px;border:1px dashed var(--line);border-radius:14px}
    `;
    document.head.appendChild(s);
  }

  /* ---------- হেডার বাটন ও ব্যাজ ---------- */
  function pendingCount() {
    return Object.keys(drafts).filter(function (k) { return isPending(drafts[k]); }).length;
  }
  function updateBadge() {
    var b = $("dr-nav-badge");
    if (!b) return;
    var n = pendingCount();
    b.textContent = n > 99 ? "99+" : String(n);
    b.hidden = n === 0;
  }
  function mountButton() {
    if ($("ar-drafts-nav-btn")) return;
    var host = $("nav-actions");
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "ar-drafts-nav-btn";
    btn.title = "AI ড্রাফট";
    btn.setAttribute("aria-label", "AI ড্রাফট রিভিউ");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>' +
      '<span class="dr-badge" id="dr-nav-badge" hidden></span>';
    btn.addEventListener("click", openOverlay);
    if (host) host.insertBefore(btn, host.firstChild);
    else { btn.classList.add("dr-float"); document.body.appendChild(btn); }
    updateBadge();
  }

  /* ---------- ওভারলে ---------- */
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "ar-drafts-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="dr-wrap" id="dr-wrap"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", onClick);
    overlay.addEventListener("input", function (e) {
      if (e.target && e.target.id === "dr-image") { imageAi = false; updatePreview(); }
    });
    overlay.addEventListener("change", function (e) {
      if (e.target && e.target.id === "dr-file") uploadFile(e.target);
    });
    return overlay;
  }
  function openOverlay() {
    ensureOverlay();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    render();
  }
  function closeOverlay() {
    if (!overlay) return;
    overlay.hidden = true;
    openId = null;
    document.body.style.overflow = "";
  }

  function render() {
    if (!overlay || overlay.hidden) return;
    var wrap = $("dr-wrap");
    if (openId && drafts[openId]) {
      if (wrap.getAttribute("data-open") !== openId) {
        wrap.innerHTML = detailHtml(openId, drafts[openId]);
        wrap.setAttribute("data-open", openId);
        imageAi = !!drafts[openId].imageAi;
        updatePreview();
        overlay.scrollTop = 0;
      }
      return; // সম্পাদনার সময় ফর্ম নতুন করে আঁকা হয় না
    }
    openId = null;
    wrap.removeAttribute("data-open");
    wrap.innerHTML = listHtml();
  }

  /* ---------- তালিকা ---------- */
  function statsHtml() {
    var h = "";
    if (autoState) {
      h +=
        '<div class="dr-stats">আজ (' + esc(autoState.date) + "): শনাক্ত <b>" + (autoState.detected || 0) + "</b> · যাচাই <b>" + (autoState.verified || 0) +
        "</b> · ড্রাফট <b>" + (autoState.drafted || 0) + "</b> · রিভিউ প্রয়োজন <b>" + (autoState.reviewRequired || 0) + "</b>" +
        (autoState.lastRun ? "<br>সর্বশেষ চলেছে: " + esc(fmt(autoState.lastRun)) : "") + "</div>";
    } else {
      h += '<div class="dr-stats">এখনো কোনো অটো-রান হয়নি।</div>';
    }
    if (autoLog && autoLog.error) {
      h += '<div class="dr-err">⚠ সর্বশেষ ত্রুটি (' + esc(fmt(autoLog.at)) + "): " + esc(autoLog.error) + "</div>";
    }
    return h;
  }

  function listHtml() {
    var ids = Object.keys(drafts)
      .filter(function (id) { return view === "pending" ? isPending(drafts[id]) : !isPending(drafts[id]); })
      .sort(function (a, b) { return (drafts[b].createdAt || 0) - (drafts[a].createdAt || 0); });

    var items = ids.map(function (id) {
      var d = drafts[id];
      var rr = d.reviewStatus === "review_required";
      return (
        '<button type="button" class="dr-item' + (rr ? " rr" : "") + '" data-act="open" data-id="' + esc(id) + '">' +
          '<span class="dr-pill st-' + esc(d.verificationStatus || "unverified") + '">' + esc(VERIFY_LABEL[d.verificationStatus] || "অযাচাইকৃত") + "</span>" +
          '<span class="dr-pill rv-' + esc(d.reviewStatus) + '">' + esc(REVIEW_LABEL[d.reviewStatus] || d.reviewStatus) + "</span>" +
          "<h3>" + esc(d.title || "(শিরোনাম নেই)") + "</h3>" +
          '<div class="dr-meta">' + esc(d.category || "") + (d.category ? " · " : "") + esc(fmt(d.createdAt)) +
            " · উৎস " + toArr(d.event && d.event.outlets).length + "টি</div>" +
        "</button>"
      );
    }).join("");

    return (
      '<div class="dr-top"><h2>AI ড্রাফট</h2>' +
        '<button type="button" class="btn small" data-act="run" id="dr-run">এখনই চালান</button>' +
        '<button type="button" class="btn ghost small" data-act="close">বন্ধ</button></div>' +
      statsHtml() +
      '<div class="msg" id="dr-runmsg" style="margin:0 0 6px"></div>' +
      '<div class="dr-seg"><button type="button" data-act="view" data-v="pending" class="' + (view === "pending" ? "on" : "") + '">অপেক্ষমাণ (' + pendingCount() + ')</button>' +
      '<button type="button" data-act="view" data-v="archive" class="' + (view === "archive" ? "on" : "") + '">প্রকাশিত / বাতিল</button></div>' +
      (items ? '<div class="dr-list">' + items + "</div>" : '<div class="dr-empty">এখানে কিছু নেই।</div>')
    );
  }

  /* ---------- বিস্তারিত ---------- */
  function linkList(arr) {
    return (
      '<ul class="dr-links">' +
      arr.map(function (s) {
        var u = safeUrl(s.url);
        var label = esc(s.title || s.name || s.url || "লিংক");
        return "<li>" + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + label + "</a>" : label) + "</li>";
      }).join("") + "</ul>"
    );
  }

  function detailHtml(id, d) {
    var claims = toArr(d.claims);
    var warnings = toArr(d.warnings);
    var unc = toArr(d.uncertainties);
    var sources = toArr(d.sources);
    var outlets = toArr(d.event && d.event.outlets);
    var rr = d.reviewStatus === "review_required";
    var done = d.reviewStatus === "approved" || d.reviewStatus === "rejected";

    var claimsHtml = claims.map(function (c) {
      return (
        '<div class="dr-claim"><span class="dr-pill st-' + esc(c.status) + '">' + esc(VERIFY_LABEL[c.status] || c.status) + "</span> " + esc(c.claim) +
        (c.evidence ? "<small>প্রমাণ: " + esc(c.evidence) + "</small>" : "<small>প্রমাণ পাওয়া যায়নি</small>") +
        (toArr(c.supportedBy).length ? "<small>সমর্থন করছে: " + esc(toArr(c.supportedBy).join(", ")) + "</small>" : "") +
        (toArr(c.contradictedBy).length ? "<small>বিরোধিতা করছে: " + esc(toArr(c.contradictedBy).join(", ")) + "</small>" : "") +
        "</div>"
      );
    }).join("");

    var verifyBox =
      '<div class="dr-card"><h4>যাচাইয়ের ফল</h4>' +
      '<span class="dr-pill st-' + esc(d.verificationStatus || "unverified") + '">' + esc(VERIFY_LABEL[d.verificationStatus] || "অযাচাইকৃত") + "</span>" +
      '<span class="dr-note" style="margin-top:6px">স্বাধীন উৎস (AI-এর হিসাব): ' + (d.independentSources || 0) + " · মূল বিবৃতি/নথি পাওয়া গেছে: " + (d.primarySource ? "হ্যাঁ" : "না") +
      "<br>AI-এর যাচাই সহায়ক মাত্র, প্রমাণ নয় — প্রকাশের আগে নিজে মিলিয়ে নিন।</span>" +
      (rr ? '<div class="dr-warn" style="margin-top:10px">⚠ ' + esc(d.reviewNote || "রিভিউ প্রয়োজন") + "</div>" : "") +
      (warnings.length ? '<div class="dr-warn" style="margin-top:10px"><b>সতর্কতা / পরস্পরবিরোধী তথ্য:</b><br>' + warnings.map(esc).join("<br>") + "</div>" : "") +
      (unc.length ? '<div class="dr-note" style="margin-top:10px"><b>অনিশ্চিত বিষয়:</b><br>' + unc.map(esc).join("<br>") + "</div>" : "") +
      "</div>" +
      (claimsHtml ? '<div class="dr-card"><h4>গুরুত্বপূর্ণ দাবি ও প্রমাণ</h4>' + claimsHtml + "</div>" : "") +
      (sources.length ? '<div class="dr-card"><h4>যাচাইয়ে পাওয়া সূত্র</h4>' + linkList(sources) + "</div>" : "") +
      (outlets.length ? '<div class="dr-card"><h4>মূল উৎস (শুধু দেখার জন্য — কপি করা যাবে না)</h4>' + linkList(outlets) + "</div>" : "");

    var form =
      '<div class="dr-card"><h4>' + (rr ? "কোনো লেখা তৈরি হয়নি" : "সংবাদ (সম্পাদনা করা যায়)") + "</h4>" +
      field("dr-title", "শিরোনাম", d.title) +
      field("dr-category", "ক্যাটাগরি", d.category) +
      area("dr-summary", "সারসংক্ষেপ", d.summary) +
      area("dr-content", "বিস্তারিত লেখা", d.content) +
      field("dr-seotitle", "SEO শিরোনাম", d.seoTitle) +
      area("dr-meta", "মেটা বিবরণ", d.metaDescription) +
      field("dr-keywords", "কীওয়ার্ড (কমা দিয়ে)", toArr(d.keywords).join(", ")) +
      field("dr-slug", "Slug", d.slug) +
      '<div class="dr-f"><label for="dr-image">ছবির লিংক</label><input type="text" id="dr-image" inputmode="url" value="' + esc(d.imageUrl || "") + '">' +
        '<img class="dr-imgprev" id="dr-imgprev" alt="" hidden>' +
        '<div class="dr-actions" style="margin-top:8px"><button type="button" class="btn secondary small" data-act="genimg" id="dr-genimg">AI দিয়ে ছবি বানান</button></div>' +
        '<input type="file" id="dr-file" accept="image/*" style="margin-top:8px;font-size:13px">' +
        '<div class="msg" id="dr-imgmsg"></div></div>' +
      area("dr-imgprompt", "ছবির বর্ণনা (ইংরেজি, AI-এর জন্য)", d.imagePrompt) +
      area("dr-social", "সামাজিক মাধ্যমের পোস্ট (প্রকাশ হবে না, শুধু কপির জন্য)", d.socialPost) +
      "</div>";

    var pub =
      done
        ? '<div class="dr-card"><div class="dr-note">এই ড্রাফট ' + esc(REVIEW_LABEL[d.reviewStatus]) + " হয়েছে" + (d.publishedAt ? " (" + esc(fmt(d.publishedAt)) + ")" : "") + "।</div></div>"
        : '<div class="dr-card">' +
            '<label class="dr-chk"><input type="checkbox" id="dr-addsrc" checked> লেখার শেষে তথ্যসূত্রের নাম যোগ করুন</label>' +
            '<label class="dr-chk"><input type="checkbox" id="dr-addnote" checked> "AI সহায়তায় তৈরি, সম্পাদক যাচাইকৃত" নোট যোগ করুন (AI-ছবি হলে ছবির নোটসহ)</label>' +
            '<div class="dr-actions">' +
              (rr ? '<button type="button" class="btn secondary" data-act="manual">নিজে লিখুন (Create ট্যাবে)</button>' : "") +
              '<button type="button" class="btn secondary" data-act="save">সংরক্ষণ</button>' +
              '<button type="button" class="btn" data-act="publish"' + (rr ? " disabled" : "") + ">অনুমোদন ও প্রকাশ</button>" +
              '<button type="button" class="btn danger" data-act="reject">বাতিল (Reject)</button>' +
            "</div>" +
          '<div class="msg" id="dr-msg"></div></div>';

    return (
      '<div class="dr-top"><button type="button" class="btn ghost small" data-act="back">← তালিকা</button><h2>ড্রাফট রিভিউ</h2></div>' +
      '<div><span class="dr-pill rv-' + esc(d.reviewStatus) + '">' + esc(REVIEW_LABEL[d.reviewStatus] || d.reviewStatus) + "</span>" +
      '<span class="dr-meta">' + esc(fmt(d.createdAt)) + "</span></div><div style=\"height:10px\"></div>" +
      verifyBox + form + pub
    );
  }

  function field(id, label, val) {
    return '<div class="dr-f"><label for="' + id + '">' + esc(label) + '</label><input type="text" id="' + id + '" value="' + esc(val || "") + '"></div>';
  }
  function area(id, label, val) {
    return '<div class="dr-f"><label for="' + id + '">' + esc(label) + '</label><textarea id="' + id + '">' + esc(val || "") + "</textarea></div>";
  }
  function val(id) { var el = $(id); return el ? el.value.trim() : ""; }
  function setMsg(id, text, cls) { var el = $(id); if (el) { el.textContent = text; el.className = "msg" + (cls ? " " + cls : ""); } }

  function updatePreview() {
    var img = $("dr-imgprev");
    if (!img) return;
    var u = safeUrl(val("dr-image"));
    if (!u) { img.hidden = true; return; }
    img.onload = function () { img.hidden = false; };
    img.onerror = function () { img.hidden = true; };
    img.src = u;
  }

  function readForm() {
    return {
      title: val("dr-title"),
      category: val("dr-category") || "সাধারণ",
      summary: val("dr-summary"),
      content: val("dr-content"),
      seoTitle: val("dr-seotitle"),
      metaDescription: val("dr-meta"),
      keywords: val("dr-keywords").split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 10),
      slug: val("dr-slug"),
      imageUrl: safeUrl(val("dr-image")),
      imagePrompt: val("dr-imgprompt"),
      socialPost: val("dr-social"),
    };
  }

  /* ---------- Worker ও ImgBB ---------- */
  function getToken() {
    var u = window.firebase && window.firebase.auth && window.firebase.auth().currentUser;
    if (!u) return Promise.reject(new Error("লগইন পাওয়া যায়নি"));
    return u.getIdToken();
  }
  // অ্যাডমিন প্যানেল GitHub Pages-এ, তাই Worker-এর পূর্ণ ঠিকানা লাগে (ডোমেইন Worker-এ নিলে "https://arnews.info" দিন)
  var WORKER_BASE = "https://ar-news.abdulrohimrire019.workers.dev";

  function callWorker(path, body) {
    return getToken().then(function (token) {
      return fetch(WORKER_BASE + path, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + token },
        body: JSON.stringify(body || {}),
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || "সার্ভার ত্রুটি " + res.status);
        return data;
      });
    });
  }
  function uploadToImgbb(form) {
    return fetch("https://api.imgbb.com/1/upload?key=" + IMGBB_API_KEY, { method: "POST", body: form })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success || !data.data || !data.data.url) throw new Error((data && data.error && data.error.message) || "আপলোড ব্যর্থ");
        return data.data.url;
      });
  }

  function runAuto() {
    var btn = $("dr-run");
    if (btn) btn.disabled = true;
    setMsg("dr-runmsg", "চলছে… (এক-দুই মিনিট লাগতে পারে)", "");
    callWorker("/api/ai/auto-run", {})
      .then(function (r) {
        var lines = toArr(r.results).map(function (x) {
          if (x.note) return x.note;
          var o = { drafted: "ড্রাফট তৈরি", review_required: "রিভিউ প্রয়োজন", skipped_old: "পুরোনো খবর, বাদ" }[x.outcome] || x.outcome;
          return o + ": " + (x.title || x.event || "");
        });
        setMsg("dr-runmsg", "শেষ। " + (lines.join(" | ") || "নতুন কিছু হয়নি"), "ok");
      })
      .catch(function (e) { setMsg("dr-runmsg", "চালানো যায়নি: " + e.message, "bad"); })
      .then(function () { var b = $("dr-run"); if (b) b.disabled = false; });
  }

  function genImage() {
    var prompt = val("dr-imgprompt");
    if (!prompt) { setMsg("dr-imgmsg", "আগে ছবির বর্ণনা (ইংরেজি) লিখুন।", "bad"); return; }
    var btn = $("dr-genimg");
    btn.disabled = true;
    setMsg("dr-imgmsg", "ছবি বানানো হচ্ছে…", "");
    callWorker("/api/ai/image", { prompt: prompt })
      .then(function (r) {
        var b64 = String(r.image || "").split(",")[1];
        if (!b64) throw new Error("ছবি পাওয়া যায়নি");
        setMsg("dr-imgmsg", "আপলোড হচ্ছে…", "");
        var fd = new FormData();
        fd.append("image", b64);
        return uploadToImgbb(fd);
      })
      .then(function (url) {
        $("dr-image").value = url;
        imageAi = true;
        updatePreview();
        setMsg("dr-imgmsg", "✓ AI-নির্মিত ছবি বসেছে। প্রকাশের নোটে এটা উল্লেখ থাকবে।", "ok");
      })
      .catch(function (e) { setMsg("dr-imgmsg", "ছবি তৈরি হয়নি: " + e.message, "bad"); })
      .then(function () { var b = $("dr-genimg"); if (b) b.disabled = false; });
  }

  function uploadFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!file.type || file.type.indexOf("image/") !== 0) { setMsg("dr-imgmsg", "শুধু ছবি ফাইল দিন।", "bad"); input.value = ""; return; }
    setMsg("dr-imgmsg", "আপলোড হচ্ছে…", "");
    var fd = new FormData();
    fd.append("image", file);
    uploadToImgbb(fd)
      .then(function (url) {
        $("dr-image").value = url;
        imageAi = false;
        updatePreview();
        setMsg("dr-imgmsg", "✓ ছবি আপলোড হয়েছে।", "ok");
      })
      .catch(function (e) { setMsg("dr-imgmsg", "আপলোড হয়নি: " + e.message, "bad"); })
      .then(function () { input.value = ""; });
  }

  /* ---------- সংরক্ষণ / প্রকাশ / বাতিল ---------- */
  function draftPatch(f) {
    return {
      title: f.title, category: f.category, summary: f.summary, content: f.content, seoTitle: f.seoTitle,
      metaDescription: f.metaDescription, keywords: f.keywords, slug: f.slug, imageUrl: f.imageUrl,
      imagePrompt: f.imagePrompt, socialPost: f.socialPost, imageAi: imageAi, updatedAt: Date.now(),
    };
  }

  function saveDraft() {
    var f = readForm();
    window.rtdb.ref("drafts/" + openId).update(draftPatch(f))
      .then(function () { setMsg("dr-msg", "সংরক্ষণ হয়েছে ✓", "ok"); })
      .catch(function (e) { setMsg("dr-msg", "সংরক্ষণ করা যায়নি: " + e.message, "bad"); });
  }

  function publish() {
    var id = openId;
    var d = drafts[id];
    var f = readForm();
    if (!f.title || !f.content) { setMsg("dr-msg", "শিরোনাম ও বিস্তারিত লেখা ছাড়া প্রকাশ করা যাবে না।", "bad"); return; }
    var st = d.verificationStatus || "unverified";
    var q = st === "verified"
      ? "এই খবরটি এখনই প্রকাশ করবেন?"
      : "এই খবরের যাচাই-স্ট্যাটাস: " + (VERIFY_LABEL[st] || st) + "।\nতবুও প্রকাশ করবেন?";
    if (!window.confirm(q)) return;

    var body = f.content;
    var srcNames = [];
    toArr(d.sources).forEach(function (s) { if (safeUrl(s.url) && s.title && srcNames.indexOf(s.title) < 0) srcNames.push(s.title); });
    if ($("dr-addsrc") && $("dr-addsrc").checked && srcNames.length) body += "\n\nতথ্যসূত্র: " + srcNames.slice(0, 8).join(", ");
    if ($("dr-addnote") && $("dr-addnote").checked) {
      body += "\n\n(এই সংবাদ AI সহায়তায় তৈরি এবং সম্পাদক কর্তৃক যাচাইকৃত।" + (imageAi && f.imageUrl ? " ছবিটি AI-নির্মিত প্রতীকী চিত্র।" : "") + ")";
    }

    var now = Date.now();
    var postId = window.rtdb.ref("posts").push().key;
    var post = {
      title: f.title,
      category: f.category,
      description: body,
      imageUrl: f.imageUrl,
      status: "published",
      authorId: user.uid,
      authorName: user.displayName || user.email || "এডমিন",
      createdAt: now,
      updatedAt: now,
      summary: f.summary,
      seoTitle: f.seoTitle,
      metaDescription: f.metaDescription,
      keywords: f.keywords,
      slug: f.slug,
      aiGenerated: true,
      verificationStatus: st,
      sources: toArr(d.sources).filter(function (s) { return safeUrl(s.url); }).slice(0, 10).map(function (s) { return { title: s.title || "", url: s.url }; }),
    };

    var upd = {};
    var patch = draftPatch(f);
    Object.keys(patch).forEach(function (k) { upd["drafts/" + id + "/" + k] = patch[k]; });
    upd["posts/" + postId] = post;
    upd["drafts/" + id + "/reviewStatus"] = "approved";
    upd["drafts/" + id + "/postId"] = postId;
    upd["drafts/" + id + "/publishedAt"] = now;

    setMsg("dr-msg", "প্রকাশ হচ্ছে…", "");
    window.rtdb.ref().update(upd)
      .then(function () { openId = null; render(); })
      .catch(function (e) { setMsg("dr-msg", "প্রকাশ করা যায়নি: " + e.message, "bad"); });
  }

  function reject() {
    if (!window.confirm("এই ড্রাফটটি বাতিল করবেন?")) return;
    window.rtdb.ref("drafts/" + openId).update({ reviewStatus: "rejected", updatedAt: Date.now() })
      .then(function () { openId = null; render(); })
      .catch(function (e) { setMsg("dr-msg", "বাতিল করা যায়নি: " + e.message, "bad"); });
  }

  function toCreateTab() {
    var d = drafts[openId] || {};
    var title = d.title || "";
    var cat = d.category || "";
    closeOverlay();
    if (window.AdminUtil && window.AdminUtil.setActiveTab) window.AdminUtil.setActiveTab("create");
    setTimeout(function () {
      var t = $("p-title"), c = $("p-category");
      if (t) t.value = title;
      if (c) c.value = cat;
    }, 80);
  }

  /* ---------- ক্লিক হ্যান্ডলার ---------- */
  function onClick(e) {
    var el = e.target.closest && e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");
    if (act === "close") closeOverlay();
    else if (act === "open") { openId = el.getAttribute("data-id"); render(); }
    else if (act === "back") { openId = null; render(); }
    else if (act === "view") { view = el.getAttribute("data-v"); render(); }
    else if (act === "run") runAuto();
    else if (act === "genimg") genImage();
    else if (act === "save") saveDraft();
    else if (act === "publish") publish();
    else if (act === "reject") reject();
    else if (act === "manual") toCreateTab();
  }

  /* ---------- শুরু ---------- */
  document.addEventListener("admin:ready", function (e) {
    user = e.detail && e.detail.user;
    if (!user || !window.rtdb) return;
    ensureStyles();
    mountButton();
    setInterval(mountButton, 2000); // login.js হেডার নতুন করে আঁকলে বাটন আবার বসায়

    window.rtdb.ref("drafts").orderByChild("createdAt").limitToLast(100).on("value", function (snap) {
      drafts = snap.val() || {};
      updateBadge();
      if (overlay && !overlay.hidden && !openId) render();
    }, function () { /* অনুমতি না থাকলে চুপ */ });

    window.rtdb.ref("autoState").on("value", function (snap) {
      autoState = snap.val();
      if (overlay && !overlay.hidden && !openId) render();
    }, function () {});
    window.rtdb.ref("autoLog").on("value", function (snap) {
      autoLog = snap.val();
      if (overlay && !overlay.hidden && !openId) render();
    }, function () {});
  });
})();
