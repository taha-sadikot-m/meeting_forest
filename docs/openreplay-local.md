# OpenReplay local setup (Meeting Forest)

OpenReplay is **not** a single small container. Official “Docker Compose” install
runs their stack via an install script (k3s under the hood). It needs roughly
**2 vCPU / 8 GB RAM** and a **hostname** (domain or `*.sslip.io`).

Windows: use **WSL2 Ubuntu** or a Linux VM / EC2. Docker Desktop alone on Windows
is a poor fit for the official installer.

## Option A — Fastest demo: OpenReplay Cloud

1. Sign up at https://app.openreplay.com (or their cloud signup).
2. Create a project → copy **Project Key**.
3. In `.env.local`:

```bash
OPENREPLAY_PROJECT_KEY=your_project_key_here
# leave OPENREPLAY_INGEST_POINT empty for Cloud
OPENREPLAY_ASSIST=true
OPENREPLAY_DISABLE_SECURE_MODE=true
```

4. Restart Meeting Forest (`bun run dev` / your usual command).
5. Browse MF pages → open OpenReplay UI → Sessions / Cobrowse.

## Option B — Self-host with official installer (Linux / WSL2)

### Requirements

- Ubuntu 20.04+ (WSL2 Ubuntu is OK for a local try)
- ~8 GB RAM free for the VM/WSL
- Docker + curl
- A hostname pointing at the machine, e.g. `openreplay.127.0.0.1.sslip.io` or a LAN IP `openreplay.192.168.1.10.sslip.io`

### Install (run inside Ubuntu / WSL)

```bash
# Optional: ensure Docker works
sudo apt update && sudo apt install -y curl docker.io
sudo usermod -aG docker $USER
# re-login / new shell if you just added docker group

# Install OpenReplay (you will be prompted for DOMAIN_NAME)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/openreplay/openreplay/main/scripts/docker-compose/docker-install.sh)"
```

When asked for domain, use something like:

```text
openreplay.127.0.0.1.sslip.io
```

(Or your public IP with `sslip.io` if MF runs on another machine.)

Docs: https://docs.openreplay.com/en/deployment/deploy-docker/

### After install

1. Open `https://YOUR_DOMAIN/signup` and create the admin account.
2. Create a **Project** → copy **Project Key**.
3. Meeting Forest `.env.local`:

```bash
OPENREPLAY_PROJECT_KEY=xxxxxxxx
OPENREPLAY_INGEST_POINT=https://openreplay.127.0.0.1.sslip.io/ingest
OPENREPLAY_ASSIST=true
OPENREPLAY_DISABLE_SECURE_MODE=true
```

4. Restart MF and use the app. In OpenReplay: **Sessions** (replay) and **Cobrowse / Assist** (live).

### Alternate CLI (same stack)

```bash
sudo wget https://raw.githubusercontent.com/openreplay/openreplay/main/scripts/helmcharts/openreplay-cli -O /bin/openreplay
sudo chmod +x /bin/openreplay
openreplay -i openreplay.127.0.0.1.sslip.io
```

## Wire into Meeting Forest

MF injects the Assist tracker when `OPENREPLAY_PROJECT_KEY` is set (`src/openreplay.ts`).
No tracker runs if the key is empty.

## Verify

1. Load `http://localhost:3000` (or your APP_URL) while logged in.
2. View page source → search for `OpenReplay` — snippet should appear.
3. In OpenReplay UI, a new session should appear within a minute.
4. For Assist: open Cobrowse, join the live session, approve prompts in the MF tab.

## Notes

- Assist = live cobrowse; requires `OPENREPLAY_ASSIST=true` (default).
- Company websites (customers not on MF) need the **same** tracker snippet on **their** site with that org’s project key — see product plan.
- Production: use HTTPS, set `OPENREPLAY_DISABLE_SECURE_MODE=false`.
