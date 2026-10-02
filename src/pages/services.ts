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
    .services-page { padding-bottom: 48px; max-width: 760px; }
    .services-hero {
      position: relative;
      overflow: hidden;
      margin-bottom: 22px;
      padding: 30px 34px;
      border: 1px solid rgba(209, 80, 0, .16);
      border-radius: 24px;
      background:
        radial-gradient(circle at 92% 8%, rgba(255, 187, 115, .42), transparent 34%),
        linear-gradient(135deg, #fffaf5 0%, #fff 58%, #fff4e8 100%);
      box-shadow: 0 18px 46px rgba(91, 45, 12, .08);
    }
    .services-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 12px;
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
      margin: 0 0 10px;
      color: var(--foreground);
      font-size: clamp(28px, 3vw, 38px);
      font-weight: 850;
      letter-spacing: -.045em;
      line-height: 1.06;
    }
    .services-hero p {
      max-width: 560px;
      margin: 0 0 18px;
      color: var(--muted-fg);
      font-size: 15px;
      line-height: 1.65;
    }
    .service-panel {
      margin-bottom: 16px;
      padding: 24px 28px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: white;
      box-shadow: 0 10px 28px rgba(17, 24, 39, .05);
    }
    .service-panel h2 {
      margin: 0 0 10px;
      color: var(--foreground);
      font-size: 20px;
      letter-spacing: -.02em;
    }
    .service-panel p {
      margin: 0 0 10px;
      color: var(--muted-fg);
      font-size: 14px;
      line-height: 1.65;
    }
    .service-panel p:last-child { margin-bottom: 0; }
    .service-benefits {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      color: #374151;
      font-size: 14px;
      line-height: 1.45;
      list-style: none;
    }
    .service-benefits li {
      position: relative;
      padding-left: 26px;
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
    .service-cta-band {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 28px;
      border-radius: 20px;
      background: #111827;
      color: white;
    }
    .service-cta-band h2 {
      margin: 0 0 4px;
      font-size: 18px;
      letter-spacing: -.02em;
    }
    .service-cta-band p {
      margin: 0;
      color: rgba(255, 255, 255, .72);
      font-size: 13px;
      line-height: 1.5;
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
    @media (max-width: 700px) {
      .services-hero { padding: 24px 20px; }
      .services-hero h1 { font-size: 28px; }
      .service-panel { padding: 20px 18px; }
      .service-cta-band { flex-direction: column; align-items: stretch; padding: 20px 18px; }
      .service-cta { width: 100%; justify-content: center; }
      .service-success-modal { padding: 34px 24px 28px; }
    }
  </style>
</head>
<body data-page="email-assistant">

${appSidebar(user, "email-assistant")}
${mobileShell("Email Assistant")}

<div class="app-body"><main class="page services-page">
  <section class="services-hero" aria-labelledby="servicesTitle">
    <span class="services-eyebrow">Other Services</span>
    <h1 id="servicesTitle">Email Assistant</h1>
    <p>A smarter way to organize email, stay on top of follow-ups, and keep important conversations moving.</p>
    <button class="btn btn-primary service-cta" id="emailAssistantStart" type="button">Get Started</button>
  </section>

  <section class="service-panel" aria-labelledby="aboutTitle">
    <h2 id="aboutTitle">What it does</h2>
    <p>Email Assistant helps you sort what needs a reply from what can wait. It turns a busy inbox into a short list of next steps, so follow-ups do not slip past the meeting that created them.</p>
    <p>Getting started is simple. We send the setup instructions to the email on your Meeting Forest account. Nothing is connected until you follow those steps.</p>
  </section>

  <section class="service-panel" aria-labelledby="benefitsTitle">
    <h2 id="benefitsTitle">Benefits</h2>
    <ul class="service-benefits">
      <li>Inbox guidance tailored to your workflow</li>
      <li>Clear next steps for important messages</li>
      <li>Simple onboarding delivered to your email</li>
    </ul>
  </section>

  <section class="service-cta-band" aria-labelledby="readyTitle">
    <div>
      <h2 id="readyTitle">Ready when you are</h2>
      <p>Start Email Assistant and we will send the instructions to your inbox.</p>
    </div>
    <button class="btn btn-primary service-cta" id="emailAssistantStartBottom" type="button">Get Started</button>
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
