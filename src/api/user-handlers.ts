import { getUserSettings, updateUserRingingEnabled, updateUserName } from "../db/user-queries";
import { updateSessionName } from "../auth";

export async function handleGetUserSettings(session: { email: string }) {
  const settings = await getUserSettings(session.email);
  if (!settings) return { error: "User not found", status: 404 };
  return { settings, status: 200 };
}

export async function handlePatchUserSettings(
  session: { email: string },
  sessionToken: string,
  body: { ringingEnabled?: boolean; name?: string }
) {
  if (body.ringingEnabled !== undefined) {
    if (typeof body.ringingEnabled !== "boolean") {
      return { error: "ringingEnabled must be a boolean", status: 400 };
    }
    await updateUserRingingEnabled(session.email, body.ringingEnabled);
  }

  if (body.name !== undefined) {
    const name = (body.name || "").trim();
    if (!name) return { error: "name cannot be empty", status: 400 };
    await updateUserName(session.email, name);
    updateSessionName(sessionToken, name);
  }

  const settings = await getUserSettings(session.email);
  if (!settings) return { error: "User not found", status: 404 };
  return { settings, status: 200 };
}
