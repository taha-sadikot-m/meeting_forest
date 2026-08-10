// whiteboard.js — Collaborative Excalidraw whiteboard for Meeting Forest rooms.
// Exposes: window.MeetingWhiteboard, window._whiteboard
// Lazy-loads React + Excalidraw from CDN on first open.

(function () {
  "use strict";

  const EXCALIDRAW_VER = "0.18.0";
  const CHUNK_LIMIT = 12000;
  const DEBOUNCE_MS = 80;

  function ensureStylesheet(href, id) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function slimElements(elements) {
    if (!Array.isArray(elements)) return [];
    // Drop binary payloads; keep geometry/sync fields only
    return elements.map(function (el) {
      if (!el || typeof el !== "object") return el;
      var copy = Object.assign({}, el);
      if (copy.dataURL) delete copy.dataURL;
      if (copy.fileId && copy.type === "image") {
        // Keep image placeholder metadata; remote peers won't have the file blob in v1
      }
      return copy;
    });
  }

  class MeetingWhiteboard {
    constructor(opts) {
      opts = opts || {};
      this.mountId = opts.mountId || "excalidrawMount";
      this.clientId =
        opts.clientId ||
        "wb-" + Math.random().toString(36).slice(2, 10);
      this.onPublish = typeof opts.onPublish === "function" ? opts.onPublish : function () {};
      this.onError = typeof opts.onError === "function" ? opts.onError : console.error;
      this.api = null;
      this.root = null;
      this.isOpen = false;
      this.applyingRemote = false;
      this.lastElements = [];
      this.libs = null;
      this.loadPromise = null;
      this.debounceTimer = null;
      this.pendingChunks = new Map();
      this.React = null;
      this.ReactDOM = null;
      this.reconcileElements = null;
      this.Excalidraw = null;
      this.sceneEpoch = 0;
    }

    async ensureLoaded() {
      if (this.libs) return this.libs;
      if (this.loadPromise) return this.loadPromise;

      this.loadPromise = (async () => {
        ensureStylesheet(
          "https://esm.sh/@excalidraw/excalidraw@" + EXCALIDRAW_VER + "/dist/prod/index.css",
          "excalidraw-css"
        );
        window.EXCALIDRAW_ASSET_PATH =
          "https://esm.sh/@excalidraw/excalidraw@" + EXCALIDRAW_VER + "/dist/prod/";

        const [React, ReactDOM, ExcalidrawLib] = await Promise.all([
          import("react"),
          import("react-dom/client"),
          import(
            "https://esm.sh/@excalidraw/excalidraw@" +
              EXCALIDRAW_VER +
              "?external=react,react-dom"
          ),
        ]);

        this.React = React;
        this.ReactDOM = ReactDOM;
        this.Excalidraw = ExcalidrawLib.Excalidraw;
        this.reconcileElements =
          ExcalidrawLib.reconcileElements ||
          function (local, remote) {
            return remote || local || [];
          };
        this.libs = ExcalidrawLib;
        return this.libs;
      })();

      try {
        return await this.loadPromise;
      } catch (err) {
        this.loadPromise = null;
        throw err;
      }
    }

    _mountEl() {
      return document.getElementById(this.mountId);
    }

    _setLoading(show) {
      const el = document.getElementById("whiteboardLoading");
      if (!el) return;
      if (show) el.classList.remove("hidden");
      else el.classList.add("hidden");
    }

    async open() {
      await this.ensureLoaded();
      const mount = this._mountEl();
      if (!mount) throw new Error("Whiteboard mount not found");

      this._setLoading(true);

      if (!this.root) {
        // Keep loading node; render Excalidraw as sibling container
        let host = mount.querySelector("#excalidrawHost");
        if (!host) {
          host = document.createElement("div");
          host.id = "excalidrawHost";
          host.style.height = "100%";
          host.style.width = "100%";
          mount.appendChild(host);
        }
        this.root = this.ReactDOM.createRoot(host);

        const self = this;
        const initial = this.lastElements.length ? this.lastElements : undefined;

        this.root.render(
          this.React.createElement(this.Excalidraw, {
            excalidrawAPI: function (api) {
              self.api = api;
              self._setLoading(false);
              if (self.lastElements.length) {
                self._applyElements(self.lastElements);
              }
            },
            initialData: initial
              ? { elements: initial, scrollToContent: true }
              : undefined,
            onChange: function (elements) {
              if (self.applyingRemote) return;
              self.lastElements = slimElements(elements);
              self._schedulePublish(self.lastElements);
            },
            UIOptions: {
              canvasActions: {
                loadScene: false,
                saveToActiveFile: false,
              },
            },
            theme: "light",
          })
        );
      } else {
        this._setLoading(false);
        if (this.lastElements.length) this._applyElements(this.lastElements);
      }

      this.isOpen = true;
    }

    close() {
      this.isOpen = false;
      // Keep React tree mounted so scene survives reopen; just hide overlay in room.ts
    }

    async toggle() {
      if (this.isOpen) {
        this.close();
        return false;
      }
      await this.open();
      return true;
    }

    getScene() {
      return this.lastElements;
    }

    hasContent() {
      return (this.lastElements || []).some(function (el) {
        return el && !el.isDeleted;
      });
    }

    _schedulePublish(elements) {
      const self = this;
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(function () {
        self._publishScene(elements);
      }, DEBOUNCE_MS);
    }

    _publishScene(elements) {
      this.sceneEpoch += 1;
      const payload = {
        type: "whiteboard_scene",
        from: this.clientId,
        epoch: this.sceneEpoch,
        elements: slimElements(elements),
      };
      const raw = JSON.stringify(payload);
      if (raw.length <= CHUNK_LIMIT) {
        this.onPublish(payload);
        return;
      }
      // Chunk large scenes for LiveKit data limits
      const id =
        "chunk-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      const body = JSON.stringify(payload.elements);
      const total = Math.ceil(body.length / CHUNK_LIMIT);
      for (let i = 0; i < total; i++) {
        this.onPublish({
          type: "whiteboard_scene_chunk",
          from: this.clientId,
          id: id,
          index: i,
          total: total,
          epoch: this.sceneEpoch,
          payload: body.slice(i * CHUNK_LIMIT, (i + 1) * CHUNK_LIMIT),
        });
      }
    }

    publishClear() {
      this.lastElements = [];
      this.sceneEpoch += 1;
      if (this.api) {
        this.applyingRemote = true;
        try {
          this.api.updateScene({ elements: [] });
          this.api.history.clear();
        } catch (_) {
          /* older builds may lack history.clear */
          try {
            this.api.updateScene({ elements: [] });
          } catch (__) {}
        }
        const self = this;
        requestAnimationFrame(function () {
          self.applyingRemote = false;
        });
      }
      this.onPublish({
        type: "whiteboard_clear",
        from: this.clientId,
        epoch: this.sceneEpoch,
      });
    }

    requestSync() {
      this.onPublish({
        type: "whiteboard_sync_request",
        from: this.clientId,
      });
    }

    respondToSync(requestFrom) {
      if (!this.hasContent()) return;
      if (requestFrom && requestFrom === this.clientId) return;
      // Reuse scene publish (includes chunking for large boards)
      this._publishScene(this.lastElements);
    }

    _applyElements(elements) {
      if (!this.api || !Array.isArray(elements)) {
        this.lastElements = Array.isArray(elements) ? slimElements(elements) : [];
        return;
      }
      this.applyingRemote = true;
      try {
        const local = this.api.getSceneElementsIncludingDeleted
          ? this.api.getSceneElementsIncludingDeleted()
          : this.api.getSceneElements();
        const appState = this.api.getAppState ? this.api.getAppState() : {};
        let next;
        try {
          next = this.reconcileElements(local, elements, appState);
        } catch (_) {
          next = elements;
        }
        this.api.updateScene({ elements: next });
        this.lastElements = slimElements(next);
      } finally {
        const self = this;
        requestAnimationFrame(function () {
          self.applyingRemote = false;
        });
      }
    }

    applyRemote(msg) {
      if (!msg || !msg.type) return;
      if (msg.from && msg.from === this.clientId) return;

      if (msg.type === "whiteboard_clear") {
        this.lastElements = [];
        if (this.api) {
          this.applyingRemote = true;
          try {
            this.api.updateScene({ elements: [] });
          } catch (_) {}
          const self = this;
          requestAnimationFrame(function () {
            self.applyingRemote = false;
          });
        }
        return;
      }

      if (msg.type === "whiteboard_sync_request") {
        this.respondToSync(msg.from);
        return;
      }

      if (
        msg.type === "whiteboard_scene" ||
        msg.type === "whiteboard_sync_response"
      ) {
        if (msg.type === "whiteboard_sync_response" && msg.to && msg.to !== this.clientId) {
          return;
        }
        this._applyElements(msg.elements || []);
        return;
      }

      if (msg.type === "whiteboard_scene_chunk") {
        this._handleChunk(msg);
      }
    }

    _handleChunk(msg) {
      if (!msg.id || typeof msg.payload !== "string") return;
      let entry = this.pendingChunks.get(msg.id);
      if (!entry) {
        entry = { parts: [], total: msg.total, from: msg.from, epoch: msg.epoch };
        this.pendingChunks.set(msg.id, entry);
      }
      entry.parts[msg.index] = msg.payload;
      let complete = entry.parts.length === entry.total;
      if (complete) {
        for (let i = 0; i < entry.total; i++) {
          if (typeof entry.parts[i] !== "string") {
            complete = false;
            break;
          }
        }
      }
      if (!complete) return;
      this.pendingChunks.delete(msg.id);
      try {
        const elements = JSON.parse(entry.parts.join(""));
        this._applyElements(elements);
      } catch (err) {
        this.onError(err);
      }
    }
  }

  window.MeetingWhiteboard = MeetingWhiteboard;
})();
