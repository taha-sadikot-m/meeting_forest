export function waitingRoomPage(
  roomId: string,
  user: { name: string; email: string },
  meetingLabel?: string
): string {
  const safeRoomId    = JSON.stringify(roomId);       // JS-safe: "room-id"
  const safeName      = JSON.stringify(user.name);    // JS-safe: "Taha"
  const safeLabel     = (meetingLabel || roomId).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeInitial   = (user.name[0] || "?").toUpperCase();

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Waiting to Join — Meeting Forest</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0D1117 0%, #1C1F2E 60%, #0D1117 100%);
      font-family: Inter, system-ui, sans-serif;
    }

    .wr-card {
      background: rgba(255,255,255,.04);
      border: 1.5px solid rgba(255,255,255,.09);
      border-radius: 24px;
      padding: 48px 40px;
      width: min(460px, 94vw);
      text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,.5);
    }

    .wr-logo {
      width: 60px; height: 60px; border-radius: 16px;
      background: linear-gradient(135deg, #D15000, #ff7b2e);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
    }

    .wr-meeting-name {
      font-size: 13px; font-weight: 600;
      color: rgba(255,255,255,.4);
      margin-bottom: 6px;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .wr-title {
      font-size: 22px; font-weight: 800; color: rgba(255,255,255,.92);
      margin-bottom: 8px;
    }
    .wr-subtitle {
      font-size: 14px; color: rgba(255,255,255,.45);
      line-height: 1.6; margin-bottom: 32px;
    }

    /* Spinner */
    .wr-spinner-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      margin-bottom: 32px;
    }
    .wr-avatar-ring {
      position: relative; width: 72px; height: 72px;
    }
    .wr-avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED, #4F46E5);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 800; color: white;
      position: relative; z-index: 1;
    }
    .wr-ring {
      position: absolute; inset: -6px; border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: #D15000;
      animation: spin 1.4s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .wr-dots { display: flex; gap: 6px; }
    .wr-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #D15000; opacity: .3;
      animation: dotPulse 1.4s ease-in-out infinite;
    }
    .wr-dot:nth-child(2) { animation-delay: .2s; }
    .wr-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes dotPulse { 0%,80%,100% { opacity:.3; transform:scale(1); } 40% { opacity:1; transform:scale(1.2); } }

    .wr-status {
      font-size: 14px; font-weight: 600; color: rgba(255,255,255,.6);
      margin-bottom: 0; min-height: 20px;
    }

    /* State screens */
    .wr-state { display: none; }
    .wr-state.active { display: block; }

    /* Admitted state */
    .wr-admitted-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(16,185,129,.15);
      border: 2px solid #10B981;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 28px;
    }
    .wr-admitted-title { font-size: 20px; font-weight: 800; color: #10B981; margin-bottom: 8px; }
    .wr-admitted-sub { font-size: 14px; color: rgba(255,255,255,.5); margin-bottom: 24px; }

    /* Rejected state */
    .wr-rejected-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(239,68,68,.12);
      border: 2px solid #EF4444;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px; font-size: 28px;
    }
    .wr-rejected-title { font-size: 20px; font-weight: 800; color: #EF4444; margin-bottom: 8px; }
    .wr-rejected-sub { font-size: 14px; color: rgba(255,255,255,.45); margin-bottom: 24px; }

    .wr-back-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 24px; border-radius: 12px;
      background: rgba(255,255,255,.07); border: 1.5px solid rgba(255,255,255,.12);
      color: rgba(255,255,255,.7); font-size: 14px; font-weight: 600;
      text-decoration: none; cursor: pointer;
      transition: all .2s;
    }
    .wr-back-btn:hover { background: rgba(255,255,255,.12); color: white; }
  </style>
</head>
<body>

