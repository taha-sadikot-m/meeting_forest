import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function homePage(user: { name: string; email: string }): string {
  const firstName = user.name.split(" ")[0];
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const safeName  = user.name.replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Dashboard</title>
  <link rel="stylesheet" href="/public/styles.css" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }

    /* Stats row */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    @media(max-width:720px){ .stats-row { grid-template-columns: 1fr 1fr; } }
    .stat-card {
      background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl);
      padding: 20px 22px; display: flex; flex-direction: column; gap: 6px;
    }
    .stat-card .stat-val { font-size: 28px; font-weight: 800; color: var(--foreground); }
    .stat-card .stat-label { font-size: 12px; font-weight: 600; color: var(--muted-fg); text-transform: uppercase; letter-spacing: .4px; }

    /* Quick actions */
    .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
    @media(max-width:720px){ .quick-actions { grid-template-columns: 1fr; } }

    .action-card {
      background: white; border-radius: var(--r-xl); border: 1.5px solid var(--border);
      padding: 26px; display: flex; flex-direction: column; gap: 14px;
      transition: all .25s cubic-bezier(.34,1.56,.64,1);
    }
    .action-card:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); border-color: rgba(209,80,0,.25); }
    .action-card.primary-card { background: linear-gradient(135deg, #D15000 0%, #ff7b2e 100%); border-color: transparent; }
    .action-card.primary-card h3, .action-card.primary-card p { color: white; }
    .action-card.primary-card p { opacity: .85; }
    .action-card h3 { font-size: 18px; font-weight: 700; color: var(--foreground); }
    .action-card p  { font-size: 13px; color: var(--muted-fg); line-height: 1.6; }
    .action-icon { width: 44px; height: 44px; border-radius: var(--r-lg); display: flex; align-items: center; justify-content: center; }
    .action-icon.orange { background: rgba(255,255,255,.2); }
    .action-icon.white  { background: var(--primary-light); }

    .join-form { display: flex; flex-direction: column; gap: 10px; }
    .join-row  { display: flex; gap: 10px; }
    .join-row .form-input { flex: 1; }

    /* Active rooms */
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
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
    .room-name { font-size: 14px; font-weight: 700; color: var(--foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .room-meta { font-size: 12px; color: var(--muted-fg); margin-top: 2px; }

    /* Modal */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.open { display: flex; }
    .modal { background: white; border-radius: var(--r-xl); padding: 32px; width: min(500px,90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: modalIn .3s cubic-bezier(.34,1.56,.64,1); }
    @keyframes modalIn { from { opacity:0; transform:scale(.92) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
    .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .modal p  { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

    .empty-state { text-align: center; padding: 40px 24px; color: var(--muted-fg); font-size: 13px; }
    .empty-state svg { opacity: .3; margin-bottom: 12px; }
    .empty-state p { margin: 0; }
  </style>
</head>
<body>

${appSidebar(user, "dashboard")}
${mobileShell("Meeting Forest")}

<!-- ── Main ───────────────────────────────────────────────────────────────── -->
<div class="app-body">
<div class="page">

  <div class="page-header">
    <h1>${greeting}, ${firstName} 👋</h1>
    <p>Welcome back — here's your meeting overview</p>
  </div>

  <!-- Stats -->
  <div class="stats-row" id="statsRow">
    <div class="stat-card">
      <div class="stat-val" id="statTotal">—</div>
      <div class="stat-label">Total Meetings</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" id="statActive">—</div>
      <div class="stat-label">Live Now</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" id="statInvites">—</div>
      <div class="stat-label">Invitations</div>
    </div>
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

  <!-- Live Rooms -->
  <div class="section-header">
    <h2>🟢 Live Rooms</h2>
    <button class="btn btn-ghost btn-sm" onclick="loadRooms()">Refresh</button>
  </div>
  <div id="activeRooms" style="margin-bottom:16px">
    <div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px">Loading…</div>
  </div>
  <p style="font-size:13px;color:var(--muted-fg);margin-bottom:0">
    <a href="/meetings/past" style="color:var(--primary);font-weight:600;text-decoration:none">View past meetings →</a>
  </p>

</div><!-- /page -->
</div><!-- /app-body -->

${startMeetingModal(user)}

${sidebarShellScripts(user)}

<script>
  function joinRoomById(roomId) {
    window.location.href = '/room/' + encodeURIComponent(roomId);
  }
  function joinRoom() {
    let room = document.getElementById('joinRoomInput').value.trim();
    if (!room) return showToast('Please enter a room ID', 'error');
    // If a full URL is pasted, extract just the room ID portion
    if (room.includes('/room/')) {
      room = room.split('/room/')[1].split('?')[0].split('#')[0];
    }
    window.location.href = '/room/' + encodeURIComponent(room);
  }

  async function copyRoomLink(roomId, btn) {
    const link = window.location.origin + '/room/' + roomId;
    try { await navigator.clipboard.writeText(link); }
    catch (e) {
      const ta = Object.assign(document.createElement('textarea'), { value: link });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    const prev = btn.innerHTML;
    btn.innerHTML = '✓ Copied!'; btn.style.color = '#059669';
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

    // Build static parts via innerHTML (no user data embedded in event handlers)
    const infoWrap = document.createElement('div');
    infoWrap.innerHTML =
      '<div class="room-indicator"></div>' +
      '<div class="room-info">' +
        '<div class="room-name">' + m.label + '</div>' +
        '<div class="room-meta">' + p + ' participant' + (p !== 1 ? 's' : '') +
          ' · Admin: ' + (m.adminName || 'Unknown') +
          ' · ' + relativeTime(m.createdAt) + '</div>' +
      '</div>' +
      '<div class="avatar-stack"><div class="avatar">' + initials + '</div></div>';
    while (infoWrap.firstChild) row.appendChild(infoWrap.firstChild);

    // Buttons use addEventListener to safely pass the room ID
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-ghost btn-sm';
    copyBtn.style.gap = '5px';
    copyBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
      '</svg>Link';
    copyBtn.addEventListener('click', function() { copyRoomLink(m.id, this); });

    const joinBtn = document.createElement('button');
    joinBtn.className = 'btn btn-primary btn-sm';
    joinBtn.textContent = 'Join';
    joinBtn.addEventListener('click', function() { joinRoomById(m.id); });

    row.appendChild(copyBtn);
    row.appendChild(joinBtn);
    return row;
  }

  async function loadRooms() {
    const container = document.getElementById('activeRooms');
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px">Loading…</div>';
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) throw new Error('status ' + res.status);
      const meetings = await res.json();
      const active = meetings.filter(m => m.status === 'active');

      // Update stats
      document.getElementById('statTotal').textContent = meetings.length;
      document.getElementById('statActive').textContent = active.length;

      // Load invitation count separately
      fetch('/api/meetings/invitations').then(r => r.ok ? r.json() : []).then(inv => {
        document.getElementById('statInvites').textContent = Array.isArray(inv) ? inv.length : 0;
      }).catch(() => { document.getElementById('statInvites').textContent = '0'; });

      container.innerHTML = '';
      if (!active.length) {
        container.innerHTML = '<div class="empty-state">' +
          '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto">' +
          '<path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>' +
          '</svg><p style="margin-top:8px">No active meetings — start one above!</p></div>';
      } else {
        active.forEach(m => container.appendChild(renderRoomRow(m)));
      }
    } catch (err) {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted-fg);font-size:13px">Could not load meetings — is the server running?</div>';
    }
  }

  loadRooms();
</script>
<script src="/public/ring-notifier.js?v=5"></script>
</body>
</html>`;
}
