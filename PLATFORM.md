# Meeting Forest — Voice Agent Knowledge Base

Use this document to help users understand what Meeting Forest is, what makes it different, and what they can do on each page.

**App base URL:** `http://localhost:3000` (or your deployed `APP_URL`)

---

## What is Meeting Forest?

Meeting Forest is a video meeting platform where meetings can grow into a **tree of sub-meetings** — like breakout rooms, but organized visually and managed live. Beyond standard video calls, it offers **@ring** (in-app calling to pull someone into a meeting), **private waiting rooms**, **AI-scheduled meetings** that ring participants automatically, and a **Personal Assistant** that can attend meetings on your behalf and send you a debrief afterward.

Meeting Forest is for teams who run complex, multi-room discussions — standups that split into workstreams, workshops with parallel tracks, or scheduled meetings where an AI host keeps things on track while your Assistant captures what you missed.

---

## What Makes Meeting Forest Unique?

These are the features that set Meeting Forest apart from Zoom, Google Meet, or Teams:

### 1. Meeting Tree (hierarchical sub-meetings)

Most platforms offer flat breakout rooms. Meeting Forest organizes meetings as a **visual tree** — a parent meeting can spawn child sub-meetings, each with its own admin, participants, and mic/camera rules. Super-admins (meeting creators) can **roam between rooms** in the tree without leaving the platform. Admins can be assigned from the current room or invited by email.

**Why it matters:** Large meetings can split into focused workstreams and rejoin — the structure is visible and persistent, not a temporary breakout.

### 2. @ring — in-app calling to pull people in

Type `@ring email@example.com` in meeting chat (or use the ring UI) to **call a registered user into your meeting**, like an internal phone ring. They get a popup anywhere in the app and can accept or reject. If they accept, they join the room (often muted).

**Why it matters:** You don't need to copy a link and hope someone sees it — you can actively pull a colleague into the conversation.

### 3. Personal AI Assistant (attend on your behalf)

Every user gets a configurable **Assistant** (created automatically at signup). It can:

- Join meetings you're invited to **instead of you** or **alongside you**
- Answer questions in chat using your briefing notes and context library
- Listen to the full meeting conversation
- After the meeting, generate a **debrief**: summary, tasks, decisions, and escalations
- Deliver the debrief in-app and by email

**Why it matters:** You can send your Assistant when you can't attend, and still get a structured report of what happened.

### 4. AI-Hosted Scheduled Meetings

Schedule a meeting with an agenda and participant list. An **AI Host bot** joins at the scheduled time, welcomes everyone, shares the agenda, and **rings each participant at their designated time**. If someone doesn't answer (or has ringing disabled), their **Personal Assistant joins automatically** so they're still represented.

**Why it matters:** Meetings start on time without manual chasing — unavailable people are covered by their Assistant.

### 5. Private meetings with a waiting room

Meetings can be set to **private**. Non-admins must **knock** and wait for the host or admin to **admit or reject** them — similar to a physical waiting room.

**Why it matters:** Control who enters sensitive discussions without making the meeting link useless.

### 6. Per-room mic and camera defaults

Each node in the meeting tree can have its own **mic and camera defaults** (allow or deny). Admins can lock permissions for a sub-meeting.

**Why it matters:** Different sub-meetings can have different participation rules — a presentation room vs. a discussion room.

### 7. Debrief inbox

After your Assistant attends a meeting, you receive a structured debrief with tasks, decisions, escalations, and an optional full transcript — not just a recording to watch later.

**Why it matters:** Actionable meeting output without watching an hour of video.

---

## Page Guide — URL, Purpose, and What Users Can Do

### Public pages (no login required)

#### `/login`
**Purpose:** Sign in to Meeting Forest.

**What users can do:**
- Enter email and password to log in
- Go to Register if they don't have an account
- Go to Forgot Password if they forgot their password
- After email verification, they'll see a success message here

**Voice agent tip:** "Go to the login page and sign in with your email and password. If you just registered, check your email to verify your account first."

---

#### `/register`
**Purpose:** Create a new Meeting Forest account.

**What users can do:**
- Enter name, email, and password
- Submit to create an account
- Receive a verification email (must verify before first login)
- Get a default Personal Assistant created automatically (e.g. "John's Assistant")

