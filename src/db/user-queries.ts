import { runQuery } from "./memgraph";
import { normEmail } from "../rings";

export interface UserSettings {
  name: string;
  email: string;
  createdAt: number | null;
  ringingEnabled: boolean;
}

export async function getUserSettings(email: string): Promise<UserSettings | null> {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})
     RETURN u.name AS name, u.email AS email, u.createdAt AS createdAt,
            coalesce(u.ringingEnabled, true) AS ringingEnabled`,
    { email: normEmail(email) }
  );
  if (!recs.length) return null;
  const r = recs[0];
  return {
    name: r.get("name") as string,
    email: r.get("email") as string,
    createdAt: r.get("createdAt") as number | null,
    ringingEnabled: r.get("ringingEnabled") as boolean,
  };
}

export async function updateUserRingingEnabled(email: string, enabled: boolean): Promise<void> {
  await runQuery(
    `MATCH (u:User {email: $email}) SET u.ringingEnabled = $enabled`,
    { email: normEmail(email), enabled }
  );
}

export async function updateUserName(email: string, name: string): Promise<void> {
  await runQuery(
    `MATCH (u:User {email: $email}) SET u.name = $name`,
    { email: normEmail(email), name }
  );
}

export async function isRingingEnabledForUser(email: string): Promise<boolean> {
  const recs = await runQuery(
    `MATCH (u:User {email: $email})
     RETURN coalesce(u.ringingEnabled, true) AS ringingEnabled`,
    { email: normEmail(email) }
  );
  if (!recs.length) return true;
  return recs[0].get("ringingEnabled") as boolean;
}
