import { servicesPage } from "../src/pages/services";

const html = servicesPage({ name: "Check User", email: "check@example.com" });

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [
  { name: "services page marker", ok: html.includes('data-page="services"') },
  { name: "active sidebar link", ok: html.includes('href="/services" class="sb-link active"') },
  { name: "email assistant card", ok: html.includes("<h2>Email Assistant</h2>") },
  { name: "get started button", ok: html.includes('id="emailAssistantStart"') },
  {
    name: "dialog semantics",
    ok: html.includes('role="dialog"') && html.includes('aria-modal="true"'),
  },
  {
    name: "approved success copy",
    ok: html.includes(
      "Instructions have been sent to your email. Enjoy your Email Assistant service."
    ),
  },
  { name: "escape dismissal", ok: html.includes("event.key === 'Escape'") },
  {
    name: "backdrop dismissal",
    ok: html.includes("event.target === emailAssistantModal"),
  },
  {
    name: "focus restoration",
    ok: html.includes("emailAssistantPreviousFocus.focus()"),
  },
];

const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const inlineScript = scriptMatches.at(-1)?.[1] || "";
let parseError = "";
try {
  new Function(inlineScript);
} catch (error) {
  parseError = error instanceof Error ? error.message : String(error);
}
checks.push({
  name: "page interaction script parses",
  ok: inlineScript.length > 0 && !parseError,
  detail: parseError || "inline script missing",
});

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
  if (!check.ok && check.detail) console.log(`  ${check.detail}`);
}
if (failed.length) process.exit(1);
