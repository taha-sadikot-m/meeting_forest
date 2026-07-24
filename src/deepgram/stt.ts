import WebSocket from "ws";
import { config } from "../config";

export type TranscriptHandler = (transcript: string, isFinal: boolean) => void;

let warnedMissingKey = false;

/**
 * Deepgram live STT via the `ws` package (Bun's native WebSocket drops auth headers).
 */
export class DeepgramLiveStt {
  private ws: WebSocket | null = null;
  private closed = false;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private onTranscript: TranscriptHandler;

  constructor(onTranscript: TranscriptHandler) {
    this.onTranscript = onTranscript;
  }

  async connect(sampleRate = 16000): Promise<boolean> {
    const apiKey = config.deepgram.apiKey;
    if (!apiKey) {
      if (!warnedMissingKey) {
        warnedMissingKey = true;
        console.warn("[deepgram-stt] DEEPGRAM_API_KEY not set — voice commands disabled");
      }
      return false;
    }

    const qs = new URLSearchParams({
      model: config.deepgram.sttModel,
      encoding: "linear16",
      sample_rate: String(sampleRate),
      channels: "1",
      punctuate: "true",
      interim_results: "false",
      smart_format: "true",
    });

    const url = `wss://api.deepgram.com/v1/listen?${qs.toString()}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, {
        headers: { Authorization: `Token ${apiKey}` },
      });
      this.ws = ws;

      const timer = setTimeout(() => {
        reject(new Error("Deepgram STT connect timeout"));
        try { ws.close(); } catch { /* ignore */ }
      }, 15_000);

      ws.once("open", () => {
        clearTimeout(timer);
        console.log("[deepgram-stt] connected", { sampleRate, model: config.deepgram.sttModel });
        this.keepAliveTimer = setInterval(() => {
          if (this.closed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          try {
            this.ws.send(JSON.stringify({ type: "KeepAlive" }));
          } catch {
            /* ignore */
          }
        }, 3000);
        resolve();
      });

      ws.once("error", (err) => {
        clearTimeout(timer);
        console.warn("[deepgram-stt] connect error", err);
        reject(err);
      });

      ws.on("message", (data) => {
        try {
          const raw = typeof data === "string" ? data : data.toString("utf8");
          const msg = JSON.parse(raw);
          const alt = msg?.channel?.alternatives?.[0];
          const transcript = String(alt?.transcript || "").trim();
          if (!transcript) return;
          const isFinal = msg.is_final === true || msg.speech_final === true;
          this.onTranscript(transcript, isFinal);
        } catch {
          /* ignore parse errors */
        }
      });

      ws.on("close", (code, reason) => {
        console.log("[deepgram-stt] closed", { code, reason: reason?.toString?.() || "" });
        this.clearKeepAlive();
        this.ws = null;
      });
    });

    return true;
  }

  sendPcm(pcm: Int16Array): void {
    if (this.closed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const bytes = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    this.ws.send(bytes);
  }

  private clearKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  close(): void {
    this.closed = true;
    this.clearKeepAlive();
    if (!this.ws) return;
    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "CloseStream" }));
      }
      this.ws.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}
