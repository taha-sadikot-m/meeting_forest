import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function pastMeetingsPage(user: { name: string; email: string }): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Past Meetings</title>
  <link rel="stylesheet" href="/public/styles.css" />
  ${sidebarCollapseInitScript()}
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

${appSidebar(user, "past")}
${mobileShell("Past Meetings")}

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

${startMeetingModal(user, false)}
${sidebarShellScripts(user, false)}

<script>
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
        // Build static cells via innerHTML (no room ID embedded in event handlers)
        tr.innerHTML =
          '<td><div style="font-weight:700">' + m.label + '</div>' +
            '<div style="font-size:11px;color:var(--muted-fg);margin-top:2px">Admin: ' + (m.adminName || 'Unknown') + '</div></td>' +
          '<td style="color:var(--muted-fg)">' + formatDate(m.createdAt) + '</td>' +
          '<td>' + roleBadge(m.role) + '</td>' +
          '<td>' + statusBadge(m.status) + '</td>' +
          '<td style="text-align:right"></td>';
        // Build action button as DOM element to safely capture the room ID in a closure
        const actionCell = tr.querySelector('td:last-child');
        if (m.status === 'active') {
          const btn = document.createElement('button');
          btn.className = 'btn btn-primary btn-sm';
          btn.textContent = 'Rejoin';
          btn.addEventListener('click', function() { window.location.href = '/room/' + m.id; });
          actionCell.appendChild(btn);
        } else {
          const btn = document.createElement('button');
          btn.className = 'btn btn-ghost btn-sm';
          btn.textContent = 'Ended';
          btn.style.opacity = '0.5';
          btn.disabled = true;
          actionCell.appendChild(btn);
        }
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
<script src="/public/ring-notifier.js?v=5"></script>
</body>
</html>`;
}
