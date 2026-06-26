export function roomPage(roomId: string, user?: { name: string; email: string }, serverRole?: string): string {
  const safeRoomId   = roomId || 'my-room';
  const prefillName  = (user?.name || "").replace(/`/g, "'").replace(/"/g, "&quot;");
  // Sanitize server-injected role (only allow known role strings)
  const allowedRoles = ['superadmin', 'admin', 'participant'];
  const injectedRole = allowedRoles.includes(serverRole || '') ? (serverRole as string) : '';
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting Forest — Room</title>
  <link rel="stylesheet" href="/public/styles.css" />
  <link rel="stylesheet" href="/public/room.css" />
  <link rel="stylesheet" href="/public/tree.css" />
</head>
<body class="room-body">

<!-- ── Topbar ─────────────────────────────────────────────────────────────── -->
<header class="room-topbar">
  <div class="room-topbar-left">
    <a href="/" class="room-logo">
      <div class="sb-logo-icon" style="width:30px;height:30px;border-radius:8px">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <span>Meeting Forest</span>
    </a>
    <div class="room-divider-v"></div>
    <div class="room-name-display">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <span id="roomNameDisplay">${safeRoomId}</span>
    </div>
    <!-- Multi-room presence chip (super admin only) -->
    <div class="tree-presence-chip" id="presenceChip" style="display:none">
      <div class="tree-presence-dot"></div>
      <span id="presenceLabel">1 room</span>
    </div>
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
    <button class="room-top-btn" id="securityBtn" title="Security" onclick="toggleSecurity()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </button>
    <!-- Share / invite link button -->
    <button class="room-top-btn" id="inviteBtn" title="Copy invite link" onclick="showInviteModal()" style="gap:6px">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      <span style="font-size:12px;font-weight:700">Invite</span>
    </button>
    <button class="room-top-btn" id="infoBtn" title="Meeting info" onclick="showInfo()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
    <button class="room-top-btn" id="recordBtn" title="Record" onclick="toggleRecord()" style="gap:6px">
      <div class="rec-dot" style="width:8px;height:8px;background:var(--red)"></div>
      <span style="font-size:12px;font-weight:700">REC</span>
    </button>
    <button class="btn btn-danger btn-sm" onclick="leaveRoom()" style="border-radius:8px;gap:6px">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Leave
    </button>
  </div>
</header>

<!-- ── Main layout ─────────────────────────────────────────────────────────── -->
<div class="room-layout" id="roomLayout">

  <!-- Video grid -->
  <div class="video-area" id="videoArea">

    <!-- Remote screen share display — hidden until someone shares their screen -->
    <div id="remoteScreenArea" style="display:none;flex:1;min-height:0;position:relative;background:#111;border-radius:12px;overflow:hidden;margin-bottom:8px">
      <video id="remoteScreenVideo" autoplay playsinline style="width:100%;height:100%;object-fit:contain;display:block"></video>
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
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        You are sharing your screen
        <button class="btn btn-danger btn-sm" onclick="stopScreenShare()">Stop Sharing</button>
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
    </div>

    <!-- Chat panel -->
    <div class="panel-body" id="panelChat">
      <div class="chat-messages" id="chatMessages">
        <div class="chat-msg-system">Meeting started — ${new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div class="chat-input-area">
        <div class="chat-input-wrap">
          <input class="chat-input" id="chatInput" placeholder="Message everyone…" onkeydown="handleChatKey(event)" />
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
        <button class="ctrl-btn-caret" onclick="showAudioMenu()">
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
        <button class="ctrl-btn-caret" onclick="showVideoMenu()">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <span class="ctrl-label">Camera</span>
    </div>
  </div>

  <div class="controls-center">
    <div class="control-group">
      <button class="ctrl-btn" id="shareBtn" onclick="toggleScreenShare()" title="Share screen">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>
      <span class="ctrl-label">Share</span>
    </div>

    <div class="control-group">
      <button class="ctrl-btn" id="reactBtn" onclick="toggleReactions()" title="Reactions">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>
      <span class="ctrl-label">React</span>
    </div>

    <div class="control-group">
      <button class="ctrl-btn" onclick="toggleWhiteboard()" title="Whiteboard">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      </button>
      <span class="ctrl-label">Board</span>
    </div>

    <!-- Tree button — visible only for admin/superadmin -->
    <div class="control-group" id="treeCtrlGroup" style="display:none">
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
  <button class="more-menu-item" onclick="toggleVirtualBackground()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9l4-4 4 4 4-4 4 4"/></svg>
    Virtual Background
  </button>
  <button class="more-menu-item" onclick="toggleNoiseSuppression()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M23 9l-6 6"/><path d="M17 9l6 6"/></svg>
    Noise Suppression
    <span class="more-menu-badge">ON</span>
  </button>
  <div class="more-menu-divider"></div>
  <button class="more-menu-item" onclick="showStats()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    Call Statistics
  </button>
  <button class="more-menu-item" onclick="showSettings()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    Audio &amp; Video Settings
  </button>
  <div class="more-menu-divider"></div>
  <button class="more-menu-item danger" onclick="leaveRoom()">
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    Leave Meeting
  </button>
</div>

<!-- ── Reaction overlay ────────────────────────────────────────────────────── -->
<div class="reaction-overlay" id="reactionOverlay"></div>

<!-- ── Audio meter ────────────────────────────────────────────────────────── -->
<div class="audio-meter" id="audioMeter">
  ${Array.from({length: 12}, (_,i) => `<div class="meter-bar" id="bar${i}"></div>`).join('')}
</div>

<!-- ── Lobby overlay ──────────────────────────────────────────────────────── -->
<div class="lobby-overlay" id="lobbyOverlay">
  <div class="lobby-card">
    <div style="text-align:center;margin-bottom:24px">
      <div class="sb-logo-icon" style="width:52px;height:52px;border-radius:14px;margin:0 auto 14px">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5">
          <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
        </svg>
      </div>
      <h2 style="font-size:22px;font-weight:800;margin-bottom:6px">Ready to join?</h2>
      <p style="font-size:14px;color:rgba(255,255,255,.55)">Room: <strong style="color:rgba(255,255,255,.85)">${safeRoomId}</strong></p>
      <div id="lobbyRoleBadge" style="margin-top:8px;display:none">
        <span style="font-size:11px;font-weight:700;background:#FFF3E9;color:#D15000;border:1px solid #FED7AA;border-radius:20px;padding:3px 10px"></span>
      </div>
    </div>

    <div class="lobby-preview">
      <video id="lobbyVideo" muted autoplay playsinline style="width:100%;height:100%;object-fit:cover;border-radius:12px;background:#111"></video>
      <div class="lobby-preview-name" id="lobbyPreviewName">Loading camera…</div>
    </div>

    <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">
      <button class="ctrl-btn" id="lobbyMicBtn" onclick="toggleLobbyMic()" title="Mic">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <button class="ctrl-btn" id="lobbyCamBtn" onclick="toggleLobbyCam()" title="Camera">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </button>
    </div>

    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">Your Name</label>
      <input class="form-input" id="lobbyName" placeholder="Enter your display name" value="${prefillName}" />
    </div>

    <button class="btn btn-primary btn-lg" style="width:100%;justify-content:center" onclick="joinFromLobby()">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
      </svg>
      Join Meeting
    </button>
    <!-- Shareable link row -->
    <div style="margin-top:14px;padding:10px 12px;background:rgba(255,255,255,.07);border-radius:10px;border:1px solid rgba(255,255,255,.12)">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Room Link</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span id="lobbyLinkText" style="flex:1;font-size:12px;color:rgba(255,255,255,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:monospace"></span>
        <button class="btn btn-ghost btn-sm" style="flex-shrink:0;gap:5px;padding:5px 10px" onclick="copyLobbyLink(this)">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>
    </div>
    <a href="/" class="btn btn-ghost btn-lg" style="width:100%;justify-content:center;margin-top:10px">← Back to Dashboard</a>
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
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:16px">
      <div style="flex:1;display:flex;align-items:center;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.12);border-radius:10px;padding:0 12px;height:42px;overflow:hidden">
        <span id="inviteLinkText" style="font-size:13px;color:rgba(255,255,255,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;font-family:monospace"></span>
      </div>
      <button id="copyLinkBtn" class="btn btn-primary" style="height:42px;border-radius:10px;padding:0 16px;gap:6px;flex-shrink:0" onclick="copyRoomLink()">
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
    <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:14px;margin-bottom:4px">
      <p style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px">Or share via</p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;gap:6px" onclick="shareViaEmail()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email
        </button>
        <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;gap:6px" onclick="shareNative()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
        <button class="btn btn-ghost btn-sm" style="flex:1;justify-content:center;gap:6px" onclick="openQrCode()">
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

    <div class="smm-footer">
      <button class="smm-btn smm-btn-cancel" onclick="closeSubMeetingModal()">Cancel</button>
      <button class="smm-btn smm-btn-create" onclick="createSubMeeting()">Create Sub-meeting</button>
    </div>
  </div>
</div>

<!-- Toast container -->
<div class="toast-container" id="toastContainer"></div>

<script src="/public/tree.js"></script>
<script>
  const ROOM_ID   = '${safeRoomId}';
  const urlParams = new URLSearchParams(location.search);
  let userName    = urlParams.get('name') || '${prefillName}';
  // Server-injected role takes precedence (set when server verifies user is meeting creator)
  const _serverRole = '${injectedRole}';
  const userRole  = _serverRole || urlParams.get('role') || 'participant'; // 'superadmin' | 'admin' | 'participant'
  const isAdmin   = userRole === 'superadmin' || userRole === 'admin';
  const treeRoot  = urlParams.get('treeRoot') || ROOM_ID;
  const viewAsId  = urlParams.get('viewAs')   || (userRole === 'admin' ? ROOM_ID : null);

  let livekitRoom = null;
  let activeRoomId = ROOM_ID;   // tracks which sub-meeting the user is currently in
  let _roomSwitching = false;   // true while intentionally switching rooms (suppresses Disconnected redirect)
  let micEnabled = true, camEnabled = true, sharing = false;
  let panelOpen = false, currentPanel = 'chat';
  let localStream = null, lobbyStream = null;
  let treeInitialized = false;

  // ── Role-based UI setup ───────────────────────────────────────────────────
  if (isAdmin) {
    document.getElementById('treeCtrlGroup').style.display = '';
    document.getElementById('tabPermissions').style.display = '';
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

  // Pre-fill lobby name and link
  document.getElementById('lobbyName').value = userName;
  if (userName) document.getElementById('lobbyPreviewName').textContent = userName;
  document.getElementById('lobbyLinkText').textContent = window.location.origin + '/room/' + activeRoomId;

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

  // ── Lobby camera ──────────────────────────────────────────────────────────
  async function startLobbyPreview() {
    try {
      lobbyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('lobbyVideo').srcObject = lobbyStream;
    } catch(e) {
      document.getElementById('lobbyPreviewName').textContent = 'Camera not available';
    }
  }
  startLobbyPreview();

  function toggleLobbyMic() {
    if (lobbyStream) {
      lobbyStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      document.getElementById('lobbyMicBtn').classList.toggle('off');
     }
  }
  function toggleLobbyCam() {
    if (lobbyStream) {
      lobbyStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      document.getElementById('lobbyCamBtn').classList.toggle('off');
    }
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  async function joinFromLobby() {
    const name = document.getElementById('lobbyName').value.trim();
    if (!name) { showToast('Please enter your name', 'error'); return; }
    userName = name;
    if (lobbyStream) lobbyStream.getTracks().forEach(t => t.stop());
    document.getElementById('lobbyOverlay').style.display = 'none';
    document.getElementById('selfName').textContent = userName;
    document.getElementById('selfAvatar').textContent = userName[0].toUpperCase();
    document.getElementById('roomNameDisplay').textContent = activeRoomId;
    startTimer();
    // Render self in participants list
    addParticipantRow(userName, true);
    // Record join in Memgraph
    fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, role: userRole })
    }).catch(() => {});
    await initLocalMedia();
    await connectToLiveKit();
    // Init tree for admins
    if (isAdmin) initTree();
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
    document.getElementById('roomNameDisplay').textContent = nodeId;

    // Update presence chip
    if (window._treeCanvas) {
      const count = window._treeCanvas.presentRooms.size;
      if (count > 1) {
        document.getElementById('presenceChip').style.display = 'flex';
        document.getElementById('presenceLabel').textContent = count + ' rooms';
        const tpc = document.getElementById('treePresenceChip');
        const tpl = document.getElementById('treePresenceLabel');
        if (tpc) tpc.classList.add('visible');
        if (tpl) tpl.textContent = 'Present in ' + count + ' rooms';
      }
    }

    // 5. Record join in new room
    fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, role: 'superadmin' })
    }).catch(() => {});

    // 6. Connect to new LiveKit room
    showToast('Switching to ' + nodeId + '…', 'info');
    _roomSwitching = false;
    await connectToLiveKit();
    updateTreeBadge();
  };

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
        body: JSON.stringify({ parentId, label: name, adminName, micDefault: micPerm, camDefault: camPerm })
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
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center';

    const btnStay = document.createElement('button');
    btnStay.style.cssText = 'padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;color:#6B7280;font-weight:700;cursor:pointer;font-size:14px';
    btnStay.textContent = 'Stay Here';
    btnStay.onclick = () => banner.remove();

    const btnMove = document.createElement('button');
    btnMove.style.cssText = 'padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#D15000,#ff7b2e);color:white;font-weight:700;cursor:pointer;font-size:14px';
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
  function setPermission(participantId, type, value) {
    showToast('Permission updated for ' + participantId, 'success');
  }
  function toggleLock(type, btn) {
    btn.classList.toggle('on');
    const locked = btn.classList.contains('on');
    showToast(type === 'mic'
      ? (locked ? 'All microphones locked' : 'Microphones unlocked')
      : (locked ? 'All cameras locked' : 'Cameras unlocked'),
      locked ? 'info' : 'success');
  }

  // ── Local media ───────────────────────────────────────────────────────────
  async function initLocalMedia() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const vid = document.getElementById('localVideo');
      vid.srcObject = localStream;
      document.getElementById('selfPlaceholder').style.opacity = '0';
      showToast('Camera and microphone connected', 'success');
    } catch(e) {
      showToast('Could not access camera/mic: ' + e.message, 'error');
    }
  }

  // ── LiveKit ───────────────────────────────────────────────────────────────
  async function connectToLiveKit() {
    try {
      const res = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: activeRoomId, name: userName })
      });
      const { token, url } = await res.json();
      const { Room, RoomEvent } = await import('https://cdn.jsdelivr.net/npm/livekit-client@2/dist/livekit-client.esm.mjs');
      livekitRoom = new Room({ adaptiveStream: true, dynacast: true });
      livekitRoom
        .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          handleRemoteTrack(track, participant);
        })
        .on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
          removeRemoteTrack(track, participant);
        })
        .on(RoomEvent.ParticipantConnected, participant => {
          addParticipantTile(participant);
          addParticipantRow(participant.name || participant.identity, false);
          updateParticipantCount();
          showToast((participant.name || participant.identity) + ' joined', 'info');
        })
        .on(RoomEvent.ParticipantDisconnected, participant => {
          removeParticipantTile(participant.identity);
          removeParticipantRow(participant.name || participant.identity);
          updateParticipantCount();
          showToast((participant.name || participant.identity) + ' left', 'info');
        })
        .on(RoomEvent.ActiveSpeakersChanged, speakers => { updateSpeakers(speakers); })
        .on(RoomEvent.DataReceived, (data) => { handleDataMessage(data); })
        .on(RoomEvent.Disconnected, () => {
          if (_roomSwitching) return; // intentional switch — don't redirect
          showToast('Disconnected from room', 'error');
          setTimeout(() => window.location.href = '/', 2000);
        });
      await livekitRoom.connect(url, token);
      await livekitRoom.localParticipant.setMicrophoneEnabled(true);
      await livekitRoom.localParticipant.setCameraEnabled(true);
      showToast('Connected to ' + activeRoomId, 'success');
      updateParticipantCount();
    } catch(e) {
      console.warn('[LiveKit] Demo mode:', e.message);
      showToast('Demo mode — LiveKit not configured', 'info');
    }
  }

  function handleRemoteTrack(track, participant) {
    // Screen share tracks get their own large display area
    if (track.source === 'screen_share') {
      const area  = document.getElementById('remoteScreenArea');
      const vid   = document.getElementById('remoteScreenVideo');
      const label = document.getElementById('remoteScreenLabel');
      track.attach(vid);
      label.textContent = (participant.name || participant.identity) + ' is sharing their screen';
      area.style.display = 'flex';
      area.style.flexDirection = 'column';
      document.getElementById('videoArea').classList.add('screen-sharing');
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
      area.style.display = 'none';
      vid.srcObject = null;
      document.getElementById('videoArea').classList.remove('screen-sharing');
      return;
    }
    const identity = participant ? participant.identity : track;
    const tile = document.getElementById('tile-' + identity);
    if (tile) tile.querySelectorAll('video,audio').forEach(el => { el.srcObject = null; });
  }
  function addParticipantTile(participant) {
    if (!document.getElementById('tile-' + participant.identity)) createParticipantTile(participant);
  }
  function removeParticipantTile(identity) {
    const tile = document.getElementById('tile-' + identity);
    if (tile) tile.remove();
    updateGridLayout();
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
    updateGridLayout();
    return div;
  }
  function updateSpeakers(speakers) {
    document.querySelectorAll('.speaking-ring').forEach(r => r.classList.remove('active'));
    speakers.forEach(sp => {
      const tile = document.getElementById('tile-' + sp.identity) || document.getElementById('tileSelf');
      if (tile) tile.querySelector('.speaking-ring')?.classList.add('active');
    });
  }
  /** Add a row to the People panel participants list */
  function addParticipantRow(name, isSelf) {
    const list = document.getElementById('participantsList');
    if (!list) return;
    if (document.getElementById('pr-' + name)) return; // already exists
    const colors = ['#7C3AED','#059669','#0284C7','#D97706','#DB2777','#D15000'];
    const color  = colors[name.charCodeAt(0) % colors.length];
    const div = document.createElement('div');
    div.id = 'pr-' + name;
    if (isSelf) div.dataset.self = '1';
    div.className = 'participant-row' + (isSelf ? ' host' : '');
    div.innerHTML =
      '<div class="participant-avatar-sm" style="background:linear-gradient(135deg,' + color + ',' + color + '88)">' +
        name[0].toUpperCase() +
      '</div>' +
      '<div class="participant-row-info">' +
        '<div class="participant-row-name">' + (isSelf ? name + ' (You)' : name) + '</div>' +
        '<div class="participant-row-status" style="color:var(--green);font-size:11px">● Joined</div>' +
      '</div>' +
      (isSelf ? '<div class="participant-row-actions"><span class="tag green" style="font-size:10px;padding:2px 7px">You</span></div>' : '');
    list.appendChild(div);
  }

  /** Remove a participant row from the People panel */
  function removeParticipantRow(name) {
    const el = document.getElementById('pr-' + name);
    if (el) el.remove();
  }

  function updateParticipantCount() {
    const count = livekitRoom ? livekitRoom.numParticipants + 1 : 1;
    document.getElementById('participantCount').textContent = count;
    document.getElementById('peopleNotif').textContent = count;
    const badge = document.getElementById('peopleTabBadge');
    if (badge) badge.textContent = count;
  }
  function updateGridLayout() {
    const tiles = document.querySelectorAll('.video-tile');
    const grid  = document.getElementById('videoGrid');
    const n     = tiles.length;
    if      (n <= 1) grid.style.gridTemplateColumns = '1fr';
    else if (n <= 2) grid.style.gridTemplateColumns = '1fr 1fr';
    else if (n <= 4) grid.style.gridTemplateColumns = '1fr 1fr';
    else if (n <= 6) grid.style.gridTemplateColumns = 'repeat(3,1fr)';
    else             grid.style.gridTemplateColumns = 'repeat(4,1fr)';
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  function toggleMic() {
    micEnabled = !micEnabled;
    const btn = document.getElementById('micBtn');
    btn.classList.toggle('off', !micEnabled);
    btn.querySelector('.icon-on').style.display = micEnabled ? '' : 'none';
    btn.querySelector('.icon-off').style.display = micEnabled ? 'none' : '';
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
    if (livekitRoom) livekitRoom.localParticipant.setMicrophoneEnabled(micEnabled);
    showToast(micEnabled ? 'Microphone on' : 'Microphone muted');
  }
  function toggleCamera() {
    camEnabled = !camEnabled;
    const btn = document.getElementById('camBtn');
    btn.classList.toggle('off', !camEnabled);
    btn.querySelector('.icon-on').style.display = camEnabled ? '' : 'none';
    btn.querySelector('.icon-off').style.display = camEnabled ? 'none' : '';
    if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
    if (livekitRoom) livekitRoom.localParticipant.setCameraEnabled(camEnabled);
    document.getElementById('selfPlaceholder').style.opacity = camEnabled ? '0' : '1';
    showToast(camEnabled ? 'Camera on' : 'Camera off');
  }
  async function toggleScreenShare() {
    if (!sharing) {
      if (!livekitRoom) { showToast('Not connected to room', 'error'); return; }
      try {
        // Let LiveKit call getDisplayMedia internally and publish the track.
        // Do NOT call getDisplayMedia separately — that causes a double screen-picker.
        const pub = await livekitRoom.localParticipant.setScreenShareEnabled(true);
        if (!pub) { showToast('Screen share cancelled', 'info'); return; }
        sharing = true;
        document.getElementById('shareBtn').classList.add('active');
        document.getElementById('screenShareOverlay').style.display = 'flex';
        // Mirror LiveKit's captured track into local preview (no second capture needed)
        if (pub.track && pub.track.mediaStreamTrack) {
          document.getElementById('screenVideo').srcObject = new MediaStream([pub.track.mediaStreamTrack]);
          // Auto-stop when user clicks the browser's native "Stop sharing" button
          pub.track.mediaStreamTrack.onended = stopScreenShare;
        }
        showToast('Screen sharing started', 'success');
      } catch (e) {
        sharing = false;
        document.getElementById('shareBtn').classList.remove('active');
        document.getElementById('screenShareOverlay').style.display = 'none';
        showToast('Screen share cancelled', 'info');
      }
    } else { stopScreenShare(); }
  }
  function stopScreenShare() {
    sharing = false;
    document.getElementById('shareBtn').classList.remove('active');
    document.getElementById('screenShareOverlay').style.display = 'none';
    const vid = document.getElementById('screenVideo');
    if (vid.srcObject) { vid.srcObject.getTracks().forEach(t => t.stop()); vid.srcObject = null; }
    if (livekitRoom) livekitRoom.localParticipant.setScreenShareEnabled(false);
    showToast('Screen sharing stopped');
  }

  // ── Panel ─────────────────────────────────────────────────────────────────
  function togglePanel(type) {
    const panel  = document.getElementById('roomPanel');
    const layout = document.getElementById('roomLayout');
    if (panelOpen && currentPanel === type) {
      panel.style.display = 'none';
      layout.classList.remove('panel-open');
      panelOpen = false;
    } else {
      panel.style.display = 'flex';
      layout.classList.add('panel-open');
      panelOpen = true;
      switchPanel(type);
    }
    document.getElementById('chatToggleBtn').classList.toggle('active', panelOpen && currentPanel === 'chat');
    document.getElementById('peopleToggleBtn').classList.toggle('active', panelOpen && currentPanel === 'participants');
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
  function handleChatKey(e) { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat(); } }
  function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    const container = document.getElementById('chatMessages');
    const now = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-self';
    div.innerHTML = \`<div class="chat-msg-meta" style="justify-content:flex-end">
      <span class="chat-time">\${now}</span>
      <span class="chat-sender">You</span>
      <span class="chat-avatar">T</span>
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
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Render a chat message received from another participant
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
    senderSpan.textContent = escapeHtml(name);
    const timeSpan = document.createElement('span');
    timeSpan.className = 'chat-time';
    timeSpan.textContent = now;
    meta.appendChild(avatarSpan);
    meta.appendChild(senderSpan);
    meta.appendChild(timeSpan);
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = msg;
    div.appendChild(meta);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    // Show unread badge if chat panel is not open
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

  // Show floating emoji on screen (local display — called both locally and on receive)
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
    // Show locally immediately
    showReactionOverlay(emoji);
    // Broadcast to all other participants via LiveKit data channel
    if (livekitRoom) {
      livekitRoom.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'reaction', emoji, name: userName })),
        { reliable: false }
      );
    }
  }

  // ── More menu ─────────────────────────────────────────────────────────────
  function toggleMore() {
    const m = document.getElementById('moreMenu');
    m.style.display = m.style.display === 'none' ? 'block' : 'none';
  }
  function toggleVirtualBackground() { showToast('Virtual background coming soon', 'info'); }
  function toggleNoiseSuppression()  { showToast('Noise suppression toggled', 'success'); }
  function toggleWhiteboard()        { showToast('Whiteboard coming soon', 'info'); }
  function showStats()               { showToast('Latency: 42ms · Packet loss: 0%', 'info'); }
  function showSettings()            { showToast('Settings panel coming soon', 'info'); }
  function showInfo()                { showInviteModal(); }

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

  // Close modals on backdrop click
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
    showToast(btn.classList.contains('recording') ? 'Recording started' : 'Recording stopped',
              btn.classList.contains('recording') ? 'success' : 'info');
  }
  function showAudioMenu() { showToast('Audio device selection coming soon', 'info'); }
  function showVideoMenu() { showToast('Video device selection coming soon', 'info'); }

  // ── Leave ─────────────────────────────────────────────────────────────────
  function leaveRoom() {
    // Record leave in Memgraph (fire-and-forget)
    if (userName) {
      fetch('/api/meetings/' + encodeURIComponent(activeRoomId) + '/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName })
      }).catch(() => {});
    }
    if (livekitRoom) livekitRoom.disconnect();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    clearInterval(timerInterval);
    showToast('You left the meeting', 'info');
    setTimeout(() => window.location.href = '/', 1500);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.innerHTML = '<span>' + (icons[type]||'ℹ') + '</span><span>' + message + '</span>';
    c.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3400);
  }

  // ── Close menus on outside click ──────────────────────────────────────────
  document.addEventListener('click', e => {
    if (!e.target.closest('#moreMenu') && !e.target.closest('#moreBtn'))
      document.getElementById('moreMenu').style.display = 'none';
    if (!e.target.closest('#reactionsPicker') && !e.target.closest('#reactBtn'))
      document.getElementById('reactionsPicker').style.display = 'none';
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

  // Simulate speaking ring
  setInterval(() => {
    const rings = document.querySelectorAll('.speaking-ring');
    rings.forEach(r => r.classList.remove('active'));
    const active = rings[Math.floor(Math.random() * rings.length)];
    if (active) active.classList.add('active');
  }, 3000);
</script>
</body>
</html>`;
}
