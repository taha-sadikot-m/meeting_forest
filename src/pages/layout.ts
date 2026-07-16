export type AppPage =
  | "dashboard"
  | "past"
  | "invitations"
  | "messages"
  | "ai-meeting"
  | "ai-rep"
  | "debriefs"
  | "settings";

function linkClass(active: AppPage, page: AppPage): string {
  return active === page ? "sb-link active" : "sb-link";
}

export function sidebarCollapseInitScript(): string {
  return `<script>
    (function(){
      if(localStorage.getItem('sidebar-state')==='collapsed' && window.innerWidth>=768)
        document.documentElement.classList.add('sidebar-collapsed');
    })();
  </script>`;
}

export function appSidebar(user: { name: string; email: string }, active: AppPage): string {
  const initial = user.name[0]?.toUpperCase() || "?";
  const safeName = user.name.replace(/`/g, "'");
  const safeEmail = user.email.replace(/`/g, "'");

  return /* html */`<aside class="sidebar" id="sidebar">
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
    <a href="/" class="${linkClass(active, "dashboard")}" title="Dashboard">
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
    <a href="/meetings/past" class="${linkClass(active, "past")}" title="Past Meetings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span>Past Meetings</span>
    </a>
    <a href="/meetings/invitations" class="${linkClass(active, "invitations")}" title="Invitations" id="sidebarInviteLink">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      <span>Invitations</span>
    </a>
    <a href="/messages" class="${linkClass(active, "messages")}" title="Messages">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>Messages</span>
    </a>
    <a href="/ai-meeting" class="${linkClass(active, "ai-meeting")}" title="Scheduling">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      <span>Scheduling</span>
    </a>
    <a href="/settings/ai-rep" class="${linkClass(active, "ai-rep")}" title="Assistant">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <span>Assistant</span>
    </a>
    <a href="/debriefs" class="${linkClass(active, "debriefs")}" title="Debriefs">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <span>Debriefs</span>
    </a>
    <a href="/settings" class="${linkClass(active, "settings")}" title="Settings">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <span>Settings</span>
    </a>
  </nav>

  <div class="sb-footer">
    <a href="/settings" class="sb-user" title="Settings">
      <div class="sb-user-avatar">${initial}</div>
      <div class="sb-user-info">
        <div class="sb-user-name">${safeName}</div>
        <div class="sb-user-role">${safeEmail}</div>
      </div>
    </a>
    <a href="/logout" class="sb-logout" title="Logout">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </a>
  </div>
</aside>`;
}

export function mobileShell(pageTitle: string): string {
  return /* html */`<div class="mobile-topbar">
  <button class="sb-toggle" onclick="toggleSidebar()">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  </button>
  <span style="font-weight:800;font-size:16px;color:#111827">${pageTitle}</span>
</div>
<div class="sb-overlay" id="sbOverlay" onclick="toggleSidebar()"></div>`;
}

export function startMeetingModal(user: { name: string; email: string }, includePrivacy = true): string {
  const safeName = user.name.replace(/`/g, "'");
  const privacyBlock = includePrivacy ? `
    <div class="form-group">
      <label class="form-label">Meeting Privacy</label>
      <div style="display:flex;gap:16px;margin-top:6px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--foreground)">
          <input type="radio" name="startPrivacy" value="public" checked style="accent-color:var(--primary)" />
          <span>
            <strong>Public</strong>
            <span style="font-size:12px;color:var(--muted-fg);display:block">Anyone with the link joins directly</span>
          </span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--foreground)">
          <input type="radio" name="startPrivacy" value="private" style="accent-color:var(--primary)" />
          <span>
            <strong>Private</strong>
            <span style="font-size:12px;color:var(--muted-fg);display:block">You admit each person manually</span>
          </span>
        </label>
      </div>
    </div>` : "";

  return /* html */`<div class="modal-overlay" id="startModal" hidden>
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
    ${privacyBlock}
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

<div class="toast-container" id="toastContainer"></div>`;
}

export function sidebarShellScripts(user: { name: string; email: string }, includePrivacy = true): string {
  const safeName = user.name.replace(/`/g, "'");
  const privacyLine = includePrivacy
    ? `const privacyEl = document.querySelector('input[name="startPrivacy"]:checked');
    const privacy  = privacyEl ? privacyEl.value : 'public';`
    : `const privacy = 'public';`;

  return /* html */`<script>
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
    const el = document.getElementById('startModal');
    el.hidden = false;
    el.classList.add('open');
    document.getElementById('newRoomName').value = '';
    document.getElementById('newRoomName').focus();
  }
  function closeStartModal() {
    const el = document.getElementById('startModal');
    el.hidden = true;
    el.classList.remove('open');
  }
  document.getElementById('startModal').addEventListener('click', e => {
    if (e.target === document.getElementById('startModal')) closeStartModal();
  });

  async function startMeeting() {
    const rawName  = document.getElementById('newRoomName').value.trim();
    const userName = document.getElementById('newUserName').value.trim() || ${JSON.stringify(safeName)};
    ${privacyLine}
    if (!rawName) return showToast('Please enter a meeting name', 'error');
    const btn = document.querySelector('#startModal .btn-primary');
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: rawName, adminName: userName, privacy })
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
</script>`;
}
