import { roomPage } from "./src/pages/room";

const html = roomPage("test-room", { name: "Test", email: "test@example.com" });
const match = html.match(/<script src="\/public\/tree\.js"><\/script>\s*<script>\s*([\s\S]*?)<\/script>/);
if (!match) throw new Error("inline script not found");

const js = match[1];

if (!js.includes("function toggleLobbyMic")) throw new Error("toggleLobbyMic missing");
if (!js.includes("function lobbyJoinOrKnock")) throw new Error("lobbyJoinOrKnock missing");
if (!js.includes("function sendRing")) throw new Error("sendRing missing");
if (!js.includes("function sendChat")) throw new Error("sendChat missing");
if (!js.includes("function parseRingCommand")) throw new Error("parseRingCommand missing");
if (!js.includes("substring(5)")) throw new Error("parseRingCommand must use substring(5) string parser");
if (js.includes("@ring\\b") || js.includes("@ring\b")) throw new Error("parseRingCommand must not use \\b word boundary");

// Runtime test: generated parser must handle multi-space input
const parseTest = new Function(
  js.slice(js.indexOf("function parseRingCommand"), js.indexOf("function sendChat")) +
    "return parseRingCommand('@ring  test@example.com');"
)();
if (parseTest !== "test@example.com") {
  throw new Error(`parseRingCommand failed generated test: got ${JSON.stringify(parseTest)}`);
}
if (js.includes("didn\\'t answer.")) throw new Error("broken apostrophe escape still present");
if (!js.includes("[@ring] room script ready")) throw new Error("[@ring] boot log missing");

const expiredLine = js.split("\n").find((line) => line.includes("didn't answer."));
if (!expiredLine || expiredLine.includes("didn\\'t")) {
  throw new Error(`broken apostrophe in expired ring line: ${expiredLine ?? "not found"}`);
}

try {
  new Function(js);
} catch (e) {
  throw new Error(`inline script parse error: ${(e as Error).message}`);
}

console.log("OK: room inline script parses and includes @ring debug hooks");
