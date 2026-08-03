export function forgotPasswordPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Forgot Password — Meeting Forest</title>
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

    <h1 class="auth-title">Reset password</h1>
    <p class="auth-subtitle">Enter your email and we'll send a verification code</p>

    <form id="forgotForm" onsubmit="handleForgot(event)" novalidate>
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input class="form-input" type="email" id="email" placeholder="you@example.com"
               required autocomplete="email"/>
      </div>
      <button class="btn-auth" type="submit" id="submitBtn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        Send Reset Code
      </button>
    </form>

    <div class="success-state" id="successState">
      <div class="success-icon">✉</div>
      <h2 class="success-title">Check your email</h2>
      <p class="success-msg">If an account exists for that email, we've sent a password reset code. Enter it on the next screen.</p>
      <a id="resetLink" href="/reset-password" class="btn-auth" style="display:flex;margin-top:20px;text-decoration:none;box-sizing:border-box">
        Enter code &amp; new password
      </a>
    </div>

    <p class="auth-footer">
      Remembered it? <a href="/login">Sign in</a>
    </p>

  </div>
</div>

<script>
  async function handleForgot(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch { /* swallow — always show success */ }
    document.getElementById('resetLink').href =
      '/reset-password?email=' + encodeURIComponent(email);
    document.getElementById('forgotForm').style.display = 'none';
    document.getElementById('successState').classList.add('show');
  }
</script>
</body>
</html>`;
}
