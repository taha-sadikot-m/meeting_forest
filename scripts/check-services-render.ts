import { servicesPage } from "../src/pages/services";

const html = servicesPage({ name: "Check User", email: "check@example.com" });

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [
  { name: "email assistant page marker", ok: html.includes('data-page="email-assistant"') },
  { name: "other services toggle", ok: html.includes('id="otherServicesToggle"') },
  { name: "dropdown starts open", ok: html.includes('class="sb-group open" id="otherServicesGroup"') },
  {
    name: "email assistant nav link",
    ok: html.includes('href="/services/email-assistant" class="sb-link active sb-sublink"'),
  },
  { name: "collapsed rail link", ok: html.includes('class="sb-link sb-group-rail"') },
  { name: "landing title", ok: html.includes("<h1 id=\"servicesTitle\">Email Assistant</h1>") },
  { name: "benefits copy", ok: html.includes("Inbox guidance tailored to your workflow") },
  { name: "get started button", ok: html.includes('id="emailAssistantStart"') },
  { name: "second get started button", ok: html.includes('id="emailAssistantStartBottom"') },
  { name: "catalogue card gone", ok: !html.includes("services-catalogue") },
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
