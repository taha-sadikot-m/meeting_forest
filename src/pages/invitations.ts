import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function invitationsPage(user: { name: string; email: string }): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Invitations</title>
  <link rel="stylesheet" href="/public/styles.css" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }

    .invite-card {
      background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl);
      padding: 18px 22px; margin-bottom: 12px;
      display: flex; align-items: flex-start; gap: 16px;
      transition: all .2s;
    }
    .invite-card:hover { border-color: rgba(209,80,0,.25); box-shadow: 0 4px 16px rgba(209,80,0,.07); }
    .invite-avatar {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #D15000, #ff7b2e);
      color: white; font-size: 18px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 2px;
    }
    .invite-info { flex: 1; min-width: 0; }
    .invite-title { font-size: 15px; font-weight: 700; color: var(--foreground); line-height: 1.3; }
    .invite-from  { font-size: 13px; color: var(--foreground); margin-top: 6px; line-height: 1.4; }
    .invite-from strong { font-weight: 700; }
    .invite-from-email { color: var(--muted-fg); font-weight: 500; }
    .invite-meta  { font-size: 12px; color: var(--muted-fg); margin-top: 5px; line-height: 1.5; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .invite-meta-sep { opacity: .45; }
    .invite-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }

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

    @media (max-width: 720px) {
      .invite-card { flex-direction: column; align-items: stretch; }
      .invite-actions { justify-content: stretch; }
      .invite-actions .btn { flex: 1; }
    }
  </style>
</head>
<body>

${appSidebar(user, "invitations")}
${mobileShell("Invitations")}

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

${startMeetingModal(user, false)}
${sidebarShellScripts(user, false)}

<script>
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  function formatMeetingTime(ts) {
    if (!ts) return null;
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
      });
    } catch { return null; }
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
        const label = (inv.label && String(inv.label) !== 'null') ? String(inv.label) : 'Untitled meeting';
        const fromName = (inv.invitedBy && String(inv.invitedBy) !== 'null')
          ? String(inv.invitedBy)
          : (inv.adminName && String(inv.adminName) !== 'null' ? String(inv.adminName) : 'someone');
        const fromEmail = (inv.invitedByEmail && String(inv.invitedByEmail) !== 'null')
          ? String(inv.invitedByEmail)
          : '';
        const meetingTime = formatMeetingTime(inv.meetingAt) || formatMeetingTime(inv.invitedAt);
        const initial = (fromName !== 'someone' ? fromName : label).charAt(0).toUpperCase() || '?';
        const isActive = inv.status === 'active';

        const card = document.createElement('div');
        card.className = 'invite-card';
        card.innerHTML =
          '<div class="invite-avatar">' + escapeHtml(initial) + '</div>' +
          '<div class="invite-info">' +
            '<div class="invite-title">' + escapeHtml(label) + '</div>' +
            '<div class="invite-from">' +
              'From: <strong>' + escapeHtml(fromName) + '</strong>' +
              (fromEmail ? ' <span class="invite-from-email">· ' + escapeHtml(fromEmail) + '</span>' : '') +
            '</div>' +
            '<div class="invite-meta">' +
              (meetingTime
                ? '<span>Meeting: <strong style="color:var(--foreground);font-weight:600">' + escapeHtml(meetingTime) + '</strong></span>'
                : '') +
              (meetingTime ? '<span class="invite-meta-sep">·</span>' : '') +
              '<span>Invited ' + escapeHtml(relativeTime(inv.invitedAt)) + '</span>' +
              '<span class="invite-meta-sep">·</span>' +
              (isActive
                ? '<span class="badge badge-active">● Live now</span>'
                : '<span class="badge badge-ended">' + escapeHtml(inv.status || 'ended') + '</span>') +
            '</div>' +
          '</div>' +
          '<div class="invite-actions"></div>';

        const actionsDiv = card.querySelector('.invite-actions');
        const actionBtn = document.createElement('button');
        actionBtn.className = isActive ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
        actionBtn.textContent = isActive ? 'Join Meeting' : 'View Room';
        actionBtn.addEventListener('click', function() { window.location.href = '/room/' + inv.id; });
        actionsDiv.appendChild(actionBtn);

        const repBtn = document.createElement('button');
        repBtn.className = 'btn btn-ghost btn-sm';
        repBtn.textContent = 'Send my Assistant';
        repBtn.addEventListener('click', function() { deployRep(inv.id, repBtn); });
        actionsDiv.appendChild(repBtn);
        content.appendChild(card);
      });
    } catch (err) {
      content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted-fg);font-size:13px">Could not load invitations.</div>';
    }
  }

  loadInvitations();

  async function deployRep(meetingId, btn) {
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      const repRes = await fetch('/api/ai-rep');
      const repData = await repRes.json();
      if (!repData.rep) {
        if (confirm('You need to configure your Assistant first. Go to settings?')) {
          window.location.href = '/settings/ai-rep';
        }
        return;
      }
      btn.textContent = 'Deploying…';
      const res = await fetch('/api/ai-rep/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');
      showToast('Your Assistant will attend this meeting', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send my Assistant';
    }
  }
</script>
<script src="/public/ring-notifier.js?v=5"></script>
<script src="/public/agent-widget.js?v=2"></script>
</body>
</html>`;
}
