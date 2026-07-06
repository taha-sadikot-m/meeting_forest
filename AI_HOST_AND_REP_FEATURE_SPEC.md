# AI Host & Personal AI Representative — Feature Specification

> **Purpose of this document**: Complete technical specification for implementing the AI Host and Personal AI Representative features in Meeting Forest. Written for an implementation agent that has not participated in prior design discussions.

---

## 1. Feature Overview

### 1.1 What is the AI Host?

The AI Host is a server-side bot that **orchestrates** an AI-hosted meeting on behalf of the meeting creator. Its sole responsibilities are:

- Entering the meeting room as a bot participant at the scheduled time
- Ringing each invited participant at their designated time using the existing `@ring` / `/api/rings` call feature
- Welcoming participants and keeping the meeting structured via chat messages
- Signalling the meeting start and end

**The AI Host does NOT generate summaries, capture tasks, or send any post-meeting output.** That is entirely the responsibility of each participant's Personal AI Representative.

### 1.2 What is a Personal AI Representative?

Every registered user can create and configure their own Personal AI Representative (AI Rep). The AI Rep is a bot that acts as a proxy for its human owner. It can:

- Attend any meeting the human is invited to, either alongside the human or instead of them
- Be briefed by the human with reference context: documents, notes, background information, standing instructions
- Answer questions in the meeting on the human's behalf, drawing on the provided context
- Listen to the full meeting conversation via the LiveKit data channel
- Capture all tasks, decisions, and action items mentioned during the meeting
- After the meeting ends, generate a structured debrief report and deliver it to the human owner

### 1.3 How the two features interact

```
Meeting Creator
  └─ creates AI-hosted meeting (agenda, participant list, scheduled ring times)
        │
        ▼
  Temporal Workflow starts
        │
  AI Host bot enters room ──────────────────────────────────┐
        │                                                   │
  At each scheduled time:                          (facilitates chat,
  ring participant via /api/rings                   keeps meeting on track)
        │
        ▼
  Each participant joins
  (human OR their AI Rep, or both)
        │
  AI Rep bot connects to room
        │  ├─ reads all chat via LiveKit data channel
        │  ├─ responds to questions using owner's context + Claude
        │  └─ appends everything to capture log
        │
  Meeting ends (AI Host signals end, or timeout)
        │
  Each AI Rep independently:
        ├─ calls Claude with full capture log
        ├─ generates debrief: summary, tasks, decisions, escalations
        └─ delivers debrief to its human owner (in-app + email)
```

---

## 2. Existing Codebase Context

The implementing agent must understand the existing infrastructure before building.

### 2.1 Runtime & framework

- **Bun** v1.x — single-file HTTP server in `index.ts` (1010 lines)
- No framework — plain `Request`/`Response` routing
- TypeScript throughout; template-literal HTML pages in `src/pages/*.ts`

### 2.2 Key existing systems

| System | Where | Notes |
|---|---|---|
| Session auth | `index.ts` lines 373–378 | Cookie-based; `getSession(token)` returns `{name, email}` |
| Memgraph (graph DB) | `index.ts` lines 28–44 | neo4j-driver bolt connection; `runQuery(cypher, params)` helper |
| LiveKit | `index.ts` lines 172–174 | `generateToken(room, name)` creates participant JWT |
| @ring system | `index.ts` lines 586–695 | `POST /api/rings`, `GET /api/rings/incoming`, `POST /api/rings/:id/respond` |
| activeSessions | `index.ts` lines 81–100 | In-memory Map tracking who is in which room (used by ring validation) |
| Ring overlay | `public/ring-notifier.js` | IIFE polling script included on all authenticated pages |
| Resend email | `src/auth.ts` | `sendMeetingInviteEmail()` already exists |

### 2.3 LiveKit data channel (how chat works today)

Participants publish chat messages via LiveKit's data channel:

```javascript
// Sender (room.ts — sendChat function)
livekitRoom.localParticipant.publishData(
  new TextEncoder().encode(JSON.stringify({ type: 'chat', msg, name: userName })),
  { reliable: true }
);

// Receiver (room.ts — livekitRoom.on('dataReceived'))
const data = JSON.parse(new TextDecoder().decode(payload));
if (data.type === 'chat') appendChatMessage(data.name, data.msg);
```

