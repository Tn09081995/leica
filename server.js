const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function proxyGemini(req, res) {
  const apiKey = (req.headers['x-goog-api-key'] || '').toString().trim();
  const apiVer = req.headers['x-gemini-api-version'] === 'v1' ? 'v1' : 'v1beta';

  if (!apiKey) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: 'Missing x-goog-api-key header' } }));
    return;
  }

  const chunks = [];
  let totalBytes = 0;
  const MAX_BYTES = 25 * 1024 * 1024;

  req.on('data', (chunk) => {
    totalBytes += chunk.length;
    if (totalBytes <= MAX_BYTES) chunks.push(chunk);
  });

  req.on('end', () => {
    if (totalBytes > MAX_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: 'Payload too large' } }));
      return;
    }

    const bodyBuf = Buffer.concat(chunks);
    const upstream = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path: '/v1beta/interactions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyBuf.length,
          'x-goog-api-key': apiKey,
          'Api-Revision': '2026-05-20',
        },
      },
      (upRes) => {
        const outChunks = [];
        upRes.on('data', (c) => outChunks.push(c));
        upRes.on('end', () => {
          const outBuf = Buffer.concat(outChunks);
          res.writeHead(upRes.statusCode || 502, {
            'Content-Type': upRes.headers['content-type'] || 'application/json; charset=utf-8',
          });
          res.end(outBuf);
        });
      }
    );

    upstream.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: `Proxy error: ${err.message}` } }));
    });

    upstream.write(bodyBuf);
    upstream.end();
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && urlPath === '/api/gemini') {
    proxyGemini(req, res);
    return;
  }

  let relPath = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
  const fullPath = path.resolve(ROOT, '.' + relPath);

  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Lumina Studio running at http://localhost:${PORT}`);
});
