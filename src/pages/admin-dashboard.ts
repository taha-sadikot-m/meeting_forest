import { adminShell } from "./admin-shell";

export function adminDashboardPage(admin: { email: string }): string {
  const body = `
    <div class="admin-page-header">
      <h1>Platform overview</h1>
      <p>Aggregate analytics across users, meetings, invitations, and AI features.</p>
    </div>
    <div id="loadState" class="loading">Loading analytics…</div>
    <div id="dash" style="display:none">
      <div class="kpi-grid" id="kpiGrid"></div>
      <div class="panel-grid">
        <div class="panel">
          <h2>Signups (30 days)</h2>
          <div class="bars" id="signupBars"></div>
          <div class="chart-caption">UTC daily new users</div>
        </div>
        <div class="panel">
          <h2>Meetings created (30 days)</h2>
          <div class="bars" id="meetingBars"></div>
          <div class="chart-caption">UTC daily meeting nodes</div>
        </div>
      </div>
      <div class="panel-grid">
        <div class="panel">
          <h2>Invitations & participation</h2>
          <div class="meta-list" id="partMeta"></div>
        </div>
        <div class="panel">
          <h2>AI platform</h2>
          <div class="meta-list" id="aiMeta"></div>
        </div>
      </div>
      <div class="panel">
        <h2>Recent meetings</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Label</th><th>Status</th><th>Privacy</th>
                <th>Creator</th><th>Participants</th><th>Created</th>
              </tr>
            </thead>
            <tbody id="meetingsBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const script = `
    async function loadOverview() {
      const loadState = document.getElementById('loadState');
      try {
        const [ovRes, mRes] = await Promise.all([
          fetch('/api/admin/overview'),
          fetch('/api/admin/meetings?page=1&limit=15'),
        ]);
        if (ovRes.status === 401 || mRes.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        if (!ovRes.ok) throw new Error('Failed to load overview');
        const data = await ovRes.json();
        const meetingsFailed = !mRes.ok;
        const meetings = meetingsFailed ? { meetings: [] } : (await mRes.json());

        const kpis = [
          { label: 'Users', val: data.users.total, sub: data.users.verified + ' verified · ' + data.users.last7d + ' last 7d' },
          { label: 'Meetings', val: data.meetings.total, sub: data.meetings.active + ' active · ' + data.meetings.last7d + ' last 7d' },
          { label: 'Live now', val: data.live.liveUsers, sub: data.live.liveRooms + ' rooms with presence' },
          { label: 'AI meetings', val: data.ai.meetingsTotal, sub: data.ai.reps + ' assistants · ' + data.ai.debriefsTotal + ' debriefs' },
        ];
        document.getElementById('kpiGrid').innerHTML = kpis.map(k =>
          '<div class="kpi-card"><div class="kpi-label">' + k.label + '</div>' +
          '<div class="kpi-val">' + fmtNum(k.val) + '</div>' +
          '<div class="kpi-sub">' + k.sub + '</div></div>'
        ).join('');

        renderBars(document.getElementById('signupBars'), data.series.signups);
        renderBars(document.getElementById('meetingBars'), data.series.meetings);

        document.getElementById('partMeta').innerHTML = [
          ['Unverified users', fmtNum(data.users.unverified)],
          ['Public / private meetings', fmtNum(data.meetings.public) + ' / ' + fmtNum(data.meetings.private)],
          ['Total joins (PARTICIPATES_IN)', fmtNum(data.participation.totalJoins)],
          ['Avg participants / meeting', fmtNum(data.participation.avgPerMeeting)],
          ['Invitations sent', fmtNum(data.invitations.total)],
          ['Invite → join (users)', fmtNum(data.invitations.converted) + ' (' + data.invitations.conversionRate + '%)'],
        ].map(([l, v]) => '<div class="meta-row"><span>' + l + '</span><span>' + v + '</span></div>').join('');

        const statusBits = Object.keys(data.ai.byStatus || {}).length
          ? Object.entries(data.ai.byStatus).map(([k, v]) => k + ': ' + v).join(' · ')
          : 'none';
        document.getElementById('aiMeta').innerHTML = [
          ['AI meetings by status', statusBits],
          ['AI participant slots', fmtNum(data.ai.participantSlots)],
          ['AI join rate', data.ai.joinRate + '%'],
          ['Debriefs undelivered', fmtNum(data.ai.debriefsUndelivered)],
        ].map(([l, v]) => '<div class="meta-row"><span>' + l + '</span><span>' + v + '</span></div>').join('');

        const tbody = document.getElementById('meetingsBody');
        const rows = meetings.meetings || [];
        if (meetingsFailed) {
          tbody.innerHTML = '<tr><td colspan="6" class="error-box" style="padding:16px">Could not load recent meetings</td></tr>';
        } else if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="6">No meetings yet</td></tr>';
        } else {
          tbody.innerHTML = rows.map(m =>
            '<tr>' +
              '<td>' + escapeCell(m.label) + '</td>' +
              '<td><span class="badge ' + (m.status === 'active' ? 'ok' : 'muted') + '">' + escapeCell(m.status) + '</span></td>' +
              '<td>' + escapeCell(m.privacy) + '</td>' +
              '<td>' + escapeCell(m.creatorName || m.creatorEmail || '—') + '</td>' +
              '<td>' + fmtNum(m.participantCount) + '</td>' +
              '<td>' + fmtDate(m.createdAt) + '</td>' +
            '</tr>'
          ).join('');
        }

        loadState.style.display = 'none';
        document.getElementById('dash').style.display = '';
      } catch (e) {
        loadState.className = 'error-box';
        loadState.textContent = 'Could not load analytics. ' + (e && e.message ? e.message : '');
      }
    }
    function escapeCell(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    loadOverview();
  `;

  return adminShell({
    title: "Overview",
    active: "overview",
    email: admin.email,
    body,
    script,
  });
}
