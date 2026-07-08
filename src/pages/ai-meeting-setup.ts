import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function aiMeetingSetupPage(user: { name: string; email: string }): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Scheduling</title>
  <link rel="stylesheet" href="/public/styles.css" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }
    .form-card { background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl); padding: 28px; max-width: 720px; }
    .form-group { margin-bottom: 18px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .form-input, .form-textarea { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--r-lg); font-size: 14px; box-sizing: border-box; }
    .form-textarea { min-height: 100px; resize: vertical; }
    .participants-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .participants-table th, .participants-table td { padding: 8px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--border); }
    .meeting-row { padding: 14px 18px; background: white; border: 1.5px solid var(--border); border-radius: var(--r-lg); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.open { display: flex; }
    .modal { background: white; border-radius: var(--r-xl); padding: 32px; width: min(500px,90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .modal p  { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  </style>
</head>
<body>

${appSidebar(user, "ai-meeting")}
${mobileShell("Scheduling")}

<div class="app-body"><div class="page">
  <div class="page-header"><h1>Scheduling</h1><p>Schedule a meeting — participants will be called at their scheduled times. Assistants join if someone is unavailable.</p></div>
  <div class="form-card">
    <div class="form-group"><label class="form-label">Meeting Name</label><input class="form-input" id="label" placeholder="Weekly Standup" /></div>
    <div class="form-group"><label class="form-label">Agenda</label><textarea class="form-textarea" id="agenda" placeholder="Topics to cover…"></textarea></div>
    <div class="form-group"><label class="form-label">Scheduled Start</label><input class="form-input" type="datetime-local" id="scheduledAt" /></div>
    <div class="form-group">
      <label class="form-label">Participants</label>
      <table class="participants-table"><thead><tr><th>Email</th><th>Ring At</th><th></th></tr></thead><tbody id="participantsBody"></tbody></table>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="addParticipant()">+ Add participant</button>
    </div>
    <button class="btn btn-primary" onclick="submitMeeting()">Schedule Meeting</button>
  </div>
  <div style="margin-top:32px"><h2 style="font-size:18px;font-weight:700;margin-bottom:12px">Your scheduled meetings</h2><div id="meetingsList">Loading…</div></div>
</div></div>

${startMeetingModal(user)}
${sidebarShellScripts(user)}

<script>
  document.getElementById('scheduledAt').value = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);
  function defaultRingTime(offsetMinutes) {
    const start = new Date(document.getElementById('scheduledAt').value);
    if (isNaN(start.getTime())) return '';
    const t = new Date(start.getTime() + offsetMinutes * 60000);
    return t.toISOString().slice(0, 16);
  }
  function addParticipant() {
    const tbody = document.getElementById('participantsBody');
    const tr = document.createElement('tr');
    tr.innerHTML = '<td><input class="form-input" type="email" placeholder="email@example.com" /></td><td><input class="form-input" type="datetime-local" /></td><td><button type="button" class="btn btn-ghost btn-sm" onclick="this.closest(\\'tr\\').remove()">Remove</button></td>';
    tbody.appendChild(tr);
    const ringInput = tr.querySelector('input[type=datetime-local]');
    ringInput.value = defaultRingTime(tbody.rows.length - 1);
  }
  addParticipant();
  async function submitMeeting() {
    const label = document.getElementById('label').value.trim();
    const agenda = document.getElementById('agenda').value.trim();
    const scheduledAt = new Date(document.getElementById('scheduledAt').value).getTime();
    const participants = [];
    document.querySelectorAll('#participantsBody tr').forEach(tr => {
      const email = tr.querySelector('input[type=email]').value.trim();
      const ringAt = new Date(tr.querySelector('input[type=datetime-local]').value).getTime();
      if (email) participants.push({ email, ringAt });
    });
    if (!label || !agenda) return showToast('Name and agenda required', 'error');
    const res = await fetch('/api/ai-meetings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, agenda, scheduledAt, participants }) });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    showToast('Meeting scheduled!', 'success');
    loadMeetings();
  }
  async function loadMeetings() {
    const el = document.getElementById('meetingsList');
    const res = await fetch('/api/ai-meetings');
    const data = await res.json();
    if (!data.meetings?.length) { el.innerHTML = '<p style="color:var(--muted-fg)">No scheduled meetings yet.</p>'; return; }
    el.innerHTML = data.meetings.map(m => '<div class="meeting-row"><div><strong>' + m.label + '</strong><br><small>' + m.status + ' · ' + new Date(m.scheduledAt).toLocaleString() + '</small></div><div><a href="/room/' + m.id + '" class="btn btn-sm btn-primary">Join</a> ' + (m.status !== 'ended' ? '<button class="btn btn-sm btn-ghost" onclick="endMeeting(\\'' + m.id + '\\')">End</button>' : '') + '</div></div>').join('');
  }
  async function endMeeting(id) { if (!confirm('End meeting?')) return; await fetch('/api/ai-meetings/' + encodeURIComponent(id) + '/end', { method: 'POST' }); loadMeetings(); }
  loadMeetings();
</script>
<script src="/public/ring-notifier.js?v=5"></script>
</body></html>`;
}
