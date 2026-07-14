# 🌲 Meeting Forest

A real-time meeting platform built with **Bun**, **LiveKit**, and **Memgraph**. Supports hierarchical meeting rooms — create sub-meetings as a tree, assign admins, and move participants between rooms live.

> For the voice-agent knowledge base (what users can do on each page and what makes the platform unique), see **[PLATFORM.md](PLATFORM.md)**.

---

## Features

- **Auth** — register, login, email verification, password reset (via Resend)
- **Meeting rooms** — LiveKit-powered video/audio with mic, camera, and screen share
- **Meeting tree** — create sub-meetings as child nodes; super-admins can roam between rooms
- **Admin assignment** — pick a participant from the current room (moved instantly via LiveKit data message) or invite by email
- **Memgraph** — graph database tracks meeting hierarchy, participants, and presence

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Video / Audio | [LiveKit](https://livekit.io) |
| Graph Database | [Memgraph](https://memgraph.com) (Bolt protocol) |
| Email | [Resend](https://resend.com) |
| Language | TypeScript |

---

## Project Structure

```
index.ts              # Bun HTTP server — all routes and API handlers
src/
  auth.ts             # Sessions, password hashing, email helpers
  pages/
    login.ts          # Login page
    register.ts       # Registration page
    forgot-password.ts
    reset-password.ts
    home.ts           # Dashboard (lists meetings)
    room.ts           # Meeting room (LiveKit + tree UI)
public/
  styles.css          # Global design system
  auth.css            # Auth page styles
  room.css            # Meeting room styles
  tree.css            # Meeting tree canvas styles
  tree.js             # n8n-style node canvas (vanilla JS)
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- A [LiveKit](https://cloud.livekit.io) project (free tier works)
- A [Memgraph](https://memgraph.com) instance (local Docker or hosted)
- A [Resend](https://resend.com) account with a verified sending domain

### Install

```bash
bun install
```

### Configure

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Memgraph
MEMGRAPH_HOST=your-memgraph-host-or-ip
MEMGRAPH_PORT=7687
MEMGRAPH_USER=
MEMGRAPH_PASS=

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_EMAIL_ADDRESS=noreply@yourdomain.com

# App public URL (used in email links)
APP_URL=http://localhost:3000
```

> **Email in dev mode:** If `RESEND_API_KEY` is not set, emails are printed to the console instead of being sent — useful for local testing without a Resend account.

### Run

```bash
# Development (hot reload)
bun dev

# Production
bun start
```

Server starts on `http://localhost:3000` (or the port set in `PORT`).

---

## Memgraph with Docker (local)

```bash
docker run -p 7687:7687 memgraph/memgraph
```

Or connect to a hosted instance — set `MEMGRAPH_HOST` to its public IP.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `LIVEKIT_URL` | Yes | — | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | Yes | — | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | — | LiveKit API secret |
| `MEMGRAPH_HOST` | No | `localhost` | Memgraph host / IP |
| `MEMGRAPH_PORT` | No | `7687` | Memgraph Bolt port |
| `MEMGRAPH_USER` | No | _(empty)_ | Memgraph username |
| `MEMGRAPH_PASS` | No | _(empty)_ | Memgraph password |
| `RESEND_API_KEY` | No* | — | Resend API key (* dev logs to console without it) |
| `RESEND_EMAIL_ADDRESS` | No* | — | Verified sender address |
| `APP_URL` | No | `http://localhost:3000` | Public URL for email links |
