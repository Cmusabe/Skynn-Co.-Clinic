/**
 * Minimal static server for production (Railway etc.).
 * Serves files from current directory and rewrites /page to /page.html.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const root = __dirname;

// 1) Page routes first: /tarieven -> tarieven.html, /contact -> contact.html
app.get(/^\/([^./]+)\/?$/, (req, res, next) => {
  const base = req.params[0];
  if (base.includes('..')) return next();
  const htmlPath = path.resolve(root, base + '.html');
  if (fs.existsSync(htmlPath))
    return res.sendFile(htmlPath);
  next();
});
app.get('/', (req, res) => res.sendFile(path.resolve(root, 'index.html')));

// 2) Static assets (css, js, images, etc.)
app.use(express.static(root, { index: false }));

// 3) Fallback: SPA-style to index
app.get('*', (req, res) => res.sendFile(path.resolve(root, 'index.html')));

app.listen(PORT, () => {
  console.log(`Skynn & Co. serving on port ${PORT}`);
});
