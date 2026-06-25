export function homePage(user: { name: string; email: string }): string {
  const firstName = user.name.split(" ")[0];
  const initial   = user.name[0]?.toUpperCase() || "?";
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const safeName  = user.name.replace(/`/g, "'");
  const safeEmail = user.email.replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Dashboard</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <script>
    (function(){
      if(localStorage.getItem('sidebar-state')==='collapsed' && window.innerWidth>=768)
        document.documentElement.classList.add('sidebar-collapsed');
    })();
  </script>
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 {
      font-size: 28px; font-weight: 800; color: var(--foreground);
      letter-spacing: -.5px; margin-bottom: 6px;
    }
    .page-header p { font-size: 14px; color: var(--muted-fg); }

    /* Quick actions */
    .quick-actions {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;
    }
    @media(max-width:720px){ .quick-actions { grid-template-columns: 1fr; } }

    .action-card {
      background: white; border-radius: var(--r-xl); border: 1.5px solid var(--border);
      padding: 26px; display: flex; flex-direction: column; gap: 14px;
      transition: all .25s cubic-bezier(.34,1.56,.64,1);
    }
    .action-card:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); border-color: rgba(209,80,0,.25); }
    .action-card.primary-card {
      background: linear-gradient(135deg, #D15000 0%, #ff7b2e 100%);
      border-color: transparent;
    }
    .action-card.primary-card h3,
    .action-card.primary-card p { color: white; }
    .action-card.primary-card p { opacity: .85; }
    .action-card h3 { font-size: 18px; font-weight: 700; color: var(--foreground); }
    .action-card p  { font-size: 13px; color: var(--muted-fg); line-height: 1.6; }
    .action-icon {
      width: 44px; height: 44px; border-radius: var(--r-lg);
      display: flex; align-items: center; justify-content: center;
    }
    .action-icon.orange { background: rgba(255,255,255,.2); }
    .action-icon.white  { background: var(--primary-light); }

    .join-form { display: flex; flex-direction: column; gap: 10px; }
    .join-row  { display: flex; gap: 10px; }
    .join-row .form-input { flex: 1; }

    /* Active rooms */
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .section-header h2 { font-size: 18px; font-weight: 700; color: var(--foreground); }

    .active-room-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px; background: white;
      border: 1.5px solid var(--border); border-radius: var(--r-lg);
      margin-bottom: 10px; transition: all .2s;
    }
    .active-room-row:hover { border-color: var(--primary); box-shadow: 0 4px 16px rgba(209,80,0,.1); }
    .room-indicator {
      width: 10px; height: 10px; border-radius: 50%; background: var(--green);
      flex-shrink: 0; box-shadow: 0 0 0 3px rgba(16,185,129,.2);
      animation: livePulse 2s infinite;
    }
    @keyframes livePulse {
      0%,100% { box-shadow: 0 0 0 3px rgba(16,185,129,.2); }
      50%      { box-shadow: 0 0 0 6px rgba(16,185,129,.06); }
    }
    .room-info { flex: 1; min-width: 0; }
    .room-name {
      font-size: 14px; font-weight: 700; color: var(--foreground);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .room-meta { font-size: 12px; color: var(--muted-fg); margin-top: 2px; }

    /* Recent meetings */
    .history-badge {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      padding: 2px 8px; border-radius: var(--r-full); letter-spacing: .4px;
    }
    .badge-ended    { background: var(--accent); color: var(--muted-fg); }
    .badge-recorded { background: #EFF6FF; color: #1D4ED8; }

    /* Modal */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.45); z-index: 1000;
      align-items: center; justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: white; border-radius: var(--r-xl); padding: 32px;
      width: min(500px,90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2);
      animation: modalIn .3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes modalIn {
      from { opacity:0; transform:scale(.92) translateY(16px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .modal p  { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  </style>
</head>
<body>

<!-- ── Sidebar ────────────────────────────────────────────────────────────── -->
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
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>
  </div>

  <nav class="sb-nav">
    <div class="sb-section-label">Navigation</div>

    <a href="/" class="sb-link active" title="Dashboard">
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

    <a href="#meetings" class="sb-link" title="Past Meetings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span>Past Meetings</span>
    </a>
  </nav>

  <div class="sb-footer">
    <div class="sb-user">
      <div class="sb-user-avatar">${initial}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">${safeName}</div>
        <div class="sb-user-role">Super Admin</div>
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

<!-- Mobile topbar -->
<div class="mobile-topbar">
  <button class="sb-toggle" onclick="toggleSidebar()">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>
  <span style="font-weight:800;font-size:16px;color:#111827">Meeting Forest</span>
</div>
<div class="sb-overlay" id="sbOverlay" onclick="toggleSidebar()"></div>

<!-- ── Main ───────────────────────────────────────────────────────────────── -->
<div class="app-body">
<div class="page">

  <div class="page-header">
    <h1>${greeting}, ${firstName} 👋</h1>
    <p>Welcome back — start or join a meeting below</p>
  </div>

  <!-- Quick actions: Start + Join -->
  <div class="quick-actions">
    <div class="action-card primary-card">
      <div class="action-icon orange">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <div>
        <h3>Start Instant Meeting</h3>
        <p>Jump into a new video room immediately. You become the Super Admin and can create sub-meeting trees.</p>
      </div>
      <button class="btn" style="background:white;color:#D15000;font-weight:800;padding:12px 22px;border-radius:10px;width:fit-content" onclick="openStartModal()">
        Start Now
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>

    <div class="action-card">
      <div class="action-icon white">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#D15000" stroke-width="2.5">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
      </div>
      <div>
        <h3>Join a Meeting</h3>
        <p>Enter a room ID or paste a meeting link to join an existing session.</p>
      </div>
      <div class="join-form">
        <div class="join-row">
          <input class="form-input" id="joinRoomInput" placeholder="Room ID or link…" />
        </div>
        <div class="join-row">
          <input class="form-input" id="joinNameInput" placeholder="Your display name" value="${safeName}" />
          <button class="btn btn-primary" onclick="joinRoom()">Join</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Active Rooms -->
  <div class="section-header">
    <h2>🟢 Live Rooms</h2>
    <button class="btn btn-ghost btn-sm" onclick="loadRooms()">Refresh</button>
  </div>
  <div id="activeRooms" style="margin-bottom:32px">
    <div id="roomsLoading" style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px">
      Loading meetings…
    </div>
  </div>

  <!-- Recent meetings -->
  <div class="section-header" id="meetings">
    <h2>All Meetings</h2>
  </div>
  <div id="allMeetingsGrid" class="meeting-grid" style="margin-top:0">
    <div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px;grid-column:1/-1">
      Loading…
    </div>
  </div>

</div><!-- /page -->
</div><!-- /app-body -->

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
      <label class="form-label">Your Name</label>
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

<!-- Toast container -->
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
  function closeStartModal() {
    document.getElementById('startModal').classList.remove('open');
  }
  document.getElementById('startModal').addEventListener('click', e => {
    if (e.target === document.getElementById('startModal')) closeStartModal();
  });

  function joinRoomById(roomId) {
    const name = document.getElementById('joinNameInput').value.trim()
                 || prompt('Enter your display name:');
    if (name) window.location.href = '/room/' + roomId + '?name=' + encodeURIComponent(name);
  }
  function joinRoom() {
    const room = document.getElementById('joinRoomInput').value.trim();
    const name = document.getElementById('joinNameInput').value.trim();
    if (!room) return showToast('Please enter a room ID', 'error');
    if (!name) return showToast('Please enter your name', 'error');
    window.location.href = '/room/' + room + '?name=' + encodeURIComponent(name);
  }

  /** Create meeting in Memgraph then redirect as Super Admin */
  async function startMeeting() {
    const rawName  = document.getElementById('newRoomName').value.trim();
    const userName = document.getElementById('newUserName').value.trim() || 'Host';
    if (!rawName) return showToast('Please enter a meeting name', 'error');

    const btn = document.querySelector('#startModal .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: rawName, adminName: userName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      closeStartModal();
      window.location.href = '/room/' + encodeURIComponent(data.id) +
        '?role=superadmin&name=' + encodeURIComponent(userName);
    } catch (err) {
      showToast('Could not create meeting: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Start Meeting';
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

  async function copyRoomLink(roomId, btn) {
    const link = window.location.origin + '/room/' + roomId;
    try { await navigator.clipboard.writeText(link); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: link });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    const prev = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.color = '#059669';
    showToast('Room link copied', 'success');
    setTimeout(() => { btn.innerHTML = prev; btn.style.color = ''; }, 2000);
  }

  function relativeTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function renderRoomRow(m) {
    const row = document.createElement('div');
    row.className = 'active-room-row';
    const p = m.participants || 0;
    const initials = (m.adminName || '?')[0].toUpperCase();
    row.innerHTML =
      '<div class="room-indicator"></div>' +
      '<div class="room-info">' +
        '<div class="room-name">' + m.label + '</div>' +
        '<div class="room-meta">' + p + ' participant' + (p !== 1 ? 's' : '') +
          ' · Admin: ' + (m.adminName || 'Unknown') +
          ' · ' + relativeTime(m.createdAt) + '</div>' +
      '</div>' +
      '<div class="avatar-stack"><div class="avatar">' + initials + '</div></div>' +
      '<button class="btn btn-ghost btn-sm" style="gap:5px" onclick="copyRoomLink(' + JSON.stringify(m.id) + ', this)">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">' +
          '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
        '</svg>Link</button>' +
      '<button class="btn btn-primary btn-sm" onclick="joinRoomById(' + JSON.stringify(m.id) + ')">Join</button>';
    return row;
  }

  function renderMeetingCard(m) {
    const card = document.createElement('div');
    card.className = 'meeting-card';
    card.style.cursor = 'pointer';
    const p = m.participants || 0;
    const initials = (m.adminName || '?')[0].toUpperCase();
    const dateStr = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                    ' · ' + new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    card.innerHTML =
      '<div style="display:flex;align-items:start;justify-content:space-between">' +
        '<div class="meeting-card-title">' + m.label + '</div>' +
        '<span class="history-badge badge-ended">' + (m.status || 'active') + '</span>' +
      '</div>' +
      '<div class="meeting-card-meta">' +
        '<span class="tag">' + p + ' participant' + (p !== 1 ? 's' : '') + '</span>' +
        '<span class="tag">Admin: ' + (m.adminName || 'Unknown') + '</span>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--muted-fg)">' + dateStr + '</div>' +
      '<div class="meeting-card-footer">' +
        '<div class="avatar-stack"><div class="avatar">' + initials + '</div></div>' +
        '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();joinRoomById(' + JSON.stringify(m.id) + ')">Join</button>' +
      '</div>';
    card.addEventListener('click', () => joinRoomById(m.id));
    return card;
  }

  async function loadRooms() {
    const container = document.getElementById('activeRooms');
    const grid = document.getElementById('allMeetingsGrid');
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) throw new Error('status ' + res.status);
      const meetings = await res.json();

      // Live rooms section
      container.innerHTML = '';
      if (!meetings.length) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px">No active meetings — start one above!</div>';
      } else {
        meetings.forEach(m => container.appendChild(renderRoomRow(m)));
      }

      // All meetings grid
      grid.innerHTML = '';
      if (!meetings.length) {
        grid.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px;grid-column:1/-1">No meetings yet</div>';
      } else {
        meetings.forEach(m => grid.appendChild(renderMeetingCard(m)));
      }
    } catch (err) {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px">Could not load meetings — is Memgraph running?</div>';
      grid.innerHTML = '';
    }
  }

  // Load on page open
  loadRooms();
</script>
</body>
</html>`;
}
