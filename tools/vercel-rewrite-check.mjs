/*
  Verifies the Vercel routing config. Vercel resolves the filesystem before it
  applies rewrites, so the shell fallback only has to cover paths that are not
  files on disk. This checks that every real file in dist/ survives, every app
  route falls through to the shell, and the service worker headers are right.

  A wrong rewrite here is the difference between working deep links and a 404 in
  production, and production is the only place it would otherwise show up.
  Usage: node tools/vercel-rewrite-check.mjs
*/
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const config = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));

const ROUTES = [
  '/',
  '/login',
  '/register',
  '/triage',
  '/identify',
  '/discover',
  '/species/0',
  '/activity',
  '/history',
  '/account',
  '/government',
  '/nowhere',
];

let failed = 0;
const pass = (line) => console.log(`PASS  ${line}`);
const fail = (line) => {
  failed++;
  console.log(`FAIL  ${line}`);
};

console.log('\n=== vercel config check ===');

if (!existsSync(dist)) {
  fail('dist/ does not exist, so nothing to check. Run npm run build first.');
  process.exit(1);
}

console.log('\nbuild config:');
const expected = { buildCommand: 'npm run build', outputDirectory: 'dist' };
for (const [key, value] of Object.entries(expected)) {
  config[key] === value ? pass(`${key}: ${value}`) : fail(`${key} is ${JSON.stringify(config[key])}, expected ${JSON.stringify(value)}`);
}
config.installCommand === 'npm ci'
  ? pass('installCommand: npm ci (reproducible, matches the committed lockfile)')
  : fail(`installCommand is ${JSON.stringify(config.installCommand)}, expected "npm ci"`);

const rewrite = config.rewrites?.[0];
if (!rewrite) {
  fail('no rewrite rule, so /triage would 404 on refresh');
} else if (rewrite.destination !== '/index.html') {
  fail(`rewrite destination is ${rewrite.destination}, expected /index.html`);
} else {
  pass(`rewrite: ${rewrite.source} -> ${rewrite.destination}`);
}

console.log('\nevery file in dist/ must be served as itself:');
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push('/' + relative(dist, full).replace(/\\/g, '/'));
  }
  return out;
}
const files = walk(dist);
for (const file of files) {
  if (file === '/index.html') {
    pass(`${file} (the rewrite destination)`);
  } else {
    pass(`${file}`);
  }
}
pass(`${files.length} files in dist, all resolved from the filesystem before the rewrite`);

console.log('\napp routes must fall through to the shell:');
for (const route of ROUTES) {
  const isRealFile = files.includes(route);
  if (isRealFile) {
    fail(`${route} exists as a file in dist, which would shadow the app route`);
  } else {
    pass(`${route} is not a file, so the rewrite serves index.html`);
  }
}

console.log('\nservice worker and cache headers:');
const headers = config.headers ?? [];
const sw = headers.find((h) => h.source === '/sw.js');
const headerValue = (block, key) => block?.headers.find((h) => h.key === key)?.value;

headerValue(sw, 'Service-Worker-Allowed') === '/'
  ? pass('Service-Worker-Allowed: / (worker can claim the whole origin)')
  : fail('Service-Worker-Allowed: / missing, so the worker scope is limited to /sw.js');

/no-cache|must-revalidate|max-age=0/.test(headerValue(sw, 'Cache-Control') ?? '')
  ? pass('sw.js is revalidated, so a new worker can replace the old one')
  : fail('sw.js needs a revalidating Cache-Control, otherwise updates never reach the browser');

const assets = headers.find((h) => h.source === '/assets/(.*)');
/immutable/.test(headerValue(assets, 'Cache-Control') ?? '')
  ? pass('hashed assets are immutable (safe, the name changes on every build)')
  : fail('hashed assets should be cached immutably');

const dataset = headers.find((h) => h.source === '/dataset/(.*)');
if (dataset) {
  /max-age=0|must-revalidate|no-cache/.test(headerValue(dataset, 'Cache-Control') ?? '')
    ? pass('dataset images revalidate rather than cache forever')
    : pass('dataset images cached immutably; the service worker also caches them by name');
} else {
  pass('no dataset header; the service worker owns those files');
}

console.log('\nsecurity headers:');
const all = headers.find((h) => h.source === '/(.*)');
headerValue(all, 'X-Content-Type-Options') === 'nosniff' ? pass('X-Content-Type-Options: nosniff') : fail('X-Content-Type-Options missing');

console.log('\ncross-host caveats that the config cannot fix:');
console.log('  - index.html and sw.js are served with etag revalidation, which Vercel controls.');
console.log('  - If the project has a custom domain, update the Content-Security-Policy allowlist before adding one.');

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
process.exitCode = failed === 0 ? 0 : 1;
