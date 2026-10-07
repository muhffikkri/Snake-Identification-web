/*
  Offline verification: loads the app once online, then cuts the network at the
  browser level and reloads, asserting the shell still renders and the app works.
  Usage: node tools/offline-check.mjs <baseUrl>
*/
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4174';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9377;

const profile = mkdtempSync(join(tmpdir(), 'sba-offline-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=390,844',
    '--no-first-run',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(step, ok, note = '') {
  results.push({ step, ok, note });
}

async function findTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('no debuggable page');
}

let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description);
  return res.result.value;
}

async function click(text) {
  await evaluate(`(() => {
    const n = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const w = n(${JSON.stringify(text)}).toLowerCase();
    const el = Array.from(document.querySelectorAll('button, a[href]')).find((e) => {
      const t = n(e.innerText).toLowerCase();
      const a = n(e.getAttribute('aria-label')).toLowerCase();
      return (t && t.includes(w)) || (a && a.includes(w));
    });
    if (el) el.click();
    return !!el;
  })()`);
  await sleep(420);
}

const has = async (needle) => {
  const body = await evaluate('document.body.innerText');
  return String(body).toLowerCase().includes(needle.toLowerCase());
};

try {
  ws = new WebSocket(await findTarget());
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Page.enable');

  // First visit, online: the shell caches itself.
  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(3500);
  check('online first load renders', await has('When minutes matter'));

  const swReady = await evaluate(`(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'no registration';
    await navigator.serviceWorker.ready;
    return 'active';
  })()`);
  check('service worker registers and activates', swReady === 'active', String(swReady));

  const cached = await evaluate(`(async () => {
    const keys = await caches.keys();
    if (!keys.length) return { keys, count: 0, urls: [] };
    const cache = await caches.open(keys[0]);
    const reqs = await cache.keys();
    return { keys, count: reqs.length, urls: reqs.map((r) => new URL(r.url).pathname) };
  })()`);
  check('shell is cached', cached.count >= 4, `${cached.count} entries`);
  check(
    'hashed js and css are cached',
    cached.urls.some((u) => u.endsWith('.js')) && cached.urls.some((u) => u.endsWith('.css')),
    cached.urls.filter((u) => u.endsWith('.js') || u.endsWith('.css')).join(', '),
  );

  // Go offline for real at the network layer, then reload. Network-level offline
  // emulation (rather than URL blocking) is what a user with no signal sees:
  // requests fail, and the service worker is the only thing that can answer.
  await send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await sleep(400);

  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(3000);
  check('shell renders with the network blocked', await has('When minutes matter'));
  check('offline banner states the condition', await has('Offline'));
  check('stylesheet applied offline', await evaluate(`(() => {
    const h1 = document.querySelector('h1');
    return !!h1 && parseFloat(getComputedStyle(h1).fontSize) > 24;
  })()`));

  await click('Start Triage Assessment');
  check('triage runs offline', await has('When and where was the bite'));
  await click('Next');
  await click('Next');
  const systemicReached = await has('Any signs away from the bite');
  check('systemic step reached offline', systemicReached);
  const checkedBreathing = await evaluate(`(() => {
    const box = Array.from(document.querySelectorAll('input[type="checkbox"]')).find((b) =>
      (b.closest('label') || {}).innerText?.includes('Difficulty breathing'));
    if (!box) return 'no box';
    box.click();
    return box.checked;
  })()`);
  check('difficulty-breathing checkbox toggles offline', checkedBreathing === true, String(checkedBreathing));
  await click('See the result');
  const resultText = await evaluate('document.body.innerText');
  check('clinical result produced offline', /Grade 4/.test(resultText), resultText.slice(0, 120).replace(/\s+/g, ' '));
  check('tourniquet guidance present offline', await has('Never apply a tourniquet'));

  await click('Home');
  await sleep(400);
  await click('Snake Map');
  await sleep(700);
  check('reference set readable offline', await has('Acanthophis laevis'));

  await click('Identify');
  await sleep(700);
  const onCapture = await has('Photograph the snake');
  check('identify capture screen reachable offline', onCapture);
  const referenceImgLoaded = await evaluate(`(async () => {
    const imgs = Array.from(document.images).filter((i) => i.src.includes('/dataset/'));
    const results = await Promise.all(imgs.map((i) => i.decode().then(() => true, () => false)));
    return imgs.length > 0 && results.every(Boolean);
  })()`);
  check('reference photographs decode offline', referenceImgLoaded);
  await click('Run a reference image');
  await sleep(3200);
  const idText = await evaluate('document.body.innerText');
  const idDetail = await evaluate(`(() => {
    const t = document.body.innerText;
    return {
      mostLikely: /Most likely/i.test(t),
      species: /Acanthophis laevis/.test(t),
      sample: t.slice(0, 420).replace(/\\s+/g, ' '),
    };
  })()`);
  check(
    'identification runs offline',
    idDetail.mostLikely && idDetail.species,
    idDetail.sample,
  );

  // A deep link must resolve offline too, which is the case client-side
  // routing introduces and the shell fallback has to cover.
  await send('Page.navigate', { url: `${BASE}/register` });
  await sleep(2200);
  check('deep link resolves offline', await has('Create an account'));
  await send('Page.navigate', { url: `${BASE}/nowhere` });
  await sleep(1800);
  check('unknown deep link explains itself offline', await has('That page does not exist'));

  console.log('\n=== offline verification ===');
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.step}${r.note ? `  (${r.note})` : ''}`);
  }
  console.log(`\n${failed === 0 ? 'OFFLINE READY' : failed + ' FAILED'}`);
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}