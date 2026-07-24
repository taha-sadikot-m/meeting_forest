import {
  Room,
  RoomEvent,
  AudioSource,
  AudioFrame,
  AudioStream,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackSource,
  TrackKind,
  type RemoteTrack,
  type RemoteParticipant,
} from "@livekit/rtc-node";
import { config } from "../config";
import { ensureRoom } from "../livekit/room-service";
import { generateToken, hostBotIdentity, repBotIdentity, agentBotIdentity } from "../livekit/tokens";
import { AGENT_DISPLAY_NAME, isAddressedToAgent } from "../agent-host";
import { getTemporalClient } from "./client";
import { getRepWorkflowIds } from "./rep-registry";
import { getAgentHostWorkflowId } from "./agent-host-registry";
import { synthesizeSpeech } from "../deepgram/tts";
import { DeepgramLiveStt } from "../deepgram/stt";

const AGENT_TTS_SAMPLE_RATE = 24000;
const STT_SAMPLE_RATE = 16000;

interface BotSession {
  room: Room;
  identity: string;
  displayName: string;
  meetingId: string;
  listensForChat: boolean;
  audioSource?: AudioSource;
  audioTrack?: LocalAudioTrack;
  speakingUntil?: number;
  sttCleanups?: Array<() => void>;
}

const botSessions = new Map<string, BotSession>();
const meetingListeners = new Set<string>();

function sessionKey(meetingId: string, identity: string) {
  return `${meetingId}:${identity}`;
}

async function signalRepWorkflows(
  meetingId: string,
  payload: { senderName: string; text: string; timestamp: number }
) {
  const workflowIds = getRepWorkflowIds(meetingId);
  if (!workflowIds.length) return;

  const client = await getTemporalClient();
  for (const workflowId of workflowIds) {
    try {
      const handle = client.workflow.getHandle(workflowId);
      await handle.signal("chatMessage", payload);
    } catch (e) {
      console.warn("[livekit-bridge] signal failed", workflowId, e);
    }
  }
}

async function signalAgentHostWorkflow(
  meetingId: string,
  payload: { senderName: string; text: string; timestamp: number }
) {
  const workflowId = getAgentHostWorkflowId(meetingId);
  if (!workflowId) return;
  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal("chatMessage", payload);
  } catch (e) {
    const msg = String(e);
    if (msg.includes("WorkflowNotFound") || msg.includes("workflow not found")) return;
    console.warn("[livekit-bridge] agent-host signal failed", workflowId, e);
  }
}

function handleChatData(
  meetingId: string,
  payload: Uint8Array
) {
  try {
    const data = JSON.parse(new TextDecoder().decode(payload));
    if (data.type === "chat") {
      const chatPayload = {
        senderName: data.name || "Unknown",
        text: data.msg || "",
        timestamp: Date.now(),
      };
      signalRepWorkflows(meetingId, chatPayload).catch(console.error);
      signalAgentHostWorkflow(meetingId, chatPayload).catch(console.error);
    }
  } catch {
    /* ignore */
  }
}

async function ensureMeetingChatListener(meetingId: string): Promise<void> {
  if (meetingListeners.has(meetingId)) return;
  const identity = `ai-listener-${meetingId}`;
  const key = sessionKey(meetingId, identity);
  if (botSessions.has(key)) {
    meetingListeners.add(meetingId);
    return;
  }

  await ensureRoom(meetingId);
  const token = await generateToken(meetingId, identity);
  const room = new Room();
  room.on(RoomEvent.DataReceived, (payload) => {
    handleChatData(meetingId, payload);
  });

  await room.connect(config.livekit.url, token, { autoSubscribe: true });
  botSessions.set(key, { room, identity, displayName: "Listener", meetingId, listensForChat: true });
  meetingListeners.add(meetingId);
  console.log("[livekit-bridge] chat listener connected", meetingId);
}

export async function connectBot(params: {
  meetingId: string;
  identity: string;
  displayName: string;
  listensForChat?: boolean;
}): Promise<void> {
  const { meetingId, identity, displayName, listensForChat = false } = params;
  const key = sessionKey(meetingId, identity);

  if (botSessions.has(key)) return;

  await ensureRoom(meetingId);
  const token = await generateToken(meetingId, identity);
  const room = new Room();

  if (listensForChat) {
    room.on(RoomEvent.DataReceived, (payload) => {
      handleChatData(meetingId, payload);
    });
    meetingListeners.add(meetingId);
  }

  await room.connect(config.livekit.url, token, { autoSubscribe: true });
  botSessions.set(key, { room, identity, displayName, meetingId, listensForChat });
  console.log("[livekit-bridge] connected", { meetingId, identity, displayName });
}

