export function resetPasswordPage(token: string): string {
  const safeToken = token.replace(/[^a-f0-9]/gi, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset Password — Meeting Forest</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/public/auth.css"/>
</head>
<body>
<div class="auth-wrap">
  <div class="auth-card">

    <a href="/" class="auth-brand">
      <div class="auth-logo">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <span class="auth-brand-name">Meeting Forest</span>
    </a>

    <h1 class="auth-title">Set new password</h1>
    <p class="auth-subtitle">Choose a strong password for your account</p>

    <div class="alert alert-error" id="errorAlert">
      <span class="alert-icon">✕</span>
      <span id="errorMsg"></span>
    </div>

    <div class="alert alert-error show" id="expiredAlert" style="display:none">
      <span class="alert-icon">✕</span>
      <span>This reset link has expired or is invalid. <a href="/forgot-password" style="color:inherit;text-decoration:underline">Request a new one.</a></span>
    </div>

    <form id="resetForm" onsubmit="handleReset(event)" novalidate>
      <input type="hidden" id="token" value="${safeToken}"/>
      <div class="form-group">
        <label class="form-label" for="password">New Password</label>
        <div class="pw-wrap">
          <input class="form-input" type="password" id="password" placeholder="At least 8 characters"
                 required autocomplete="new-password" oninput="checkStrength(this.value)"/>
          <button type="button" class="pw-toggle" onclick="togglePw('password', this)" aria-label="Toggle password">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div class="strength-bar"><div class="strength-fill" id="strengthFill"></div></div>
        <span class="strength-label" id="strengthLabel"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="confirm">Confirm Password</label>
        <div class="pw-wrap">
          <input class="form-input" type="password" id="confirm" placeholder="Same password again"
                 required autocomplete="new-password"/>
          <button type="button" class="pw-toggle" onclick="togglePw('confirm', this)" aria-label="Toggle password">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
      <button class="btn-auth" type="submit" id="submitBtn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Set New Password
      </button>
    </form>

    <p class="auth-footer">
      <a href="/login">← Back to sign in</a>
    </p>

  </div>
</div>

<script>
  // If no token, show expired immediately
  if (!document.getElementById('token').value) {
    document.getElementById('resetForm').style.display = 'none';
    document.getElementById('expiredAlert').style.display = 'flex';
  }

  function togglePw(id, btn) {
    const inp = document.getElementById(id);
    const isText = inp.type === 'text';
    inp.type = isText ? 'password' : 'text';
    btn.style.color = isText ? '#9CA3AF' : '#374151';
  }

  function checkStrength(pw) {
    const fill = document.getElementById('strengthFill');
    const label = document.getElementById('strengthLabel');
    if (!pw) { fill.style.width = '0'; fill.className = 'strength-fill'; label.textContent = ''; return; }
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = ['', 'weak', 'fair', 'good', 'strong', 'strong'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
    const widths  = ['0%', '20%', '40%', '60%', '80%', '100%'];
    fill.className = 'strength-fill strength-' + levels[score];
    fill.style.width = widths[score];
    label.textContent = labels[score];
  }

  function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorAlert').classList.add('show');
  }

  async function handleReset(e) {
    e.preventDefault();
    document.getElementById('errorAlert').classList.remove('show');
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm').value;
    if (password !== confirm) { showError('Passwords do not match'); return; }
    if (password.length < 8)  { showError('Password must be at least 8 characters'); return; }
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: document.getElementById('token').value, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.error && data.error.toLowerCase().includes('expired')) {
          document.getElementById('resetForm').style.display = 'none';
          document.getElementById('expiredAlert').style.display = 'flex';
        } else {
          showError(data.error || 'Reset failed');
          btn.disabled = false; btn.textContent = 'Set New Password';
        }
        return;
      }
      window.location.href = '/login?reset=1';
    } catch {
      showError('Network error — please try again');
      btn.disabled = false; btn.textContent = 'Set New Password';
    }
  }
</script>
</body>
</html>`;
}
