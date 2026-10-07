/*
  Click-through harness. Drives the built app in headless Chrome over CDP using
  node's built-in WebSocket, so no browser-automation dependency is needed.
  Usage: node tools/click-through.mjs <baseUrl> [viewportWidth] [viewportHeight]
*/
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const WIDTH = Number(process.argv[3] ?? 1280);
const HEIGHT = Number(process.argv[4] ?? 900);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223 + (WIDTH % 7);

const profile = mkdtempSync(join(tmpdir(), 'sba-cdp-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debuggable page');
}

const results = [];
const consoleErrors = [];
let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }).catch((err) => {
    throw new Error(`${String(err.message).slice(0, 90)} :: ${expression.replace(/\s+/g, ' ').slice(0, 90)}`);
  });
  if (res.exceptionDetails) {
    throw new Error(
      `${String(res.exceptionDetails.exception?.description ?? 'threw').slice(0, 90)} :: ${expression.replace(/\s+/g, ' ').slice(0, 90)}`,
    );
  }
  return res.result.value;
}

/** Records a failure in place, so one bad step does not abort the run. */
async function attempt(label, fn) {
  try {
    return await fn();
  } catch (err) {
    check(label, false, String(err.message).slice(0, 150));
    return undefined;
  }
}

async function click(label, { optional = false } = {}) {
  const out = await evaluate(`(() => {
    const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const want = norm(${JSON.stringify(label)}).toLowerCase();
    const all = Array.from(document.querySelectorAll('button, a[href], summary, input[type="radio"], input[type="checkbox"], select, label, [role="button"]'));
    const hit = all.find((el) => {
      const text = norm(el.innerText || el.textContent);
      if (text && text.toLowerCase().includes(want)) return true;
      const aria = norm(el.getAttribute('aria-label'));
      return aria && aria.toLowerCase().includes(want);
    });
    if (!hit) return { ok: false, reason: 'not found' };
    hit.scrollIntoView({ block: 'center' });
    hit.click();
    return { ok: true };
  })()`);
  if (!out.ok) {
    results.push({ step: label, pass: optional ? 'skipped' : false, note: out.reason });
    return false;
  }
  await sleep(340);
  return true;
}

function check(step, condition, note = '') {
  results.push({ step, pass: condition === true ? true : condition, note });
}

async function textPresent(needle) {
  const body = await evaluate('document.body.innerText');
  return String(body).toLowerCase().includes(String(needle).toLowerCase());
}

const path = () => evaluate('location.pathname');

async function pressTab() {
  for (const type of ['rawKeyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type,
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9,
    });
  }
  await sleep(80);
}

async function audit() {
  return evaluate(`(() => {
    const de = document.documentElement;
    const overflowing = de.scrollWidth > de.clientWidth + 1;
    const offenders = [];
    if (overflowing) {
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
          offenders.push(el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').slice(0, 3).join('.'));
          if (offenders.length >= 5) break;
        }
      }
    }
    const visible = (el) => !el.classList.contains('sr-only') && !el.closest('.sr-only');
    const small = Array.from(document.querySelectorAll('button, a[href], summary'))
      .filter(visible)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44);
      })
      .map((el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30));
    const unnamed = Array.from(document.querySelectorAll('button')).filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return false;
      if (!visible(el)) return false;
      return !(el.innerText || '').trim() && !el.getAttribute('aria-label') && !el.querySelector('.sr-only');
    }).length;
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => h.tagName + ': ' + h.innerText.trim().slice(0, 46));
    return { overflowing, offenders, small: small.slice(0, 12), unnamed, headings: headings.slice(0, 8), width: de.clientWidth };
  })()`);
}

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
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: WIDTH < 700,
  });

  // 1. Landing page and its navigation
  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(2400);
  check('landing loads', await textPresent('When minutes matter'));
  check('tagline intact', await textPresent('SnakeBiteAI delivers clarity'));
  check('WHO burden figures kept', await textPresent('138,000'));

const landingNav = await attempt('landing nav inspection', () =>
    evaluate(`(() => {
    const nav = document.querySelector('nav[aria-label="Sections"]');
    if (!nav) return { found: false };
    return {
      found: true,
      text: nav.innerText,
      hasMenuButton: !!nav.querySelector('[aria-label*="navigation menu" i]'),
      links: Array.from(nav.querySelectorAll('a')).length,
    };
  })()`),
  );
  if (!landingNav?.found) {
    check('landing nav present', false, 'nav[aria-label="Sections"] not found');
  }
  check('landing nav carries the section links', (landingNav?.links ?? 0) >= 5, `${landingNav?.links} links`);
  check('landing nav has no menu or account control', landingNav?.hasMenuButton === false && !/account/i.test(landingNav?.text ?? ''));
  check('landing nav offers sign in and register', /sign in/i.test(landingNav?.text ?? '') && /register/i.test(landingNav?.text ?? ''));
  check('landing nav drops the triage button', !/start triage/i.test(landingNav?.text ?? ''));
  const shellChrome = await evaluate(`(() => ({
    shellLogo: !!document.querySelector('a[aria-label="SnakeBiteAI home"]'),
    connectivityBadge: !!Array.from(document.querySelectorAll('[role="status"]')).find((s) => /online|offline/i.test(s.innerText)),
    heroBanner: !!document.querySelector('header#top'),
  }))()`);
  check('no shell header on the landing page', shellChrome.shellLogo === false && shellChrome.connectivityBadge === false, JSON.stringify(shellChrome));
  check('landing hero is the page banner', shellChrome.heroBanner === true);
