import {
  sidebarCollapseInitScript,
  appSidebar,
  mobileShell,
  startMeetingModal,
  sidebarShellScripts,
} from "./layout";
import { defaultAssistantIntro, defaultAssistantName } from "../db/ai-queries";

export function aiRepSettingsPage(user: { name: string; email: string }): string {
  const safeName = user.name.replace(/`/g, "'");
  const defaultName = defaultAssistantName(user.name);
  const defaultIntro = defaultAssistantIntro(user.name, defaultName).replace(/`/g, "'");
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Assistant</title>
  <link rel="stylesheet" href="/public/styles.css" />
  ${sidebarCollapseInitScript()}
  <style>
    .page-header { margin-bottom: 28px; }
    .page-header h1 { font-size: 28px; font-weight: 800; color: var(--foreground); letter-spacing: -.5px; margin-bottom: 6px; }
    .page-header p  { font-size: 14px; color: var(--muted-fg); }
    .form-card { background: white; border: 1.5px solid var(--border); border-radius: var(--r-xl); padding: 28px; max-width: 720px; margin-bottom: 24px; }
    .form-group { margin-bottom: 18px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .form-input, .form-textarea { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: var(--r-lg); font-size: 14px; box-sizing: border-box; }
    .form-textarea { min-height: 120px; resize: vertical; }
    .context-item { padding: 14px; border: 1px solid var(--border); border-radius: var(--r-lg); margin-bottom: 10px; }
    .context-preview { font-size: 12px; color: var(--muted-fg); margin-top: 6px; max-height: 60px; overflow: hidden; }
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.open { display: flex; }
    .modal { background: white; border-radius: var(--r-xl); padding: 28px; width: min(500px,90vw); box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .modal h3 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .modal p  { font-size: 13px; color: var(--muted-fg); margin-bottom: 20px; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  </style>
</head>
<body>

${appSidebar(user, "ai-rep")}
${mobileShell("Assistant")}

<div class="app-body"><div class="page">
  <div class="page-header">
    <h1>Assistant Settings</h1>
    <p>Configure your Assistant to attend meetings on your behalf.</p>
  </div>
  <div class="form-card">
    <div class="form-group"><label class="form-label">Assistant name</label><input class="form-input" id="repName" value="${defaultName}" /></div>
    <div class="form-group"><label class="form-label">Introduction message</label><textarea class="form-textarea" id="introMessage" placeholder="How your Assistant introduces itself in meetings">${defaultIntro}</textarea></div>
    <div class="form-group"><label class="form-label">Standing instructions</label><textarea class="form-textarea" id="systemPrompt" placeholder="How should your Assistant behave? What should it prioritize?"></textarea></div>
    <button class="btn btn-primary" onclick="saveRep()">Save Assistant</button>
    <button class="btn btn-ghost" style="margin-left:8px" onclick="deleteRep()">Reset Assistant</button>
  </div>
  <div class="form-card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="font-size:16px;font-weight:700">Context Library</h2>
      <button class="btn btn-ghost btn-sm" onclick="openContextModal()">+ Add context</button>
    </div>
    <div id="contextList">Loading…</div>
  </div>
</div></div>

<div class="modal-overlay" id="contextModal">
  <div class="modal">
    <h3>Add Context</h3>
    <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="ctxTitle" /></div>
    <div class="form-group"><label class="form-label">Content</label><textarea class="form-textarea" id="ctxContent"></textarea></div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="saveContext()">Add</button>
      <button class="btn btn-ghost" onclick="closeContextModal()">Cancel</button>
    </div>
  </div>
</div>

${startMeetingModal(user)}
${sidebarShellScripts(user)}

<script>
  async function loadRep() {
    const res = await fetch('/api/ai-rep');
    const data = await res.json();
    if (data.rep) {
      document.getElementById('repName').value = data.rep.name || '';
      document.getElementById('introMessage').value = data.rep.introMessage || '';
      document.getElementById('systemPrompt').value = data.rep.systemPrompt || '';
    }
    const list = document.getElementById('contextList');
    if (!data.contexts?.length) { list.innerHTML = '<p style="color:var(--muted-fg)">No context added yet.</p>'; return; }
    list.innerHTML = data.contexts.map(c => '<div class="context-item"><strong>' + c.title + '</strong><div class="context-preview">' + (c.content || '').slice(0, 200) + '</div><button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="deleteContext(\\'' + c.id + '\\')">Delete</button></div>').join('');
  }
  async function saveRep() {
    const res = await fetch('/api/ai-rep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: document.getElementById('repName').value.trim(),
      introMessage: document.getElementById('introMessage').value.trim(),
      systemPrompt: document.getElementById('systemPrompt').value.trim()
    }) });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    showToast('Assistant saved!', 'success');
    loadRep();
  }
  async function deleteRep() {
    if (!confirm('Reset your Assistant and all context? A new default will be created on next use.')) return;
    await fetch('/api/ai-rep', { method: 'DELETE' });
    loadRep();
  }
  function openContextModal() { document.getElementById('contextModal').classList.add('open'); }
  function closeContextModal() { document.getElementById('contextModal').classList.remove('open'); }
  async function saveContext() {
    const res = await fetch('/api/ai-rep/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: document.getElementById('ctxTitle').value.trim(), content: document.getElementById('ctxContent').value.trim() }) });
    const data = await res.json();
    if (!res.ok) return showToast(data.error || 'Failed', 'error');
    closeContextModal();
    document.getElementById('ctxTitle').value = '';
    document.getElementById('ctxContent').value = '';
    loadRep();
  }
  async function deleteContext(id) {
    if (!confirm('Delete this context?')) return;
    await fetch('/api/ai-rep/context/' + encodeURIComponent(id), { method: 'DELETE' });
    loadRep();
  }
  loadRep();
</script>
<script src="/public/ring-notifier.js?v=5"></script>
</body></html>`;
}
