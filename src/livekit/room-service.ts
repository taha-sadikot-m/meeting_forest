import { RoomServiceClient } from "livekit-server-sdk";
import { config } from "../config";

function livekitHttpUrl(): string {
  return config.livekit.url.replace(/^wss?:\/\//, "https://");
}

let roomService: RoomServiceClient | null = null;

function getRoomService(): RoomServiceClient {
  if (!roomService) {
    roomService = new RoomServiceClient(
      livekitHttpUrl(),
      config.livekit.apiKey,
      config.livekit.apiSecret
    );
  }
  return roomService;
}

export async function ensureRoom(meetingId: string): Promise<void> {
  try {
    await getRoomService().createRoom({
      name: meetingId,
      emptyTimeout: 300,
      maxParticipants: 50,
    });
  } catch {
    /* room may already exist */
  }
}
