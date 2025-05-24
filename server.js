const http = require('http');
const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname);

function contentType(ext) {
  const map = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return map[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const filePath = path.join(base, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType(path.extname(filePath).toLowerCase()) });
      res.end(data);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Servidor disponible en http://localhost:${PORT}`));
