// Minimal CDP driver: node cdp_test.mjs <port> <url> '<js expr>'|<@file.js> [shotfile]
import { readFileSync, writeFileSync } from 'node:fs';
const [PORT, URL_] = [process.argv[2], process.argv[3]];
const pos = process.argv.slice(4).filter(a => a !== '--print');
let expr = pos[0];
const shot = pos[1];
if (expr?.startsWith('@')) expr = readFileSync(expr.slice(1), 'utf8');
const list = await (await fetch(`http://localhost:${PORT}/json`)).json();
let page = list.find(t => t.type === 'page' && t.url.includes('sheet.html'));
if (!page) page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); const errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown')
    errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type))
    errors.push(m.params.args?.[0]?.value || m.params.type);
};
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; pend.set(i, res);
  ws.send(JSON.stringify({ id: i, method, params }));
});
await send('Runtime.enable');
await send('Page.enable');
if (URL_) {
  await send('Page.navigate', { url: URL_ });
  await new Promise(r => setTimeout(r, 2500));
}
if (process.argv.includes('--print')) await send('Emulation.setEmulatedMedia', { media: 'print' });
if (expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr, awaitPromise: true, returnByValue: true,
  });
  if (r.result?.exceptionDetails)
    console.log('EXC:', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  else
    console.log(JSON.stringify(r.result?.result?.value, null, 1));
}
if (shot) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data) { writeFileSync(shot, Buffer.from(r.result.data, 'base64')); console.log('shot →', shot); }
}
if (errors.length) console.log('PAGE-ERRORS:', JSON.stringify(errors));
process.exit(0);
