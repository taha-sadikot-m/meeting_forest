import { Room, RoomEvent } from "@livekit/rtc-node";
import { config } from "../config";
import { ensureRoom } from "../livekit/room-service";
import { generateToken, hostBotIdentity, repBotIdentity } from "../livekit/tokens";
import { getTemporalClient } from "./client";
import { getRepWorkflowIds } from "./rep-registry";

interface BotSession {
  room: Room;
  identity: string;
  displayName: string;
  meetingId: string;
  listensForChat: boolean;
}

const botSessions = new Map<string, BotSession>();
const meetingListeners = new Set<string>();

function sessionKey(meetingId: string, identity: string) {
  return `${meetingId}:${identity}`;
}

function handleChatData(
  meetingId: string,
  payload: Uint8Array
) {
  try {
    const data = JSON.parse(new TextDecoder().decode(payload));
    if (data.type === "chat") {
      signalRepWorkflows(meetingId, {
        senderName: data.name || "Unknown",
        text: data.msg || "",
        timestamp: Date.now(),
      }).catch(console.error);
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

export async function disconnectBot(meetingId: string, identity: string): Promise<void> {
  const key = sessionKey(meetingId, identity);
  const session = botSessions.get(key);
  if (!session) return;
  try {
    await session.room.disconnect();
  } catch {
    /* ignore */
  }
  botSessions.delete(key);
  console.log("[livekit-bridge] disconnected", { meetingId, identity });
}

export async function disconnectAllBots(): Promise<void> {
  const sessions = [...botSessions.values()];
  botSessions.clear();
  meetingListeners.clear();
  for (const session of sessions) {
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
