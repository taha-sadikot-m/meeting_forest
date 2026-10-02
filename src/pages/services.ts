import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

export function servicesPage(user: { name: string; email: string }): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Email Assistant</title>
  <link rel="stylesheet" href="/public/styles.css?v=2" />
  ${sidebarCollapseInitScript(user)}
  <style>
    html { scroll-behavior: smooth; }
    .service-landing { min-height: 100vh; background: #fff; }
    .sl-inner { max-width: 1200px; margin: 0 auto; padding: 0 40px; }

    /* Hero */
    .sl-hero {
      position: relative;
      overflow: hidden;
      padding: 64px 0 72px;
      border-bottom: 1px solid rgba(209, 80, 0, .10);
      background:
        radial-gradient(circle at 85% 15%, rgba(255, 170, 100, .35), transparent 40%),
        radial-gradient(circle at 10% 90%, rgba(255, 200, 150, .25), transparent 35%),
        linear-gradient(135deg, #fff8f1 0%, #ffffff 55%, #fff1e3 100%);
    }
    .sl-hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      gap: 56px;
      align-items: center;
    }
    .sl-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      padding: 6px 12px;
      border: 1px solid rgba(209, 80, 0, .18);
      border-radius: 999px;
      background: rgba(255, 255, 255, .7);
      color: var(--primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .sl-eyebrow::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary);
    }
    .sl-hero h1 {
      margin: 0 0 18px;
      color: var(--foreground);
      font-size: clamp(34px, 4.2vw, 54px);
      font-weight: 850;
      letter-spacing: -.045em;
      line-height: 1.04;
    }
    .sl-hero h1 em { font-style: normal; color: var(--primary); }
    .sl-lead {
      max-width: 520px;
      margin: 0 0 30px;
      color: var(--muted-fg);
      font-size: 17px;
      line-height: 1.65;
    }
    .sl-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 18px; }
    .sl-actions .btn { padding: 13px 26px; font-size: 15px; }
    .sl-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--foreground);
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
    }
    .sl-link:hover { color: var(--primary); }
    .sl-note { margin-top: 18px; color: var(--muted-fg); font-size: 12.5px; }

    /* Mockup */
    .sl-mockup {
      position: relative;
      padding: 18px;
      border: 1px solid rgba(17, 24, 39, .08);
      border-radius: 22px;
      background: white;
      box-shadow: 0 30px 70px rgba(91, 45, 12, .16), 0 2px 6px rgba(17, 24, 39, .04);
      transform: rotate(-1.2deg);
    }
    .sl-mock-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 4px 14px;
      border-bottom: 1px solid var(--border);
    }
    .sl-mock-bar i { width: 9px; height: 9px; border-radius: 50%; background: #e5e7eb; }
    .sl-mock-bar span { margin-left: 10px; color: var(--muted-fg); font-size: 12px; font-weight: 700; }
    .sl-mail {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 13px 6px;
      border-bottom: 1px solid #f3f4f6;
    }
    .sl-avatar {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 50%;
      color: white;
      font-size: 13px;
      font-weight: 800;
    }
    .sl-mail-from { color: var(--foreground); font-size: 13px; font-weight: 700; }
    .sl-mail-subject {
      overflow: hidden;
      color: var(--muted-fg);
      font-size: 12px;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .sl-tag {
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 800;
      white-space: nowrap;
    }
    .sl-tag-urgent { background: #fff1e6; color: #c2410c; }
    .sl-tag-follow { background: #eef2ff; color: #4338ca; }
    .sl-tag-later { background: #f3f4f6; color: #6b7280; }
    .sl-suggest {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-top: 14px;
      padding: 14px;
      border-radius: 14px;
      background: linear-gradient(135deg, #111827, #1f2937);
      color: white;
    }
    .sl-suggest-icon {
      display: grid;
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      place-items: center;
      border-radius: 9px;
      background: linear-gradient(145deg, #ff8a38, var(--primary));
      font-size: 14px;
    }
    .sl-suggest strong { display: block; margin-bottom: 3px; font-size: 12.5px; }
    .sl-suggest p { margin: 0; color: rgba(255, 255, 255, .72); font-size: 12px; line-height: 1.5; }

    /* Value strip */
    .sl-values { border-bottom: 1px solid var(--border); background: #fff; }
    .sl-values-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
    .sl-value {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 26px 24px;
      color: var(--foreground);
      font-size: 14px;
      font-weight: 700;
    }
    .sl-value + .sl-value { border-left: 1px solid var(--border); }
    .sl-value-dot {
      display: grid;
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 10px;
      background: rgba(209, 80, 0, .10);
      color: var(--primary);
      font-weight: 900;
    }

    /* Sections */
    .sl-section { padding: 76px 0; }
    .sl-section-alt { background: #fafaf9; }
    .sl-section-head { max-width: 620px; margin-bottom: 44px; }
    .sl-kicker {
      margin: 0 0 10px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .sl-section-head h2 {
      margin: 0 0 12px;
      color: var(--foreground);
      font-size: clamp(26px, 3vw, 36px);
      letter-spacing: -.035em;
      line-height: 1.12;
    }
    .sl-section-head p { margin: 0; color: var(--muted-fg); font-size: 15px; line-height: 1.65; }

    .sl-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 44px; }
    .sl-feature-icon {
      display: grid;
      width: 52px;
      height: 52px;
      margin-bottom: 18px;
      place-items: center;
      border-radius: 16px;
      background: linear-gradient(145deg, #fff6ec, #ffe0c2);
      color: var(--primary);
    }
    .sl-feature h3 { margin: 0 0 8px; color: var(--foreground); font-size: 18px; letter-spacing: -.02em; }
    .sl-feature p { margin: 0; color: var(--muted-fg); font-size: 14px; line-height: 1.65; }

    .sl-steps {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 36px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .sl-steps::before {
      content: "";
      position: absolute;
      top: 23px;
      right: 16%;
      left: 16%;
      height: 2px;
      background: repeating-linear-gradient(90deg, rgba(209, 80, 0, .35) 0 8px, transparent 8px 16px);
    }
    .sl-step { position: relative; text-align: center; }
    .sl-step-num {
      position: relative;
      display: grid;
      width: 48px;
      height: 48px;
      margin: 0 auto 18px;
      place-items: center;
      border: 4px solid #fafaf9;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 10px 22px rgba(209, 80, 0, .28);
      color: white;
      font-size: 17px;
      font-weight: 850;
    }
    .sl-step h3 { margin: 0 0 8px; color: var(--foreground); font-size: 17px; }
    .sl-step p { max-width: 280px; margin: 0 auto; color: var(--muted-fg); font-size: 14px; line-height: 1.6; }

    /* Closing CTA */
    .sl-cta {
      padding: 64px 0;
      background:
        radial-gradient(circle at 90% 20%, rgba(209, 80, 0, .35), transparent 45%),
        linear-gradient(135deg, #111827 0%, #1f2937 100%);
      color: white;
    }
    .sl-cta-row { display: flex; align-items: center; justify-content: space-between; gap: 32px; }
    .sl-cta h2 { margin: 0 0 8px; font-size: clamp(24px, 3vw, 34px); letter-spacing: -.03em; }
    .sl-cta p { margin: 0; color: rgba(255, 255, 255, .72); font-size: 15px; }
    .sl-cta .btn { flex-shrink: 0; padding: 14px 30px; font-size: 15px; }

    .service-cta:focus-visible,
    .sl-link:focus-visible,
    .service-modal-x:focus-visible,
    .service-success-modal .btn:focus-visible {
      outline: 3px solid rgba(209, 80, 0, .35);
      outline-offset: 3px;
    }

    /* Success modal */
    .service-modal-backdrop {
      position: fixed;
      z-index: 12000;
      inset: 0;
      display: grid;
      padding: 20px;
      place-items: center;
      background: rgba(17, 24, 39, .62);
      backdrop-filter: blur(7px);
    }
    .service-modal-backdrop[hidden] { display: none !important; }
    .service-success-modal {
      position: relative;
      width: min(100%, 440px);
      padding: 38px 36px 34px;
      border: 1px solid rgba(255, 255, 255, .8);
      border-radius: 24px;
      background: white;
      box-shadow: 0 30px 90px rgba(17, 24, 39, .28);
      text-align: center;
      outline: none;
    }
    .service-modal-x {
      position: absolute;
      top: 14px;
      right: 14px;
      display: grid;
      width: 34px;
      height: 34px;
      padding: 0;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--muted-fg);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }
    .service-success-icon {
      display: grid;
      width: 68px;
      height: 68px;
      margin: 0 auto 18px;
      place-items: center;
      border-radius: 22px;
      background: linear-gradient(145deg, #ff8a38, var(--primary));
      box-shadow: 0 15px 30px rgba(209, 80, 0, .25);
      color: white;
      font-size: 31px;
      font-weight: 900;
    }
    .service-modal-eyebrow {
      margin: 0 0 7px;
      color: var(--primary);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .service-success-modal h2 {
      margin: 0 0 10px;
      color: var(--foreground);
      font-size: 25px;
      letter-spacing: -.025em;
    }
    .service-success-modal > p:not(.service-modal-eyebrow) {
      margin: 0 auto 24px;
      color: var(--muted-fg);
      font-size: 14px;
      line-height: 1.65;
    }
    .service-success-modal .btn { min-width: 132px; justify-content: center; }
    body.service-modal-open { overflow: hidden; }
    #startModal[hidden] { display: none !important; }

    @media (max-width: 1000px) {
      .sl-hero { padding: 48px 0 56px; }
      .sl-hero-grid { grid-template-columns: 1fr; gap: 40px; }
      .sl-mockup { max-width: 560px; transform: none; }
    }
    @media (max-width: 700px) {
      .sl-inner { padding: 0 18px; }
      .sl-hero { padding: 32px 0 40px; }
      .sl-lead { font-size: 15px; }
      .sl-actions { flex-direction: column; align-items: stretch; }
      .sl-actions .btn, .sl-cta .btn { width: 100%; justify-content: center; }
      .sl-link { justify-content: center; }
      .sl-values-grid, .sl-features, .sl-steps { grid-template-columns: 1fr; }
      .sl-value { padding: 16px 4px; }
      .sl-value + .sl-value { border-top: 1px solid var(--border); border-left: none; }
      .sl-section { padding: 48px 0; }
      .sl-features { gap: 30px; }
      .sl-steps::before { display: none; }
      .sl-cta { padding: 44px 0; }
      .sl-cta-row { flex-direction: column; align-items: stretch; text-align: center; }
      .sl-mail { grid-template-columns: 30px minmax(0, 1fr); }
      .sl-tag { display: none; }
      .service-success-modal { padding: 34px 24px 28px; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
    }
  </style>
</head>
<body data-page="email-assistant">

${appSidebar(user, "email-assistant")}
${mobileShell("Email Assistant")}

<div class="app-body"><main class="service-landing">
  <section class="sl-hero" aria-labelledby="servicesTitle">
    <div class="sl-inner sl-hero-grid">
      <div>
        <span class="sl-eyebrow">Other Services &middot; Email Assistant</span>
        <h1 id="servicesTitle">Your inbox, sorted <em>before your next meeting</em></h1>
        <p class="sl-lead">Email Assistant finds the messages that need you, turns them into clear next steps, and keeps follow-ups from your meetings from slipping away.</p>
        <div class="sl-actions">
          <button class="btn btn-primary service-cta" id="emailAssistantStart" type="button">Get Started</button>
          <a class="sl-link" href="#how-it-works">See how it works <span aria-hidden="true">&darr;</span></a>
        </div>
        <p class="sl-note">Instructions are sent to the email on your Meeting Forest account.</p>
      </div>

      <div class="sl-mockup" aria-hidden="true">
        <div class="sl-mock-bar"><i></i><i></i><i></i><span>Inbox &middot; sorted by Email Assistant</span></div>
        <div class="sl-mail">
          <div class="sl-avatar" style="background:#D15000">P</div>
          <div><div class="sl-mail-from">Priya Shah</div><div class="sl-mail-subject">Contract changes before Friday's review</div></div>
          <span class="sl-tag sl-tag-urgent">Reply today</span>
        </div>
        <div class="sl-mail">
          <div class="sl-avatar" style="background:#4f46e5">M</div>
          <div><div class="sl-mail-from">Marcus Lee</div><div class="sl-mail-subject">Action items from Q3 kickoff</div></div>
          <span class="sl-tag sl-tag-follow">Follow-up</span>
        </div>
        <div class="sl-mail">
          <div class="sl-avatar" style="background:#0f766e">D</div>
          <div><div class="sl-mail-from">Design team</div><div class="sl-mail-subject">Weekly digest and new mockups</div></div>
          <span class="sl-tag sl-tag-later">Later</span>
        </div>
        <div class="sl-suggest">
          <div class="sl-suggest-icon">&#10022;</div>
          <div>
            <strong>Suggested next step</strong>
            <p>Reply to Priya first. Her questions block Friday's review you scheduled in Meeting Forest.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sl-values" aria-label="Highlights">
    <div class="sl-inner sl-values-grid">
      <div class="sl-value"><span class="sl-value-dot">1</span>Set up in a few minutes</div>
      <div class="sl-value"><span class="sl-value-dot">2</span>Linked to your Meeting Forest account</div>
      <div class="sl-value"><span class="sl-value-dot">3</span>Nothing connects until you approve</div>
    </div>
  </section>

  <section class="sl-section" id="features" aria-labelledby="featuresTitle">
    <div class="sl-inner">
      <div class="sl-section-head">
        <p class="sl-kicker">What you get</p>
        <h2 id="featuresTitle">Less time in email, more time on the work that matters</h2>
        <p>Email Assistant works alongside your meetings so the conversations you start in a room don't stall in your inbox.</p>
      </div>
      <div class="sl-features">
        <div class="sl-feature">
          <div class="sl-feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
          </div>
          <h3>Prioritised inbox</h3>
          <p>Messages that need a reply rise to the top. Newsletters and FYIs wait until you have time.</p>
        </div>
        <div class="sl-feature">
          <div class="sl-feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
          </div>
          <h3>Meeting follow-ups</h3>
          <p>Emails tied to a meeting are grouped together, so action items from each call stay in one place.</p>
        </div>
        <div class="sl-feature">
          <div class="sl-feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <h3>Daily next-steps digest</h3>
          <p>Start each day with a short list of what to answer, what to schedule, and what can wait.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="sl-section sl-section-alt" id="how-it-works" aria-labelledby="stepsTitle">
    <div class="sl-inner">
      <div class="sl-section-head">
        <p class="sl-kicker">How it works</p>
        <h2 id="stepsTitle">Up and running in three steps</h2>
      </div>
      <ol class="sl-steps">
        <li class="sl-step">
          <div class="sl-step-num">1</div>
          <h3>Click Get Started</h3>
          <p>Choose Email Assistant from Other Services and start setup from this page.</p>
        </li>
        <li class="sl-step">
          <div class="sl-step-num">2</div>
          <h3>Check your email</h3>
          <p>We send setup instructions to the address on your Meeting Forest account.</p>
        </li>
        <li class="sl-step">
          <div class="sl-step-num">3</div>
          <h3>Follow the steps</h3>
          <p>Approve the connection when you're ready and your inbox starts getting sorted.</p>
        </li>
      </ol>
    </div>
  </section>

  <section class="sl-cta" aria-labelledby="readyTitle">
    <div class="sl-inner sl-cta-row">
      <div>
        <h2 id="readyTitle">Ready to take back your inbox?</h2>
        <p>Start Email Assistant and we'll send the instructions straight to you.</p>
      </div>
      <button class="btn btn-primary service-cta" id="emailAssistantStartBottom" type="button">Get Started</button>
    </div>
  </section>
</main></div>

<div class="service-modal-backdrop" id="emailAssistantModal" hidden>
  <section
    class="service-success-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="emailAssistantModalTitle"
    tabindex="-1"
  >
    <button class="service-modal-x" id="emailAssistantClose" type="button" aria-label="Close">×</button>
    <div class="service-success-icon" aria-hidden="true">✓</div>
    <p class="service-modal-eyebrow">You’re all set</p>
    <h2 id="emailAssistantModalTitle">Check your inbox</h2>
    <p>Instructions have been sent to your email. Enjoy your Email Assistant service.</p>
    <button class="btn btn-primary" id="emailAssistantDone" type="button">Done</button>
  </section>
</div>

${startMeetingModal(user)}
${sidebarShellScripts(user)}

<script>
  const emailAssistantTriggers = [
    document.getElementById('emailAssistantStart'),
    document.getElementById('emailAssistantStartBottom'),
  ];
  const emailAssistantModal = document.getElementById('emailAssistantModal');
  const emailAssistantDialog = emailAssistantModal
    ? emailAssistantModal.querySelector('[role="dialog"]')
    : null;
  let emailAssistantPreviousFocus = null;

  function openEmailAssistantModal() {
    if (!emailAssistantModal || !emailAssistantDialog) return;
    emailAssistantPreviousFocus = document.activeElement;
    emailAssistantModal.hidden = false;
    document.body.classList.add('service-modal-open');
    emailAssistantDialog.focus();
  }

  function closeEmailAssistantModal() {
    if (!emailAssistantModal || emailAssistantModal.hidden) return;
    emailAssistantModal.hidden = true;
    document.body.classList.remove('service-modal-open');
    if (emailAssistantPreviousFocus && typeof emailAssistantPreviousFocus.focus === 'function') {
      emailAssistantPreviousFocus.focus();
    }
  }

  emailAssistantTriggers.forEach(function(trigger) {
    if (trigger) trigger.addEventListener('click', openEmailAssistantModal);
  });
  document.getElementById('emailAssistantClose')?.addEventListener('click', closeEmailAssistantModal);
  document.getElementById('emailAssistantDone')?.addEventListener('click', closeEmailAssistantModal);
  emailAssistantModal?.addEventListener('click', function(event) {
    if (event.target === emailAssistantModal) closeEmailAssistantModal();
  });
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeEmailAssistantModal();
  });
</script>
<script src="/public/ring-notifier.js?v=5"></script>
<script src="/public/agent-widget.js?v=2"></script>
</body></html>`;
}
