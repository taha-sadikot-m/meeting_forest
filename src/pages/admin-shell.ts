/** Shared chrome for admin pages (overview / users). */

export function adminShell(opts: {
  title: string;
  active: "overview" | "users";
  email: string;
  body: string;
  script?: string;
}): string {
  const { title, active, email, body, script = "" } = opts;
  const nav = (id: string, href: string, label: string) =>
    `<a href="${href}" class="admin-nav-link${active === id ? " active" : ""}">${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} — Meeting Forest Admin</title>
  <link rel="stylesheet" href="/public/styles.css"/>
  <style>
    :root {
      --admin-bg: #f6f4f1;
      --admin-ink: #1a1a1a;
      --admin-muted: #6b7280;
      --admin-line: #e5e1db;
      --admin-card: #ffffff;
      --admin-accent: #D15000;
    }
    body.admin-body {
      display: flex; flex-direction: column;
      margin: 0; min-height: 100vh; background: var(--admin-bg);
      font-family: Inter, system-ui, sans-serif; color: var(--admin-ink);
    }
    .admin-top {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      flex-wrap: wrap; width: 100%; flex: 0 0 auto;
      padding: 14px 28px; background: #1a1a1a; color: #fff;
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .admin-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; }
    .admin-brand-mark {
      width: 28px; height: 28px; border-radius: 8px; background: var(--admin-accent);
      display: grid; place-items: center;
    }
    .admin-nav { display: flex; align-items: center; gap: 6px; }
    .admin-nav-link {
      color: rgba(255,255,255,.65); text-decoration: none; font-size: 13px; font-weight: 600;
      padding: 8px 12px; border-radius: 8px;
    }
    .admin-nav-link:hover { color: #fff; background: rgba(255,255,255,.08); }
    .admin-nav-link.active { color: #fff; background: rgba(209,80,0,.85); }
    .admin-user { display: flex; align-items: center; gap: 12px; font-size: 12px; color: rgba(255,255,255,.55); }
    .admin-logout {
      border: 1px solid rgba(255,255,255,.2); background: transparent; color: #fff;
      font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 8px; cursor: pointer;
    }
    .admin-logout:hover { background: rgba(255,255,255,.08); }
    .admin-main {
      flex: 1; width: 100%; max-width: 1180px;
      margin: 0 auto; padding: 28px 20px 48px;
      box-sizing: border-box;
    }
    .admin-page-header { margin-bottom: 22px; }
    .admin-page-header h1 { margin: 0 0 6px; font-size: 26px; font-weight: 800; letter-spacing: -.4px; }
    .admin-page-header p { margin: 0; color: var(--admin-muted); font-size: 14px; }
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px;
    }
    @media (max-width: 960px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 520px) { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi-card {
      background: var(--admin-card); border: 1.5px solid var(--admin-line);
      border-radius: 14px; padding: 18px 18px 16px;
    }
    .kpi-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .45px;
      color: var(--admin-muted); margin-bottom: 8px;
    }
    .kpi-val { font-size: 28px; font-weight: 800; letter-spacing: -.5px; }
    .kpi-sub { margin-top: 6px; font-size: 12px; color: var(--admin-muted); }
    .panel {
      background: var(--admin-card); border: 1.5px solid var(--admin-line);
      border-radius: 14px; padding: 18px 20px; margin-bottom: 18px;
    }
    .panel h2 { margin: 0 0 14px; font-size: 16px; font-weight: 700; }
    .panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    @media (max-width: 800px) { .panel-grid { grid-template-columns: 1fr; } }
    .bars { display: flex; align-items: flex-end; gap: 3px; height: 110px; }
    .bar {
      flex: 1; min-width: 0; background: rgba(209,80,0,.18); border-radius: 3px 3px 0 0;
      position: relative;
    }
    .bar.filled { background: var(--admin-accent); }
    .bar-tooltip {
      display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
      background: #1a1a1a; color: #fff; font-size: 10px; padding: 3px 6px; border-radius: 4px; white-space: nowrap;
    }
    .bar:hover .bar-tooltip { display: block; }
    .chart-caption { margin-top: 8px; font-size: 12px; color: var(--admin-muted); }
    .meta-list { display: grid; gap: 8px; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--admin-line); }
    .meta-row:last-child { border-bottom: 0; }
    .meta-row span:last-child { font-weight: 700; }
    .admin-table-wrap { overflow-x: auto; }
    table.admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.admin-table th, table.admin-table td {
      text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--admin-line); white-space: nowrap;
    }
    table.admin-table th {
      font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--admin-muted); font-weight: 700;
    }
    table.admin-table tr:hover td { background: rgba(209,80,0,.03); }
    .badge {
      display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
    }
    .badge.ok { background: rgba(16,185,129,.12); color: #059669; }
    .badge.warn { background: rgba(245,158,11,.14); color: #b45309; }
    .badge.muted { background: #f3f4f6; color: #6b7280; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
    .toolbar input, .toolbar select {
      border: 1.5px solid var(--admin-line); border-radius: 10px; padding: 9px 12px; font-size: 13px;
      background: #fff; min-width: 220px;
    }
    .toolbar button, .pager button {
      border: 1.5px solid var(--admin-line); background: #fff; border-radius: 10px;
      padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .toolbar button:hover, .pager button:hover { border-color: var(--admin-accent); color: var(--admin-accent); }
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; font-size: 13px; color: var(--admin-muted); }
    .loading, .error-box { padding: 24px; text-align: center; color: var(--admin-muted); font-size: 14px; }
    .error-box { color: #b91c1c; }
  </style>
</head>
<body class="admin-body">
  <header class="admin-top">
    <div class="admin-brand">
      <div class="admin-brand-mark">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <span>Meeting Forest Admin</span>
    </div>
    <nav class="admin-nav">
      ${nav("overview", "/admin", "Overview")}
      ${nav("users", "/admin/users", "Users")}
    </nav>
    <div class="admin-user">
      <span>${escapeHtml(email)}</span>
      <button type="button" class="admin-logout" onclick="adminLogout()">Log out</button>
    </div>
  </header>
  <main class="admin-main">
    ${body}
  </main>
  <script>
    async function adminLogout() {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    }
    function fmtNum(n) {
      if (n == null || Number.isNaN(n)) return '—';
      return Number(n).toLocaleString();
    }
    function fmtDate(ms) {
      if (!ms) return '—';
      try { return new Date(ms).toLocaleString(); } catch { return '—'; }
    }
    function renderBars(el, series) {
      if (!el || !series || !series.length) return;
      const max = Math.max(1, ...series.map(s => s.count));
      el.innerHTML = series.map(s => {
        const h = Math.max(2, Math.round((s.count / max) * 100));
        const cls = s.count > 0 ? 'bar filled' : 'bar';
        return '<div class="' + cls + '" style="height:' + h + '%"><span class="bar-tooltip">' +
          s.date + ': ' + s.count + '</span></div>';
      }).join('');
    }
    ${script}
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
