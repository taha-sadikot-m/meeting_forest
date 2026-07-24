/**
 * agent-widget.js — floating Cursor-like AI agent workspace.
 * Tabs: Chat / Results / Tools. Renders structured UI blocks (actions, links, in-card tabs).
 */
(function () {
  'use strict';

  if (window.__MF_AGENT_WIDGET__) return;
  window.__MF_AGENT_WIDGET__ = true;

  var OPEN_KEY = 'mf-agent-open';
  var TAB_KEY = 'mf-agent-tab';
  var history = [];
  var busy = false;
  var activeWorkspaceTab = 'chat';
  var resultCards = [];
  var lastTools = [];

  function resolveContext() {
    var meetingId =
      (window.__MF_MEETING_ID && String(window.__MF_MEETING_ID)) ||
      (document.body && document.body.getAttribute('data-meeting-id')) ||
      '';
    meetingId = (meetingId || '').trim();
    if (meetingId) {
      return { surface: 'meeting', meetingId: meetingId };
    }
    return { surface: 'app' };
  }

  function injectStyles() {
    if (document.getElementById('mf-agent-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'mf-agent-widget-styles';
    style.textContent = [
      '#mfAgentRoot{position:fixed;right:20px;bottom:20px;z-index:9000;font-family:inherit;}',
      '#mfAgentFab{',
      'width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
      'background:#D15000;color:#fff;box-shadow:0 8px 24px rgba(209,80,0,.35);',
      'display:flex;align-items:center;justify-content:center;',
      'transition:transform .15s ease,background .15s ease;',
      '}',
      '#mfAgentFab:hover{background:#B04300;transform:translateY(-2px);}',
      '#mfAgentFab[aria-expanded="true"]{background:#111827;}',
      '#mfAgentPanel{',
      'position:absolute;right:0;bottom:68px;',
      'width:min(520px,calc(100vw - 32px));',
      'height:min(720px,calc(100vh - 96px));',
      'background:#fff;border:1.5px solid #E5E7EB;border-radius:16px;',
      'box-shadow:0 20px 50px rgba(0,0,0,.18);',
      'display:none;flex-direction:column;overflow:hidden;',
      '}',
      '#mfAgentPanel.open{display:flex;}',
      '#mfAgentHeader{',
      'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;',
      'padding:14px 16px 0;background:#FFF3E9;border-bottom:1.5px solid #E5E7EB;',
      '}',
      '#mfAgentHeader h3{margin:0;font-size:16px;font-weight:800;color:#111827;}',
      '#mfAgentHeader p{margin:2px 0 0;font-size:11px;color:#6B7280;}',
      '#mfAgentClose{',
      'border:none;background:transparent;color:#6B7280;cursor:pointer;',
      'width:32px;height:32px;border-radius:8px;font-size:18px;line-height:1;flex-shrink:0;',
      '}',
      '#mfAgentClose:hover{background:#EBEBEB;color:#111827;}',
      '#mfAgentTabs{',
      'display:flex;gap:4px;padding:10px 16px 12px;background:#FFF3E9;',
      '}',
      '.mf-ws-tab{',
      'border:none;background:transparent;color:#6B7280;cursor:pointer;',
      'padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;',
      '}',
      '.mf-ws-tab:hover{background:rgba(209,80,0,.08);color:#D15000;}',
      '.mf-ws-tab.active{background:#D15000;color:#fff;}',
      '.mf-ws-pane{display:none;flex:1;min-height:0;flex-direction:column;}',
      '.mf-ws-pane.active{display:flex;}',
      '#mfAgentMessages{',
      'flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:12px;',
      'background:#F9FAFB;',
      '}',
      '.mf-agent-bubble{',
      'max-width:92%;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.5;',
      'word-break:break-word;',
      '}',
      '.mf-agent-bubble.user{',
      'align-self:flex-end;background:#D15000;color:#fff;border-bottom-right-radius:4px;',
      'white-space:pre-wrap;',
      '}',
      '.mf-agent-bubble.assistant{',
      'align-self:flex-start;background:#fff;border:1px solid #E5E7EB;color:#111827;',
      'border-bottom-left-radius:4px;max-width:100%;width:100%;',
      '}',
      '.mf-agent-bubble.meta{',
      'align-self:flex-start;background:transparent;border:none;color:#6B7280;',
      'font-size:11px;padding:0 2px;',
      '}',
      '.mf-md p{margin:0 0 8px;}',
      '.mf-md p:last-child{margin-bottom:0;}',
      '.mf-md ul,.mf-md ol{margin:0 0 8px;padding-left:18px;}',
      '.mf-md a{color:#D15000;font-weight:600;text-decoration:underline;}',
      '.mf-md code{',
      'font-size:12px;background:#F3F4F6;padding:1px 5px;border-radius:4px;',
      '}',
      '.mf-md strong{font-weight:800;}',
      '.mf-block{margin-top:10px;}',
      '.mf-actions{display:flex;flex-wrap:wrap;gap:8px;}',
      '.mf-btn{',
      'border:none;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:700;',
      'cursor:pointer;font-family:inherit;',
      '}',
      '.mf-btn-primary{background:#D15000;color:#fff;}',
      '.mf-btn-primary:hover{background:#B04300;}',
      '.mf-btn-secondary{background:#fff;color:#111827;border:1.5px solid #E5E7EB;}',
      '.mf-btn-secondary:hover{border-color:#D15000;color:#D15000;}',
      '.mf-links{display:flex;flex-direction:column;gap:6px;}',
      '.mf-link{',
      'color:#D15000;font-size:12px;font-weight:600;text-decoration:underline;cursor:pointer;',
      'background:none;border:none;padding:0;text-align:left;font-family:inherit;',
      '}',
      '.mf-inline-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;}',
      '.mf-inline-tab{',
      'border:1.5px solid #E5E7EB;background:#F9FAFB;border-radius:8px;',
      'padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;color:#6B7280;',
      '}',
      '.mf-inline-tab.active{border-color:#D15000;background:#FFF3E9;color:#D15000;}',
      '.mf-inline-pane{display:none;font-size:12px;line-height:1.5;color:#374151;}',
      '.mf-inline-pane.active{display:block;}',
      '#mfAgentChips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px;background:#F9FAFB;}',
      '.mf-agent-chip{',
      'border:1.5px solid #E5E7EB;background:#fff;border-radius:999px;',
      'padding:5px 10px;font-size:11px;cursor:pointer;color:#6B7280;',
      '}',
      '.mf-agent-chip:hover{border-color:#D15000;color:#D15000;}',
      '#mfAgentInputRow{',
      'display:flex;gap:8px;padding:12px;border-top:1.5px solid #E5E7EB;background:#fff;',
      '}',
      '#mfAgentInput{',
      'flex:1;resize:none;min-height:44px;max-height:120px;padding:10px 12px;',
      'border:1.5px solid #E5E7EB;border-radius:12px;font-size:13px;font-family:inherit;',
      '}',
      '#mfAgentSend{',
      'border:none;background:#D15000;color:#fff;border-radius:12px;',
      'padding:0 16px;font-weight:700;font-size:13px;cursor:pointer;',
      '}',
      '#mfAgentSend:disabled{opacity:.5;cursor:not-allowed;}',
      '#mfAgentResults,#mfAgentTools{',
      'flex:1;overflow-y:auto;padding:14px;background:#F9FAFB;',
      '}',
      '.mf-empty{',
      'color:#6B7280;font-size:13px;text-align:center;padding:40px 16px;line-height:1.5;',
      '}',
      '.mf-result-card{',
      'background:#fff;border:1.5px solid #E5E7EB;border-radius:14px;padding:14px;',
      'margin-bottom:12px;',
      '}',
      '.mf-result-card h4{margin:0 0 4px;font-size:14px;font-weight:800;color:#111827;}',
      '.mf-result-card .sub{font-size:12px;color:#6B7280;margin-bottom:10px;}',
      '.mf-tool-item{',
      'background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:12px;',
      'margin-bottom:10px;font-size:12px;',
      '}',
      '.mf-tool-item .name{font-weight:800;color:#D15000;margin-bottom:6px;}',
      '.mf-tool-item pre{',
      'margin:0;white-space:pre-wrap;word-break:break-word;color:#374151;',
      'background:#F3F4F6;border-radius:8px;padding:8px;font-size:11px;',
      'max-height:160px;overflow:auto;',
      '}',
      '@media(max-width:560px){',
      '#mfAgentRoot{right:12px;bottom:12px;}',
      '#mfAgentPanel{width:calc(100vw - 24px);height:min(80vh,720px);}',
      '}',
    ].join('');
    document.head.appendChild(style);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Safe markdown lite: bold, links, code, lists, paragraphs. */
  function renderMarkdown(md) {
    var text = String(md || '');
    var lines = text.split(/\r?\n/);
    var html = [];
    var inList = false;

    function closeList() {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    }

    function inlineFormat(line) {
      var escaped = escapeHtml(line);
      escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
      escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      escaped = escaped.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        function (_, label, href) {
          var safeHref = String(href || '').trim();
          if (/^javascript:/i.test(safeHref)) return escapeHtml(label);
          return '<a href="' + escapeHtml(safeHref) + '" rel="noopener">' + escapeHtml(label) + '</a>';
        }
      );
      return escaped;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push('<li>' + inlineFormat(bullet[1]) + '</li>');
        continue;
      }
      closeList();
      if (!line.trim()) continue;
      html.push('<p>' + inlineFormat(line) + '</p>');
    }
    closeList();
    return '<div class="mf-md">' + (html.join('') || '<p></p>') + '</div>';
  }

  function handleAction(action) {
    if (!action) return;
    var kind = String(action.action || 'navigate');
    if (kind === 'prompt' && action.prompt) {
      sendMessage(action.prompt);
      return;
    }
    if (kind === 'external' && action.href) {
      window.open(action.href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action.href) {
      var href = String(action.href);
      if (/^https?:\/\//i.test(href)) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else if (href.charAt(0) === '/') {
        window.location.href = href;
      }
    }
  }

  function renderActions(items, primaryFirst) {
    var wrap = document.createElement('div');
    wrap.className = 'mf-block mf-actions';
    (items || []).forEach(function (item, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mf-btn ' + (primaryFirst && idx === 0 ? 'mf-btn-primary' : 'mf-btn-secondary');
      btn.textContent = item.label || 'Action';
      btn.addEventListener('click', function () { handleAction(item); });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function renderLinks(items) {
    var wrap = document.createElement('div');
    wrap.className = 'mf-block mf-links';
    (items || []).forEach(function (item) {
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'mf-link';
      a.textContent = item.label || item.href;
      a.addEventListener('click', function () {
        handleAction({ action: 'navigate', href: item.href, label: item.label });
      });
      wrap.appendChild(a);
    });
    return wrap;
  }

  function renderInlineTabs(tabs) {
    var wrap = document.createElement('div');
    wrap.className = 'mf-block';
    var tabRow = document.createElement('div');
    tabRow.className = 'mf-inline-tabs';
    var panes = document.createElement('div');

    (tabs || []).forEach(function (tab, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mf-inline-tab' + (i === 0 ? ' active' : '');
      btn.textContent = tab.label || ('Tab ' + (i + 1));
      var pane = document.createElement('div');
      pane.className = 'mf-inline-pane' + (i === 0 ? ' active' : '');
      pane.innerHTML = renderMarkdown(tab.markdown || '');
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(tabRow.children, function (c) { c.classList.remove('active'); });
        Array.prototype.forEach.call(panes.children, function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
        pane.classList.add('active');
      });
      tabRow.appendChild(btn);
      panes.appendChild(pane);
    });

    wrap.appendChild(tabRow);
    wrap.appendChild(panes);
    return wrap;
  }

  function renderBlocks(container, blocks) {
    (blocks || []).forEach(function (block) {
      if (!block || !block.type) return;
      if (block.type === 'actions') container.appendChild(renderActions(block.items, true));
      else if (block.type === 'links') container.appendChild(renderLinks(block.items));
      else if (block.type === 'tabs') container.appendChild(renderInlineTabs(block.tabs));
    });
  }

  function appendBubble(role, text) {
    var messagesEl = document.getElementById('mfAgentMessages');
    if (!messagesEl) return null;
    var div = document.createElement('div');
    div.className = 'mf-agent-bubble ' + role;
    if (role === 'assistant') {
      div.innerHTML = renderMarkdown(text);
    } else {
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function appendAssistantUi(ui) {
    var messagesEl = document.getElementById('mfAgentMessages');
    if (!messagesEl) return null;
    var div = document.createElement('div');
    div.className = 'mf-agent-bubble assistant';
    var payload = ui || { markdown: 'Done.', blocks: [] };
    div.innerHTML = renderMarkdown(payload.markdown || '');
    renderBlocks(div, payload.blocks || []);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function setWorkspaceTab(name) {
    activeWorkspaceTab = name;
    try { sessionStorage.setItem(TAB_KEY, name); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll('.mf-ws-tab'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mf-ws-pane'), function (pane) {
      pane.classList.toggle('active', pane.getAttribute('data-pane') === name);
    });
  }

  function renderResultsPane() {
    var el = document.getElementById('mfAgentResults');
    if (!el) return;
    el.innerHTML = '';
    if (!resultCards.length) {
      el.innerHTML = '<div class="mf-empty">Results from agent actions will appear here — meetings created, lists, confirmations.</div>';
      return;
    }
    resultCards.slice().reverse().forEach(function (card) {
      var box = document.createElement('div');
      box.className = 'mf-result-card';
      box.innerHTML =
        '<h4>' + escapeHtml(card.title || 'Result') + '</h4>' +
        (card.subtitle ? '<div class="sub">' + escapeHtml(card.subtitle) + '</div>' : '');
      if (card.actions && card.actions.length) {
        box.appendChild(renderActions(card.actions, true));
      }
      el.appendChild(box);
    });
  }

  function renderToolsPane() {
    var el = document.getElementById('mfAgentTools');
    if (!el) return;
    el.innerHTML = '';
    if (!lastTools.length) {
      el.innerHTML = '<div class="mf-empty">Tool calls from the latest turn will show here.</div>';
      return;
    }
    lastTools.forEach(function (t) {
      var box = document.createElement('div');
      box.className = 'mf-tool-item';
      var argsStr = '';
      var resultStr = '';
      try { argsStr = JSON.stringify(t.args || {}, null, 2); } catch (e) { argsStr = String(t.args); }
      try { resultStr = JSON.stringify(t.result || {}, null, 2); } catch (e) { resultStr = String(t.result); }
      box.innerHTML =
        '<div class="name">' + escapeHtml(t.name || 'tool') + '</div>' +
        '<div style="margin-bottom:4px;color:#6B7280;font-weight:600">Args</div>' +
        '<pre>' + escapeHtml(argsStr) + '</pre>' +
        '<div style="margin:8px 0 4px;color:#6B7280;font-weight:600">Result</div>' +
        '<pre>' + escapeHtml(resultStr) + '</pre>';
      el.appendChild(box);
    });
  }

  function setOpen(open) {
    var panel = document.getElementById('mfAgentPanel');
    var fab = document.getElementById('mfAgentFab');
    if (!panel || !fab) return;
    panel.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    try { sessionStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch (e) {}
    if (open) {
      var input = document.getElementById('mfAgentInput');
      if (input) setTimeout(function () { input.focus(); }, 50);
    }
  }

  function toggle() {
    var panel = document.getElementById('mfAgentPanel');
    setOpen(!(panel && panel.classList.contains('open')));
  }

  async function sendMessage(text) {
    var message = (text || '').trim();
    if (!message || busy) return;

    setWorkspaceTab('chat');
    appendBubble('user', message);
    history.push({ role: 'user', content: message });
    var inputEl = document.getElementById('mfAgentInput');
    var sendBtn = document.getElementById('mfAgentSend');
    if (inputEl) inputEl.value = '';
    if (sendBtn) sendBtn.disabled = true;
    busy = true;
    var thinking = appendBubble('meta', 'Thinking…');

    try {
      var res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          history: history.slice(0, -1),
          context: resolveContext(),
        }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (thinking && thinking.parentNode) thinking.remove();

      if (!res.ok) {
        appendBubble('assistant', data.error || 'Something went wrong.');
        return;
      }

      lastTools = Array.isArray(data.toolsUsed) ? data.toolsUsed : [];
      renderToolsPane();

      var ui = data.ui || { markdown: data.reply || 'Done.', blocks: [] };
      if (!ui.markdown && data.reply) ui.markdown = data.reply;
      appendAssistantUi(ui);
      history.push({ role: 'assistant', content: ui.markdown || data.reply || 'Done.' });

      if (ui.resultCard && ui.resultCard.title) {
        resultCards.push(ui.resultCard);
        renderResultsPane();
      }

      if (lastTools.length) {
        var meta = appendBubble('meta', 'Used ' + lastTools.length + ' tool' + (lastTools.length === 1 ? '' : 's') + ' — see Tools tab');
        if (meta) {
          meta.style.cursor = 'pointer';
          meta.addEventListener('click', function () { setWorkspaceTab('tools'); });
        }
      }
    } catch (e) {
      if (thinking && thinking.parentNode) thinking.remove();
      appendBubble('assistant', 'Network error: ' + e);
    } finally {
      busy = false;
      if (sendBtn) sendBtn.disabled = false;
      if (inputEl) inputEl.focus();
    }
  }

  function buildDom() {
    if (document.getElementById('mfAgentRoot')) return;

    var root = document.createElement('div');
    root.id = 'mfAgentRoot';
    root.innerHTML = [
      '<div id="mfAgentPanel" role="dialog" aria-label="AI Agent workspace">',
      '  <div id="mfAgentHeader">',
      '    <div>',
      '      <h3>AI Agent</h3>',
      '      <p>Chat · Results · Tools — schedule, invite, deploy</p>',
      '    </div>',
      '    <button type="button" id="mfAgentClose" aria-label="Close">×</button>',
      '  </div>',
      '  <div id="mfAgentTabs">',
      '    <button type="button" class="mf-ws-tab active" data-tab="chat">Chat</button>',
      '    <button type="button" class="mf-ws-tab" data-tab="results">Results</button>',
      '    <button type="button" class="mf-ws-tab" data-tab="tools">Tools</button>',
      '  </div>',
      '  <div class="mf-ws-pane active" data-pane="chat">',
      '    <div id="mfAgentMessages"></div>',
      '    <div id="mfAgentChips">',
      '      <button type="button" class="mf-agent-chip" data-prompt="List my meeting invitations">Invitations</button>',
      '      <button type="button" class="mf-agent-chip" data-prompt="Create an instant meeting called Quick sync">New meeting</button>',
      '      <button type="button" class="mf-agent-chip" data-prompt="Show my Personal Assistant settings">My Assistant</button>',
      '      <button type="button" class="mf-agent-chip" data-prompt="List my recent debriefs">Debriefs</button>',
      '    </div>',
      '    <div id="mfAgentInputRow">',
      '      <textarea id="mfAgentInput" rows="1" placeholder="Ask your agent…"></textarea>',
      '      <button type="button" id="mfAgentSend">Send</button>',
      '    </div>',
      '  </div>',
      '  <div class="mf-ws-pane" data-pane="results" id="mfAgentResults"></div>',
      '  <div class="mf-ws-pane" data-pane="tools" id="mfAgentTools"></div>',
      '</div>',
      '<button type="button" id="mfAgentFab" aria-label="Open AI Agent" aria-expanded="false" title="AI Agent">',
      '  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">',
      '    <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z"/>',
      '    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>',
      '    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
      '  </svg>',
      '</button>',
    ].join('');

    document.body.appendChild(root);

    appendAssistantUi({
      markdown: 'Hi — tell me what you need. I can **schedule meetings**, **invite people**, or **send your Assistant**. Use the buttons below or type a request.',
      blocks: [
        {
          type: 'actions',
          items: [
            { label: 'List invitations', action: 'prompt', prompt: 'List my meeting invitations' },
            { label: 'Create meeting', action: 'prompt', prompt: 'Create an instant meeting called Quick sync' },
            { label: 'My Assistant', action: 'prompt', prompt: 'Show my Personal Assistant settings' },
          ],
        },
        {
          type: 'links',
          items: [
            { label: 'Open Scheduling', href: '/ai-meeting' },
            { label: 'Assistant settings', href: '/settings/ai-rep' },
          ],
        },
      ],
    });

    renderResultsPane();
    renderToolsPane();

    document.getElementById('mfAgentFab').addEventListener('click', toggle);
    document.getElementById('mfAgentClose').addEventListener('click', function () { setOpen(false); });
    document.getElementById('mfAgentSend').addEventListener('click', function () {
      sendMessage(document.getElementById('mfAgentInput').value);
    });
    document.getElementById('mfAgentInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(document.getElementById('mfAgentInput').value);
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mf-agent-chip'), function (btn) {
      btn.addEventListener('click', function () {
        sendMessage(btn.getAttribute('data-prompt') || '');
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mf-ws-tab'), function (btn) {
      btn.addEventListener('click', function () {
        setWorkspaceTab(btn.getAttribute('data-tab') || 'chat');
      });
    });
  }

  function maybeAutoOpen() {
    var params = new URLSearchParams(window.location.search);
    var forceOpen = params.get('agent') === '1';
    var stored = false;
    try { stored = sessionStorage.getItem(OPEN_KEY) === '1'; } catch (e) {}
    if (forceOpen || stored) setOpen(true);
    if (forceOpen) {
      try {
        params.delete('agent');
        var next = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
        window.history.replaceState({}, '', next);
      } catch (e) {}
    }
    try {
      var tab = sessionStorage.getItem(TAB_KEY);
      if (tab === 'results' || tab === 'tools' || tab === 'chat') setWorkspaceTab(tab);
    } catch (e) {}
  }

  function init() {
    injectStyles();
    buildDom();
    maybeAutoOpen();
    window.MFAgent = {
      open: function () { setOpen(true); },
      close: function () { setOpen(false); },
      toggle: toggle,
      send: sendMessage,
      getContext: resolveContext,
      setTab: setWorkspaceTab,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
