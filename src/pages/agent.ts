import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";

/** Thin landing page that opens the floating agent widget (?agent=1). */
export function agentPage(user: { name: string; email: string }): string {
  const firstName = user.name.split(" ")[0].replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — AI Agent</title>
  <link rel="stylesheet" href="/public/styles.css?v=2" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); max-width: 560px; line-height: 1.5; }
    .agent-hint {
      background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl);
      padding: 28px; max-width: 560px;
    }
    .agent-hint strong { color: var(--primary); }
    #startModal[hidden] { display: none !important; }
  </style>
</head>
<body>

${appSidebar(user, "agent")}
${mobileShell("AI Agent")}

<div class="app-body"><div class="page">
  <div class="page-header">
    <h1>AI Agent</h1>
    <p>Hi ${firstName}. Use the orange button at the bottom-right to chat with your agent — schedule meetings, invite people, or send your Assistant.</p>
  </div>
  <div class="agent-hint">
    <p style="margin:0 0 12px;font-size:14px;line-height:1.5">The agent opens as a floating chat on every page (including meeting rooms). Click <strong>Open agent</strong> or the bottom-right button.</p>
    <button type="button" class="btn btn-primary" id="openAgentBtn">Open agent</button>
  </div>
</div></div>

${startMeetingModal(user)}
${sidebarShellScripts(user)}
<script src="/public/ring-notifier.js?v=5"></script>
<script src="/public/agent-widget.js?v=2"></script>
<script>
  (function(){
    function openAgent(){ if(window.MFAgent) window.MFAgent.open(); }
    document.getElementById('openAgentBtn').addEventListener('click', openAgent);
    openAgent();
  })();
</script>
</body>
</html>`;
}