The AI Host and AI Reps use the **server-side LiveKit SDK** to do the same thing — publish data packets as a bot participant.

### 2.4 Existing API endpoints relevant to this feature

```
POST /api/rings                   — create a ring (caller must be authenticated)
GET  /api/rings/incoming          — recipient polls for incoming rings
POST /api/rings/:id/respond       — accept or reject a ring
GET  /api/rings/:id/status        — caller polls for ring outcome
POST /api/meetings                — create a new meeting
GET  /api/sessions/heartbeat      — participant heartbeat (updates activeSessions)
```

---

## 3. Technology Stack Additions

### 3.1 Temporal.io (workflow orchestration)

**Why Temporal**: The AI Host workflow involves sleeping until a scheduled time, ringing participants in sequence, waiting for join confirmations, and running for the duration of the meeting. This state must survive server restarts. Temporal provides durable execution — if the Bun process restarts mid-meeting, the workflow resumes exactly where it left off.

**Packages to install:**
```bash
bun add @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

**Temporal server**: For local development, run `temporal server start-dev` (single binary, no Docker needed). For production, use Temporal Cloud (free tier available at temporal.io).

**New environment variables:**
```env
TEMPORAL_ADDRESS=localhost:7233          # or your Temporal Cloud address
TEMPORAL_NAMESPACE=default               # or your cloud namespace
TEMPORAL_API_KEY=                        # only needed for Temporal Cloud
```

### 3.2 Anthropic Claude SDK

**Why**: Powers all AI intelligence — AI Host facilitation messages, AI Rep question answering, post-meeting debrief generation.

**Package to install:**
```bash
bun add @anthropic-ai/sdk
```

**New environment variable:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### 3.3 LiveKit Server SDK (server-side bot participant)

Already installed (`livekit-server-sdk` ^2.9.0). The bot uses `RoomServiceClient` to publish data packets as a server-side participant — no browser required.

---

## 4. Memgraph Schema Additions

All new nodes and relationships to add to Memgraph. The implementing agent must ensure these are created before workflows run (they are created lazily on first use).

### 4.1 AiHostedMeeting node

```cypher
CREATE (m:AiHostedMeeting {
  id:           string,   // same as LiveKit room id
  workflowId:   string,   // Temporal workflow ID (for signalling)
  agenda:       string,   // plain text agenda from creator
  label:        string,   // human-readable meeting name
  scheduledAt:  integer,  // Unix ms — when AI Host enters
  status:       string,   // 'scheduled' | 'active' | 'ended'
  createdAt:    integer
})
```

### 4.2 AiMeetingParticipant relationship

```cypher
(:User)-[:AI_MEETING_PARTICIPANT {
  ringAt:   integer,   // Unix ms — when to ring this person
  role:     string,    // 'host' (creator) | 'participant'
  joined:   boolean,
  joinedAt: integer
}]->(:AiHostedMeeting)
```

### 4.3 AiRep node (Personal AI Representative)

```cypher
CREATE (r:AiRep {
  id:           string,   // uuid
  ownerEmail:   string,   // FK to User.email
  name:         string,   // display name, e.g. "Alex's Rep"
  systemPrompt: string,   // standing instructions / personality
  createdAt:    integer,
  updatedAt:    integer
})

(:User)-[:HAS_REP]->(:AiRep)
```

### 4.4 AiRepContext node (knowledge base chunks)

```cypher
CREATE (c:AiRepContext {
  id:          string,
  repId:       string,
  title:       string,   // e.g. filename or note title
  content:     string,   // full text content
  createdAt:   integer
})

(:AiRep)-[:HAS_CONTEXT]->(:AiRepContext)
```

### 4.5 MeetingDebrief node

```cypher
CREATE (d:MeetingDebrief {
  id:          string,
  meetingId:   string,
  ownerEmail:  string,   // which human this debrief is for
  summary:     string,   // narrative summary
  tasks:       string,   // JSON array of {task, assignee, deadline}
  decisions:   string,   // JSON array of decision strings
  escalations: string,   // JSON array — things needing human attention
  rawLog:      string,   // full chat transcript the rep captured
  createdAt:   integer,
  delivered:   boolean
})

