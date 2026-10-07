/*
  Measures the real computed contrast of the colour pairs the interface
  actually uses, in the running app, rather than trusting the token file.
  Usage: node tools/contrast-audit.mjs <baseUrl>
*/
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:4174';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9355;

const profile = mkdtempSync(join(tmpdir(), 'sba-contrast-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1280,900',
    '--no-first-run',
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

const SCAN = `(() => {
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // Chrome resolves color-mix() to color(srgb ...), so numeric extraction has
  // to handle floats and a slash alpha, not just rgb()/rgba().
  // Tailwind 4 opacity modifiers compile to oklab(), and Chrome keeps that
  // representation in computed styles, so these branches are not optional.
  const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const oklabToRgb = (L, a, b) => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const enc = (v) => {
      const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return Math.max(0, Math.min(1, c)) * 255;
    };
    return [enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
  };
  const nums = (s) => (s.match(/-?[\\d.]+(?:e-?\\d+)?/g) || []).map(Number);
  const splitAlpha = (s) => {
    const slash = s.indexOf('/');
    if (slash === -1) return 1;
    const tail = s.slice(slash + 1).match(/-?[\\d.]+(?:e-?\\d+)?/g) || [];
    const head = s.slice(0, slash).match(/-?[\\d.]+(?:e-?\\d+)?%?/g) || [];
    const pct = head.length && head[head.length - 1].includes('%');
    const v = Number(tail[0] ?? 1);
    return pct ? v / 100 : v;
  };

  const parse = (s) => {
    if (!s || s === 'transparent' || s === 'none') return [];
    const alpha = s.includes('/') || s.startsWith('rgb') ? splitAlpha(s) : 1;
    if (s.startsWith('oklab') || s.startsWith('oklch')) {
      const body = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'));
      const n = (body.match(/-?[\\d.]+(?:e-?\\d+)?(deg)?/g) || []).map(Number);
      if (n.length < 3) return [];
      return [...oklabToRgb(n[0], n[1], n[2]), alpha];
    }
    if (s.startsWith('color(')) {
      const n = nums(s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')));
      return n.length >= 3 ? [n[0] * 255, n[1] * 255, n[2] * 255, alpha] : [];
    }
    const n = nums(s);
    if (n.length < 3) return [];
    // rgb() carries no alpha; rgba() may carry a fourth number; slash syntax uses splitAlpha.
    if (s.includes('/')) return [n[0], n[1], n[2], alpha];
    if (/^rgba/.test(s)) return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
    return [n[0], n[1], n[2], 1];
  };
  const ratio = (fg, bg) => {
    const a = lum(fg);
    const b = lum(bg);
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  };
  // Composes the real backdrop. Tailwind 4 emits color-mix() for /opacity
  // modifiers, and Chrome resolves those to premultiplied color(srgb ...), so
  // translucent layers are blended downward over the page base rather than
  // read as opaque.
  const chainOf = (el) => {
    const out = [];
    let n = el;
    while (n && n.nodeType === 1) {
      out.push(n.tagName.toLowerCase() + ':' + getComputedStyle(n).backgroundColor);
      n = n.parentElement;
    }
    return out;
  };
  const effectiveBg = (el) => {
    const chain = [];
    let node = el;
    while (node && node.nodeType === 1) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c.length >= 3 && c[3] > 0) chain.push(c);
      if (c.length >= 3 && c[3] >= 1) break;
      node = node.parentElement;
    }
    const base = [247, 248, 250];
    let out = base;
    for (let i = chain.length - 1; i >= 0; i--) {
      const [r, g, b, a = 1] = chain[i];
      out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
    }
    return out;
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim())
      .join(' ');
    if (!text) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.2) continue;
    const fgRaw = parse(cs.color);
    const fg = fgRaw.length > 3 && fgRaw[3] < 1 ? fg.map((v, i) => (i < 3 ? v * fgRaw[3] : v)) : fgRaw.slice(0, 3);
    const bg = effectiveBg(el);
    const px = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = px >= 24 || (px >= 18.66 && weight >= 700);
    out.push({
      text: text.slice(0, 52),
      ratio: Math.round(ratio(fg, bg) * 100) / 100,
      px: Math.round(px * 10) / 10,
      need: large ? 3 : 4.5,
      color: cs.color,
      bg: 'rgb(' + bg.map((v) => Math.round(v)).join(',') + ')',
      chain: chainOf(el).join(' <- '),
    });
  }
  return out;
})()`;

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

  const screens = [
    ['landing', null],
    ['triage result', 'Start Triage Assessment'],
    ['identification result', null],
    ['government tables', null],
  ];

  const all = [];
  await send('Page.navigate', { url: `${BASE}/` });
  await sleep(2000);
  all.push(...(await evaluate(SCAN)).map((r) => ({ ...r, screen: 'landing' })));

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
    await sleep(500);
  }

  await click('Start Triage Assessment');
  await click('Next');
  await click('Next');
  await click('Difficulty breathing');
  await click('See the result');
  await sleep(400);
  all.push(...(await evaluate(SCAN)).map((r) => ({ ...r, screen: 'triage result' })));

  await click('Home');
  await sleep(400);
  await click('Identify a snake');
  await sleep(400);
  await click('Run a reference image');
  await sleep(2600);
  all.push(...(await evaluate(SCAN)).map((r) => ({ ...r, screen: 'identification' })));

  await click('Menu');
  await click('Agency view');
  await sleep(600);
  await click('Species');
  await sleep(500);
  all.push(...(await evaluate(SCAN)).map((r) => ({ ...r, screen: 'government' })));

  const failures = all.filter((r) => r.ratio < r.need);
  const seen = new Set();
  const unique = all.filter((r) => {
    const key = `${r.color}|${r.bg}|${r.need}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n=== contrast audit: ${all.length} text nodes across 4 screens ===`);
  console.log('\nDistinct colour pairs, worst first:');
  for (const r of unique.sort((a, b) => a.ratio - b.ratio).slice(0, 22)) {
    const verdict = r.ratio >= r.need ? 'PASS' : 'FAIL';
    console.log(
      `${verdict}  ${String(r.ratio).padStart(6)} (need ${r.need})  ${r.color} on ${r.bg}  ${r.px}px  "${r.text}"`,
    );
  }
  console.log(`\n${failures.length === 0 ? 'ALL PASS' : failures.length + ' FAILURES'} of ${all.length} text nodes`);
  const uniqueFails = unique.filter((r) => r.ratio < r.need);
  if (uniqueFails.length) {
    console.log('\nDistinct failing pairs:');
    for (const r of uniqueFails) {
    console.log(`  ${r.ratio} need ${r.need} ${r.color} on ${r.bg} "${r.text}"`);
    console.log(`      chain: ${r.chain}`);
  }
  }
  process.exitCode = uniqueFails.length === 0 ? 0 : 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}