import { config } from "../config";

const SAMPLE_RATE = 24000;

let warnedMissingKey = false;

/** Strip markdown markers so TTS speaks natural prose. */
export function stripMarkdownForSpeech(text: string): string {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Synthesize speech via Deepgram Aura TTS.
 * Returns mono linear16 PCM at 24 kHz, or null if unavailable.
 */
export async function synthesizeSpeech(text: string): Promise<{
  pcm: Int16Array;
  sampleRate: number;
} | null> {
  const apiKey = config.deepgram.apiKey;
  if (!apiKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn("[deepgram-tts] DEEPGRAM_API_KEY not set — agent voice disabled");
    }
    return null;
  }

  const spoken = stripMarkdownForSpeech(text);
  if (!spoken) return null;

  // Deepgram Aura max ~2000 chars per request
  const chunk = spoken.slice(0, 1900);
  const url =
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(config.deepgram.ttsModel)}` +
    `&encoding=linear16&sample_rate=${SAMPLE_RATE}&container=none`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: chunk }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn("[deepgram-tts] speak failed", res.status, body.slice(0, 200));
    return null;
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  // Align to Int16 and copy into a fresh buffer (avoid shared ArrayBuffer issues).
  const even = buf.byteLength - (buf.byteLength % 2);
  const pcm = new Int16Array(even / 2);
  pcm.set(new Int16Array(buf.buffer, buf.byteOffset, even / 2));
  console.log("[deepgram-tts] synthesized", { chars: chunk.length, bytes: even, sampleRate: SAMPLE_RATE });
  return { pcm, sampleRate: SAMPLE_RATE };
}
