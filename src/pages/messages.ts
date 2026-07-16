import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function messagesPage(user: { name: string; email: string }): string {
  const safeEmail = user.email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Messages</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <link rel="stylesheet" href="/public/messages.css" />
  ${sidebarCollapseInitScript()}
</head>
<body>

${appSidebar(user, "messages")}
${mobileShell("Messages")}

<div class="app-body">
<div class="page messages-page">

  <div class="messages-shell" id="messagesShell">
    <!-- Left: conversation list -->
    <div class="msg-list-panel" id="listPanel">
      <div class="msg-list-header">
        <div class="msg-list-header-top">
          <h2>Messages</h2>
          <button class="btn btn-primary btn-sm" id="newChatBtn" type="button">+ New chat</button>
        </div>
        <div class="msg-search-wrap">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input class="msg-search" id="convSearch" type="search" placeholder="Search by name or email…" autocomplete="off" />
        </div>
      </div>
      <div class="msg-conv-list" id="convList">
        <div style="padding:40px;text-align:center;color:var(--muted-fg);font-size:13px">Loading…</div>
      </div>
    </div>

    <!-- Right: chat thread -->
    <div class="msg-thread-panel" id="threadPanel">
      <div class="msg-thread-empty" id="threadEmpty">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Select a conversation</h3>
        <p>Choose a chat from the list or start a new conversation with someone on Meeting Forest.</p>
      </div>

      <div id="threadActive" style="display:none;flex:1;flex-direction:column;min-height:0;">
        <div class="msg-thread-header">
          <button class="msg-back-btn" id="backBtn" type="button" title="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="msg-avatar" id="threadAvatar">?</div>
          <div>
            <div class="msg-thread-peer-name" id="threadPeerName">—</div>
            <div class="msg-thread-peer-email" id="threadPeerEmail">—</div>
          </div>
        </div>
        <div class="msg-messages" id="messagesArea"></div>
        <div class="msg-input-area">
          <textarea class="msg-input" id="messageInput" rows="1" placeholder="Type a message…"></textarea>
          <button class="msg-send-btn" id="sendBtn" type="button" disabled title="Send">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

</div>
</div>

<!-- New chat modal -->
<div class="msg-modal-overlay" id="newChatModal">
  <div class="msg-modal">
    <h3>New chat</h3>
    <p>Search for a registered user by name or email to start messaging.</p>
    <input class="msg-modal-input" id="newChatInput" type="text" placeholder="Name or email address…" autocomplete="off" />
    <div class="msg-lookup-results" id="lookupResults" style="display:none"></div>
    <div class="msg-modal-footer">
      <button class="btn btn-ghost" type="button" onclick="closeNewChatModal()">Cancel</button>
      <button class="btn btn-primary" type="button" id="newChatGoBtn" disabled>Start chat</button>
    </div>
  </div>
</div>

<!-- Not registered modal -->
<div class="msg-modal-overlay" id="inviteModal">
  <div class="msg-modal">
    <h3>User not registered</h3>
    <p id="inviteModalText">This person is not on Meeting Forest yet. Send them an invite to join and start chatting.</p>
    <div class="msg-modal-footer">
      <button class="btn btn-ghost" type="button" onclick="closeInviteModal()">Cancel</button>
      <button class="btn btn-primary" type="button" id="inviteSendBtn">Send invite</button>
    </div>
  </div>
</div>

<div class="msg-toast" id="msgToast"></div>

${startMeetingModal(user, false)}
${sidebarShellScripts(user, false)}

<script>
(function() {
  'use strict';

  var MY_EMAIL = '${safeEmail}';
  var POLL_MS = 3000;

  var conversations = [];
  var activeConvId = null;
  var activePeer = null;
  var messages = [];
  var lastSentAt = 0;
  var pollTimer = null;
  var lookupTimer = null;
  var lookupUsers = [];
  var selectedLookupEmail = null;
  var pendingInviteEmail = null;
  var loadingOlder = false;
  var hasMoreOlder = true;

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function relativeTime(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + 'd';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function showToast(msg) {
    var el = document.getElementById('msgToast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 3000);
  }

  function isMobile() { return window.innerWidth < 768; }

  function setUrlConv(id) {
    var url = new URL(window.location.href);
    if (id) url.searchParams.set('c', id);
    else url.searchParams.delete('c');
    history.replaceState(null, '', url.pathname + url.search);
  }

  function showMobileThread(show) {
    if (!isMobile()) return;
    document.getElementById('listPanel').classList.toggle('hidden-mobile', show);
    document.getElementById('threadPanel').classList.toggle('active-mobile', show);
  }

  function renderConversations(filter) {
    var list = document.getElementById('convList');
    var q = (filter || '').trim().toLowerCase();
    var filtered = conversations.filter(function(c) {
      if (!q) return true;
      return (c.peerName || '').toLowerCase().indexOf(q) >= 0 ||
             (c.peerEmail || '').toLowerCase().indexOf(q) >= 0;
    });

    if (!conversations.length) {
      list.innerHTML =
        '<div class="msg-empty-list">' +
        '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.25;display:block;margin:0 auto">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
        '</svg>' +
        '<h3>No conversations yet</h3>' +
        '<p>Start a conversation with someone on Meeting Forest.</p>' +
        '<button class="btn btn-primary btn-sm" style="margin-top:16px" type="button" onclick="openNewChatModal()">Start a conversation</button>' +
        '</div>';
      return;
    }

    if (!filtered.length) {
      list.innerHTML = '<div class="msg-empty-list"><p>No matches for your search.</p></div>';
      return;
    }

    list.innerHTML = '';
    filtered.forEach(function(c) {
      var initial = (c.peerName || c.peerEmail || '?')[0].toUpperCase();
      var item = document.createElement('div');
      item.className = 'msg-conv-item' + (c.id === activeConvId ? ' active' : '');
      item.innerHTML =
        '<div class="msg-avatar">' + esc(initial) + '</div>' +
        '<div class="msg-conv-body">' +
          '<div class="msg-conv-name">' + esc(c.peerName || c.peerEmail) + '</div>' +
          '<div class="msg-conv-email">' + esc(c.peerEmail) + '</div>' +
          '<div class="msg-conv-preview">' + esc(c.lastMessagePreview || 'No messages yet') + '</div>' +
        '</div>' +
        '<div class="msg-conv-time">' + esc(relativeTime(c.lastMessageAt)) + '</div>';
      item.addEventListener('click', function() { openConversation(c); });
      list.appendChild(item);
    });
  }

  function renderMessages() {
    var area = document.getElementById('messagesArea');
    area.innerHTML = '';

    if (hasMoreOlder && messages.length >= 50) {
      var loadDiv = document.createElement('div');
      loadDiv.className = 'msg-load-more';
      var loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.textContent = loadingOlder ? 'Loading…' : 'Load older messages';
      loadBtn.disabled = loadingOlder;
      loadBtn.addEventListener('click', loadOlderMessages);
      loadDiv.appendChild(loadBtn);
      area.appendChild(loadDiv);
    }

    messages.forEach(function(m) {
      var isSelf = m.senderEmail === MY_EMAIL;
      var row = document.createElement('div');
      row.className = 'msg-bubble-row ' + (isSelf ? 'self' : 'other');
      row.dataset.id = m.id;
      row.innerHTML =
        '<div class="msg-bubble">' + esc(m.body) + '</div>' +
        '<div class="msg-bubble-time">' + esc(formatTime(m.sentAt)) + '</div>';
      area.appendChild(row);
    });

    scrollToBottom(false);
  }

  function scrollToBottom(force) {
    var area = document.getElementById('messagesArea');
    if (!area) return;
    var nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 80;
    if (force || nearBottom) {
      area.scrollTop = area.scrollHeight;
    }
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(pollNewMessages, POLL_MS);
  }

  async function loadConversations() {
    try {
      var res = await fetch('/api/messages/conversations');
      if (!res.ok) throw new Error('Failed to load');
      var data = await res.json();
      conversations = data.conversations || [];
      renderConversations(document.getElementById('convSearch').value);

      var params = new URLSearchParams(window.location.search);
      var deepId = params.get('c');
      if (deepId && !activeConvId) {
        var found = conversations.find(function(c) { return c.id === deepId; });
        if (found) openConversation(found);
      }
    } catch (e) {
      document.getElementById('convList').innerHTML =
        '<div class="msg-empty-list"><p>Could not load conversations.</p></div>';
    }
  }

  async function openConversation(conv) {
    activeConvId = conv.id;
    activePeer = { name: conv.peerName, email: conv.peerEmail };
    messages = [];
    lastSentAt = 0;
    hasMoreOlder = true;

    document.getElementById('threadEmpty').style.display = 'none';
    var threadActive = document.getElementById('threadActive');
    threadActive.style.display = 'flex';

    document.getElementById('threadAvatar').textContent = (conv.peerName || conv.peerEmail || '?')[0].toUpperCase();
    document.getElementById('threadPeerName').textContent = conv.peerName || conv.peerEmail;
    document.getElementById('threadPeerEmail').textContent = conv.peerEmail;

    setUrlConv(conv.id);
    renderConversations(document.getElementById('convSearch').value);
    showMobileThread(true);

    await loadMessages();
    startPolling();
  }

  async function loadMessages() {
    if (!activeConvId) return;
    try {
      var res = await fetch('/api/messages/conversations/' + encodeURIComponent(activeConvId) + '/messages?limit=50');
      if (!res.ok) throw new Error('Failed');
      var data = await res.json();
      messages = data.messages || [];
      if (messages.length) {
        lastSentAt = messages[messages.length - 1].sentAt;
      }
      hasMoreOlder = messages.length >= 50;
      renderMessages();
    } catch (e) {
      showToast('Could not load messages');
    }
  }

  async function loadOlderMessages() {
    if (!activeConvId || loadingOlder || !messages.length) return;
    loadingOlder = true;
    renderMessages();
    try {
      var before = messages[0].sentAt;
      var res = await fetch('/api/messages/conversations/' + encodeURIComponent(activeConvId) +
        '/messages?before=' + before + '&limit=50');
      if (!res.ok) throw new Error('Failed');
      var data = await res.json();
      var older = data.messages || [];
      if (older.length < 50) hasMoreOlder = false;
      if (older.length) {
        var area = document.getElementById('messagesArea');
        var prevHeight = area.scrollHeight;
        messages = older.concat(messages);
        renderMessages();
        area.scrollTop = area.scrollHeight - prevHeight;
      } else {
        hasMoreOlder = false;
        renderMessages();
      }
    } catch (e) {
      showToast('Could not load older messages');
    } finally {
      loadingOlder = false;
    }
  }

  async function pollNewMessages() {
    if (!activeConvId) return;
    try {
      var url = '/api/messages/conversations/' + encodeURIComponent(activeConvId) + '/messages?limit=50';
      if (lastSentAt > 0) url += '&after=' + lastSentAt;
      var res = await fetch(url);
      if (!res.ok) return;
      var data = await res.json();
      var incoming = data.messages || [];
      if (!incoming.length) return;

      var existingIds = {};
      messages.forEach(function(m) { existingIds[m.id] = true; });

      incoming.forEach(function(m) {
        if (!existingIds[m.id]) {
          messages.push(m);
          lastSentAt = Math.max(lastSentAt, m.sentAt);
        }
      });

      renderMessages();

      var conv = conversations.find(function(c) { return c.id === activeConvId; });
      if (conv && incoming.length) {
        var last = incoming[incoming.length - 1];
        conv.lastMessageAt = last.sentAt;
        conv.lastMessagePreview = last.body;
        renderConversations(document.getElementById('convSearch').value);
      }
    } catch (e) { /* silent poll failure */ }
  }

  async function sendMessage() {
    var input = document.getElementById('messageInput');
    var body = (input.value || '').trim();
    if (!body || !activeConvId) return;

    var tempId = 'temp-' + Date.now();
    var optimistic = {
      id: tempId,
      body: body,
      senderEmail: MY_EMAIL,
      sentAt: Date.now()
    };
    messages.push(optimistic);
    lastSentAt = optimistic.sentAt;
    input.value = '';
    updateSendBtn();
    autoResizeInput();
    renderMessages();

    try {
      var res = await fetch('/api/messages/conversations/' + encodeURIComponent(activeConvId) + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body })
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        throw new Error(err.error || 'Send failed');
      }
      var data = await res.json();
      var idx = messages.findIndex(function(m) { return m.id === tempId; });
      if (idx >= 0) messages[idx] = data.message;
      lastSentAt = data.message.sentAt;

      var conv = conversations.find(function(c) { return c.id === activeConvId; });
      if (conv) {
        conv.lastMessageAt = data.message.sentAt;
        conv.lastMessagePreview = data.message.body;
        conversations.sort(function(a, b) { return (b.lastMessageAt || 0) - (a.lastMessageAt || 0); });
        renderConversations(document.getElementById('convSearch').value);
      }
      renderMessages();
    } catch (e) {
      messages = messages.filter(function(m) { return m.id !== tempId; });
      renderMessages();
      showToast(e.message || 'Could not send message');
    }
  }

  function updateSendBtn() {
    var input = document.getElementById('messageInput');
    document.getElementById('sendBtn').disabled = !(input.value || '').trim();
  }

  function autoResizeInput() {
    var input = document.getElementById('messageInput');
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  window.openNewChatModal = function() {
    document.getElementById('newChatModal').classList.add('open');
    document.getElementById('newChatInput').value = '';
    document.getElementById('lookupResults').style.display = 'none';
    lookupUsers = [];
    selectedLookupEmail = null;
    document.getElementById('newChatGoBtn').disabled = true;
    setTimeout(function() { document.getElementById('newChatInput').focus(); }, 100);
  };

  window.closeNewChatModal = function() {
    document.getElementById('newChatModal').classList.remove('open');
  };

  window.closeInviteModal = function() {
    document.getElementById('inviteModal').classList.remove('open');
    pendingInviteEmail = null;
  };

  function renderLookupResults(users) {
    var box = document.getElementById('lookupResults');
    if (!users.length) {
      box.style.display = 'block';
      box.innerHTML = '<div class="msg-lookup-empty">No registered users found.</div>';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = '';
    users.forEach(function(u) {
      var initial = (u.name || u.email || '?')[0].toUpperCase();
      var item = document.createElement('div');
      item.className = 'msg-lookup-item';
      item.innerHTML =
        '<div class="msg-avatar">' + esc(initial) + '</div>' +
        '<div><div class="msg-conv-name">' + esc(u.name) + '</div>' +
        '<div class="msg-conv-email">' + esc(u.email) + '</div></div>';
      item.addEventListener('click', function() {
        selectedLookupEmail = u.email;
        document.getElementById('newChatInput').value = u.email;
        document.getElementById('newChatGoBtn').disabled = false;
        box.querySelectorAll('.msg-lookup-item').forEach(function(el) { el.style.background = ''; });
        item.style.background = 'rgba(209,80,0,.08)';
      });
      box.appendChild(item);
    });
  }

  function showInviteModal(email) {
    pendingInviteEmail = email;
    closeNewChatModal();
    document.getElementById('inviteModalText').textContent =
      email + ' is not registered on Meeting Forest yet. Send them an invite to join and start chatting.';
    document.getElementById('inviteModal').classList.add('open');
  }

  async function runLookup(q) {
    if (q.length < 2) {
      document.getElementById('lookupResults').style.display = 'none';
      lookupUsers = [];
      return;
    }
    try {
      var res = await fetch('/api/messages/lookup?q=' + encodeURIComponent(q));
      if (!res.ok) {
        lookupUsers = [];
        var box = document.getElementById('lookupResults');
        box.style.display = 'block';
        box.innerHTML = '<div class="msg-lookup-empty">Search failed — try entering the full email.</div>';
        return;
      }
      var data = await res.json();
      lookupUsers = data.users || [];
      renderLookupResults(lookupUsers);

      var exact = lookupUsers.find(function(u) { return u.email.toLowerCase() === q.toLowerCase(); });
      if (exact) {
        selectedLookupEmail = exact.email;
        document.getElementById('newChatGoBtn').disabled = false;
      }
    } catch (e) {
      lookupUsers = [];
      var errBox = document.getElementById('lookupResults');
      errBox.style.display = 'block';
      errBox.innerHTML = '<div class="msg-lookup-empty">Search failed — try entering the full email.</div>';
    }
  }

  async function createAndOpenConversation(email) {
    document.getElementById('newChatGoBtn').disabled = true;
    try {
      var res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      if (!res.ok) {
        var err = await res.json().catch(function() { return {}; });
        if (err.error && err.error.indexOf('not found') >= 0) {
          showInviteModal(email);
          return;
        }
        throw new Error(err.error || 'Could not start chat');
      }
      var data = await res.json();
      closeNewChatModal();

      var existing = conversations.find(function(c) { return c.id === data.conversationId; });
      if (!existing) {
        conversations.unshift({
          id: data.conversationId,
          peerName: data.peer.name,
          peerEmail: data.peer.email,
          lastMessageAt: Date.now(),
          lastMessagePreview: ''
        });
      }

      openConversation({
        id: data.conversationId,
        peerName: data.peer.name,
        peerEmail: data.peer.email,
        lastMessageAt: 0,
        lastMessagePreview: ''
      });
    } catch (e) {
      showToast(e.message || 'Could not start chat');
    } finally {
      document.getElementById('newChatGoBtn').disabled = false;
    }
  }

  async function startNewChat() {
    var input = document.getElementById('newChatInput');
    var raw = (input.value || '').trim();
    if (!raw && !selectedLookupEmail) return;

    var isEmail = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(raw);

    // Prefer an explicit selection from lookup results
    if (selectedLookupEmail) {
      await createAndOpenConversation(selectedLookupEmail);
      return;
    }

    // Single lookup hit — use it
    if (lookupUsers.length === 1) {
      await createAndOpenConversation(lookupUsers[0].email);
      return;
    }

    // Full email typed — POST directly (do not depend on lookup succeeding)
    if (isEmail) {
      await createAndOpenConversation(raw);
      return;
    }

    // Partial name/text with no selection
    showToast('Select a user from the search results');
  }

  async function sendInvite() {
    if (!pendingInviteEmail) return;
    var invited = pendingInviteEmail;
    var btn = document.getElementById('inviteSendBtn');
    btn.disabled = true;
    try {
      await fetch('/api/messages/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invited })
      });
      closeInviteModal();
      showToast('Invite sent to ' + invited);
    } catch (e) {
      showToast('Could not send invite');
    } finally {
      btn.disabled = false;
    }
  }

  document.getElementById('newChatBtn').addEventListener('click', openNewChatModal);
  document.getElementById('newChatGoBtn').addEventListener('click', startNewChat);
  document.getElementById('inviteSendBtn').addEventListener('click', sendInvite);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('backBtn').addEventListener('click', function() {
    showMobileThread(false);
    setUrlConv(null);
  });

  document.getElementById('convSearch').addEventListener('input', function(e) {
    renderConversations(e.target.value);
  });

  document.getElementById('newChatInput').addEventListener('input', function(e) {
    var q = e.target.value.trim();
    selectedLookupEmail = null;
    document.getElementById('newChatGoBtn').disabled = q.length < 2;
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(function() { runLookup(q); }, 300);
  });

  document.getElementById('newChatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); startNewChat(); }
  });

  document.getElementById('messageInput').addEventListener('input', function() {
    updateSendBtn();
    autoResizeInput();
  });

  document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('newChatModal').addEventListener('click', function(e) {
    if (e.target === this) closeNewChatModal();
  });
  document.getElementById('inviteModal').addEventListener('click', function(e) {
    if (e.target === this) closeInviteModal();
  });

  loadConversations();
})();
</script>
</body>
</html>`;
}