**Voice agent tip:** "Sign up at the register page. You'll need to verify your email before you can log in. A Personal Assistant is set up for you automatically."

---

#### `/forgot-password`
**Purpose:** Request a password reset link.

**What users can do:**
- Enter their email address
- Receive a reset link by email (or see it in the server console during local dev)

---

#### `/reset-password?token=...`
**Purpose:** Set a new password after requesting a reset.

**What users can do:**
- Enter and confirm a new password
- Return to login after success

---

#### `/verify-email?token=...`
**Purpose:** Verify email after registration (link from email).

**What users can do:**
- Click the link — account is verified automatically
- Redirected to login with a success message

---

### Authenticated pages (login required)

#### `/` or `/home` — Dashboard
**Purpose:** Main hub after login. See active meetings and start or join quickly.

**What users can do:**
- View greeting and meeting stats
- **Start a new meeting** — opens a modal to name the meeting and choose public or private
- **Join a meeting** — enter a meeting ID or link and join directly
- See **active rooms** they're part of — copy link or join with one click
- Navigate to any section via the sidebar

**Voice agent tip:** "Your dashboard is the home page. From there you can start a new meeting, join one by ID, or jump into any active room you're already in."

---

#### `/room` or `/room/{meetingId}` — Live Meeting Room
**Purpose:** The core video meeting experience. This is where users spend most of their time in a live session.

**What users can do:**

**Before joining (lobby):**
- Preview mic and camera
- Join immediately (public meetings) or **Ask to Join** (private meetings — waits for admin approval)
- Copy the meeting invite link

**During the meeting:**
- Toggle **microphone** and **camera**
- **Share screen** — view others' screen shares full-screen
- Open **chat** — send messages to everyone in the room
- Use **@ring** in chat — type `@ring someone@email.com` to call a registered user into the meeting
- Send **emoji reactions** (thumbs up, clap, heart, etc.)
- View **participants** list
- Open the **Meeting Tree** — see and manage sub-meetings as a visual canvas
  - Create child sub-meetings
  - Assign admins to sub-meetings
  - Move between rooms (super-admins can roam)
  - Set mic/camera defaults per sub-meeting
- **Invite people** — copy link, QR code, or email invite
- Toggle meeting **privacy** (public ↔ private) if you're the creator
- Manage **waiting room** (admins) — see who knocked, admit or reject
- Lock mic/camera for participants (permissions panel, admins)
- **Leave** the meeting

**Voice agent tip:** "In the meeting room, you can video chat, share your screen, chat, and ring someone in with @ring followed by their email. Open the Meeting Tree to create breakout sub-meetings."

---

#### `/meetings/past` — Past Meetings
**Purpose:** History of all meetings the user hosted or attended.

**What users can do:**
- Browse a table of past meetings with name, date, role, and status
- See their role in each meeting (superadmin, admin, or participant)
- Rejoin ended meetings or view meeting details where available

**Voice agent tip:** "Past Meetings shows your meeting history. You can see every session you hosted or joined and your role in each."

---

#### `/meetings/invitations` — Invitations
**Purpose:** Meetings other people have invited this user to.

**What users can do:**
- View pending invitations with who invited them and when
- **Join** an invited meeting
- **Send my Assistant** — deploy their Personal Assistant to attend the meeting on their behalf without joining themselves

**Voice agent tip:** "Check Invitations for meetings others invited you to. You can join yourself, or tap 'Send my Assistant' to have your Assistant attend and send you a debrief later."

---

#### `/ai-meeting` — Scheduling (AI-Hosted Meetings)
**Purpose:** Schedule a meeting that an AI Host will run — ringing participants at set times.

**What users can do:**
- Create a scheduled meeting with:
  - **Meeting name**
  - **Agenda** (shared by the AI Host at start)
  - **Scheduled start time**
  - **Participant list** — each person gets a specific **Ring At** time
- View their list of scheduled AI meetings
- **End a meeting early** if they're the creator

**What happens automatically:**
- AI Host joins at the scheduled time and posts the agenda
- Each participant is rung at their Ring At time (up to 2 attempts)
- If someone doesn't answer or has ringing off, their Assistant joins instead
- Meeting runs up to 4 hours or until ended

