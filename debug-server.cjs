const http = require('http');
const fs = require('fs');
const path = require('path');

const SESSION_ID = 'website-not-working-ssr-error';
const LOG_FILE = path.join(__dirname, `trae-debug-log-${SESSION_ID}.ndjson`);
const ENV_FILE = path.join(__dirname, `.dbg/${SESSION_ID}.env`);

// Ensure .dbg directory exists
if (!fs.existsSync(path.join(__dirname, '.dbg'))) {
  fs.mkdirSync(path.join(__dirname, '.dbg'));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/logs') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      fs.appendFileSync(LOG_FILE, body + '\n');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  } else if (req.method === 'GET' && req.url === '/logs') {
    if (fs.existsSync(LOG_FILE)) {
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      res.end(fs.readFileSync(LOG_FILE));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessionId: SESSION_ID }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 9998;
server.listen(PORT, () => {
  console.log(`Debug Server running on port ${PORT}`);
  fs.writeFileSync(ENV_FILE, `DEBUG_SERVER_URL=http://localhost:${PORT}/logs\n`);
});