export async function publishChatMessage(
  meetingId: string,
  identity: string,
  displayName: string,
  text: string
): Promise<void> {
  const key = sessionKey(meetingId, identity);
  let session = botSessions.get(key);

  if (!session) {
    await connectBot({ meetingId, identity, displayName, listensForChat: false });
    session = botSessions.get(key);
  }
  if (!session) throw new Error("Failed to connect bot for chat publish");

  const payload = new TextEncoder().encode(
    JSON.stringify({ type: "chat", msg: text, name: displayName })
  );
  await session.room.localParticipant.publishData(payload, {
    reliable: true,
    topic: "",
  });
}

async function ensureAgentAudioTrack(session: BotSession): Promise<AudioSource> {
  if (session.audioSource) return session.audioSource;

  const source = new AudioSource(AGENT_TTS_SAMPLE_RATE, 1);
  const track = LocalAudioTrack.createAudioTrack("agent-voice", source);
  const options = new TrackPublishOptions();
  options.source = TrackSource.SOURCE_MICROPHONE;
  await session.room.localParticipant.publishTrack(track, options);
  session.audioSource = source;
  session.audioTrack = track;
  // Give remotes a moment to subscribe before first playout.
  await new Promise((r) => setTimeout(r, 400));
  console.log("[livekit-bridge] agent audio track published", session.meetingId);
  return source;
}

/** Push PCM into LiveKit in realtime-sized frames. */
async function playPcmOnSource(
  source: AudioSource,
  pcm: Int16Array,
  sampleRate: number
): Promise<void> {
  const frameSamples = Math.max(1, Math.floor(sampleRate / 50)); // ~20ms
  let offset = 0;
  while (offset < pcm.length) {
    const end = Math.min(offset + frameSamples, pcm.length);
    // Copy each frame so LiveKit owns stable memory.
    const chunk = new Int16Array(pcm.subarray(offset, end));
    const frame = new AudioFrame(chunk, sampleRate, 1, chunk.length);
    await source.captureFrame(frame);
    offset = end;
  }
  await source.waitForPlayout();
}

export async function publishAgentSpeech(meetingId: string, text: string): Promise<void> {
  const key = sessionKey(meetingId, agentBotIdentity(meetingId));
  const session = botSessions.get(key);
  if (!session) {
    console.warn("[livekit-bridge] agent speech skipped — no session", meetingId);
    return;
  }

  try {
    const synthesized = await synthesizeSpeech(text);
    if (!synthesized) {
      console.warn("[livekit-bridge] agent speech skipped — TTS empty/failed", meetingId);
      return;
    }

    const source = await ensureAgentAudioTrack(session);
    const durationMs = Math.ceil((synthesized.pcm.length / synthesized.sampleRate) * 1000);
    session.speakingUntil = Date.now() + durationMs + 500;

    await playPcmOnSource(source, synthesized.pcm, synthesized.sampleRate);
    console.log("[livekit-bridge] agent spoke", { meetingId, durationMs });
  } catch (e) {
    console.warn("[livekit-bridge] agent speech failed", meetingId, e);
  }
}

function attachAgentStt(session: BotSession): void {
  if (!config.deepgram.apiKey) {
    console.warn("[livekit-bridge] STT skipped — DEEPGRAM_API_KEY not set");
    return;
  }

  const cleanups: Array<() => void> = [];
  session.sttCleanups = cleanups;
  const startedFor = new Set<string>();

  const startForTrack = (track: RemoteTrack, participant: RemoteParticipant) => {
    if (track.kind !== TrackKind.KIND_AUDIO) return;
    if (participant.identity === session.identity) return;
    if (participant.identity.startsWith("ai-listener-")) return;
    if (participant.identity.startsWith("ai-agent-")) return;
    if (participant.identity.startsWith("ai-host-")) return;
    if (participant.identity.startsWith("ai-rep-")) return;

    const startKey = `${participant.identity}:${track.sid || "audio"}`;
    if (startedFor.has(startKey)) return;
    startedFor.add(startKey);

    console.log("[livekit-bridge] STT start", {
      meetingId: session.meetingId,
      identity: participant.identity,
    });

    let stopped = false;
    const stt = new DeepgramLiveStt((transcript, isFinal) => {
      if (!isFinal || stopped) return;
      if (session.speakingUntil && Date.now() < session.speakingUntil) {
        console.log("[livekit-bridge] ignored voice (agent speaking)", transcript.slice(0, 80));
        return;
      }
      if (!isAddressedToAgent(transcript)) {
        console.log("[livekit-bridge] ignored voice (no wake word — say \"agent …\")", transcript.slice(0, 120));
        return;
      }

      const senderName = participant.name || participant.identity || "Participant";
      console.log("[livekit-bridge] voice command", {
        meetingId: session.meetingId,
        senderName,
        transcript,
      });
      signalAgentHostWorkflow(session.meetingId, {
        senderName,
        text: transcript,
        timestamp: Date.now(),
      }).catch(console.error);
    });

    void (async () => {
      try {
        const ok = await stt.connect(STT_SAMPLE_RATE);
        if (!ok || stopped) {
          stt.close();
          startedFor.delete(startKey);
          return;
        }
        const stream = new AudioStream(track, STT_SAMPLE_RATE);
        for await (const frame of stream) {
          if (stopped) break;
          stt.sendPcm(frame.data);
        }
      } catch (e) {
        if (!stopped) console.warn("[livekit-bridge] STT stream ended", participant.identity, e);
      } finally {
        stt.close();
        startedFor.delete(startKey);
      }
    })();

    cleanups.push(() => {
      stopped = true;
      stt.close();
      startedFor.delete(startKey);
    });
  };

  session.room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    startForTrack(track as RemoteTrack, participant as RemoteParticipant);
  });

  for (const [, participant] of session.room.remoteParticipants) {
    for (const [, pub] of participant.trackPublications) {
      if (pub.track) startForTrack(pub.track as RemoteTrack, participant);
    }
  }
}

