import { getNekoEmbedUrl } from "../config";
import { openReplayHeadScript } from "../openreplay";

export function roomPage(
  roomId: string,
  user?: { name: string; email: string },
  serverRole?: string,
  meetingPrivacy?: string,
  serverPreAdmitted?: boolean,
  agentHostEnabled?: boolean
): string {
  const safeRoomId      = roomId || 'my-room';
  const prefillName     = (user?.name || "").replace(/`/g, "'").replace(/"/g, "&quot;");
  // Sanitize server-injected role (only allow known role strings)
  const allowedRoles    = ['superadmin', 'admin', 'participant'];
  const injectedRole    = allowedRoles.includes(serverRole || '') ? (serverRole as string) : '';
  const isPrivateMeeting = meetingPrivacy === 'private';
  const preAdmitted      = serverPreAdmitted !== false;  // true unless explicitly false
  const hasAgentHost     = !!agentHostEnabled;
  const userInitial      = (user?.name?.[0] || '?').toUpperCase();
  const userEmail        = user?.email || '';
  const nekoEmbedUrl     = getNekoEmbedUrl();
  const nekoEnabled      = Boolean(nekoEmbedUrl);
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Meeting Forest — Room</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <link rel="stylesheet" href="/public/room.css" />
  <link rel="stylesheet" href="/public/tree.css" />
  ${openReplayHeadScript(user)}
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client"
    }
  }
  </script>
</head>
<body class="room-body" data-meeting-id="${safeRoomId}">

<!-- ── Topbar ─────────────────────────────────────────────────────────────── -->
<header class="room-topbar">
  <div class="room-topbar-left">
    <a href="/" class="room-logo">
      <div class="sb-logo-icon" style="width:30px;height:30px;border-radius:8px">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <span class="room-logo-text">Meeting Forest</span>
    </a>
    <div class="room-divider-v"></div>
    <div class="room-name-display">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span id="roomNameDisplay" class="room-name-text">${safeRoomId}</span>
    </div>
    <!-- Multi-room presence chip (super admin only) -->
    <div class="tree-presence-chip" id="presenceChip" style="display:none">
      <div class="tree-presence-dot"></div>
      <span id="presenceLabel">1 room</span>
    </div>
    ${hasAgentHost ? `<div class="tree-presence-chip" id="agentHostBadge" title="AI Agent co-host is in this meeting — instruct with @agent in chat" style="background:#FFF3E9;border-color:#FED7AA;color:#D15000">
      <div class="tree-presence-dot" style="background:#D15000"></div>
      <span>AI Agent co-host</span>
    </div>` : ""}
  </div>

  <div class="room-topbar-center">
    <div class="room-timer-chip">
      <div class="rec-dot"></div>
      <span id="callTimer">00:00</span>
    </div>
    <div class="room-signal">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="1 6 1 22"/><polyline points="6 6 6 22"/><polyline points="11 6 11 22"/>
        <polyline points="16 10 16 22" opacity=".4"/><polyline points="21 14 21 22" opacity=".2"/>
      </svg>
      <span style="font-size:11px;font-weight:700;color:var(--green)">Good</span>
    </div>
  </div>

  <div class="room-topbar-right">
    <button class="room-top-btn room-top-secondary" id="securityBtn" title="Security" onclick="toggleSecurity()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </button>
    <!-- Share / invite link button -->
    <button class="room-top-btn room-top-secondary" id="inviteBtn" title="Copy invite link" onclick="showInviteModal()" style="gap:6px">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      <span class="room-top-btn-label" style="font-size:12px;font-weight:700">Invite</span>
    </button>
    <button class="room-top-btn room-top-secondary" id="infoBtn" title="Meeting info" onclick="showInfo()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
    <button class="room-top-btn room-top-secondary" id="recordBtn" title="Record" onclick="toggleRecord()" style="gap:6px">
      <div class="rec-dot" style="width:8px;height:8px;background:var(--red)"></div>
      <span class="room-top-btn-label" style="font-size:12px;font-weight:700">REC</span>
    </button>
    <button class="room-top-btn room-top-menu-btn" id="topbarMenuBtn" title="Menu" onclick="toggleTopbarMenu()" aria-expanded="false" aria-controls="topbarMenu">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>
      </svg>
      <span class="room-top-btn-label" style="font-size:12px;font-weight:700">Menu</span>
    </button>
  </div>
</header>

<!-- ── Topbar overflow menu (mobile/tablet) ─────────────────────────────────── -->
<div class="topbar-menu" id="topbarMenu" style="display:none" role="menu">
  <button class="more-menu-item" onclick="toggleTopbarMenu();showInviteModal()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
    Invite
  </button>
  <button class="more-menu-item" onclick="toggleTopbarMenu();showInfo()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
    Meeting info
  </button>
  <button class="more-menu-item" onclick="toggleTopbarMenu();toggleSecurity()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    Security
  </button>
  <button class="more-menu-item" id="topbarRecordItem" onclick="toggleTopbarMenu();toggleRecord()">
    <div class="rec-dot" style="width:8px;height:8px;background:var(--red);flex-shrink:0"></div>
    <span id="topbarRecordLabel">Record</span>
  </button>
  <div class="more-menu-item topbar-menu-meta" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 6 1 22"/><polyline points="6 6 6 22"/><polyline points="11 6 11 22"/>
      <polyline points="16 10 16 22" opacity=".4"/><polyline points="21 14 21 22" opacity=".2"/>
    </svg>
    Signal: Good
  </div>
  <div class="more-menu-item topbar-menu-meta" id="topbarPresenceItem" style="display:none">
    <div class="tree-presence-dot"></div>
    <span id="topbarPresenceLabel">1 room</span>
  </div>
  <div class="more-menu-divider"></div>
  <button class="more-menu-item danger" onclick="leaveRoom()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    Leave Meeting
  </button>
</div>

<!-- ── Main layout ─────────────────────────────────────────────────────────── -->
<div class="room-layout" id="roomLayout">

  <!-- Video grid -->
  <div class="video-area" id="videoArea">

    <!-- Remote screen share display — hidden until someone shares their screen -->
    <div id="remoteScreenArea" style="display:none;flex:1;min-height:0;position:relative;background:#111;border-radius:12px;overflow:hidden;margin-bottom:8px">
      <video id="remoteScreenVideo" autoplay playsinline style="width:100%;height:100%;object-fit:contain;display:block"></video>
      <audio id="remoteScreenAudio" autoplay style="display:none"></audio>
      <div id="remoteScreenLabel" style="position:absolute;top:10px;left:12px;background:rgba(0,0,0,.65);color:#fff;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;pointer-events:none"></div>
    </div>

    <div class="video-grid" id="videoGrid">

      <!-- Self tile -->
      <div class="video-tile tile-self" id="tileSelf">
        <div class="video-placeholder" id="selfPlaceholder">
          <div class="participant-avatar" id="selfAvatar">T</div>
        </div>
        <video class="video-el" id="localVideo" muted autoplay playsinline></video>
        <div class="tile-overlay">
          <div class="tile-name">
            <span id="selfName">You (loading…)</span>
            <span class="tile-mic-icon" id="selfMicIcon">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </span>
          </div>
          <div class="tile-badge self-badge">You</div>
        </div>
        <div class="speaking-ring" id="selfSpeakRing"></div>
      </div>

    </div>

    <!-- Screen share overlay -->
    <div class="screen-share-overlay" id="screenShareOverlay" style="display:none">
      <div class="screen-share-banner">
        <div class="screen-share-banner-status">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span>You are sharing your screen</span>
          <span class="share-audio-pill off" id="shareAudioStatus">System audio: Off</span>
        </div>
        <button class="btn btn-danger btn-sm screen-share-stop" onclick="stopScreenShare()">Stop Sharing</button>
      </div>
      <video class="screen-video" id="screenVideo" autoplay playsinline></video>
    </div>

    <!-- Participant count pill -->
    <div class="participant-pill" id="participantPill">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span id="participantCount">1</span>
    </div>
  </div>

  <aside class="feature-stage" id="featureStage" aria-label="Room entities">
    <div class="feature-stage-empty" id="featureStageEmpty">
      No active room entities yet. Admins can add <code>@add whiteboard</code> or <code>@add browser</code> from chat.
    </div>
    <div class="feature-stage-body" id="featureStageBody" style="display:none">
      <section class="feature-entity-shell" id="entityShell-whiteboard">
        <div class="feature-entity-header">
          <div class="feature-entity-header-main">
            <div class="feature-entity-title-row">
              <span class="feature-entity-title">Whiteboard</span>
              <span class="feature-entity-badge" id="entityBadge-whiteboard">Entity</span>
            </div>
            <div class="feature-entity-subtitle">Collaborative board inside this room</div>
          </div>
          <div class="feature-entity-actions">
            <button class="feature-entity-btn" id="whiteboardClearBtn" type="button" onclick="clearWhiteboard()">Clear</button>
            <button class="feature-entity-btn primary" id="whiteboardExpandBtn" type="button" onclick="focusEntity('whiteboard')">Expand</button>
            <button class="feature-entity-btn danger" id="whiteboardCloseBtn" type="button" onclick="closeEntityFocus()">Close</button>
          </div>
        </div>
        <div class="feature-entity-body">
          <div id="whiteboardLocked" class="feature-entity-locked">You do not have access to this whiteboard.</div>
          <div id="excalidrawMount" class="whiteboard-mount">
            <div class="whiteboard-loading" id="whiteboardLoading">Loading whiteboard…</div>
          </div>
        </div>
      </section>

      <section class="feature-entity-shell" id="entityShell-browser">
        <div class="feature-entity-header">
          <div class="feature-entity-header-main">
            <div class="feature-entity-title-row">
              <span class="feature-entity-title">Browser</span>
              <span class="feature-entity-badge" id="entityBadge-browser">Entity</span>
            </div>
            <div class="feature-entity-subtitle">Shared browser powered by n.eko</div>
          </div>
          <div class="feature-entity-actions">
            <button class="feature-entity-btn" id="browserOpenExternalBtn" type="button" onclick="openVirtualBrowserExternal()">Open in Tab</button>
            <button class="feature-entity-btn primary" id="browserExpandBtn" type="button" onclick="focusEntity('browser')">Expand</button>
            <button class="feature-entity-btn danger" id="browserCloseBtn" type="button" onclick="closeEntityFocus()">Close</button>
          </div>
        </div>
        <div class="feature-entity-body">
          <div id="virtualBrowserLocked" class="feature-entity-locked">You do not have access to this browser.</div>
          <div class="virtual-browser-mount">
            <iframe
              id="virtualBrowserFrame"
              class="virtual-browser-frame"
              title="Virtual Browser"
              allow="fullscreen; autoplay; clipboard-read; clipboard-write; microphone; camera"
              allowfullscreen
              referrerpolicy="no-referrer"
            ></iframe>
            <div class="virtual-browser-loading" id="virtualBrowserLoading">Loading virtual browser…</div>
            <div class="feature-browser-blocker" id="virtualBrowserBlocker">View only. Ask the admin for browser control.</div>
          </div>
        </div>
      </section>
    </div>
  </aside>

  <!-- ── Right panel (Chat / People / Permissions) ──────────────────────── -->
  <div class="room-panel" id="roomPanel" style="display:none">
    <div class="panel-tabs">
      <button class="panel-tab active" id="tabChat" onclick="switchPanel('chat')">Chat</button>
      <button class="panel-tab" id="tabParticipants" onclick="switchPanel('participants')">
        People <span class="panel-tab-badge" id="peopleTabBadge">1</span>
      </button>
      <!-- Permissions tab — shown only for admins -->
      <button class="panel-tab" id="tabPermissions" onclick="switchPanel('permissions')" style="display:none">
        Perms
      </button>
      <button class="panel-close-btn" id="panelCloseBtn" onclick="closeRoomPanel()" title="Close panel" aria-label="Close panel">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Chat panel -->
    <div class="panel-body" id="panelChat">
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg-system">Meeting started — ${new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div class="chat-input-area" style="position:relative">
        <!-- @ring command dropdown -->
        <div id="ringCmdDropdown" style="display:none;position:absolute;bottom:calc(100% + 6px);left:0;right:0;background:#1e1e1e;border:1px solid rgba(255,255,255,.12);border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:50">
          <div id="ringCmdOption" onclick="selectRingCmd()" style="display:flex;align-items:center;gap:12px;padding:11px 14px;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='rgba(209,80,0,.12)'" onmouseleave="this.style.background='transparent'">
            <div style="width:34px;height:34px;border-radius:9px;background:rgba(209,80,0,.15);border:1px solid rgba(209,80,0,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D15000" stroke-width="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z"/>
              </svg>
            </div>
            <div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.9)">@ring</div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:1px">Call someone to join this meeting</div>
            </div>
          </div>
        </div>
        <div class="chat-input-wrap">
          <input class="chat-input" id="chatInput" placeholder="${hasAgentHost ? 'Message everyone… (@agent to instruct the AI co-host)' : 'Message everyone… (type @ for commands)'}" onkeydown="handleChatKey(event)" oninput="handleChatInput(event)" />
          <button class="chat-emoji-btn" onclick="addEmoji()">😊</button>
        </div>
        <button class="chat-send-btn" onclick="sendChat()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- People panel -->
    <div class="panel-body" id="panelParticipants" style="display:none">
      <div class="participants-search">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input placeholder="Search participants…" style="border:none;background:transparent;outline:none;flex:1;font-size:13px;font-family:inherit" />
      </div>
      <div class="participants-list" id="participantsList">
        <!-- Populated dynamically by LiveKit participant events -->
      </div>
      <div style="padding:14px;border-top:1px solid rgba(255,255,255,.08)">
        <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;gap:6px">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          Invite Participants
        </button>
      </div>
    </div>

    <!-- Permissions panel (admin only) -->
    <div class="panel-body" id="panelPermissions" style="display:none">
      <div class="perm-scroll">
        <div class="perm-section-hdr">Per-participant permissions</div>
        <div id="permsList" style="font-size:12px;color:#6B7280;padding:16px;text-align:center">
          No participants yet
        </div>

      </div>

      <!-- Room-level locks -->
      <div class="perm-lock-section">
        <div class="perm-lock-row">
          <div class="perm-lock-info">
            <div class="perm-lock-label">Lock all microphones</div>
            <div class="perm-lock-sub">Prevent participants from unmuting</div>
          </div>
          <button class="perm-toggle" id="lockMicToggle" onclick="toggleLock('mic',this)"></button>
        </div>
        <div class="perm-lock-row">
          <div class="perm-lock-info">
            <div class="perm-lock-label">Lock all cameras</div>
            <div class="perm-lock-sub">Prevent participants from turning on camera</div>
          </div>
          <button class="perm-toggle" id="lockCamToggle" onclick="toggleLock('cam',this)"></button>
        </div>
      </div>
    </div>

  </div><!-- /room-panel -->
</div><!-- /room-layout -->

<!-- ── Control bar ────────────────────────────────────────────────────────── -->
<footer class="control-bar" id="controlBar">
  <div class="controls-left">
    <div class="control-group">
      <div class="control-btn-wrap">
        <button class="ctrl-btn" id="micBtn" onclick="toggleMic()" title="Toggle microphone">
          <svg class="icon-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <svg class="icon-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        <button class="ctrl-btn-caret ctrl-mobile-secondary" onclick="showAudioMenu(this)" title="Audio devices" aria-haspopup="menu">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <span class="ctrl-label">Mic</span>
    </div>

    <div class="control-group">
      <div class="control-btn-wrap">
        <button class="ctrl-btn" id="camBtn" onclick="toggleCamera()" title="Toggle camera">
          <svg class="icon-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <svg class="icon-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
        <button class="ctrl-btn-caret ctrl-mobile-secondary" onclick="showVideoMenu(this)" title="Video devices" aria-haspopup="menu">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <span class="ctrl-label">Camera</span>
    </div>
  </div>

  <div class="controls-center">
    <div class="control-group ctrl-mobile-secondary">
      <button class="ctrl-btn" id="shareBtn" onclick="toggleScreenShare()" title="Share screen">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>
      <span class="ctrl-label">Share</span>
    </div>

    <div class="control-group ctrl-mobile-secondary">
      <button class="ctrl-btn" id="reactBtn" onclick="toggleReactions()" title="Reactions">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>
      <span class="ctrl-label">React</span>
    </div>

    <div class="control-group ctrl-mobile-secondary" id="whiteboardCtrlGroup" style="display:none">
      <button class="ctrl-btn" id="whiteboardBtn" onclick="toggleWhiteboard()" title="Whiteboard">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      </button>
      <span class="ctrl-label">Board</span>
    </div>

    <div class="control-group ctrl-mobile-secondary" id="virtualBrowserCtrlGroup" style="${nekoEnabled ? "" : "display:none"}">
      <button class="ctrl-btn" id="virtualBrowserBtn" onclick="toggleVirtualBrowser()" title="Virtual Browser">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </button>
      <span class="ctrl-label">Browser</span>
    </div>

    <!-- Tree button — visible only for admin/superadmin -->
    <div class="control-group ctrl-mobile-secondary" id="treeCtrlGroup" style="display:none">
      <button class="ctrl-btn" id="treeBtn" onclick="openTreeOverlay()" title="Meeting Tree">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
          <line x1="12" y1="7" x2="12" y2="14"/>
          <line x1="12" y1="14" x2="5" y2="17"/><line x1="12" y1="14" x2="19" y2="17"/>
        </svg>
        <span class="ctrl-notif" id="treeNodeCount" style="display:none">1</span>
      </button>
      <span class="ctrl-label">Tree</span>
    </div>

    <div class="control-group">
      <button class="ctrl-btn" id="moreBtn" onclick="toggleMore()" title="More options">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
        </svg>
      </button>
      <span class="ctrl-label">More</span>
    </div>
  </div>

  <div class="controls-right">
    <div class="control-group">
      <button class="ctrl-btn" id="chatToggleBtn" onclick="togglePanel('chat')" title="Chat">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="ctrl-notif" id="chatNotif" style="display:none">3</span>
      </button>
      <span class="ctrl-label">Chat</span>
    </div>

    <div class="control-group">
      <button class="ctrl-btn" id="peopleToggleBtn" onclick="togglePanel('participants')" title="Participants">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span class="ctrl-notif" id="peopleNotif">4</span>
      </button>
      <span class="ctrl-label">People</span>
    </div>

    <!-- Waiting room button — admin of private meeting only -->
    <div class="control-group ctrl-mobile-secondary" id="waitingCtrlGroup" style="display:none">
      <button class="ctrl-btn" id="waitingBtn" onclick="toggleWaitingPanel()" title="Waiting Room">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span class="ctrl-notif" id="waitingNotif" style="display:none">0</span>
      </button>
      <span class="ctrl-label">Waiting</span>
    </div>

    <button class="ctrl-btn leave-btn" onclick="leaveRoom()">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  </div>
</footer>

<!-- ── Reactions picker ────────────────────────────────────────────────────── -->
<div class="reactions-picker" id="reactionsPicker" style="display:none">
  ${['👍','👏','❤️','😂','😮','🎉','🙌','🔥'].map(e => `<button class="reaction-btn" onclick="sendReaction('${e}')">${e}</button>`).join('')}
</div>

<!-- ── More options menu ───────────────────────────────────────────────────── -->
<div class="more-menu" id="moreMenu" style="display:none">
  <button class="more-menu-item more-menu-mobile-only" id="moreShareItem" onclick="toggleMore();toggleScreenShare()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
    Share screen
  </button>
  <button class="more-menu-item more-menu-mobile-only" onclick="toggleMore();toggleReactions()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    </svg>
    Reactions
  </button>
  <button class="more-menu-item more-menu-mobile-only" id="moreWhiteboardItem" onclick="toggleMore();toggleWhiteboard()" style="display:none">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
    Whiteboard
  </button>
  <button class="more-menu-item more-menu-mobile-only" id="moreVirtualBrowserItem" onclick="toggleMore();toggleVirtualBrowser()" style="${nekoEnabled ? "" : "display:none"}">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
    Virtual Browser
  </button>
  <button class="more-menu-item more-menu-mobile-only" id="moreTreeItem" onclick="toggleMore();openTreeOverlay()" style="display:none">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
      <line x1="12" y1="7" x2="12" y2="14"/>
      <line x1="12" y1="14" x2="5" y2="17"/><line x1="12" y1="14" x2="19" y2="17"/>
    </svg>
    Meeting Tree
  </button>
  <button class="more-menu-item more-menu-mobile-only" id="moreWaitingItem" onclick="toggleMore();toggleWaitingPanel()" style="display:none">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    </svg>
    Waiting Room
  </button>
  <div class="more-menu-divider more-menu-mobile-only"></div>
  <button class="more-menu-item more-menu-mobile-only" onclick="toggleMore();showAudioMenu(document.getElementById('moreBtn'))">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    </svg>
    Audio devices
  </button>
  <button class="more-menu-item more-menu-mobile-only" onclick="toggleMore();showVideoMenu(document.getElementById('moreBtn'))">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
    Video devices
  </button>
  <button class="more-menu-item" onclick="toggleMore();openSettings()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
    Settings
  </button>
  <div class="more-menu-divider"></div>
  <button class="more-menu-item danger" onclick="leaveRoom()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    Leave Meeting
  </button>
</div>

<!-- ── Device selection menus (populated by renderDeviceMenu) ──────────────── -->
<div class="device-menu" id="audioDeviceMenu" style="display:none" role="menu" aria-label="Audio devices"></div>
<div class="device-menu" id="videoDeviceMenu" style="display:none" role="menu" aria-label="Video devices"></div>

<!-- ── Reaction overlay ────────────────────────────────────────────────────── -->
<div class="reaction-overlay" id="reactionOverlay"></div>

<!-- ── Audio meter ────────────────────────────────────────────────────────── -->
<div class="audio-meter" id="audioMeter">
  ${Array.from({length: 12}, (_,i) => `<div class="meter-bar" id="bar${i}"></div>`).join('')}
</div>

<!-- ── Lobby overlay ──────────────────────────────────────────────────────── -->
<div class="lobby-overlay" id="lobbyOverlay">
  <div class="lobby-card">

    <!-- ── Setup State (default) ──────────────────────────────────────────── -->
    <div id="lobbySetupState" class="lobby-setup">
      <div class="lobby-media-pane">
        <div class="lobby-preview">
          <video id="lobbyVideo" muted autoplay playsinline style="width:100%;height:100%;object-fit:cover;border-radius:12px;background:#111"></video>
          <div class="lobby-preview-name" id="lobbyPreviewName">Loading camera…</div>
        </div>
        <div class="lobby-media-controls">
          <div class="lobby-media-control">
            <div class="control-btn-wrap">
            <button class="ctrl-btn" id="lobbyMicBtn" onclick="toggleLobbyMic()" title="Microphone">
              <svg class="icon-on" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              <svg class="icon-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button class="ctrl-btn-caret" onclick="showAudioMenu(this)" title="Audio devices" aria-haspopup="menu">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            </div>
            <span>Mic</span>
          </div>
          <div class="lobby-media-control">
            <div class="control-btn-wrap">
            <button class="ctrl-btn" id="lobbyCamBtn" onclick="toggleLobbyCam()" title="Camera">
              <svg class="icon-on" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <svg class="icon-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
            <button class="ctrl-btn-caret" onclick="showVideoMenu(this)" title="Video devices" aria-haspopup="menu">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            </div>
            <span>Cam</span>
          </div>
        </div>
        <div class="lobby-permission-banner" id="lobbyMicDeniedBanner" style="display:none" role="status">
          Microphone is blocked for this site. In Chrome: tap the lock icon → Site settings → Allow microphone, then refresh.
        </div>
      </div>

      <div class="lobby-details-pane">
        <div class="lobby-setup-scroll">
          <div class="lobby-header">
            <div class="sb-logo-icon lobby-header-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2.5">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
              </svg>
            </div>
            <h2 id="lobbyTitle">Ready to join?</h2>
            <p id="lobbySubtitle">Room: <strong>${safeRoomId}</strong></p>
            <div id="lobbyRoleBadge" class="lobby-role-badge" style="display:none">
              <span></span>
            </div>
          </div>

          <div class="form-group lobby-name-field">
            <label class="form-label">Your Name</label>
            <input class="form-input" id="lobbyName" placeholder="Enter your display name" value="${prefillName}" />
          </div>

          <div class="lobby-link-block">
            <div class="lobby-link-label">Room Link</div>
            <div class="lobby-link-url" id="lobbyLinkText"></div>
            <button class="btn btn-ghost btn-sm lobby-link-copy" onclick="copyLobbyLink(this)">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </button>
          </div>
          <a href="/" class="lobby-back-link">← Back to Dashboard</a>
        </div>

        <div class="lobby-actions">
          <button class="btn btn-primary btn-lg lobby-join-btn" id="lobbyJoinBtn" onclick="lobbyJoinOrKnock()">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
            </svg>
            Join Now
          </button>
        </div>
      </div>
    </div>

    <!-- ── Waiting State (private meeting, knocking) ──────────────────────── -->
    <div id="lobbyWaitingState" style="display:none;text-align:center;padding:8px 0 4px">
      <!-- Avatar with spinning ring -->
      <div style="position:relative;width:84px;height:84px;margin:4px auto 20px">
        <div id="lobbyWaitInitial" style="width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#4F46E5);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:white;position:relative;z-index:1">${userInitial}</div>
        <div style="position:absolute;inset:-7px;border-radius:50%;border:2.5px solid transparent;border-top-color:#D15000;animation:spin 1.4s linear infinite"></div>
      </div>
      <!-- Animated dots -->
      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:18px">
        <div style="width:8px;height:8px;border-radius:50%;background:#D15000;animation:dotPulse 1.4s ease-in-out infinite"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#D15000;animation:dotPulse 1.4s ease-in-out .2s infinite"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#D15000;animation:dotPulse 1.4s ease-in-out .4s infinite"></div>
      </div>
      <p id="lobbyWaitHeading" style="font-size:15px;font-weight:700;color:rgba(255,255,255,.85);margin-bottom:6px">Waiting for the host…</p>
      <p id="lobbyWaitSub" style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:8px">Waiting for host approval</p>
      <p id="lobbyWaitTimer" style="font-size:13px;color:rgba(255,255,255,.4);margin-bottom:28px">0s</p>
      <button class="btn btn-ghost btn-lg" style="width:100%;justify-content:center" onclick="cancelKnock()">
        Cancel Request
      </button>
    </div>

    <!-- ── Denied State ───────────────────────────────────────────────────── -->
    <div id="lobbyDeniedState" style="display:none;text-align:center;padding:8px 0 4px">
      <div style="width:72px;height:72px;border-radius:50%;background:rgba(239,68,68,.12);border:2px solid rgba(239,68,68,.4);display:flex;align-items:center;justify-content:center;margin:4px auto 20px">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#EF4444" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <p style="font-size:17px;font-weight:800;color:#EF4444;margin-bottom:8px">Entry not allowed</p>
      <p style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.6;margin-bottom:28px">The host chose not to admit you<br>to this meeting.</p>
      <button class="btn btn-primary btn-lg" style="width:100%;justify-content:center;margin-bottom:10px" onclick="showLobbySetup()">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
        </svg>
        Try Again
      </button>
      <a href="/" class="lobby-back-link">← Back to Dashboard</a>
    </div>

  </div>
</div>

<!-- ── Invite / Share link modal ─────────────────────────────────────────── -->
<div class="modal-overlay" id="inviteModal" style="z-index:250">
  <div class="modal" style="max-width:480px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <div style="width:38px;height:38px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D15000" stroke-width="2.5">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </div>
      <div>
        <h3 style="margin:0;font-size:17px;font-weight:800">Invite to Meeting</h3>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">Share this link — anyone can join as a participant</p>
      </div>
    </div>

    <!-- Room ID badge -->
    <div style="display:flex;align-items:center;gap:8px;margin:16px 0 12px">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(16,185,129,.2);flex-shrink:0"></div>
      <span style="font-size:13px;color:rgba(255,255,255,.5)">Room ID:</span>
      <strong style="font-size:13px;color:rgba(255,255,255,.9)">${safeRoomId}</strong>
      <span class="tag green" style="font-size:10px;margin-left:auto">● Live</span>
    </div>

    <!-- Link field with copy button -->
    <div class="modal-link-row">
      <div class="modal-link-field">
        <span id="inviteLinkText"></span>
      </div>
      <button id="copyLinkBtn" class="btn btn-primary modal-link-copy" onclick="copyRoomLink()">
        <svg id="copyIcon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <svg id="checkIcon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" style="display:none">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span id="copyBtnLabel">Copy</span>
      </button>
    </div>

    <!-- Quick-share options -->
    <div class="modal-share-section">
      <p class="modal-share-label">Or share via</p>
      <div class="modal-share-row">
        <button class="btn btn-ghost btn-sm modal-share-btn" onclick="shareViaEmail()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </button>
        <button class="btn btn-ghost btn-sm modal-share-btn" onclick="shareNative()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
        <button class="btn btn-ghost btn-sm modal-share-btn" onclick="openQrCode()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/>
            <rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/>
          </svg>
          QR Code
        </button>
      </div>
    </div>

    <div class="modal-footer" style="margin-top:16px">
      <button class="btn btn-ghost" onclick="closeInviteModal()">Close</button>
    </div>
  </div>
</div>

<!-- ── Meeting Info modal ─────────────────────────────────────────────────── -->
<div class="modal-overlay" id="infoModal" style="z-index:250">
  <div class="modal" style="max-width:460px">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="width:38px;height:38px;border-radius:10px;background:rgba(209,80,0,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D15000" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <div>
        <h3 style="margin:0;font-size:17px;font-weight:800">Meeting Info</h3>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.4)" id="infoModalSubtitle">Room details</p>
      </div>
    </div>

    <!-- Room info rows -->
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <span style="font-size:12px;color:rgba(255,255,255,.35);min-width:64px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Room</span>
        <span id="infoRoomId" style="font-size:13px;color:rgba(255,255,255,.8);font-family:monospace;flex:1;word-break:break-all"></span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px">
        <span style="font-size:12px;color:rgba(255,255,255,.35);min-width:64px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Status</span>
        <span style="display:flex;align-items:center;gap:6px;font-size:13px;color:#10B981;font-weight:600">
          <span style="width:7px;height:7px;border-radius:50%;background:#10B981;display:inline-block"></span>
          Live
        </span>
      </div>
    </div>

    <!-- Privacy section -->
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85)">Meeting Privacy</div>
          <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">Control who can join this meeting</div>
        </div>
        <!-- Non-admin: read-only badge -->
        <span id="infoPrivacyBadge" style="display:none;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px"></span>
      </div>
      <!-- Admin: toggle -->
      <div id="infoPrivacyToggle" style="display:none;padding:14px">
        <div class="privacy-choice-row">
          <label id="infoPublicLabel" class="privacy-choice">
            <input type="radio" name="infoPrivacy" value="public" style="accent-color:#D15000;margin-top:2px;flex-shrink:0" />
            <div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:6px">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Public
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">Anyone with the link joins directly</div>
            </div>
          </label>
          <label id="infoPrivateLabel" class="privacy-choice">
            <input type="radio" name="infoPrivacy" value="private" style="accent-color:#D15000;margin-top:2px;flex-shrink:0" />
            <div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:6px">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Private
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">You admit each person manually</div>
            </div>
          </label>
        </div>
        <button class="btn btn-primary" id="infoSavePrivacy" style="margin-top:12px;width:100%;justify-content:center" onclick="saveInfoPrivacy()">
          Save Changes
        </button>
      </div>
    </div>

    <div class="modal-footer modal-footer-stack" style="margin-top:4px">
      <button class="btn btn-ghost" onclick="closeInfoModal()">Close</button>
      <button class="btn btn-primary" style="gap:6px" onclick="closeInfoModal();showInviteModal()">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        Share Link
      </button>
    </div>
  </div>
</div>

<!-- ── Meeting Settings modal (from More menu) ────────────────────────────── -->
<div class="modal-overlay" id="settingsModal" style="z-index:250">
  <div class="modal" style="max-width:420px">

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="width:38px;height:38px;border-radius:10px;background:rgba(209,80,0,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D15000" stroke-width="2.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      </div>
      <div>
        <h3 style="margin:0;font-size:17px;font-weight:800">Meeting Settings</h3>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.4)">Adjust settings for this session</p>
      </div>
    </div>

    <!-- Privacy setting -->
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;margin-bottom:16px">
      <div style="padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85)">Meeting Privacy</div>
        <div style="font-size:11px;color:rgba(255,255,255,.35);margin-top:2px">Control who can join this meeting</div>
      </div>
      <div id="settingsPrivacyToggle" style="padding:14px">
        <div class="privacy-choice-row">
          <label id="settingsPublicLabel" class="privacy-choice">
            <input type="radio" name="settingsPrivacy" value="public" style="accent-color:#D15000;margin-top:2px;flex-shrink:0" />
            <div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:6px">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Public
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">Anyone joins directly</div>
            </div>
          </label>
          <label id="settingsPrivateLabel" class="privacy-choice">
            <input type="radio" name="settingsPrivacy" value="private" style="accent-color:#D15000;margin-top:2px;flex-shrink:0" />
            <div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:6px">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Private
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">Admit each person manually</div>
            </div>
          </label>
        </div>
        <button class="btn btn-primary" id="settingsSavePrivacy" style="margin-top:12px;width:100%;justify-content:center" onclick="saveSettingsPrivacy()">
          Save Changes
        </button>
      </div>
    </div>

    <div class="modal-footer" style="margin-top:4px">
      <button class="btn btn-ghost" onclick="closeSettingsModal()">Close</button>
    </div>
  </div>
</div>

<!-- ── QR Code modal ───────────────────────────────────────────────────────── -->
<div class="modal-overlay" id="qrModal" style="z-index:260">
  <div class="modal" style="max-width:320px;text-align:center">
    <h3 style="font-size:17px;font-weight:800;margin-bottom:4px">Scan to Join</h3>
    <p style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:18px">Scan this QR code to open the meeting link</p>
    <div id="qrCanvas" style="display:flex;align-items:center;justify-content:center;margin-bottom:18px">
      <!-- QR code rendered via canvas -->
      <canvas id="qrCodeCanvas" width="200" height="200" style="border-radius:12px;border:8px solid white;box-shadow:0 4px 20px rgba(0,0,0,.12)"></canvas>
    </div>
    <p style="font-size:11px;color:rgba(255,255,255,.45);margin-bottom:16px;word-break:break-all" id="qrLinkLabel"></p>
    <div class="modal-footer" style="justify-content:center">
      <button class="btn btn-ghost" onclick="closeQrModal()">Close</button>
      <button class="btn btn-primary" onclick="downloadQr()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>
    </div>
  </div>
</div>

<!-- ── Tree overlay (fullscreen canvas) ──────────────────────────────────── -->
<div class="tree-overlay" id="treeOverlay">
  <div class="tree-overlay-hdr">
    <div class="tree-overlay-hdr-left">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D15000" stroke-width="2.5">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <line x1="12" y1="7" x2="12" y2="14"/>
        <line x1="12" y1="14" x2="5" y2="17"/><line x1="12" y1="14" x2="19" y2="17"/>
      </svg>
      <span class="tree-overlay-title">Meeting Tree</span>
      <div class="tree-presence-chip" id="treePresenceChip">
        <div class="tree-presence-dot"></div>
        <span id="treePresenceLabel">Present in 1 room</span>
      </div>
    </div>
    <div class="tree-overlay-actions">
      <button class="tree-icon-btn" onclick="window._treeCanvas && window._treeCanvas.zoomOut()" title="Zoom out">−</button>
      <button class="tree-icon-btn" onclick="window._treeCanvas && window._treeCanvas.zoomIn()" title="Zoom in">+</button>
      <button class="tree-icon-btn" onclick="window._treeCanvas && window._treeCanvas.fitView()" title="Fit view">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </button>
      <button class="tree-close-btn" onclick="closeTreeOverlay()">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Close
      </button>
    </div>
  </div>

  <!-- Canvas injected here by tree.js -->
  <div id="treeCanvasContainer" style="flex:1;position:relative"></div>
</div>

<!-- ── Sub-meeting creation modal ────────────────────────────────────────── -->
<div class="smm-overlay" id="subMeetingModal">
  <div class="smm-modal">
    <h3>Create Sub-meeting</h3>
    <p class="smm-sub">Add a child room to the meeting tree. Assign an admin from parent participants.</p>
    <input type="hidden" id="smmParentId" />

    <div class="smm-field">
      <label class="smm-label">Sub-meeting Name</label>
      <input class="smm-input" id="smmName" placeholder="e.g. Breakout Room A" />
    </div>

    <div class="smm-field">
      <label class="smm-label">Assign Admin</label>
      <!-- Mode tabs -->
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button type="button" id="smmModeParticipant"
          style="flex:1;padding:7px;border-radius:8px;border:1.5px solid var(--primary);background:var(--primary);color:white;font-size:12px;font-weight:700;cursor:pointer"
          onclick="setSmmAdminMode('participant')">From Meeting</button>
        <button type="button" id="smmModeEmail"
          style="flex:1;padding:7px;border-radius:8px;border:1.5px solid #242739;background:#1C1F2E;color:#6B7280;font-size:12px;font-weight:700;cursor:pointer"
          onclick="setSmmAdminMode('email')">By Email</button>
      </div>
      <!-- Participant dropdown -->
      <div id="smmParticipantMode">
        <select class="smm-input" id="smmAdminSelect" style="width:100%;padding-right:8px">
          <option value="">Select a participant…</option>
        </select>
        <div style="font-size:11px;color:#6B7280;margin-top:5px">Selected person will be automatically moved to this sub-meeting as admin.</div>
      </div>
      <!-- Email invite -->
      <div id="smmEmailMode" style="display:none">
        <input class="smm-input" type="email" id="smmAdminEmail" placeholder="person@example.com" style="width:100%;box-sizing:border-box"/>
        <div style="font-size:11px;color:#6B7280;margin-top:5px">An invitation email with the meeting link will be sent to this address.</div>
      </div>
    </div>

    <div class="smm-field">
      <label class="smm-label">Default Permissions</label>
      <div class="smm-perms-grid">
        <div class="smm-perm-item">
          <div class="smm-perm-label">Microphone</div>
          <select class="smm-perm-select" id="smmMicPerm">
            <option value="allow">Allow</option>
            <option value="force-off">Force Off</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        <div class="smm-perm-item">
          <div class="smm-perm-label">Camera</div>
          <select class="smm-perm-select" id="smmCamPerm">
            <option value="allow">Allow</option>
            <option value="force-off">Force Off</option>
            <option value="locked">Locked</option>
          </select>
        </div>
      </div>
    </div>

    <div class="smm-field">
      <label class="smm-label">Meeting Privacy</label>
      <div class="privacy-choice-row smm-privacy-row">
        <label class="privacy-choice smm-privacy-choice">
          <input type="radio" name="smmPrivacy" value="public" checked style="accent-color:#D15000" />
          <span><strong>Public</strong> — anyone with link joins directly</span>
        </label>
        <label class="privacy-choice smm-privacy-choice">
          <input type="radio" name="smmPrivacy" value="private" style="accent-color:#D15000" />
          <span><strong>Private</strong> — admit each person</span>
        </label>
      </div>
    </div>

    <div class="smm-footer">
      <button class="smm-btn smm-btn-cancel" onclick="closeSubMeetingModal()">Cancel</button>
      <button class="smm-btn smm-btn-create" onclick="createSubMeeting()">Create Sub-meeting</button>
    </div>
  </div>
</div>

<!-- ── Waiting Room Panel (admin of private meeting) ─────────────────────── -->
<div id="waitingPanel" class="waiting-panel" style="display:none">
  <div class="waiting-panel-header">
    <div class="waiting-panel-title">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#D15000" stroke-width="2.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>Waiting Room</span>
      <span id="waitingPanelCount" class="waiting-panel-count"></span>
    </div>
    <button id="waitingPanelClose" class="waiting-panel-close" aria-label="Close waiting room">&times;</button>
  </div>
  <div id="waitingList" class="waiting-panel-list">
    <div class="waiting-panel-empty">No one waiting</div>
  </div>
</div>

<!-- Toast container -->
<div class="toast-container" id="toastContainer"></div>

<script src="/public/tree.js"></script>
<script src="/public/whiteboard.js"></script>
<script>
  const ROOM_ID              = ${JSON.stringify(safeRoomId)};
  const HAS_AGENT_HOST       = ${hasAgentHost ? "true" : "false"};
  const NEKO_ENABLED         = ${nekoEnabled ? "true" : "false"};
  const NEKO_EMBED_URL       = ${JSON.stringify(nekoEmbedUrl || "")};
  let currentPrivacy         = ${JSON.stringify(isPrivateMeeting ? 'private' : 'public')};
  const SERVER_PRE_ADMITTED  = ${preAdmitted};
  const USER_INITIAL         = ${JSON.stringify(userInitial)};
  const USER_EMAIL           = ${JSON.stringify(userEmail)};
  const urlParams            = new URLSearchParams(location.search);
  let userName           = urlParams.get('name') || ${JSON.stringify(prefillName)};
  // Server-injected role takes precedence (set when server verifies user is meeting creator)
  const _serverRole = ${JSON.stringify(injectedRole)};
  const userRole  = _serverRole || urlParams.get('role') || 'participant'; // 'superadmin' | 'admin' | 'participant'
  const isAdmin   = userRole === 'superadmin' || userRole === 'admin';
  const treeRoot  = urlParams.get('treeRoot') || ROOM_ID;
  const viewAsId  = urlParams.get('viewAs')   || (userRole === 'admin' ? ROOM_ID : null);

  // If joined via @ring, start with mic+cam muted
  const _joinedMuted = urlParams.get('joined_muted') === 'true';

  // Ensure Temporal agent-host workflow is running (needs bun run worker to join LiveKit)
  if (HAS_AGENT_HOST && isAdmin) {
    fetch('/api/meetings/' + encodeURIComponent(ROOM_ID) + '/ensure-agent-host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(function() {});
  }

  let livekitRoom = null;
  let activeRoomId = ROOM_ID;   // tracks which sub-meeting the user is currently in
  let _roomSwitching = false;   // true while intentionally switching rooms (suppresses Disconnected redirect)
  let micEnabled = !_joinedMuted, camEnabled = !_joinedMuted, sharing = false;
  let shareAudioActive = false;
  let livekitTrackSource = null;
  let panelOpen = false, currentPanel = 'chat';
  let lobbyStream = null;
  let treeInitialized = false;
  let hasJoinedMeeting = false;
  let heartbeatInterval = null;
  let featurePollTimer = null;
  let activeEntityType = '';
  let entityFocusType = '';
  const participantDirectory = new Map();
  const roomEntities = {
    whiteboard: null,
    browser: null,
  };

  // ── Media device selection ────────────────────────────────────────────────
  const DEVICE_KINDS = ['audioinput', 'audiooutput', 'videoinput'];
  const DEVICE_KIND_LABEL = {
    audioinput: 'Microphone',
    audiooutput: 'Speaker',
    videoinput: 'Camera',
  };
  let mediaDevices = { audioinput: [], audiooutput: [], videoinput: [] };
  let selectedDevices = { audioinput: '', audiooutput: '', videoinput: '' };
  let deviceMenuOpenFor = null; // 'audio' | 'video' | null

  function deviceStorageKey(kind) { return 'mf.device.' + kind; }

  function loadDevicePrefs() {
    DEVICE_KINDS.forEach(function(kind) {
      try {
        selectedDevices[kind] = localStorage.getItem(deviceStorageKey(kind)) || '';
      } catch (_) {
        selectedDevices[kind] = '';
      }
    });
  }

  function saveDevicePref(kind, deviceId) {
    selectedDevices[kind] = deviceId || '';
    try {
      if (deviceId) localStorage.setItem(deviceStorageKey(kind), deviceId);
      else localStorage.removeItem(deviceStorageKey(kind));
    } catch (_) {}
  }

  function supportsSpeakerSelection() {
    return typeof HTMLMediaElement !== 'undefined'
      && typeof HTMLMediaElement.prototype.setSinkId === 'function';
  }

  function deviceConstraint(kind) {
    const id = selectedDevices[kind];
    if (!id) return true;
    return { deviceId: { exact: id } };
  }

  function audioConstraint() { return deviceConstraint('audioinput'); }
  function videoConstraint() { return deviceConstraint('videoinput'); }

  async function refreshMediaDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    let list = [];
    try {
      list = await navigator.mediaDevices.enumerateDevices();
    } catch (e) {
      console.warn('[Devices] enumerateDevices failed:', e);
      return;
    }
    const next = { audioinput: [], audiooutput: [], videoinput: [] };
    list.forEach(function(d) {
      if (!d || !d.deviceId) return;
      if (!next[d.kind]) return;
      const index = next[d.kind].length + 1;
      next[d.kind].push({
        deviceId: d.deviceId,
        label: d.label || (DEVICE_KIND_LABEL[d.kind] + ' ' + index),
      });
    });
    mediaDevices = next;
    // Drop selections whose device is gone. Skipped when the kind enumerates empty,
    // which is what browsers report before media permission has been granted.
    DEVICE_KINDS.forEach(function(kind) {
      const id = selectedDevices[kind];
      if (!id || !next[kind].length) return;
      const stillThere = next[kind].some(function(d) { return d.deviceId === id; });
      if (!stillThere) saveDevicePref(kind, '');
    });
    if (deviceMenuOpenFor) renderDeviceMenu(deviceMenuOpenFor);
  }

  loadDevicePrefs();
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', function() {
      void refreshMediaDevices();
    });
  }
  void refreshMediaDevices();

  function startMeetingHeartbeat() {
    stopMeetingHeartbeat();
    heartbeatInterval = setInterval(function() {
      fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(function() {});
    }, 30000);
  }

  function stopMeetingHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  function recordLeaveKeepalive() {
    if (!hasJoinedMeeting || !userName) return;
    hasJoinedMeeting = false;
    stopMeetingHeartbeat();
    fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName }),
      keepalive: true
    }).catch(function() {});
  }

  window.addEventListener('pagehide', function() {
    recordLeaveKeepalive();
  });

  console.log('[@ring] room script ready', { USER_EMAIL, ROOM_ID, activeRoomId });

  // ── Role-based UI setup ───────────────────────────────────────────────────
  if (isAdmin) {
    document.getElementById('treeCtrlGroup').style.display = '';
    const moreTree = document.getElementById('moreTreeItem');
    if (moreTree) moreTree.style.display = '';
    document.getElementById('tabPermissions').style.display = '';
    if (currentPrivacy === 'private') {
      document.getElementById('waitingCtrlGroup').style.display = '';
      const moreWaiting = document.getElementById('moreWaitingItem');
      if (moreWaiting) moreWaiting.style.display = '';
    }
  }

  // Lobby role badge
  if (userRole === 'superadmin') {
    const badge = document.getElementById('lobbyRoleBadge');
    badge.style.display = '';
    badge.querySelector('span').textContent = '⚡ Super Admin';
  } else if (userRole === 'admin') {
    const badge = document.getElementById('lobbyRoleBadge');
    badge.style.display = '';
    badge.querySelector('span').textContent = '👑 Meeting Admin';
  }

  // If joined via @ring, reflect muted state on lobby buttons immediately
  if (_joinedMuted) {
    document.getElementById('lobbyMicBtn').classList.add('off');
    document.getElementById('lobbyCamBtn').classList.add('off');
  }

  // Pre-fill lobby name, link, and join button text
  document.getElementById('lobbyName').value = userName;
  if (userName) document.getElementById('lobbyPreviewName').textContent = userName;
  document.getElementById('lobbyLinkText').textContent = window.location.origin + '/room/' + activeRoomId;
  if (currentPrivacy === 'private' && !SERVER_PRE_ADMITTED) {
    document.getElementById('lobbyJoinBtn').innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Ask to Join';
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  let timerSeconds = 0, timerInterval = null;
  function startTimer() {
    timerInterval = setInterval(() => {
      timerSeconds++;
      const m = String(Math.floor(timerSeconds/60)).padStart(2,'0');
      const s = String(timerSeconds%60).padStart(2,'0');
      document.getElementById('callTimer').textContent = m + ':' + s;
    }, 1000);
  }

  // ── Lobby camera / mic permission helpers ─────────────────────────────────
  function isMediaPermissionError(e) {
    if (!e) return false;
    const name = e.name || '';
    const msg = (e.message || String(e)).toLowerCase();
    return name === 'NotAllowedError'
      || name === 'PermissionDeniedError'
      || msg.includes('permission denied')
      || msg.includes('not allowed');
  }

  function isMediaDeviceBusyError(e) {
    if (!e) return false;
    const name = e.name || '';
    const msg = (e.message || String(e)).toLowerCase();
    return name === 'NotReadableError'
      || name === 'AbortError'
      || msg.includes('could not start video source')
      || msg.includes('could not start audio source')
      || msg.includes('device in use')
      || msg.includes('in use');
  }

  function mediaPermissionErrorMessage(kind, e) {
    const device = kind === 'camera' ? 'Camera' : 'Microphone';
    if (isMediaPermissionError(e)) {
      return device + ' blocked. In Chrome: tap the lock icon → Site settings → Allow '
        + (kind === 'camera' ? 'camera' : 'microphone') + ', then refresh.';
    }
    if (isMediaDeviceBusyError(e)) {
      return device + ' is busy. Close other apps/tabs using the '
        + (kind === 'camera' ? 'camera' : 'microphone') + ', then try again.';
    }
    return 'Could not access ' + (kind === 'camera' ? 'camera' : 'microphone')
      + ': ' + (e && (e.message || e));
  }

  function micToggleErrorMessage(e) {
    if (isMediaPermissionError(e)) {
      return 'Microphone blocked. In Chrome: tap the lock icon → Site settings → Allow microphone, then refresh.';
    }
    if (isMediaDeviceBusyError(e)) {
      return 'Microphone is busy. Close other apps/tabs using the microphone, then try again.';
    }
    return 'Could not change microphone: ' + (e && (e.message || e));
  }

  function publicationHasLiveTrack(pub) {
    return !!(pub && pub.track && pub.track.mediaStreamTrack
      && pub.track.mediaStreamTrack.readyState === 'live');
  }

  function syncLobbyMediaAvailability() {
    if (!lobbyStream) {
      micEnabled = false;
      camEnabled = false;
      document.getElementById('lobbyMicBtn')?.classList.toggle('off', true);
      document.getElementById('lobbyCamBtn')?.classList.toggle('off', true);
      return;
    }
    const hasAudio = lobbyStream.getAudioTracks().length > 0;
    const hasVideo = lobbyStream.getVideoTracks().length > 0;
    if (!hasAudio && micEnabled) {
      micEnabled = false;
      showToast('Microphone not available for this session.', 'info');
    }
    if (!hasVideo && camEnabled) {
      camEnabled = false;
      showToast('Camera not available for this session.', 'info');
    }
    document.getElementById('lobbyMicBtn')?.classList.toggle('off', !micEnabled);
    document.getElementById('lobbyCamBtn')?.classList.toggle('off', !camEnabled);
  }

  function handleLobbyMediaError(e) {
    syncLobbyMediaAvailability();
    const previewName = document.getElementById('lobbyPreviewName');
    if (isMediaPermissionError(e)) {
      if (previewName) previewName.textContent = 'Camera / mic blocked';
      showToast(mediaPermissionErrorMessage('microphone', e), 'info');
    } else if (previewName) {
      previewName.textContent = 'Camera not available';
    }
    void probeMicPermission();
  }

  async function probeMicPermission() {
    if (!navigator.permissions || !navigator.permissions.query) return;
    try {
      const status = await navigator.permissions.query({ name: 'microphone' });
      const banner = document.getElementById('lobbyMicDeniedBanner');
      const show = status.state === 'denied';
      if (banner) banner.style.display = show ? 'block' : 'none';
      status.onchange = function() {
        if (banner) banner.style.display = status.state === 'denied' ? 'block' : 'none';
      };
    } catch (_) { /* Permissions API unsupported for microphone on this browser */ }
  }

  async function ensureLobbyMediaForJoin() {
    const hasAudio = lobbyStream && lobbyStream.getAudioTracks().length > 0;
    const hasVideo = lobbyStream && lobbyStream.getVideoTracks().length > 0;
    const needAcquire = !lobbyStream
      || (micEnabled && !hasAudio)
      || (camEnabled && !hasVideo);
    if (!needAcquire) {
      syncLobbyMediaAvailability();
      return;
    }
    try {
      if (lobbyStream) {
        lobbyStream.getTracks().forEach(t => t.stop());
        lobbyStream = null;
      }
      lobbyStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint(), audio: audioConstraint() });
      lobbyStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
      lobbyStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
      const lobbyVid = document.getElementById('lobbyVideo');
      const overlay = document.getElementById('lobbyOverlay');
      if (lobbyVid && overlay && overlay.style.display !== 'none') {
        lobbyVid.srcObject = lobbyStream;
      }
      syncLobbyMediaAvailability();
      void refreshMediaDevices();
      void probeMicPermission();
    } catch (e) {
      if (clearStaleInputDevicePrefs(e)) {
        await ensureLobbyMediaForJoin();
        return;
      }
      handleLobbyMediaError(e);
    }
  }

  function isMicPub(pub) {
    if (!pub) return false;
    const src = pub.source;
    return src === 'microphone'
      || (livekitTrackSource && src === livekitTrackSource.Microphone);
  }

  function getLocalMicPublication() {
    if (!livekitRoom) return null;
    for (const pub of livekitRoom.localParticipant.audioTrackPublications.values()) {
      if (isMicPub(pub)) return pub;
    }
    return null;
  }

  function isCameraPub(pub) {
    if (!pub) return false;
    const src = pub.source;
    return src === 'camera'
      || (livekitTrackSource && src === livekitTrackSource.Camera);
  }

  function getLocalCameraPublication() {
    if (!livekitRoom) return null;
    for (const pub of livekitRoom.localParticipant.videoTrackPublications.values()) {
      if (isCameraPub(pub)) return pub;
    }
    return null;
  }

  async function publishLobbyTracksToLiveKit(Track) {
    const stream = lobbyStream;
    const lp = livekitRoom.localParticipant;
    let audioHandled = false;
    let videoHandled = false;

    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        try {
          const pub = await lp.publishTrack(audioTrack, { source: Track.Source.Microphone });
          if (!micEnabled) await pub.mute();
          audioHandled = true;
        } catch (micErr) {
          console.warn('[LiveKit] Lobby mic publish failed:', micErr);
          micEnabled = false;
          showToast(mediaPermissionErrorMessage('microphone', micErr), 'error');
        }
      }

      if (videoTrack) {
        try {
          const pub = await lp.publishTrack(videoTrack, { source: Track.Source.Camera });
          if (!camEnabled) await pub.mute();
          videoHandled = true;
        } catch (camErr) {
          console.warn('[LiveKit] Lobby camera publish failed:', camErr);
          camEnabled = false;
          showToast(mediaPermissionErrorMessage('camera', camErr), 'error');
        }
      }

      const lobbyVid = document.getElementById('lobbyVideo');
      if (lobbyVid) lobbyVid.srcObject = null;
      lobbyStream = null;
    }

    if (!audioHandled) {
      try {
        await lp.setMicrophoneEnabled(micEnabled);
      } catch (micErr) {
        console.warn('[LiveKit] Microphone enable failed:', micErr);
        micEnabled = false;
        showToast(mediaPermissionErrorMessage('microphone', micErr), 'error');
      }
    }

    if (!videoHandled) {
      try {
        await lp.setCameraEnabled(camEnabled);
      } catch (camErr) {
        console.warn('[LiveKit] Camera enable failed:', camErr);
        camEnabled = false;
        showToast(mediaPermissionErrorMessage('camera', camErr), 'error');
      }
    }

    // The setMicrophoneEnabled/setCameraEnabled fallbacks above pick LiveKit's
    // default devices, so re-apply any remembered selection.
    if (!audioHandled && selectedDevices.audioinput) {
      try { await livekitRoom.switchActiveDevice('audioinput', selectedDevices.audioinput); }
      catch (e) { console.warn('[Devices] restore audioinput failed:', e); }
    }
    if (!videoHandled && selectedDevices.videoinput) {
      try { await livekitRoom.switchActiveDevice('videoinput', selectedDevices.videoinput); }
      catch (e) { console.warn('[Devices] restore videoinput failed:', e); }
    }
    await applyAudioOutput();
    void refreshMediaDevices();
  }

  // ── Applying device selections ────────────────────────────────────────────
  function isOverconstrainedError(e) {
    const name = e && e.name;
    return name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError';
  }

  // A remembered device that has since been unplugged makes getUserMedia throw.
  // Clearing the prefs lets the caller retry against the system defaults.
  function clearStaleInputDevicePrefs(e) {
    if (!isOverconstrainedError(e)) return false;
    if (!selectedDevices.audioinput && !selectedDevices.videoinput) return false;
    saveDevicePref('audioinput', '');
    saveDevicePref('videoinput', '');
    return true;
  }

  function deviceLabel(kind, deviceId) {
    if (!deviceId) return 'System default';
    const found = (mediaDevices[kind] || []).find(function(d) { return d.deviceId === deviceId; });
    return found ? found.label : 'the selected device';
  }

  function collectAudioSinkElements() {
    const els = [];
    const screenAudio = document.getElementById('remoteScreenAudio');
    if (screenAudio) els.push(screenAudio);
    document.querySelectorAll('#videoGrid audio').forEach(function(el) { els.push(el); });
    return els;
  }

  async function applyAudioOutputToElement(el) {
    if (!el || !supportsSpeakerSelection() || !selectedDevices.audiooutput) return;
    try {
      await el.setSinkId(selectedDevices.audiooutput);
    } catch (e) {
      console.warn('[Devices] setSinkId failed:', e);
    }
  }

  async function applyAudioOutput(deviceId) {
    if (!supportsSpeakerSelection()) return;
    const id = deviceId === undefined ? selectedDevices.audiooutput : (deviceId || '');
    if (id && livekitRoom && typeof livekitRoom.switchActiveDevice === 'function') {
      try {
        await livekitRoom.switchActiveDevice('audiooutput', id);
      } catch (e) {
        console.warn('[Devices] switchActiveDevice(audiooutput) failed:', e);
      }
    }
    const els = collectAudioSinkElements();
    for (const el of els) {
      try {
        await el.setSinkId(id);
      } catch (e) {
        console.warn('[Devices] setSinkId failed:', e);
      }
    }
  }

  async function setSpeakerDevice(deviceId) {
    if (!supportsSpeakerSelection()) {
      showToast('This browser does not support speaker selection', 'info');
      return;
    }
    if (selectedDevices.audiooutput === deviceId) return;
    const previous = selectedDevices.audiooutput;
    saveDevicePref('audiooutput', deviceId);
    try {
      await applyAudioOutput(deviceId);
    } catch (e) {
      console.warn('[Devices] speaker switch failed:', e);
      saveDevicePref('audiooutput', previous);
      showToast('Could not switch speaker: ' + (e && (e.message || e)), 'error');
      return;
    }
    void refreshMediaDevices();
    showToast('Speaker switched to ' + deviceLabel('audiooutput', deviceId));
  }

  // Replaces one kind of track on the pre-join lobby stream.
  async function switchLobbyTrack(kind) {
    const wantVideo = kind === 'video';
    const fresh = await navigator.mediaDevices.getUserMedia(
      wantVideo ? { video: videoConstraint() } : { audio: audioConstraint() }
    );
    const newTrack = wantVideo ? fresh.getVideoTracks()[0] : fresh.getAudioTracks()[0];
    if (!newTrack) {
      fresh.getTracks().forEach(t => t.stop());
      throw new Error('Selected device produced no track');
    }
    if (!lobbyStream) lobbyStream = new MediaStream();
    const stale = wantVideo ? lobbyStream.getVideoTracks() : lobbyStream.getAudioTracks();
    stale.forEach(function(t) {
      t.stop();
      lobbyStream.removeTrack(t);
    });
    lobbyStream.addTrack(newTrack);
    newTrack.enabled = wantVideo ? camEnabled : micEnabled;
    const lobbyVid = document.getElementById('lobbyVideo');
    if (lobbyVid) {
      lobbyVid.srcObject = null;
      lobbyVid.srcObject = lobbyStream;
    }
    syncLobbyMediaAvailability();
  }

  // Fallback for when LiveKit cannot restart the track in place.
  async function republishLocalTrack(kind) {
    const wantVideo = kind === 'video';
    const lp = livekitRoom.localParticipant;
    const pub = wantVideo ? getLocalCameraPublication() : getLocalMicPublication();
    const wasMuted = pub ? !!pub.isMuted : (wantVideo ? !camEnabled : !micEnabled);
    const fresh = await navigator.mediaDevices.getUserMedia(
      wantVideo ? { video: videoConstraint() } : { audio: audioConstraint() }
    );
    const newTrack = wantVideo ? fresh.getVideoTracks()[0] : fresh.getAudioTracks()[0];
    if (!newTrack) {
      fresh.getTracks().forEach(t => t.stop());
      throw new Error('Selected device produced no track');
    }
    if (pub && pub.track) {
      try { await lp.unpublishTrack(pub.track, true); } catch (_) {}
    }
    const source = wantVideo
      ? (livekitTrackSource ? livekitTrackSource.Camera : 'camera')
      : (livekitTrackSource ? livekitTrackSource.Microphone : 'microphone');
    const newPub = await lp.publishTrack(newTrack, { source: source });
    if (wasMuted && newPub) {
      try { await newPub.mute(); } catch (_) {}
    }
  }

  async function switchLiveInputDevice(kind) {
    const lkKind = kind === 'video' ? 'videoinput' : 'audioinput';
    const id = selectedDevices[lkKind];
    if (typeof livekitRoom.switchActiveDevice === 'function') {
      try {
        await livekitRoom.switchActiveDevice(lkKind, id || 'default');
        return;
      } catch (e) {
        console.warn('[Devices] switchActiveDevice(' + lkKind + ') failed, republishing:', e);
      }
    }
    await republishLocalTrack(kind);
  }

  async function applyInputDeviceChange(kind) {
    if (livekitRoom) await switchLiveInputDevice(kind);
    else await switchLobbyTrack(kind);
  }

  async function setInputDevice(kind, deviceId) {
    const prefKind = kind === 'video' ? 'videoinput' : 'audioinput';
    const humanKind = kind === 'video' ? 'camera' : 'microphone';
    const previous = selectedDevices[prefKind];
    if (previous === deviceId) return;
    saveDevicePref(prefKind, deviceId);
    try {
      await applyInputDeviceChange(kind);
    } catch (e) {
      console.warn('[Devices] ' + humanKind + ' switch failed:', e);
      if (deviceId && isOverconstrainedError(e)) {
        saveDevicePref(prefKind, '');
        try {
          await applyInputDeviceChange(kind);
          if (kind === 'video' && livekitRoom) syncLocalCameraFromRoom();
          void refreshMediaDevices();
          showToast('That ' + humanKind + ' is unavailable. Using the system default.', 'info');
          return;
        } catch (fallbackErr) {
          console.warn('[Devices] ' + humanKind + ' fallback failed:', fallbackErr);
        }
      } else {
        saveDevicePref(prefKind, previous);
      }
      showToast(mediaPermissionErrorMessage(humanKind, e), 'error');
      return;
    }
    if (kind === 'video' && livekitRoom) syncLocalCameraFromRoom();
    void refreshMediaDevices();
    showToast(DEVICE_KIND_LABEL[prefKind] + ' switched to ' + deviceLabel(prefKind, deviceId));
  }

  async function setMicrophoneDevice(deviceId) { await setInputDevice('audio', deviceId); }
  async function setCameraDevice(deviceId) { await setInputDevice('video', deviceId); }

  async function startLobbyPreview() {
    try {
      lobbyStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint(), audio: audioConstraint() });
      lobbyStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
      lobbyStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
      document.getElementById('lobbyVideo').srcObject = lobbyStream;
      syncLobbyMediaAvailability();
      // Device labels only become readable once permission has been granted.
      void refreshMediaDevices();
      void probeMicPermission();
    } catch(e) {
      if (clearStaleInputDevicePrefs(e)) {
        await startLobbyPreview();
        return;
      }
      handleLobbyMediaError(e);
    }
  }
  startLobbyPreview();
  // Recalculate layout on window resize (tile sizes depend on available area)
  window.addEventListener('resize', function() { updateLayout(); });

  function toggleLobbyMic() {
    micEnabled = !micEnabled;
    if (lobbyStream) {
      lobbyStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
    }
    document.getElementById('lobbyMicBtn').classList.toggle('off', !micEnabled);
  }
  function toggleLobbyCam() {
    camEnabled = !camEnabled;
    if (lobbyStream) {
      lobbyStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
    }
    document.getElementById('lobbyCamBtn').classList.toggle('off', !camEnabled);
  }

  function syncControlBarMediaButtons() {
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.classList.toggle('off', !micEnabled);
      const micOn = micBtn.querySelector('.icon-on');
      const micOff = micBtn.querySelector('.icon-off');
      if (micOn) micOn.style.display = micEnabled ? '' : 'none';
      if (micOff) micOff.style.display = micEnabled ? 'none' : '';
    }
    const camBtn = document.getElementById('camBtn');
    if (camBtn) {
      camBtn.classList.toggle('off', !camEnabled);
      const camOn = camBtn.querySelector('.icon-on');
      const camOff = camBtn.querySelector('.icon-off');
      if (camOn) camOn.style.display = camEnabled ? '' : 'none';
      if (camOff) camOff.style.display = camEnabled ? 'none' : '';
    }
  }

  function attachLocalCameraPreview(pub) {
    const vid = document.getElementById('localVideo');
    const placeholder = document.getElementById('selfPlaceholder');
    if (!vid) return;
    if (pub && pub.track) {
      pub.track.attach(vid);
      if (placeholder) placeholder.style.opacity = '0';
    }
  }

  function clearLocalCameraPreview() {
    const vid = document.getElementById('localVideo');
    const placeholder = document.getElementById('selfPlaceholder');
    if (vid && livekitRoom) {
      try {
        const lp = livekitRoom.localParticipant;
        for (const pub of lp.videoTrackPublications.values()) {
          if (isCameraPub(pub) && pub.track) pub.track.detach(vid);
        }
      } catch (_) { /* ignore */ }
    }
    if (vid) vid.srcObject = null;
    if (placeholder) placeholder.style.opacity = '1';
  }

  function syncLocalCameraFromRoom() {
    if (!livekitRoom) {
      clearLocalCameraPreview();
      return;
    }
    const lp = livekitRoom.localParticipant;
    let camPub = null;
    for (const pub of lp.videoTrackPublications.values()) {
      if (isCameraPub(pub) && pub.track) { camPub = pub; break; }
    }
    if (!camPub) {
      for (const pub of lp.trackPublications.values()) {
        if (isCameraPub(pub) && pub.track) { camPub = pub; break; }
      }
    }
    if (camPub) attachLocalCameraPreview(camPub);
    else clearLocalCameraPreview();
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  async function joinFromLobby() {
    const name = document.getElementById('lobbyName').value.trim();
    if (!name) { showToast('Please enter your name', 'error'); return; }
    userName = name;
    await ensureLobbyMediaForJoin();
    const lobbyVid = document.getElementById('lobbyVideo');
    if (lobbyVid) lobbyVid.srcObject = null;
    document.getElementById('lobbyOverlay').style.display = 'none';
    document.getElementById('selfName').textContent = userName;
    document.getElementById('selfAvatar').textContent = userName[0].toUpperCase();
    document.getElementById('roomNameDisplay').textContent = activeRoomId;
    startTimer();
    // Render self in participants list
    addParticipantRow(userName, true, USER_EMAIL, userName);
    // Record join in Memgraph
    try {
      const joinRes = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName, role: userRole })
      });
      if (!joinRes.ok) {
        const joinData = await joinRes.json().catch(function() { return {}; });
        showToast(joinData.error || 'Could not register join with server', 'error');
      }
    } catch (e) {
      showToast('Could not register join with server', 'error');
    }
    syncControlBarMediaButtons();
    await connectToLiveKit();
    // Init tree for admins
    if (isAdmin) initTree();
    // Start polling waiting users for admin of private meetings
    if (currentPrivacy === 'private') startWaitingPoll();
    hasJoinedMeeting = true;
    startMeetingHeartbeat();
  }

  // ── Lobby state machine (Google Meet-style) ───────────────────────────────
  var _lobbyKnockId = null, _lobbyKnockPoll = null, _lobbyKnockTimer = null, _lobbyKnockStart = null;

  async function lobbyJoinOrKnock() {
    var name = document.getElementById('lobbyName').value.trim();
    if (!name) { showToast('Please enter your name', 'error'); return; }
    userName = name;
    await ensureLobbyMediaForJoin();
    if (currentPrivacy === 'private' && !SERVER_PRE_ADMITTED) {
      askToJoin();
    } else {
      await joinFromLobby();
    }
  }

  async function askToJoin() {
    try {
      var res = await fetch(
        '/api/meetings/' + encodeURIComponent(activeRoomId) + '/knock',
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      var data = await res.json();
      if (!res.ok) { showToast(data.error || 'Could not reach host', 'error'); return; }
      _lobbyKnockId = data.waitingId;
      // Already decided
      if (data.status === 'admitted' || data.status === 'entered') { await joinFromLobby(); return; }
      if (data.status === 'rejected') { showLobbyDenied(); return; }
      // Enter waiting state and start polling
      showLobbyWaiting();
      _lobbyKnockPoll = setInterval(async function() {
        if (!_lobbyKnockId) { clearInterval(_lobbyKnockPoll); return; }
        try {
          var r = await fetch(
            '/api/meetings/' + encodeURIComponent(activeRoomId) +
            '/knock-status/' + encodeURIComponent(_lobbyKnockId)
          );
          var d = await r.json();
          if (d.status === 'admitted' || d.status === 'entered') {
            clearInterval(_lobbyKnockPoll); clearInterval(_lobbyKnockTimer);
            document.getElementById('lobbyWaitHeading').textContent = "You've been admitted!";
            document.getElementById('lobbyWaitSub').textContent = 'Entering meeting…';
            setTimeout(function() { joinFromLobby(); }, 1000);
          } else if (d.status === 'rejected' || d.status === 'expired') {
            clearInterval(_lobbyKnockPoll); clearInterval(_lobbyKnockTimer);
            showLobbyDenied();
          }
        } catch(e) { /* network hiccup — keep polling */ }
      }, 2000);
    } catch(e) {
      showToast('Could not connect to server', 'error');
    }
  }

  function cancelKnock() {
    _lobbyKnockId = null;
    clearInterval(_lobbyKnockPoll); _lobbyKnockPoll = null;
    clearInterval(_lobbyKnockTimer); _lobbyKnockTimer = null;
    showLobbySetup();
  }

  function showLobbySetup() {
    document.getElementById('lobbySetupState').style.display   = '';
    document.getElementById('lobbyWaitingState').style.display = 'none';
    document.getElementById('lobbyDeniedState').style.display  = 'none';
    document.getElementById('lobbyTitle').textContent = 'Ready to join?';
    document.getElementById('lobbySubtitle').innerHTML =
      'Room: <strong style="color:rgba(255,255,255,.8)">' + activeRoomId + '</strong>';
  }

  function showLobbyWaiting() {
    document.getElementById('lobbySetupState').style.display   = 'none';
    document.getElementById('lobbyWaitingState').style.display = '';
    document.getElementById('lobbyDeniedState').style.display  = 'none';
    document.getElementById('lobbyWaitHeading').textContent = 'Waiting for the host…';
    document.getElementById('lobbyWaitSub').textContent = 'Waiting for host approval';
    _lobbyKnockStart = Date.now();
    document.getElementById('lobbyWaitTimer').textContent = '0s';
    _lobbyKnockTimer = setInterval(function() {
      var e = Math.floor((Date.now() - _lobbyKnockStart) / 1000);
      var m = Math.floor(e / 60);
      document.getElementById('lobbyWaitTimer').textContent = m > 0 ? m + 'm ' + (e % 60) + 's' : e + 's';
    }, 1000);
  }

  function showLobbyDenied() {
    document.getElementById('lobbySetupState').style.display   = 'none';
    document.getElementById('lobbyWaitingState').style.display = 'none';
    document.getElementById('lobbyDeniedState').style.display  = '';
    clearInterval(_lobbyKnockTimer); _lobbyKnockTimer = null;
  }

  // ── Tree canvas ───────────────────────────────────────────────────────────
  function initTree() {
    if (treeInitialized) return;
    treeInitialized = true;
    // Expose userName so tree.js can pre-populate the admin dropdown
    window._currentUserName = userName;
    window._initTreeCanvas('treeCanvasContainer', userRole, ROOM_ID, viewAsId);
    // Update root node on the server with the actual user name and room label
    fetch('/api/tree/' + encodeURIComponent(treeRoot), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: ROOM_ID, adminName: userName || 'Host' })
    }).catch(() => {});
    // Update tree node count badge
    setTimeout(updateTreeBadge, 500);
  }

  function updateTreeBadge() {
    if (!window._treeCanvas) return;
    const count = window._treeCanvas.nodes.size;
    const badge = document.getElementById('treeNodeCount');
    if (count > 1) { badge.style.display = ''; badge.textContent = count; }
    else badge.style.display = 'none';
  }

  function openTreeOverlay() {
    if (!treeInitialized) initTree();
    document.getElementById('treeOverlay').classList.add('open');
    setTimeout(() => window._treeCanvas && window._treeCanvas.fitView(), 80);
    // Hook into openCreateModal to populate participant dropdown each time
    if (window._treeCanvas && !window._treeCanvas._adminDropdownHooked) {
      window._treeCanvas._adminDropdownHooked = true;
      const orig = window._treeCanvas.openCreateModal.bind(window._treeCanvas);
      window._treeCanvas.openCreateModal = function(parentId) {
        orig(parentId);
        setSmmAdminMode('participant'); // reset to default mode
        populateSmmAdminDropdown();
      };
    }
  }
  function closeTreeOverlay() {
    document.getElementById('treeOverlay').classList.remove('open');
  }

  // Called by tree canvas when super admin clicks "Enter" on a sub-meeting node
  window._onEnterRoom = async function(nodeId) {
    if (nodeId === activeRoomId) return; // already here

    // 1. Record leave in Memgraph for old room (fire-and-forget)
    stopMeetingHeartbeat();
    fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName })
    }).catch(() => {});

    // 2. Disconnect from current LiveKit room
    _roomSwitching = true;
    if (livekitRoom) {
      try { await livekitRoom.disconnect(); } catch (e) { /* ignore */ }
      livekitRoom = null;
    }

    // 3. Clear all remote participant tiles and people list
    document.querySelectorAll('.video-tile:not(#tileSelf)').forEach(t => t.remove());
    const list = document.getElementById('participantsList');
    if (list) {
      // Keep only the self row
      Array.from(list.children).forEach(el => {
        if (!el.dataset.self) el.remove();
      });
    }
    updateParticipantCount();

    // 4. Switch active room
    activeRoomId = nodeId;
    activeEntityType = '';
    entityFocusType = '';
    document.getElementById('roomNameDisplay').textContent = nodeId;

    // Update presence chip
    if (window._treeCanvas) {
      const count = window._treeCanvas.presentRooms.size;
      if (count > 1) {
        document.getElementById('presenceChip').style.display = 'flex';
        document.getElementById('presenceLabel').textContent = count + ' rooms';
        const topPresence = document.getElementById('topbarPresenceItem');
        const topPresenceLabel = document.getElementById('topbarPresenceLabel');
        if (topPresence) topPresence.style.display = 'flex';
        if (topPresenceLabel) topPresenceLabel.textContent = count + ' rooms';
        const tpc = document.getElementById('treePresenceChip');
        const tpl = document.getElementById('treePresenceLabel');
        if (tpc) tpc.classList.add('visible');
        if (tpl) tpl.textContent = 'Present in ' + count + ' rooms';
      }
    }

    // 5. Record join in new room
    try {
      const joinRes = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName, role: 'superadmin' })
      });
      if (!joinRes.ok) {
        const joinData = await joinRes.json().catch(function() { return {}; });
        showToast(joinData.error || 'Could not register join with server', 'error');
      }
    } catch (e) {
      showToast('Could not register join with server', 'error');
    }
    hasJoinedMeeting = true;
    startMeetingHeartbeat();

    // 6. Connect to new LiveKit room
    showToast('Switching to ' + nodeId + '…', 'info');
    _roomSwitching = false;
    await connectToLiveKit();
    await fetchRoomEntities(true);
    updateTreeBadge();
  };

  // ── Waiting Room Admin Panel ─────────────────────────────────────────────
  let waitingPollInterval = null;
  let waitingPanelOpen    = false;

  function toggleWaitingPanel() {
    const panel = document.getElementById('waitingPanel');
    waitingPanelOpen = !waitingPanelOpen;
    panel.style.display = waitingPanelOpen ? 'flex' : 'none';
    document.getElementById('waitingBtn').classList.toggle('active', waitingPanelOpen);
  }

  document.getElementById('waitingPanelClose').addEventListener('click', function() {
    document.getElementById('waitingPanel').style.display = 'none';
    document.getElementById('waitingBtn').classList.remove('active');
    waitingPanelOpen = false;
  });

  function startWaitingPoll() {
    if (!isAdmin) return;
    if (waitingPollInterval) return; // already running
    pollWaitingUsers(); // run immediately
    waitingPollInterval = setInterval(pollWaitingUsers, 3000);
  }

  function stopWaitingPoll() {
    if (waitingPollInterval) { clearInterval(waitingPollInterval); waitingPollInterval = null; }
    renderWaitingList([]);
    const notif = document.getElementById('waitingNotif');
    if (notif) { notif.textContent = '0'; notif.style.display = 'none'; }
    const badge = document.getElementById('waitingPanelCount');
    if (badge) badge.textContent = '';
  }

  async function pollWaitingUsers() {
    try {
      const res = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/waiting');
      if (!res.ok) return;
      const waiters = await res.json();
      renderWaitingList(waiters);
    } catch (e) { /* network hiccup */ }
  }

  function renderWaitingList(waiters) {
    const count = waiters.length;
    // Update badge
    const notif = document.getElementById('waitingNotif');
    if (notif) { notif.textContent = count; notif.style.display = count > 0 ? '' : 'none'; }
    const badge = document.getElementById('waitingPanelCount');
    if (badge) badge.textContent = count > 0 ? count + ' waiting' : '';

    const list = document.getElementById('waitingList');
    if (!list) return;

    if (count === 0) {
      list.innerHTML = '<div class="waiting-panel-empty">No one waiting</div>';
      return;
    }

    list.innerHTML = '';
    waiters.forEach(function(w) {
      const row = document.createElement('div');
      row.className = 'waiting-item';

      const top = document.createElement('div');
      top.className = 'waiting-item-top';

      const av = document.createElement('div');
      av.className = 'waiting-item-avatar';
      av.textContent = (w.name || '?')[0].toUpperCase();

      const info = document.createElement('div');
      info.className = 'waiting-item-info';
      const nameDiv = document.createElement('div');
      nameDiv.className = 'waiting-item-name';
      nameDiv.textContent = w.name || 'Unknown';
      const timeDiv = document.createElement('div');
      timeDiv.className = 'waiting-item-time';
      timeDiv.textContent = waitingElapsed(w.knockedAt);
      info.appendChild(nameDiv);
      info.appendChild(timeDiv);

      top.appendChild(av);
      top.appendChild(info);

      const btnRow = document.createElement('div');
      btnRow.className = 'waiting-item-actions';

      const admitBtn = document.createElement('button');
      admitBtn.className = 'waiting-admit-btn';
      admitBtn.textContent = 'Admit';
      admitBtn.addEventListener('click', function() { admitUser(w.waitingId, admitBtn, rejectBtn, nameDiv.textContent); });

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'waiting-reject-btn';
      rejectBtn.textContent = 'Reject';
      rejectBtn.addEventListener('click', function() { rejectUser(w.waitingId, admitBtn, rejectBtn, nameDiv.textContent); });

      btnRow.appendChild(admitBtn);
      btnRow.appendChild(rejectBtn);
      row.appendChild(top);
      row.appendChild(btnRow);
      list.appendChild(row);
    });
  }

  function waitingElapsed(ts) {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return 'Waiting ' + secs + 's';
    return 'Waiting ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
  }

  async function admitUser(waitingId, admitBtn, rejectBtn, name) {
    admitBtn.disabled = true; admitBtn.textContent = '…';
    try {
      const res = await fetch(
        '/api/meetings/' + encodeURIComponent(activeRoomId) + '/admit/' + encodeURIComponent(waitingId),
        { method: 'POST' }
      );
      if (res.ok) {
        showToast(name + ' admitted', 'success');
        admitBtn.textContent = '✓'; admitBtn.style.background = '#059669';
        rejectBtn.style.display = 'none';
      } else {
        admitBtn.disabled = false; admitBtn.textContent = 'Admit';
        showToast('Could not admit user', 'error');
      }
    } catch (e) { admitBtn.disabled = false; admitBtn.textContent = 'Admit'; }
  }

  async function rejectUser(waitingId, admitBtn, rejectBtn, name) {
    rejectBtn.disabled = true; rejectBtn.textContent = '…';
    try {
      const res = await fetch(
        '/api/meetings/' + encodeURIComponent(activeRoomId) + '/reject/' + encodeURIComponent(waitingId),
        { method: 'POST' }
      );
      if (res.ok) {
        showToast(name + ' rejected', 'info');
        rejectBtn.textContent = '✕'; rejectBtn.style.color = '#9CA3AF';
        admitBtn.style.display = 'none';
      } else {
        rejectBtn.disabled = false; rejectBtn.textContent = 'Reject';
        showToast('Could not reject user', 'error');
      }
    } catch (e) { rejectBtn.disabled = false; rejectBtn.textContent = 'Reject'; }
  }

  // ── Sub-meeting creation ──────────────────────────────────────────────────
  function closeSubMeetingModal() {
    document.getElementById('subMeetingModal').classList.remove('open');
  }
  document.getElementById('subMeetingModal').addEventListener('click', e => {
    if (e.target === document.getElementById('subMeetingModal')) closeSubMeetingModal();
  });

  // ── Admin assignment mode toggle ─────────────────────────────────────────
  let smmAdminMode = 'participant'; // 'participant' | 'email'

  function setSmmAdminMode(mode) {
    smmAdminMode = mode;
    const participantEl = document.getElementById('smmParticipantMode');
    const emailEl       = document.getElementById('smmEmailMode');
    const btnP          = document.getElementById('smmModeParticipant');
    const btnE          = document.getElementById('smmModeEmail');
    if (mode === 'participant') {
      participantEl.style.display = '';
      emailEl.style.display = 'none';
      btnP.style.background = '#D15000'; btnP.style.color = 'white'; btnP.style.borderColor = '#D15000';
      btnE.style.background = '#1C1F2E'; btnE.style.color = '#6B7280'; btnE.style.borderColor = '#242739';
    } else {
      participantEl.style.display = 'none';
      emailEl.style.display = '';
      btnE.style.background = '#D15000'; btnE.style.color = 'white'; btnE.style.borderColor = '#D15000';
      btnP.style.background = '#1C1F2E'; btnP.style.color = '#6B7280'; btnP.style.borderColor = '#242739';
    }
  }

  function populateSmmAdminDropdown() {
    const sel = document.getElementById('smmAdminSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select a participant…</option>';
    if (livekitRoom && livekitRoom.remoteParticipants.size > 0) {
      livekitRoom.remoteParticipants.forEach((p) => {
        if (isHiddenSystemBot(p.identity)) return;
        const opt = document.createElement('option');
        opt.value    = p.identity;
        opt.textContent = (p.name || p.identity);
        sel.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = ''; opt.disabled = true;
      opt.textContent = 'No other participants in this meeting';
      sel.appendChild(opt);
    }
  }

  async function createSubMeeting() {
    const name     = document.getElementById('smmName').value.trim();
    const parentId = document.getElementById('smmParentId').value;
    const micPerm  = document.getElementById('smmMicPerm').value;
    const camPerm  = document.getElementById('smmCamPerm').value;
    const privacyEl = document.querySelector('input[name="smmPrivacy"]:checked');
    const smmPrivacy = privacyEl ? privacyEl.value : 'public';

    // Resolve admin name + move target
    let adminName       = '';
    let moveIdentity    = '';   // LiveKit identity to move (participant mode)
    let inviteEmail     = '';   // email to invite (email mode)

    if (smmAdminMode === 'participant') {
      const sel = document.getElementById('smmAdminSelect');
      moveIdentity = sel.value;
      if (!moveIdentity) return showToast('Please select a participant to assign as admin', 'error');
      adminName = sel.options[sel.selectedIndex]?.textContent || moveIdentity;
    } else {
      inviteEmail = document.getElementById('smmAdminEmail').value.trim();
      if (!inviteEmail || !inviteEmail.includes('@'))
        return showToast('Please enter a valid email address', 'error');
      adminName = inviteEmail;
    }

    if (!name) return showToast('Please enter a sub-meeting name', 'error');

    // Create the sub-meeting node
    let nodeId = null;
    try {
      const res = await fetch('/api/tree/' + encodeURIComponent(treeRoot) + '/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, label: name, adminName, micDefault: micPerm, camDefault: camPerm, privacy: smmPrivacy })
      });
      if (!res.ok) throw new Error('server ' + res.status);
      const data = await res.json();
      if (data.ok && window._treeCanvas) {
        nodeId = data.node.id;
        window._treeCanvas.addNode({
          id: nodeId, label: data.node.label,
          parentId: data.node.parentId, adminName: data.node.adminName,
          participants: 0
        });
        updateTreeBadge();
      }
    } catch (e) {
      // Demo / offline mode — generate a local ID so the invite can still be sent
      if (window._treeCanvas) {
        nodeId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        window._treeCanvas.addNode({ id: nodeId, label: name, parentId, adminName, participants: 0 });
        updateTreeBadge();
      }
    }

    if (!nodeId) { showToast('Failed to create sub-meeting', 'error'); return; }

    if (moveIdentity && livekitRoom) {
      // Send LiveKit data message to the specific participant — move them
      const payload = new TextEncoder().encode(JSON.stringify({
        type: 'move_to_submeeting',
        nodeId,
        nodeLabel: name,
        role: 'admin'
      }));
      try {
        livekitRoom.localParticipant.publishData(payload, {
          reliable: true,
          destinationIdentities: [moveIdentity]
        });
        showToast(adminName + ' is being moved to "' + name + '"', 'success');
      } catch (e) {
        showToast('Sub-meeting created — could not notify ' + adminName, 'info');
      }
    } else if (inviteEmail) {
      // Send invitation email
      try {
        const invRes = await fetch('/api/meetings/' + encodeURIComponent(nodeId) + '/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: inviteEmail, inviterName: userName || window._currentUserName || 'Host', meetingLabel: name })
        });
        if (!invRes.ok) {
          const errData = await invRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Server error ' + invRes.status);
        }
        showToast('Invitation sent to ' + inviteEmail, 'success');
      } catch (e) {
        console.error('[invite]', e);
        showToast('Sub-meeting created but invite failed: ' + e.message, 'error');
      }
    } else {
      showToast('Sub-meeting "' + name + '" created', 'success');
    }

    closeSubMeetingModal();
    document.getElementById('smmName').value = '';
    document.getElementById('smmAdminEmail') && (document.getElementById('smmAdminEmail').value = '');
  }

  // ── Handle incoming LiveKit data messages ────────────────────────────────
  function handleDataMessage(data) {
    try {
      const msg = JSON.parse(new TextDecoder().decode(data));
      if (msg.type === 'chat') {
        appendChatMessage(msg.name || 'Unknown', msg.msg);
      } else if (msg.type === 'reaction') {
        showReactionOverlay(msg.emoji);
      } else if (msg.type === 'move_to_submeeting') {
        showMoveToSubmeeting(msg.nodeId, msg.nodeLabel, msg.role);
      } else if (typeof msg.type === 'string' && msg.type.indexOf('whiteboard_') === 0) {
        handleWhiteboardMessage(msg);
      }
    } catch (e) { /* ignore malformed */ }
  }

  // Banner overlay shown to participant being moved
  function showMoveToSubmeeting(nodeId, label, role) {
    const existing = document.getElementById('moveBanner');
    if (existing) existing.remove();

    // Build using DOM API — avoids all quote-escaping issues inside TS template literals
    const banner = document.createElement('div');
    banner.id = 'moveBanner';
    banner.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9000;display:flex;align-items:center;justify-content:center';

    const card = document.createElement('div');
    card.style.cssText = 'background:white;border-radius:20px;padding:36px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)';

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = 'width:56px;height:56px;background:linear-gradient(135deg,#D15000,#ff7b2e);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px';
    iconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>';

    const h2 = document.createElement('h2');
    h2.style.cssText = 'font-size:20px;font-weight:800;color:#111827;margin-bottom:8px';
    h2.textContent = 'You have been assigned as admin';

    const p = document.createElement('p');
    p.style.cssText = 'font-size:14px;color:#6B7280;margin-bottom:24px';
    const strong = document.createElement('strong');
    strong.style.color = '#111827';
    strong.textContent = '"' + label + '"';
    p.appendChild(document.createTextNode('You are being moved to the sub-meeting '));
    p.appendChild(strong);
    p.appendChild(document.createTextNode(' as its admin.'));

    const btnRow = document.createElement('div');
    btnRow.className = 'move-banner-actions';
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center';

    const btnStay = document.createElement('button');
    btnStay.className = 'move-banner-btn';
    btnStay.style.cssText = 'padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;color:#6B7280;font-weight:700;cursor:pointer;font-size:14px;flex:1';
    btnStay.textContent = 'Stay Here';
    btnStay.onclick = () => banner.remove();

    const btnMove = document.createElement('button');
    btnMove.className = 'move-banner-btn move-banner-btn-primary';
    btnMove.style.cssText = 'padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#D15000,#ff7b2e);color:white;font-weight:700;cursor:pointer;font-size:14px;flex:1';
    btnMove.textContent = 'Move Me →';
    btnMove.onclick = () => acceptMove(nodeId);

    btnRow.appendChild(btnStay);
    btnRow.appendChild(btnMove);
    card.appendChild(iconWrap);
    card.appendChild(h2);
    card.appendChild(p);
    card.appendChild(btnRow);
    banner.appendChild(card);
    document.body.appendChild(banner);

    // Auto-accept after 15 seconds
    setTimeout(() => { if (document.getElementById('moveBanner')) acceptMove(nodeId); }, 15000);
  }

  async function acceptMove(nodeId) {
    const banner = document.getElementById('moveBanner');
    if (banner) banner.remove();
    // Use the same room-switch logic as _onEnterRoom
    await window._onEnterRoom(nodeId);
  }

  // ── Permissions panel ─────────────────────────────────────────────────────
  const ENTITY_TYPES = ['whiteboard', 'browser'];

  function getEntityState(type) {
    return roomEntities[type] || null;
  }

  function getEntityAccess(type) {
    const entity = getEntityState(type);
    return entity && entity.access ? entity.access : { canView: false, canInteract: false };
  }

  function participantKey(identity, email) {
    return (email || identity || '').toLowerCase();
  }

  function rememberParticipant(identity, name, email, isSelf) {
    const key = participantKey(identity, email);
    if (!key) return;
    participantDirectory.set(key, {
      identity: identity || name || key,
      name: name || identity || key,
      email: email || '',
      isSelf: !!isSelf,
      role: isSelf ? userRole : 'participant',
    });
  }

  function knownParticipants() {
    return Array.from(participantDirectory.values()).sort(function(a, b) {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  function describeRole(participant) {
    if (!participant) return '';
    if (participant.isSelf && userRole === 'superadmin') return 'Super Admin';
    if (participant.isSelf && userRole === 'admin') return 'Meeting Admin';
    if (participant.isSelf) return 'You';
    return 'Participant';
  }

  function updateEntityButtonState(type, enabled, active) {
    const btnId = type === 'whiteboard' ? 'whiteboardBtn' : 'virtualBrowserBtn';
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.toggle('active', !!active);
    btn.disabled = !enabled;
    btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    btn.style.opacity = enabled ? '' : '.45';
    btn.style.cursor = enabled ? '' : 'not-allowed';
  }

  function syncEntityControls() {
    const whiteboardEnabled = !!(roomEntities.whiteboard && roomEntities.whiteboard.enabled && getEntityAccess('whiteboard').canView);
    const browserEnabled = !!(roomEntities.browser && roomEntities.browser.enabled && getEntityAccess('browser').canView);
    const whiteboardCtrl = document.getElementById('whiteboardCtrlGroup');
    const whiteboardMore = document.getElementById('moreWhiteboardItem');
    const browserCtrl = document.getElementById('virtualBrowserCtrlGroup');
    const browserMore = document.getElementById('moreVirtualBrowserItem');
    if (whiteboardCtrl) whiteboardCtrl.style.display = whiteboardEnabled ? '' : 'none';
    if (whiteboardMore) whiteboardMore.style.display = whiteboardEnabled ? '' : 'none';
    if (browserCtrl) browserCtrl.style.display = browserEnabled ? '' : 'none';
    if (browserMore) browserMore.style.display = browserEnabled ? '' : 'none';
    updateEntityButtonState('whiteboard', whiteboardEnabled, activeEntityType === 'whiteboard');
    updateEntityButtonState('browser', browserEnabled, activeEntityType === 'browser');
    const clearBtn = document.getElementById('whiteboardClearBtn');
    if (clearBtn) clearBtn.disabled = !getEntityAccess('whiteboard').canInteract;
  }

  function renderPermissionsList() {
    const list = document.getElementById('permsList');
    if (!list) return;
    if (!isAdmin) {
      list.textContent = 'Only meeting admins can edit room entity permissions.';
      return;
    }
    const participants = knownParticipants().filter(function(participant) {
      return !!participant.email;
    });
    if (!participants.length) {
      list.textContent = 'No participants yet';
      return;
    }
    list.className = 'perm-list';
    list.innerHTML = participants.map(function(participant) {
      const role = describeRole(participant);
      const featureRows = ENTITY_TYPES.map(function(type) {
        const entity = getEntityState(type);
        const accessMap = entity && entity.accessByEmail ? entity.accessByEmail : {};
        const access = accessMap[(participant.email || '').toLowerCase()] || { canView: true, canInteract: true };
        const permAttrs = ' data-perm-email="' + escapeHtml(participant.email) +
          '" data-perm-entity="' + escapeHtml(type) + '" data-perm-field=';
        return '<div class="perm-entity-card">' +
          '<div class="perm-entity-title">' + (type === 'whiteboard' ? 'Whiteboard' : 'Browser') + '</div>' +
          '<div class="perm-toggle-row"><label>Can view</label>' +
          '<input type="checkbox" ' + (access.canView ? 'checked' : '') +
          permAttrs + '"canView" /></div>' +
          '<div class="perm-toggle-row"><label>Can interact</label>' +
          '<input type="checkbox" ' + (access.canInteract ? 'checked' : '') + (access.canView ? '' : ' disabled') +
          permAttrs + '"canInteract" /></div>' +
          '</div>';
      }).join('');
      return '<div class="perm-participant-card">' +
        '<div class="perm-participant-header">' +
          '<div class="participant-avatar-sm">' + escapeHtml((participant.name || '?')[0].toUpperCase()) + '</div>' +
          '<div class="perm-participant-meta">' +
            '<div class="perm-participant-name">' + escapeHtml(participant.name || participant.email) + '</div>' +
            '<div class="perm-participant-email">' + escapeHtml(participant.email) + '</div>' +
          '</div>' +
          '<span class="participant-role-chip">' + escapeHtml(role) + '</span>' +
        '</div>' +
        '<div class="perm-entity-grid">' + featureRows + '</div>' +
      '</div>';
    }).join('');
  }

  function handlePermissionToggle(e) {
    const input = e.target.closest ? e.target.closest('[data-perm-field]') : null;
    if (!input) return;
    void setPermission(
      input.dataset.permEmail,
      input.dataset.permEntity,
      input.dataset.permField,
      input.checked
    );
  }

  async function setPermission(participantEmail, entityType, field, value) {
    if (!isAdmin) {
      showToast('Only meeting admins can update room entity permissions', 'info');
      return;
    }
    try {
      const body = { email: participantEmail };
      body[field] = !!value;
      const res = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/features/' + encodeURIComponent(entityType) + '/access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not update permissions');
      await fetchRoomEntities(true);
      showToast('Permissions updated for ' + participantEmail, 'success');
    } catch (e) {
      showToast(e && e.message ? e.message : 'Could not update permissions', 'error');
    }
  }

  function toggleLock(type, btn) {
    btn.classList.toggle('on');
    const locked = btn.classList.contains('on');
    showToast(type === 'mic'
      ? (locked ? 'All microphones locked' : 'Microphones unlocked')
      : (locked ? 'All cameras locked' : 'Cameras unlocked'),
      locked ? 'info' : 'success');
  }

  async function fetchRoomEntities(silent) {
    try {
      const res = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/features');
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not load room entities');
      if (Array.isArray(data.entities)) {
        data.entities.forEach(function(entity) {
          roomEntities[entity.entityType] = entity;
        });
      }
      renderRoomEntities();
      renderPermissionsList();
    } catch (e) {
      if (!silent) showToast(e && e.message ? e.message : 'Could not load room entities', 'error');
    }
  }

  function startFeaturePolling() {
    if (featurePollTimer) clearInterval(featurePollTimer);
    featurePollTimer = setInterval(function() {
      fetchRoomEntities(true);
    }, 4000);
  }

  function getVisibleEnabledEntities() {
    return ENTITY_TYPES.filter(function(type) {
      const entity = getEntityState(type);
      return entity && entity.enabled && getEntityAccess(type).canView;
    });
  }

  function ensureActiveEntitySelection() {
    const enabled = getVisibleEnabledEntities();
    if (!enabled.length) {
      activeEntityType = '';
      entityFocusType = '';
      return;
    }
    if (!activeEntityType || enabled.indexOf(activeEntityType) === -1) {
      activeEntityType = enabled[0];
    }
    if (entityFocusType && enabled.indexOf(entityFocusType) === -1) {
      entityFocusType = '';
    }
  }

  function renderRoomEntities() {
    ensureActiveEntitySelection();
    const layout = document.getElementById('roomLayout');
    const stage = document.getElementById('featureStage');
    const empty = document.getElementById('featureStageEmpty');
    const body = document.getElementById('featureStageBody');
    const enabled = getVisibleEnabledEntities();
    const hasEntities = enabled.length > 0;
    if (stage) stage.style.display = hasEntities ? 'flex' : 'none';
    if (empty) empty.style.display = hasEntities ? 'none' : 'flex';
    if (body) body.style.display = hasEntities ? 'flex' : 'none';
    if (layout) {
      layout.classList.toggle('has-entity-stage', hasEntities);
      layout.classList.toggle('entity-expanded', !!entityFocusType);
    }
    ENTITY_TYPES.forEach(function(type) {
      const shell = document.getElementById('entityShell-' + type);
      if (!shell) return;
      shell.classList.toggle('active', activeEntityType === type && enabled.indexOf(type) >= 0);
      const badge = document.getElementById('entityBadge-' + type);
      if (badge) badge.textContent = entityFocusType === type ? 'Expanded' : 'Entity';
    });
    syncWhiteboardEntityUi();
    syncBrowserEntityUi();
    syncEntityControls();
    updateLayout();
  }

  function focusEntity(type) {
    const entity = getEntityState(type);
    if (!entity || !entity.enabled) {
      showToast((type === 'whiteboard' ? 'Whiteboard' : 'Browser') + ' is not active in this room', 'info');
      return;
    }
    if (!getEntityAccess(type).canView) {
      showToast('You do not have access to this room entity', 'info');
      return;
    }
    activeEntityType = type;
    entityFocusType = type;
    if (type === 'whiteboard') void openWhiteboard();
    else openVirtualBrowser();
    renderRoomEntities();
  }

  function closeEntityFocus() {
    entityFocusType = '';
    renderRoomEntities();
  }

  function isEntityInteractable(type) {
    const access = getEntityAccess(type);
    return !!(access && access.canView && access.canInteract);
  }

  function publishWhiteboardPayload(payload) {
    if (!livekitRoom || !isEntityInteractable('whiteboard')) return;
    try {
      livekitRoom.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(payload)),
        { reliable: true }
      );
    } catch (e) {
      console.warn('[whiteboard] publish failed', e);
    }
  }

  function ensureWhiteboardInstance() {
    if (window._whiteboard) {
      if (typeof window._whiteboard.setReadOnly === 'function') {
        window._whiteboard.setReadOnly(!isEntityInteractable('whiteboard'));
      }
      return window._whiteboard;
    }
    if (typeof MeetingWhiteboard === 'undefined') {
      throw new Error('Whiteboard module failed to load');
    }
    const clientId = (USER_EMAIL || userName || 'anon') + '-' + Math.random().toString(36).slice(2, 6);
    window._whiteboard = new MeetingWhiteboard({
      mountId: 'excalidrawMount',
      clientId: clientId,
      readOnly: !isEntityInteractable('whiteboard'),
      onPublish: publishWhiteboardPayload,
      onError: function(err) {
        console.error('[whiteboard]', err);
        showToast('Whiteboard error: ' + (err && err.message ? err.message : String(err)), 'error');
      },
    });
    return window._whiteboard;
  }

  function handleWhiteboardMessage(msg) {
    if (!window._whiteboard) {
      try {
        if (
          msg.type === 'whiteboard_scene' ||
          msg.type === 'whiteboard_sync_response' ||
          msg.type === 'whiteboard_scene_chunk' ||
          msg.type === 'whiteboard_clear'
        ) {
          ensureWhiteboardInstance();
        } else {
          return;
        }
      } catch (_) {
        return;
      }
    }
    window._whiteboard.applyRemote(msg);
  }

  async function openWhiteboard() {
    const entity = getEntityState('whiteboard');
    if (!entity || !entity.enabled) {
      showToast(isAdmin ? 'Use @add whiteboard in chat to enable it first' : 'Whiteboard is not active in this room', 'info');
      return;
    }
    if (!getEntityAccess('whiteboard').canView) {
      showToast('You do not have access to this whiteboard', 'info');
      return;
    }
    try {
      if (!livekitRoom) {
        showToast('Join the meeting before opening the whiteboard', 'info');
        return;
      }
      const wb = ensureWhiteboardInstance();
      if (typeof wb.setReadOnly === 'function') wb.setReadOnly(!isEntityInteractable('whiteboard'));
      await wb.open();
      activeEntityType = 'whiteboard';
      wb.requestSync();
      renderRoomEntities();
    } catch (e) {
      console.error('[whiteboard] open failed', e);
      showToast('Could not load whiteboard. Check your network and try again.', 'error');
    }
  }

  function closeWhiteboard() {
    if (window._whiteboard) window._whiteboard.close();
    if (activeEntityType === 'whiteboard') {
      activeEntityType = '';
    }
    if (entityFocusType === 'whiteboard') {
      entityFocusType = '';
    }
    renderRoomEntities();
  }

  function toggleWhiteboard() {
    if (activeEntityType === 'whiteboard' && !entityFocusType) focusEntity('whiteboard');
    else if (activeEntityType === 'whiteboard' && entityFocusType) closeEntityFocus();
    else void openWhiteboard();
  }

  function syncWhiteboardEntityUi() {
    const locked = document.getElementById('whiteboardLocked');
    const mount = document.getElementById('excalidrawMount');
    const canView = getEntityAccess('whiteboard').canView;
    if (locked) locked.classList.toggle('visible', !canView);
    if (mount) mount.style.display = canView ? '' : 'none';
    const clearBtn = document.getElementById('whiteboardClearBtn');
    if (clearBtn) clearBtn.disabled = !isEntityInteractable('whiteboard');
    if (window._whiteboard && typeof window._whiteboard.setReadOnly === 'function') {
      window._whiteboard.setReadOnly(!isEntityInteractable('whiteboard'));
    }
  }

  function clearWhiteboard() {
    if (!window._whiteboard) return;
    if (!isEntityInteractable('whiteboard')) {
      showToast('You do not have permission to edit this whiteboard', 'info');
      return;
    }
    if (!confirm('Clear the whiteboard for everyone in this room?')) return;
    window._whiteboard.publishClear();
    showToast('Whiteboard cleared', 'info');
  }

  function openVirtualBrowser() {
    const entity = getEntityState('browser');
    if (!entity || !entity.enabled) {
      showToast(isAdmin ? 'Use @add browser in chat to enable it first' : 'Browser is not active in this room', 'info');
      return;
    }
    if (!getEntityAccess('browser').canView) {
      showToast('You do not have access to this browser', 'info');
      return;
    }
    if (!NEKO_ENABLED || !NEKO_EMBED_URL) {
      showToast('Virtual browser is not configured', 'info');
      return;
    }
    if (!livekitRoom) {
      showToast('Join the meeting before opening the virtual browser', 'info');
      return;
    }
    const frame = document.getElementById('virtualBrowserFrame');
    const loading = document.getElementById('virtualBrowserLoading');
    if (frame && !frame.getAttribute('src')) {
      if (loading) loading.classList.remove('hidden');
      frame.onload = function() {
        if (loading) loading.classList.add('hidden');
      };
      frame.setAttribute('src', NEKO_EMBED_URL);
    } else if (loading) {
      loading.classList.add('hidden');
    }
    activeEntityType = 'browser';
    renderRoomEntities();
  }

  function closeVirtualBrowser() {
    if (activeEntityType === 'browser') activeEntityType = '';
    if (entityFocusType === 'browser') entityFocusType = '';
    renderRoomEntities();
  }

  function toggleVirtualBrowser() {
    if (activeEntityType === 'browser' && !entityFocusType) focusEntity('browser');
    else if (activeEntityType === 'browser' && entityFocusType) closeEntityFocus();
    else openVirtualBrowser();
  }

  function syncBrowserEntityUi() {
    const locked = document.getElementById('virtualBrowserLocked');
    const mount = document.querySelector('#entityShell-browser .virtual-browser-mount');
    const blocker = document.getElementById('virtualBrowserBlocker');
    const access = getEntityAccess('browser');
    if (locked) locked.classList.toggle('visible', !access.canView);
    if (mount) mount.style.display = access.canView ? '' : 'none';
    if (blocker) blocker.classList.toggle('visible', access.canView && !access.canInteract);
  }

  function openVirtualBrowserExternal() {
    if (!NEKO_EMBED_URL) return;
    if (!getEntityAccess('browser').canView) {
      showToast('You do not have access to this browser', 'info');
      return;
    }
    window.open(NEKO_EMBED_URL, '_blank', 'noopener,noreferrer');
  }

  function parseEntityLifecycleCommand(raw) {
    var match = String(raw || '').trim().match(/^@(add|remove)\s+(whiteboard|browser)\s*$/i);
    if (!match) return null;
    return { action: match[1].toLowerCase(), entityType: match[2].toLowerCase() };
  }

  function parseEntityTargetCommand(raw) {
    var match = String(raw || '').trim().match(/^@(whiteboard|browser)\s+([a-z-]+)\s*$/i);
    if (!match) return null;
    return { entityType: match[1].toLowerCase(), command: match[2].toLowerCase() };
  }

  async function postEntityAction(entityType, action, body) {
    const res = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/features/' + encodeURIComponent(entityType) + '/' + action, {
      method: action === 'access' ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(function() { return {}; });
    if (!res.ok) throw new Error(data.error || ('Could not ' + action + ' ' + entityType));
    await fetchRoomEntities(true);
    return data;
  }

  async function handleEntityChatCommand(msg) {
    if (!isAdmin) {
      showToast('Only meeting admins can manage room entities', 'info');
      return true;
    }
    const lifecycle = parseEntityLifecycleCommand(msg);
    if (lifecycle) {
      await postEntityAction(lifecycle.entityType, lifecycle.action === 'add' ? 'add' : 'remove');
      const label = lifecycle.entityType === 'whiteboard' ? 'Whiteboard' : 'Browser';
      addSystemMessage((lifecycle.action === 'add' ? 'Enabled ' : 'Removed ') + '<strong>' + label + '</strong> as a room entity.');
      if (lifecycle.action === 'add') {
        if (lifecycle.entityType === 'whiteboard') void openWhiteboard();
        else openVirtualBrowser();
      } else if (activeEntityType === lifecycle.entityType) {
        closeEntityFocus();
      }
      return true;
    }
    const targeted = parseEntityTargetCommand(msg);
    if (targeted) {
      await postEntityAction(targeted.entityType, 'command', { command: targeted.command });
      addSystemMessage('Sent <strong>' + escapeHtml(targeted.command) + '</strong> to <strong>' +
        (targeted.entityType === 'whiteboard' ? 'Whiteboard' : 'Browser') + '</strong>.');
      if (targeted.command === 'expand' || targeted.command === 'focus') focusEntity(targeted.entityType);
      if (targeted.command === 'collapse' || targeted.command === 'dock') closeEntityFocus();
      return true;
    }
    return false;
  }

  startFeaturePolling();
  setTimeout(function() { fetchRoomEntities(true); }, 0);

  // ── Local preview helpers are defined near lobby controls ─────────────────

  // ── LiveKit ───────────────────────────────────────────────────────────────
  async function connectToLiveKit() {
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: activeRoomId, name: userName })
      });
      const { token, url } = await res.json();
      const { Room, RoomEvent, Track } = await import('https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.esm.mjs');
      livekitTrackSource = Track.Source;
      livekitRoom = new Room({ adaptiveStream: true, dynacast: true });
      livekitRoom
        .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          handleRemoteTrack(track, participant);
        })
        .on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
          removeRemoteTrack(track, participant);
        })
        .on(RoomEvent.LocalTrackPublished, (pub) => {
          if (isCameraPub(pub)) {
            attachLocalCameraPreview(pub);
          }
          if (sharing && isScreenShareAudioPub(pub)) {
            shareAudioActive = true;
            updateShareAudioBanner();
          }
        })
        .on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (isCameraPub(pub)) {
            clearLocalCameraPreview();
          }
          if (isScreenShareAudioPub(pub)) {
            shareAudioActive = false;
            updateShareAudioBanner();
          }
        })
        .on(RoomEvent.ParticipantConnected, participant => {
          if (isHiddenSystemBot(participant.identity)) return;
          addParticipantTile(participant);
          addParticipantRow(
            participant.name || participant.identity,
            false,
            emailFromParticipant(participant),
            participant.identity
          );
          updateParticipantCount();
          showToast((participant.name || participant.identity) + ' joined', 'info');
        })
        .on(RoomEvent.ParticipantDisconnected, participant => {
          if (isHiddenSystemBot(participant.identity)) return;
          removeParticipantTile(participant.identity);
          removeParticipantRow(participant.identity);
          updateParticipantCount();
          showToast((participant.name || participant.identity) + ' left', 'info');
        })
        .on(RoomEvent.ActiveSpeakersChanged, speakers => { updateSpeakers(speakers); })
        .on(RoomEvent.DataReceived, (data) => { handleDataMessage(data); })
        .on(RoomEvent.Disconnected, () => {
          if (_roomSwitching) return; // intentional switch — don't redirect
          recordLeaveKeepalive();
          showToast('Disconnected from room', 'error');
          setTimeout(() => window.location.href = '/', 2000);
        });
      await livekitRoom.connect(url, token);

      // Seed People list + tiles for peers already in the room (ParticipantConnected only fires for later joiners)
      livekitRoom.remoteParticipants.forEach((p) => {
        if (isHiddenSystemBot(p.identity)) return;
        addParticipantTile(p);
        addParticipantRow(p.name || p.identity, false, emailFromParticipant(p), p.identity);
      });

      // Publish lobby tracks when available (avoids second getUserMedia on mobile)
      await publishLobbyTracksToLiveKit(Track);
      syncLocalCameraFromRoom();
      syncControlBarMediaButtons();
      showToast('Connected to ' + activeRoomId, 'success');
      updateParticipantCount();
      updateLayout();
      fetchRoomEntities(true).catch(function() {});
    } catch(e) {
      console.warn('[LiveKit] Demo mode:', e.message);
      showToast('Demo mode — LiveKit not configured', 'info');
    }
  }

  function handleRemoteTrack(track, participant) {
    if (isHiddenSystemBot(participant.identity)) return;
    // Screen share tracks get their own large display area
    if (track.source === 'screen_share') {
      const area  = document.getElementById('remoteScreenArea');
      const vid   = document.getElementById('remoteScreenVideo');
      const label = document.getElementById('remoteScreenLabel');
      track.attach(vid);
      label.textContent = (participant.name || participant.identity) + ' is sharing their screen';
      area.style.display = 'flex';
      area.style.flexDirection = 'column';
      updateLayout();
      return;
    }
    if (track.source === 'screen_share_audio') {
      const audio = document.getElementById('remoteScreenAudio');
      if (audio) {
        track.attach(audio);
        void applyAudioOutputToElement(audio);
      }
      return;
    }
    // Camera / audio track — attach to participant's tile
    const tile = document.getElementById('tile-' + participant.identity) || createParticipantTile(participant);
    if (track.kind === 'audio') {
      // Audio tracks need their own <audio> element (not the <video> element)
      let audio = tile.querySelector('audio');
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        tile.appendChild(audio);
      }
      track.attach(audio);
      void applyAudioOutputToElement(audio);
    } else {
      const el = tile.querySelector('video') || tile.querySelector('audio');
      track.attach(el);
    }
  }
  function removeRemoteTrack(track, participant) {
    // If it was a screen share, hide the screen share area
    if (track && track.source === 'screen_share') {
      const area = document.getElementById('remoteScreenArea');
      const vid  = document.getElementById('remoteScreenVideo');
      const audio = document.getElementById('remoteScreenAudio');
      area.style.display = 'none';
      vid.srcObject = null;
      if (audio) audio.srcObject = null;
      updateLayout();
      return;
    }
    if (track && track.source === 'screen_share_audio') {
      const audio = document.getElementById('remoteScreenAudio');
      if (audio) {
        track.detach(audio);
        audio.srcObject = null;
      }
      return;
    }
    const identity = participant ? participant.identity : track;
    const tile = document.getElementById('tile-' + identity);
    if (tile) tile.querySelectorAll('video,audio').forEach(el => { el.srcObject = null; });
  }
  function addParticipantTile(participant) {
    if (isHiddenSystemBot(participant.identity)) return;
    if (!document.getElementById('tile-' + participant.identity)) createParticipantTile(participant);
  }
  function removeParticipantTile(identity) {
    const tile = document.getElementById('tile-' + identity);
    if (tile) tile.remove();
    updateLayout();
  }
  function createParticipantTile(participant) {
    const grid = document.getElementById('videoGrid');
    const div  = document.createElement('div');
    div.className = 'video-tile';
    div.id = 'tile-' + participant.identity;
    div.innerHTML = \`
      <div class="video-placeholder">
        <div class="participant-avatar">\${(participant.name||participant.identity)[0].toUpperCase()}</div>
      </div>
      <video class="video-el" autoplay playsinline></video>
      <div class="tile-overlay">
        <div class="tile-name"><span>\${participant.name||participant.identity}</span></div>
      </div>
      <div class="speaking-ring"></div>\`;
    grid.appendChild(div);
    updateLayout();
    return div;
  }
  function updateSpeakers(speakers) {
    document.querySelectorAll('.speaking-ring').forEach(r => r.classList.remove('active'));
    speakers.forEach(sp => {
      const tile = document.getElementById('tile-' + sp.identity) || document.getElementById('tileSelf');
      if (tile) tile.querySelector('.speaking-ring')?.classList.add('active');
    });
  }

  function updateLayout() {
    const area  = document.getElementById('videoArea');
    const grid  = document.getElementById('videoGrid');
    const remote = document.getElementById('remoteScreenArea');
    const isPresenting = sharing ||
      (remote && remote.style.display && remote.style.display !== 'none');
    area.classList.toggle('presenting', !!isPresenting);

    const tiles = document.querySelectorAll('.video-tile');
    const n = tiles.length;
    const isPhone = window.innerWidth <= 560;

    if (isPresenting) {
      if (isPhone) {
        // Stack share on top; horizontal tile strip styled by CSS
        grid.style.flex = '';
        grid.style.width = '';
        grid.style.gridTemplateColumns = '';
        grid.style.gridAutoRows = '100px';
        grid.style.maxHeight = '';
      } else {
        const tileH = 110;
        const cols  = n <= 2 ? 1 : 2;
        grid.style.flex = '0 0 auto';
        grid.style.width = (cols * 160 + 6) + 'px';
        grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        grid.style.gridAutoRows = tileH + 'px';
        grid.style.maxHeight = '100%';
      }
    } else {
      grid.style.width = '';
      grid.style.flex = '';
      grid.style.gridAutoRows = '';
      grid.style.maxHeight = '';
      if (isPhone) {
        if (n <= 1) grid.style.gridTemplateColumns = '1fr';
        else        grid.style.gridTemplateColumns = '1fr 1fr';
      } else {
        if      (n <= 1) grid.style.gridTemplateColumns = '1fr';
        else if (n <= 2) grid.style.gridTemplateColumns = '1fr 1fr';
        else if (n <= 4) grid.style.gridTemplateColumns = '1fr 1fr';
        else if (n <= 6) grid.style.gridTemplateColumns = 'repeat(3,1fr)';
        else             grid.style.gridTemplateColumns = 'repeat(4,1fr)';
      }
    }
  }

  function participantRowId(identity) {
    return 'pr-' + String(identity || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /** Hide internal chat-listener bots from tiles / people list */
  function isHiddenSystemBot(identity) {
    return String(identity || '').startsWith('ai-listener-');
  }

  function emailFromParticipant(participant) {
    if (!participant || !participant.metadata) return '';
    try {
      const meta = JSON.parse(participant.metadata);
      return (meta && meta.email) ? String(meta.email) : '';
    } catch (_) {
      return '';
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Add a row to the People panel participants list */
  function addParticipantRow(name, isSelf, email, identity) {
    const list = document.getElementById('participantsList');
    if (!list) return;
    const idKey = identity || name;
    if (isHiddenSystemBot(idKey)) return;
    rememberParticipant(idKey, name, email, isSelf);
    const rowId = participantRowId(idKey);
    if (document.getElementById(rowId)) return;
    const displayName = name || idKey || '?';
    const colors = ['#7C3AED','#059669','#0284C7','#D97706','#DB2777','#D15000'];
    const color  = colors[displayName.charCodeAt(0) % colors.length];
    const div = document.createElement('div');
    div.id = rowId;
    div.dataset.identity = idKey;
    if (isSelf) div.dataset.self = '1';
    div.className = 'participant-row' + (isSelf ? ' host' : '');
    const emailHtml = email
      ? '<div class="participant-row-email">' + escapeHtml(email) + '</div>'
      : '';
    div.innerHTML =
      '<div class="participant-avatar-sm" style="background:linear-gradient(135deg,' + color + ',' + color + '88)">' +
        escapeHtml(displayName[0] || '?').toUpperCase() +
      '</div>' +
      '<div class="participant-row-info">' +
        '<div class="participant-row-name">' + escapeHtml(isSelf ? displayName + ' (You)' : displayName) + '</div>' +
        emailHtml +
        '<div class="participant-row-status" style="color:var(--green);font-size:11px">● Joined</div>' +
      '</div>' +
      '<div class="participant-row-actions"><span class="participant-role-chip">' + escapeHtml(describeRole({ isSelf: isSelf })) + '</span></div>';
    list.appendChild(div);
    renderPermissionsList();
  }

  /** Remove a participant row from the People panel */
  function removeParticipantRow(identityOrName) {
    const el = document.getElementById(participantRowId(identityOrName));
    if (el) el.remove();
    const target = String(identityOrName || '').toLowerCase();
    participantDirectory.forEach(function(participant, key) {
      if (key === target || String(participant.identity || '').toLowerCase() === target) {
        participantDirectory.delete(key);
      }
    });
    renderPermissionsList();
  }

  function updateParticipantCount() {
    const count = livekitRoom ? livekitRoom.numParticipants + 1 : 1;
    document.getElementById('participantCount').textContent = count;
    document.getElementById('peopleNotif').textContent = count;
    const badge = document.getElementById('peopleTabBadge');
    if (badge) badge.textContent = count;
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  async function toggleMic() {
    const next = !micEnabled;
    if (!livekitRoom) {
      micEnabled = next;
      if (lobbyStream) lobbyStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
      document.getElementById('lobbyMicBtn')?.classList.toggle('off', !micEnabled);
      syncControlBarMediaButtons();
      showToast(micEnabled ? 'Microphone on' : 'Microphone muted');
      return;
    }
    try {
      const micPub = getLocalMicPublication();
      if (publicationHasLiveTrack(micPub)) {
        if (next) await micPub.unmute();
        else await micPub.mute();
      } else {
        if (micPub && micPub.track) {
          try { await livekitRoom.localParticipant.unpublishTrack(micPub.track, true); } catch (_) {}
        }
        await livekitRoom.localParticipant.setMicrophoneEnabled(next);
      }
      micEnabled = next;
      syncControlBarMediaButtons();
      showToast(micEnabled ? 'Microphone on' : 'Microphone muted');
    } catch (e) {
      console.warn('[LiveKit] toggleMic failed:', e);
      showToast(micToggleErrorMessage(e), 'error');
      syncControlBarMediaButtons();
    }
  }
  async function toggleCamera() {
    const next = !camEnabled;
    if (!livekitRoom) {
      camEnabled = next;
      if (lobbyStream) lobbyStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
      document.getElementById('lobbyCamBtn')?.classList.toggle('off', !camEnabled);
      syncControlBarMediaButtons();
      showToast(camEnabled ? 'Camera on' : 'Camera off');
      return;
    }
    try {
      const camPub = getLocalCameraPublication();
      if (publicationHasLiveTrack(camPub)) {
        if (next) await camPub.unmute();
        else await camPub.mute();
      } else {
        if (camPub && camPub.track) {
          try { await livekitRoom.localParticipant.unpublishTrack(camPub.track, true); } catch (_) {}
        }
        await livekitRoom.localParticipant.setCameraEnabled(next);
      }
      camEnabled = next;
      if (camEnabled) syncLocalCameraFromRoom();
      else clearLocalCameraPreview();
      syncControlBarMediaButtons();
      showToast(camEnabled ? 'Camera on' : 'Camera off');
    } catch (e) {
      console.warn('[LiveKit] toggleCamera failed:', e);
      showToast(mediaPermissionErrorMessage('camera', e), 'error');
      syncControlBarMediaButtons();
    }
  }
  function isScreenShareAudioPub(pub) {
    if (!pub) return false;
    const src = pub.source;
    return src === 'screen_share_audio'
      || (livekitTrackSource && src === livekitTrackSource.ScreenShareAudio);
  }

  function hasScreenShareAudioTrack() {
    if (!livekitRoom) return false;
    const lp = livekitRoom.localParticipant;
    for (const pub of lp.audioTrackPublications.values()) {
      if (isScreenShareAudioPub(pub) && pub.track) return true;
    }
    for (const pub of lp.trackPublications.values()) {
      if (isScreenShareAudioPub(pub) && pub.track) return true;
    }
    return false;
  }

  function updateShareAudioBanner() {
    const status = document.getElementById('shareAudioStatus');
    if (!status) return;
    if (shareAudioActive) {
      status.textContent = 'System audio: On';
      status.classList.add('on');
      status.classList.remove('off');
    } else {
      status.textContent = 'System audio: Off';
      status.classList.add('off');
      status.classList.remove('on');
    }
  }

  function canScreenShare() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
  }

  function screenShareUnsupportedMessage() {
    return 'Screen sharing isn’t available in mobile browsers. Use a desktop browser to share.';
  }

  function applyScreenShareCapabilityUI() {
    const supported = canScreenShare();
    document.body.classList.toggle('no-screen-share', !supported);
    const shareBtn = document.getElementById('shareBtn');
    const moreShare = document.getElementById('moreShareItem');
    if (shareBtn) {
      shareBtn.classList.toggle('ctrl-btn-disabled', !supported);
      shareBtn.setAttribute('aria-disabled', supported ? 'false' : 'true');
      shareBtn.title = supported ? 'Share screen' : screenShareUnsupportedMessage();
    }
    if (moreShare) {
      moreShare.classList.toggle('more-menu-item-disabled', !supported);
      moreShare.setAttribute('aria-disabled', supported ? 'false' : 'true');
    }
  }

  async function startScreenShare() {
    if (!livekitRoom) { showToast('Not connected to room', 'error'); return; }
    if (!canScreenShare()) {
      showToast(screenShareUnsupportedMessage(), 'info');
      return;
    }
    try {
      const options = {
        audio: true,
        systemAudio: 'include',
        suppressLocalAudioPlayback: true,
      };
      const pub = await livekitRoom.localParticipant.setScreenShareEnabled(true, options);
      if (!pub) { showToast('Screen share cancelled', 'info'); return; }
      sharing = true;
      shareAudioActive = hasScreenShareAudioTrack();
      document.getElementById('shareBtn').classList.add('active');
      const overlay = document.getElementById('screenShareOverlay');
      overlay.style.display = 'flex';
      updateShareAudioBanner();
      updateLayout();
      if (pub.track && pub.track.mediaStreamTrack) {
        document.getElementById('screenVideo').srcObject = new MediaStream([pub.track.mediaStreamTrack]);
        pub.track.mediaStreamTrack.onended = stopScreenShare;
      }
      showToast('Screen sharing started', 'success');
      if (!shareAudioActive) {
        setTimeout(() => {
          if (!sharing) return;
          shareAudioActive = hasScreenShareAudioTrack();
          updateShareAudioBanner();
        }, 1000);
      }
    } catch (e) {
      sharing = false;
      shareAudioActive = false;
      document.getElementById('shareBtn').classList.remove('active');
      document.getElementById('screenShareOverlay').style.display = 'none';
      const name = (e && e.name) ? e.name : '';
      const msg = (e && e.message) ? String(e.message) : '';
      if (name === 'NotSupportedError' || /getDisplayMedia|not supported|unsupported/i.test(msg)) {
        showToast(screenShareUnsupportedMessage(), 'info');
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        showToast('Screen share permission denied', 'error');
      } else if (name === 'AbortError' || name === 'NotFoundError') {
        showToast('Screen share cancelled', 'info');
      } else {
        showToast('Could not start screen share', 'error');
      }
    }
  }

  async function stopScreenShareInternal(showMsg) {
    sharing = false;
    shareAudioActive = false;
    document.getElementById('shareBtn').classList.remove('active');
    const overlay = document.getElementById('screenShareOverlay');
    overlay.style.position = '';
    overlay.style.display = 'none';
    const vid = document.getElementById('screenVideo');
    if (vid.srcObject) { vid.srcObject.getTracks().forEach(t => t.stop()); vid.srcObject = null; }
    if (livekitRoom) await livekitRoom.localParticipant.setScreenShareEnabled(false);
    updateShareAudioBanner();
    updateLayout();
    if (showMsg) showToast('Screen sharing stopped');
  }

  function stopScreenShare() {
    stopScreenShareInternal(true);
  }

  function toggleScreenShare() {
    if (sharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }

  // ── Panel / visual viewport ───────────────────────────────────────────────
  function syncAppHeight() {
    if (!window.matchMedia('(max-width: 860px)').matches) {
      document.documentElement.style.removeProperty('--app-height');
      document.documentElement.style.removeProperty('--vv-bottom');
      return;
    }
    const vv = window.visualViewport;
    if (!vv) {
      document.documentElement.style.setProperty('--vv-bottom', '0px');
      return;
    }
    // Lift fixed UI from layout-viewport bottom up to the visible (visual) bottom.
    const vvBottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    document.documentElement.style.setProperty('--vv-bottom', vvBottom + 'px');
    document.documentElement.style.setProperty('--app-height', Math.round(vv.height) + 'px');
  }

  function syncPanelToViewport() {
    const panel = document.getElementById('roomPanel');
    if (!panel || !panelOpen || !window.visualViewport) return;
    const vv = window.visualViewport;
    const keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.setProperty('--kb-inset', keyboardInset + 'px');
    panel.style.setProperty('--panel-bar', keyboardInset > 80 ? '0px' : '');
  }

  function onVisualViewportChange() {
    syncAppHeight();
    syncPanelToViewport();
  }

  function startViewportSync() {
    syncPanelToViewport();
  }

  function stopViewportSync() {
    const panel = document.getElementById('roomPanel');
    if (panel) {
      panel.style.removeProperty('--kb-inset');
      panel.style.removeProperty('--panel-bar');
    }
  }

  (function initAppHeightSync() {
    syncAppHeight();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onVisualViewportChange);
      window.visualViewport.addEventListener('scroll', onVisualViewportChange);
    }
    window.addEventListener('resize', onVisualViewportChange);
    window.addEventListener('orientationchange', function() {
      setTimeout(onVisualViewportChange, 150);
    });
  })();

  function closeRoomPanel() {
    const panel  = document.getElementById('roomPanel');
    const layout = document.getElementById('roomLayout');
    if (!panel || !layout) return;
    panel.style.display = 'none';
    layout.classList.remove('panel-open');
    panelOpen = false;
    stopViewportSync();
    document.getElementById('chatToggleBtn').classList.remove('active');
    document.getElementById('peopleToggleBtn').classList.remove('active');
    setTimeout(updateLayout, 50);
  }

  function togglePanel(type) {
    const panel  = document.getElementById('roomPanel');
    const layout = document.getElementById('roomLayout');
    if (panelOpen && currentPanel === type) {
      closeRoomPanel();
      return;
    }
    panel.style.display = 'flex';
    layout.classList.add('panel-open');
    panelOpen = true;
    switchPanel(type);
    document.getElementById('chatToggleBtn').classList.toggle('active', panelOpen && currentPanel === 'chat');
    document.getElementById('peopleToggleBtn').classList.toggle('active', panelOpen && currentPanel === 'participants');
    startViewportSync();
    setTimeout(updateLayout, 50);
  }
  function switchPanel(type) {
    currentPanel = type;
    document.getElementById('tabChat').classList.toggle('active', type === 'chat');
    document.getElementById('tabParticipants').classList.toggle('active', type === 'participants');
    document.getElementById('tabPermissions').classList.toggle('active', type === 'permissions');
    document.getElementById('panelChat').style.display         = type === 'chat'         ? 'flex' : 'none';
    document.getElementById('panelParticipants').style.display = type === 'participants'  ? 'flex' : 'none';
    document.getElementById('panelPermissions').style.display  = type === 'permissions'   ? 'flex' : 'none';
    if (type === 'chat') document.getElementById('chatNotif').style.display = 'none';
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('[@ring] Enter pressed, calling sendChat');
      sendChat();
    }
  }

  function handleChatInput(e) {
    const val = e.target.value;
    const drop = document.getElementById('ringCmdDropdown');
    if (val === '@') {
      drop.style.display = 'block';
    } else {
      drop.style.display = 'none';
    }
  }

  function selectRingCmd() {
    document.getElementById('chatInput').value = '@ring ';
    document.getElementById('ringCmdDropdown').style.display = 'none';
    document.getElementById('chatInput').focus();
  }

  function openChatPanel() {
    const panel  = document.getElementById('roomPanel');
    const layout = document.getElementById('roomLayout');
    if (!panelOpen || currentPanel !== 'chat') {
      panel.style.display = 'flex';
      layout.classList.add('panel-open');
      panelOpen = true;
      switchPanel('chat');
      document.getElementById('chatToggleBtn').classList.toggle('active', true);
      document.getElementById('peopleToggleBtn').classList.toggle('active', false);
      startViewportSync();
      setTimeout(updateLayout, 50);
    }
  }

  function ringStatusIcon(kind) {
    var stroke = '#D15000';
    if (kind === 'success') stroke = '#10B981';
    else if (kind === 'error') stroke = '#EF4444';
    else if (kind === 'muted') stroke = 'rgba(255,255,255,.5)';
    var paths = {
      ringing: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.47 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.92z"/>',
      success: '<polyline points="20 6 9 17 4 12"/>',
      declined: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      expired: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    };
    return '<span class="ring-status-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + stroke + '" stroke-width="2.5">' + (paths[kind] || paths.warning) + '</svg></span>';
  }

  function addSystemMessage(html, isRing) {
    console.log('[@ring] UI feedback addSystemMessage', isRing ? '(ring)' : '', String(html).slice(0, 80));
    openChatPanel();
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg-system' + (isRing ? ' ring-status' : '');
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    const notif = document.getElementById('chatNotif');
    if (notif) notif.style.display = 'none';
  }

  async function ensureJoined() {
    const res = await fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, role: userRole })
    });
    const data = await res.json().catch(function() { return {}; });
    console.log('[@ring] ensureJoined status=' + res.status, data);
    if (!res.ok) console.warn('[@ring] ensureJoined failed', res.status, data);
    return res.ok;
  }

  function playOutgoingRingTone() {
    if (typeof window.playMFOutgoingRing === 'function') {
      window.playMFOutgoingRing();
    }
  }

  async function sendRing(email) {
    console.log('[@ring] sendRing start', { email, USER_EMAIL, activeRoomId });
    const target = email.trim().toLowerCase();
    if (target === USER_EMAIL.toLowerCase()) {
      console.log('[@ring] self-ring blocked');
      const msg = 'Cannot ring yourself while you are in the meeting.';
      addSystemMessage(ringStatusIcon('warning') + ' ' + msg, true);
      showToast('You are already in this meeting — use another account to test @ring', 'info');
      return;
    }
    try {
      openChatPanel();
      const joined = await ensureJoined();
      if (!joined) {
        const errMsg = 'Could not register join with server — try rejoining the meeting';
        addSystemMessage(ringStatusIcon('warning') + ' ' + escapeHtml(errMsg), true);
        showToast(errMsg, 'error');
        return;
      }
      let res = await fetch('/api/rings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: target, meetingId: activeRoomId })
      });
      let data = await res.json();
      console.log('[@ring] API status=' + res.status, data);
      if (!res.ok && res.status === 403) {
        await ensureJoined();
        res = await fetch('/api/rings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetEmail: target, meetingId: activeRoomId })
        });
        data = await res.json();
        console.log('[@ring] API retry status=' + res.status, data);
      }
      if (!res.ok) {
        const errMsg = data.error || ('Could not ring ' + email);
        addSystemMessage(ringStatusIcon('warning') + ' ' + escapeHtml(errMsg), true);
        showToast(errMsg, 'error');
        return;
      }
      addSystemMessage(ringStatusIcon('ringing') + ' Ringing <strong>' + escapeHtml(email) + '</strong>…', true);
      showToast('Ringing ' + (data.toName || email) + '…', 'info');
      playOutgoingRingTone();
      const ringId = data.ringId;
      const pollRing = setInterval(async () => {
        try {
          const sr = await fetch('/api/rings/' + encodeURIComponent(ringId) + '/status');
          const sd = await sr.json();
          if (sd.status === 'accepted') {
            clearInterval(pollRing);
            const msg = (sd.toName || email) + ' joined the meeting.';
            addSystemMessage(ringStatusIcon('success') + ' <strong>' + escapeHtml(sd.toName || email) + '</strong> joined the meeting.', true);
            showToast(msg, 'success');
          } else if (sd.status === 'rejected') {
            clearInterval(pollRing);
            const msg = (sd.toName || email) + ' declined the call.';
            addSystemMessage(ringStatusIcon('declined') + ' <strong>' + escapeHtml(sd.toName || email) + '</strong> declined the call.', true);
            showToast(msg, 'info');
          } else if (sd.status === 'expired') {
            clearInterval(pollRing);
            const msg = (sd.toName || email) + " didn't answer.";
            addSystemMessage(ringStatusIcon('expired') + " <strong>" + escapeHtml(sd.toName || email) + "</strong> didn't answer.", true);
            showToast(msg, 'info');
          }
        } catch (e2) { clearInterval(pollRing); }
      }, 3000);
    } catch (e) {
      console.error('[@ring] sendRing error', e);
      const errMsg = 'Could not send ring: ' + e.message;
      addSystemMessage(ringStatusIcon('warning') + ' ' + escapeHtml(errMsg), true);
      showToast(errMsg, 'error');
    }
  }

  function parseRingCommand(raw) {
    var msg = raw.trim();
    if (msg.toLowerCase().indexOf('@ring') !== 0) return null;
    var rest = msg.substring(5);
    var i = 0;
    while (i < rest.length) {
      var c = rest.charCodeAt(i);
      if (c !== 32 && c !== 9 && c !== 10 && c !== 13) break;
      i++;
    }
    var email = rest.substring(i).split(' ').join('').split('\t').join('').toLowerCase();
    if (email.indexOf('@') < 1) return null;
    return email;
  }

  function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    console.log('[@ring] sendChat', { msg });
    if (!msg) return;
    openChatPanel();
    const lowerMsg = msg.trim().toLowerCase();
    const looksLikeEntityCommand =
      lowerMsg.indexOf('@add ') === 0 ||
      lowerMsg.indexOf('@remove ') === 0 ||
      lowerMsg.indexOf('@whiteboard ') === 0 ||
      lowerMsg.indexOf('@browser ') === 0;
    if (looksLikeEntityCommand) {
      input.value = '';
      document.getElementById('ringCmdDropdown').style.display = 'none';
      void handleEntityChatCommand(msg).catch(function(e) {
        console.error('[entity] command failed', e);
        showToast(e && e.message ? e.message : 'Entity command failed', 'error');
      });
      return;
    }
    // Handle @ring command
    const ringEmail = parseRingCommand(msg);
    console.log('[@ring] parseRingCommand', ringEmail, 'codes:', [...msg].map(function(c) { return c.charCodeAt(0); }));
    const looksLikeRing = msg.trim().toLowerCase().indexOf('@ring') === 0;
    if (looksLikeRing && !ringEmail) {
      console.warn('[@ring] invalid format:', msg, 'codes:', [...msg].map(function(c) { return c.charCodeAt(0); }));
      addSystemMessage(ringStatusIcon('warning') + ' Use: <strong>@ring email@example.com</strong>', true);
      showToast('Invalid @ring format. Use: @ring email@example.com', 'error');
      input.value = '';
      document.getElementById('ringCmdDropdown').style.display = 'none';
      return;
    }
    if (ringEmail) {
      console.log('[@ring] matched email=' + ringEmail);
      input.value = '';
      document.getElementById('ringCmdDropdown').style.display = 'none';
      showToast('Sending ring to ' + ringEmail + '…', 'info');
      void sendRing(ringEmail).catch(function(e) {
        console.error('[@ring] sendRing unhandled', e);
        showToast('Ring failed: ' + e.message, 'error');
      });
      return;
    }
    const container = document.getElementById('chatMessages');
    const now = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-self';
    div.innerHTML = \`<div class="chat-msg-meta" style="justify-content:flex-end">
      <span class="chat-time">\${now}</span>
      <span class="chat-sender">You</span>
      <span class="chat-avatar">\${USER_INITIAL}</span>
    </div>
    <div class="chat-bubble self-bubble">\${escapeHtml(msg)}</div>\`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    input.value = '';
    if (livekitRoom) livekitRoom.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({ type: 'chat', msg, name: userName })),
      { reliable: true }
    );
  }
  function addEmoji() {
    const emojis = ['👍','😊','🎉','❤️','😂','🔥','👏','✅'];
    const input = document.getElementById('chatInput');
    input.value += emojis[Math.floor(Math.random()*emojis.length)];
    input.focus();
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Safe markdown lite: escape first, then bold / code / links / lists. */
  function renderMarkdown(md) {
    var text = String(md || '');
    var lines = text.split(/\\r?\\n/);
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
      escaped = escaped.replace(new RegExp('\\x60([^\\x60]+)\\x60', 'g'), '<code>$1</code>');
      escaped = escaped.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      escaped = escaped.replace(
        /\\[([^\\]]+)\\]\\(([^)]+)\\)/g,
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
      var bullet = line.match(/^\\s*[-*]\\s+(.+)$/);
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
    return '<div class="chat-md">' + (html.join('') || '<p></p>') + '</div>';
  }

  function appendChatMessage(name, msg) {
    const container = document.getElementById('chatMessages');
    const now = new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    const initial = (name || '?')[0].toUpperCase();
    const div = document.createElement('div');
    div.className = 'chat-msg';
    const meta = document.createElement('div');
    meta.className = 'chat-msg-meta';
    const avatarSpan = document.createElement('span');
    avatarSpan.className = 'chat-avatar';
    avatarSpan.textContent = initial;
    const senderSpan = document.createElement('span');
    senderSpan.className = 'chat-sender';
    senderSpan.textContent = name || 'Unknown';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-time';
    timeSpan.textContent = now;
    meta.appendChild(avatarSpan);
    meta.appendChild(senderSpan);
    meta.appendChild(timeSpan);
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    const isAgentMsg = name === 'AI Agent' || name === 'Meeting Host';
    if (isAgentMsg) {
      bubble.classList.add('chat-bubble-md');
      bubble.innerHTML = renderMarkdown(msg);
    } else {
      bubble.textContent = msg;
    }
    div.appendChild(meta);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (!panelOpen || currentPanel !== 'chat') {
      const notif = document.getElementById('chatNotif');
      if (notif) notif.style.display = 'flex';
    }
  }

  // ── Reactions ─────────────────────────────────────────────────────────────
  function toggleReactions() {
    const p = document.getElementById('reactionsPicker');
    p.style.display = p.style.display === 'none' ? 'flex' : 'none';
  }
  function showReactionOverlay(emoji) {
    const overlay = document.getElementById('reactionOverlay');
    const el = document.createElement('div');
    el.className = 'floating-reaction';
    el.textContent = emoji;
    el.style.left = (20 + Math.random() * 60) + '%';
    overlay.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
  function sendReaction(emoji) {
    document.getElementById('reactionsPicker').style.display = 'none';
    showReactionOverlay(emoji);
    if (livekitRoom) {
      livekitRoom.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'reaction', emoji, name: userName })),
        { reliable: false }
      );
    }
  }

  // ── More menu ─────────────────────────────────────────────────────────────
  function toggleMore() {
    closeTopbarMenu();
    const m = document.getElementById('moreMenu');
    m.style.display = m.style.display === 'none' ? 'block' : 'none';
  }

  // ── Topbar overflow menu (meeting chrome) ─────────────────────────────────
  function closeTopbarMenu() {
    const m = document.getElementById('topbarMenu');
    const btn = document.getElementById('topbarMenuBtn');
    if (m) m.style.display = 'none';
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  function toggleTopbarMenu() {
    document.getElementById('moreMenu').style.display = 'none';
    const m = document.getElementById('topbarMenu');
    const btn = document.getElementById('topbarMenuBtn');
    const open = m.style.display === 'none';
    m.style.display = open ? 'block' : 'none';
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function showInfo()         { showInfoModal(); }

  // ── Invite / share link ───────────────────────────────────────────────────
  function getRoomLink() { return window.location.origin + '/room/' + activeRoomId; }

  function showInviteModal() {
    const link = getRoomLink();
    document.getElementById('inviteLinkText').textContent = link;
    document.getElementById('qrLinkLabel').textContent = link;
    document.getElementById('copyIcon').style.display = '';
    document.getElementById('checkIcon').style.display = 'none';
    document.getElementById('copyBtnLabel').textContent = 'Copy';
    document.getElementById('copyLinkBtn').style.background = '';
    document.getElementById('inviteModal').classList.add('open');
  }
  function closeInviteModal() {
    document.getElementById('inviteModal').classList.remove('open');
  }
  async function copyRoomLink() {
    const link = getRoomLink();
    try { await navigator.clipboard.writeText(link); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    document.getElementById('copyIcon').style.display = 'none';
    document.getElementById('checkIcon').style.display = '';
    document.getElementById('copyBtnLabel').textContent = 'Copied!';
    document.getElementById('copyLinkBtn').style.background = 'var(--green)';
    showToast('Room link copied to clipboard', 'success');
    setTimeout(() => {
      document.getElementById('copyIcon').style.display = '';
      document.getElementById('checkIcon').style.display = 'none';
      document.getElementById('copyBtnLabel').textContent = 'Copy';
      document.getElementById('copyLinkBtn').style.background = '';
    }, 2500);
  }
  async function copyLobbyLink(btn) {
    const link = window.location.origin + '/room/' + activeRoomId;
    try { await navigator.clipboard.writeText(link); }
    catch (e) { const ta = Object.assign(document.createElement('textarea'), { value: link });
      ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    btn.textContent = '✓ Copied!';
    btn.style.color = 'var(--green)';
    setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy'; btn.style.color = ''; }, 2000);
  }
  function shareViaEmail() {
    const link = getRoomLink();
    const subject = encodeURIComponent('Join my meeting: ' + activeRoomId);
    const body = encodeURIComponent('Hi,\\n\\nJoin my Meeting Forest session:\\n' + link + '\\n\\nSee you there!');
    window.open('mailto:?subject=' + subject + '&body=' + body);
    closeInviteModal();
  }
  async function shareNative() {
    const link = getRoomLink();
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my meeting: ' + activeRoomId, url: link }); closeInviteModal(); }
      catch (e) { /* user cancelled */ }
    } else { copyRoomLink(); }
  }
  function openQrCode() {
    closeInviteModal();
    const link = getRoomLink();
    document.getElementById('qrLinkLabel').textContent = link;
    document.getElementById('qrModal').classList.add('open');
    renderQr(link);
  }
  function closeQrModal() { document.getElementById('qrModal').classList.remove('open'); }
  function renderQr(text) {
    const canvas = document.getElementById('qrCodeCanvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F9FAFB'; ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#111827'; ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('Generating…', 100, 100);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { ctx.clearRect(0, 0, 200, 200); ctx.drawImage(img, 0, 0, 200, 200); };
    img.onerror = () => {
      ctx.fillStyle = '#F9FAFB'; ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#6B7280';
      ctx.fillText('QR not available', 100, 96); ctx.fillText('Copy link instead', 100, 112);
    };
    img.src = 'https://quickchart.io/qr?text=' + encodeURIComponent(text) + '&size=200&margin=1';
  }
  function downloadQr() {
    const canvas = document.getElementById('qrCodeCanvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'meeting-' + ROOM_ID + '-qr.png';
    a.click();
  }

  document.getElementById('inviteModal').addEventListener('click', e => {
    if (e.target === document.getElementById('inviteModal')) closeInviteModal();
  });
  document.getElementById('qrModal').addEventListener('click', e => {
    if (e.target === document.getElementById('qrModal')) closeQrModal();
  });

  function toggleSecurity() { showToast('Meeting is end-to-end encrypted', 'success'); }
  function toggleRecord() {
    const btn = document.getElementById('recordBtn');
    btn.classList.toggle('recording');
    const recording = btn.classList.contains('recording');
    const topItem = document.getElementById('topbarRecordItem');
    const topLabel = document.getElementById('topbarRecordLabel');
    if (topItem) topItem.classList.toggle('recording', recording);
    if (topLabel) topLabel.textContent = recording ? 'Recording…' : 'Record';
    showToast(recording ? 'Recording started' : 'Recording stopped',
              recording ? 'success' : 'info');
  }
  // ── Device menus ──────────────────────────────────────────────────────────
  const DEVICE_CHECK_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  function deviceMenuEl(which) {
    return document.getElementById(which === 'video' ? 'videoDeviceMenu' : 'audioDeviceMenu');
  }

  function deviceSectionHtml(title, kind) {
    const list = mediaDevices[kind] || [];
    let rows;
    if (!list.length) {
      rows = '<div class="device-menu-empty">No ' + escapeHtml(title.toLowerCase()) + ' detected</div>';
    } else {
      const selected = selectedDevices[kind];
      rows = list.map(function(d, i) {
        const active = selected
          ? selected === d.deviceId
          : (d.deviceId === 'default' || (i === 0 && !list.some(function(x) { return x.deviceId === 'default'; })));
        return '<button class="device-menu-item' + (active ? ' active' : '') + '"' +
          ' role="menuitemradio" aria-checked="' + (active ? 'true' : 'false') + '"' +
          ' data-kind="' + kind + '" data-device-id="' + escapeHtml(d.deviceId) + '">' +
          '<span class="device-menu-check">' + (active ? DEVICE_CHECK_SVG : '') + '</span>' +
          '<span class="device-menu-text">' + escapeHtml(d.label) + '</span>' +
        '</button>';
      }).join('');
    }
    return '<div class="device-menu-section">' +
      '<div class="device-menu-label">' + escapeHtml(title) + '</div>' + rows +
    '</div>';
  }

  function speakerSectionHtml() {
    if (supportsSpeakerSelection()) return deviceSectionHtml('Speaker', 'audiooutput');
    return '<div class="device-menu-section">' +
      '<div class="device-menu-label">Speaker</div>' +
      '<div class="device-menu-empty">System default — this browser cannot switch audio output</div>' +
    '</div>';
  }

  function renderDeviceMenu(which) {
    const menu = deviceMenuEl(which);
    if (!menu) return;
    menu.innerHTML = which === 'video'
      ? deviceSectionHtml('Camera', 'videoinput')
      : (deviceSectionHtml('Microphone', 'audioinput') + speakerSectionHtml());
  }

  function positionDeviceMenu(menu, anchor) {
    const rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    if (!rect) {
      menu.style.left = '50%';
      menu.style.top = 'auto';
      menu.style.bottom = 'calc(var(--control-bar-stack, 80px) + 8px)';
      menu.style.transform = 'translateX(-50%)';
      return;
    }
    menu.style.transform = 'none';
    menu.style.bottom = 'auto';
    const width = menu.offsetWidth || 260;
    const height = menu.offsetHeight || 240;
    const left = Math.max(12, Math.min(
      rect.left + rect.width / 2 - width / 2,
      window.innerWidth - width - 12
    ));
    menu.style.left = left + 'px';
    menu.style.top = rect.top > height + 16
      ? (rect.top - height - 10) + 'px'
      : Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - height - 12)) + 'px';
  }

  function closeDeviceMenus() {
    deviceMenuOpenFor = null;
    const audio = document.getElementById('audioDeviceMenu');
    const video = document.getElementById('videoDeviceMenu');
    if (audio) audio.style.display = 'none';
    if (video) video.style.display = 'none';
  }

  function openDeviceMenu(which, anchor) {
    const menu = deviceMenuEl(which);
    if (!menu) return;
    closeDeviceMenus();
    const more = document.getElementById('moreMenu');
    if (more) more.style.display = 'none';
    closeTopbarMenu();
    deviceMenuOpenFor = which;
    renderDeviceMenu(which);
    menu.style.display = 'block';
    positionDeviceMenu(menu, anchor);
    // Re-enumerate so labels and hot-plugged devices are current.
    refreshMediaDevices().then(function() {
      if (deviceMenuOpenFor === which) positionDeviceMenu(menu, anchor);
    });
  }

  function toggleDeviceMenu(which, anchor) {
    if (deviceMenuOpenFor === which) closeDeviceMenus();
    else openDeviceMenu(which, anchor);
  }

  function showAudioMenu(anchor) {
    toggleDeviceMenu('audio', anchor || document.getElementById('micBtn'));
  }
  function showVideoMenu(anchor) {
    toggleDeviceMenu('video', anchor || document.getElementById('camBtn'));
  }

  function handleDeviceMenuClick(e) {
    e.stopPropagation();
    const btn = e.target.closest ? e.target.closest('.device-menu-item') : null;
    if (!btn) return;
    const kind = btn.dataset.kind;
    const deviceId = btn.dataset.deviceId || '';
    closeDeviceMenus();
    if (kind === 'audioinput') void setMicrophoneDevice(deviceId);
    else if (kind === 'audiooutput') void setSpeakerDevice(deviceId);
    else if (kind === 'videoinput') void setCameraDevice(deviceId);
  }

  // ── Meeting Info modal ────────────────────────────────────────────────────
  function showInfoModal() {
    document.getElementById('infoRoomId').textContent = activeRoomId;
    document.getElementById('infoModalSubtitle').textContent = isAdmin ? 'Admin controls' : 'Room details';

    if (isAdmin) {
      document.getElementById('infoPrivacyToggle').style.display = '';
      document.getElementById('infoPrivacyBadge').style.display = 'none';
      document.querySelectorAll('input[name="infoPrivacy"]').forEach(function(el) {
        el.checked = el.value === currentPrivacy;
      });
      syncPrivacyLabels('info');
    } else {
      document.getElementById('infoPrivacyToggle').style.display = 'none';
      var badge = document.getElementById('infoPrivacyBadge');
      badge.style.display = '';
      if (currentPrivacy === 'private') {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:4px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Private';
        badge.style.background = 'rgba(209,80,0,.15)';
        badge.style.color = '#ff7b2e';
        badge.style.border = '1px solid rgba(209,80,0,.3)';
      } else {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Public';
        badge.style.background = 'rgba(16,185,129,.12)';
        badge.style.color = '#10B981';
        badge.style.border = '1px solid rgba(16,185,129,.25)';
      }
    }
    document.getElementById('infoModal').classList.add('open');
  }
  function closeInfoModal() { document.getElementById('infoModal').classList.remove('open'); }
  document.getElementById('infoModal').addEventListener('click', function(e) {
    if (e.target === document.getElementById('infoModal')) closeInfoModal();
  });

  function syncPrivacyLabels(prefix) {
    var pubLabel  = document.getElementById(prefix + 'PublicLabel');
    var privLabel = document.getElementById(prefix + 'PrivateLabel');
    if (!pubLabel || !privLabel) return;
    var checkedEl = document.querySelector('input[name="' + prefix + 'Privacy"]:checked');
    var isPrivate = checkedEl ? checkedEl.value === 'private' : currentPrivacy === 'private';
    pubLabel.style.borderColor  = isPrivate ? 'rgba(255,255,255,.08)' : '#D15000';
    pubLabel.style.background   = isPrivate ? 'transparent' : 'rgba(209,80,0,.08)';
    privLabel.style.borderColor = isPrivate ? '#D15000' : 'rgba(255,255,255,.08)';
    privLabel.style.background  = isPrivate ? 'rgba(209,80,0,.08)' : 'transparent';
  }

  document.querySelectorAll('input[name="infoPrivacy"]').forEach(function(el) {
    el.addEventListener('change', function() { syncPrivacyLabels('info'); });
  });
  document.querySelectorAll('input[name="settingsPrivacy"]').forEach(function(el) {
    el.addEventListener('change', function() { syncPrivacyLabels('settings'); });
  });

  async function saveInfoPrivacy() {
    var selected = document.querySelector('input[name="infoPrivacy"]:checked');
    if (!selected) return;
    var btn = document.getElementById('infoSavePrivacy');
    btn.disabled = true; btn.textContent = 'Saving…';
    await changePrivacy(selected.value);
    btn.disabled = false; btn.textContent = 'Save Changes';
    closeInfoModal();
  }

  // ── Meeting Settings modal ────────────────────────────────────────────────
  function openSettings() {
    if (!isAdmin) { showToast('Only the meeting admin can change settings', 'info'); return; }
    document.querySelectorAll('input[name="settingsPrivacy"]').forEach(function(el) {
      el.checked = el.value === currentPrivacy;
    });
    syncPrivacyLabels('settings');
    document.getElementById('settingsModal').classList.add('open');
  }
  function closeSettingsModal() { document.getElementById('settingsModal').classList.remove('open'); }
  document.getElementById('settingsModal').addEventListener('click', function(e) {
    if (e.target === document.getElementById('settingsModal')) closeSettingsModal();
  });

  async function saveSettingsPrivacy() {
    var selected = document.querySelector('input[name="settingsPrivacy"]:checked');
    if (!selected) return;
    var btn = document.getElementById('settingsSavePrivacy');
    btn.disabled = true; btn.textContent = 'Saving…';
    await changePrivacy(selected.value);
    btn.disabled = false; btn.textContent = 'Save Changes';
    closeSettingsModal();
  }

  // ── Live privacy change ───────────────────────────────────────────────────
  async function changePrivacy(newPrivacy) {
    if (newPrivacy === currentPrivacy) return;
    try {
      var res = await fetch(
        '/api/meetings/' + encodeURIComponent(activeRoomId) + '/privacy',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacy: newPrivacy }) }
      );
      if (!res.ok) {
        var d = await res.json().catch(function() { return {}; });
        showToast('Could not update privacy: ' + (d.error || 'Server error'), 'error');
        return;
      }
      currentPrivacy = newPrivacy;
      applyPrivacyUI();
      showToast(newPrivacy === 'private' ? 'Meeting is now Private' : 'Meeting is now Public', 'success');
    } catch (e) {
      showToast('Could not update privacy', 'error');
    }
  }

  function applyPrivacyUI() {
    var isNowPrivate = currentPrivacy === 'private';
    var waitingCtrl = document.getElementById('waitingCtrlGroup');
    if (waitingCtrl) waitingCtrl.style.display = isNowPrivate && isAdmin ? '' : 'none';
    if (isNowPrivate && isAdmin) {
      startWaitingPoll();
    } else if (isAdmin) {
      stopWaitingPoll();
      document.getElementById('waitingPanel').style.display = 'none';
      document.getElementById('waitingBtn') && document.getElementById('waitingBtn').classList.remove('active');
      waitingPanelOpen = false;
    }
    document.querySelectorAll('input[name="infoPrivacy"], input[name="settingsPrivacy"]').forEach(function(el) {
      el.checked = el.value === currentPrivacy;
    });
    syncPrivacyLabels('info');
    syncPrivacyLabels('settings');
  }

  // ── Leave ─────────────────────────────────────────────────────────────────
  function leaveRoom() {
    hasJoinedMeeting = false;
    stopMeetingHeartbeat();
    if (userName) {
      fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
      }).catch(() => {});
    }
    if (livekitRoom) livekitRoom.disconnect();
    clearLocalCameraPreview();
    clearInterval(timerInterval);
    showToast('You left the meeting', 'info');
    setTimeout(() => window.location.href = '/', 1500);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    console.log('[@ring] UI feedback showToast', type, message);
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.innerHTML = '<span>' + (icons[type]||'ℹ') + '</span><span>' + message + '</span>';
    c.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3400);
  }

  applyScreenShareCapabilityUI();

  // ── Close menus on outside click ──────────────────────────────────────────
  document.getElementById('moreMenu').addEventListener('click', function(e) {
    e.stopPropagation();
  });
  document.getElementById('topbarMenu').addEventListener('click', function(e) {
    e.stopPropagation();
  });
  document.getElementById('audioDeviceMenu').addEventListener('click', handleDeviceMenuClick);
  document.getElementById('videoDeviceMenu').addEventListener('click', handleDeviceMenuClick);
  document.getElementById('permsList')?.addEventListener('change', handlePermissionToggle);
  window.addEventListener('resize', closeDeviceMenus);
  document.getElementById('roomLayout').addEventListener('pointerdown', function(e) {
    if (!panelOpen) return;
    if (!window.matchMedia('(max-width: 860px)').matches) return;
    if (e.target.closest('.room-panel')) return;
    closeRoomPanel();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#moreMenu') && !e.target.closest('#moreBtn'))
      document.getElementById('moreMenu').style.display = 'none';
    if (!e.target.closest('#topbarMenu') && !e.target.closest('#topbarMenuBtn'))
      closeTopbarMenu();
    if (!e.target.closest('#reactionsPicker') && !e.target.closest('#reactBtn') && !e.target.closest('.more-menu-item'))
      document.getElementById('reactionsPicker').style.display = 'none';
    if (!e.target.closest('#ringCmdDropdown') && !e.target.closest('#chatInput'))
      document.getElementById('ringCmdDropdown').style.display = 'none';
    if (!e.target.closest('.device-menu') && !e.target.closest('.ctrl-btn-caret')
        && !e.target.closest('.more-menu-item'))
      closeDeviceMenus();
  });
  window.addEventListener('resize', function() {
    if (!window.matchMedia('(max-width: 860px)').matches) closeTopbarMenu();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (deviceMenuOpenFor) {
      closeDeviceMenus();
      e.preventDefault();
      return;
    }
    if (entityFocusType) {
      closeEntityFocus();
      e.preventDefault();
      return;
    }
    if (activeEntityType === 'browser') {
      closeVirtualBrowser();
      e.preventDefault();
      return;
    }
    if (activeEntityType === 'whiteboard') {
      closeWhiteboard();
      e.preventDefault();
      return;
    }
    const tree = document.getElementById('treeOverlay');
    if (tree && tree.classList.contains('open')) {
      closeTreeOverlay();
      e.preventDefault();
    }
  });

  // ── Global error handlers (debug @ring) ────────────────────────────────────
  window.onerror = function(msg, src, line, col, err) {
    console.error('[@ring] ERROR window.onerror', msg, src, line, err);
  };
  window.addEventListener('unhandledrejection', function(e) {
    console.error('[@ring] ERROR unhandledrejection', e.reason);
  });

  // ── Audio meter (demo animation) ──────────────────────────────────────────
  function animateMeter() {
    for (let i = 0; i < 12; i++) {
      const bar = document.getElementById('bar' + i);
      if (bar && micEnabled) {
        const h = Math.random() * 100;
        bar.style.height = h + '%';
        bar.style.opacity = h > 30 ? '1' : '0.3';
      } else if (bar) {
        bar.style.height = '5%';
        bar.style.opacity = '0.2';
      }
    }
  }
  setInterval(animateMeter, 80);
</script>
<script src="/public/ring-notifier.js?v=5"></script>
<script>window.__MF_MEETING_ID=${JSON.stringify(safeRoomId)};</script>
</body>
</html>`;
}