check('app nav is hidden while signed out', (await evaluate('document.querySelector("#app-navigation") !== null')) === false);

  // 2. Triage reachable from the hero, no account required
  await click('Start Triage Assessment');
  await sleep(500);
  check('triage opens at bite details', await textPresent('When and where was the bite?'));
  check('triage opens on /triage', (await path()) === '/triage');
  check('no sign-in gate on triage', !(await textPresent('Sign in before continuing')));

  // 3. Back returns to the landing page while signed out
  await click('Cancel');
  await sleep(500);
  check('back returns to the landing page when signed out', (await path()) === '/');

  // 4. Walk the questionnaire to a result
  await click('Start Triage Assessment');
  await sleep(400);
  await click('Next');
  await click('Next');
  check('whole-body signs step', await textPresent('Any signs away from the bite'));
  await click('Difficulty breathing');
  await click('See the result');
  check('life-threatening grade shown', await textPresent('Grade 4'));
  check('tourniquet banned on result', await textPresent('Never apply a tourniquet'));
  check('immobilisation instructed', await textPresent('immobilise'));
  check('result precedes the account prompt', await evaluate(`(() => {
    const grade = Array.from(document.querySelectorAll('h1')).find((h) => /Grade 4/.test(h.innerText));
    const prompt = Array.from(document.querySelectorAll('button')).find((b) => /create an account to save/i.test(b.innerText));
    return !!(grade && prompt && grade.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING);
  })()`));

  // 5. Continue without saving offers three destinations
  await click('Continue without saving');
  await sleep(500);
  check('where-to-next appears', await textPresent('Where to next'));
  check('offers the landing page', await textPresent('Back to the landing page'));
  check('offers the snake map', await textPresent('Browse the snake map'));
  check('offers photographing the snake', await textPresent('Photograph the snake'));

  await click('Browse the snake map');
  await sleep(600);
  check('snake map reachable from the result', (await path()) === '/discover');
  await sleep(400);
  await send('Page.navigate', { url: `${BASE}/triage` });
  await sleep(900);

  // 6. Create an account routes to register with the assessment held
  await click('Next');
  await click('Next');
  await click('See the result');
  await click('Create an account to save');
  await sleep(600);
  check('account prompt routes to register', (await path()) === '/register');
  check('register page renders', await textPresent('Create an account'));
  check('held assessment announced', await textPresent('Assessment held'));
  check('register offers the agency path', await textPresent('Register as a government account'));

// Sets a React-controlled input by writing through the native setter, which
  // is the only way to make the component observe the change.
  const typed = await evaluate(`(() => {
    const i = document.getElementById('auth-name');
    if (!i) return { ok: false, at: location.pathname };
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(i, 'Audit');
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, at: location.pathname };
  })()`);
  check('account form accepts a name', typed?.ok === true, `path ${typed?.at}`);
  await click('Create account');
  await sleep(1000);
  check('registration lands on activity', (await path()) === '/activity');
  check('activity shows the signed-in name', await textPresent('Signed in as Audit'));
  check('app nav appears once signed in', (await evaluate('!!document.querySelector("#app-navigation")')) === true);
