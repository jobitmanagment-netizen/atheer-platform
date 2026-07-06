const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const STATIC_DIR = path.join(__dirname, 'dist');
const API_PORT = 8080;
const PORT = 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

// Ensure mock server is running
function ensureMockServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${API_PORT}/api/health`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function start() {
  // Start mock server if not running
  const mockRunning = await ensureMockServer();
  if (!mockRunning) {
    console.log('Starting mock API server...');
    const mock = spawn('node', ['mock-server.mjs'], {
      cwd: __dirname,
      stdio: 'pipe',
      detached: true,
    });
    mock.stdout.on('data', d => process.stdout.write(d));
    mock.stderr.on('data', d => process.stderr.write(d));
    mock.unref();
    // Wait for it to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    console.log('Mock API server already running');
  }

  // Create combined HTTP server
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // API proxy
    if (pathname.startsWith('/api/') || pathname.startsWith('/ws')) {
      const opts = {
        hostname: 'localhost',
        port: API_PORT,
        path: pathname + url.search,
        method: req.method,
        headers: { ...req.headers, host: `localhost:${API_PORT}` },
      };
      const proxyReq = http.request(opts, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (err) => {
        res.writeHead(502);
        res.end(JSON.stringify({ error: 'API unavailable', detail: err.message }));
      });
      req.pipe(proxyReq);
      return;
    }

    // Serve static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    // SPA fallback: if no extension, serve index.html
    if (!path.extname(filePath)) filePath = '/index.html';

    const fullPath = path.join(STATIC_DIR, filePath);
    
    // Security: prevent directory traversal
    if (!fullPath.startsWith(STATIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.readFile(fullPath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // SPA fallback - serve index.html for client-side routes
          fs.readFile(path.join(STATIC_DIR, 'index.html'), (err2, data2) => {
            if (err2) {
              res.writeHead(500);
              return res.end('Internal error');
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data2);
          });
        } else {
          res.writeHead(500);
          res.end('Internal error');
        }
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  ATHEER Global Platform                  ║`);
    console.log(`  ╠══════════════════════════════════════════╣`);
    console.log(`  ║  Frontend:  http://localhost:${PORT}        ║`);
    console.log(`  ║  API:       http://localhost:${API_PORT}      ║`);
    console.log(`  ║  Login:     demo@atheer.com              ║`);
    console.log(`  ║  Password:  password123                  ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}

start().catch(console.error);
