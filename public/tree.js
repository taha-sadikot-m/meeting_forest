// tree.js — MeetingTreeCanvas
// n8n-style node canvas for the hierarchical meeting tree.
// Exposes: window.MeetingTreeCanvas, window._treeCanvas, window._initTreeCanvas()

(function () {
  'use strict';

  const NODE_W = 240;
  const NODE_H = 110;
  const H_GAP  = 60;
  const V_GAP  = 84;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── MeetingTreeCanvas ─────────────────────────────────────────────────────

  class MeetingTreeCanvas {
    constructor(containerId) {
      this.containerId  = containerId;
      this.container    = document.getElementById(containerId);
      this.tx = 0; this.ty = 0; this.scale = 1;
      this.nodes        = new Map();   // id → {id, label, adminName, participants, parentId, _x, _y}
      this.currentRoomId = null;
      this.presentRooms  = new Set();  // rooms super-admin is simultaneously present in
      this.role          = 'participant';
      this.viewAsNodeId  = null;       // sub-admin's own node
      this._wrap   = null;
      this._xform  = null;
      this._svg    = null;
      this._nLayer = null;
      this._init();
    }

    // ── DOM setup ────────────────────────────────────────────────────────────

    _init() {
      const cid = this.containerId;
      this.container.innerHTML = `
        <div class="tc-wrap" id="${cid}Wrap">
          <div class="tc-xform" id="${cid}Xform">
            <!-- SVG spans a huge virtual area so paths never clip -->
            <svg class="tc-svg" id="${cid}Svg"
                 viewBox="-5000 -5000 10000 10000"
                 xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="tcArrow${cid}" markerWidth="8" markerHeight="6"
                        refX="7" refY="3" orient="auto">
                  <polygon points="0 0,8 3,0 6" fill="#4B5563"/>
                </marker>
              </defs>
            </svg>
            <div class="tc-nodes" id="${cid}Nodes"></div>
          </div>
        </div>`;

      this._wrap   = document.getElementById(cid + 'Wrap');
      this._xform  = document.getElementById(cid + 'Xform');
      this._svg    = document.getElementById(cid + 'Svg');
      this._nLayer = document.getElementById(cid + 'Nodes');
      this._bindPanZoom();
    }

    _bindPanZoom() {
      let drag = false, sx, sy, stx, sty;
      this._wrap.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.target.closest('.tc-node')) return;
        drag = true;
        sx = e.clientX; sy = e.clientY;
        stx = this.tx;  sty = this.ty;
        this._wrap.style.cursor = 'grabbing';
      });
      window.addEventListener('mousemove', e => {
        if (!drag) return;
        this.tx = stx + (e.clientX - sx);
        this.ty = sty + (e.clientY - sy);
        this._applyTransform();
      });
      window.addEventListener('mouseup', () => {
        drag = false;
        this._wrap.style.cursor = '';
      });
      this._wrap.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = this._wrap.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const f  = e.deltaY > 0 ? 0.88 : 1.14;
        const ns = Math.max(0.12, Math.min(3, this.scale * f));
        this.tx  = mx - (mx - this.tx) * ns / this.scale;
        this.ty  = my - (my - this.ty) * ns / this.scale;
        this.scale = ns;
        this._applyTransform();
      }, { passive: false });
    }

    _applyTransform() {
      this._xform.style.transform =
        `translate(${this.tx}px,${this.ty}px) scale(${this.scale})`;
      this._xform.style.transformOrigin = '0 0';
    }

    // ── Public API ────────────────────────────────────────────────────────────

    setRole(role, viewAsNodeId) {
      this.role = role;
      this.viewAsNodeId = viewAsNodeId || null;
    }

    addNode(node) {
      this.nodes.set(node.id, { participants: 0, status: 'active', ...node });
      this._layout();
      this._render();
    }

    updateNode(id, patch) {
      if (this.nodes.has(id)) {
        Object.assign(this.nodes.get(id), patch);
        this._render();
      }
    }

    removeNode(id) {
      this.nodes.delete(id);
      // cascade-delete children
      for (const [cid, n] of this.nodes) {
        if (n.parentId === id) this.removeNode(cid);
      }
      this._layout();
      this._render();
    }

    setCurrentRoom(id) {
      this.currentRoomId = id;
      this._render();
    }

    /** Super-admin enters a node — stays present in all previous rooms too */
    enterRoom(id) {
      if (this.role === 'superadmin') this.presentRooms.add(id);
      this.currentRoomId = id;
      this._render();
      if (typeof window._onEnterRoom === 'function') window._onEnterRoom(id);
    }

    /** Open sub-meeting creation modal anchored to parentId */
    openCreateModal(parentId) {
      const m = document.getElementById('subMeetingModal');
      if (!m) return;
      document.getElementById('smmParentId').value = parentId;
      m.classList.add('open');
    }

    zoomIn()  { this.scale = Math.min(3, this.scale * 1.2);   this._applyTransform(); }
    zoomOut() { this.scale = Math.max(0.12, this.scale / 1.2); this._applyTransform(); }

    fitView() {
      if (!this.nodes.size) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [, n] of this.nodes) {
        if (n._x == null) continue;
        minX = Math.min(minX, n._x - NODE_W / 2);
        minY = Math.min(minY, n._y);
        maxX = Math.max(maxX, n._x + NODE_W / 2);
        maxY = Math.max(maxY, n._y + NODE_H);
      }
      if (minX === Infinity) return;
      const W = this._wrap.clientWidth  || 800;
      const H = this._wrap.clientHeight || 500;
      const pad = 80;
      this.scale = Math.min(1, W / (maxX - minX + pad), H / (maxY - minY + pad));
      this.tx = W / 2 - (minX + (maxX - minX) / 2) * this.scale;
      this.ty = 40 - minY * this.scale;
      this._applyTransform();
    }

    /** Load tree from server; falls back to demo data on error */
    async loadTree(rootId, viewAsNodeId) {
      try {
        const url = '/api/tree/' + encodeURIComponent(rootId) +
                    (viewAsNodeId ? '?viewAs=' + encodeURIComponent(viewAsNodeId) : '');
        const res = await fetch(url);
        if (!res.ok) throw new Error('status ' + res.status);
        const data = await res.json();
        this.nodes.clear();
        (data.nodes || []).forEach(n => this.nodes.set(n.id, n));
        // Re-affirm current room markers (nodes.clear() doesn't reset these,
        // but be explicit so the "Here" tag always shows correctly)
        this.presentRooms.add(rootId);
        if (!this.currentRoomId) this.currentRoomId = rootId;
        if (viewAsNodeId) this.viewAsNodeId = viewAsNodeId;
        this._layout();
        this._render();
        // Use a short delay so the overlay has time to be visible before
        // fitView reads clientWidth/clientHeight
        setTimeout(() => this.fitView(), 80);
      } catch (e) {
        console.warn('[tree] server unavailable, showing demo tree:', e.message);
        this._demoTree(rootId);
      }
    }

    _demoTree(rootId) {
      this.nodes.clear();
      this.addNode({ id: rootId, label: rootId, adminName: window._currentUserName || 'Host', participants: 0 });
      this.presentRooms.add(rootId);
      this.setCurrentRoom(rootId);
      setTimeout(() => this.fitView(), 50);
    }

    // ── Layout ────────────────────────────────────────────────────────────────

    _visibleSet() {
      if (this.role !== 'superadmin' && this.viewAsNodeId) {
        return this._subtree(this.viewAsNodeId);
      }
      return new Set(this.nodes.keys());
    }

    _subtree(rootId) {
      const s = new Set();
      const walk = id => { s.add(id); this._children(id).forEach(walk); };
      walk(rootId);
      return s;
    }

    _children(id) {
      const r = [];
      for (const [cid, n] of this.nodes) if (n.parentId === id) r.push(cid);
      return r;
    }

    _findRoot() {
      for (const [id, n] of this.nodes) if (!n.parentId) return id;
      return this.nodes.keys().next().value;
    }

    _layout() {
      const vis = this._visibleSet();

      const subtreeW = id => {
        const ch = this._children(id).filter(c => vis.has(c));
        if (!ch.length) return NODE_W;
        const ws = ch.map(subtreeW);
        return Math.max(NODE_W, ws.reduce((a, b) => a + b, 0) + H_GAP * (ch.length - 1));
      };

      const place = (id, x, y) => {
        const n = this.nodes.get(id);
        if (!n) return;
        n._x = x; n._y = y;
        const ch = this._children(id).filter(c => vis.has(c));
        const ws = ch.map(subtreeW);
        const tot = ws.reduce((a, b) => a + b, 0) + H_GAP * (ch.length - 1);
        let cx = x - tot / 2;
        ch.forEach((cid, i) => {
          place(cid, cx + ws[i] / 2, y + NODE_H + V_GAP);
          cx += ws[i] + H_GAP;
        });
      };

      const startId = (this.role !== 'superadmin' && this.viewAsNodeId)
        ? this.viewAsNodeId
        : this._findRoot();
      if (startId && vis.has(startId)) place(startId, 0, 0);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    _render() {
      const vis   = this._visibleSet();
      const svgNS = 'http://www.w3.org/2000/svg';
      const cid   = this.containerId;

      // Clear edges (keep <defs>)
      while (this._svg.children.length > 1) this._svg.removeChild(this._svg.lastChild);

      // Draw bezier edges
      for (const [id, n] of this.nodes) {
        if (!vis.has(id) || !n.parentId || !vis.has(n.parentId)) continue;
        const p = this.nodes.get(n.parentId);
        if (!p || p._x == null || n._x == null) continue;
        const x1 = p._x, y1 = p._y + NODE_H, x2 = n._x, y2 = n._y;
        const cy = (y1 + y2) / 2;
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`);
        path.setAttribute('class', 'tc-edge');
        path.setAttribute('marker-end', `url(#tcArrow${cid})`);
        this._svg.appendChild(path);
      }

      // Draw node cards
      this._nLayer.innerHTML = '';
      for (const [id, n] of this.nodes) {
        if (!vis.has(id) || n._x == null) continue;

        const isRoot    = !n.parentId;
        const isCurrent = id === this.currentRoomId;
        const isPresent = this.presentRooms.has(id) && !isCurrent;
        const canEnter  = this.role === 'superadmin' && !isCurrent;
        const canAdd    = this.role === 'superadmin' ||
                          (this.role === 'admin' && id === this.viewAsNodeId);

        const cls = [
          'tc-node',
          isRoot    ? 'tc-node--root'    : '',
          isCurrent ? 'tc-node--current' : '',
          isPresent ? 'tc-node--present' : '',
        ].filter(Boolean).join(' ');

        const div = document.createElement('div');
        div.className = cls;
        div.style.cssText =
          `left:${n._x - NODE_W / 2}px;top:${n._y}px;width:${NODE_W}px;`;

        div.innerHTML = `
          <div class="tc-node-head">
            <div class="tc-dot${isCurrent ? ' tc-dot--live' : ''}"></div>
            <span class="tc-node-label" title="${esc(n.label || id)}">${esc(n.label || id)}</span>
            ${isRoot    ? '<span class="tc-tag tc-tag--root">Root</span>'       : ''}
            ${isCurrent ? '<span class="tc-tag tc-tag--here">Here</span>'       : ''}
            ${isPresent ? '<span class="tc-tag tc-tag--present">Present</span>' : ''}
          </div>
          <div class="tc-node-meta">
            <span title="Admin">👤 ${esc(n.adminName || 'Admin')}</span>
            <span title="Participants">🎙 ${n.participants || 0}</span>
          </div>
          <div class="tc-node-actions">
            ${isCurrent
              ? `<button class="tc-btn tc-btn--here" disabled>Current Room</button>`
              : canEnter
                ? `<button class="tc-btn tc-btn--enter"
                      onclick="window._treeCanvas.enterRoom('${esc(id)}')">Enter</button>`
                : ''
            }
            ${canAdd
              ? `<button class="tc-btn tc-btn--add"
                    onclick="window._treeCanvas.openCreateModal('${esc(id)}')">＋ Sub-meeting</button>`
              : ''
            }
          </div>`;

        this._nLayer.appendChild(div);
      }
    }
  }

  // ── Global exports ────────────────────────────────────────────────────────

  window.MeetingTreeCanvas = MeetingTreeCanvas;
  window._treeCanvas       = null;

  /**
   * Initialize the tree canvas.
   * @param {string} containerId  - DOM id of the container div
   * @param {string} role         - 'superadmin' | 'admin' | 'participant'
   * @param {string} currentRoom  - LiveKit room id the user is currently in
   * @param {string|null} viewAsNodeId - for sub-admins: their node id
   */
  window._initTreeCanvas = function (containerId, role, currentRoom, viewAsNodeId) {
    window._treeCanvas = new MeetingTreeCanvas(containerId);
    window._treeCanvas.setRole(role, viewAsNodeId || null);
    window._treeCanvas.presentRooms.add(currentRoom);
    window._treeCanvas.currentRoomId = currentRoom;
    window._treeCanvas.loadTree(currentRoom, viewAsNodeId || null);
  };

})();