const navLabels = await evaluate(`(() => {
    const nav = document.querySelector('#app-navigation');
    if (!nav) return { found: false, path: location.pathname, navs: Array.from(document.querySelectorAll('nav')).map((n) => n.getAttribute('aria-label')) };
    return { found: true, text: nav.innerText };
  })()`);
  check(
    'app nav lists the primary destinations',
    navLabels.found && ['Home', 'Identify', 'Snake Map', 'Triage', 'Activity', 'History'].every((label) => navLabels.text.includes(label)),
    navLabels.found ? '' : `path ${navLabels.path}, navs ${JSON.stringify(navLabels.navs)}`,
  );
  check('shell header shows the account name', await textPresent('Audit'));
  check('account and menu controls now exist off-landing', (await evaluate('!!document.querySelector("[aria-controls=app-navigation]")')) === true);

  // 7. The saved assessment is readable from history
  await click('History');
  await sleep(900);
  const historyText = await evaluate('document.body.innerText');
  check(
    'saved assessment appears in history',
    /No envenoming/.test(historyText),
    historyText.slice(0, 160).replace(/\s+/g, ' '),
  );

  // 8. Back from triage now returns to activity
  await click('Triage');
  await sleep(600);
  await click('Cancel');
  await sleep(600);
  check('back returns to activity when signed in', (await path()) === '/activity');

  // 9. Identification
  await click('Identify');
  await sleep(600);
  check('identify capture screen', await textPresent('Photograph the snake'));
  check('assistive framing stated', await textPresent('not a diagnosis'));
  await click('Run a reference image');
  await sleep(2800);
  check('ranked result produced', await textPresent('Most likely'));
  check('confidence percentage shown', await evaluate('document.body.innerText.match(/87\\.0%/) !== null'));
  check('related species offered', await textPresent('Related and similar species'));

  // 10. Species page
  await click('Snake Map');
  await sleep(700);
  check('map lists the reference set', await textPresent('Acanthophis laevis'));
  await click('Acanthophis laevis');
  await sleep(600);
  check('species page opens', await textPresent('Venom and clinical risk'));
  check('species detail discloses traits', await textPresent('Short, stout body'));

  // 11. Government view and sync
  await click('Audit');
  await sleep(500);
  await click('Switch to a government account');
  await sleep(700);
  check('government overview opens', await textPresent('Snakebite records across Indonesia'));
  await click('Distribution map');
  await sleep(800);
  check('indonesia map renders', await evaluate(`(() => {
    const m = document.querySelector('.leaflet-container');
    return !!m && m.getBoundingClientRect().height > 300;
  })()`));
  check('map region shapes drawn', (await evaluate('document.querySelectorAll(".leaflet-overlay-pane path").length')) >= 7);
  check('map states boundaries are schematic', await textPresent('schematic island-group shapes'));
  await click('Data and reports');
  await sleep(700);
  check('reports queue shown', await textPresent('Sync queue'));
  let delivered = false;
  await click('Sync pending records');
  for (let i = 0; i < 20 && !delivered; i++) {
    await sleep(400);
    delivered = await textPresent('Delivered');
  }
  check('record delivers after sync', delivered);

// 12. Sign out returns to the landing navigation
  await click('Menu');
  await sleep(300);
  await click('Audit');
  await sleep(600);
  check('account page renders', await textPresent('Government account'));
  check('general-user switch offered back', await textPresent('Switch to a general user account'));
  await click('Switch to a general user account');
  await sleep(700);
  check('switching back lands on activity', (await path()) === '/activity');
  await click('Audit');
  await sleep(600);
  await click('Sign out');
  await sleep(700);
  check('sign out returns to landing', (await path()) === '/');
check('app nav hidden again after sign out', (await evaluate('document.querySelector("#app-navigation") !== null')) === false);

  // 14. Keyboard reachability
  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(2000);
  await evaluate('document.body.focus()');
  const walk = [];
  for (let i = 0; i < 14; i++) {
    await pressTab();
    walk.push(
      await evaluate(`(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return { tag: 'BODY' };
        const cs = getComputedStyle(el);
        const own = (el.innerText || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        const labelled = el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        return {
          tag: el.tagName,
          label: (own || aria || (labelled ? labelled.innerText.trim() : '')).slice(0, 24),
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
        };
      })()`),
    );
  }
  const focused = walk.filter((f) => f.tag !== 'BODY');
  const ringed = focused.filter((f) => f.outlineStyle !== 'none' && parseFloat(f.outlineWidth) >= 2);
  check('Tab reaches real controls', focused.length >= 12, `${focused.length} stops`);
  check('every Tab stop shows a 2px focus ring', ringed.length === focused.length);
  check('Tab stops carry accessible names', focused.every((f) => f.label.length > 0));

  // 15. Deep link straight into a route survives a reload
  await send('Page.navigate', { url: `${BASE}/discover` });
  await sleep(2200);
  check('deep link renders the snake map', await textPresent('Snakes recorded near you'));
  await send('Page.navigate', { url: `${BASE}/nowhere` });
  await sleep(1600);
  check('unknown route explains itself', await textPresent('That page does not exist'));

  // 16. Layout audit
  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(2000);
  const layout = await attempt('layout audit', audit) ?? { overflowing: false, offenders: [], small: [], unnamed: 0, headings: [] };
  check(`no horizontal overflow @${WIDTH}px`, !layout.overflowing, layout.offenders.join(', '));
  check(`no empty-name buttons @${WIDTH}px`, layout.unnamed === 0, `${layout.unnamed} unnamed`);
  check(`no sub-44px targets @${WIDTH}px`, layout.small.length === 0, layout.small.join(' | '));
  check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' / '));

  console.log(`\n=== click-through @ ${WIDTH}x${HEIGHT} ===`);
  let failed = 0;
  for (const r of results) {
    const mark = r.pass === true ? 'PASS' : r.pass === 'skipped' ? 'SKIP' : 'FAIL';
    if (r.pass === false) failed++;
    console.log(`${mark}  ${r.step}${r.note ? `  (${r.note})` : ''}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}  |  ${consoleErrors.length} console errors`);
  if (consoleErrors.length) console.log(consoleErrors.slice(0, 8).join('\n'));
  console.log('\nheading order sample:\n' + layout.headings.join('\n'));
  process.exitCode = failed === 0 ? 0 : 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
