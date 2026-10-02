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
  <title>Meeting Forest — Other Services</title>
  <link rel="stylesheet" href="/public/styles.css?v=2" />
  ${sidebarCollapseInitScript(user)}
  <style>
    .services-page { padding-bottom: 56px; }
    .services-hero {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
      min-height: 210px;
      margin-bottom: 26px;
      padding: 38px 42px;
      border: 1px solid rgba(209, 80, 0, .16);
      border-radius: 24px;
      background:
        radial-gradient(circle at 92% 8%, rgba(255, 187, 115, .42), transparent 34%),
        linear-gradient(135deg, #fffaf5 0%, #fff 58%, #fff4e8 100%);
      box-shadow: 0 18px 46px rgba(91, 45, 12, .08);
    }
    .services-hero::after {
      content: "";
      position: absolute;
      right: -90px;
      bottom: -120px;
      width: 260px;
      height: 260px;
      border: 42px solid rgba(209, 80, 0, .06);
      border-radius: 50%;
      pointer-events: none;
    }
    .services-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 13px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .services-eyebrow::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 0 5px rgba(209, 80, 0, .10);
    }
    .services-hero h1 {
      max-width: 670px;
      margin: 0 0 12px;
      color: var(--foreground);
      font-size: clamp(30px, 4vw, 46px);
      font-weight: 850;
      letter-spacing: -.045em;
      line-height: 1.06;
    }
    .services-hero p {
      max-width: 590px;
      margin: 0;
      color: var(--muted-fg);
      font-size: 15px;
      line-height: 1.65;
    }
    .services-hero-mark {
      position: relative;
      z-index: 1;
      display: grid;
      flex: 0 0 104px;
      width: 104px;
      height: 104px;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, .7);
      border-radius: 30px;
      background: linear-gradient(145deg, #ff8a38, var(--primary));
      box-shadow: 0 20px 38px rgba(209, 80, 0, .28);
      color: white;
      font-size: 46px;
      transform: rotate(5deg);
    }
    .services-catalogue {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 390px), 1fr));
      gap: 22px;
    }
    .service-card {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      display: grid;
      grid-template-columns: 92px minmax(0, 1fr);
      gap: 26px;
      min-height: 340px;
      padding: 34px;
      border: 1px solid var(--border);
      border-radius: 24px;
      background: white;
      box-shadow: 0 16px 40px rgba(17, 24, 39, .08);
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    }
    .service-card:hover {
      border-color: rgba(209, 80, 0, .28);
      box-shadow: 0 24px 54px rgba(91, 45, 12, .14);
      transform: translateY(-4px);
    }
    .service-card-glow {
      position: absolute;
      z-index: -1;
      top: -110px;
      left: -90px;
      width: 270px;
      height: 270px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 150, 65, .20), transparent 68%);
      pointer-events: none;
    }
    .service-icon {
      display: grid;
      width: 82px;
      height: 82px;
      place-items: center;
      border: 1px solid rgba(209, 80, 0, .14);
      border-radius: 24px;
      background: linear-gradient(145deg, #fff6ec, #ffe3c8);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .9), 0 13px 28px rgba(209, 80, 0, .15);
      color: var(--primary);
    }
    .service-card-content {
      display: flex;
      min-width: 0;
      flex-direction: column;
      align-items: flex-start;
    }
    .service-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 14px;
      padding: 6px 10px;
      border: 1px solid #bbf7d0;
      border-radius: 999px;
      background: #f0fdf4;
      color: #166534;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .03em;
      text-transform: uppercase;
    }
    .service-badge span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, .13);
    }
    .service-card h2 {
      margin: 0 0 10px;
      color: var(--foreground);
      font-size: 27px;
      letter-spacing: -.025em;
    }
    .service-summary {
      margin: 0 0 18px;
      color: var(--muted-fg);
      font-size: 14px;
      line-height: 1.65;
    }
    .service-benefits {
      display: grid;
      gap: 10px;
      margin: 0 0 24px;
      padding: 0;
      color: #374151;
      font-size: 13px;
      line-height: 1.45;
      list-style: none;
    }
    .service-benefits li {
      position: relative;
      padding-left: 25px;
    }
    .service-benefits li::before {
      content: "✓";
      position: absolute;
      top: -1px;
      left: 0;
      display: grid;
      width: 18px;
      height: 18px;
      place-items: center;
      border-radius: 50%;
      background: rgba(209, 80, 0, .10);
      color: var(--primary);
      font-size: 11px;
      font-weight: 900;
    }
    .service-cta {
      min-width: 148px;
      margin-top: auto;
      justify-content: center;
    }
    .service-cta:focus-visible,
    .service-modal-x:focus-visible,
    .service-success-modal .btn:focus-visible {
      outline: 3px solid rgba(209, 80, 0, .30);
      outline-offset: 3px;
    }
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
      animation: serviceModalIn .18s ease-out;
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
    @keyframes serviceModalIn {
      from { opacity: 0; transform: translateY(10px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 700px) {
      .services-page { padding-bottom: 34px; }
      .services-hero { min-height: auto; padding: 28px 24px; }
      .services-hero h1 { font-size: 31px; }
      .services-hero-mark { display: none; }
      .service-card {
        grid-template-columns: 1fr;
        gap: 20px;
        min-height: 0;
        padding: 26px 22px;
      }
      .service-card:hover { transform: none; }
      .service-icon { width: 70px; height: 70px; border-radius: 20px; }
      .service-cta { width: 100%; }
      .service-success-modal { padding: 34px 24px 28px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .service-card, .service-success-modal { transition: none; animation: none; }
    }
  </style>
</head>
<body data-page="services">

${appSidebar(user, "services")}
${mobileShell("Other Services")}

<div class="app-body"><main class="page services-page">
  <section class="services-hero" aria-labelledby="servicesTitle">
    <div>
      <span class="services-eyebrow">More from Meeting Forest</span>
      <h1 id="servicesTitle">Services built around your workday</h1>
      <p>Discover helpful tools available to registered Meeting Forest members.</p>
    </div>
    <div class="services-hero-mark" aria-hidden="true">✦</div>
  </section>

  <section class="services-catalogue" aria-label="Available services">
    <article class="service-card service-card-email">
      <div class="service-card-glow" aria-hidden="true"></div>
      <div class="service-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="5" width="18" height="14" rx="3"/>
          <path d="m4 7 8 6 8-6"/>
          <path d="M17 2v4M15 4h4"/>
        </svg>
      </div>
      <div class="service-card-content">
        <span class="service-badge"><span aria-hidden="true"></span> Available now</span>
        <h2>Email Assistant</h2>
        <p class="service-summary">A smarter way to organize email, stay on top of follow-ups, and keep important conversations moving.</p>
        <ul class="service-benefits">
          <li>Inbox guidance tailored to your workflow</li>
          <li>Clear next steps for important messages</li>
          <li>Simple onboarding delivered to your email</li>
        </ul>
        <button class="btn btn-primary service-cta" id="emailAssistantStart" type="button">
          Get Started
        </button>
      </div>
    </article>
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
  const emailAssistantTrigger = document.getElementById('emailAssistantStart');
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

  if (emailAssistantTrigger) {
    emailAssistantTrigger.addEventListener('click', openEmailAssistantModal);
  }
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
