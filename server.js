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

// Static files
app.use(express.static(root, { index: false, extensions: ['html'] }));

// Rewrite /tarieven -> tarieven.html, /contact -> contact.html, etc.
app.get('*', (req, res, next) => {
  const base = req.path === '/' ? 'index' : req.path.slice(1);
  const htmlPath = path.join(root, base + '.html');
  if (fs.existsSync(htmlPath))
    return res.sendFile(htmlPath);
  next();
});

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(root, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Skynn & Co. serving on port ${PORT}`);
});