(:AiRep)-[:PRODUCED_DEBRIEF]->(:MeetingDebrief)
(:MeetingDebrief)-[:FOR_MEETING]->(:AiHostedMeeting)
```

---

## 5. New API Endpoints

Add all of these to `index.ts` following the existing routing pattern.

### 5.1 AI-hosted meeting endpoints

```
POST /api/ai-meetings
  Body: { label, agenda, scheduledAt, participants: [{email, ringAt}] }
  Auth: session required (creator)
  Action: Creates AiHostedMeeting in Memgraph, starts Temporal MeetingOrchestrationWorkflow
  Returns: { meetingId, workflowId }

GET /api/ai-meetings
  Auth: session required
  Action: Returns all AI-hosted meetings where session user is creator or participant
  Returns: { meetings: [...] }

POST /api/ai-meetings/:id/end
  Auth: session required (must be creator)
  Action: Sends 'meetingEnded' signal to Temporal workflow
  Returns: { ok: true }
```

### 5.2 AI Rep management endpoints

```
GET  /api/ai-rep
  Auth: session required
  Action: Returns the user's AiRep node + all AiRepContext nodes
  Returns: { rep: {...} | null, contexts: [...] }

POST /api/ai-rep
  Body: { name, systemPrompt }
  Auth: session required
  Action: Creates or updates AiRep node in Memgraph
  Returns: { repId }

DELETE /api/ai-rep
  Auth: session required
  Action: Deletes AiRep and all AiRepContext nodes for this user
  Returns: { ok: true }

POST /api/ai-rep/context
  Body: { title, content }
  Auth: session required
  Action: Adds an AiRepContext chunk to the user's rep
  Returns: { contextId }

DELETE /api/ai-rep/context/:id
  Auth: session required
  Action: Removes a specific context chunk
  Returns: { ok: true }
```

### 5.3 AI Rep deployment to a meeting

```
POST /api/ai-rep/deploy
  Body: { meetingId }
  Auth: session required
  Action: Starts a Temporal AiRepWorkflow for this user in the given meeting
  Returns: { workflowId }
```

### 5.4 Debrief retrieval

```
GET /api/debriefs
  Auth: session required
  Action: Returns all MeetingDebrief nodes for session user, newest first
  Returns: { debriefs: [...] }

GET /api/debriefs/:id
  Auth: session required
  Action: Returns a single MeetingDebrief (must belong to session user)
  Returns: { debrief: {...} }
```

---

## 6. Temporal Workflows

### 6.1 MeetingOrchestrationWorkflow

**File**: `src/temporal/workflows/meeting-orchestration.ts`

**Input:**
```typescript
interface MeetingOrchestrationInput {
  meetingId:    string;
  label:        string;
  agenda:       string;
  scheduledAt:  number;            // Unix ms
  participants: Array<{
    email:  string;
    name:   string;
    ringAt: number;                // Unix ms
  }>;
  creatorEmail: string;
}
```

**Signals the workflow accepts:**
```typescript
'participantJoined'  // payload: { email: string }
'meetingEnded'       // payload: none — creator manually ends, or timeout
```

**Workflow logic (pseudocode):**
```
1. sleep until scheduledAt
2. activity: createBotParticipant(meetingId, 'AI Host')
   → generates a LiveKit token for identity "ai-host-{meetingId}"
   → stores token for use in activity step 3
3. activity: botJoinAndGreet(meetingId, agenda)
   → connects bot to LiveKit room via server SDK
   → publishes welcome chat message with agenda
4. for each participant (sorted by ringAt ascending):
     sleep until participant.ringAt
     activity: ringParticipant(creatorEmail, participant.email, meetingId, label)
       → calls POST /api/rings internally (same logic as existing endpoint)
     sleep 5 minutes (ring TTL)
     // participant joined signal may arrive at any time; workflow records it
5. sleep until meeting timeout (scheduledAt + 4 hours) OR 'meetingEnded' signal
6. activity: botAnnounceEnd(meetingId)
   → publishes "Meeting ended — your AI Rep will deliver your debrief shortly"
7. activity: disconnectBot(meetingId)
8. activity: updateMeetingStatus(meetingId, 'ended') in Memgraph
```

**Important**: This workflow does NOT call Claude, does NOT generate summaries, does NOT email anyone. It only orchestrates timing and bot presence.

### 6.2 AiRepWorkflow

**File**: `src/temporal/workflows/ai-rep.ts`

**Input:**
```typescript
interface AiRepWorkflowInput {
  meetingId:  string;
  ownerEmail: string;
  repId:      string;
  repName:    string;
}
```

**Signals the workflow accepts:**
```typescript
'meetingEnded'   // triggers debrief generation
'chatMessage'    // payload: { senderName: string, text: string, timestamp: number }
```

**Workflow logic (pseudocode):**
```
1. activity: loadRepContext(repId)
   → fetches systemPrompt + all AiRepContext chunks from Memgraph
   → returns { systemPrompt, contextChunks }
