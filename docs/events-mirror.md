# Chat event mirror (SafiChat SOW → Meeting Forest Messages)

Durable `user.message` events from 1:1 Messages are copied from NATS JetStream into Redpanda topic `platform-events-v1`. **Memgraph remains the chat source of truth.** Redpanda is never on the send path.

Pipeline: **User → Messages API → Memgraph → NATS/JetStream → Redpanda Connect → platform-events-v1**

## What it does

After a direct message is saved, the app publishes (fire-and-forget) to subject `safichat.semantic.user.message`. Redpanda Connect uses durable consumer `safichat-redpanda-v1`. If Redpanda or Connect is down, chat still works; missed events catch up when the mirror returns.

## How to run (local)

```bash
docker compose -f docker-compose.events.yml up -d
# wait until Redpanda is healthy, then:
export NATS_URL=nats://127.0.0.1:4222
export REDPANDA_BROKERS=localhost:19092
bun run events:proof
```

App `.env.local` (optional; empty `NATS_URL` disables publish only):

```
NATS_URL=nats://127.0.0.1:4222
NATS_STREAM=SAFICHAT
EVENTS_TENANT_ID=meeting-forest
```

Restart the Meeting Forest process after changing env.

## Status check

```bash
docker compose -f docker-compose.events.yml ps
curl -s http://127.0.0.1:8222/healthz
# Kafka API (host): localhost:19092
```

## Automated proof (A1–A3)

`bun run events:proof` publishes 10 contexts × 10 events and consumes `platform-events-v1`. Expect `ALL PASS`.

## Connector restart (A6)

```bash
docker compose -f docker-compose.events.yml restart connect
# No manual data repair. Durable consumer resumes. Re-run events:proof with a new run id, or send a DM in the app.
```

## Redpanda outage (A4) and catch-up (A5)

1. `docker compose -f docker-compose.events.yml stop redpanda`
2. Send a Message in the app (or POST `/api/messages/...`). Expect HTTP 200; Memgraph still has the row.
3. `docker compose -f docker-compose.events.yml start redpanda` (then start `connect` if it exited)
4. Consume `platform-events-v1` — durable events from the outage should appear without republishing from the app.

## Configuration location

| Piece | Path |
|---|---|
| Compose | `docker-compose.events.yml` |
| Connect | `connect/safichat-mirror.yaml` |
| Publisher | `src/events/nats-publisher.ts` (hooked from `src/db/message-queries.ts`) |

## AWS (VPC)

The app EC2 is too small (~1 GB) to run Redpanda. The stack runs on the Memgraph host (`172.31.18.248`):

```bash
# on events/memgraph host
cd ~/events-mirror   # docker-compose.events.yml + connect/safichat-mirror.yaml
sudo docker compose -f docker-compose.events.yml up -d
```

NATS **4222** is not opened on the security group (same restriction as Bolt 7687). The app host forwards it over the existing SSH tunnel:

`127.0.0.1:4222` → Memgraph `127.0.0.1:4222` (unit `memgraph-tunnel.service`).

App `.env.local`:

```
NATS_URL=nats://127.0.0.1:4222
NATS_STREAM=SAFICHAT
EVENTS_TENANT_ID=meeting-forest
```

Then copy this commit onto the app (`git pull` or rsync `src/events`, `src/db/message-queries.ts`, `src/config.ts`, `package.json`) and `bun install && sudo systemctl restart meeting-forest`.

If Connect logs `stream not found`, create it once:

```bash
sudo docker run --rm --network events-mirror_default natsio/nats-box \
  nats stream add SAFICHAT --server nats:4222 --subjects 'safichat.semantic.>' --storage file --defaults
```

## A7 / A8

- **A7:** two people must send real DMs in Meeting Forest while you confirm events in `platform-events-v1` (and once with Redpanda stopped).
- **A8:** running compose/config must match Git.

## Out of scope

In-room LiveKit chat, AI `assistant.message`, custom NATS→Redpanda code, Schema Registry, extra topics.
