export function registerPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Create Account — Meeting Forest</title>
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

    <h1 class="auth-title">Create account</h1>
    <p class="auth-subtitle">Start collaborating with Meeting Forest</p>

    <div class="alert alert-error" id="errorAlert">
      <span class="alert-icon">✕</span>
      <span id="errorMsg"></span>
    </div>

    <form id="registerForm" onsubmit="handleRegister(event)" novalidate>
      <div class="form-group">
        <label class="form-label" for="name">Full Name</label>
        <input class="form-input" type="text" id="name" placeholder="Your display name"
               required autocomplete="name" />
      </div>
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input class="form-input" type="email" id="email" placeholder="you@example.com"
               required autocomplete="email" />
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
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
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        Create Account
      </button>
    </form>

    <!-- Success state (after registration) -->
    <div class="success-state" id="successState">
      <div class="success-icon">✉</div>
      <h2 class="success-title">Check your email</h2>
      <p class="success-msg" id="successMsg">We've sent a verification link to your email. Click it to activate your account.</p>
    </div>

    <!-- Unverified state (email exists but not verified) -->
    <div class="success-state" id="unverifiedState">
      <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#F59E0B,#D97706);display:flex;align-items:center;justify-content:center;margin:0 auto 18px">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h2 class="success-title">Email not verified</h2>
      <p class="success-msg">This email is registered but hasn't been verified yet. Click below to resend the verification link.</p>
      <button id="resendBtn" onclick="resendVerification()"
        style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:20px;padding:13px 20px;background:#D15000;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;transition:background .2s">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        Resend Verification Email
      </button>
      <p style="margin-top:16px;font-size:13px;color:#6B7280;text-align:center">
        Wrong account? <a href="/register" style="color:#D15000;font-weight:600">Go back</a>
        &nbsp;·&nbsp;
        <a href="/login" style="color:#D15000;font-weight:600">Sign in</a>
      </p>
    </div>

    <p class="auth-footer" id="registerFooter">
      Already have an account? <a href="/login">Sign in</a>
    </p>

  </div>
</div>

<script>
  let _pendingEmail = '';

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
    label.className = 'strength-label strength-label-' + levels[score];
  }

  function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorAlert').classList.add('show');
  }

  function showUnverified(email) {
    _pendingEmail = email;
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('errorAlert').classList.remove('show');
    document.getElementById('registerFooter').style.display = 'none';
    document.getElementById('unverifiedState').classList.add('show');
  }

  async function resendVerification() {
    const btn = document.getElementById('resendBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: _pendingEmail }),
      });
    } catch {}
    // Always show success (prevent enumeration)
    document.getElementById('unverifiedState').classList.remove('show');
    document.getElementById('successMsg').textContent =
      'We resent the verification link to ' + _pendingEmail + '. Check your inbox.';
    document.getElementById('successState').classList.add('show');
  }

  async function handleRegister(e) {
    e.preventDefault();
    document.getElementById('errorAlert').classList.remove('show');
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    if (password !== confirm) { showError('Passwords do not match'); return; }
    if (password.length < 8)  { showError('Password must be at least 8 characters'); return; }
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.unverified) {
          showUnverified(email);
        } else {
          showError(data.error || 'Registration failed');
          btn.disabled = false; btn.textContent = 'Create Account';
        }
        return;
      }
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('successMsg').textContent =
        'We sent a verification link to ' + email + '. Click it to activate your account.';
      document.getElementById('successState').classList.add('show');
    } catch {
      showError('Network error — please try again');
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  }
</script>
</body>
</html>`;
}
