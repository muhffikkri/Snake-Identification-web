/*
  Serves dist/ the way Vercel does: the filesystem is resolved first, and only
  paths that are not files fall through to index.html. Running the click-through
  against this proves the vercel.json rewrite shape end to end, without needing
  a Vercel account.

  Usage: node tools/serve-dist.mjs [port]
*/
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist');
const PORT = Number(process.argv[2] ?? 4180);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const IMMUTABLE = /^\/(assets|dataset)\//;

function send(res, status, file) {
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': IMMUTABLE.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);

  // Block traversal before touching the disk.
  const candidate = join(root, normalize(pathname));
  if (!candidate.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (pathname !== '/' && existsSync(candidate) && statSync(candidate).isFile()) {
    send(res, 200, candidate);
    return;
  }

  // Everything else is a client route: serve the shell.
  const shell = join(root, 'index.html');
  if (!existsSync(shell)) {
    res.writeHead(500).end('dist/index.html missing; run npm run build');
    return;
  }
  if (extname(pathname) && TYPES[extname(pathname)]) {
    // A real file extension that missed the filesystem is a 404, not a route.
    res.writeHead(404).end('Not found');
    return;
  }
  send(res, 200, shell);
}).listen(PORT, () => {
  console.log(`dist served on http://localhost:${PORT} with SPA fallback`);
});
