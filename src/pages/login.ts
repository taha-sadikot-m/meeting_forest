export function loginPage(opts: { redirect?: string; verified?: boolean; reset?: boolean } = {}): string {
  const redirect = JSON.stringify(opts.redirect || "/");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Sign In — Meeting Forest</title>
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

    ${opts.verified ? `
    <div class="alert alert-success show">
      <span class="alert-icon">✓</span>
      <span>Email verified! You can now sign in.</span>
    </div>` : ""}
    ${opts.reset ? `
    <div class="alert alert-success show">
      <span class="alert-icon">✓</span>
      <span>Password updated! Sign in with your new password.</span>
    </div>` : ""}

    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-subtitle">Sign in to your Meeting Forest account</p>

    <div class="alert alert-error" id="errorAlert">
      <span class="alert-icon">✕</span>
      <span id="errorMsg"></span>
    </div>

    <form id="loginForm" onsubmit="handleLogin(event)" novalidate>
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input class="form-input" type="email" id="email" placeholder="you@example.com"
               required autocomplete="email" />
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <div class="pw-wrap">
          <input class="form-input" type="password" id="password" placeholder="Your password"
                 required autocomplete="current-password" />
          <button type="button" class="pw-toggle" onclick="togglePw('password', this)" aria-label="Toggle password visibility">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
      <a href="/forgot-password" class="forgot-link">Forgot password?</a>
      <button class="btn-auth" type="submit" id="submitBtn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Sign In
      </button>
    </form>

    <p class="auth-footer">
      Don't have an account? <a href="/register">Create one</a>
    </p>

  </div>
</div>

<script>
  const REDIRECT = ${redirect};

  function togglePw(id, btn) {
    const inp = document.getElementById(id);
    const isText = inp.type === 'text';
    inp.type = isText ? 'password' : 'text';
    btn.style.color = isText ? '#9CA3AF' : '#374151';
  }

  function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorAlert').classList.add('show');
  }

  async function handleLogin(e) {
    e.preventDefault();
    document.getElementById('errorAlert').classList.remove('show');
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Sign in failed');
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In';
        return;
      }
      window.location.href = REDIRECT;
    } catch {
      showError('Network error — please try again');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  }
</script>
</body>
</html>`;
}
