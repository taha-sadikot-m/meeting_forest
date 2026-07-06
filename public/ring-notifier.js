/**
 * ring-notifier.js — included on all authenticated pages.
 * Polls /api/rings/incoming every 3 s and shows a full-screen ring overlay
 * when an incoming ring is detected.
 */
(function () {
  'use strict';

  var POLL_MS    = 3000;
  var RING_MS    = 2 * 60 * 1000; // 2 minutes
  var pollTimer  = null;
  var overlayEl  = null;
  var countdownTimer = null;
  var currentRingId  = null;
  var ringPopupWindow = null;
  var popupMonitorTimer = null;
  var ringAudio      = null;
  var RING_TONE_URI  = null;

  // ── Ring sound (HTML5 Audio + gesture unlock) ──────────────────────────────
  function buildRingToneDataUri() {
    var sampleRate = 11025;
    var duration = 0.8;
    var numSamples = Math.floor(sampleRate * duration);
    var dataSize = numSamples * 2;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);
    function writeStr(offset, str) {
      for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    for (var i = 0; i < numSamples; i++) {
      var t = i / sampleRate;
      var freq = (Math.floor(t * 5) % 2 === 0) ? 440 : 480;
      var sample = Math.sin(2 * Math.PI * freq * t) * 0.35;
      var envelope = 1;
      if (i < sampleRate * 0.05) envelope = i / (sampleRate * 0.05);
      if (i > numSamples - sampleRate * 0.08) envelope = (numSamples - i) / (sampleRate * 0.08);
      view.setInt16(44 + i * 2, sample * envelope * 32767, true);
    }
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j]);
    return 'data:audio/wav;base64,' + btoa(binary);
  }

  RING_TONE_URI = buildRingToneDataUri();

  function getRingAudio(loop) {
    if (!ringAudio) {
      ringAudio = new Audio(RING_TONE_URI);
      ringAudio.preload = 'auto';
      ringAudio.volume = 0.7;
    }
    ringAudio.loop = !!loop;
    return ringAudio;
  }

  function showTapPrompt() {
    var el = document.getElementById('ringTapPrompt');
    if (el) el.style.display = '';
    var banner = document.getElementById('ringSoundPrompt');
    if (banner) banner.style.display = '';
  }

  function hideTapPrompt() {
    var el = document.getElementById('ringTapPrompt');
    if (el) el.style.display = 'none';
    var banner = document.getElementById('ringSoundPrompt');
    if (banner) banner.style.display = 'none';
  }

  function startRingSound() {
    var audio = getRingAudio(true);
    audio.currentTime = 0;
    var playAttempt = audio.play();
    if (playAttempt && playAttempt.then) {
      playAttempt.then(function () {
        console.log('[ring-notifier] ring sound playing');
        hideTapPrompt();
      }).catch(function () {
        console.warn('[ring-notifier] ring sound blocked — click page to enable');
        showTapPrompt();
      });
    }
  }

  function stopRingSound() {
    if (ringAudio) {
      ringAudio.pause();
      ringAudio.currentTime = 0;
      ringAudio.loop = false;
    }
    hideTapPrompt();
  }

  function unlockAndRetryRing() {
    if (currentRingId) startRingSound();
  }

  function playOutgoingRingOnce() {
    var audio = new Audio(RING_TONE_URI);
    audio.loop = false;
    audio.volume = 0.6;
    audio.play().then(function () {
      console.log('[ring-notifier] outgoing ring tone');
    }).catch(function () {
      console.warn('[ring-notifier] outgoing ring tone blocked');
    });
  }

  window.playMFOutgoingRing = playOutgoingRingOnce;

  document.addEventListener('pointerdown', unlockAndRetryRing);
  document.addEventListener('keydown', unlockAndRetryRing);

  // ── Inject styles ──────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#ringOverlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);',
    'backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);',
    'display:flex;align-items:center;justify-content:center;',
    'animation:ringFadeIn .35s ease;}',

    '@keyframes ringFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',

    '.ring-card{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);',
    'border-radius:28px;padding:44px 40px;width:min(420px,92vw);text-align:center;',
    'box-shadow:0 32px 80px rgba(0,0,0,.6);}',

    /* Pulsing avatar */
    '.ring-avatar-wrap{position:relative;width:100px;height:100px;margin:0 auto 28px;}',
    '.ring-pulse{position:absolute;inset:-12px;border-radius:50%;',
    'border:3px solid rgba(209,80,0,.5);animation:ringPulse 1.4s ease-in-out infinite;}',
    '.ring-pulse2{position:absolute;inset:-24px;border-radius:50%;',
    'border:2px solid rgba(209,80,0,.25);animation:ringPulse 1.4s ease-in-out .35s infinite;}',
    '@keyframes ringPulse{0%{transform:scale(.9);opacity:.6}70%{transform:scale(1.1);opacity:0}100%{opacity:0}}',

    '.ring-avatar{width:100px;height:100px;border-radius:50%;',
    'background:linear-gradient(135deg,#D15000,#ff7b2e);',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:38px;font-weight:800;color:#fff;position:relative;z-index:1;',
    'box-shadow:0 8px 32px rgba(209,80,0,.4);}',

    /* Text */
    '.ring-from-label{font-size:12px;font-weight:700;color:rgba(255,255,255,.4);',
    'text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}',
    '.ring-from-name{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;}',
    '.ring-from-email{font-size:13px;color:rgba(255,255,255,.45);margin-bottom:20px;}',

    '.ring-meeting-chip{display:inline-flex;align-items:center;gap:8px;',
    'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);',
    'border-radius:12px;padding:8px 16px;margin-bottom:8px;}',
    '.ring-meeting-chip svg{flex-shrink:0;}',
    '.ring-meeting-name{font-size:13px;font-weight:700;color:rgba(255,255,255,.8);}',
    '.ring-meeting-id{font-size:11px;color:rgba(255,255,255,.35);margin-top:1px;}',

    '.ring-countdown{font-size:13px;color:rgba(255,255,255,.35);margin:16px 0 28px;font-variant-numeric:tabular-nums;}',
    '.ring-countdown span{color:rgba(255,255,255,.6);font-weight:700;}',

    /* Buttons */
    '.ring-actions{display:flex;gap:12px;}',
    '.ring-btn-accept{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;',
    'padding:14px;border-radius:16px;border:none;cursor:pointer;font-size:14px;font-weight:700;',
    'background:linear-gradient(135deg,#059669,#10B981);color:#fff;',
    'box-shadow:0 4px 20px rgba(16,185,129,.35);transition:all .2s;}',
    '.ring-btn-accept:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(16,185,129,.5);}',
    '.ring-btn-decline{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;',
    'padding:14px;border-radius:16px;border:none;cursor:pointer;font-size:14px;font-weight:700;',
    'background:rgba(239,68,68,.15);color:#EF4444;border:1.5px solid rgba(239,68,68,.3);transition:all .2s;}',
    '.ring-btn-decline:hover{background:rgba(239,68,68,.25);}',

    '#ringSoundPrompt{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99998;',
    'display:none;padding:10px 18px;border-radius:12px;font-size:13px;font-weight:600;',
    'background:rgba(209,80,0,.9);color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.4);',
    'pointer-events:none;white-space:nowrap;}',
  ].join('');
  document.head.appendChild(style);

  var soundPromptEl = document.createElement('div');
  soundPromptEl.id = 'ringSoundPrompt';
  soundPromptEl.style.display = 'none';
  soundPromptEl.textContent = 'Click anywhere to enable ring tone';
  document.body.appendChild(soundPromptEl);

  // ── Build overlay DOM (once) ───────────────────────────────────────────────
  function buildOverlay() {
    if (overlayEl) return;
    overlayEl = document.createElement('div');
    overlayEl.id = 'ringOverlay';
    overlayEl.style.display = 'none';
    overlayEl.innerHTML = [
      '<div class="ring-card">',
        '<div class="ring-avatar-wrap">',
          '<div class="ring-pulse"></div>',
          '<div class="ring-pulse2"></div>',
          '<div class="ring-avatar" id="ringAvatarChar">?</div>',
        '</div>',
        '<div class="ring-from-label">Incoming call</div>',
        '<div class="ring-from-name" id="ringFromName">Someone</div>',
        '<div class="ring-from-email" id="ringFromEmail"></div>',
        '<div style="display:flex;justify-content:center">',
          '<div class="ring-meeting-chip">',
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2">',
              '<path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>',
            '</svg>',
            '<div>',
              '<div class="ring-meeting-name" id="ringMeetingLabel">Meeting</div>',
              '<div class="ring-meeting-id" id="ringMeetingId"></div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="ring-countdown">Ringing… <span id="ringTimer">2:00</span> remaining</div>',
        '<div id="ringTapPrompt" style="display:none;font-size:12px;color:rgba(255,255,255,.55);margin-bottom:12px">Tap anywhere to enable ring tone</div>',
        '<div class="ring-actions">',
          '<button class="ring-btn-accept" id="ringAcceptBtn">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">',
              '<path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>',
            '</svg>',
            'Join Meeting',
          '</button>',
          '<button class="ring-btn-decline" id="ringDeclineBtn">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">',
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
            '</svg>',
            'Decline',
          '</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlayEl);

    overlayEl.addEventListener('pointerdown', unlockAndRetryRing);
    document.getElementById('ringAcceptBtn').addEventListener('click', acceptRing);
    document.getElementById('ringDeclineBtn').addEventListener('click', declineRing);
  }

  // ── Show / hide ring UI ────────────────────────────────────────────────────
  function openRingPopup(ring) {
    var w = 400, h = 520;
    var left = Math.max(0, (screen.availWidth || screen.width) - w - 24);
    var top = 24;
    var qs = [
      'ringId=' + encodeURIComponent(ring.ringId),
      'fromName=' + encodeURIComponent(ring.fromName || ''),
      'fromEmail=' + encodeURIComponent(ring.fromEmail || ''),
      'meetingId=' + encodeURIComponent(ring.meetingId || ''),
      'meetingLabel=' + encodeURIComponent(ring.meetingLabel || ring.meetingId || ''),
      'startedAt=' + encodeURIComponent(String(ring.startedAt || Date.now()))
    ].join('&');
    try {
      return window.open(
        '/public/ring-popup.html?' + qs,
        'mf-ring-' + ring.ringId,
        'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top +
        ',resizable=no,scrollbars=no,menubar=no,toolbar=no,location=no,status=no'
      );
    } catch (e) {
      return null;
    }
  }

  function rejectRingOnServer(ringId) {
    if (!ringId) return;
    fetch('/api/rings/' + encodeURIComponent(ringId) + '/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    }).catch(function () {});
  }

  function clearPopupMonitorState() {
    clearInterval(popupMonitorTimer);
    popupMonitorTimer = null;
    ringPopupWindow = null;
    currentRingId = null;
    stopRingSound();
  }

  function monitorPopupClosed() {
    clearInterval(popupMonitorTimer);
    popupMonitorTimer = setInterval(function () {
      if (ringPopupWindow && !ringPopupWindow.closed) {
        try {
          if (ringPopupWindow.location.pathname.indexOf('/room/') === 0) {
            console.log('[ring-notifier] popup accepted, joined room');
            clearPopupMonitorState();
          }
        } catch (e) {}
        return;
      }
      var ringId = currentRingId;
      if (ringId) {
        console.log('[ring-notifier] popup closed, rejecting ring');
        rejectRingOnServer(ringId);
      }
      dismissRing();
    }, 500);
  }

  function populateRingUI(ring) {
    var initial = (ring.fromName || ring.fromEmail || '?')[0].toUpperCase();
    document.getElementById('ringAvatarChar').textContent  = initial;
    document.getElementById('ringFromName').textContent    = ring.fromName || ring.fromEmail;
    document.getElementById('ringFromEmail').textContent   = ring.fromEmail;
    document.getElementById('ringMeetingLabel').textContent = ring.meetingLabel || ring.meetingId;
    document.getElementById('ringMeetingId').textContent   = ring.meetingId;
  }

  function startRingCountdown(ring) {
    var remaining = Math.max(0, RING_MS - (Date.now() - ring.startedAt));
    updateTimer(remaining);
    clearInterval(countdownTimer);
    countdownTimer = setInterval(function () {
      remaining -= 1000;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        dismissRing();
        return;
      }
      updateTimer(remaining);
    }, 1000);
  }

  function showRingOverlay(ring) {
    buildOverlay();
    populateRingUI(ring);
    startRingCountdown(ring);
    overlayEl.style.display = 'flex';
    startRingSound();
  }

  function showRing(ring) {
    currentRingId = ring.ringId;
    var popup = openRingPopup(ring);
    if (popup && !popup.closed) {
      ringPopupWindow = popup;
      console.log('[ring-notifier] opened ring popup');
      monitorPopupClosed();
      startRingSound();
      return;
    }
    console.log('[ring-notifier] popup blocked, using full-screen overlay');
    showRingOverlay(ring);
  }

  function updateTimer(ms) {
    var s   = Math.ceil(ms / 1000);
    var min = Math.floor(s / 60);
    var sec = String(s % 60).padStart(2, '0');
    var el  = document.getElementById('ringTimer');
    if (el) el.textContent = min + ':' + sec;
  }

  function dismissRing() {
    clearInterval(countdownTimer);
    clearInterval(popupMonitorTimer);
    popupMonitorTimer = null;
    stopRingSound();
    if (ringPopupWindow && !ringPopupWindow.closed) {
      try { ringPopupWindow.close(); } catch (e) {}
    }
    ringPopupWindow = null;
    currentRingId = null;
    if (overlayEl) overlayEl.style.display = 'none';
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function acceptRing() {
    if (!currentRingId) return;
    var ringId = currentRingId;
    dismissRing();
    // Tell server
    fetch('/api/rings/' + encodeURIComponent(ringId) + '/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    }).catch(function () {});
    // Navigate to room with mic+cam muted
    var meetingId = document.getElementById('ringMeetingId') ?
      document.getElementById('ringMeetingId').textContent : '';
    if (meetingId) {
      window.location.href = '/room/' + encodeURIComponent(meetingId) + '?joined_muted=true';
    }
  }

  function declineRing() {
    if (!currentRingId) return;
    var ringId = currentRingId;
    dismissRing();
    fetch('/api/rings/' + encodeURIComponent(ringId) + '/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    }).catch(function () {});
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  function poll() {
    // Don't poll if already showing a ring
    if (currentRingId) return;
    fetch('/api/rings/incoming')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ring) showRing(data.ring);
      })
      .catch(function () {});
  }

  // Start polling after a short delay (let page settle)
  setTimeout(function () {
    poll();
    pollTimer = setInterval(poll, POLL_MS);
  }, 1500);

})();