export async function disconnectBot(meetingId: string, identity: string): Promise<void> {
  const key = sessionKey(meetingId, identity);
  const session = botSessions.get(key);
  if (!session) return;

  if (session.sttCleanups) {
    for (const stop of session.sttCleanups) {
      try { stop(); } catch { /* ignore */ }
    }
    session.sttCleanups = [];
  }
  if (session.audioTrack) {
    try { await session.audioTrack.close(); } catch { /* ignore */ }
  }
  if (session.audioSource) {
    try { await session.audioSource.close(); } catch { /* ignore */ }
  }

  try {
    await session.room.disconnect();
  } catch {
    /* ignore */
  }
  botSessions.delete(key);
  if (session.listensForChat) {
    const stillListening = [...botSessions.values()].some(
      (s) => s.meetingId === meetingId && s.listensForChat
    );
    if (!stillListening) meetingListeners.delete(meetingId);
  }
  console.log("[livekit-bridge] disconnected", { meetingId, identity });
}

export async function disconnectAllBots(): Promise<void> {
  const sessions = [...botSessions.values()];
  botSessions.clear();
  meetingListeners.clear();
  for (const session of sessions) {
    if (session.sttCleanups) {
      for (const stop of session.sttCleanups) {
        try { stop(); } catch { /* ignore */ }
      }
    }
    try {
      await session.room.disconnect();
    } catch {
      /* ignore */
    }
  }
}

export async function connectHostBot(meetingId: string): Promise<void> {
  const identity = hostBotIdentity(meetingId);
  await connectBot({
    meetingId,
    identity,
    displayName: "Meeting Host",
    listensForChat: true,
  });
}

export async function connectRepBot(
  meetingId: string,
  ownerEmail: string,
  repName: string
): Promise<void> {
  await ensureMeetingChatListener(meetingId);
  const identity = repBotIdentity(ownerEmail, meetingId);
  await connectBot({
    meetingId,
    identity,
    displayName: repName,
    listensForChat: false,
  });
}

export async function disconnectHostBot(meetingId: string): Promise<void> {
  await disconnectBot(meetingId, hostBotIdentity(meetingId));
}

export async function disconnectRepBot(meetingId: string, ownerEmail: string): Promise<void> {
  await disconnectBot(meetingId, repBotIdentity(ownerEmail, meetingId));
}

export async function publishHostChat(meetingId: string, text: string): Promise<void> {
  await publishChatMessage(meetingId, hostBotIdentity(meetingId), "Meeting Host", text);
}

export async function publishRepChat(
  meetingId: string,
  ownerEmail: string,
  repName: string,
  text: string
): Promise<void> {
  await publishChatMessage(
    meetingId,
    repBotIdentity(ownerEmail, meetingId),
    repName,
    text
  );
}

export async function connectAgentHostBot(meetingId: string): Promise<void> {
  const identity = agentBotIdentity(meetingId);
  await connectBot({
    meetingId,
    identity,
    displayName: AGENT_DISPLAY_NAME,
    listensForChat: true,
  });
  const session = botSessions.get(sessionKey(meetingId, identity));
  if (session) {
    try {
      await ensureAgentAudioTrack(session);
    } catch (e) {
      console.warn("[livekit-bridge] failed to publish agent audio track early", meetingId, e);
    }
    attachAgentStt(session);
  }
}

export async function disconnectAgentHostBot(meetingId: string): Promise<void> {
  await disconnectBot(meetingId, agentBotIdentity(meetingId));
}

export async function publishAgentHostChat(meetingId: string, text: string): Promise<void> {
  await publishChatMessage(
    meetingId,
    agentBotIdentity(meetingId),
    AGENT_DISPLAY_NAME,
    text
  );
  // Speak after chat so listeners see text + hear voice
  await publishAgentSpeech(meetingId, text);
}
