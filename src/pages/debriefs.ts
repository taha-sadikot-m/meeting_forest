import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function debriefsPage(user: { name: string; email: string }): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Debriefs</title>
  <link rel="stylesheet" href="/public/styles.css" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }
    .debrief-card { background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl); padding: 20px 24px; margin-bottom: 14px; }
    .debrief-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .debrief-meta { font-size: 12px; color: var(--muted-fg); margin-bottom: 12px; }
    .debrief-summary { font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
    .debrief-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
    .debrief-section h4 { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .debrief-section ul { margin: 0; padding-left: 18px; font-size: 13px; }
    .transcript { display: none; margin-top: 12px; font-size: 12px; background: #f9fafb; padding: 12px; border-radius: 8px; white-space: pre-wrap; max-height: 300px; overflow: auto; }
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.open { display: flex; }
    .modal { background: white; border-radius: var(--r-xl); padding: 32px; width: min(500px,90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .modal p  { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  </style>
</head>
<body>

${appSidebar(user, "debriefs")}
${mobileShell("Debriefs")}

<div class="app-body"><div class="page">
  <div class="page-header">
    <h1>Debrief Inbox</h1>
    <p>Reports from your Assistant.</p>
  </div>
  <div id="debriefsList">Loading…</div>
</div></div>

${startMeetingModal(user)}
${sidebarShellScripts(user)}

<script>
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function renderList(items) {
    const el = document.getElementById('debriefsList');
    if (!items.length) { el.innerHTML = '<p style="color:var(--muted-fg)">No debriefs yet. Send your Assistant to a meeting to get started.</p>'; return; }
    el.innerHTML = items.map(d => {
      const tasks = (d.tasks || []).map(t => '<li>' + esc(typeof t === 'string' ? t : t.task) + '</li>').join('') || '<li>None</li>';
      const decisions = (d.decisions || []).map(x => '<li>' + esc(x) + '</li>').join('') || '<li>None</li>';
      const escalations = (d.escalations || []).map(x => '<li>' + esc(x) + '</li>').join('') || '<li>None</li>';
      return '<div class="debrief-card" id="debrief-' + d.id + '"><h3>' + esc(d.meetingLabel || d.meetingId) + '</h3>' +
        '<div class="debrief-meta">' + esc(d.repName || 'Assistant') + ' · ' + new Date(d.createdAt).toLocaleString() + '</div>' +
        '<div class="debrief-summary">' + esc(d.summary) + '</div>' +
        '<div class="debrief-section"><h4>Tasks</h4><ul>' + tasks + '</ul></div>' +
        '<div class="debrief-section"><h4>Decisions</h4><ul>' + decisions + '</ul></div>' +
        '<div class="debrief-section"><h4>Escalations</h4><ul>' + escalations + '</ul></div>' +
        '<button class="btn btn-ghost btn-sm" onclick="toggleTranscript(\\'' + d.id + '\\')">Toggle transcript</button>' +
        '<div class="transcript" id="transcript-' + d.id + '">' + esc(d.rawLog) + '</div></div>';
    }).join('');
  }
  function toggleTranscript(id) {
    const el = document.getElementById('transcript-' + id);
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
  }
  async function loadDebriefs() {
    const params = new URLSearchParams(location.search);
    const singleId = params.get('id');
    if (singleId) {
      const res = await fetch('/api/debriefs/' + encodeURIComponent(singleId));
      const data = await res.json();
      if (data.debrief) renderList([data.debrief]);
      return;
    }
    const res = await fetch('/api/debriefs');
    const data = await res.json();
    renderList(data.debriefs || []);
  }
  loadDebriefs();
</script>
<script src="/public/ring-notifier.js?v=5"></script>
</body></html>`;
}
