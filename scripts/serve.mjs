import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.svg':'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.woff2':'font/woff2', '.otf':'font/otf' };
createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(404).end(); return; }
    let path = resolve(root, '.' + pathname);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(404).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4176, '0.0.0.0', () => console.log('Preview: http://127.0.0.1:4176/merch/'));
