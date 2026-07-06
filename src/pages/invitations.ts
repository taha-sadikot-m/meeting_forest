export function invitationsPage(user: { name: string; email: string }): string {
  const initial   = user.name[0]?.toUpperCase() || "?";
  const safeName  = user.name.replace(/`/g, "'");
  const safeEmail = user.email.replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Invitations</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <script>
    (function(){
      if(localStorage.getItem('sidebar-state')==='collapsed' && window.innerWidth>=768)
        document.documentElement.classList.add('sidebar-collapsed');
    })();
  </script>
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }

    .invite-card {
      background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl);
      padding: 20px 24px; margin-bottom: 12px;
      display: flex; align-items: center; gap: 16px;
      transition: all .2s;
    }
    .invite-card:hover { border-color: rgba(209,80,0,.25); box-shadow: 0 4px 16px rgba(209,80,0,.07); }
    .invite-avatar {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #D15000, #ff7b2e);
      color: white; font-size: 18px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .invite-info { flex: 1; min-width: 0; }
    .invite-title { font-size: 15px; font-weight: 700; color: var(--foreground); }
    .invite-meta  { font-size: 12px; color: var(--muted-fg); margin-top: 3px; }
    .invite-actions { display: flex; gap: 8px; flex-shrink: 0; }

    .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--r-full); text-transform: uppercase; letter-spacing: .3px; }
    .badge-active { background: rgba(16,185,129,.12); color: #059669; }
    .badge-ended  { background: var(--accent); color: var(--muted-fg); }

    .empty-state { text-align: center; padding: 60px 24px; color: var(--muted-fg); }
    .empty-state svg { opacity: .25; display: block; margin: 0 auto 16px; }
    .empty-state h3 { font-size: 16px; font-weight: 700; color: var(--foreground); margin-bottom: 6px; }
    .empty-state p  { font-size: 13px; }

    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.open { display: flex; }
    .modal { background: white; border-radius: var(--r-xl); padding: 32px; width: min(500px,90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: modalIn .3s cubic-bezier(.34,1.56,.64,1); }
    @keyframes modalIn { from { opacity:0; transform:scale(.92) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
    .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .modal p  { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  </style>
</head>
<body>

<aside class="sidebar" id="sidebar">
  <div class="sb-brand-wrapper">
    <a href="/" class="sb-brand">
      <div class="sb-logo-icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <div>
        <div class="sb-brand-text">Meeting Forest</div>
        <div class="sb-brand-sub">Video Platform</div>
      </div>
    </a>
    <button class="sb-close-btn" onclick="toggleCollapseSidebar()" title="Collapse sidebar">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  </div>
  <nav class="sb-nav">
    <div class="sb-section-label">Navigation</div>
    <a href="/" class="sb-link" title="Dashboard">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
      <span>Dashboard</span>
    </a>
    <a href="#new" class="sb-link" title="New Meeting" onclick="event.preventDefault();openStartModal()">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
      </svg>
      <span>New Meeting</span>
    </a>
    <a href="/meetings/past" class="sb-link" title="Past Meetings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span>Past Meetings</span>
    </a>
    <a href="/meetings/invitations" class="sb-link active" title="Invitations">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      <span>Invitations</span>
    </a>
  </nav>
  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-user-avatar">${initial}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">${safeName}</div>
        <div class="sb-user-role">${safeEmail}</div>
      </div>
    </div>
    <a href="/logout" class="sb-logout" title="Logout">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </a>
  </div>
</aside>

<div class="mobile-topbar">
  <button class="sb-toggle" onclick="toggleSidebar()">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>
  <span style="font-weight:800;font-size:16px;color:#111827">Invitations</span>
</div>
<div class="sb-overlay" id="sbOverlay" onclick="toggleSidebar()"></div>

<div class="app-body">
<div class="page">

  <div class="page-header">
    <h1>Invitations</h1>
    <p>Meetings you've been invited to by other participants</p>
  </div>

  <div id="invitationsContent">
    <div style="padding:40px;text-align:center;color:var(--muted-fg);font-size:13px">Loading…</div>
  </div>

</div>
</div>

<!-- Start Meeting Modal -->
<div class="modal-overlay" id="startModal">
  <div class="modal">
    <h3>Start a New Meeting</h3>
    <p>You'll be the Super Admin — you can create a meeting tree with sub-rooms.</p>
    <div class="form-group">
      <label class="form-label">Meeting Name</label>
      <input class="form-input" id="newRoomName" placeholder="e.g. Product Kickoff Q3" />
    </div>
    <div class="form-group">
      <label class="form-label">Your Display Name</label>
      <input class="form-input" id="newUserName" value="${safeName}" />
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeStartModal()">Cancel</button>
      <button class="btn btn-primary" onclick="startMeeting()">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
        Start Meeting
      </button>
    </div>
  </div>
</div>

<div class="toast-container" id="toastContainer"></div>

<script>
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sbOverlay').classList.toggle('visible');
  }
  function toggleCollapseSidebar() {
    const sb = document.getElementById('sidebar');
    const collapsed = sb.classList.toggle('collapsed');
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem('sidebar-state', collapsed ? 'collapsed' : 'expanded');
  }
  function openStartModal() {
    document.getElementById('startModal').classList.add('open');
    document.getElementById('newRoomName').value = '';
    document.getElementById('newRoomName').focus();
  }
  function closeStartModal() { document.getElementById('startModal').classList.remove('open'); }
  document.getElementById('startModal').addEventListener('click', e => {
    if (e.target === document.getElementById('startModal')) closeStartModal();
  });

  async function startMeeting() {
    const rawName  = document.getElementById('newRoomName').value.trim();
    const userName = document.getElementById('newUserName').value.trim() || ${JSON.stringify(safeName)};
    if (!rawName) return showToast('Please enter a meeting name', 'error');
    const btn = document.querySelector('#startModal .btn-primary');
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: rawName, adminName: userName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      closeStartModal();
      window.location.href = '/room/' + encodeURIComponent(data.id);
    } catch (err) {
      showToast('Could not create meeting: ' + err.message, 'error');
      btn.disabled = false; btn.textContent = 'Start Meeting';
    }
  }

  function showToast(message, type = 'info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.innerHTML = '<span>' + (icons[type]||'ℹ') + '</span><span>' + message + '</span>';
    c.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3400);
  }

  function relativeTime(ts) {
    if (!ts) return '—';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  async function loadInvitations() {
    const content = document.getElementById('invitationsContent');
    try {
      const res = await fetch('/api/meetings/invitations');
      if (!res.ok) throw new Error('status ' + res.status);
      const invites = await res.json();

      if (!invites.length) {
        content.innerHTML =
          '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">' +
          '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>' +
          '<polyline points="22,6 12,13 2,6"/>' +
          '</svg>' +
          '<h3>No invitations yet</h3>' +
          '<p>When someone invites you to a meeting, it will appear here.</p>' +
          '</div>';
        return;
      }

      content.innerHTML = '';
      invites.forEach(inv => {
        const initial = (inv.adminName || inv.label || '?')[0].toUpperCase();
        const card = document.createElement('div');
        card.className = 'invite-card';
        const isActive = inv.status === 'active';
        // Build static parts via innerHTML; action button added separately via DOM API
        card.innerHTML =
          '<div class="invite-avatar">' + initial + '</div>' +
          '<div class="invite-info">' +
            '<div class="invite-title">' + inv.label + '</div>' +
            '<div class="invite-meta">' +
              'Invited by <strong>' + (inv.invitedBy || 'someone') + '</strong>' +
              ' · ' + relativeTime(inv.invitedAt) +
              ' · ' + (isActive
                ? '<span class="badge badge-active">● Live now</span>'
                : '<span class="badge badge-ended">' + (inv.status || 'ended') + '</span>') +
            '</div>' +
          '</div>' +
          '<div class="invite-actions"></div>';
        // Action button built as DOM element to safely capture inv.id in a closure
        const actionsDiv = card.querySelector('.invite-actions');
        const actionBtn = document.createElement('button');
        actionBtn.className = isActive ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
        actionBtn.textContent = isActive ? 'Join Meeting' : 'View Room';
        actionBtn.addEventListener('click', function() { window.location.href = '/room/' + inv.id; });
        actionsDiv.appendChild(actionBtn);
        content.appendChild(card);
      });
    } catch (err) {
      content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted-fg);font-size:13px">Could not load invitations.</div>';
    }
  }

  loadInvitations();
</script>
<script src="/public/ring-notifier.js?v=5"></script>
</body>
</html>`;
}