<div class="wr-card">
  <div class="wr-logo">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2.5">
      <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
    </svg>
  </div>

  <div class="wr-meeting-name">Private Meeting</div>
  <div class="wr-title">${safeLabel}</div>
  <div class="wr-subtitle" id="wrIntro">You're about to enter a private meeting.<br>Please wait while the host reviews your request.</div>

  <!-- Waiting state (default) -->
  <div class="wr-state active" id="stateWaiting">
    <div class="wr-spinner-wrap">
      <div class="wr-avatar-ring">
        <div class="wr-avatar">${safeInitial}</div>
        <div class="wr-ring"></div>
      </div>
      <div class="wr-dots">
        <div class="wr-dot"></div>
        <div class="wr-dot"></div>
        <div class="wr-dot"></div>
      </div>
    </div>
    <p class="wr-status" id="wrStatusText">Waiting for the host to admit you…</p>
  </div>

  <!-- Admitted state -->
  <div class="wr-state" id="stateAdmitted">
    <div class="wr-admitted-icon">✓</div>
    <div class="wr-admitted-title">You've been admitted!</div>
    <div class="wr-admitted-sub">Entering the meeting now…</div>
  </div>

  <!-- Rejected state -->
  <div class="wr-state" id="stateRejected">
    <div class="wr-rejected-icon">✕</div>
    <div class="wr-rejected-title">Entry denied</div>
    <div class="wr-rejected-sub">The host didn't admit you to this meeting.</div>
    <a href="/" class="wr-back-btn">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back to Dashboard
    </a>
  </div>

  <!-- Expired / Error state -->
  <div class="wr-state" id="stateExpired">
    <div class="wr-rejected-icon">⏱</div>
    <div class="wr-rejected-title">Request timed out</div>
    <div class="wr-rejected-sub">No response from the host. Please try again.</div>
    <button class="wr-back-btn" id="retryBtn">Try Again</button>
    &nbsp;
    <a href="/" class="wr-back-btn" style="margin-top:10px">Back to Dashboard</a>
  </div>
</div>

<script>
  const ROOM_ID = ${safeRoomId};
  let waitingId   = null;
  let pollInterval = null;
  let knockTime   = Date.now();

  function showState(id) {
    ['stateWaiting','stateAdmitted','stateRejected','stateExpired'].forEach(s => {
      document.getElementById(s).classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
  }

  async function knock() {
    document.getElementById('wrStatusText').textContent = 'Connecting to meeting…';
    try {
      const res = await fetch('/api/meetings/' + encodeURIComponent(ROOM_ID) + '/knock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        document.getElementById('wrStatusText').textContent = data.error || 'Could not reach host';
        return;
      }
      waitingId = data.waitingId;
      knockTime = Date.now();

      if (data.status === 'admitted' || data.status === 'entered') {
        enterMeeting(); return;
      }
      if (data.status === 'rejected') {
        showState('stateRejected'); return;
      }

      document.getElementById('wrStatusText').textContent = 'Waiting for the host to admit you…';
      pollInterval = setInterval(pollStatus, 2000);
    } catch (e) {
      document.getElementById('wrStatusText').textContent = 'Could not connect to server. Retrying…';
      setTimeout(knock, 4000);
    }
  }

  async function pollStatus() {
    if (!waitingId) return;

    // Timeout after 10 minutes
    if (Date.now() - knockTime > 10 * 60 * 1000) {
      clearInterval(pollInterval);
      showState('stateExpired');
      return;
    }

    const elapsed = Math.floor((Date.now() - knockTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
    document.getElementById('wrStatusText').textContent =
      'Waiting for the host to admit you… (' + timeStr + ')';

    try {
      const res = await fetch(
        '/api/meetings/' + encodeURIComponent(ROOM_ID) +
        '/knock-status/' + encodeURIComponent(waitingId)
      );
      const data = await res.json();
      if (data.status === 'admitted' || data.status === 'entered') {
        clearInterval(pollInterval);
        enterMeeting();
      } else if (data.status === 'rejected') {
        clearInterval(pollInterval);
        showState('stateRejected');
      } else if (data.status === 'expired') {
        clearInterval(pollInterval);
        showState('stateExpired');
      }
    } catch (e) { /* network hiccup — keep polling */ }
  }

  function enterMeeting() {
    showState('stateAdmitted');
    setTimeout(() => {
      window.location.href = '/room/' + encodeURIComponent(ROOM_ID);
    }, 1200);
  }

  // Retry button
  document.getElementById('retryBtn').addEventListener('click', function() {
    waitingId = null;
    clearInterval(pollInterval);
    showState('stateWaiting');
    knock();
  });

  // Kick off
  knock();
</script>
</body>
</html>`;
}
