import { AccessToken } from "livekit-server-sdk";
import { config } from "../config";

export async function generateToken(room: string, name: string): Promise<string> {
  const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: name,
    name,
    ttl: "4h",
  });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

export function hostBotIdentity(meetingId: string): string {
  return `ai-host-${meetingId}`;
}

export function repBotIdentity(ownerEmail: string, meetingId: string): string {
  return `ai-rep-${ownerEmail}-${meetingId}`;
}