2. activity: botJoinRoom(meetingId, repName)
   → generates LiveKit token for identity "ai-rep-{ownerEmail}"
   → connects to room via server SDK
   → subscribes to data channel
3. maintain in-memory captureLog: string[]

4. on 'chatMessage' signal:
   appendChatMessage(captureLog, senderName, text)
   if message is a question directed at anyone OR mentions the rep's name:
     activity: generateRepResponse(repId, repName, captureLog, newMessage, context)
       → calls Claude API:
           system: systemPrompt + context chunks
           user: "A participant said: '{text}'. The meeting so far: {last 10 messages}.
                  Reply as {repName}, representing {ownerEmail}. Be concise."
       → returns response text
     activity: publishChatMessage(meetingId, repName, responseText)
       → publishes response to LiveKit data channel

5. on 'meetingEnded' signal OR timeout after 4h:
   activity: generateDebrief(ownerEmail, meetingId, repId, captureLog, context)
     → calls Claude API:
         system: systemPrompt + context
         user: "Here is the full chat log from the meeting you attended on behalf of
                {ownerEmail}. Generate a debrief with:
                1. Summary (3-5 sentences)
                2. Tasks assigned to {ownerEmail} (list)
                3. Decisions made (list)
                4. Things requiring {ownerEmail}'s personal attention (list)
                Chat log: {captureLog}"
     → stores result as MeetingDebrief in Memgraph
     → marks debrief.delivered = false
   activity: deliverDebrief(ownerEmail, debriefId)
     → sends debrief email via Resend
     → marks debrief.delivered = true
6. activity: disconnectBot(meetingId, repName)
```

**How chatMessage signals get sent**: A server-side LiveKit data channel listener (running inside the worker process) receives room data events and signals the correct AiRepWorkflow with each message. See Section 7.3.

---

## 7. Worker Process

### 7.1 Entry point

**File**: `src/temporal/worker.ts`

This is a **separate process** from `index.ts`. Run it alongside the Bun server:

```bash
# Terminal 1
bun run index.ts

# Terminal 2  
bun run src/temporal/worker.ts
```

Or add both to a `Procfile` / `railway.json` for production.

```typescript
// src/temporal/worker.ts
import { Worker } from '@temporalio/worker';
import * as meetingActivities from './activities/meeting';
import * as repActivities from './activities/rep';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: { ...meetingActivities, ...repActivities },
  taskQueue: 'meeting-forest',
});

