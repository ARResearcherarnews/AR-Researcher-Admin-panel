/* AR News — contact.js : Admin Chat Panel (Chat Management)
   এই ফাইলটি index.html-এর অন্য <script> ট্যাগগুলোর (বিশেষত config.js) পরে লোড করুন:
     <script src="contact.js?v=1"></script>

   কী করে:
   - Admin লগইন থাকলে টপ নেভে একটা চ্যাট আইকন বসায় (মোট unread সংখ্যা badge সহ)।
   - আইকনে চাপ দিলে একটা ফুল-স্ক্রিন প্যানেল খোলে, যেখানে রেজিস্টার করা সব ইউজারের
     তালিকা দেখা যায়, প্রতিটার পাশে unread মেসেজ সংখ্যা।
   - কোনো ইউজারে চাপ দিলে তার পুরো কথোপকথন খোলে, Admin সরাসরি রিপ্লাই দিতে পারে।

   ডেটা স্ট্রাকচার (Firebase Realtime Database):
     chats/
       {uid}/
         meta/
           userName, userEmail   — ইউজারের নাম/ইমেইল (contact.html থেকে লেখা হয়)
           lastMessage, lastMessageAt, lastSender
           unreadByAdmin         — Admin এখনো পড়েনি এমন ইউজার-মেসেজের সংখ্যা
           unreadByUser          — ইউজার এখনো পড়েনি এমন Admin-মেসেজের সংখ্যা
         messages/
           {pushId}/  { sender:"user"|"admin", text, at }

   *** জরুরি — Firebase Realtime Database Rules ***
   এই ফিচার নিরাপদ রাখতে Firebase কনসোলের Rules ট্যাবে এটি বসান, নাহলে
   যে কেউ অন্যের চ্যাট পড়তে/লিখতে পারবে:

   {
     "rules": {
       "users": { ".read": "auth != null" },
       "chats": {
         "$uid": {
           ".read":  "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
           ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
         }
       }
     }
   }
*/
(function () {
  "use strict";

  const state = {
    usersRef: null,
    metaRefs: {},      // uid -> ref (chats/{uid}/meta)
    rosterUsers: {},   // uid -> {name,email,role,...} থেকে users/
    rosterMeta: {},    // uid -> meta object থেকে chats/{uid}/meta
    activeUid: null,
    activeMsgsRef: null,
    activeMsgsHandler: null,
    navObserver: null,
  };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(init);

  function init() {
    if (!window.auth || !window.rtdb) {
      console.warn("[contact.js] window.auth / window.rtdb পাওয়া যায়নি — config.js এই স্ক্রিপ্টের আগে লোড হয়েছে কিনা দেখুন।");
      return;
    }
    window.auth.onAuthStateChanged(async function (user) {
      teardown();
      if (!user) { console.info("[contact.js] কেউ লগইন নেই, তাই চ্যাট আইকন দেখানো হচ্ছে না।"); return; }
      let admin = false;
      try { admin = await window.isAdmin(user); } catch (err) { console.warn("[contact.js] isAdmin() চেক ব্যর্থ হয়েছে:", err); admin = false; }
      if (!admin) {
        console.info("[contact.js] এই ইউজার (" + user.uid + ") admin হিসেবে চিহ্নিত হয়নি — users/" + user.uid + "/role আসলেই 'admin' আছে কিনা Firebase কনসোলে যাচাই করুন।");
        return;
      }
      injectStyle();
      mountIcon();
      buildPanel();
      attachRoster();
    });
  }

  function teardown() {
    if (state.navObserver) { state.navObserver.disconnect(); state.navObserver = null; }
    if (state.usersRef) { state.usersRef.off(); state.usersRef = null; }
    Object.keys(state.metaRefs).forEach(function (uid) { state.metaRefs[uid].off(); });
    state.metaRefs = {};
    detachMessages();
    state.rosterUsers = {};
    state.rosterMeta = {};
    state.activeUid = null;
    const btn = document.getElementById("ar-chat-nav-btn");
    if (btn) btn.remove();
    const overlay = document.getElementById("ar-chat-overlay");
    if (overlay) overlay.remove();
  }

  function injectStyle() {
    if (document.getElementById("ar-chat-style")) return;
    const css =
      "#ar-chat-nav-btn{position:relative}" +
      ".ar-chat-overlay{position:fixed;inset:0;z-index:200;background:#fff;display:flex;flex-direction:column}" +
      ".ar-chat-overlay[hidden]{display:none}" +
      ".ar-chat-head{display:flex;align-items:center;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 12px;border-bottom:1px solid var(--line);flex-shrink:0}" +
      ".ar-chat-head h2{font-family:var(--font-display);font-size:17px;margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ar-chat-list{flex:1;overflow-y:auto;padding:12px 14px}" +
      ".ar-chat-row{display:flex;align-items:center;gap:11px;border:1px solid var(--line);border-radius:12px;padding:11px 12px;background:#fff;margin-bottom:8px;cursor:pointer;text-align:left;width:100%;font:inherit}" +
      ".ar-chat-row:active{background:var(--brand-soft)}" +
      ".ar-chat-preview{font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ar-chat-count{flex-shrink:0;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--danger);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}" +
      ".ar-chat-convo{flex:1;min-height:0;display:flex;flex-direction:column}" +
      ".ar-chat-convo[hidden]{display:none}" +
      ".ar-chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}" +
      ".ar-bubble{max-width:78%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.55;overflow-wrap:anywhere}" +
      ".ar-bubble.from-user{align-self:flex-start;background:#f1f1f1;color:var(--ink);border-bottom-left-radius:4px}" +
      ".ar-bubble.from-admin{align-self:flex-end;background:var(--brand);color:#fff;border-bottom-right-radius:4px}" +
      ".ar-bubble time{display:block;margin-top:4px;font-size:10px;opacity:.65}" +
      ".ar-chat-form{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);flex-shrink:0}" +
      ".ar-chat-form input{flex:1;border:1px solid var(--line);border-radius:20px;padding:10px 15px;font:inherit;font-size:14px}" +
      ".ar-chat-form input:focus{outline:2px solid var(--brand);outline-offset:1px}";
    const style = document.createElement("style");
    style.id = "ar-chat-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mountIcon() {
    const nav = document.getElementById("nav-actions");
    if (!nav) {
      // #nav-actions এখনো DOM-এ নেই (অন্য কোনো স্ক্রিপ্ট পরে বসাচ্ছে) — কিছুক্ষণ পর আবার চেষ্টা করা হচ্ছে।
      console.warn("[contact.js] #nav-actions পাওয়া যায়নি, ৫০০ms পর আবার চেষ্টা করা হচ্ছে।");
      setTimeout(mountIcon, 500);
      return;
    }
    insertIconInto(nav);

    // login.js/অন্য স্ক্রিপ্ট যদি পরে #nav-actions-এর innerHTML রিসেট করে দেয় (যেমন
    // avatar/লগআউট বাটন বসানোর সময়), তাহলে আমাদের আইকনও মুছে যায়। এই observer সেটা
    // ধরে আবার বসিয়ে দেয়, তাই আইকন সবসময় দৃশ্যমান থাকে।
    if (state.navObserver) state.navObserver.disconnect();
    state.navObserver = new MutationObserver(function () {
      if (!document.getElementById("ar-chat-nav-btn")) insertIconInto(nav);
    });
    state.navObserver.observe(nav, { childList: true });
  }

  function insertIconInto(nav) {
    if (document.getElementById("ar-chat-nav-btn")) return;
    const btn = document.createElement("button");
    btn.id = "ar-chat-nav-btn";
    btn.className = "btn icon";
    btn.type = "button";
    btn.title = "ইউজার চ্যাট";
    btn.setAttribute("aria-label", "ইউজার চ্যাট");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<span class="nav-badge" id="ar-chat-total-badge">0</span>';
    btn.addEventListener("click", toggleOverlay);
    nav.insertBefore(btn, nav.firstChild);
    recomputeBadge();
  }

  function buildPanel() {
    if (document.getElementById("ar-chat-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "ar-chat-overlay";
    overlay.className = "ar-chat-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="ar-chat-head">' +
        '<button type="button" id="ar-chat-back" class="btn ghost small" hidden>← ফিরে যান</button>' +
        '<h2 id="ar-chat-title">ইউজার চ্যাট</h2>' +
        '<button type="button" id="ar-chat-close" class="btn ghost small">✕</button>' +
      "</div>" +
      '<div id="ar-chat-list" class="ar-chat-list"><div class="loading-line">লোড হচ্ছে…</div></div>' +
      '<div id="ar-chat-convo" class="ar-chat-convo" hidden>' +
        '<div id="ar-chat-msgs" class="ar-chat-msgs"></div>' +
        '<form id="ar-chat-form" class="ar-chat-form">' +
          '<input id="ar-chat-input" type="text" placeholder="উত্তর লিখুন…" autocomplete="off">' +
          '<button type="submit" class="btn small">পাঠান</button>' +
        "</form>" +
      "</div>";
    document.body.appendChild(overlay);

    document.getElementById("ar-chat-close").addEventListener("click", function () {
      overlay.hidden = true;
    });
    document.getElementById("ar-chat-back").addEventListener("click", showListView);
    document.getElementById("ar-chat-form").addEventListener("submit", sendAdminMessage);
  }

  function toggleOverlay() {
    const overlay = document.getElementById("ar-chat-overlay");
    if (overlay) overlay.hidden = !overlay.hidden;
  }

  function showListView() {
    detachMessages();
    state.activeUid = null;
    document.getElementById("ar-chat-back").hidden = true;
    document.getElementById("ar-chat-title").textContent = "ইউজার চ্যাট";
    document.getElementById("ar-chat-convo").hidden = true;
    document.getElementById("ar-chat-list").hidden = false;
  }

  function attachRoster() {
    state.usersRef = window.rtdb.ref("users");
    state.usersRef.on("value", function (snap) {
      const val = snap.val() || {};
      state.rosterUsers = val;
      const uids = Object.keys(val).filter(function (uid) {
        return val[uid] && val[uid].role !== "admin";
      });
      syncMetaListeners(uids);
      renderList();
    });
  }

  function syncMetaListeners(uids) {
    Object.keys(state.metaRefs).forEach(function (uid) {
      if (uids.indexOf(uid) === -1) {
        state.metaRefs[uid].off();
        delete state.metaRefs[uid];
        delete state.rosterMeta[uid];
      }
    });
    uids.forEach(function (uid) {
      if (state.metaRefs[uid]) return;
      const ref = window.rtdb.ref("chats/" + uid + "/meta");
      ref.on("value", function (snap) {
        state.rosterMeta[uid] = snap.val() || {};
        recomputeBadge();
        renderList();
        if (state.activeUid === uid) updateConvoTitle(uid);
      });
      state.metaRefs[uid] = ref;
    });
  }

  function recomputeBadge() {
    let total = 0;
    Object.keys(state.rosterMeta).forEach(function (uid) {
      total += Number(state.rosterMeta[uid].unreadByAdmin || 0);
    });
    const badge = document.getElementById("ar-chat-total-badge");
    if (!badge) return;
    badge.textContent = String(total);
    badge.classList.toggle("show", total > 0);
  }

  function displayName(uid) {
    const u = state.rosterUsers[uid] || {};
    const meta = state.rosterMeta[uid] || {};
    return u.name || u.displayName || meta.userName || u.email || "ব্যবহারকারী";
  }

  function renderList() {
    const box = document.getElementById("ar-chat-list");
    if (!box) return;
    const uids = Object.keys(state.rosterUsers).filter(function (uid) {
      return state.rosterUsers[uid] && state.rosterUsers[uid].role !== "admin";
    });
    if (!uids.length) {
      box.innerHTML = '<div class="empty">এখনো কোনো রেজিস্টার করা ইউজার নেই।</div>';
      return;
    }
    uids.sort(function (a, b) {
      const ma = state.rosterMeta[a] || {}, mb = state.rosterMeta[b] || {};
      return Number(mb.lastMessageAt || 0) - Number(ma.lastMessageAt || 0);
    });
    box.innerHTML = "";
    uids.forEach(function (uid) {
      const meta = state.rosterMeta[uid] || {};
      const name = displayName(uid);
      const unread = Number(meta.unreadByAdmin || 0);

      const row = document.createElement("button");
      row.type = "button";
      row.className = "ar-chat-row";

      const avatar = document.createElement("div");
      avatar.className = "user-avatar";
      avatar.textContent = name.trim().charAt(0) || "?";

      const info = document.createElement("div");
      info.className = "user-info";
      const nameEl = document.createElement("div");
      nameEl.className = "user-name";
      nameEl.textContent = name;
      const preview = document.createElement("div");
      preview.className = "ar-chat-preview";
      preview.textContent = meta.lastMessage
        ? (meta.lastSender === "admin" ? "আপনি: " : "") + meta.lastMessage
        : "নতুন কথোপকথন শুরু করুন";
      info.appendChild(nameEl);
      info.appendChild(preview);

      row.appendChild(avatar);
      row.appendChild(info);

      if (unread > 0) {
        const badge = document.createElement("span");
        badge.className = "ar-chat-count";
        badge.textContent = String(unread);
        row.appendChild(badge);
      }

      row.addEventListener("click", function () { openConversation(uid); });
      box.appendChild(row);
    });
  }

  function updateConvoTitle(uid) {
    document.getElementById("ar-chat-title").textContent = displayName(uid);
  }

  function openConversation(uid) {
    state.activeUid = uid;
    document.getElementById("ar-chat-back").hidden = false;
    document.getElementById("ar-chat-title").textContent = displayName(uid);
    document.getElementById("ar-chat-list").hidden = true;
    document.getElementById("ar-chat-convo").hidden = false;

    window.rtdb.ref("chats/" + uid + "/meta/unreadByAdmin").set(0);

    detachMessages();
    const box = document.getElementById("ar-chat-msgs");
    box.innerHTML = "";
    const msgsRef = window.rtdb.ref("chats/" + uid + "/messages").orderByKey();
    const handler = msgsRef.on("child_added", function (snap) {
      appendBubble(box, snap.val() || {});
      box.scrollTop = box.scrollHeight;
    });
    state.activeMsgsRef = msgsRef;
    state.activeMsgsHandler = handler;
  }

  function detachMessages() {
    if (state.activeMsgsRef && state.activeMsgsHandler) {
      state.activeMsgsRef.off("child_added", state.activeMsgsHandler);
    }
    state.activeMsgsRef = null;
    state.activeMsgsHandler = null;
  }

  function appendBubble(box, data) {
    const div = document.createElement("div");
    div.className = "ar-bubble " + (data.sender === "admin" ? "from-admin" : "from-user");
    const p = document.createElement("div");
    p.textContent = data.text || "";
    const t = document.createElement("time");
    t.textContent = fmtTime(data.at);
    div.appendChild(p);
    div.appendChild(t);
    box.appendChild(div);
  }

  function fmtTime(ts) {
    if (!ts) return "";
    try {
      return new Intl.DateTimeFormat("bn-BD", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
    } catch (_) { return ""; }
  }

  function sendAdminMessage(e) {
    e.preventDefault();
    const uid = state.activeUid;
    const input = document.getElementById("ar-chat-input");
    const text = input.value.trim();
    if (!uid || !text) return;
    window.rtdb.ref("chats/" + uid + "/messages").push({
      sender: "admin",
      text: text,
      at: firebase.database.ServerValue.TIMESTAMP,
    });
    window.rtdb.ref("chats/" + uid + "/meta").update({
      lastMessage: text,
      lastMessageAt: firebase.database.ServerValue.TIMESTAMP,
      lastSender: "admin",
    });
    window.rtdb.ref("chats/" + uid + "/meta/unreadByUser").transaction(function (v) { return (v || 0) + 1; });
    input.value = "";
    input.focus();
  }
})();