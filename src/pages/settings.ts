import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function settingsPage(user: { name: string; email: string }): string {
  const initial = user.name[0]?.toUpperCase() || "?";
  const safeName = user.name.replace(/`/g, "'");
  const safeEmail = user.email.replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Settings</title>
  <link rel="stylesheet" href="/public/styles.css?v=2" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }
    .form-card { background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl); padding: 28px; max-width: 720px; margin-bottom: 24px; }
    .form-card h2 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .form-card .card-desc { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .form-group { margin-bottom: 18px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .form-input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--r-lg); font-size: 14px; box-sizing: border-box; }
    .form-input:disabled { background: #f9fafb; color: var(--muted-fg); }
    .profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .profile-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: white; font-size: 22px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .setting-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 0; border-top: 1px solid var(--border); }
    .setting-row:first-of-type { border-top: none; padding-top: 0; }
    .setting-info { flex: 1; min-width: 0; }
    .setting-label { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .setting-desc { font-size: 13px; color: var(--muted-fg); line-height: 1.5; }
    .member-since { font-size: 12px; color: var(--muted-fg); margin-top: 4px; }
    #startModal[hidden] { display: none !important; }
  </style>
</head>
<body>

${appSidebar(user, "settings")}
${mobileShell("Settings")}

<div class="app-body"><div class="page">
  <div class="page-header">
    <h1>Settings</h1>
    <p>Manage your profile and meeting preferences.</p>
  </div>

  <div class="form-card">
    <h2>Profile</h2>
    <p class="card-desc">Your account information.</p>
    <div class="profile-header">
      <div class="profile-avatar" id="profileAvatar">${initial}</div>
      <div>
        <div style="font-weight:700;font-size:16px" id="profileDisplayName">${safeName}</div>
        <div style="font-size:13px;color:var(--muted-fg)">${safeEmail}</div>
        <div class="member-since" id="memberSince"></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Display name</label>
      <input class="form-input" id="displayName" value="${safeName}" />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" id="emailField" value="${safeEmail}" disabled />
    </div>
    <button class="btn btn-primary" onclick="saveProfile()">Save Profile</button>
  </div>

  <div class="form-card">
    <h2>Meeting Preferences</h2>
    <p class="card-desc">Control how AI-scheduled meetings reach you.</p>
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-label">Ringing mode</div>
        <div class="setting-desc" id="ringingDesc">When on, AI-scheduled meetings ring you in the app first. Your assistant joins only if you don't answer.</div>
      </div>
      <button class="perm-toggle on" id="ringingToggle" onclick="toggleRinging(this)" title="Toggle ringing mode" aria-label="Ringing mode"></button>
    </div>
  </div>
</div></div>

${startMeetingModal(user)}
${sidebarShellScripts(user)}

<script>
  let ringingEnabled = true;

  function formatDate(ts) {
    if (!ts) return '';
    return 'Member since ' + new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function updateRingingUI(enabled) {
    ringingEnabled = enabled;
    const btn = document.getElementById('ringingToggle');
    btn.classList.toggle('on', enabled);
    document.getElementById('ringingDesc').textContent = enabled
      ? 'When on, AI-scheduled meetings ring you in the app first. Your assistant joins only if you don\\'t answer.'
      : 'When off, AI-scheduled meetings skip ringing and send your assistant directly at your scheduled time.';
  }

  async function loadSettings() {
    const res = await fetch('/api/user/settings');
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Failed to load settings', 'error');
    const s = data.settings;
    document.getElementById('displayName').value = s.name || '';
    document.getElementById('profileDisplayName').textContent = s.name || '';
    document.getElementById('profileAvatar').textContent = (s.name || '?')[0].toUpperCase();
    document.getElementById('memberSince').textContent = formatDate(s.createdAt);
    updateRingingUI(s.ringingEnabled !== false);
  }

  async function saveProfile() {
    const name = document.getElementById('displayName').value.trim();
    if (!name) return showToast('Name cannot be empty', 'error');
    const res = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Failed to save', 'error');
    document.getElementById('profileDisplayName').textContent = data.settings.name;
    document.getElementById('profileAvatar').textContent = data.settings.name[0].toUpperCase();
    const sidebarName = document.querySelector('.sb-user-name');
    if (sidebarName) sidebarName.textContent = data.settings.name;
    showToast('Profile saved!', 'success');
  }

  async function toggleRinging(btn) {
    const next = !ringingEnabled;
    btn.disabled = true;
    const res = await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ringingEnabled: next })
    });
    const data = await res.json();
    btn.disabled = false;
    if (!res.ok) return showToast(data.error || 'Failed to update', 'error');
    updateRingingUI(data.settings.ringingEnabled !== false);
    showToast(next ? 'Ringing mode enabled' : 'Ringing mode disabled — assistant will join directly', 'success');
  }

  loadSettings();
</script>
<script src="/public/ring-notifier.js?v=5"></script>
</body></html>`;
}