await worker.run();
```

### 7.2 Activity files

**`src/temporal/activities/meeting.ts`** — Activities for MeetingOrchestrationWorkflow:
```
createBotParticipant(meetingId)
botJoinAndGreet(meetingId, agenda)
ringParticipant(fromEmail, toEmail, meetingId, label)
botAnnounceEnd(meetingId)
disconnectBot(meetingId)
updateMeetingStatus(meetingId, status)
```

**`src/temporal/activities/rep.ts`** — Activities for AiRepWorkflow:
```
loadRepContext(repId)
botJoinRoom(meetingId, repName, ownerEmail)
generateRepResponse(repId, repName, captureLog, message, context)
publishChatMessage(meetingId, senderName, text)
generateDebrief(ownerEmail, meetingId, repId, captureLog, context)
deliverDebrief(ownerEmail, debriefId)
disconnectBot(meetingId, repName)
```

### 7.3 LiveKit data channel listener (bridge to Temporal signals)

This is the critical bridge: the worker process runs a LiveKit server-side room listener that captures all chat messages and signals the correct AiRepWorkflow instances.

```typescript
// src/temporal/livekit-listener.ts
import { RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import { Client } from '@temporalio/client';

// For each active meeting with deployed AI reps:
//   connect a server-side participant that only subscribes (no publish)
//   on dataReceived, parse the chat message
//   signal all AiRepWorkflow instances for that meeting

async function startRoomListener(meetingId: string, repWorkflowIds: string[]) {
  // Use LiveKit's server SDK to subscribe to room data
  // On each DataPacket received:
  //   parse JSON → { type: 'chat', msg, name }
  //   for each repWorkflowId:
  //     client.getHandle(repWorkflowId).signal('chatMessage', { senderName: name, text: msg })
}
```

**Note**: LiveKit's server SDK (`livekit-server-sdk` v2.x) provides `RoomServiceClient` and `AccessToken`. To receive room data server-side, use LiveKit's webhook functionality OR run a lightweight Node.js LiveKit participant using `livekit-client`. The implementing agent should check the livekit-server-sdk v2 docs for the server-side data subscription approach — the SDK may expose this via `RoomServiceClient.subscribeToRoomEvents` or a similar webhook method.

---

## 8. New UI Pages & Components

### 8.1 AI-hosted meeting creation page

**File**: `src/pages/ai-meeting-setup.ts`  
**Route**: `GET /ai-meeting` (add to `index.ts`)

This page lets the meeting creator configure an AI-hosted meeting. It must include:

- Meeting label (text input)
- Agenda (textarea)
- Scheduled start time (datetime-local input)
- Participant table: each row has `email` + `ringAt` (time, relative to start or absolute)
- "Add participant" button to add rows
- Submit → `POST /api/ai-meetings`

Styling should follow the existing `public/room.css` design language (dark theme, `#D15000` accent).

### 8.2 AI Rep settings page

**File**: `src/pages/ai-rep-settings.ts`  
**Route**: `GET /settings/ai-rep` (add to `index.ts`)

This page lets a user configure their personal AI Rep. It must include:

- Rep name (text input, e.g. "Alex's Rep")
- System prompt / standing instructions (textarea — this is how the rep introduces itself and what it prioritises)
- Context library: list of uploaded context chunks (title + content preview)
  - "Add context" button → modal with title + textarea for pasting content
  - Delete button per chunk
- Save button → `POST /api/ai-rep`
- Link back to dashboard

### 8.3 Debrief inbox page

**File**: `src/pages/debriefs.ts`  
**Route**: `GET /debriefs` (add to `index.ts`)

Shows all debrief reports delivered to the user. Each debrief card shows:
- Meeting name
- Date
- Rep that generated it
- Summary preview
- Expandable sections: Tasks, Decisions, Escalations
- Full transcript toggle

### 8.4 "Send my Rep" button

Add to the **invitations page** (`src/pages/invitations.ts`). For each pending invitation, alongside the existing "Accept" button, add a "Send my Rep" button. This button:

1. Checks if the user has configured an AI Rep (via `GET /api/ai-rep`)
2. If not → links to `/settings/ai-rep`
3. If yes → calls `POST /api/ai-rep/deploy` with the `meetingId`
4. Shows confirmation: "Your Rep will attend this meeting"

### 8.5 Navigation additions

Add links to the existing navigation (in `home.ts` and the shared nav pattern):
- "AI Rep" → `/settings/ai-rep`
- "Debriefs" → `/debriefs`

---

## 9. File Structure After Implementation

```
Meeting_Forest/
├── index.ts                          ← add new routes (sections 5.1–5.4)
├── src/
│   ├── pages/
│   │   ├── ai-meeting-setup.ts       ← NEW
│   │   ├── ai-rep-settings.ts        ← NEW
│   │   ├── debriefs.ts               ← NEW
│   │   ├── invitations.ts            ← MODIFIED (add "Send my Rep" button)
│   │   ├── home.ts                   ← MODIFIED (add nav links)
│   │   └── ...existing pages...
│   └── temporal/
│       ├── worker.ts                 ← NEW (separate process entry point)
│       ├── livekit-listener.ts       ← NEW (chat bridge → Temporal signals)
│       ├── workflows/
│       │   ├── meeting-orchestration.ts  ← NEW
│       │   └── ai-rep.ts                 ← NEW
│       └── activities/
│           ├── meeting.ts            ← NEW
│           └── rep.ts                ← NEW
├── public/
│   └── ring-notifier.js              ← unchanged
└── package.json                      ← add @temporalio/* and @anthropic-ai/sdk
```

---

## 10. Environment Variables (complete list after additions)

```env
# Existing
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
MEMGRAPH_HOST=...
MEMGRAPH_PORT=7687
MEMGRAPH_USER=...
MEMGRAPH_PASS=...
RESEND_API_KEY=...
SESSION_SECRET=...
APP_URL=https://...

# New — add these
ANTHROPIC_API_KEY=sk-ant-...
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_API_KEY=                    # only for Temporal Cloud
```

---

## 11. Implementation Order (recommended)

The implementing agent should follow this order to avoid building on unstable foundations:

| Step | What | Why |
|------|------|-----|
| 1 | Install packages (`@temporalio/*`, `@anthropic-ai/sdk`) | All subsequent steps depend on this |
| 2 | Add Memgraph schema (Section 4) | Workflows need DB nodes to exist |
| 3 | Add all new API endpoints (Section 5) | Worker and UI depend on these |
| 4 | Build Temporal worker entry point + empty activities (Section 7.1–7.2) | Establish the process; fill activity bodies incrementally |
| 5 | Implement `MeetingOrchestrationWorkflow` + its activities (Section 6.1) | AI Host before AI Rep — simpler, no Claude needed yet |
| 6 | Build `ai-meeting-setup.ts` UI page | Test the orchestration workflow end-to-end |
| 7 | Implement `AiRepWorkflow` + its activities — start with debrief only, no live response | Validate the capture-and-summarise loop before adding live Q&A |
| 8 | Implement LiveKit data channel listener + chatMessage signals (Section 7.3) | Enables live rep responses |
| 9 | Build `ai-rep-settings.ts` UI page | Context management |
| 10 | Build `debriefs.ts` UI page | Debrief delivery display |
| 11 | Add "Send my Rep" button to invitations page | Final wiring |

---

## 12. Key Constraints & Edge Cases

The implementing agent must handle these:

**Bot identity in LiveKit**: Bot participant identities must be prefixed to avoid clashing with human identities. Use `ai-host-{meetingId}` for the host bot and `ai-rep-{ownerEmail}-{meetingId}` for rep bots.

**activeSessions and bots**: The existing `activeSessions` map is used by `POST /api/rings` to check if someone is already in a meeting. Bot participants must NOT be registered in `activeSessions` — they should be tracked separately so the ring logic doesn't treat a bot's presence as "the person is already here".

**One rep per user per meeting**: If a user deploys their rep and then also joins in person, both should coexist. The rep should identify itself as "[Name]'s Rep" in chat so participants know they're talking to a bot.

**Rep response threshold**: The AI Rep should not respond to every single chat message — only to questions or messages where context-based answering is relevant. The Claude prompt for `generateRepResponse` should instruct it to respond with `null` / empty string if no response is warranted. The activity should check for this before publishing to the data channel.

**Temporal workflow IDs**: Use deterministic IDs. For meeting orchestration: `meeting-orch-{meetingId}`. For AI rep: `ai-rep-{ownerEmail}-{meetingId}`. This makes it easy to get workflow handles from anywhere in the codebase.

**Debrief generation on abrupt disconnect**: If the bot is forcibly disconnected before receiving a `meetingEnded` signal, the AiRepWorkflow should have a max timeout activity (4 hours) that triggers debrief generation regardless.

**Context size**: Claude has a context window limit. When building the prompt for `generateRepResponse`, include only the last 10–15 messages from the capture log, not the full log. For `generateDebrief`, chunk the full log if it exceeds ~100k characters and make multiple Claude calls, then merge.

---

## 13. Testing Checklist

Before marking the feature complete, the implementing agent must verify:

- [ ] Creating an AI-hosted meeting stores correctly in Memgraph and starts the Temporal workflow
- [ ] The AI Host bot appears in the LiveKit room at `scheduledAt`
- [ ] Each participant is rung at their configured `ringAt` time
- [ ] Accepting a ring navigates the participant to the room with `?joined_muted=true`
- [ ] A user can create an AI Rep with system prompt and context chunks
- [ ] Deploying an AI Rep starts an `AiRepWorkflow` and the bot joins the room
- [ ] Chat messages are forwarded to the AiRepWorkflow via signals
- [ ] The rep responds to relevant questions in chat
- [ ] After `meetingEnded` signal, a MeetingDebrief is created in Memgraph
- [ ] The debrief email is delivered via Resend
- [ ] The debrief appears on the `/debriefs` page
- [ ] Bot participants do NOT appear in `activeSessions` and do NOT block @ring calls
