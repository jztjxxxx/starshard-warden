// A tiny static file server for trying the game locally (Node 22, stdlib
// only). It serves this repository, so the game is at /game/ :
//
//   node serve.ts          # then open http://localhost:8080/game/
//   PORT=9090 node serve.ts

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://localhost:${port}`);
    let path = normalize(decodeURIComponent(url.pathname));
    if (path.endsWith('/')) path = join(path, 'index.html');
    const file = join(root, path);
    if (!file.startsWith(root)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('not found');
  }
});

server.listen(port, () => {
  console.log(`Starshard Warden at http://localhost:${port}/game/`);
});
