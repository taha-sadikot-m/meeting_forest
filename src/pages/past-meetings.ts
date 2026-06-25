export function pastMeetingsPage(user: { name: string; email: string }): string {
  const initial  = user.name[0]?.toUpperCase() || "?";
  const safeName = user.name.replace(/`/g, "'");
  const safeEmail = user.email.replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Past Meetings</title>
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

    .meeting-table { width: 100%; border-collapse: collapse; }
    .meeting-table th {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
      color: var(--muted-fg); padding: 10px 16px; text-align: left;
      border-bottom: 1.5px solid var(--border);
    }
    .meeting-table td {
      padding: 14px 16px; font-size: 13px; color: var(--foreground);
      border-bottom: 1px solid var(--border); vertical-align: middle;
    }
    .meeting-table tr:hover td { background: var(--accent); }
    .meeting-table tr:last-child td { border-bottom: none; }

    .table-wrap {
      background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl);
      overflow: hidden; margin-bottom: 24px;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: var(--r-full); text-transform: uppercase; letter-spacing: .3px;
    }
    .badge-active   { background: rgba(16,185,129,.12); color: #059669; }
    .badge-ended    { background: var(--accent); color: var(--muted-fg); }
    .badge-superadmin { background: rgba(209,80,0,.1); color: #D15000; }
    .badge-admin    { background: rgba(99,102,241,.1); color: #4338CA; }
    .badge-participant { background: var(--accent); color: var(--muted-fg); }

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
    <a href="/meetings/past" class="sb-link active" title="Past Meetings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span>Past Meetings</span>
    </a>
    <a href="/meetings/invitations" class="sb-link" title="Invitations">
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
  <span style="font-weight:800;font-size:16px;color:#111827">Past Meetings</span>
</div>
<div class="sb-overlay" id="sbOverlay" onclick="toggleSidebar()"></div>

<div class="app-body">
<div class="page">

  <div class="page-header">
    <h1>Past Meetings</h1>
    <p>All meetings you've attended or hosted</p>
  </div>

  <div class="table-wrap">
    <div id="meetingsContent">
      <div style="padding:40px;text-align:center;color:var(--muted-fg);font-size:13px">Loading…</div>
    </div>
  </div>

</div>
</div>

<!-- Start Meeting Modal (for sidebar New Meeting link) -->
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
      <input class="form-input" id="newUserName" placeholder="e.g. Taha Sadikot" value="${safeName}" />
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

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function roleBadge(role) {
    if (role === 'superadmin') return '<span class="badge badge-superadmin">⚡ Super Admin</span>';
    if (role === 'admin')      return '<span class="badge badge-admin">👑 Admin</span>';
    return '<span class="badge badge-participant">Participant</span>';
  }

  function statusBadge(status) {
    if (status === 'active') return '<span class="badge badge-active">● Live</span>';
    return '<span class="badge badge-ended">' + (status || 'ended') + '</span>';
  }

  async function loadPastMeetings() {
    const content = document.getElementById('meetingsContent');
    try {
      const res = await fetch('/api/meetings/past');
      if (!res.ok) throw new Error('status ' + res.status);
      const meetings = await res.json();

      if (!meetings.length) {
        content.innerHTML =
          '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">' +
          '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' +
          '</svg>' +
          '<h3>No past meetings yet</h3>' +
          '<p>Meetings you attend or host will appear here.</p>' +
          '</div>';
        return;
      }

      const table = document.createElement('table');
      table.className = 'meeting-table';
      table.innerHTML =
        '<thead><tr>' +
        '<th>Meeting</th>' +
        '<th>Date</th>' +
        '<th>Your Role</th>' +
        '<th>Status</th>' +
        '<th></th>' +
        '</tr></thead>';
      const tbody = document.createElement('tbody');
      meetings.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td><div style="font-weight:700">' + m.label + '</div>' +
            '<div style="font-size:11px;color:var(--muted-fg);margin-top:2px">Admin: ' + (m.adminName || 'Unknown') + '</div></td>' +
          '<td style="color:var(--muted-fg)">' + formatDate(m.createdAt) + '</td>' +
          '<td>' + roleBadge(m.role) + '</td>' +
          '<td>' + statusBadge(m.status) + '</td>' +
          '<td style="text-align:right">' +
            (m.status === 'active'
              ? '<button class="btn btn-primary btn-sm" onclick="window.location.href=\'/room/\'+' + JSON.stringify(m.id) + '">Rejoin</button>'
              : '<button class="btn btn-ghost btn-sm" style="opacity:.5" disabled>Ended</button>') +
          '</td>';
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      content.innerHTML = '';
      content.appendChild(table);
    } catch (err) {
      content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted-fg);font-size:13px">Could not load meetings.</div>';
    }
  }

  loadPastMeetings();
</script>
</body>
</html>`;
}
