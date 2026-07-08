import { Client, Connection } from "@temporalio/client";
import { config } from "../config";

let clientPromise: Promise<Client> | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const connection = await Connection.connect({
        address: config.temporal.address,
        ...(config.temporal.apiKey ? { apiKey: config.temporal.apiKey } : {}),
      });
      return new Client({
        connection,
        namespace: config.temporal.namespace,
      });
    })();
  }
  return clientPromise;
}

export { config as temporalConfig };
