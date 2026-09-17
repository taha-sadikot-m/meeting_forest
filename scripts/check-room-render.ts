/**
 * Render-time guard for the room page client script.
 *
 * The whole page is one template literal, so a single-backslash regex like
 * /\s+/ collapses to /s+/ before the browser sees it. These checks fail loudly
 * if that regression comes back.
 */
import { readFileSync } from 'node:fs';
import { roomPage } from '../src/pages/room';

const html = roomPage('check-room', { name: 'Check User', email: 'check@example.com' }, 'admin', 'public', true, false);

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function mustContain(name: string, needle: string) {
  checks.push({ name, ok: html.includes(needle), detail: 'missing: ' + needle });
}

function mustNotContain(name: string, needle: string) {
  checks.push({ name, ok: !html.includes(needle), detail: 'unexpected: ' + needle });
}

// 1. Entity command regexes must keep their backslashes.
mustContain('lifecycle regex escaped', '/^@(add|remove)\\s+(whiteboard|browser)\\s*$/i');
mustContain('target regex escaped', '/^@(whiteboard|browser)\\s+([a-z-]+)\\s*$/i');
mustNotContain('lifecycle regex not collapsed', '@(add|remove)s+');
mustNotContain('target regex not collapsed', '@(whiteboard|browser)s+');

// 2. Sub-meeting node ids must split on whitespace, not on the letter "s".
mustContain('nodeId regex escaped', ".replace(/\\s+/g, '-')");
mustNotContain('nodeId regex not collapsed', ".replace(/s+/g, '-')");

// 3. The @ dropdown is rendered from the client, not hardcoded.
mustContain('command menu container', 'id="chatCmdMenuList"');
mustContain('command menu renderer', 'function renderChatCommandMenu');
mustContain('command menu picker', 'function handleChatCommandPick');
mustNotContain('no hardcoded ring option', 'onclick="selectRingCmd()"');

// 4. Inside the page template literal every regex escape class needs a doubled
// backslash to survive into the browser. Scan the source for single ones.
const source = readFileSync(new URL('../src/pages/room.ts', import.meta.url), 'utf8');
const templateStart = source.indexOf('return /* html */`');
const template = templateStart >= 0 ? source.slice(templateStart) : '';
const singles = template
  .split('\n')
  .map((line, i) => ({ line, no: i + 1 }))
  .filter(({ line }) => /(?<!\\)\\[sdwbSDWB]/.test(line));
checks.push({
  name: 'no single-backslash regex classes in template',
  ok: templateStart >= 0 && singles.length === 0,
  detail: singles.map(({ line, no }) => '+' + no + ': ' + line.trim()).join(' | '),
});

// 5. The inline client script must parse. A stray quote inside the template
// literal silently kills every handler on the page.
const inline = html.slice(html.indexOf('<script>', html.indexOf('/public/whiteboard.js')) + '<script>'.length);
const clientScript = inline.slice(0, inline.indexOf('</script>'));
let parseError = '';
try {
  new Function(clientScript);
} catch (err) {
  parseError = err instanceof Error ? err.message : String(err);
}
checks.push({
  name: 'inline client script parses',
  ok: clientScript.length > 1000 && !parseError,
  detail: parseError || 'script not found',
});

// 6. Run the emitted parsers against real input. They are self-contained, so
// they can be lifted out of the client script and exercised directly.
function extractFn(name: string) {
  const start = clientScript.indexOf('function ' + name + '(');
  if (start < 0) return '';
  let depth = 0;
  for (let i = clientScript.indexOf('{', start); i < clientScript.length; i++) {
    if (clientScript[i] === '{') depth++;
    else if (clientScript[i] === '}' && --depth === 0) return clientScript.slice(start, i + 1);
  }
  return '';
}

const parsers = ['normalizeCommandText', 'parseEntityLifecycleCommand', 'parseEntityTargetCommand']
  .map(extractFn)
  .join('\n');
const runParsers = new Function(
  parsers + '\nreturn { parseEntityLifecycleCommand, parseEntityTargetCommand };'
)() as {
  parseEntityLifecycleCommand: (raw: string) => { action: string; entityType: string } | null;
  parseEntityTargetCommand: (raw: string) => { entityType: string; command: string } | null;
};

const lifecycleCases: Array<[string, string | null]> = [
  ['@add whiteboard', 'add:whiteboard'],
  ['@ADD Whiteboard', 'add:whiteboard'],
  ['  @add whiteboard  ', 'add:whiteboard'],
  ['@add   whiteboard', 'add:whiteboard'],
  ['@add whiteboard,', 'add:whiteboard'],
  ['@add whiteboard.', 'add:whiteboard'],
  ['@add\u00a0whiteboard', 'add:whiteboard'],
  ['@remove browser', 'remove:browser'],
  ['@addwhiteboard', null],
  ['@add sidebar', null],
  ['hello @add whiteboard', null],
];
for (const [input, expected] of lifecycleCases) {
  const parsed = runParsers.parseEntityLifecycleCommand(input);
  const actual = parsed ? parsed.action + ':' + parsed.entityType : null;
  checks.push({
    name: 'lifecycle ' + JSON.stringify(input),
    ok: actual === expected,
    detail: 'expected ' + expected + ', got ' + actual,
  });
}

const targetParsed = runParsers.parseEntityTargetCommand('@whiteboard expand');
checks.push({
  name: 'target "@whiteboard expand"',
  ok: targetParsed?.entityType === 'whiteboard' && targetParsed?.command === 'expand',
  detail: JSON.stringify(targetParsed),
});

let failed = 0;
for (const check of checks) {
  if (check.ok) {
    console.log('  ok   ' + check.name);
  } else {
    failed++;
    console.log('  FAIL ' + check.name + (check.detail ? ' -> ' + check.detail : ''));
  }
}

console.log('\n' + (checks.length - failed) + '/' + checks.length + ' checks passed');
if (failed) process.exit(1);
