import { adminShell } from "./admin-shell";

export function adminUsersPage(admin: { email: string }): string {
  const body = `
    <div class="admin-page-header">
      <h1>Users</h1>
      <p>All registered accounts on the platform (read-only).</p>
    </div>
    <div class="panel">
      <div class="toolbar">
        <input type="search" id="searchQ" placeholder="Search name or email…" />
        <button type="button" id="searchBtn">Search</button>
      </div>
      <div id="loadState" class="loading">Loading users…</div>
      <div class="admin-table-wrap" id="tableWrap" style="display:none">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Verified</th>
              <th>Created</th><th>Created mtgs</th><th>Joined</th><th>Ringing</th>
            </tr>
          </thead>
          <tbody id="usersBody"></tbody>
        </table>
      </div>
      <div class="pager" id="pager" style="display:none">
        <span id="pageInfo"></span>
        <div>
          <button type="button" id="prevBtn">Previous</button>
          <button type="button" id="nextBtn">Next</button>
        </div>
      </div>
    </div>
  `;

  const script = `
    let page = 1;
    const limit = 25;

    async function loadUsers() {
      const loadState = document.getElementById('loadState');
      const tableWrap = document.getElementById('tableWrap');
      const pager = document.getElementById('pager');
      loadState.style.display = '';
      loadState.className = 'loading';
      loadState.textContent = 'Loading users…';
      tableWrap.style.display = 'none';
      pager.style.display = 'none';

      const q = document.getElementById('searchQ').value.trim();
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);

      try {
        const res = await fetch('/api/admin/users?' + params.toString());
        if (res.status === 401) { window.location.href = '/admin/login'; return; }
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        const tbody = document.getElementById('usersBody');
        const rows = data.users || [];
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
        } else {
          tbody.innerHTML = rows.map(u =>
            '<tr>' +
              '<td>' + escapeCell(u.name) + '</td>' +
              '<td>' + escapeCell(u.email) + '</td>' +
              '<td><span class="badge ' + (u.emailVerified ? 'ok' : 'warn') + '">' +
                (u.emailVerified ? 'Verified' : 'Unverified') + '</span></td>' +
              '<td>' + fmtDate(u.createdAt) + '</td>' +
              '<td>' + fmtNum(u.meetingsCreated) + '</td>' +
              '<td>' + fmtNum(u.meetingsJoined) + '</td>' +
              '<td>' + (u.ringingEnabled ? 'On' : 'Off') + '</td>' +
            '</tr>'
          ).join('');
        }
        const total = data.total || 0;
        const pages = Math.max(1, Math.ceil(total / limit));
        document.getElementById('pageInfo').textContent =
          'Page ' + page + ' of ' + pages + ' · ' + fmtNum(total) + ' users';
        document.getElementById('prevBtn').disabled = page <= 1;
        document.getElementById('nextBtn').disabled = page >= pages;
        loadState.style.display = 'none';
        tableWrap.style.display = '';
        pager.style.display = 'flex';
      } catch (e) {
        loadState.className = 'error-box';
        loadState.textContent = 'Could not load users.';
      }
    }

    function escapeCell(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    document.getElementById('searchBtn').addEventListener('click', () => { page = 1; loadUsers(); });
    document.getElementById('searchQ').addEventListener('keydown', e => {
      if (e.key === 'Enter') { page = 1; loadUsers(); }
    });
    document.getElementById('prevBtn').addEventListener('click', () => { if (page > 1) { page--; loadUsers(); } });
    document.getElementById('nextBtn').addEventListener('click', () => { page++; loadUsers(); });
    loadUsers();
  `;

  return adminShell({
    title: "Users",
    active: "users",
    email: admin.email,
    body,
    script,
  });
}