**Voice agent tip:** "Go to Scheduling to set up an AI-hosted meeting. Add participants and when each person should be called. The AI Host will ring them in and keep the meeting on track."

---

#### `/settings/ai-rep` — Assistant Settings
**Purpose:** Configure the user's Personal AI Assistant.

**What users can do:**
- Set **Assistant name** (default: "{YourName}'s Assistant")
- Write an **introduction message** — how the Assistant introduces itself in meetings
- Set **standing instructions** — behavior rules and priorities for the Assistant
- Build a **Context Library** — add titled notes, documents, and background info the Assistant uses when answering questions
- **Save** or **reset** the Assistant configuration

**Voice agent tip:** "Open Assistant Settings to teach your Assistant how to behave. Add context notes about your projects so it can answer questions accurately when attending on your behalf."

---

#### `/debriefs` or `/debriefs?id={debriefId}` — Debrief Inbox
**Purpose:** Read reports from the Personal Assistant after meetings.

**What users can do:**
- View all debriefs from meetings their Assistant attended
- Read per-meeting:
  - **Summary**
  - **Tasks** (action items)
  - **Decisions** made
  - **Escalations** (things needing the user's attention)
- Toggle the full **transcript** of the meeting chat
- Open a specific debrief via email link (`?id=...`)

**Voice agent tip:** "Your Debrief Inbox has reports from meetings your Assistant attended. Each debrief includes a summary, tasks, decisions, and anything that needs your attention."

---

#### `/settings` — Account Settings
**Purpose:** Manage profile and meeting preferences.

**What users can do:**
- Update their **display name**
- View their email (read-only)
- Toggle **Ringing** on or off
  - When **on**: scheduled AI meetings will ring them at their call time
  - When **off**: their Assistant joins automatically instead of ringing them

**Voice agent tip:** "In Settings you can change your name and turn ringing on or off. If ringing is off, your Assistant will join scheduled meetings for you automatically."

---

#### `/logout`
**Purpose:** Sign out.

**What users can do:**
- End their session and return to the login page

---

## Sidebar Navigation (available on all logged-in pages)

| Menu item | Goes to | What it does |
|---|---|---|
| Dashboard | `/` | Home — start/join meetings |
| New Meeting | Modal on current page | Quick-start a new meeting |
| Past Meetings | `/meetings/past` | Meeting history |
| Invitations | `/meetings/invitations` | Invites from others |
| Scheduling | `/ai-meeting` | AI-hosted scheduled meetings |
| Assistant | `/settings/ai-rep` | Configure Personal Assistant |
| Debriefs | `/debriefs` | Assistant meeting reports |
| Settings | `/settings` | Profile and ringing toggle |

---

## Common User Journeys

### Journey 1: First-time user
1. Go to `/register` → create account
2. Check email → click verify link (`/verify-email?token=...`)
3. Go to `/login` → sign in
4. Land on `/` (Dashboard) → start first meeting
5. Optionally visit `/settings/ai-rep` to configure Assistant

### Journey 2: Host a quick video meeting
1. Dashboard `/` → click **New Meeting** or use the start modal
2. Name the meeting, choose public or private
3. Enter `/room/{meetingId}` → share invite link or QR
4. Participants join via link
5. Use chat, screen share, reactions as needed
6. Leave when done

### Journey 3: Run a meeting with breakout sub-meetings
1. Start or join a meeting at `/room/{meetingId}`
2. Open **Meeting Tree** from the controls bar
3. Create child sub-meetings on the canvas
4. Assign admins to each sub-meeting
5. Participants move between rooms; super-admin roams across the tree
6. Set mic/camera rules per sub-meeting as needed

### Journey 4: Pull a colleague into a meeting (@ring)
1. Be in an active meeting at `/room/{meetingId}`
2. In chat, type: `@ring colleague@company.com`
3. Colleague sees a ring popup anywhere in the app
4. They accept → join the meeting (often muted)
5. If they reject or don't answer within 2 minutes, the ring expires

### Journey 5: Can't attend — send your Assistant
1. Go to `/meetings/invitations`
2. Find the meeting you were invited to
3. Click **Send my Assistant**
4. Assistant joins the meeting, answers questions using your context
5. After the meeting, check `/debriefs` for the report

### Journey 6: Schedule an AI-hosted team meeting
1. Go to `/ai-meeting` (Scheduling)
2. Enter meeting name, agenda, and start time
3. Add participants with individual **Ring At** times
4. Click **Schedule Meeting**
5. At the scheduled time, AI Host joins and rings each person
6. Unavailable people are covered by their Assistants
7. Creator can end early from the scheduled meetings list

### Journey 7: Private meeting with waiting room
1. Create a meeting and set it to **private** (or toggle privacy in-room)
2. Share the link with intended participants
3. When someone knocks, admin sees the **Waiting Room** panel
4. Admin admits or rejects each person
5. Admitted users enter the meeting

---

## Key Terms (plain language)

| Term | Meaning |
|---|---|
| **Meeting Tree** | Visual map of a meeting and its sub-meetings, like branches on a tree |
| **Sub-meeting** | A child breakout room under a parent meeting |
| **Superadmin** | The person who created the meeting; can roam the full tree |
| **Admin** | Manages a specific sub-meeting; can admit waiting users |
| **@ring** | In-app call to pull a registered user into your meeting |
| **Assistant** | Your personal AI bot that can attend meetings on your behalf |
| **AI Host** | Server bot that runs scheduled meetings — welcomes, rings, keeps agenda |
| **Debrief** | Post-meeting report from your Assistant: summary, tasks, decisions, escalations |
| **Context Library** | Notes and documents you give your Assistant to answer questions accurately |
| **Ringing** | Setting that controls whether you get called into scheduled meetings or your Assistant joins instead |
| **Knock / Waiting room** | Request to enter a private meeting; admin must admit you |
| **Ring At** | The specific time a participant should be called into a scheduled meeting |

---

## Voice Agent Quick Answers (FAQ)

**"What is Meeting Forest?"**  
Meeting Forest is a video meeting platform with a meeting tree for breakout rooms, in-app @ring calling, AI-scheduled meetings, and a Personal Assistant that can attend for you and send debriefs.

**"How is it different from Zoom or Google Meet?"**  
It has a visual meeting tree (not flat breakouts), @ring to pull people in, AI-hosted scheduling that rings participants, and a Personal Assistant that attends on your behalf and writes debriefs.

**"How do I start a meeting?"**  
Log in, go to the Dashboard, and click New Meeting. Name it and choose public or private.

**"How do I join a meeting?"**  
Use an invite link (`/room/{meetingId}`), join from your Dashboard active rooms, or accept an invitation from the Invitations page.

**"How do I create breakout rooms?"**  
In a live meeting, open the Meeting Tree and add child sub-meetings on the canvas.

**"How do I call someone into my meeting?"**  
In meeting chat, type `@ring their-email@example.com`. They must have a Meeting Forest account.

**"How do I send my Assistant to a meeting?"**  
Go to Invitations, find the meeting, and click Send my Assistant. Or disable ringing in Settings so your Assistant joins scheduled meetings automatically.

**"Where do I see what my Assistant learned?"**  
Go to Debriefs. Each report has a summary, tasks, decisions, escalations, and an optional transcript.

**"How do I schedule a meeting that rings people?"**  
Go to Scheduling (`/ai-meeting`). Set the agenda, start time, and each participant's Ring At time.

**"What is a private meeting?"**  
Only people you admit can join. Visitors knock and wait in a waiting room until an admin lets them in.

**"I can't log in after registering."**  
You need to verify your email first. Check your inbox for the verification link.

**"What happens if I miss a ring?"**  
For scheduled AI meetings, your Personal Assistant joins the meeting on your behalf and you'll get a debrief afterward.

---

## Email Links Users May Receive

| Link | What it does |
|---|---|
| `{APP_URL}/verify-email?token=...` | Verifies account after registration |
| `{APP_URL}/reset-password?token=...` | Opens password reset page |
| `{APP_URL}/room/{meetingId}` | Join or enter a specific meeting |
| `{APP_URL}/debriefs?id={debriefId}` | Opens a specific Assistant debrief |

---

## Related Documents

- [README.md](README.md) — developer setup and installation
- [AI_HOST_AND_REP_FEATURE_SPEC.md](AI_HOST_AND_REP_FEATURE_SPEC.md) — technical AI feature specification
