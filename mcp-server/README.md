# Meeting Forest MCP Server

FastAPI/FastMCP sidecar that exposes Meeting Forest capabilities as **MCP tools** (Streamable HTTP)
and as a simple **REST tool invoke API** for the in-app global agent.

## Setup

```bash
cd mcp-server
uv sync
cp .env.example .env
```

## Run

```bash
# From mcp-server/
uv run uvicorn app.main:app --host 0.0.0.0 --port 8100

# Or from repo root:
bun run mcp
```

Endpoints:

| Path | Purpose |
|------|---------|
| `GET /health` | Health check |
| `GET /tools` | Tool JSON schemas (for Gemini function calling) |
| `POST /tools/{name}` | Invoke a tool with Bearer session token |
| `POST /mcp` | MCP Streamable HTTP (Cursor / Claude Desktop / MCP Inspector) |

## Auth

Pass the Meeting Forest session token on every request:

```
Authorization: Bearer <mf_session_token>
```

Meeting Forest accepts the same token via cookie `mf_session` or Bearer header.

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Connect with transport **Streamable HTTP** to `http://127.0.0.1:8100/mcp` and set the Authorization header to your session Bearer token.

## In-app agent

With the Bun app and this MCP server running, open `/agent` while logged in.
The page calls `POST /api/agent/chat`, which uses Gemini + these MCP REST tools with your session cookie token.
